/*
 * FIXOKU clean Preview-only, authenticated, read-only runtime fingerprint.
 * The route is useful only after the exact Preview deployment has been
 * selected. It never accepts Production or an unknown branch/commit.
 */
import { timingSafeEqual } from "node:crypto";
import pg from "pg";
import {
  CLEAN_PREVIEW_BRANCH,
  assertCleanPreviewConnectionUrl,
  isExactCleanPreviewEnvironment,
} from "../../src/server/db/runtime-guard.js";

const TOKEN_HEADER = "x-fixoku-clean-runtime-token";
const TOKEN_ENV = "FIXOKU_CLEAN_RUNTIME_PROBE_TOKEN";
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

function defaultPoolFactory(connectionString) {
  return new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    statement_timeout: 5_000,
  });
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

export function createCleanRuntimeFingerprintHandler({ poolFactory = defaultPoolFactory } = {}) {
  return async function cleanRuntimeFingerprintHandler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

    const env = process.env;
    if (!isExactCleanPreviewEnvironment(env)) return json(res, 404, { error: "RUNTIME_FINGERPRINT_NOT_FOUND" });

    const expectedToken = String(env[TOKEN_ENV] || "");
    const providedToken = getHeader(req, TOKEN_HEADER);
    if (!constantTimeTokenMatch(providedToken, expectedToken)) {
      return json(res, 404, { error: "RUNTIME_FINGERPRINT_NOT_FOUND" });
    }

    let pooledUrl;
    let directUrl;
    try {
      pooledUrl = assertCleanPreviewConnectionUrl(env.DATABASE_URL, "pooled", env);
      directUrl = assertCleanPreviewConnectionUrl(env.DATABASE_URL_UNPOOLED, "direct", env);
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
        branch: CLEAN_PREVIEW_BRANCH,
        commit: String(env.VERCEL_GIT_COMMIT_SHA).trim().toLowerCase(),
        connections: { pooled, direct },
      });
    } catch {
      return json(res, 503, { error: "RUNTIME_FINGERPRINT_UNAVAILABLE" });
    }
  };
}

export default createCleanRuntimeFingerprintHandler();

