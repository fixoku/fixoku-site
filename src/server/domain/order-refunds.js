import crypto from "node:crypto";
import { verifyRefundEvidence } from "../payments/refund-adapter.js";
import { queuePanelNotification, queueRolePanelNotifications } from "./panel-notifications.js";

const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const REFUNDABLE_ORDER_STATUSES = new Set(["PAID"]);
const ACTIVE_REFUND_STATUSES = new Set(["REQUESTED", "OWNER_APPROVED", "REFUND_PENDING_PROVIDER"]);
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");

async function readOrder(client, orderId) {
  const row = (await client.query(`
    select o.*,pi.id as payment_intent_id,pi.status as payment_status,pi.provider as payment_provider,
      pi.amount_minor as payment_amount_minor,pi.currency as payment_currency
    from orders o
    join payment_intents pi on pi.order_id=o.id
    where o.id=$1
    for update
  `, [orderId])).rows[0];
  if (!row) throw fail("ORDER_NOT_FOUND", 404);
  if (!row.payment_intent_id) throw fail("PAYMENT_INTENT_NOT_FOUND", 409);
  return row;
}

async function assertFullRefundPolicy(client, orderId) {
  const completed = (await client.query(`
    select 1
    from package_entitlement_enrollments pee
    join package_entitlements pe on pe.id=pee.package_entitlement_id
    join enrollments e on e.id=pee.enrollment_id
    where pe.source_order_id=$1
      and (e.status='COMPLETED' or exists(select 1 from enrollment_completions ec where ec.enrollment_id=e.id))
    limit 1
  `, [orderId])).rows[0];
  if (completed) throw fail("REFUND_COMPLETED_TRAINING_POLICY_REQUIRED", 409);

  const completedGroup = (await client.query(`
    select 1
    from package_entitlement_enrollments pee
    join package_entitlements pe on pe.id=pee.package_entitlement_id
    join r6_training_group_participants rgp on rgp.enrollment_id=pee.enrollment_id
    join r6_training_groups rg on rg.id=rgp.training_group_id
    where pe.source_order_id=$1
      and (rg.status='COMPLETED' or rgp.status='COMPLETED')
    limit 1
  `, [orderId])).rows[0];
  if (completedGroup) throw fail("REFUND_COMPLETED_TRAINING_POLICY_REQUIRED", 409);

  const shipped = (await client.query(
    "select 1 from shipments where order_id=$1 and status not in ('WAITING','PREPARING','CANCELLED') limit 1",
    [orderId],
  )).rows[0];
  if (shipped) throw fail("REFUND_SHIPMENT_POLICY_REQUIRED", 409);
}

async function event(client, { requestId, actorUserId, eventType, previousStatus, nextStatus, metadata = {} }) {
  await client.query(
    "insert into order_refund_request_events(refund_request_id,actor_user_id,event_type,previous_status,next_status,metadata_json) values($1,$2,$3,$4,$5,$6)",
    [requestId, actorUserId, eventType, previousStatus || null, nextStatus, JSON.stringify(metadata)],
  );
}

async function readRequest(client, requestId) {
  return (await client.query("select * from order_refund_requests where id=$1 for update", [requestId])).rows[0] || null;
}

async function readRequestByIdempotency(client, idempotencyKey) {
  return (await client.query("select * from order_refund_requests where idempotency_key=$1 for update", [idempotencyKey])).rows[0] || null;
}

