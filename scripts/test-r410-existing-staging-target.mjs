import assert from "node:assert/strict";
import {
  PREVIEW_CONTRACTS,
  R18_STAGING_METADATA,
  STAGING_ACCEPTANCE_METADATA,
  previewContractMetadataAttested,
  exactPreviewContractEnvironment,
  isCleanPreviewBusinessAccessBlocked,
  r404ConnectionTargetsConfigured
} from "../src/server/auth/preview-contract.js";
import { assertSafeDatabaseUrl } from "../src/server/db/runtime-guard.js";

const c = PREVIEW_CONTRACTS.r410Staging;
assert.ok(c);

assert.equal(R18_STAGING_METADATA.project, "tiny-fire-86403197");
assert.equal(R18_STAGING_METADATA.branch, "br-fragrant-grass-b14anzbn");
assert.equal(STAGING_ACCEPTANCE_METADATA.project, R18_STAGING_METADATA.project);
assert.equal(STAGING_ACCEPTANCE_METADATA.branch, R18_STAGING_METADATA.branch);

const pooled = `postgresql://test:test@${R18_STAGING_METADATA.pooledHost}/neondb?sslmode=verify-full`;
const direct = `postgresql://test:test@${R18_STAGING_METADATA.directHost}/neondb?sslmode=verify-full`;

const env = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: c.vercelProjectId,
  VERCEL_GIT_COMMIT_REF: c.branch,
  VERCEL_GIT_COMMIT_SHA: "b".repeat(40),
  VERCEL_URL: "fixoku-site-test123456-fixoku.vercel.app",
  [c.expectedCommitEnv]: "b".repeat(40),
  [c.probeEnabledEnv]: "1",
  [c.metadata.attested]: "1",
  [c.metadata.project]: R18_STAGING_METADATA.project,
  [c.metadata.branch]: R18_STAGING_METADATA.branch,
  [c.metadata.database]: R18_STAGING_METADATA.database,
  [c.metadata.pooledHost]: R18_STAGING_METADATA.pooledHost,
  [c.metadata.directHost]: R18_STAGING_METADATA.directHost,
  DATABASE_URL: pooled,
  DATABASE_URL_UNPOOLED: direct
};

assert.equal(exactPreviewContractEnvironment(c, env), true);
assert.equal(previewContractMetadataAttested(c, env), true);
assert.equal(r404ConnectionTargetsConfigured(env), true);
assert.equal(isCleanPreviewBusinessAccessBlocked(env), false);
assert.equal(assertSafeDatabaseUrl(pooled, env), pooled);
assert.equal(assertSafeDatabaseUrl(direct, env), direct);
console.log("R410_EXISTING_STAGING_TARGET=PASS");

const negatives = [
  ["WRONG_BRANCH", { VERCEL_GIT_COMMIT_REF: "wrong" }],
  ["WRONG_PROJECT", { VERCEL_PROJECT_ID: "wrong" }],
  ["WRONG_COMMIT", { VERCEL_GIT_COMMIT_SHA: "c".repeat(40) }],
  ["WRONG_NEON_BRANCH", { [c.metadata.branch]: "wrong" }],
  ["WRONG_NEON_PROJECT", { [c.metadata.project]: "wrong" }],
  ["WRONG_NEON_HOST", { [c.metadata.pooledHost]: "wrong.invalid" }],
  ["MISSING_ATTESTATION", { [c.metadata.attested]: "" }],
  ["DISABLED_PROBE", { [c.probeEnabledEnv]: "0" }],
  ["WRONG_DEPLOYMENT", { VERCEL_URL: "other.example.com" }],
  ["WRONG_DATABASE_URL", { DATABASE_URL: "postgresql://test:test@example.invalid/neondb" }],
  ["WRONG_DIRECT_URL", { DATABASE_URL_UNPOOLED: "postgresql://test:test@example.invalid/neondb" }]
];

for (const [name, change] of negatives) {
  const bad = { ...env, ...change };
  assert.equal(isCleanPreviewBusinessAccessBlocked(bad), true, name);
  assert.throws(() => assertSafeDatabaseUrl(bad.DATABASE_URL, bad), /DATABASE_RUNTIME_TARGET_UNVERIFIED/, name);
  console.log(`${name}=BLOCKED`);
}

assert.throws(
  () => assertSafeDatabaseUrl(pooled, { VERCEL_GIT_COMMIT_REF: c.branch }),
  /DATABASE_RUNTIME_TARGET_UNVERIFIED/
);
console.log("LOCAL_RUNTIME_SPOOF=BLOCKED");
console.log("D8DW_FINAL=PASS");