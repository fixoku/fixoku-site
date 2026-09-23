import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import {
  assertR6OfferExpiry,
  assertR6OfferStatusTransition,
  createR6OfferToken,
  isR6OfferUuid,
  normalizeOfferEmail,
  normalizeOfferStatus,
  normalizeR6OfferLine,
  summarizeR6OfferLines,
} from "../../src/server/domain/r6-offers.js";
import { normalizeCurrency } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const uuid = (value, code = "OFFER_ID_INVALID") => { if (!isR6OfferUuid(value)) throw Object.assign(new Error(code), { code, status: 400 }); return String(value); };

function offerLink(token) {
  const origin = String(process.env.APP_ORIGIN || process.env.BETTER_AUTH_URL || "").trim().replace(/\/$/u, "");
  const path = `/panel/ogrenci/paketler?token=${encodeURIComponent(token)}`;
  return origin ? `${origin}${path}` : path;
}

async function queueOfferEmail(client, offer, token) {
  if (!offer.customer_user_id) return { status: "PENDING_ACCOUNT" };
  const link = offerLink(token);
  const subject = "Size özel Fixoku teklifiniz hazır";
  const body = `Merhaba,\n\n${offer.title}\n\nSize özel teklifinizi güvenli Fixoku panelinden inceleyebilirsiniz:\n${link}\n\nBu bağlantı yalnızca teklifin müşteri hesabı ve e-posta eşleşmesiyle açılır.`;
  await client.query("insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key) values($1,'R6_CUSTOM_OFFER_SENT',$2,$3,$4,$5) on conflict(dedupe_key) do nothing", [offer.customer_user_id, offer.customer_email, subject, body, `r6-custom-offer-sent:${offer.id}:${offer.token_hash}`]);
  return { status: "QUEUED" };
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { code: "INVALID_JSON", status: 400 }); }
}

function idFrom(req) {
  if (req.query?.id) return String(req.query.id);
  const pathname = new URL(req.url || "/", "http://local").pathname;
  const match = pathname.match(/\/r6-custom-offers\/([^/?]+)$/u);
  return match?.[1] || null;
}

function safeOffer(row, lines = []) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    customerUserId: row.customer_user_id,
    customerEmail: row.customer_email,
    title: row.title,
    status: row.status,
    currency: row.currency,
    listGrossMinor: Number(row.list_gross_minor || 0),
    specialGrossMinor: Number(row.special_gross_minor || 0),
    discountMinor: Number(row.discount_minor || 0),
    discountPercentBps: Number(row.discount_percent_bps || 0),
    expiresAt: row.expires_at,
    sentAt: row.sent_at,
    acceptedAt: row.accepted_at,
    acceptedOrderId: row.accepted_order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lines,
  };
}

function safeLine(row, beneficiaries = []) {
  return {
    id: row.id,
    offerId: row.offer_id,
    lineKind: row.line_kind,
    packageVersionId: row.package_version_id,
    physicalProductId: row.physical_product_id,
    titleSnapshot: row.title_snapshot,
    skuSnapshot: row.sku_snapshot,
    productTypeSnapshot: row.product_type_snapshot,
    educationStage: row.education_stage,
    quantity: Number(row.quantity),
    listGrossMinor: Number(row.list_gross_minor),
    specialGrossMinor: Number(row.special_gross_minor),
    discountMinor: Number(row.discount_minor),
    discountPercentBps: Number(row.discount_percent_bps),
    vatRateBps: Number(row.vat_rate_bps),
    netMinor: Number(row.net_minor),
    vatMinor: Number(row.vat_minor),
    grossMinor: Number(row.gross_minor),
    lineOrder: Number(row.line_order),
    beneficiaries,
  };
}

async function readOffer(client, offerId, { includeToken = false } = {}) {
  const offer = (await client.query("select * from r6_custom_offers where id=$1", [offerId])).rows[0];
  if (!offer) return null;
  const lines = (await client.query("select * from r6_custom_offer_lines where offer_id=$1 order by line_order,id", [offerId])).rows;
  const ids = lines.map((line) => line.id);
  const beneficiaries = ids.length ? (await client.query("select id,offer_line_id,child_profile_id,student_profile_id,quantity from r6_custom_offer_line_beneficiaries where offer_line_id=any($1::uuid[]) order by id", [ids])).rows : [];
  const byLine = new Map(lines.map((line) => [line.id, []]));
  for (const beneficiary of beneficiaries) byLine.get(beneficiary.offer_line_id)?.push({ id: beneficiary.id, childProfileId: beneficiary.child_profile_id, studentProfileId: beneficiary.student_profile_id, quantity: Number(beneficiary.quantity) });
  const result = safeOffer(offer, lines.map((line) => safeLine(line, byLine.get(line.id) || [])));
  if (includeToken) result.tokenHash = offer.token_hash;
  return result;
}

