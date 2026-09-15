/* global process */
import crypto from "node:crypto";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function sha256(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export function normalizeCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/u.test(currency) ? currency : null;
}

function error(code, status = 400) {
  return Object.assign(new Error(code), { code, status });
}

export async function listBeneficiaries(client, principal) {
  if (!principal?.user) throw error("FORBIDDEN", 403);
  const hasGuardian = principal.memberships.some((membership) => membership.role === "GUARDIAN");
  if (hasGuardian) {
    const rows = await client.query(`
      select sp.id as "studentProfileId", sp.user_id as "studentUserId", u.display_name as "studentName"
      from guardian_profiles gp
      join guardian_student_relationships gsr on gsr.guardian_user_id=gp.user_id and gsr.status='ACTIVE'
      join student_profiles sp on sp.id=gsr.student_profile_id and sp.status='ACTIVE'
      join platform_users u on u.id=sp.user_id
      where gp.user_id=$1 and gp.status='ACTIVE'
      order by u.display_name,sp.id
    `, [principal.user.id]);
    return rows.rows;
  }
  const rows = await client.query(`
    select sp.id as "studentProfileId", sp.user_id as "studentUserId", u.display_name as "studentName"
    from student_profiles sp join platform_users u on u.id=sp.user_id
    where sp.user_id=$1 and sp.status='ACTIVE'
  `, [principal.user.id]);
  return rows.rows;
}

export async function resolveBeneficiary(client, principal, requestedProfileId = null) {
  if (requestedProfileId !== null && (!UUID_PATTERN.test(String(requestedProfileId)))) throw error("FORBIDDEN", 403);
  const rows = await listBeneficiaries(client, principal);
  if (!rows.length) throw error("BENEFICIARY_NOT_FOUND", 403);
  const requested = requestedProfileId ? rows.find((row) => String(row.studentProfileId) === String(requestedProfileId)) : null;
  if (requestedProfileId && !requested) throw error("FORBIDDEN", 403);
  return requested || rows[0];
}

export async function readPublishedPackageVersion(client, packageVersionId) {
  if (!UUID_PATTERN.test(String(packageVersionId || ""))) throw error("INVALID_PACKAGE_VERSION_ID", 400);
  const result = await client.query(`
    select p.id as "packageId", p.slug, p.status as "packageStatus", p.audience,
      pv.id as "packageVersionId", pv.version_number as "versionNumber", pv.title,
      pv.description, pv.price_minor as "priceMinor", pv.currency, pv.status as "versionStatus",
      ped.id as "definitionId", ped.training_program_id as "trainingProgramId", ped.delivery_mode as "deliveryMode"
    from packages p join package_versions pv on pv.package_id=p.id
    left join package_entitlement_definitions ped on ped.package_version_id=pv.id
    where pv.id=$1 and p.status='PUBLISHED' and pv.status='PUBLISHED' and p.audience='STUDENT'
    order by ped.training_program_id
  `, [packageVersionId]);
  if (!result.rowCount) throw error("PACKAGE_VERSION_UNAVAILABLE", 409);
  const first = result.rows[0];
  const definitions = result.rows.filter((row) => row.definitionId).map((row) => ({ id: row.definitionId, trainingProgramId: row.trainingProgramId, deliveryMode: row.deliveryMode }));
  if (!definitions.length) throw error("PACKAGE_DEFINITIONS_REQUIRED", 409);
  const modes = new Set(definitions.map((definition) => definition.deliveryMode));
  const deliveryMode = modes.size === 1 ? definitions[0].deliveryMode : "HYBRID";
  // Published versions must carry an explicit ISO currency; never invent a
  // default for a commercial fact that will be snapshotted into an order.
  const currency = normalizeCurrency(first.currency);
  if (!currency || !Number.isInteger(first.priceMinor) || first.priceMinor < 0) throw error("PACKAGE_PRICE_INVALID", 409);
  return { ...first, currency, priceMinor: first.priceMinor, deliveryMode, definitions };
}

