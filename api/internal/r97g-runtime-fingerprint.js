/* R97G16 temporary Preview-only runtime fingerprint.
 * Neon project/branch metadata remains an operator attestation. The endpoint
 * additionally requires the exact expected pooled/direct hostnames below.
 * This route is intentionally fail-closed and should be removed after acceptance.
 */
import { timingSafeEqual } from "node:crypto";
import pg from "pg";

const EXPECTED_BRANCH = "codex/r97g-staging-preview-20261027";
export const EXPECTED_COMMIT_ENV = "R97G_RUNTIME_EXPECTED_COMMIT_SHA";
const EXPECTED_PROJECT = "damp-night-76577929";
const EXPECTED_BRANCH_ID = "br-solitary-scene-ba3d7ejb";
const EXPECTED_DATABASE = "neondb";
const EXPECTED_ENDPOINT_ID = "ep-dark-math-baw61g90";
const EXPECTED_REGION_SUFFIX = "c-8.eu-central-1.aws.neon.tech";
export const EXPECTED_POOLED_HOST = EXPECTED_ENDPOINT_ID + "-pooler." + EXPECTED_REGION_SUFFIX;
export const EXPECTED_DIRECT_HOST = EXPECTED_ENDPOINT_ID + "." + EXPECTED_REGION_SUFFIX;
const TOKEN_HEADER = "x-fixoku-r97g-runtime-token";
const BEGIN_READ_ONLY_SQL = "begin read only";
export const FINGERPRINT_SQL = [
  "select current_database() as database,",
  "       current_user as role,",
  "       current_schema() as schema,",
  "       current_setting('server_version') as server_version,",
  "       current_setting('transaction_read_only') as transaction_read_only",
].join("\n");
const ROLLBACK_SQL = "rollback";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(JSON.stringify(body));
};

function getHeader(req, name) {
  const headers = req?.headers;
  if (headers && typeof headers.get === "function") return headers.get(name) || "";
  if (!headers || typeof headers !== "object") return "";
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? "" : String(value || "");
}

