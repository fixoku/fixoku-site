import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import pg from "pg";
import { devSettlementAllowed, fulfillSuccessfulPayment } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headersOf = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); } }

/** Clearly local-only settlement. It never represents a real payment provider. */
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headersOf(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  let payload;
  try { payload = await body(req); } catch (error) { return json(res, error.status || 400, { error: error.message }); }
  if (!devSettlementAllowed(req)) return json(res, 403, { error: "DEV_SETTLEMENT_LOCAL_ONLY", devOnly: true });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const check = await pool.query("select buyer_user_id,status from orders where id=$1", [payload.orderId]);
    if (!check.rowCount) return json(res, 404, { error: "ORDER_NOT_FOUND", devOnly: true });
    const admin = principal.memberships.some((membership) => membership.role === "SUPER_ADMIN");
    if (!admin && check.rows[0].buyer_user_id !== principal.user?.id) return json(res, 403, { error: "FORBIDDEN", devOnly: true });
    const result = await fulfillSuccessfulPayment(pool, { orderId: payload.orderId, actorUserId: principal.user?.id || null, provider: "DEV_ONLY_LOCAL", providerEventId: `dev-settlement:${payload.orderId}` });
    return json(res, 200, { devOnly: true, provider: "DEV_ONLY_LOCAL", idempotent: result.replay, ...result });
  } catch (error) { return json(res, error.status || 409, { error: error.code || error.message || "DEV_SETTLEMENT_FAILED", devOnly: true }); } finally { await pool.end(); }
}