export async function createOrder(client, principal, input) {
  const packageVersionId = String(input?.packageVersionId || "");
  const idempotencyKey = String(input?.idempotencyKey || "").trim();
  if (!UUID_PATTERN.test(packageVersionId)) throw error("INVALID_PACKAGE_VERSION_ID", 400);
  if (!idempotencyKey || idempotencyKey.length > 160) throw error("IDEMPOTENCY_KEY_REQUIRED", 400);
  const beneficiary = await resolveBeneficiary(client, principal, input?.studentProfileId || null);
  const requestHash = sha256({ packageVersionId, studentProfileId: beneficiary.studentProfileId });
  await client.query("begin");
  try {
    const existing = (await client.query("select * from orders where buyer_user_id=$1 and idempotency_key=$2 for update", [principal.user.id, idempotencyKey])).rows[0];
    if (existing) {
      if (existing.request_hash !== requestHash) throw error("IDEMPOTENCY_KEY_CONFLICT", 409);
      const payment = (await client.query("select * from payment_intents where order_id=$1", [existing.id])).rows[0];
      await client.query("commit");
      return { order: existing, paymentIntent: payment, replay: true, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) };
    }
    const version = await readPublishedPackageVersion(client, packageVersionId);
    const owned = (await client.query("select id from package_entitlements where beneficiary_student_user_id=$1 and package_version_id=$2 and status='ACTIVE' and (expires_at is null or expires_at>now()) limit 1", [beneficiary.studentUserId, version.packageVersionId])).rows[0];
    if (owned) throw error("PACKAGE_ALREADY_OWNED", 409);
    const order = (await client.query(`
      insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,status,currency,subtotal_minor,total_minor,idempotency_key,request_hash)
      values($1,$2,$3,'PENDING_PAYMENT',$4,$5,$5,$6,$7) returning *
    `, [principal.user.id, beneficiary.studentUserId, beneficiary.studentProfileId, version.currency, version.priceMinor, idempotencyKey, requestHash])).rows[0];
    const item = (await client.query(`
      insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot)
      values($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,1,$10) returning *
    `, [order.id, version.packageId, version.packageVersionId, version.title, version.description, version.versionNumber, version.deliveryMode, version.priceMinor, version.currency, JSON.stringify(version.definitions)])).rows[0];
    const paymentIntent = (await client.query(`
      insert into payment_intents(order_id,status,provider,amount_minor,currency,idempotency_key)
      values($1,'CREATED',null,$2,$3,$4) returning *
    `, [order.id, order.total_minor, order.currency, `PAYMENT_INTENT:${order.id}`])).rows[0];
    await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'commerce.order.created','order',$2,'SUCCESS',$3,$4)`, [principal.user.id, order.id, crypto.randomUUID(), JSON.stringify({ orderItemId: item.id, packageVersionId: version.packageVersionId, beneficiaryStudentUserId: beneficiary.studentUserId })]);
    await client.query("commit");
    return { order: { ...order, item }, paymentIntent, replay: false, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) };
  } catch (cause) {
    try { await client.query("rollback"); } catch { /* connection may already be aborted */ }
    if (cause?.code === "23505") {
      const existing = (await client.query("select * from orders where buyer_user_id=$1 and idempotency_key=$2", [principal.user.id, idempotencyKey])).rows[0];
      if (existing?.request_hash === requestHash) return { order: existing, paymentIntent: (await client.query("select * from payment_intents where order_id=$1", [existing.id])).rows[0], replay: true, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) };
    }
    throw cause;
  }
}

export function devSettlementAllowed(request) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production") return false;
  const host = String(request?.headers?.host || "").split(":")[0];
  if (!["127.0.0.1", "localhost"].includes(host)) return false;
  try {
    const database = new URL(process.env.DATABASE_URL || "");
    if (!["127.0.0.1", "localhost"].includes(database.hostname) || !["fixoku_platform_dev", "fixoku_platform_test"].includes(database.pathname.slice(1))) return false;
  } catch { return false; }
  return process.env.FIXOKU_DEV_COMMERCE_SETTLEMENT_ENABLED === "1";
}

export async function buildLegalSnapshots(client, { orderId, buyerUserId }) {
  if (!UUID_PATTERN.test(String(orderId || ""))) throw error("INVALID_ORDER_ID", 400);
  const row = (await client.query(`select o.*,u.email as buyer_email, u.display_name as buyer_name, coalesce(json_agg(json_build_object('title',oi.title_snapshot,'quantity',oi.quantity,'totalMinor',oi.total_minor,'currency',oi.currency,'deliveryMode',oi.delivery_mode_snapshot)) filter (where oi.id is not null),'[]') as items from orders o join platform_users u on u.id=o.buyer_user_id left join order_items oi on oi.order_id=o.id where o.id=$1 and o.buyer_user_id=$2 group by o.id,u.email,u.display_name`, [orderId, buyerUserId])).rows[0];
  if (!row) throw error("ORDER_NOT_FOUND", 404);
  const now = new Date().toISOString();
  const base = { orderId: row.id, version: "fixoku-legal-v1", timestamp: now, seller: "LEGAL_VALUE_REQUIRED", buyer: { name: row.buyer_name || "", email: row.buyer_email || "" }, items: row.items, currency: row.currency, subtotalMinor: Number(row.subtotal_minor), totalMinor: Number(row.total_minor), taxMinor: null, shippingMinor: null, payment: "PAYTR / CONFIG_REQUIRED", delivery: "Ürün ve hizmet türüne göre sipariş kaydındaki koşullar uygulanır." };
  return { preInformation: { ...base, documentType: "PRE_INFORMATION" }, distanceSalesAgreement: { ...base, documentType: "DISTANCE_SALES_AGREEMENT", acceptanceRequired: true } };
}

export async function fulfillSuccessfulPayment(pool, { orderId, actorUserId = null, provider = "DEV_ONLY_LOCAL", providerEventId = `dev-settlement:${orderId}`, amountMinor = undefined, currency = undefined }) {
  if (!UUID_PATTERN.test(String(orderId || ""))) throw error("INVALID_ORDER_ID", 400);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [orderId]);
    const order = (await client.query("select * from orders where id=$1 for update", [orderId])).rows[0];
    if (!order) throw error("ORDER_NOT_FOUND", 404);
    if (amountMinor !== undefined && Number(amountMinor) !== Number(order.total_minor)) throw error("PAYMENT_AMOUNT_MISMATCH", 409);
    if (currency !== undefined && String(currency).toUpperCase() !== String(order.currency).toUpperCase()) throw error("PAYMENT_CURRENCY_MISMATCH", 409);
    const payment = (await client.query("select * from payment_intents where order_id=$1 for update", [orderId])).rows[0];
    if (!payment) throw error("PAYMENT_INTENT_NOT_FOUND", 409);
    const payloadHash = sha256({ provider, providerEventId, orderId, amountMinor: order.total_minor, currency: order.currency });
    const existingEvent = (await client.query("select * from payment_webhook_events where provider=$1 and provider_event_id=$2 for update", [provider, providerEventId])).rows[0];
    if (existingEvent && existingEvent.payload_hash !== payloadHash) throw error("WEBHOOK_PAYLOAD_CONFLICT", 409);
    if (existingEvent?.status === "APPLIED" || order.status === "PAID") {
      const entitlements = (await client.query("select id from package_entitlements where source_order_id=$1 order by id", [orderId])).rows;
      await client.query("commit");
      return { orderStatus: "PAID", entitlementIds: entitlements.map((row) => row.id), replay: true, webhookEventId: existingEvent?.id || null };
    }
    const webhook = (await client.query(`
      insert into payment_webhook_events(provider,provider_event_id,event_type,payload_hash,payload_summary_json,status,attempt_count)
      values($1,$2,'PAYMENT_SUCCEEDED',$3,$4,'VERIFIED',1)
      on conflict(provider,provider_event_id) do update set attempt_count=payment_webhook_events.attempt_count+1
      returning *
    `, [provider, providerEventId, payloadHash, JSON.stringify({ orderId, amountMinor: order.total_minor, currency: order.currency })])).rows[0];
    await client.query(`insert into payment_transactions(payment_intent_id,provider,provider_transaction_id,transaction_type,status,amount_minor,currency,metadata_json,occurred_at) values($1,$2,$3,'SETTLEMENT','SUCCEEDED',$4,$5,$6,now()) on conflict(provider,provider_transaction_id,transaction_type) do nothing`, [payment.id, provider, providerEventId, order.total_minor, order.currency, JSON.stringify({ source: "LOCAL_DEV_ONLY" })]);
    await client.query("update payment_intents set status='SUCCEEDED',provider=$1,provider_reference=$2,succeeded_at=coalesce(succeeded_at,now()),updated_at=now() where id=$3", [provider, providerEventId, payment.id]);
    await client.query("update orders set status='PAID',completed_at=coalesce(completed_at,now()),updated_at=now() where id=$1", [order.id]);
    const items = (await client.query("select * from order_items where order_id=$1 order by id", [order.id])).rows;
    const entitlementIds = [];
    const enrollmentIds = [];
    const assignmentRequestIds = [];
    for (const item of items) {
      const issuanceKey = `ENTITLEMENT:${item.id}:${order.beneficiary_student_user_id}`;
      const entitlement = (await client.query(`
        insert into package_entitlements(beneficiary_student_user_id,beneficiary_student_profile_id,package_id,package_version_id,source_order_id,source_order_item_id,status,issuance_key)
        values($1,$2,$3,$4,$5,$6,'ACTIVE',$7)
        on conflict(issuance_key) do nothing returning *
      `, [order.beneficiary_student_user_id, order.beneficiary_student_profile_id, item.package_id, item.package_version_id, order.id, item.id, issuanceKey])).rows[0] || (await client.query("select * from package_entitlements where issuance_key=$1", [issuanceKey])).rows[0];
      entitlementIds.push(entitlement.id);
      const definitions = JSON.parse(item.entitlement_definitions_snapshot || "[]");
      for (const definition of definitions) {
        const insertedEnrollment = (await client.query(`insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') on conflict(student_user_id,training_program_id) do nothing returning id`, [order.beneficiary_student_user_id, definition.trainingProgramId])).rows[0];
        const enrollment = insertedEnrollment || (await client.query("select id from enrollments where student_user_id=$1 and training_program_id=$2", [order.beneficiary_student_user_id, definition.trainingProgramId])).rows[0];
        if (!enrollment) throw error("ENROLLMENT_MATERIALIZATION_FAILED", 409);
        enrollmentIds.push(enrollment.id);
        const link = (await client.query(`insert into package_entitlement_enrollments(package_entitlement_id,enrollment_id,training_program_id,source_order_item_id) values($1,$2,$3,$4) on conflict(package_entitlement_id,training_program_id) do nothing returning id`, [entitlement.id, enrollment.id, definition.trainingProgramId, item.id])).rows[0];
        if (link) await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'education.enrollment.materialized','enrollment','${enrollment.id}','SUCCESS',$2,$3)`, [actorUserId, crypto.randomUUID(), JSON.stringify({ entitlementId: entitlement.id, orderItemId: item.id, trainingProgramId: definition.trainingProgramId })]);
        if (["TRAINER_LED", "HYBRID"].includes(definition.deliveryMode)) {
          const requestRow = (await client.query(`insert into trainer_assignment_requests(enrollment_id,status) values($1,'PENDING') on conflict (enrollment_id) where status='PENDING' do nothing returning id`, [enrollment.id])).rows[0];
          const resolved = requestRow || (await client.query("select id from trainer_assignment_requests where enrollment_id=$1 and status='PENDING'", [enrollment.id])).rows[0];
          if (resolved) { assignmentRequestIds.push(resolved.id); if (requestRow) await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'education.assignment_request.created','trainer_assignment_request',$2,'SUCCESS',$3,$4)`, [actorUserId, resolved.id, crypto.randomUUID(), JSON.stringify({ enrollmentId: enrollment.id, entitlementId: entitlement.id })]); }
        }
      }
      if (entitlement.created_at || entitlement.id) await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'commerce.entitlement.granted','package_entitlement',$2,'SUCCESS',$3,$4) on conflict do nothing`, [actorUserId, entitlement.id, crypto.randomUUID(), JSON.stringify({ orderId: order.id, orderItemId: item.id, packageVersionId: item.package_version_id })]);
    }
    await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'commerce.payment.succeeded','order',$2,'SUCCESS',$3,$4)`, [actorUserId, order.id, crypto.randomUUID(), JSON.stringify({ provider, providerEventId, paymentIntentId: payment.id })]);
    await client.query("update payment_webhook_events set status='APPLIED',processed_at=now(),error_code=null where id=$1", [webhook.id]);
    await client.query("commit");
    return { orderStatus: "PAID", entitlementIds: [...new Set(entitlementIds)], enrollmentIds: [...new Set(enrollmentIds)], assignmentRequestIds: [...new Set(assignmentRequestIds)], replay: false, webhookEventId: webhook.id };
  } catch (cause) {
    try { await client.query("rollback"); } catch { /* ignore rollback failure */ }
    throw cause;
  } finally { client.release(); }
}