async function reconcileEntitlementsAndPayouts(client, { request, order, actorUserId }) {
  const entitlements = (await client.query(`
    select pe.id,pe.beneficiary_student_user_id,pe.source_order_item_id
    from package_entitlements pe
    where pe.source_order_id=$1 and pe.status='ACTIVE'
    for update
  `, [order.id])).rows;
  const enrollmentRows = entitlements.length
    ? (await client.query(`
      select e.id,e.student_user_id
      from package_entitlement_enrollments pee
      join package_entitlements pe on pe.id=pee.package_entitlement_id
      join enrollments e on e.id=pee.enrollment_id
      where pe.source_order_id=$1
      for update
    `, [order.id])).rows
    : [];
  const enrollmentIds = [...new Set(enrollmentRows.map((row) => row.id))];

  if (enrollmentIds.length) {
    await client.query("update trainer_assignment_requests set status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),updated_at=now() where enrollment_id=any($1::uuid[]) and status <> 'CANCELLED'", [enrollmentIds]);
    await client.query("update trainer_assignments set status='ARCHIVED',ended_at=coalesce(ended_at,now()),ended_reason='ORDER_REFUNDED',updated_at=now() where enrollment_id=any($1::uuid[]) and status='ACTIVE'", [enrollmentIds]);
    await client.query("update enrollment_sessions set status='CANCELLED',notes=concat_ws(' · ',notes,'ORDER_REFUNDED') where enrollment_id=any($1::uuid[]) and status='SCHEDULED'", [enrollmentIds]);
    await client.query("update r6_training_group_participants set status='REFUNDED',billable=false,refund_at=coalesce(refund_at,now()),updated_at=now() where enrollment_id=any($1::uuid[]) and status='ACTIVE'", [enrollmentIds]);
    await client.query("update enrollments set status='CANCELLED',updated_at=now() where id=any($1::uuid[]) and status in ('ACTIVE','PAUSED')", [enrollmentIds]);
  }
  if (entitlements.length) {
    await client.query("update package_entitlements set status='REVOKED',revoked_at=coalesce(revoked_at,now()),updated_at=now() where source_order_id=$1 and status='ACTIVE'", [order.id]);
  }

  const earnings = enrollmentIds.length
    ? (await client.query(`
      select e.id,e.trainer_user_id,e.amount_minor,e.currency,e.status,e.assignment_id,e.enrollment_id,e.billable_student_count
      from trainer_earning_ledger e
      where e.enrollment_id=any($1::uuid[])
        and e.status <> 'REVERSED'
      for update
    `, [enrollmentIds])).rows
    : [];
  const paidByCurrency = new Map();
  const reversedEarningIds = [];
  const adjustmentIds = [];
  for (const earning of earnings) {
    if (["PENDING", "EARNED", "PAYABLE", "HELD"].includes(String(earning.status))) {
      await client.query("update trainer_earning_ledger set status='REVERSED',hold_reason=$2 where id=$1", [earning.id, `ORDER_REFUNDED:${request.id}`]);
      reversedEarningIds.push(earning.id);
      continue;
    }
    if (String(earning.status) === "PAID") {
      const amount = Number(earning.amount_minor || 0);
      const key = `${earning.currency}`;
      paidByCurrency.set(key, (paidByCurrency.get(key) || 0) + amount);
      const adjustmentKey = `ORDER_REFUND_RECONCILIATION:${request.id}:${earning.id}`;
      const adjustment = (await client.query(`
        insert into trainer_earning_ledger(trainer_user_id,student_user_id,training_program_id,assignment_id,enrollment_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,adjustment_of_id,billable_student_count,occurred_at)
        select trainer_user_id,student_user_id,training_program_id,assignment_id,enrollment_id,'ADJUSTMENT','EARNED',0-$2::integer,currency,'Order refund payout reconciliation','ORDER_REFUND_RECONCILIATION',$3,$1,id,billable_student_count,now()
        from trainer_earning_ledger where id=$4
        on conflict(idempotency_key) do nothing
        returning id
      `, [adjustmentKey, amount, request.id, earning.id])).rows[0];
      if (adjustment) adjustmentIds.push(adjustment.id);
    }
  }
  for (const [currency, amount] of paidByCurrency.entries()) {
    if (!amount) continue;
    await client.query(
      "insert into owner_finance_ledger(entry_type,source_type,source_id,amount_minor,currency,metadata_json,created_by) values('TRAINER_REFUND_RECONCILIATION','ORDER_REFUND',$1,$2,$3,$4,$5)",
      [request.id, -amount, currency, JSON.stringify({ orderId: order.id, paidEarningReconciledMinor: amount, adjustmentIds }), actorUserId],
    );
  }
  await client.query("update order_refund_requests set entitlement_revoked_at=now(),payout_reconciled_at=now(),updated_at=now() where id=$1", [request.id]);
  await event(client, { requestId: request.id, actorUserId, eventType: "ENTITLEMENTS_REVOKED", previousStatus: "REFUND_PENDING_PROVIDER", nextStatus: "REFUND_PENDING_PROVIDER", metadata: { entitlementIds: entitlements.map((row) => row.id), enrollmentIds, reversedEarningIds } });
  await event(client, { requestId: request.id, actorUserId, eventType: "PAYOUT_RECONCILED", previousStatus: "REFUND_PENDING_PROVIDER", nextStatus: "REFUND_PENDING_PROVIDER", metadata: { adjustmentIds, paidByCurrency: Object.fromEntries(paidByCurrency) } });
  return { entitlementIds: entitlements.map((row) => row.id), enrollmentIds, reversedEarningIds, adjustmentIds, paidByCurrency: Object.fromEntries(paidByCurrency) };
}

