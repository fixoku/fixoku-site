import pg from "pg";
import { auth, candidateAuth } from "../src/server/auth/auth.js";

async function readPayload(request) {
  if (request.body && typeof request.body === "object") return { value: request.body, raw: JSON.stringify(request.body) };
  if (typeof request.body === "string") {
    try { return { value: JSON.parse(request.body), raw: request.body }; } catch { return { value: null, raw: request.body }; }
  }
  if (request.readableEnded || !request.readable) return { value: null, raw: "" };
  let raw = "";
  for await (const chunk of request) raw += chunk;
  try { return { value: JSON.parse(raw || "{}"), raw }; } catch { return { value: null, raw }; }
}

function requestHeaders(request) {
  return new Headers(Object.entries(request.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
}

async function forwardAuthResponse(response, authResponse) {
  response.statusCode = authResponse.status;
  const setCookies = typeof authResponse.headers.getSetCookie === "function"
    ? authResponse.headers.getSetCookie()
    : authResponse.headers.get("set-cookie");
  authResponse.headers.forEach((value, key) => {
    if (key !== "set-cookie") response.setHeader(key, value);
  });
  if (setCookies && (Array.isArray(setCookies) ? setCookies.length : true)) response.setHeader("set-cookie", setCookies);
  response.end(Buffer.from(await authResponse.arrayBuffer()));
}

async function pendingTrainerCandidate(email) {
  if (!process.env.DATABASE_URL || !String(email || "").trim()) return false;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 2000 });
  try {
    const result = await pool.query(`select 1
      from trainer_applications a
      join platform_users p on p.id=a.candidate_user_id
      where lower(p.email)=lower($1)
        and p.email_verified=false
        and a.status in ('RECEIVED','REVIEWING','PROFILE_READY')
        and not exists (select 1 from platform_memberships m where m.user_id=p.id and m.role='TRAINER' and m.status='ACTIVE')
      limit 1`, [String(email).trim().toLowerCase()]);
    return result.rowCount > 0;
  } catch {
    // Candidate detection is fail-closed: if the lookup is unavailable, use
    // the normal verified-account auth path and never broaden candidate access.
    return false;
  } finally {
    await pool.end();
  }
}

// Same Better Auth login, explicit Vercel endpoint for trainer/student access.
export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }));
    return;
  }
  const payload = await readPayload(request);
  const selectedAuth = payload.value && await pendingTrainerCandidate(payload.value.email) ? candidateAuth : auth;
  const headers = requestHeaders(request);
  headers.set("content-type", "application/json");
  const authResponse = await selectedAuth.handler(new Request("http://local/api/auth/sign-in/email", {
    method: "POST",
    headers,
    body: payload.raw || JSON.stringify(payload.value || {}),
  }));
  return forwardAuthResponse(response, authResponse);
}
