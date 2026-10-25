/* global process */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Client } from "pg";

export const PREVIEW_DB_IDENTITY_PATH = "/api/admin/preview-db-identity";
export const PREVIEW_DB_IDENTITY_TOKEN_ENV = "FIXOKU_PREVIEW_DB_IDENTITY_TOKEN";
export const PREVIEW_DB_IDENTITY_HEADER = "x-fixoku-preview-db-token";

// 32 random bytes encoded as unpadded base64url are exactly 43 characters.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const BRANCH_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

/** Generate the value to store in the Preview-only Vercel environment. */
export function generatePreviewDbIdentityToken() {
  return randomBytes(32).toString("base64url");
}

function configuredToken(env) {
  const token = typeof env?.[PREVIEW_DB_IDENTITY_TOKEN_ENV] === "string"
    ? env[PREVIEW_DB_IDENTITY_TOKEN_ENV]
    : "";
  return TOKEN_PATTERN.test(token) ? token : null;
}

export function previewDbIdentityRuntimeAllowed(env = process.env) {
  return String(env?.VERCEL_ENV || "").trim().toLowerCase() === "preview"
    && configuredToken(env) !== null;
}

function header(req, name) {
  const matches = Object.entries(req?.headers || {})
    .filter(([key]) => key.toLowerCase() === name);
  const rawCount = Array.isArray(req?.rawHeaders)
    ? req.rawHeaders.filter((key, index) => index % 2 === 0 && String(key).toLowerCase() === name).length
    : 0;
  if (rawCount > 1 || matches.length > 1 || (matches.length === 1 && typeof matches[0][1] !== "string")) return null;
  return matches.length === 1 ? matches[0][1] : undefined;
}

function tokenMatches(req, env) {
  const expected = configuredToken(env);
  const supplied = header(req, PREVIEW_DB_IDENTITY_HEADER);
  if (!expected || typeof supplied !== "string") return false;
  // Compare fixed-size digests so malformed lengths cannot bypass the
  // constant-time comparison or make its duration depend on token length.
  const expectedBytes = createHash("sha256").update(expected, "utf8").digest();
  const suppliedBytes = createHash("sha256").update(supplied, "utf8").digest();
  return timingSafeEqual(expectedBytes, suppliedBytes);
}

function parseConnectionString(connectionString) {
  try {
    const parsed = new URL(connectionString || "");
    if (!(parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") || !parsed.hostname) return null;
    return parsed;
  } catch {
    return null;
  }
}

function emptyIdentity(connectionString) {
  const parsed = parseConnectionString(connectionString);
  return {
    serverNameSha256: parsed ? sha256(parsed.hostname) : null,
    select1: "FAIL",
    neonBranchId: null,
  };
}

async function inspectDatabase(connectionString, clientFactory) {
  const identity = emptyIdentity(connectionString);
  if (!identity.serverNameSha256) return identity;

  let client;
  try {
    client = clientFactory({
      connectionString,
      connectionTimeoutMillis: 5_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
      application_name: "fixoku-preview-db-identity",
      options: "-c default_transaction_read_only=on",
    });
    await client.connect();
    await client.query("SELECT 1");
    identity.select1 = "PASS";
    try {
      const metadata = await client.query("SELECT current_setting('neon.branch_id', true) AS neon_branch_id");
      const branchId = metadata?.rows?.[0]?.neon_branch_id;
      if (typeof branchId === "string" && BRANCH_ID_PATTERN.test(branchId)) identity.neonBranchId = branchId;
    } catch {
      // Neon metadata is optional. SELECT 1 remains the only connectivity gate.
    }
  } catch {
    // Never expose connection or provider errors from this diagnostic endpoint.
  } finally {
    if (client) {
      try { await client.end(); } catch { /* The result is already fail-closed. */ }
    }
  }
  return identity;
}

function requestPathIsExact(req) {
  if (req?.query && Object.keys(req.query).length > 0) return false;
  try {
    const parsed = new URL(req?.url || PREVIEW_DB_IDENTITY_PATH, "http://local");
    return parsed.pathname === PREVIEW_DB_IDENTITY_PATH && parsed.search === "";
  } catch {
    return false;
  }
}

const response = (status, body) => ({ status, body });

/**
 * Read-only runtime check for the two Preview database bindings.
 * No request value is copied to a response, and this function never writes to PostgreSQL.
 */
export async function runPreviewDbIdentityDiagnostic({
  req,
  env = process.env,
  clientFactory = (config) => new Client(config),
}) {
  if (String(env?.VERCEL_ENV || "").trim().toLowerCase() !== "preview") {
    return response(404, { error: "NOT_FOUND" });
  }
  if (req?.method !== "GET" || !requestPathIsExact(req)) {
    return response(req?.method === "GET" ? 400 : 405, { error: req?.method === "GET" ? "REQUEST_REJECTED" : "METHOD_NOT_ALLOWED" });
  }
  if (!tokenMatches(req, env)) return response(401, { error: "UNAUTHORIZED" });

  const pooled = await inspectDatabase(env.DATABASE_URL, clientFactory);
  const unpooled = await inspectDatabase(env.DATABASE_URL_UNPOOLED, clientFactory);
  const ok = pooled.select1 === "PASS" && unpooled.select1 === "PASS";
  return response(ok ? 200 : 503, {
    ok,
    environment: "preview",
    pooled,
    unpooled,
  });
}

export function previewDbIdentityResponseIsSafe(body, secrets = []) {
  const serialized = JSON.stringify(body);
  if (!SHA256_PATTERN.test(body?.pooled?.serverNameSha256 || "") || !SHA256_PATTERN.test(body?.unpooled?.serverNameSha256 || "")) return false;
  return secrets.every((secret) => typeof secret !== "string" || secret === "" || !serialized.includes(secret));
}