function constantTimeTokenMatch(provided, expected) {
  if (!provided || !expected || expected.length < 32 || provided.length !== expected.length) return false;
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

function normalizeHost(value) {
  const host = String(value ?? "").trim().toLowerCase();
  if (!host || host.length > 253 || host.includes("..") || host.includes("/") || host.includes(":")) return "";
  return host;
}

function expectedPreviewCommit(env) {
  const commit = String(env?.[EXPECTED_COMMIT_ENV] || "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/u.test(commit) ? commit : "";
}

export function isExactPreviewEnvironment(env = process.env) {
  const expectedCommit = expectedPreviewCommit(env);
  const actualCommit = String(env.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  return env.VERCEL === "1"
    && env.VERCEL_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === EXPECTED_BRANCH
    && Boolean(expectedCommit)
    && actualCommit === expectedCommit
    && env.R97G_RUNTIME_PROBE_ENABLED === "1";
}

export function hasOperatorNeonMetadataAttestation(env = process.env) {
  const pooledHost = normalizeHost(env.R97G_STAGING_POOLED_HOST);
  const directHost = normalizeHost(env.R97G_STAGING_DIRECT_HOST);
  return env.R97G_STAGING_ENDPOINT_METADATA_ATTESTED === "1"
    && env.R97G_STAGING_PROJECT_ID === EXPECTED_PROJECT
    && env.R97G_STAGING_BRANCH_ID === EXPECTED_BRANCH_ID
    && env.R97G_STAGING_DATABASE === EXPECTED_DATABASE
    && pooledHost === EXPECTED_POOLED_HOST
    && directHost === EXPECTED_DIRECT_HOST;
}

function parseStagingConnection(rawUrl, kind, env) {
  if (!rawUrl) throw new Error("RUNTIME_DATABASE_CONFIG_MISSING");
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("RUNTIME_DATABASE_URL_INVALID");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("RUNTIME_DATABASE_PROTOCOL_INVALID");
  const host = normalizeHost(parsed.hostname);
  const expectedHost = kind === "pooled" ? EXPECTED_POOLED_HOST : EXPECTED_DIRECT_HOST;
  const attestedHost = normalizeHost(kind === "pooled" ? env.R97G_STAGING_POOLED_HOST : env.R97G_STAGING_DIRECT_HOST);
  if (host !== expectedHost || attestedHost !== expectedHost) {
    throw new Error("RUNTIME_DATABASE_ENDPOINT_METADATA_MISMATCH");
  }
  if (parsed.port && parsed.port !== "5432") throw new Error("RUNTIME_DATABASE_PORT_INVALID");
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (database !== EXPECTED_DATABASE) throw new Error("RUNTIME_DATABASE_NAME_MISMATCH");
  return rawUrl;
}

function defaultPoolFactory(connectionString) {
  return new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    statement_timeout: 5_000,
  });
}

function normalizeFingerprintRow(row) {
  const database = String(row?.database || "");
  const role = String(row?.role || "");
  const schema = String(row?.schema || "");
  const serverVersion = String(row?.server_version || "");
  const transactionReadOnly = String(row?.transaction_read_only || "").toLowerCase();
  if (!database || !role || !schema || !serverVersion || transactionReadOnly !== "on") {
    throw new Error("RUNTIME_READ_ONLY_FINGERPRINT_INVALID");
  }
  return { database, role, schema, serverVersion, transactionReadOnly };
}

export async function fingerprintConnection(kind, connectionString, poolFactory = defaultPoolFactory) {
  const pool = poolFactory(connectionString);
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query(BEGIN_READ_ONLY_SQL);
    transactionStarted = true;
    const result = await client.query(FINGERPRINT_SQL);
    const fingerprint = normalizeFingerprintRow(result?.rows?.[0]);
    await client.query(ROLLBACK_SQL);
    transactionStarted = false;
    return { kind, ...fingerprint };
  } catch {
    if (transactionStarted && client) {
      try { await client.query(ROLLBACK_SQL); } catch { /* no diagnostic output */ }
    }
    throw new Error("RUNTIME_FINGERPRINT_FAILED");
  } finally {
    if (client) {
      try { client.release(); } catch { /* no diagnostic output */ }
    }
    try { await pool.end(); } catch { /* no diagnostic output */ }
  }
}

export function createRuntimeFingerprintHandler({ poolFactory = defaultPoolFactory } = {}) {
  return async function runtimeFingerprintHandler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const env = process.env;
    if (!isExactPreviewEnvironment(env)) return json(res, 404, { error: "RUNTIME_FINGERPRINT_NOT_FOUND" });

    const expectedToken = String(env.R97G_RUNTIME_PROBE_TOKEN || "");
    const providedToken = getHeader(req, TOKEN_HEADER);
    if (!constantTimeTokenMatch(providedToken, expectedToken)) {
      return json(res, 404, { error: "RUNTIME_FINGERPRINT_NOT_FOUND" });
    }

    if (!hasOperatorNeonMetadataAttestation(env)) {
      return json(res, 503, { error: "RUNTIME_METADATA_UNAVAILABLE" });
    }

    let pooledUrl;
    let directUrl;
    try {
      pooledUrl = parseStagingConnection(env.DATABASE_URL, "pooled", env);
      directUrl = parseStagingConnection(env.DATABASE_URL_UNPOOLED, "direct", env);
    } catch {
      return json(res, 503, { error: "RUNTIME_TARGET_UNVERIFIED" });
    }

    try {
      const [pooled, direct] = await Promise.all([
        fingerprintConnection("pooled", pooledUrl, poolFactory),
        fingerprintConnection("direct", directUrl, poolFactory),
      ]);
      return json(res, 200, {
        ok: true,
        metadataAttested: true,
        environment: "preview",
        branch: EXPECTED_BRANCH,
        commit: String(env.VERCEL_GIT_COMMIT_SHA).trim().toLowerCase(),
        connections: { pooled, direct },
      });
    } catch {
      return json(res, 503, { error: "RUNTIME_FINGERPRINT_UNAVAILABLE" });
    }
  };
}

export default createRuntimeFingerprintHandler();
