import assert from "node:assert/strict";
import {
  PREVIEW_CONTRACTS,
  previewContractForBranch,
  previewContractMetadataAttested,
  isCleanPreviewBusinessAccessBlocked
} from "../src/server/auth/preview-contract.js";
import { assertSafeDatabaseUrl } from "../src/server/db/runtime-guard.js";

const c = PREVIEW_CONTRACTS.r410Staging;
assert.ok(c);
assert.equal(c.branch, "codex/fixoku-r410-staging-prep-20261121");
assert.equal(previewContractForBranch(c.branch), c);
assert.equal(c.businessGate, true);

const env = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: c.vercelProjectId,
  VERCEL_GIT_COMMIT_REF: c.branch,
  VERCEL_URL: "fixoku-site-test123456-fixoku.vercel.app",
  DATABASE_URL: "postgresql://test:test@example.invalid/neondb",
  DATABASE_URL_UNPOOLED: "postgresql://test:test@example.invalid/neondb",
  [c.probeEnabledEnv]: "1",
  [c.expectedCommitEnv]: "a".repeat(40),
  VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
  [c.metadata.attested]: "1",
  [c.metadata.project]: "unverified",
  [c.metadata.branch]: "unverified",
  [c.metadata.database]: "neondb",
  [c.metadata.pooledHost]: "example.invalid",
  [c.metadata.directHost]: "example.invalid"
};

assert.equal(previewContractMetadataAttested(c, env), false);
assert.equal(isCleanPreviewBusinessAccessBlocked(env), true);
assert.throws(
  () => assertSafeDatabaseUrl(env.DATABASE_URL, env),
  /DATABASE_RUNTIME_TARGET_UNVERIFIED/
);
assert.throws(
  () => assertSafeDatabaseUrl(env.DATABASE_URL, {
    VERCEL_GIT_COMMIT_REF: c.branch
  }),
  /DATABASE_RUNTIME_TARGET_UNVERIFIED/
);

console.log("R410_CONTRACT=PASS");
console.log("UNVERIFIED_NEON_BLOCKED=PASS");
console.log("BUSINESS_ACCESS_BLOCKED=PASS");
console.log("LOCAL_GUARD=PASS");
console.log("D8DU_FINAL=PASS");