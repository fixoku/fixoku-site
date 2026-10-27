import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import {
  hashR6OfferToken,
  normalizeR6OfferTokenForLookup,
  normalizeR6OfferBeneficiaries,
} from "../../src/server/domain/r6-offers.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { code: "INVALID_JSON", status: 400 }); }
}

function accountEmail(principal) {
  return String(principal.user?.email || principal.session?.user?.email || "").trim().toLowerCase();
}

function isStudentLike(principal) {
  return principal.memberships.some((membership) => ["STUDENT", "GUARDIAN"].includes(membership.role));
}

function lineJson(line, beneficiaries) {
  return {
    id: line.id,
    offerId: line.offer_id,
    lineKind: line.line_kind,
    packageVersionId: line.package_version_id,
    physicalProductId: line.physical_product_id,
    titleSnapshot: line.title_snapshot,
    skuSnapshot: line.sku_snapshot,
    productTypeSnapshot: line.product_type_snapshot,
    educationStage: line.education_stage,
    quantity: Number(line.quantity),
    listGrossMinor: Number(line.list_gross_minor),
    specialGrossMinor: Number(line.special_gross_minor),
    discountMinor: Number(line.discount_minor),
    discountPercentBps: Number(line.discount_percent_bps),
    vatRateBps: Number(line.vat_rate_bps),
    netMinor: Number(line.net_minor),
    vatMinor: Number(line.vat_minor),
    grossMinor: Number(line.gross_minor),
    lineOrder: Number(line.line_order),
    beneficiaries: beneficiaries.map((target) => ({ id: target.id, childProfileId: target.child_profile_id, studentProfileId: target.student_profile_id, quantity: Number(target.quantity) })),
  };
}

function offerJson(offer, lines) {
  return {
    id: offer.id,
    title: offer.title,
    status: offer.status,
    currency: offer.currency,
    listGrossMinor: Number(offer.list_gross_minor || 0),
    specialGrossMinor: Number(offer.special_gross_minor || 0),
    discountMinor: Number(offer.discount_minor || 0),
    discountPercentBps: Number(offer.discount_percent_bps || 0),
    expiresAt: offer.expires_at,
    sentAt: offer.sent_at,
    acceptedAt: offer.accepted_at,
    acceptedOrderId: offer.accepted_order_id,
    createdAt: offer.created_at,
    updatedAt: offer.updated_at,
    lines,
  };
}

async function canonicalPackageForOfferLine(client, line) {
  if (line.package_version_id) {
    return (await client.query(`
      select p.id as package_id,pv.id as package_version_id,pv.version_number,pv.description,
        p.catalog_scope,pv.title,pv.sku,pv.status,pv.purchase_enabled,
        coalesce((select json_agg(json_build_object('trainingProgramId',ped.training_program_id,'deliveryMode',ped.delivery_mode) order by ped.id) from package_entitlement_definitions ped where ped.package_version_id=pv.id),'[]'::json) as definitions
      from package_versions pv join packages p on p.id=pv.package_id
      where pv.id=$1 and pv.status='PUBLISHED' and pv.purchase_enabled=true
    `, [line.package_version_id])).rows[0];
  }
  if (line.physical_product_id) {
    return (await client.query(`
      select p.id as package_id,pv.id as package_version_id,pv.version_number,pv.description,pv.title,pv.sku,pv.status,pv.purchase_enabled,
        coalesce((select json_agg(json_build_object('trainingProgramId',ped.training_program_id,'deliveryMode',ped.delivery_mode) order by ped.id) from package_entitlement_definitions ped where ped.package_version_id=pv.id),'[]'::json) as definitions
      from package_components pc
      join package_versions pv on pv.id=pc.package_version_id and pv.status='PUBLISHED' and pv.purchase_enabled=true
      join packages p on p.id=pv.package_id and p.status='PUBLISHED'
      where pc.is_active=true and (pc.physical_product_id=$1 or pc.reference_id=$1)
      order by p.catalog_scope='STUDENT_COMMERCE' desc,pv.updated_at desc,pv.id
      limit 1
    `, [line.physical_product_id])).rows[0];
  }
  return null;
}

