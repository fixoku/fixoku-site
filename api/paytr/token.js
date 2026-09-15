import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { requestPaytrIframeToken, paytrRuntime } from "../../src/server/payments/paytr.js";
import { UUID_PATTERN } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headersOf = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headersOf(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "order.create"); if (denied) return json(res, denied.status, denied.body);
  if (paytrRuntime().status !== "CONFIGURED") return json(res, 503, { error: "PAYTR_CONFIG_REQUIRED", implementationReady: true, runtime: "CONFIG_REQUIRED" });
  let input; try { input = await body(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
  if (!UUID_PATTERN.test(String(input.orderId || ""))) return json(res, 400, { error: "INVALID_ORDER_ID" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const row = (await pool.query("select o.id,o.total_minor,o.currency,u.email from orders o join platform_users u on u.id=o.buyer_user_id where o.id=$1 and o.buyer_user_id=$2 and o.status='PENDING_PAYMENT'", [input.orderId, principal.user.id])).rows[0];
    if (!row) return json(res, 404, { error: "ORDER_NOT_FOUND" });
    const basket = Buffer.from(JSON.stringify([["Fixoku eğitim paketi", (Number(row.total_minor) / 100).toFixed(2), 1]])).toString("base64");
    const token = await requestPaytrIframeToken({ merchantOid: row.id, userIp: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0], email: row.email, paymentAmount: String(row.total_minor), userBasket: basket, currency: row.currency === "TRY" ? "TL" : row.currency, testMode: paytrRuntime().testMode });
    return json(res, 200, { token, merchantOid: row.id, iframeUrl: `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}` });
  } catch (error) { return json(res, error.status || 503, { error: error.code || "PAYTR_TOKEN_FAILED" }); } finally { await pool.end(); }
}