async function resolveCanonicalLine(client, input, index) {
  const kind = String(input.lineKind || input.kind || "").trim().toUpperCase();
  if (kind === "PACKAGE") {
    const packageVersionId = String(input.packageVersionId || "");
    if (!isR6OfferUuid(packageVersionId)) throw Object.assign(new Error(`OFFER_LINE_${index}_PACKAGE_INVALID`), { status: 400 });
    const row = (await client.query(`select pv.id as "packageVersionId",pv.title,pv.sku,pv.price_gross_minor as "priceGrossMinor",pv.price_minor as "priceMinor",pv.vat_rate_bps as "vatRateBps",p.education_stage as "educationStage",p.status as "packageStatus",pv.status as "versionStatus" from package_versions pv join packages p on p.id=pv.package_id where pv.id=$1 and p.audience='STUDENT' and p.catalog_scope='STUDENT_COMMERCE' and p.panel_visible=true`, [packageVersionId])).rows[0];
    if (!row || row.packageStatus === "RETIRED" || row.versionStatus === "RETIRED") throw Object.assign(new Error("OFFER_PACKAGE_UNAVAILABLE"), { status: 409 });
    return { ...row, listGrossMinor: row.priceGrossMinor ?? row.priceMinor, productTypeSnapshot: "PACKAGE", packageVersionId, physicalProductId: null };
  }
  if (kind === "PRODUCT") {
    const physicalProductId = String(input.physicalProductId || "");
    if (!isR6OfferUuid(physicalProductId)) throw Object.assign(new Error(`OFFER_LINE_${index}_PRODUCT_INVALID`), { status: 400 });
    const row = (await client.query(`select id as "physicalProductId",sku,title,list_gross_minor as "listGrossMinor",vat_rate_bps as "vatRateBps",r6_product_type as "productTypeSnapshot",null::text as "educationStage",is_active as "isActive" from physical_products where id=$1`, [physicalProductId])).rows[0];
    const productType = String(row?.productTypeSnapshot || "").trim().toUpperCase();
    if (!row || !row.isActive || !["BOOK", "SOFTWARE", "TRAINING_SERVICE"].includes(productType)) throw Object.assign(new Error("OFFER_PRODUCT_UNAVAILABLE"), { status: 409 });
    return { ...row, productTypeSnapshot: productType, packageVersionId: null, physicalProductId };
  }
  throw Object.assign(new Error(`OFFER_LINE_${index}_KIND_INVALID`), { status: 400 });
}

async function validateCustomer(client, principal, body) {
  const customerUserId = body.customerUserId == null || body.customerUserId === "" ? null : uuid(body.customerUserId, "OFFER_CUSTOMER_ID_INVALID");
  if (!customerUserId) return { customerUserId: null, customerEmail: normalizeOfferEmail(body.customerEmail) };
  const row = (await client.query("select id,email from platform_users where id=$1", [customerUserId])).rows[0];
  if (!row) throw Object.assign(new Error("OFFER_CUSTOMER_NOT_FOUND"), { status: 404 });
  const customerEmail = body.customerEmail == null || body.customerEmail === "" ? String(row.email).trim().toLowerCase() : normalizeOfferEmail(body.customerEmail);
  if (String(row.email).trim().toLowerCase() !== customerEmail) throw Object.assign(new Error("OFFER_CUSTOMER_EMAIL_MISMATCH"), { status: 400 });
  return { customerUserId, customerEmail };
}

