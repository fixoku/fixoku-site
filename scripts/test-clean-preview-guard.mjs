import assert from "node:assert/strict";
import {
  resolveApplicationOrigin,
  resolveTrustedOrigins,
} from "../src/server/auth/origin.js";
import {
  CLEAN_EXPECTED_COMMIT_ENV,
  EXPECTED_COMMIT_ENV,
  EXPECTED_DIRECT_HOST,
  EXPECTED_POOLED_HOST,
  hasOperatorNeonMetadataAttestation,
  isExactPreviewEnvironment,
} from "../api/internal/r97g-runtime-fingerprint.js";
import { privilegedTwoFactorRequired } from "../src/server/auth/authorization.js";

const OLD_BRANCH = "codex/r97g-staging-preview-20261027";
const OLD_SHA = "f1167d8b0afe8bc30da85369d277316d9ffaa3c3";
const NEW_BRANCH = "codex/fixoku-clean-integration-20261029";
const NEW_SHA = "15d9964d7e06dcc424cec62255b430a0544d6bc5";
const OLD_ORIGIN = "https://fixoku-site-git-codex-r97g-staging-preview-20261027-fixoku.vercel.app";
const NEW_ORIGIN = "https://fixoku-site-git-codex-fixoku-clean-integration-20261029-fixoku.vercel.app";

const cleanEnv = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_URL: NEW_ORIGIN.slice("https://".length),
  VERCEL_GIT_COMMIT_REF: NEW_BRANCH,
  VERCEL_GIT_COMMIT_SHA: NEW_SHA,
  [CLEAN_EXPECTED_COMMIT_ENV]: NEW_SHA,
  FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED: "1",
  FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "1",
  FIXOKU_CLEAN_STAGING_PROJECT_ID: "damp-night-76577929",
  FIXOKU_CLEAN_STAGING_BRANCH_ID: "br-solitary-scene-ba3d7ejb",
  FIXOKU_CLEAN_STAGING_DATABASE: "neondb",
  FIXOKU_CLEAN_STAGING_POOLED_HOST: EXPECTED_POOLED_HOST,
  FIXOKU_CLEAN_STAGING_DIRECT_HOST: EXPECTED_DIRECT_HOST,
  APP_ORIGIN: NEW_ORIGIN,
  BETTER_AUTH_URL: NEW_ORIGIN,
};

const legacyEnv = {
  ...cleanEnv,
  VERCEL_URL: OLD_ORIGIN.slice("https://".length),
  VERCEL_GIT_COMMIT_REF: OLD_BRANCH,
  VERCEL_GIT_COMMIT_SHA: OLD_SHA,
  [EXPECTED_COMMIT_ENV]: OLD_SHA,
  R97G_RUNTIME_PROBE_ENABLED: "1",
  R97G_STAGING_ENDPOINT_METADATA_ATTESTED: "1",
  R97G_STAGING_PROJECT_ID: "damp-night-76577929",
  R97G_STAGING_BRANCH_ID: "br-solitary-scene-ba3d7ejb",
  R97G_STAGING_DATABASE: "neondb",
  R97G_STAGING_POOLED_HOST: EXPECTED_POOLED_HOST,
  R97G_STAGING_DIRECT_HOST: EXPECTED_DIRECT_HOST,
  APP_ORIGIN: OLD_ORIGIN,
  BETTER_AUTH_URL: OLD_ORIGIN,
};

assert.equal(resolveApplicationOrigin(legacyEnv), OLD_ORIGIN, "old branch + old SHA accepted");
assert.deepEqual(resolveTrustedOrigins(legacyEnv), [OLD_ORIGIN], "old origin trusted");
assert.equal(isExactPreviewEnvironment(legacyEnv), true, "old runtime contract accepted");
assert.equal(hasOperatorNeonMetadataAttestation(legacyEnv), true, "old Neon attestation accepted");

assert.equal(resolveApplicationOrigin(cleanEnv), NEW_ORIGIN, "new branch + new SHA accepted");
assert.deepEqual(resolveTrustedOrigins(cleanEnv), [NEW_ORIGIN], "new deployment origin trusted");
assert.equal(isExactPreviewEnvironment(cleanEnv), true, "new runtime contract accepted");
assert.equal(hasOperatorNeonMetadataAttestation(cleanEnv), true, "new Neon attestation accepted");

for (const [name, env, runtimeExpected] of [
  ["new branch + old SHA", { ...cleanEnv, VERCEL_GIT_COMMIT_SHA: OLD_SHA, [CLEAN_EXPECTED_COMMIT_ENV]: OLD_SHA }, false],
  ["old branch + new SHA", { ...legacyEnv, VERCEL_GIT_COMMIT_SHA: NEW_SHA, [EXPECTED_COMMIT_ENV]: NEW_SHA }, false],
  ["wrong auth origin", { ...cleanEnv, APP_ORIGIN: OLD_ORIGIN, BETTER_AUTH_URL: OLD_ORIGIN }, true],
  ["mismatched auth origins", { ...cleanEnv, APP_ORIGIN: NEW_ORIGIN, BETTER_AUTH_URL: OLD_ORIGIN }, true],
  ["missing expected SHA", { ...cleanEnv, [CLEAN_EXPECTED_COMMIT_ENV]: undefined }, false],
  ["wrong environment", { ...cleanEnv, VERCEL_ENV: "production" }, false],
  ["unknown branch", { ...cleanEnv, VERCEL_GIT_COMMIT_REF: "codex/unknown-preview" }, false],
  ["legacy origin copied to clean branch", { ...cleanEnv, APP_ORIGIN: OLD_ORIGIN, BETTER_AUTH_URL: OLD_ORIGIN, VERCEL_URL: NEW_ORIGIN.slice("https://".length) }, true],
  ["random Vercel origin", { ...cleanEnv, APP_ORIGIN: "https://fixoku-site-attacker-fixoku.vercel.app", BETTER_AUTH_URL: "https://fixoku-site-attacker-fixoku.vercel.app", VERCEL_URL: "fixoku-site-attacker-fixoku.vercel.app" }, false],
]) {
  assert.equal(resolveApplicationOrigin(env), null, name);
  assert.equal(isExactPreviewEnvironment(env), runtimeExpected, `${name} runtime guard`);
}

const owner = { memberships: [{ role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
const superAdmin = { memberships: [{ role: "SUPER_ADMIN", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
const previous = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA: process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA,
};
try {
  process.env.NODE_ENV = "production";
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";
  process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA = "0";
  assert.equal(privilegedTwoFactorRequired(owner), false, "preview Owner override remains explicit only");
  assert.equal(privilegedTwoFactorRequired(superAdmin), true, "SUPER_ADMIN 2FA remains required");
  process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA = "1";
  assert.equal(privilegedTwoFactorRequired(owner), true, "Owner 2FA enforced without override");
} finally {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(JSON.stringify({
  OLD_BRANCH_GUARD: "PASS",
  NEW_BRANCH_GUARD: "PASS",
  AUTH_ORIGIN_NEGATIVES: "PASS",
  SUPER_ADMIN_2FA: "PASS",
}));