async function beneficiaryForOfferTarget(client, principal, target) {
  if (target.child_profile_id) {
    const row = (await client.query(`
      select c.id as child_profile_id,c.owner_user_id as student_user_id,c.legacy_student_profile_id as student_profile_id
      from r6_student_child_profiles c where c.id=$1 and c.owner_user_id=$2 and c.status='ACTIVE'
    `, [target.child_profile_id, principal.user.id])).rows[0];
    if (!row) throw Object.assign(new Error("OFFER_CHILD_PROFILE_SCOPE_DENIED"), { status: 403 });
    return row;
  }
  const row = (await client.query(`
    select sp.id as student_profile_id,sp.user_id as student_user_id
    from student_profiles sp where sp.id=$1 and sp.status='ACTIVE' and
      (sp.user_id=$2 or exists(select 1 from guardian_student_relationships gsr where gsr.student_profile_id=sp.id and gsr.guardian_user_id=$2 and gsr.status='ACTIVE'))
  `, [target.student_profile_id, principal.user.id])).rows[0];
  if (!row) throw Object.assign(new Error("OFFER_STUDENT_PROFILE_SCOPE_DENIED"), { status: 403 });
  return { ...row, child_profile_id: null };
}

async function materializeOfferOrder(client, principal, offerData, { paymentMethod, idempotencyKey }) {
  const method = String(paymentMethod || "PAYTR").toUpperCase();
  if (!["PAYTR", "BANK_TRANSFER"].includes(method)) throw Object.assign(new Error("PAYMENT_METHOD_INVALID"), { status: 400 });
  const key = String(idempotencyKey || `R6_CUSTOM_OFFER:${offerData.offer.id}`).trim();
  if (!key || key.length > 160) throw Object.assign(new Error("IDEMPOTENCY_KEY_REQUIRED"), { status: 400 });
  const existing = (await client.query("select * from orders where buyer_user_id=$1 and idempotency_key=$2", [principal.user.id, key])).rows[0];
  if (existing) return { order: existing, paymentIntent: (await client.query("select * from payment_intents where order_id=$1", [existing.id])).rows[0], replay: true };

  const lines = [];
  let firstBeneficiary = null;
  for (const line of offerData.lines) {
    const targets = (offerData.byLine.get(line.id) || []);
    if (!targets.length) throw Object.assign(new Error("OFFER_BENEFICIARY_QUANTITY_REQUIRED"), { status: 400 });
    const beneficiary = await beneficiaryForOfferTarget(client, principal, targets[0]);
    if (!firstBeneficiary) firstBeneficiary = beneficiary;
    const canonical = await canonicalPackageForOfferLine(client, line);
    if (!canonical) throw Object.assign(new Error("OFFER_PRODUCT_NOT_ORDERABLE"), { status: 409 });
    lines.push({ line, beneficiary, canonical, definitions: Array.isArray(canonical.definitions) ? canonical.definitions : [] });
  }
  if (!firstBeneficiary?.student_user_id) throw Object.assign(new Error("OFFER_BENEFICIARY_REQUIRED"), { status: 400 });
  const listGrossMinor = lines.reduce((sum, item) => sum + Number(item.line.list_gross_minor), 0);
  const saleGrossMinor = lines.reduce((sum, item) => sum + Number(item.line.gross_minor), 0);
  const discountMinor = lines.reduce((sum, item) => sum + Number(item.line.discount_minor), 0);
  const vatMinor = lines.reduce((sum, item) => sum + Number(item.line.vat_minor), 0);
  const netMinor = lines.reduce((sum, item) => sum + Number(item.line.net_minor), 0);
  if (saleGrossMinor !== Number(offerData.offer.special_gross_minor) || listGrossMinor !== Number(offerData.offer.list_gross_minor)) throw Object.assign(new Error("OFFER_TOTAL_MISMATCH"), { status: 409 });
  const order = (await client.query(`
    insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,beneficiary_child_profile_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,list_gross_minor,sale_gross_minor,discount_minor,discount_percent_bps,vat_net_minor,vat_minor,vat_rate_bps,catalog_scope_snapshot,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash)
    values($1,$2,$3,$4,'PENDING_PAYMENT',$5,$6,$7,0,$7,$8,$7,$9,$10,$11,$12,$13,'R6_CUSTOM_OFFER',null,'{}',$14,$15) returning *
  `, [principal.user.id, firstBeneficiary.student_user_id, firstBeneficiary.student_profile_id || null, firstBeneficiary.child_profile_id || null, method, offerData.offer.currency, saleGrossMinor, listGrossMinor, discountMinor, Number(offerData.offer.discount_percent_bps || 0), netMinor, vatMinor, lines[0]?.line.vat_rate_bps || 0, key, crypto.createHash("sha256").update(JSON.stringify({ offerId: offerData.offer.id, key, lineIds: lines.map((item) => item.line.id) })).digest("hex")])).rows[0];
  for (const [index, item] of lines.entries()) {
    const { line, beneficiary, canonical, definitions } = item;
    const deliveryModes = new Set(definitions.map((definition) => definition.deliveryMode));
    const deliveryMode = deliveryModes.size === 1 ? [...deliveryModes][0] : (deliveryModes.size ? "HYBRID" : "SELF_PACED");
    const components = [{ productId: line.physical_product_id, productType: line.product_type_snapshot, educationStage: line.education_stage, sku: line.sku_snapshot, title: line.title_snapshot, quantity: Number(line.quantity) }];
    const orderItem = (await client.query(`
      insert into order_items(order_id,package_id,package_version_id,beneficiary_child_profile_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,list_gross_minor,sale_gross_minor,discount_minor,discount_percent_bps,vat_net_minor,vat_minor,vat_rate_bps,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning *
    `, [order.id, canonical.package_id, canonical.package_version_id, beneficiary.child_profile_id || null, line.title_snapshot, canonical.description || line.title_snapshot, Number(canonical.version_number || 1), deliveryMode, Number(line.gross_minor), Number(line.list_gross_minor), Number(line.gross_minor), Number(line.discount_minor), Number(line.discount_percent_bps), Number(line.net_minor), Number(line.vat_minor), Number(line.vat_rate_bps), offerData.offer.currency, Number(line.quantity), JSON.stringify(definitions), JSON.stringify(components)])).rows[0];
    await client.query(`
      insert into r6_order_component_snapshots(order_item_id,package_component_id,physical_product_id,product_type,education_stage,sku_snapshot,title_snapshot,quantity,list_gross_minor,sale_gross_minor,discount_minor,vat_rate_bps,net_minor,vat_minor,gross_minor,beneficiary_child_profile_id,line_order)
      values($1,null,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$9,$14,$15)
    `, [orderItem.id, line.physical_product_id || null, line.product_type_snapshot, line.education_stage || null, line.sku_snapshot || null, line.title_snapshot, Number(line.quantity), Number(line.list_gross_minor), Number(line.gross_minor), Number(line.discount_minor), Number(line.vat_rate_bps), Number(line.net_minor), Number(line.vat_minor), beneficiary.child_profile_id || null, index]);
  }
  const paymentIntent = (await client.query("insert into payment_intents(order_id,status,provider,amount_minor,currency,idempotency_key) values($1,'CREATED',null,$2,$3,$4) returning *", [order.id, order.total_minor, order.currency, `PAYMENT_INTENT:${order.id}`])).rows[0];
  const accepted = (await client.query("update r6_custom_offers set status='ACCEPTED',accepted_at=coalesce(accepted_at,now()),accepted_order_id=$1,updated_at=now() where id=$2 and status='SENT' returning *", [order.id, offerData.offer.id])).rows[0];
  if (!accepted) throw Object.assign(new Error("OFFER_NOT_AVAILABLE"), { status: 409 });
  return { order, paymentIntent, replay: false };
}

