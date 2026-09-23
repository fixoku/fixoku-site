/* global process */
import { createHash } from "node:crypto";
import { Client } from "pg";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "./email-outbox.js";
import { requirePermission } from "../auth/authorization.js";

export const STAGING_SMTP_ORIGIN = "https://staging.fixoku.com";
export const STAGING_SMTP_PATH = "/api/admin/staging-smtp-test";
// This operation key must never be rotated to repeat an uncertain attempt.
export const STAGING_SMTP_OPERATION_ID = "740fdf56-ec85-4dbb-838c-1102df23317d";
const PROJECT_ID = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";
const TEAM_ID = "team_G4NbdNKM6NSdvIVMUkszTQYc";
const RECIPIENT = "destek@fixoku.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const result = (responseClass, sent = false, messageIdPresent = false) => ({ sent, messageIdPresent, responseClass });

/** The fingerprint is a nonsecret, independently verified staging DB binding.
 * Hash only hostname, explicit/default port and database name, never credentials.
 * An operator must verify the DB is staging before enabling this operation.
 */
export function stagingSmtpRuntimeAllowed(env = process.env) {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview"
    || env.APP_ORIGIN !== STAGING_SMTP_ORIGIN || env.BETTER_AUTH_URL !== STAGING_SMTP_ORIGIN
    || env.VERCEL_PROJECT_ID !== PROJECT_ID || env.VERCEL_ORG_ID !== TEAM_ID
    || env.FIXOKU_STAGING_SMTP_ENABLED !== "1" || env.LOCAL_REVIEW_MODE === "1") return false;
  try {
    const database = new URL(env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(database.protocol) || !/^[a-z0-9.-]+$/iu.test(database.hostname) || !/^\/[a-z0-9_-]+$/iu.test(database.pathname) || database.hash) return false;
    // pg connection strings accept host/port/options query overrides. A binding
    // to the URL hostname is safe only when those overrides are forbidden.
    const allowedParameters = new Set(["sslmode", "channel_binding", "sslnegotiation"]);
    const seenParameters = new Set();
    for (const [key] of database.searchParams) {
      if (!allowedParameters.has(key) || seenParameters.has(key)) return false;
      seenParameters.add(key);
    }
    const identity = `${database.hostname}:${database.port || "5432"}${database.pathname}`;
    const fingerprint = createHash("sha256").update(identity).digest("hex");
    return /^[a-f0-9]{64}$/u.test(env.FIXOKU_STAGING_SMTP_DATABASE_SHA256 || "")
      && env.FIXOKU_STAGING_SMTP_DATABASE_SHA256 === fingerprint;
  } catch { return false; }
}

/** A dedicated fresh connection, never a pool/borrowed transactional client.
 * Each INSERT autocommits; SMTP is permitted only after its command completes
 * AND the connection is closed successfully. Lost acknowledgements fail closed.
 */
export async function claimStagingSmtpAttempt({ env, actorUserId, clientFactory = (config) => new Client(config) }) {
  if (!stagingSmtpRuntimeAllowed(env) || !UUID.test(actorUserId || "")) return "UNAVAILABLE";
  let client;
  let claimed = false;
  let duplicate = false;
  let acknowledged = false;
  try {
    client = clientFactory({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5_000, query_timeout: 10_000, application_name: "fixoku-staging-smtp-diagnostic", options: "-c search_path=public -c synchronous_commit=on" });
    await client.connect();
    const query = await client.query(
      "insert into public.platform_audit_events (id,actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values ($1::uuid,$2::uuid,'staging.smtp.single_attempt','staging_smtp_diagnostic',$3,'ATTEMPT_RESERVED',$3,'{\"environment\":\"staging\",\"retryAllowed\":false}') on conflict (id) do nothing returning id",
      [STAGING_SMTP_OPERATION_ID, actorUserId, STAGING_SMTP_OPERATION_ID],
    );
    // pg resolves the simple INSERT after ReadyForQuery (autocommit). This
    // function never starts a transaction and never deletes or releases a claim.
    claimed = query.command === "INSERT" && query.rowCount === 1 && query.rows?.length === 1 && query.rows[0].id === STAGING_SMTP_OPERATION_ID;
    duplicate = query.command === "INSERT" && query.rowCount === 0 && query.rows?.length === 0;
    acknowledged = true;
  } catch { /* Never expose database errors or retry an uncertain INSERT. */ }
  finally {
    if (client) {
      try { await client.end(); } catch { acknowledged = false; }
    }
  }
  return acknowledged && claimed ? "CLAIMED" : acknowledged && duplicate ? "ALREADY_ATTEMPTED" : "UNAVAILABLE";
}