async function validateBeneficiaries(client, customerUserId, lines) {
  const targets = lines.flatMap((line) => line.beneficiaries.map((target) => ({ ...target, line })));
  if (targets.length && !customerUserId) throw Object.assign(new Error("OFFER_BENEFICIARIES_REQUIRE_ACCOUNT"), { status: 400 });
  for (const target of targets) {
    if (target.childProfileId) {
      const row = (await client.query("select id from r6_student_child_profiles where id=$1 and owner_user_id=$2 and status='ACTIVE'", [target.childProfileId, customerUserId])).rows[0];
      if (!row) throw Object.assign(new Error("OFFER_CHILD_PROFILE_SCOPE_DENIED"), { status: 403 });
    } else {
      const row = (await client.query("select sp.id from student_profiles sp where sp.id=$1 and sp.status='ACTIVE' and (sp.user_id=$2 or exists (select 1 from guardian_student_relationships gsr where gsr.student_profile_id=sp.id and gsr.guardian_user_id=$2 and gsr.status='ACTIVE'))", [target.studentProfileId, customerUserId])).rows[0];
      if (!row) throw Object.assign(new Error("OFFER_STUDENT_PROFILE_SCOPE_DENIED"), { status: 403 });
    }
  }
}

async function normalizeLines(client, rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 100) throw Object.assign(new Error("OFFER_LINES_REQUIRED"), { status: 400 });
  const lines = [];
  for (let index = 0; index < rawLines.length; index += 1) {
    const input = rawLines[index];
    const canonical = await resolveCanonicalLine(client, input, index);
    if (canonical.listGrossMinor == null || !Number.isSafeInteger(Number(canonical.listGrossMinor)) || Number(canonical.listGrossMinor) < 0) throw Object.assign(new Error("OFFER_LIST_PRICE_UNAVAILABLE"), { status: 409 });
    const unitListGrossMinor = Number(canonical.listGrossMinor);
    const quantity = Number(input.quantity ?? 1);
    let canonicalLineList;
    try { canonicalLineList = Number(BigInt(unitListGrossMinor) * BigInt(quantity)); } catch { canonicalLineList = Number.NaN; }
    const requestedList = input.listGrossMinor == null ? canonicalLineList : Number(input.listGrossMinor);
    if (!Number.isSafeInteger(requestedList) || !Number.isSafeInteger(canonicalLineList) || requestedList !== canonicalLineList) throw Object.assign(new Error("OFFER_LIST_PRICE_MISMATCH"), { status: 400 });
    const canonicalVatRateBps = Number(canonical.vatRateBps ?? 0);
    if (!Number.isSafeInteger(canonicalVatRateBps) || canonicalVatRateBps < 0 || canonicalVatRateBps > 10_000) throw Object.assign(new Error("OFFER_VAT_RATE_INVALID"), { status: 409 });
    if (input.vatRateBps != null && Number(input.vatRateBps) !== canonicalVatRateBps) throw Object.assign(new Error("OFFER_VAT_RATE_MISMATCH"), { status: 400 });
    lines.push(normalizeR6OfferLine({ ...input, ...canonical, listGrossMinor: requestedList, titleSnapshot: canonical.title, skuSnapshot: canonical.sku, productTypeSnapshot: canonical.productTypeSnapshot, vatRateBps: canonicalVatRateBps, educationStage: canonical.educationStage }, index, canonical));
  }
  if (new Set(lines.map((line) => line.lineOrder)).size !== lines.length) throw Object.assign(new Error("OFFER_LINE_ORDER_DUPLICATE"), { status: 400 });
  const summary = summarizeR6OfferLines(lines);
  return { lines, summary };
}