async function readOfferByToken(client, token, principal, { lock = false, claim = false } = {}) {
  const tokenHash = hashR6OfferToken(normalizeR6OfferTokenForLookup(token));
  const email = accountEmail(principal);
  if (!email) throw Object.assign(new Error("ACCOUNT_EMAIL_REQUIRED"), { status: 403 });
  const suffix = lock ? " for update" : "";
  const offer = (await client.query(`select * from r6_custom_offers where token_hash=$1${suffix}`, [tokenHash])).rows[0];
  // Do not distinguish a missing token from a token belonging to another
  // account.  Token possession is never an authorization grant by itself.
  if (!offer) throw Object.assign(new Error("OFFER_NOT_FOUND"), { status: 404 });
  const sameUser = offer.customer_user_id && String(offer.customer_user_id) === String(principal.user.id);
  const sameEmail = String(offer.customer_email || "").trim().toLowerCase() === email;
  if (!sameEmail || (offer.customer_user_id && !sameUser)) throw Object.assign(new Error("OFFER_NOT_FOUND"), { status: 404 });
  // A draft has no customer-visible link yet; only explicitly sent offers
  // can be read or claimed by a student.  Accepted/cancelled offers are
  // immutable historical state and cannot be replayed.
  if (offer.status === "DRAFT" || offer.status === "CANCELLED" || offer.status === "ACCEPTED" || offer.status === "EXPIRED") throw Object.assign(new Error("OFFER_NOT_AVAILABLE"), { status: 409 });
  if (offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) {
    if (lock) await client.query("update r6_custom_offers set status='EXPIRED',updated_at=now() where id=$1 and status not in ('ACCEPTED','CANCELLED')", [offer.id]);
    throw Object.assign(new Error("OFFER_EXPIRED"), { status: 410 });
  }
  if (claim && !offer.customer_user_id) {
    const claimed = (await client.query("update r6_custom_offers set customer_user_id=$1,updated_at=now() where id=$2 and customer_user_id is null and lower(customer_email)=lower($3) returning *", [principal.user.id, offer.id, email])).rows[0];
    if (claimed) Object.assign(offer, claimed);
  }
  const lines = (await client.query("select * from r6_custom_offer_lines where offer_id=$1 order by line_order,id", [offer.id])).rows;
  const ids = lines.map((line) => line.id);
  const beneficiaries = ids.length ? (await client.query("select id,offer_line_id,child_profile_id,student_profile_id,quantity from r6_custom_offer_line_beneficiaries where offer_line_id=any($1::uuid[]) order by id", [ids])).rows : [];
  const byLine = new Map(lines.map((line) => [line.id, []]));
  for (const beneficiary of beneficiaries) byLine.get(beneficiary.offer_line_id)?.push(beneficiary);
  return { offer, lines, beneficiaries, byLine };
}

