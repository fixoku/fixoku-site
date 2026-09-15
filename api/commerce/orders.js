import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import pg from "pg";
import { createOrder, devSettlementAllowed } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headersOf = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); } }

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headersOf(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "order.create");
  if (denied) return json(res, denied.status, denied.body);
  let payload;
  try { payload = await body(req); } catch (error) { return json(res, error.status || 400, { error: error.message }); }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const result = await createOrder(client, principal, { packageVersionId: payload.packageVersionId, studentProfileId: payload.studentProfileId, idempotencyKey: req.headers["idempotency-key"] || payload.idempotencyKey });
    return json(res, result.replay ? 200 : 201, {
      order: result.order,
      paymentIntent: result.paymentIntent,
      providerConfigured: result.providerConfigured,
      devSettlementAvailable: devSettlementAllowed(req),
      checkoutState: result.providerConfigured ? "PROVIDER_HANDOFF_REQUIRED" : "PAYMENT_PROVIDER_NOT_CONFIGURED",
      idempotent: result.replay,
    });
  } catch (error) { return json(res, error.status || 409, { error: error.code || error.message || "ORDER_CREATE_FAILED" }); } finally { client.release(); await pool.end(); }
}
