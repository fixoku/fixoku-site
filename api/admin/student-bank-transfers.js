import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { UUID_PATTERN, fulfillSuccessfulPayment } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));

async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); }
}

function ownerOnly(principal) {
  return Boolean(principal?.user?.id && principal.memberships?.some((membership) => membership.role === "OWNER" && membership.status === "ACTIVE" && membership.scopeType === "GLOBAL" && membership.scopeId == null && String(membership.userId) === String(principal.user.id)));
}

function bankReference(orderId) {
  return `FIXOKU-${String(orderId).slice(0, 8).toUpperCase()}`;
}

async function readQueue(pool) {
  return (await pool.query(`
    select
      o.id as "orderId",
      o.created_at as "createdAt",
      o.status as "orderStatus",
      o.payment_method as "paymentMethod",
      o.currency,
      o.total_minor as "totalMinor",
      o.buyer_user_id as "buyerUserId",
      buyer.display_name as "buyerName",
      buyer.email as "buyerEmail",
      beneficiary.display_name as "beneficiaryName",
      pi.id as "paymentIntentId",
      pi.status as "paymentStatus",
      coalesce(json_agg(json_build_object('packageId', oi.package_id, 'packageVersionId', oi.package_version_id, 'title', oi.title_snapshot, 'quantity', oi.quantity, 'totalMinor', oi.total_minor) order by oi.created_at, oi.id) filter (where oi.id is not null), '[]'::json) as items
    from orders o
    join platform_users buyer on buyer.id=o.buyer_user_id
    join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id
    left join payment_intents pi on pi.order_id=o.id
    left join order_items oi on oi.order_id=o.id
    where o.catalog_scope_snapshot='STUDENT_COMMERCE'
      and o.payment_method='BANK_TRANSFER'
      and o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW')
      and coalesce(pi.status,'CREATED') in ('CREATED','PENDING','AUTHORIZED')
    group by o.id,buyer.display_name,buyer.email,beneficiary.display_name,pi.id
    order by o.created_at asc
    limit 500
  `)).rows.map((row) => ({ ...row, reference: bankReference(row.orderId), totalMinor: Number(row.totalMinor || 0), items: Array.isArray(row.items) ? row.items : [] }));
}

export default async function handler(req, res) {
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, req.method === "GET" ? "order.read" : "bank_transfer.approve");
    if (denied) return json(res, denied.status, denied.body);
    if (!ownerOnly(principal)) return json(res, 403, { error: "OWNER_ONLY" });

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      if (req.method === "GET") return json(res, 200, { transfers: await readQueue(pool) });
      if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

      const input = await body(req);
      const orderId = String(input.orderId || "");
      if (!UUID_PATTERN.test(orderId)) return json(res, 400, { error: "ORDER_ID_INVALID" });
      const action = String(input.action || "").trim().toUpperCase();
      if (!["APPROVE", "REJECT"].includes(action)) return json(res, 400, { error: "BANK_TRANSFER_ACTION_INVALID" });

      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [orderId]);
        const row = (await client.query("select * from orders where id=$1 for update", [orderId])).rows[0];
        if (!row || row.catalog_scope_snapshot !== "STUDENT_COMMERCE" || row.payment_method !== "BANK_TRANSFER") { await client.query("rollback"); return json(res, 404, { error: "STUDENT_BANK_TRANSFER_NOT_FOUND" }); }
        const payment = (await client.query("select * from payment_intents where order_id=$1 for update", [orderId])).rows[0];
        if (!payment) throw Object.assign(new Error("PAYMENT_INTENT_NOT_FOUND"), { status: 409 });
        if (row.status === "PAID") {
          if (action === "REJECT") { await client.query("rollback"); return json(res, 409, { error: "BANK_TRANSFER_ALREADY_APPROVED" }); }
          const result = await fulfillSuccessfulPayment(client, { orderId, actorUserId: principal.user.id, provider: "BANK_TRANSFER", providerEventId: `student-bank-transfer:${orderId}`, manageTransaction: false });
          await client.query("commit");
          return json(res, 200, { ...result, status: "APPROVED", duplicateApproval: true, entitlementActivated: true });
        }
        if (!["PENDING_PAYMENT", "PAYMENT_REVIEW"].includes(row.status)) { await client.query("rollback"); return json(res, 409, { error: "BANK_TRANSFER_NOT_REVIEWABLE" }); }
        if (!["CREATED", "PENDING", "AUTHORIZED"].includes(payment.status)) throw Object.assign(new Error("PAYMENT_INTENT_NOT_REVIEWABLE"), { status: 409 });
        if (Number(payment.amount_minor) !== Number(row.total_minor) || payment.currency !== row.currency) throw Object.assign(new Error("PAYMENT_INTENT_MISMATCH"), { status: 409 });
        if (action === "APPROVE") {
          const items = (await client.query(`select oi.package_id,oi.package_version_id,pv.package_id as version_package_id,p.audience,oi.currency from order_items oi join package_versions pv on pv.id=oi.package_version_id join packages p on p.id=oi.package_id where oi.order_id=$1`, [orderId])).rows;
          if (!items.length || items.some((item) => item.package_id !== item.version_package_id || item.audience !== "STUDENT" || item.currency !== row.currency)) throw Object.assign(new Error("ORDER_PACKAGE_MISMATCH"), { status: 409 });
          const result = await fulfillSuccessfulPayment(client, { orderId, actorUserId: principal.user.id, provider: "BANK_TRANSFER", providerEventId: `student-bank-transfer:${orderId}`, amountMinor: Number(row.total_minor), currency: row.currency, manageTransaction: false });
          if (!result.replay) await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'student.commerce.bank_transfer.review.approved','order',$2,'SUCCESS',gen_random_uuid(),$3)", [principal.user.id, orderId, JSON.stringify({ reference: bankReference(orderId), paymentMethod: "BANK_TRANSFER" })]);
          await client.query("commit");
          return json(res, 200, { ...result, status: "APPROVED", duplicateApproval: Boolean(result.replay), entitlementActivated: true });
        }
        const note = String(input.note || "").trim().slice(0, 500) || "Havale/EFT bildirimi reddedildi.";
        await client.query("update orders set status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),updated_at=now() where id=$1", [orderId]);
        await client.query("update payment_intents set status='CANCELLED',updated_at=now() where order_id=$1 and status in ('CREATED','PENDING','AUTHORIZED')", [orderId]);
        await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'student.commerce.bank_transfer.review.rejected','order',$2,'SUCCESS',gen_random_uuid(),$3)", [principal.user.id, orderId, JSON.stringify({ note, reference: bankReference(orderId), paymentMethod: "BANK_TRANSFER" })]);
        await client.query("commit");
        return json(res, 200, { status: "REJECTED", orderStatus: "CANCELLED", entitlementActivated: false });
      } catch (error) {
        try { await client.query("rollback"); } catch { /* rollback best effort */ }
        throw error;
      } finally { client.release(); }
    } finally { await pool.end(); }
  } catch (error) { return json(res, error.status || 409, { error: error.code || error.message || "STUDENT_BANK_TRANSFER_REVIEW_FAILED" }); }
}