async function assertTargetOwnership(client, userId, target) {
  const child = target.childProfileId ? String(target.childProfileId) : null;
  const student = target.studentProfileId ? String(target.studentProfileId) : null;
  if ((child && student) || (!child && !student) || (child && !UUID.test(child)) || (student && !UUID.test(student))) throw Object.assign(new Error("OFFER_BENEFICIARY_TARGET_INVALID"), { status: 400 });
  if (child) {
    const row = (await client.query("select id from r6_student_child_profiles where id=$1 and owner_user_id=$2 and status='ACTIVE'", [child, userId])).rows[0];
    if (!row) throw Object.assign(new Error("OFFER_CHILD_PROFILE_SCOPE_DENIED"), { status: 403 });
  } else {
    const row = (await client.query("select sp.id from student_profiles sp where sp.id=$1 and sp.status='ACTIVE' and (sp.user_id=$2 or exists (select 1 from guardian_student_relationships gsr where gsr.student_profile_id=sp.id and gsr.guardian_user_id=$2 and gsr.status='ACTIVE'))", [student, userId])).rows[0];
    if (!row) throw Object.assign(new Error("OFFER_STUDENT_PROFILE_SCOPE_DENIED"), { status: 403 });
  }
}

async function applyBeneficiaryAssignments(client, offerData, principal, assignments) {
  if (assignments == null) return;
  if (!Array.isArray(assignments)) throw Object.assign(new Error("OFFER_BENEFICIARIES_INVALID"), { status: 400 });
  const byId = new Map(offerData.lines.map((line) => [String(line.id), line]));
  const grouped = new Map();
  for (const assignment of assignments) {
    const lineId = String(assignment?.offerLineId || assignment?.lineId || "");
    const line = byId.get(lineId);
    if (!line) throw Object.assign(new Error("OFFER_LINE_NOT_FOUND"), { status: 400 });
    const targets = assignment.targets ?? assignment.beneficiaries;
    const normalized = normalizeR6OfferBeneficiaries(targets, Number(line.quantity), Number(line.line_order));
    let total = 0;
    for (const target of normalized) { await assertTargetOwnership(client, principal.user.id, target); total += target.quantity; }
    grouped.set(lineId, normalized);
    if (total !== Number(line.quantity)) throw Object.assign(new Error("OFFER_BENEFICIARY_QUANTITY_REQUIRED"), { status: 400 });
  }
  for (const line of offerData.lines) {
    const targets = grouped.get(String(line.id));
    if (!targets) continue;
    await client.query("delete from r6_custom_offer_line_beneficiaries where offer_line_id=$1", [line.id]);
    for (const target of targets) await client.query("insert into r6_custom_offer_line_beneficiaries(offer_line_id,child_profile_id,student_profile_id,quantity) values($1,$2,$3,$4)", [line.id, target.childProfileId, target.studentProfileId, target.quantity]);
  }
}

async function assertOfferBeneficiariesComplete(client, offerData, userId) {
  const rows = offerData.beneficiaries;
  for (const line of offerData.lines) {
    const targets = rows.filter((target) => String(target.offer_line_id) === String(line.id));
    const required = line.line_kind === "PACKAGE" || ["SOFTWARE", "TRAINING_SERVICE"].includes(String(line.product_type_snapshot).toUpperCase());
    const total = targets.reduce((sum, target) => sum + Number(target.quantity), 0);
    if (required && total !== Number(line.quantity)) throw Object.assign(new Error("OFFER_BENEFICIARY_QUANTITY_REQUIRED"), { status: 400 });
    for (const target of targets) await assertTargetOwnership(client, userId, { childProfileId: target.child_profile_id, studentProfileId: target.student_profile_id });
  }
}