function header(req, name) {
  const matches = Object.entries(req.headers || {}).filter(([key]) => key.toLowerCase() === name);
  const rawCount = Array.isArray(req.rawHeaders) ? req.rawHeaders.filter((key, index) => index % 2 === 0 && String(key).toLowerCase() === name).length : 0;
  if (rawCount > 1 || matches.length > 1 || matches.length === 1 && typeof matches[0][1] !== "string") return null;
  return matches.length === 1 ? matches[0][1] : undefined;
}

export function stagingSmtpRequestAllowed(req) {
  if (req.method !== "POST" || req.url !== STAGING_SMTP_PATH || (req.query && Object.keys(req.query).length)) return false;
  if (header(req, "host") !== "staging.fixoku.com" || header(req, "origin") !== STAGING_SMTP_ORIGIN) return false;
  if (!/^application\/json(?:;\s*charset=utf-8)?$/iu.test(header(req, "content-type") || "")) return false;
  if (header(req, "sec-fetch-site") !== undefined && header(req, "sec-fetch-site") !== "same-origin") return false;
  if (header(req, "x-forwarded-host") !== undefined && header(req, "x-forwarded-host") !== "staging.fixoku.com") return false;
  if (header(req, "x-forwarded-proto") !== undefined && header(req, "x-forwarded-proto") !== "https") return false;
  if (header(req, "transfer-encoding") !== undefined) return false;
  const length = header(req, "content-length");
  if (length !== undefined && !["0", "2"].includes(length)) return false;
  return true;
}

// The only accepted JSON value is an empty object; an empty body is also valid.
// Streams are bounded without buffering arbitrary request data.
export async function stagingSmtpEmptyBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") return req.body === "" || req.body === "{}";
    return req.body !== null && Object.getPrototypeOf(req.body) === Object.prototype && Reflect.ownKeys(req.body).length === 0;
  }
  if (typeof req[Symbol.asyncIterator] !== "function") return false;
  let value = "";
  for await (const chunk of req) {
    if (value.length + chunk.length > 2) return false;
    value += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  }
  return value === "" || value === "{}";
}

/** Fixed diagnostic only: no recipient, subject, body, token or URL parameters. */
export async function runStagingSmtpDiagnostic({ req, env = process.env, resolvePrincipal, clientFactory, transportFactory = (config) => nodemailer.createTransport(config), now = () => new Date() }) {
  if (!stagingSmtpRuntimeAllowed(env)) return { status: 404, body: result("DISABLED") };
  if (!stagingSmtpRequestAllowed(req)) return { status: 400, body: result("REQUEST_REJECTED") };
  try {
    if (!await stagingSmtpEmptyBody(req)) return { status: 400, body: result("REQUEST_REJECTED") };
    const principal = await resolvePrincipal(new Headers(Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)])));
    if (!principal) return { status: 401, body: result("UNAUTHENTICATED") };
    const denied = requirePermission(principal, "user.manage");
    // In addition to the existing permission gate, never allow a local-review
    // bypass or a runtime configuration mistake to weaken 2FA for this action.
    if (denied || principal.session?.user?.twoFactorEnabled !== true || !UUID.test(principal.user?.id || "")) return { status: 403, body: result("FORBIDDEN") };
    const smtp = getSmtpConfig(env);
    if (!smtp || smtp.provider !== "SMTP") return { status: 503, body: result("SMTP_UNAVAILABLE") };
    const timestamp = now().toISOString();
    const claim = await claimStagingSmtpAttempt({ env, actorUserId: principal.user.id, clientFactory });
    if (claim !== "CLAIMED") return { status: claim === "ALREADY_ATTEMPTED" ? 409 : 503, body: result(claim) };
    // No later database write or transaction can roll this durable claim back.
    let transport;
    try {
      transport = transportFactory({ ...smtp.transport, logger: false, debug: false, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 });
      const info = await transport.sendMail({
        from: smtp.from,
        to: RECIPIENT,
        subject: "FIXOKU STAGING SMTP TEST",
        text: `FIXOKU staging altyapı testidir.\nHerhangi bir işlem yapmanız gerekmiyor.\n\nenvironment=staging\ntimestamp=${timestamp}`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const messageIdPresent = typeof info?.messageId === "string" && info.messageId.length > 0;
      const response2xx = typeof info?.response === "string" && /^2\d{2}(?:[ -]|$)/u.test(info.response);
      const accepted = Array.isArray(info?.accepted) && info.accepted.length === 1 && info.accepted[0] === RECIPIENT;
      const rejected = !Array.isArray(info?.rejected) || info.rejected.length > 0;
      const sent = response2xx && accepted && !rejected;
      return { status: sent ? 200 : 502, body: result(sent ? "2xx" : "SMTP_NOT_CONFIRMED", sent, messageIdPresent) };
    } catch { return { status: 502, body: result("SMTP_OUTCOME_UNKNOWN") }; }
    finally { try { await transport?.close?.(); } catch { /* Claim remains consumed. */ } }
  } catch { return { status: 503, body: result("AUTHORITY_UNAVAILABLE") }; }
}
