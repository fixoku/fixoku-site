import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { processOrderRefund } from "../../src/server/domain/order-refunds.js";
import { verifyTrustedRefundEvidenceToken } from "../../src/server/payments/refund-adapter.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const ownerOnly = (principal) => Boolean(principal?.user?.id && principal.memberships?.some((membership) => membership.role === "OWNER" && membership.status === "ACTIVE" && membership.scopeType === "GLOBAL" && membership.scopeId == null && String(membership.userId) === String(principal.user.id)));

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "refund.manage");
  if (denied) return json(res, denied.status, denied.body);
  if (!ownerOnly(principal)) return json(res, 403, { error: "OWNER_ONLY" });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") {
      const url = new URL(req.url || "/api/admin/order-refunds", "http://local");
      const orderId = url.searchParams.get("orderId");
      if (orderId && !UUID.test(orderId)) return json(res, 400, { error: "ORDER_ID_INVALID" });
      const values = orderId ? [orderId] : [];
      const where = orderId ? "where r.order_id=$1" : "";
      const rows = (await pool.query(`select r.*,o.status as "orderStatus",o.total_minor as "orderTotalMinor",o.currency as "orderCurrency",pi.status as "paymentStatus",coalesce((select json_agg(e order by e.created_at,e.id) from order_refund_request_events e where e.refund_request_id=r.id),'[]'::json) as events,coalesce((select json_build_object('active',count(*) filter (where pe.status='ACTIVE'),'revoked',count(*) filter (where pe.status='REVOKED'),'total',count(*)) from package_entitlements pe where pe.source_order_id=r.order_id),'{}'::json) as "entitlementSummary",coalesce((select json_build_object('entries',count(*),'amountMinor',coalesce(sum(fl.amount_minor),0)) from owner_finance_ledger fl where fl.source_type='ORDER_REFUND' and fl.source_id=r.id),'{}'::json) as "financeSummary" from order_refund_requests r join orders o on o.id=r.order_id left join payment_intents pi on pi.order_id=o.id ${where} order by r.created_at desc limit 250`, values)).rows;
      return json(res, 200, { refundRequests: rows });
    }
    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const input = await readBody(req);
    const action = String(input.action || "").trim().toUpperCase();
    if (!["REQUEST", "APPROVE", "VERIFY_REFUND", "REJECT"].includes(action)) return json(res, 400, { error: "REFUND_ACTION_INVALID" });
    const orderId = String(input.orderId || "");
    const requestId = String(input.refundRequestId || "");
    if (action === "REQUEST" && !UUID.test(orderId)) return json(res, 400, { error: "ORDER_ID_INVALID" });
    if (action !== "REQUEST" && !UUID.test(requestId)) return json(res, 400, { error: "REFUND_REQUEST_ID_INVALID" });
    const reason = String(input.reason || "").trim().slice(0, 500);
    if (!reason) return json(res, 400, { error: "REFUND_REASON_REQUIRED" });
    const idempotencyKey = String(input.idempotencyKey || (action === "REQUEST" ? "" : `REFUND_ACTION:${requestId}:${action}`)).trim();
    if (action === "VERIFY_REFUND") {
      const target = (await pool.query("select r.id,r.amount_minor,r.currency,pi.provider from order_refund_requests r join payment_intents pi on pi.order_id=r.order_id where r.id=$1", [requestId])).rows[0];
      if (!target) return json(res, 404, { error: "REFUND_REQUEST_NOT_FOUND" });
      const trusted = verifyTrustedRefundEvidenceToken(input.providerEvidenceToken, { requestId, expectedAmountMinor: target.amount_minor, currency: target.currency, provider: target.provider });
      input.providerReference = trusted.providerReference;
      input.providerTransactionId = trusted.providerTransactionId;
      input.verificationReference = trusted.verificationReference;
      input.confirmedAmountMinor = trusted.amountMinor;
    }
    const evidence = { ...input, requestId: action === "REQUEST" ? null : requestId };
    const result = await processOrderRefund(pool, { orderId: action === "REQUEST" ? orderId : String(input.orderId || "00000000-0000-0000-0000-000000000000"), actorUserId: principal.user.id, action, reason, idempotencyKey, evidence });
    return json(res, result.replay ? 200 : action === "REQUEST" ? 201 : 200, result);
  } catch (error) {
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "REFUND_CONFLICT" : error.code || error.message || "REFUND_UNAVAILABLE" });
  } finally {
    await pool.end();
  }
}
