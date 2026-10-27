import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { ownerLocalFixtureAllowed } from "../../src/server/auth/local-review-runtime.js";
import { R97G_TEST_IDENTITIES } from "../../src/server/auth/r97g-test-identities.js";
const configuredIdentity = (envKey, yedek) => Object.prototype.hasOwnProperty.call(process.env, envKey) ? process.env[envKey] : yedek;
const legacyIdentities = Object.freeze({
  "ersin": { email: configuredIdentity("FIXOKU_LOCAL_REVIEW_ERSIN_EMAIL", "ersin@fixoku.com.tr"), role: "OWNER", redirect: "/panel/owner", name: "Ersin", rateLimitIp: "127.0.0.11" },
  "fixoku-super-admin": { email: configuredIdentity("FIXOKU_LOCAL_REVIEW_SUPER_ADMIN_EMAIL", "super-admin.phase1c@example.test"), role: "SUPER_ADMIN", redirect: "/panel/admin", name: "Fixoku Test Super Admin", rateLimitIp: "127.0.0.16" },
  "ozlem-kaplan": { email: configuredIdentity("FIXOKU_LOCAL_REVIEW_OZLEM_EMAIL", "ozlem.kaplan@fixoku.com.tr"), role: "TRAINER", redirect: "/panel/egitmen", name: "Özlem KAPLAN", rateLimitIp: "127.0.0.12" },
  "elif-usta": { email: configuredIdentity("FIXOKU_LOCAL_REVIEW_ELIF_EMAIL", "elif.usta@fixoku.com.tr"), role: "TRAINER", redirect: "/panel/egitmen", name: "Elif USTA", rateLimitIp: "127.0.0.13" },
  "hatice-kubra-usta": { email: configuredIdentity("FIXOKU_LOCAL_REVIEW_HATICE_EMAIL", "hatice.kubra.usta@fixoku.com.tr"), role: "STUDENT", redirect: "/panel/ogrenci", name: "Hatice Kübra USTA", rateLimitIp: "127.0.0.14" },
  "ali-asaf-usta": { email: configuredIdentity("FIXOKU_LOCAL_REVIEW_ALI_EMAIL", "ali.asaf.usta@fixoku.com.tr"), role: "STUDENT", redirect: "/panel/ogrenci", name: "Ali Asaf USTA", rateLimitIp: "127.0.0.15" },
});
const identities = Object.freeze({
  ...Object.fromEntries(R97G_TEST_IDENTITIES.map((identity) => [identity.slug, identity])),
  ...legacyIdentities,
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
function cookieHeaders(response) { return typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []); }
function cookieValue(headersList) { return headersList.map((value) => String(value).split(";", 1)[0]).join("; "); }
function dedupeCookieHeaders(headersList) { const latest = new Map(); for (const value of headersList) { const pair = String(value).split(";", 1)[0]; const separator = pair.indexOf("="); if (separator > 0) latest.set(pair.slice(0, separator), value); } return [...latest.values()]; }
async function localOwnerTotpCode() {
  const uri = String(process.env.FIXOKU_LOCAL_OWNER_TOTP_URI || "");
  const secret = new URL(uri).searchParams.get("secret");
  if (!secret) throw new Error("LOCAL_OWNER_TOTP_URI_REQUIRED");
  return createOTP(new TextDecoder().decode(base32.decode(secret)), { digits: 6, period: 30 }).totp();
}
export default async function handler(req, res) { if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" }); if (!enabled(req)) return json(res, 404, { error: "LOCAL_REVIEW_DISABLED" }); let payload; try { payload = await parseBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); } const slug = typeof payload?.slug === "string" ? payload.slug : ""; const localOwner = slug === "owner-local"; if (localOwner && !ownerLocalFixtureAllowed(process.env)) return json(res, 404, { error: "LOCAL_OWNER_REVIEW_DISABLED" }); const identity = localOwner ? { email: process.env.FIXOKU_LOCAL_OWNER_EMAIL, role: "OWNER", redirect: "/panel/owner", name: process.env.FIXOKU_LOCAL_OWNER_NAME || "Yerel Owner fixture", rateLimitIp: "127.0.0.17" } : identities[slug]; if (!identity) return json(res, 400, { error: "INVALID_LOCAL_REVIEW_IDENTITY" }); const password = localOwner ? process.env.FIXOKU_LOCAL_OWNER_PASSWORD : process.env.TEST_SEED_PASSWORD; if (!password) return json(res, 503, { error: "LOCAL_REVIEW_TEST_PASSWORD_NOT_CONFIGURED" }); const trustedOrigin = process.env.APP_ORIGIN || `http://${req.headers?.host || "127.0.0.1:5173"}`; try { const { auth } = await import("../../src/server/auth/auth.js"); const existingCookie = headers(req).get("cookie"); const localAuthHeaders = { origin: trustedOrigin, "x-forwarded-for": identity.rateLimitIp, "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }; if (existingCookie) { const signOut = await auth.handler(new Request("http://local/api/auth/sign-out", { method: "POST", headers: { ...localAuthHeaders, cookie: existingCookie } })); await signOut.arrayBuffer(); } const signIn = await auth.handler(new Request("http://local/api/auth/sign-in/email", { method: "POST", headers: { ...localAuthHeaders, "content-type": "application/json" }, body: JSON.stringify({ email: identity.email, password }) })); const signInBody = await signIn.json().catch(() => ({})); if (!signIn.ok) return json(res, signIn.status, { error: "LOCAL_REVIEW_LOGIN_FAILED" }); let finalCookies = cookieHeaders(signIn); if (localOwner && signInBody.twoFactorRedirect === true) { const challengeCookie = cookieValue(finalCookies); const verify = await auth.handler(new Request("http://local/api/auth/two-factor/verify-totp", { method: "POST", headers: { ...localAuthHeaders, cookie: challengeCookie, "content-type": "application/json" }, body: JSON.stringify({ code: await localOwnerTotpCode(), trustDevice: false }) })); const verifyBody = await verify.json().catch(() => ({})); if (!verify.ok) return json(res, verify.status, { error: verifyBody?.message || "LOCAL_OWNER_TOTP_FAILED" }); finalCookies = [...finalCookies, ...cookieHeaders(verify)]; } if (finalCookies.length) res.setHeader("set-cookie", dedupeCookieHeaders(finalCookies)); return json(res, 200, { ok: true, redirect: identity.redirect, user: { name: identity.name }, role: identity.role }); } catch (error) { return json(res, 503, { error: error.code || error.message || "LOCAL_REVIEW_AUTHORITY_UNAVAILABLE" }); } }
export { identities, enabled };
