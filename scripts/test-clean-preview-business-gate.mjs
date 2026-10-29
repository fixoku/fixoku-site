import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CLEAN_STAGING_HOSTS,
  cleanPreviewGateResponse,
  isCleanPreviewBusinessAccessBlocked,
  previewContractMetadataAttested,
} from "../src/server/auth/preview-contract.js";

const CLEAN_BRANCH = "codex/fixoku-clean-integration-20261029";
const CLEAN_SHA = "15d9964d7e06dcc424cec62255b430a0544d6bc5";
const CLEAN_HOST = "fixoku-site-git-codex-fixoku-clean-integration-20261029-fixoku.vercel.app";
const OLD_BRANCH = "codex/r97g-staging-preview-20261027";
const OLD_SHA = "f1167d8b0afe8bc30da85369d277316d9ffaa3c3";

const baseClean = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_URL: CLEAN_HOST,
  VERCEL_GIT_COMMIT_REF: CLEAN_BRANCH,
  VERCEL_GIT_COMMIT_SHA: CLEAN_SHA,
  FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA: CLEAN_SHA,
  FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED: "1",
  FIXOKU_CLEAN_STAGING_PROJECT_ID: "damp-night-76577929",
  FIXOKU_CLEAN_STAGING_BRANCH_ID: "br-solitary-scene-ba3d7ejb",
  FIXOKU_CLEAN_STAGING_DATABASE: "neondb",
  FIXOKU_CLEAN_STAGING_POOLED_HOST: CLEAN_STAGING_HOSTS.pooled,
  FIXOKU_CLEAN_STAGING_DIRECT_HOST: CLEAN_STAGING_HOSTS.direct,
};

const previous = Object.fromEntries([
  "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_GIT_COMMIT_REF", "VERCEL_GIT_COMMIT_SHA",
  "FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA", "FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED",
  "FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED", "FIXOKU_CLEAN_STAGING_PROJECT_ID",
  "FIXOKU_CLEAN_STAGING_BRANCH_ID", "FIXOKU_CLEAN_STAGING_DATABASE",
  "FIXOKU_CLEAN_STAGING_POOLED_HOST", "FIXOKU_CLEAN_STAGING_DIRECT_HOST",
].map((key) => [key, process.env[key]]));

function setEnv(env) {
  for (const key of Object.keys(previous)) delete process.env[key];
  Object.assign(process.env, env);
}

function responseStub() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: "",
    setHeader(key, value) { this.headers.set(key, value); },
    end(value) { this.body = String(value || ""); },
  };
}

try {
  setEnv(baseClean);
  assert.equal(isCleanPreviewBusinessAccessBlocked(), true, "missing attestation blocks clean Preview business access");
  assert.equal(previewContractMetadataAttested(null), false, "unknown contract cannot attest");
  const blocked = responseStub();
  assert.equal(cleanPreviewGateResponse(blocked), false, "blocked clean Preview returns false");
  assert.equal(blocked.statusCode, 503, "blocked clean Preview returns 503");
  assert.equal(JSON.parse(blocked.body).error, "CLEAN_PREVIEW_RUNTIME_UNVERIFIED");

  setEnv({ ...baseClean, FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "1" });
  assert.equal(isCleanPreviewBusinessAccessBlocked(), false, "verified clean Preview permits guarded business dispatch");
  const allowed = responseStub();
  assert.equal(cleanPreviewGateResponse(allowed), true, "verified clean Preview passes gate");
  assert.equal(allowed.statusCode, 200);

  for (const [name, change] of [
    ["wrong project", { FIXOKU_CLEAN_STAGING_PROJECT_ID: "long-mountain-95369343" }],
    ["wrong branch metadata", { FIXOKU_CLEAN_STAGING_BRANCH_ID: "br-wrong" }],
    ["wrong database", { FIXOKU_CLEAN_STAGING_DATABASE: "postgres" }],
    ["wrong pooled host", { FIXOKU_CLEAN_STAGING_POOLED_HOST: "attacker.example" }],
    ["wrong direct host", { FIXOKU_CLEAN_STAGING_DIRECT_HOST: "attacker.example" }],
    ["attestation failure", { FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "0" }],
    ["wrong SHA", { VERCEL_GIT_COMMIT_SHA: OLD_SHA }],
    ["missing Vercel deployment URL", { VERCEL_URL: undefined }],
  ]) {
    const env = { ...baseClean, FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "1", ...change };
    setEnv(env);
    assert.equal(isCleanPreviewBusinessAccessBlocked(), true, `${name} blocks clean Preview business access`);
  }

  setEnv({
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: OLD_BRANCH,
    VERCEL_GIT_COMMIT_SHA: OLD_SHA,
  });
  assert.equal(isCleanPreviewBusinessAccessBlocked(), false, "legacy R98 is outside clean gate");

  setEnv({ ...baseClean, FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "1", VERCEL_GIT_COMMIT_REF: OLD_BRANCH });
  assert.equal(isCleanPreviewBusinessAccessBlocked(), false, "legacy branch is outside clean gate even with clean metadata");

  setEnv({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: CLEAN_BRANCH, VERCEL_GIT_COMMIT_SHA: CLEAN_SHA });
  assert.equal(isCleanPreviewBusinessAccessBlocked(), false, "Production is outside clean gate");

  const fingerprintSource = fs.readFileSync(new URL("../api/internal/r97g-runtime-fingerprint.js", import.meta.url), "utf8");
  assert.doesNotMatch(fingerprintSource, /cleanPreviewGateResponse/u, "fingerprint endpoint remains reachable for bootstrap health checks");
  console.log(JSON.stringify({
    CLEAN_MISSING_ATTESTATION: "BLOCKED",
    CLEAN_METADATA_MISMATCHES: "BLOCKED",
    CLEAN_VERIFIED_GATE: "PASS",
    LEGACY_R98_UNCHANGED: "PASS",
    PRODUCTION_UNCHANGED: "PASS",
    FINGERPRINT_PATH_UNBLOCKED: "PASS",
  }));
} finally {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
