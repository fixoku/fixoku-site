/* global process */
import { R16_STAGING_METADATA, isR16StagingHost } from "../auth/preview-contract.js";
/*
 * FIXOKU clean Preview database guard.
 *
 * The guard validates the runtime deployment and the actual connection URL
 * before pg creates a socket. Metadata variables are supplementary evidence;
 * the URL host/database are checked against immutable target constants.
 * Local development remains available when Vercel runtime markers are absent.
 */

export const CLEAN_PREVIEW_BRANCH = "codex/fixoku-clean-integration-20261029";
export const CLEAN_STAGING_PROJECT_ID = "tiny-fire-86403197";
export const CLEAN_STAGING_BRANCH_ID = "br-sweet-resonance-b17h2ttf";
export const CLEAN_STAGING_DATABASE = "neondb";
export const CLEAN_STAGING_ENDPOINT_ID = "ep-calm-term-b1l1d62f";
export const CLEAN_STAGING_REGION_SUFFIX = "c-5.eu-central-1.aws.neon.tech";
export const CLEAN_STAGING_POOLED_HOST = `${CLEAN_STAGING_ENDPOINT_ID}-pooler.${CLEAN_STAGING_REGION_SUFFIX}`;
export const CLEAN_STAGING_DIRECT_HOST = `${CLEAN_STAGING_ENDPOINT_ID}.${CLEAN_STAGING_REGION_SUFFIX}`;

// R16 has its own independently-attested Neon branch and variable namespace.
// Hostnames are intentionally unset until the authorized Neon evidence
// supplies both pooled and direct DNS names; no hostname is guessed here.
export const R16_PREVIEW_BRANCH = "codex/fixoku-staging-r15-20261106";
export const R16_STAGING_PROJECT_ID = R16_STAGING_METADATA.project;
export const R16_STAGING_BRANCH_ID = R16_STAGING_METADATA.branch;
export const R16_STAGING_DATABASE = R16_STAGING_METADATA.database;
export const R16_STAGING_ENDPOINT_ID = R16_STAGING_METADATA.endpoint;
export const R16_STAGING_POOLED_HOST = R16_STAGING_METADATA.pooledHost;
export const R16_STAGING_DIRECT_HOST = R16_STAGING_METADATA.directHost;

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

export function r16PreviewEnvironmentStatus(env = process.env) {
  const expectedCommit = text(env.FIXOKU_R16_RUNTIME_EXPECTED_COMMIT_SHA).toLowerCase();
  const actualCommit = text(env.VERCEL_GIT_COMMIT_SHA).toLowerCase();
  const pooledHost = metadataHost(env.FIXOKU_R16_STAGING_POOLED_HOST);
  const directHost = metadataHost(env.FIXOKU_R16_STAGING_DIRECT_HOST);
  const checks = {
    vercel: text(env.VERCEL) === "1",
    preview: text(env.VERCEL_ENV).toLowerCase() === "preview",
    branch: text(env.VERCEL_GIT_COMMIT_REF) === R16_PREVIEW_BRANCH,
    expectedCommitFormat: SHA256_HEX.test(expectedCommit),
    actualCommitFormat: SHA256_HEX.test(actualCommit),
    commitMatch: Boolean(expectedCommit) && expectedCommit === actualCommit,
    probeEnabled: text(env.FIXOKU_R16_RUNTIME_PROBE_ENABLED) === "1",
    project: text(env.FIXOKU_R16_STAGING_PROJECT_ID) === R16_STAGING_PROJECT_ID,
    branchId: text(env.FIXOKU_R16_STAGING_BRANCH_ID) === R16_STAGING_BRANCH_ID,
    database: text(env.FIXOKU_R16_STAGING_DATABASE) === R16_STAGING_DATABASE,
    endpointAttested: text(env.FIXOKU_R16_STAGING_ENDPOINT_METADATA_ATTESTED) === "1",
    pooledMetadataHost: isR16StagingHost(pooledHost, "pooled"),
    directMetadataHost: isR16StagingHost(directHost, "direct"),
  };
  return Object.freeze({ ok: Object.values(checks).every(Boolean), checks });
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

export function assertR16PreviewConnectionUrl(rawUrl, kind = "pooled", env = process.env) {
  if (!r16PreviewEnvironmentStatus(env).ok) fail("DATABASE_RUNTIME_TARGET_UNVERIFIED");
  return parseConnectionUrlForTarget(rawUrl, kind, {
    pooledHost: metadataHost(env.FIXOKU_R16_STAGING_POOLED_HOST),
    directHost: metadataHost(env.FIXOKU_R16_STAGING_DIRECT_HOST),
    database: R16_STAGING_DATABASE,
  }).toString();
}

function parseConnectionUrlForTarget(rawUrl, kind, target) {
  const value = text(rawUrl);
  if (!value) fail("DATABASE_URL_MISSING");
  let parsed;
  try { parsed = new URL(value); } catch { fail("DATABASE_URL_INVALID"); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) fail("DATABASE_URL_PROTOCOL_INVALID");
  if (!parsed.username || !parsed.password) fail("DATABASE_URL_CREDENTIALS_MISSING");
  const actualHost = normalizedHost(parsed.hostname);
  const expectedHost = kind === "direct" ? target.directHost : target.pooledHost;
  if (actualHost !== expectedHost) fail("DATABASE_TARGET_HOST_UNVERIFIED");
  if (parsed.port && parsed.port !== "5432") fail("DATABASE_URL_PORT_INVALID");
  let database;
  try { database = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")); }
  catch { fail("DATABASE_URL_PATH_INVALID"); }
  if (database !== target.database) fail("DATABASE_TARGET_DATABASE_UNVERIFIED");
  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode && sslMode.toLowerCase() !== "require") fail("DATABASE_URL_SSLMODE_INVALID");
  return parsed;
}

export function assertSafeDatabaseUrl(rawUrl, env = process.env) {
  if (!text(rawUrl)) fail("DATABASE_URL_MISSING");

  // Local tests and disposable development databases do not carry Vercel
  // runtime markers. They retain their existing local safety guards.
  if (!hasVercelRuntimeMarkers(env)) return String(rawUrl);

  const environment = text(env.VERCEL_ENV).toLowerCase();
  if (environment === "preview") {
    const branch = text(env.VERCEL_GIT_COMMIT_REF);
    if (branch === R16_PREVIEW_BRANCH) return assertR16PreviewConnectionUrl(rawUrl, "pooled", env);
    if (branch === CLEAN_PREVIEW_BRANCH) return assertCleanPreviewConnectionUrl(rawUrl, "pooled", env);
    fail("DATABASE_RUNTIME_TARGET_UNVERIFIED");
  }

  // Keep the existing Production contract intact. This clean Preview guard is
  // deliberately scoped to Preview; Production requires its own separately
  // reviewed host/identity contract and is never contacted by this work.
  if (environment === "production") return String(rawUrl);
  fail("DATABASE_RUNTIME_ENVIRONMENT_BLOCKED");
}