async function process(client, { orderId, actorUserId, action, reason, idempotencyKey, evidence }) {
  let resolvedOrderId = orderId;
  if (action !== "REQUEST" && evidence?.requestId) {
    const target = (await client.query("select order_id from order_refund_requests where id=$1", [evidence.requestId])).rows[0];
    if (!target) throw fail("REFUND_REQUEST_NOT_FOUND", 404);
    resolvedOrderId = target.order_id;
  }
  const order = await readOrder(client, resolvedOrderId);
  if (!idempotencyKey || idempotencyKey.length > 160) throw fail("REFUND_IDEMPOTENCY_KEY_REQUIRED", 400);
  const requestHash = hash({ orderId, action, reason, evidence: evidence || null });

  if (action === "REQUEST") {
    const existing = await readRequestByIdempotency(client, idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) throw fail("REFUND_IDEMPOTENCY_CONFLICT", 409);
      return { request: existing, replay: true };
    }
    if (!REFUNDABLE_ORDER_STATUSES.has(String(order.status)) || String(order.payment_status) !== "SUCCEEDED") throw fail("ORDER_NOT_REFUNDABLE", 409);
    if (Number(order.payment_amount_minor) !== Number(order.total_minor) || order.payment_currency !== order.currency) throw fail("PAYMENT_INTENT_MISMATCH", 409);
    if (Number(evidence?.amountMinor || order.total_minor) !== Number(order.total_minor)) throw fail("FULL_REFUND_ONLY", 409);
    const request = (await client.query(`
      insert into order_refund_requests(order_id,requested_by,status,amount_minor,currency,reason,idempotency_key,request_hash)
      values($1,$2,'REQUESTED',$3,$4,$5,$6,$7)
      returning *
    `, [order.id, actorUserId, order.total_minor, order.currency, reason, idempotencyKey, requestHash])).rows[0];
    await event(client, { requestId: request.id, actorUserId, eventType: "REQUESTED", nextStatus: "REQUESTED", metadata: { orderId: order.id, amountMinor: order.total_minor } });
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'order.refund.requested','order_refund_request',$2,'SUCCESS',gen_random_uuid(),$3)", [actorUserId, request.id, JSON.stringify({ orderId: order.id, amountMinor: order.total_minor, reason })]);
    return { request, replay: false };
  }

  const request = await readRequest(client, String(evidence?.requestId || ""));
  if (!request) throw fail("REFUND_REQUEST_NOT_FOUND", 404);
  if (String(request.order_id) !== String(order.id)) throw fail("REFUND_ORDER_MISMATCH", 409);
  if (action === "APPROVE") {
    if (request.status === "OWNER_APPROVED" || request.status === "REFUNDED") return { request, replay: true, providerCallRequired: request.status !== "REFUNDED" };
    if (request.status !== "REQUESTED") throw fail("REFUND_REQUEST_NOT_APPROVABLE", 409);
    await assertFullRefundPolicy(client, order.id);
    await client.query("update order_refund_requests set status='OWNER_APPROVED',approved_by=$2,approved_at=now(),updated_at=now() where id=$1", [request.id, actorUserId]);
    await event(client, { requestId: request.id, actorUserId, eventType: "OWNER_APPROVED", previousStatus: request.status, nextStatus: "OWNER_APPROVED", metadata: { providerCallRequired: true } });
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'order.refund.owner_approved','order_refund_request',$2,'SUCCESS',gen_random_uuid(),$3)", [actorUserId, request.id, JSON.stringify({ orderId: order.id, providerCallRequired: true })]);
    return { request: { ...request, status: "OWNER_APPROVED" }, replay: false, providerCallRequired: true };
  }
  if (action === "REJECT") {
    if (request.status === "REJECTED") return { request, replay: true };
    if (!ACTIVE_REFUND_STATUSES.has(String(request.status))) throw fail("REFUND_REQUEST_NOT_REJECTABLE", 409);
    await client.query("update order_refund_requests set status='REJECTED',rejected_by=$2,rejected_at=now(),rejection_reason=$3,updated_at=now() where id=$1", [request.id, actorUserId, reason]);
    await event(client, { requestId: request.id, actorUserId, eventType: "REJECTED", previousStatus: request.status, nextStatus: "REJECTED", metadata: { reason } });
    return { request: { ...request, status: "REJECTED" }, replay: false };
  }
  if (action !== "VERIFY_REFUND") throw fail("REFUND_ACTION_INVALID", 400);
  if (request.status === "REFUNDED") return { request, replay: true, providerCallRequired: false };
  if (request.status !== "OWNER_APPROVED") throw fail("REFUND_PROVIDER_VERIFICATION_REQUIRED", 409);
  await assertFullRefundPolicy(client, order.id);
  const verified = verifyRefundEvidence(evidence, { expectedAmountMinor: request.amount_minor, currency: request.currency, provider: order.payment_provider });
  const transaction = (await client.query(`
    insert into payment_transactions(payment_intent_id,provider,provider_transaction_id,transaction_type,status,amount_minor,currency,metadata_json,occurred_at)
    values($1,$2,$3,'REFUND','SUCCEEDED',$4,$5,$6,now())
    on conflict(provider,provider_transaction_id,transaction_type) do nothing
    returning id
  `, [order.payment_intent_id, verified.provider, verified.providerTransactionId, verified.confirmedAmountMinor, verified.currency, JSON.stringify({ refundRequestId: request.id, providerReference: verified.providerReference, verificationReference: verified.verificationReference, externalCallPerformed: false })])).rows[0];
  if (!transaction) {
    const existing = (await client.query("select id,payment_intent_id,amount_minor,status from payment_transactions where provider=$1 and provider_transaction_id=$2 and transaction_type='REFUND'", [verified.provider, verified.providerTransactionId])).rows[0];
    if (!existing || String(existing.payment_intent_id) !== String(order.payment_intent_id) || Number(existing.amount_minor) !== Number(verified.confirmedAmountMinor) || existing.status !== "SUCCEEDED") throw fail("REFUND_PROVIDER_TRANSACTION_CONFLICT", 409);
  }
  await client.query("update payment_intents set status='REFUNDED',updated_at=now() where id=$1 and status in ('SUCCEEDED','PARTIALLY_REFUNDED')", [order.payment_intent_id]);
  await client.query("update orders set status='REFUNDED',updated_at=now() where id=$1 and status in ('PAID','PARTIALLY_REFUNDED')", [order.id]);
  await client.query("update order_refund_requests set status='REFUNDED',provider=$2,provider_reference=$3,provider_transaction_id=$4,provider_verification_reference=$5,provider_verified_at=now(),verified_amount_minor=$6,updated_at=now() where id=$1", [request.id, verified.provider, verified.providerReference, verified.providerTransactionId, verified.verificationReference, verified.confirmedAmountMinor]);
  await event(client, { requestId: request.id, actorUserId, eventType: "PROVIDER_VERIFIED", previousStatus: request.status, nextStatus: "REFUNDED", metadata: { provider: verified.provider, providerReference: verified.providerReference, providerTransactionId: verified.providerTransactionId, externalCallPerformed: false } });
  const reconciliation = await reconcileEntitlementsAndPayouts(client, { request: { ...request, id: request.id }, order, actorUserId });
  await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'order.refund.provider_verified','order_refund_request',$2,'SUCCESS',gen_random_uuid(),$3)", [actorUserId, request.id, JSON.stringify({ orderId: order.id, provider: verified.provider, reconciliation })]);
  const beneficiary = (await client.query("select id,email from platform_users where id=$1", [order.beneficiary_student_user_id])).rows[0];
  if (beneficiary?.id) {
    await queuePanelNotification(client, {
      recipientUserId: beneficiary.id,
      recipientEmail: beneficiary.email,
      eventType: "ORDER_REFUNDED",
      title: "İade tamamlandı",
      body: "Siparişiniz iade edildi; ilgili eğitim hakları ve atamalar güvenli biçimde kapatıldı.",
      metadata: { path: "/panel/ogrenci", orderId: order.id, refundRequestId: request.id },
      dedupeKey: `order-refunded:${order.id}`,
    });
  }
  await queueRolePanelNotifications(client, {
    role: "OWNER",
    scopeType: "GLOBAL",
    eventType: "REFUND_COMPLETED",
    title: "İade tamamlandı",
    body: "Sipariş iadesi tamamlandı ve eğitim/ hakediş uzlaştırması kaydedildi.",
    metadata: { path: `/panel/owner/iadeler?orderId=${order.id}`, orderId: order.id, refundRequestId: request.id },
    dedupeKey: `refund-completed:${order.id}`,
    emailSubject: "İade tamamlandı",
  });
  for (const trainer of (await client.query("select distinct a.trainer_user_id as id,u.email from trainer_assignments a join platform_users u on u.id=a.trainer_user_id where a.enrollment_id=any($1::uuid[])", [reconciliation.enrollmentIds])).rows) {
    await queuePanelNotification(client, {
      recipientUserId: trainer.id,
      recipientEmail: trainer.email,
      eventType: "TRAINER_PAYOUT_RECONCILED",
      title: "Hakediş durumu güncellendi",
      body: "İade nedeniyle ilgili hakediş kaydı uzlaştırıldı ve panelinizde güncellendi.",
      metadata: { path: "/panel/egitmen/hakedislerim", orderId: order.id, refundRequestId: request.id },
      dedupeKey: `trainer-payout-reconciled:${request.id}:${trainer.id}`,
    });
  }
  const updated = (await client.query("select * from order_refund_requests where id=$1", [request.id])).rows[0];
  return { request: updated, replay: false, providerCallRequired: false, reconciliation };
}

export async function processOrderRefund(pool, options) {
  const client = options.manageTransaction === false ? pool : await pool.connect();
  try {
    if (options.manageTransaction !== false) await client.query("begin");
    let lockOrderId = options.orderId;
    if (options.action !== "REQUEST" && options.evidence?.requestId) lockOrderId = (await client.query("select order_id from order_refund_requests where id=$1", [options.evidence.requestId])).rows[0]?.order_id || options.orderId;
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`order-refund:${lockOrderId}`]);
    const result = await process(client, options);
    if (options.manageTransaction !== false) await client.query("commit");
    return result;
  } catch (error) {
    if (options.manageTransaction !== false) { try { await client.query("rollback"); } catch { /* preserve original */ } }
    throw error;
  } finally {
    if (options.manageTransaction !== false) client.release();
  }
}
