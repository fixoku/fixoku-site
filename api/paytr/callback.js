import pg from "pg";
import { verifyPaytrCallback } from "../../src/server/payments/paytr.js";
import { fulfillSuccessfulPayment } from "../../src/server/domain/commerce.js";

const text = (res, status, value) => { res.statusCode = status; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end(value); };
async function fields(req) { let raw = ""; for await (const chunk of req) raw += chunk; return Object.fromEntries(new URLSearchParams(raw)); }
export default async function handler(req, res) {
  if (req.method !== "POST") return text(res, 405, "METHOD_NOT_ALLOWED");
  let payload; try { payload = await fields(req); } catch { return text(res, 400, "BAD_REQUEST"); }
  if (!verifyPaytrCallback(payload)) return text(res, 401, "PAYTR_HASH_INVALID");
  if (!payload.merchant_oid || !["success", "failed"].includes(String(payload.status))) return text(res, 400, "INVALID_CALLBACK");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (payload.status === "failed") { await pool.query("update orders set status='PAYMENT_FAILED',updated_at=now() where id=$1 and status='PENDING_PAYMENT'", [payload.merchant_oid]); return text(res, 200, "OK"); }
    const order = (await pool.query("select total_minor,currency from orders where id=$1", [payload.merchant_oid])).rows[0];
    if (!order) return text(res, 404, "ORDER_NOT_FOUND");
    const result = await fulfillSuccessfulPayment(pool, { orderId: payload.merchant_oid, provider: "PAYTR", providerEventId: `paytr:${payload.merchant_oid}`, amountMinor: Number(payload.total_amount), currency: order.currency });
    return text(res, 200, result.replay ? "OK" : "OK");
  } catch (error) { return text(res, error.status || 409, error.code || "CALLBACK_FAILED"); } finally { await pool.end(); }
}