async function readMatchingOffers(client, principal) {
  const email = accountEmail(principal);
  if (!email) return [];
  const offers = (await client.query("select * from r6_custom_offers where lower(customer_email)=lower($2) and (customer_user_id=$1 or customer_user_id is null) and status='SENT' and (expires_at is null or expires_at>now()) order by created_at desc", [principal.user.id, email])).rows;
  const result = [];
  for (const offer of offers) {
    const lines = (await client.query("select * from r6_custom_offer_lines where offer_id=$1 order by line_order,id", [offer.id])).rows;
    const ids = lines.map((line) => line.id);
    const beneficiaries = ids.length ? (await client.query("select id,offer_line_id,child_profile_id,student_profile_id,quantity from r6_custom_offer_line_beneficiaries where offer_line_id=any($1::uuid[]) order by id", [ids])).rows : [];
    result.push(offerJson(offer, lines.map((line) => lineJson(line, beneficiaries.filter((target) => target.offer_line_id === line.id)))));
  }
  return result;
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  if (!isStudentLike(principal)) return json(res, 403, { error: "FORBIDDEN" });
  const permission = requirePermission(principal, req.method === "GET" ? "package.read" : "order.create");
  if (permission) return json(res, permission.status, permission.body);
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const url = new URL(req.url || "/", "http://local");
    const token = url.searchParams.get("token") || url.searchParams.get("offerToken");
    if (req.method === "GET" && !token) return json(res, 200, { offers: await readMatchingOffers(client, principal) });
    if (!token && req.method === "POST") return json(res, 400, { error: "OFFER_TOKEN_REQUIRED" });
    if (req.method === "GET") {
      const found = await readOfferByToken(client, token, principal, { claim: true });
      return json(res, 200, { offer: offerJson(found.offer, found.lines.map((line) => lineJson(line, found.byLine.get(line.id) || []))) });
    }
    const body = await readBody(req);
    const action = String(body.action || "claim").trim().toLowerCase();
    await client.query("begin");
    let found = await readOfferByToken(client, token, principal, { lock: true, claim: true });
    const assignments = body.assignments ?? body.beneficiaries;
    await applyBeneficiaryAssignments(client, found, principal, assignments);
    // Re-read after beneficiary writes so acceptance and the response use the
    // same locked, current snapshot rather than the pre-assignment projection.
    if (assignments != null) found = await readOfferByToken(client, token, principal, { lock: true, claim: false });
    if (action === "claim") {
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.custom_offer.claimed','r6_custom_offer',$2,'SUCCESS',$3,$4)", [principal.user.id, found.offer.id, crypto.randomUUID(), JSON.stringify({ customerEmail: accountEmail(principal) })]);
      await client.query("commit");
      return json(res, 200, { claimed: true, offer: offerJson(found.offer, found.lines.map((line) => lineJson(line, found.byLine.get(line.id) || []))) });
    }
    if (action !== "accept") throw Object.assign(new Error("OFFER_ACTION_INVALID"), { status: 400 });
    await assertOfferBeneficiariesComplete(client, found, principal.user.id);
    const materialized = await materializeOfferOrder(client, principal, found, { paymentMethod: body.paymentMethod, idempotencyKey: body.idempotencyKey });
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.custom_offer.accepted','r6_custom_offer',$2,'SUCCESS',$3,$4)", [principal.user.id, found.offer.id, crypto.randomUUID(), JSON.stringify({ customerEmail: accountEmail(principal), checkout: "PAYMENT_PROVIDER_HANDOFF_REQUIRED", orderId: materialized.order.id, paymentIntentId: materialized.paymentIntent?.id || null })]);
    await client.query("commit");
    const accepted = (await client.query("select * from r6_custom_offers where id=$1", [found.offer.id])).rows[0];
    return json(res, materialized.replay ? 200 : 201, { accepted: true, checkoutState: "PAYMENT_PROVIDER_HANDOFF_REQUIRED", order: materialized.order, paymentIntent: materialized.paymentIntent, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER), offer: offerJson(accepted, found.lines.map((line) => lineJson(line, found.byLine.get(line.id) || []))) });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "OFFER_CONFLICT" : error.code || error.message || "OFFER_UNAVAILABLE" });
  } finally {
    client.release();
    await pool.end();
  }
}

export { accountEmail, assertOfferBeneficiariesComplete, applyBeneficiaryAssignments, materializeOfferOrder, readMatchingOffers, readOfferByToken };
