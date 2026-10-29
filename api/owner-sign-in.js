import pg from "pg";
import { ownerAuth } from "../src/server/auth/auth.js";
import { requireApplicationOrigin } from "../src/server/auth/origin.js";
import { cleanPreviewGateResponse } from "../src/server/auth/preview-contract.js";

const OWNER_EMAIL = "ersin@fixoku.com";
const authOrigin = () => requireApplicationOrigin(process.env);

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function requestHeaders(request, origin) {
  const headers = new Headers();
  for (const key of ["cookie", "user-agent", "x-forwarded-for", "x-real-ip"]) {
    const value = request.headers?.[key];
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  headers.set("origin", origin);
  headers.set("content-type", "application/json");
  return headers;
}

function responseCookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
}

function cookiePair(cookies) {
  return cookies.map((cookie) => String(cookie).split(";", 1)[0]).join("; ");
}

async function revokeNonOwnerSession(origin, cookies) {
  if (!cookies.length) return;
  try {
    await ownerAuth.handler(new Request(`${origin}/api/auth/sign-out`, {
      method: "POST",
      headers: { origin, cookie: cookiePair(cookies), "content-type": "application/json" },
    }));
  } catch {
    // The session is never forwarded. The normal session expiry remains the
    // final cleanup if the best-effort sign-out request cannot be completed.
  }
}

function forwardAuthResponse(response, authResponse, body, cookies) {
  response.statusCode = authResponse.status;
  for (const [key, value] of authResponse.headers) {
    if (key.toLowerCase() === "set-cookie" || key.toLowerCase() === "content-length") continue;
    response.setHeader(key, value);
  }
  if (cookies.length) response.setHeader("set-cookie", cookies);
  response.end(JSON.stringify(body));
}

async function isActiveOwner(authUserId, email) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000 });
  try {
    const row = (await pool.query(`
      select 1
        from platform_users u
        join platform_memberships m on m.user_id=u.id
       where u.auth_user_id=$1
         and lower(u.email)=lower($2)
         and m.role='OWNER'
         and m.scope_type='GLOBAL'
         and m.scope_id is null
         and m.status='ACTIVE'
       limit 1`, [authUserId, email])).rows[0];
    return Boolean(row);
  } finally {
    await pool.end();
  }
}

/**
 * Owner-only password entry. The ownerAuth instance shares Better Auth's
 * database, secret, session, CSRF and rate-limit configuration with the
 * regular auth instance but has no 2FA sign-in hook. The database membership
 * check below is mandatory before any session cookie is returned.
 */
export default async function handler(request, response) {
  if (!cleanPreviewGateResponse(response)) return;
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  }
  let origin;
  try {
    origin = authOrigin();
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (email !== OWNER_EMAIL || !password) return json(response, 401, { error: "INVALID_EMAIL_OR_PASSWORD" });
    const authResponse = await ownerAuth.handler(new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: requestHeaders(request, origin),
      body: JSON.stringify({ email, password, callbackURL: "/panel/owner" }),
    }));
    const payload = await authResponse.json().catch(() => ({}));
    const cookies = responseCookies(authResponse);
    if (!authResponse.ok) return forwardAuthResponse(response, authResponse, payload, cookies);
    const authUserId = payload?.user?.id;
    if (!authUserId || !(await isActiveOwner(authUserId, email))) {
      await revokeNonOwnerSession(origin, cookies);
      return json(response, 403, { error: "OWNER_MEMBERSHIP_REQUIRED" });
    }
    return forwardAuthResponse(response, authResponse, { authenticated: true, user: payload.user }, cookies);
  } catch (error) {
    if (error?.message === "PUBLIC_ORIGIN_NOT_CONFIGURED") return json(response, 503, { error: "OWNER_AUTH_ORIGIN_UNAVAILABLE" });
    if (error instanceof SyntaxError) return json(response, 400, { error: "INVALID_JSON" });
    return json(response, 503, { error: "OWNER_AUTHORITY_UNAVAILABLE" });
  }
}