async function insertOffer(client, principal, body) {
  const title = text(body.title, 240);
  if (!title) throw Object.assign(new Error("OFFER_TITLE_REQUIRED"), { status: 400 });
  const customer = await validateCustomer(client, principal, body);
  const normalized = await normalizeLines(client, body.lines);
  const expiresAt = body.expiresAt ? assertR6OfferExpiry(body.expiresAt) : null;
  const requestedStatus = normalizeOfferStatus(body.status || "DRAFT");
  if (requestedStatus === "ACCEPTED" || requestedStatus === "EXPIRED") throw Object.assign(new Error("OFFER_STATUS_INVALID"), { status: 400 });
  // Beneficiaries may be assigned after an email-only offer is claimed.  The
  // student acceptance path is the final server-side gate for every package,
  // software, or training unit that must have a beneficiary.
  await validateBeneficiaries(client, customer.customerUserId, normalized.lines);
  const token = createR6OfferToken();
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
  const currency = normalizeCurrency(body.currency || "TRY");
  if (!currency) throw Object.assign(new Error("OFFER_CURRENCY_INVALID"), { status: 400 });
  const row = (await client.query(`insert into r6_custom_offers(owner_user_id,customer_user_id,customer_email,title,status,token_hash,currency,list_gross_minor,special_gross_minor,discount_minor,discount_percent_bps,expires_at,sent_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`, [principal.user.id, customer.customerUserId, customer.customerEmail, title, requestedStatus, tokenHash, currency, normalized.summary.listGrossMinor, normalized.summary.specialGrossMinor, normalized.summary.discountMinor, normalized.summary.discountPercentBps, expiresAt, requestedStatus === "SENT" ? new Date() : null])).rows[0];
  for (const line of normalized.lines) {
    const inserted = (await client.query(`insert into r6_custom_offer_lines(offer_id,line_kind,package_version_id,physical_product_id,title_snapshot,sku_snapshot,product_type_snapshot,education_stage,quantity,list_gross_minor,special_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,gross_minor,line_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id`, [row.id, line.lineKind, line.packageVersionId, line.physicalProductId, line.titleSnapshot, line.skuSnapshot, line.productTypeSnapshot, line.educationStage, line.quantity, line.listGrossMinor, line.specialGrossMinor, line.discountMinor, line.discountPercentBps, line.vatRateBps, line.netMinor, line.vatMinor, line.grossMinor, line.lineOrder])).rows[0];
    for (const target of line.beneficiaries) await client.query("insert into r6_custom_offer_line_beneficiaries(offer_line_id,child_profile_id,student_profile_id,quantity) values($1,$2,$3,$4)", [inserted.id, target.childProfileId, target.studentProfileId, target.quantity]);
  }
  const email = requestedStatus === "SENT" ? await queueOfferEmail(client, row, token) : { status: "NOT_SENT" };
  await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.custom_offer.created','r6_custom_offer',$2,'SUCCESS',$3,$4)", [principal.user.id, row.id, crypto.randomUUID(), JSON.stringify({ status: row.status, customerEmail: customer.customerEmail, lineCount: normalized.lines.length, listGrossMinor: row.list_gross_minor, specialGrossMinor: row.special_gross_minor, emailStatus: email.status })]);
  return { row, token, normalized, email };
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "offer.manage");
  if (denied) return json(res, denied.status, denied.body);
  const id = idFrom(req);
  if (id && !isR6OfferUuid(id)) return json(res, 400, { error: "OFFER_ID_INVALID" });
  if (!id && !["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (id && !["GET", "PATCH", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (!id && req.method === "GET") {
      const url = new URL(req.url || "/", "http://local");
      const status = url.searchParams.get("status");
      const values = [principal.user.id];
      const where = ["o.owner_user_id=$1"];
      if (status) { values.push(normalizeOfferStatus(status)); where.push(`o.status=$${values.length}`); }
      const rows = (await client.query(`select o.* from r6_custom_offers o where ${where.join(" and ")} order by o.created_at desc,o.id`, values)).rows;
      const offers = await Promise.all(rows.map(async (row) => {
        const full = await readOffer(client, row.id);
        return full || safeOffer(row);
      }));
      return json(res, 200, { offers });
    }
    if (!id && req.method === "POST") {
      const body = await readBody(req);
      await client.query("begin");
      const created = await insertOffer(client, principal, body);
      const offer = await readOffer(client, created.row.id);
      await client.query("commit");
      return json(res, 201, { offer, ...(created.token ? { token: created.token, offerUrl: offerLink(created.token) } : {}), emailStatus: created.email.status });
    }
    if (req.method === "GET") {
      const offer = await readOffer(client, id);
      if (!offer || String(offer.ownerUserId) !== String(principal.user.id)) return json(res, 404, { error: "OFFER_NOT_FOUND" });
      return json(res, 200, { offer });
    }
    const body = await readBody(req);
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`r6-custom-offer:${id}`]);
    const current = (await client.query("select * from r6_custom_offers where id=$1 and owner_user_id=$2 for update", [id, principal.user.id])).rows[0];
    if (!current) throw Object.assign(new Error("OFFER_NOT_FOUND"), { status: 404 });
    const action = String(body.action || "").trim().toLowerCase();
    if (req.method === "POST" && !["send", "cancel", "expire"].includes(action)) throw Object.assign(new Error("OFFER_ACTION_INVALID"), { status: 400 });
    if (req.method === "PATCH" && current.status !== "DRAFT") throw Object.assign(new Error("OFFER_IMMUTABLE_AFTER_SEND"), { status: 409 });
    if (req.method === "POST") {
      const next = action === "send" ? "SENT" : action === "cancel" ? "CANCELLED" : "EXPIRED";
      assertR6OfferStatusTransition(current.status, next);
      let token = null;
      let updated;
      if (next === "SENT") {
        token = createR6OfferToken();
        const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
        updated = (await client.query("update r6_custom_offers set status='SENT',token_hash=$1,sent_at=coalesce(sent_at,now()),updated_at=now() where id=$2 returning *", [tokenHash, id])).rows[0];
      } else {
        updated = (await client.query("update r6_custom_offers set status=$1,updated_at=now() where id=$2 returning *", [next, id])).rows[0];
      }
      const email = next === "SENT" ? await queueOfferEmail(client, updated, token) : { status: "NOT_SENT" };
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'r6_custom_offer',$3,'SUCCESS',$4,$5)", [principal.user.id, `r6.custom_offer.${action}`, id, crypto.randomUUID(), JSON.stringify({ from: current.status, to: next, emailStatus: email.status })]);
      await client.query("commit");
      return json(res, 200, { offer: safeOffer(updated), ...(token ? { token, offerUrl: offerLink(token) } : {}), emailStatus: email.status });
    }
    const bodyMerged = { ...body, customerEmail: body.customerEmail ?? current.customer_email, customerUserId: body.customerUserId ?? current.customer_user_id, title: body.title ?? current.title, lines: body.lines };
    if (!Array.isArray(bodyMerged.lines)) throw Object.assign(new Error("OFFER_LINES_REQUIRED"), { status: 400 });
    const customer = await validateCustomer(client, principal, bodyMerged);
    const normalized = await normalizeLines(client, bodyMerged.lines);
    await validateBeneficiaries(client, customer.customerUserId, normalized.lines);
    const expiresAt = body.expiresAt === null ? null : body.expiresAt ? assertR6OfferExpiry(body.expiresAt) : current.expires_at;
    if (!text(bodyMerged.title, 240)) throw Object.assign(new Error("OFFER_TITLE_REQUIRED"), { status: 400 });
    await client.query("delete from r6_custom_offer_line_beneficiaries where offer_line_id in (select id from r6_custom_offer_lines where offer_id=$1)", [id]);
    await client.query("delete from r6_custom_offer_lines where offer_id=$1", [id]);
    await client.query("update r6_custom_offers set customer_user_id=$1,customer_email=$2,title=$3,list_gross_minor=$4,special_gross_minor=$5,discount_minor=$6,discount_percent_bps=$7,expires_at=$8,updated_at=now() where id=$9", [customer.customerUserId, customer.customerEmail, text(bodyMerged.title, 240), normalized.summary.listGrossMinor, normalized.summary.specialGrossMinor, normalized.summary.discountMinor, normalized.summary.discountPercentBps, expiresAt, id]);
    for (const line of normalized.lines) {
      const inserted = (await client.query("insert into r6_custom_offer_lines(offer_id,line_kind,package_version_id,physical_product_id,title_snapshot,sku_snapshot,product_type_snapshot,education_stage,quantity,list_gross_minor,special_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,gross_minor,line_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id", [id, line.lineKind, line.packageVersionId, line.physicalProductId, line.titleSnapshot, line.skuSnapshot, line.productTypeSnapshot, line.educationStage, line.quantity, line.listGrossMinor, line.specialGrossMinor, line.discountMinor, line.discountPercentBps, line.vatRateBps, line.netMinor, line.vatMinor, line.grossMinor, line.lineOrder])).rows[0];
      for (const target of line.beneficiaries) await client.query("insert into r6_custom_offer_line_beneficiaries(offer_line_id,child_profile_id,student_profile_id,quantity) values($1,$2,$3,$4)", [inserted.id, target.childProfileId, target.studentProfileId, target.quantity]);
    }
    const updated = await readOffer(client, id);
    await client.query("commit");
    return json(res, 200, { offer: updated });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "OFFER_CONFLICT" : error.code || error.message || "OFFER_UNAVAILABLE" });
  } finally {
    client.release();
    await pool.end();
  }
}

export { normalizeLines, readOffer, safeOffer, validateBeneficiaries, resolveCanonicalLine };
