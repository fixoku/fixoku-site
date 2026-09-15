import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { buildLegalSnapshots } from "../../src/server/domain/commerce.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]))); if (!principal?.user) return json(res, 401, { error: "UNAUTHENTICATED" });
  const orderId = new URL(req.url, "http://local").searchParams.get("orderId"); const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try { return json(res, 200, await buildLegalSnapshots(pool, { orderId, buyerUserId: principal.user.id })); } catch (error) { return json(res, error.status || 503, { error: error.code || "LEGAL_SNAPSHOT_FAILED" }); } finally { await pool.end(); }
}
