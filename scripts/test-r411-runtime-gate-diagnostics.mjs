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

{
  const capturedR411 = [];
  const oldWarnR411 = console.warn;
  const markerR411 = "R411_SYNTHETIC_NEVER_LOG";

  console.warn = (...args) => capturedR411.push(args);

  try {
    assertSafeDatabaseUrl(env.DATABASE_URL, env);
    assertSafeDatabaseUrl(env.DATABASE_URL_UNPOOLED, env);
    assert.equal(capturedR411.length, 0);

    console.log("EXACT_ACCEPTED_BASELINE=PASS");

    const matrixCasesR411 = [
      ["WRONG_COMMIT", {
        [c.expectedCommitEnv]: "f".repeat(40)
      }, "commitMatch"],

      ["WRONG_PROJECT", {
        VERCEL_PROJECT_ID: "wrong"
      }, "projectMatch"],

      ["WRONG_DEPLOYMENT", {
        VERCEL_URL: "example.invalid"
      }, "deploymentHost"],

      ["MISSING_ATTESTATION", {
        [c.metadata.attested]: ""
      }, "metadataAttested"],

      ["DISABLED_PROBE", {
        [c.probeEnabledEnv]: "0"
      }, "probeEnabled"],

      ["WRONG_POOLED_URL", {
        DATABASE_URL:
          `postgresql://synthetic:${markerR411}@example.invalid/neondb`
      }, "pooledTargetValid"],

      ["WRONG_DIRECT_URL", {
        DATABASE_URL_UNPOOLED:
          `postgresql://synthetic:${markerR411}@example.invalid/neondb`
      }, "directTargetValid"]
    ];

    for (const [name, patch, key] of matrixCasesR411) {
      capturedR411.length = 0;

      const invalid = {...env, ...patch};

      assert.throws(
        () => assertSafeDatabaseUrl(invalid.DATABASE_URL, invalid),
        /DATABASE_RUNTIME_TARGET_UNVERIFIED/
      );

      assert.equal(capturedR411.length, 1);
      assert.equal(capturedR411[0][0], "FIXOKU_R410_RUNTIME_GATE");

      const matrix = JSON.parse(capturedR411[0][1]);

      assert.equal(matrix[key], false);
      assert(Object.values(matrix).every(v => typeof v === "boolean"));

      const serialized = JSON.stringify(capturedR411);

      assert(!serialized.includes(markerR411));
      assert(!serialized.includes("postgresql://"));

      console.log("DIAGNOSTIC_" + name + "=PASS");
    }

    console.log("DIAGNOSTIC_TESTS=7/7");
    console.log("SECRET_LEAK_PREVENTION=PASS");
    console.log("SECURITY_GATE_PRESERVED=PASS");
  } finally {
    console.warn = oldWarnR411;
  }
}
