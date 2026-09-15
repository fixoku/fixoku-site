const identities = Object.freeze({
  "ersin": { email: "ersin@fixoku.com.tr", role: "OWNER", redirect: "/panel/owner", name: "Ersin", rateLimitIp: "127.0.0.11" },
  "ozlem-kaplan": { email: "ozlem.kaplan@fixoku.com.tr", role: "TRAINER", redirect: "/panel/egitmen", name: "Özlem KAPLAN", rateLimitIp: "127.0.0.12" },
  "elif-usta": { email: "elif.usta@fixoku.com.tr", role: "TRAINER", redirect: "/panel/egitmen", name: "Elif USTA", rateLimitIp: "127.0.0.13" },
  "hatice-kubra-usta": { email: "hatice.kubra.usta@fixoku.com.tr", role: "STUDENT", redirect: "/panel/ogrenci", name: "Hatice Kübra USTA", rateLimitIp: "127.0.0.14" },
  "ali-asaf-usta": { email: "ali.asaf.usta@fixoku.com.tr", role: "STUDENT", redirect: "/panel/ogrenci", name: "Ali Asaf USTA", rateLimitIp: "127.0.0.15" },
});
const loopback = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const normalizeHost = (value) => String(value || "").trim().toLowerCase().replace(/^\[|\]$/gu, "");
const isLoopbackAddress = (value) => {
  const normalized = normalizeHost(value);
  return loopback.has(normalized) || normalized === "::ffff:127.0.0.1";
};
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const parseBody = async (req) => { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; };
function enabled(req) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production") return false;
  if (process.env.LOCAL_REVIEW_MODE !== "1") return false;
  const rawHost = String(req.headers?.host || "").trim();
  const host = rawHost.startsWith("[") ? rawHost.slice(1, rawHost.indexOf("]")) : rawHost.split(":")[0];
  if (!isLoopbackAddress(host)) return false;
  // In a real HTTP server, the socket peer is authoritative. A remote client
  // must not be able to reach this endpoint by spoofing a loopback Host header.
  const remoteAddress = req.socket?.remoteAddress;
  return remoteAddress == null || isLoopbackAddress(remoteAddress);
}
function headers(req) { return new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)])); }
export default async function handler(req, res) { if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" }); if (!enabled(req)) return json(res, 404, { error: "LOCAL_REVIEW_DISABLED" }); let payload; try { payload = await parseBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); } const slug = typeof payload?.slug === "string" ? payload.slug : ""; const identity = identities[slug]; if (!identity) return json(res, 400, { error: "INVALID_LOCAL_REVIEW_IDENTITY" }); const password = process.env.TEST_SEED_PASSWORD; if (!password) return json(res, 503, { error: "LOCAL_REVIEW_TEST_PASSWORD_NOT_CONFIGURED" }); const trustedOrigin = process.env.APP_ORIGIN || `http://${req.headers?.host || "127.0.0.1:5173"}`; try { const { auth } = await import("../../src/server/auth/auth.js"); const existingCookie = headers(req).get("cookie"); const localAuthHeaders = { origin: trustedOrigin, "x-forwarded-for": identity.rateLimitIp, "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }; if (existingCookie) { const signOut = await auth.handler(new Request("http://local/api/auth/sign-out", { method: "POST", headers: { ...localAuthHeaders, cookie: existingCookie } })); await signOut.arrayBuffer(); } const signIn = await auth.handler(new Request("http://local/api/auth/sign-in/email", { method: "POST", headers: { ...localAuthHeaders, "content-type": "application/json" }, body: JSON.stringify({ email: identity.email, password }) })); await signIn.text(); if (!signIn.ok) return json(res, signIn.status, { error: "LOCAL_REVIEW_LOGIN_FAILED" }); for (const [key, value] of signIn.headers.entries()) if (key.toLowerCase() === "set-cookie") res.setHeader("set-cookie", value); return json(res, 200, { ok: true, redirect: identity.redirect, user: { name: identity.name }, role: identity.role }); } catch { return json(res, 503, { error: "LOCAL_REVIEW_AUTHORITY_UNAVAILABLE" }); } }
export { identities, enabled };
