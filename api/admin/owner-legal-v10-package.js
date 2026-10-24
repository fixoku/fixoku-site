import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { ownerLocalFixtureAllowed } from "../../src/server/auth/local-review-runtime.js";
import { buildOwnerLegalV10Package } from "../../src/server/domain/owner-legal-v10-package.js";

const loopback = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const requestLoopback = (req) => {
  const rawHost = String(req.headers?.host || "").trim();
  const host = rawHost.startsWith("[") ? rawHost.slice(1, rawHost.indexOf("]")) : rawHost.split(":")[0];
  const remote = req.socket?.remoteAddress;
  return loopback.has(host.toLowerCase()) && (!remote || loopback.has(String(remote).replace(/^::ffff:/u, "").toLowerCase()));
};

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!ownerLocalFixtureAllowed(process.env) || !requestLoopback(req)) return json(res, 404, { error: "LOCAL_OWNER_REVIEW_DISABLED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    const owner = principal?.memberships?.some((membership) => membership.role === "OWNER" && membership.status === "ACTIVE" && membership.scopeType === "GLOBAL" && membership.scopeId == null);
    if (!owner) return json(res, 403, { error: "OWNER_ONLY" });
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="fixoku-r73-v10-owner-preview.md"');
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(buildOwnerLegalV10Package());
  } catch (error) {
    return json(res, 503, { error: error.code || "OWNER_LEGAL_V10_PACKAGE_FAILED" });
  }
}
