/* global process */
/*
 * FIXOKU clean Preview database guard.
 *
 * The guard validates the runtime deployment and the actual connection URL
 * before pg creates a socket. Metadata variables are supplementary evidence;
 * the URL host/database are checked against immutable target constants.
 * Local development remains available when Vercel runtime markers are absent.
 */

export const CLEAN_PREVIEW_BRANCH = "codex/fixoku-clean-integration-20261029";
export const CLEAN_STAGING_PROJECT_ID = "damp-night-76577929";
export const CLEAN_STAGING_BRANCH_ID = "br-solitary-scene-ba3d7ejb";
export const CLEAN_STAGING_DATABASE = "neondb";
export const CLEAN_STAGING_ENDPOINT_ID = "ep-dark-math-baw61g90";
export const CLEAN_STAGING_REGION_SUFFIX = "c-8.eu-central-1.aws.neon.tech";
export const CLEAN_STAGING_POOLED_HOST = `${CLEAN_STAGING_ENDPOINT_ID}-pooler.${CLEAN_STAGING_REGION_SUFFIX}`;
export const CLEAN_STAGING_DIRECT_HOST = `${CLEAN_STAGING_ENDPOINT_ID}.${CLEAN_STAGING_REGION_SUFFIX}`;

const SHA256_HEX = /^[0-9a-f]{40}$/iu;

function text(value) {
  return String(value ?? "").trim();
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function normalizedHost(value) {
  const host = text(value).toLowerCase();
  if (!host || host.length > 253 || host.includes("..") || host.includes("/") || host.includes(":")) return "";
  return host;
}

function metadataHost(value) {
  const raw = text(value);
  if (!raw) return "";
  if (!raw.includes("://")) return normalizedHost(raw);
  try { return normalizedHost(new URL(raw).hostname); } catch { return ""; }
}

function hasVercelRuntimeMarkers(env) {
  return text(env?.VERCEL) === "1" || Boolean(text(env?.VERCEL_ENV));
}

export function cleanPreviewEnvironmentStatus(env = process.env) {
  const expectedCommit = text(env.FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA).toLowerCase();
  const actualCommit = text(env.VERCEL_GIT_COMMIT_SHA).toLowerCase();
  const expectedPooledHost = metadataHost(env.FIXOKU_CLEAN_STAGING_POOLED_HOST);
  const expectedDirectHost = metadataHost(env.FIXOKU_CLEAN_STAGING_DIRECT_HOST);
  const checks = {
    vercel: text(env.VERCEL) === "1",
    preview: text(env.VERCEL_ENV).toLowerCase() === "preview",
    branch: text(env.VERCEL_GIT_COMMIT_REF) === CLEAN_PREVIEW_BRANCH,
    expectedCommitFormat: SHA256_HEX.test(expectedCommit),
    actualCommitFormat: SHA256_HEX.test(actualCommit),
    commitMatch: Boolean(expectedCommit) && expectedCommit === actualCommit,
    probeEnabled: text(env.FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED) === "1",
    project: text(env.FIXOKU_CLEAN_STAGING_PROJECT_ID) === CLEAN_STAGING_PROJECT_ID,
    branchId: text(env.FIXOKU_CLEAN_STAGING_BRANCH_ID) === CLEAN_STAGING_BRANCH_ID,
    database: text(env.FIXOKU_CLEAN_STAGING_DATABASE) === CLEAN_STAGING_DATABASE,
    endpointAttested: text(env.FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED) === "1",
    pooledMetadataHost: expectedPooledHost === CLEAN_STAGING_POOLED_HOST,
    directMetadataHost: expectedDirectHost === CLEAN_STAGING_DIRECT_HOST,
  };
  return Object.freeze({
    ok: Object.values(checks).every(Boolean),
    checks,
  });
}

export function isExactCleanPreviewEnvironment(env = process.env) {
  return cleanPreviewEnvironmentStatus(env).ok;
}

function parseConnectionUrl(rawUrl, kind) {
  const value = text(rawUrl);
  if (!value) fail("DATABASE_URL_MISSING");

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("DATABASE_URL_INVALID");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) fail("DATABASE_URL_PROTOCOL_INVALID");
  if (!parsed.username || !parsed.password) fail("DATABASE_URL_CREDENTIALS_MISSING");

  const actualHost = normalizedHost(parsed.hostname);
  const expectedHost = kind === "direct" ? CLEAN_STAGING_DIRECT_HOST : CLEAN_STAGING_POOLED_HOST;
  if (actualHost !== expectedHost) fail("DATABASE_TARGET_HOST_UNVERIFIED");
  if (parsed.port && parsed.port !== "5432") fail("DATABASE_URL_PORT_INVALID");

  let database;
  try { database = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")); }
  catch { fail("DATABASE_URL_PATH_INVALID"); }
  if (database !== CLEAN_STAGING_DATABASE) fail("DATABASE_TARGET_DATABASE_UNVERIFIED");

  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode && sslMode.toLowerCase() !== "require") fail("DATABASE_URL_SSLMODE_INVALID");

  return parsed;
}

export function assertCleanPreviewConnectionUrl(rawUrl, kind = "pooled", env = process.env) {
  if (!isExactCleanPreviewEnvironment(env)) fail("DATABASE_RUNTIME_TARGET_UNVERIFIED");
  return parseConnectionUrl(rawUrl, kind).toString();
}

export function assertSafeDatabaseUrl(rawUrl, env = process.env) {
  if (!text(rawUrl)) fail("DATABASE_URL_MISSING");

  // Local tests and disposable development databases do not carry Vercel
  // runtime markers. They retain their existing local safety guards.
  if (!hasVercelRuntimeMarkers(env)) return String(rawUrl);

  const environment = text(env.VERCEL_ENV).toLowerCase();
  if (environment === "preview") return assertCleanPreviewConnectionUrl(rawUrl, "pooled", env);

  // Keep the existing Production contract intact. This clean Preview guard is
  // deliberately scoped to Preview; Production requires its own separately
  // reviewed host/identity contract and is never contacted by this work.
  if (environment === "production") return String(rawUrl);
  fail("DATABASE_RUNTIME_ENVIRONMENT_BLOCKED");
}

