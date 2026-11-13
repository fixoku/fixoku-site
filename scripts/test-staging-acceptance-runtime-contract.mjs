import assert from "node:assert/strict";
import {
  PREVIEW_CONTRACTS,
  STAGING_ACCEPTANCE_HOSTS,
  STAGING_ACCEPTANCE_METADATA,
  exactPreviewContractEnvironment,
  isCleanPreviewBusinessAccessBlocked,
  previewContractForBranch,
  previewContractMetadataConfigured,
  previewContractMetadataAttested,
} from "../src/server/auth/preview-contract.js";
import {
  STAGING_ACCEPTANCE_PREVIEW_BRANCH,
  assertSafeDatabaseUrl,
  assertStagingAcceptancePreviewConnectionUrl,
  stagingAcceptancePreviewEnvironmentStatus,
} from "../src/server/db/runtime-guard.js";
import { resolveApplicationOrigin, resolveTrustedOrigins } from "../src/server/auth/origin.js";

const commit = "4060ad4a605d1ee31f298c980b6cad658304a05b";
const token = "staging-acceptance-runtime-probe-token-012345678901234567890";
const pooledUrl = `postgresql://runtime-user:runtime-password@${STAGING_ACCEPTANCE_HOSTS.pooled}/neondb?sslmode=require`;
const directUrl = `postgresql://runtime-user:runtime-password@${STAGING_ACCEPTANCE_HOSTS.direct}/neondb?sslmode=require`;
const contract = PREVIEW_CONTRACTS.stagingAcceptance;

const baseEnv = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: contract.vercelProjectId,
  VERCEL_GIT_COMMIT_REF: STAGING_ACCEPTANCE_PREVIEW_BRANCH,
  VERCEL_GIT_COMMIT_SHA: commit,
  VERCEL_URL: "fixoku-site-git-codex-fixoku-staging-acceptance-20261113-fixoku.vercel.app",
  [contract.expectedCommitEnv]: commit,
  [contract.probeEnabledEnv]: "1",
  [contract.probeTokenEnv]: token,
  [contract.metadata.attested]: "1",
  [contract.metadata.project]: STAGING_ACCEPTANCE_METADATA.project,
  [contract.metadata.branch]: STAGING_ACCEPTANCE_METADATA.branch,
  [contract.metadata.database]: STAGING_ACCEPTANCE_METADATA.database,
  [contract.metadata.pooledHost]: STAGING_ACCEPTANCE_METADATA.pooledHost,
  [contract.metadata.directHost]: STAGING_ACCEPTANCE_METADATA.directHost,
  DATABASE_URL: pooledUrl,
  DATABASE_URL_UNPOOLED: directUrl,
};

assert.equal(previewContractForBranch(STAGING_ACCEPTANCE_PREVIEW_BRANCH), contract);
assert.equal(stagingAcceptancePreviewEnvironmentStatus(baseEnv).ok, true);
assert.equal(exactPreviewContractEnvironment(contract, baseEnv), true);
assert.equal(previewContractMetadataConfigured(contract, baseEnv), true);
assert.equal(previewContractMetadataAttested(contract, baseEnv), true);
assert.equal(isCleanPreviewBusinessAccessBlocked(baseEnv), false);
assert.equal(resolveApplicationOrigin({ ...baseEnv, APP_ORIGIN: "https://staging.fixoku.com" }), "https://staging.fixoku.com");
assert.deepEqual(resolveTrustedOrigins({ ...baseEnv, APP_ORIGIN: "https://staging.fixoku.com" }), [
  "https://staging.fixoku.com",
  baseEnv.VERCEL_URL.startsWith("https://") ? baseEnv.VERCEL_URL : `https://${baseEnv.VERCEL_URL}`,
]);
assert.equal(assertStagingAcceptancePreviewConnectionUrl(pooledUrl, "pooled", baseEnv), pooledUrl);
assert.equal(assertStagingAcceptancePreviewConnectionUrl(directUrl, "direct", baseEnv), directUrl);
assert.equal(assertSafeDatabaseUrl(pooledUrl, baseEnv), pooledUrl);

for (const [name, changes] of [
  ["wrong-branch", { VERCEL_GIT_COMMIT_REF: "codex/other-branch" }],
  ["wrong-commit", { VERCEL_GIT_COMMIT_SHA: "0000000000000000000000000000000000000000" }],
  ["stale-expected-commit", { [contract.expectedCommitEnv]: "0000000000000000000000000000000000000000" }],
  ["wrong-project", { VERCEL_PROJECT_ID: "prj_other-project" }],
  ["wrong-deployment-host", { VERCEL_URL: "fixoku-site-attacker-fixoku.vercel.app" }],
  ["probe-disabled", { [contract.probeEnabledEnv]: "0" }],
  ["wrong-neon-project", { [contract.metadata.project]: "other-project" }],
  ["wrong-neon-branch", { [contract.metadata.branch]: "br-other-branch" }],
  ["wrong-metadata-host", { [contract.metadata.pooledHost]: "attacker.example" }],
  ["missing-attestation", { [contract.metadata.attested]: undefined }],
]) {
  const env = { ...baseEnv, ...changes };
  assert.equal(stagingAcceptancePreviewEnvironmentStatus(env).ok, false, name);
  assert.throws(() => assertSafeDatabaseUrl(pooledUrl, env), /DATABASE_RUNTIME_TARGET_UNVERIFIED/u, name);
}

for (const [name, url] of [
  ["wrong-pooled-host", pooledUrl.replace(STAGING_ACCEPTANCE_METADATA.pooledHost, "attacker.neon.tech")],
  ["wrong-database", pooledUrl.replace("/neondb?", "/postgres?")],
  ["disabled-ssl", pooledUrl.replace("sslmode=require", "sslmode=disable")],
]) {
  assert.throws(() => assertStagingAcceptancePreviewConnectionUrl(url, "pooled", baseEnv), /DATABASE_TARGET|DATABASE_URL_SSLMODE/u, name);
}

// Existing R54S and R18 contracts remain independent and are not selected by
// the new branch name.
assert.notEqual(previewContractForBranch("codex/fixoku-r54s-preview-20261109"), contract);
assert.notEqual(previewContractForBranch("codex/fixoku-r18-owner-acceptance-20261108"), contract);

console.log("FIXOKU_STAGING_ACCEPTANCE_RUNTIME_CONTRACT=PASS");
