import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAGING_DIAGNOSTIC_SQL,
  STAGING_DIAGNOSTIC_TOKEN_HEADER,
  STAGING_DIAGNOSTIC_TOKEN_ENV,
  STAGING_DIAGNOSTIC_EXPECTED_PROJECT,
  STAGING_DIAGNOSTIC_PRODUCTION_PROJECT,
  createStagingRuntimeDiagnosticHandler,
} from "../api/internal/fixoku-staging-runtime-diagnostic.js";
import { PREVIEW_CONTRACTS, R16_STAGING_HOSTS, R16_STAGING_METADATA } from "../src/server/auth/preview-contract.js";

const TOKEN = "staging-runtime-probe-token-012345678901234567890";
const COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const POOLED = "postgresql://runtime-user:runtime-password@ep-calm-term-b1l1d62f-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const DIRECT = "postgresql://runtime-user:runtime-password@ep-calm-term-b1l1d62f.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const R16_TOKEN = "r16-runtime-probe-token-012345678901234567890";
const R16_COMMIT = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const R16_CONTRACT = PREVIEW_CONTRACTS.r16Staging;
const R16_POOLED = `postgresql://runtime-user:runtime-password@${R16_STAGING_HOSTS.pooled}/neondb?sslmode=require`;
const R16_DIRECT = `postgresql://runtime-user:runtime-password@${R16_STAGING_HOSTS.direct}/neondb?sslmode=require`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_ENV = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR",
  VERCEL_ORG_ID: "team_G4NbdNKM6NSdvIVMUkszTQYc",
  VERCEL_GIT_COMMIT_REF: "codex/fixoku-clean-integration-20261029",
  VERCEL_GIT_COMMIT_SHA: COMMIT,
  VERCEL_URL: "fixoku-site-git-codex-fixoku-clean-integration-20261029-fixoku.vercel.app",
  FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA: COMMIT,
  FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED: "1",
  FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "1",
  FIXOKU_CLEAN_STAGING_PROJECT_ID: STAGING_DIAGNOSTIC_EXPECTED_PROJECT,
  FIXOKU_CLEAN_STAGING_BRANCH_ID: "br-sweet-resonance-b17h2ttf",
  FIXOKU_CLEAN_STAGING_DATABASE: "neondb",
  FIXOKU_CLEAN_STAGING_POOLED_HOST: "ep-calm-term-b1l1d62f-pooler.c-5.eu-central-1.aws.neon.tech",
  FIXOKU_CLEAN_STAGING_DIRECT_HOST: "ep-calm-term-b1l1d62f.c-5.eu-central-1.aws.neon.tech",
  [STAGING_DIAGNOSTIC_TOKEN_ENV]: TOKEN,
  NEON_BRANCH_ID: "br-preview-runtime",
  NEON_PROJECT_ID: STAGING_DIAGNOSTIC_EXPECTED_PROJECT,
  DATABASE_URL: POOLED,
  DATABASE_URL_UNPOOLED: DIRECT,
};

function withEnv(values, callback) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve().then(callback).finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
  });
}

function responseRecorder() {
  const state = { statusCode: 200, headers: {}, body: "" };
  const response = {
    setHeader(name, value) { state.headers[name] = value; },
    end(body = "") { state.body = String(body); },
  };
  Object.defineProperty(response, "statusCode", { get: () => state.statusCode, set: (value) => { state.statusCode = value; } });
  response.state = state;
  return response;
}

function fakePoolFactory(calls, projectId = STAGING_DIAGNOSTIC_EXPECTED_PROJECT, branchId = "br-preview-runtime") {
  return (connectionString) => {
    const call = { connectionString, queries: [] };
    calls.push(call);
    return {
      async connect() {
        return {
          async query(sql) {
            call.queries.push(sql);
            if (sql === "begin read only" || sql === "rollback") return { rows: [] };
            if (sql === STAGING_DIAGNOSTIC_SQL) {
              return { rows: [{ database: "neondb", role: "neondb_owner", schema: "public", server_version: "18.6", transaction_read_only: "on", neon_branch_id: branchId, neon_project_id: projectId }] };
            }
            throw new Error("UNEXPECTED_SQL");
          },
          release() {},
        };
      },
      async end() {},
    };
  };
}

async function invoke(env, request, poolFactory = fakePoolFactory([]), oidcVerifier = async () => false) {
  return withEnv(env, async () => {
    const response = responseRecorder();
    await createStagingRuntimeDiagnosticHandler({ poolFactory, oidcVerifier })(request, response);
    return { state: response.state, body: JSON.parse(response.state.body) };
  });
}

const request = (headers = {}) => ({ method: "POST", url: "/api/internal/fixoku-staging-runtime-diagnostic", headers });

const R16_ENV = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR",
  VERCEL_ORG_ID: "team_G4NbdNKM6NSdvIVMUkszTQYc",
  VERCEL_GIT_COMMIT_REF: R16_CONTRACT.branch,
  VERCEL_GIT_COMMIT_SHA: R16_COMMIT,
  VERCEL_URL: "fixoku-site-git-codex-fixoku-staging-r15-20261106-fixoku.vercel.app",
  [R16_CONTRACT.expectedCommitEnv]: R16_COMMIT,
  [R16_CONTRACT.probeEnabledEnv]: "1",
  [R16_CONTRACT.probeTokenEnv]: R16_TOKEN,
  [R16_CONTRACT.metadata.attested]: undefined,
  [R16_CONTRACT.metadata.project]: R16_STAGING_METADATA.project,
  [R16_CONTRACT.metadata.branch]: R16_STAGING_METADATA.branch,
  [R16_CONTRACT.metadata.database]: R16_STAGING_METADATA.database,
  [R16_CONTRACT.metadata.pooledHost]: R16_STAGING_HOSTS.pooled,
  [R16_CONTRACT.metadata.directHost]: R16_STAGING_HOSTS.direct,
  NEON_PROJECT_ID: R16_STAGING_METADATA.project,
  NEON_BRANCH_ID: R16_STAGING_METADATA.branch,
  DATABASE_URL: R16_POOLED,
  DATABASE_URL_UNPOOLED: R16_DIRECT,
};

await withEnv(BASE_ENV, async () => {
  const calls = [];
  const result = await invoke(BASE_ENV, request({ host: BASE_ENV.VERCEL_URL, [STAGING_DIAGNOSTIC_TOKEN_HEADER]: TOKEN }), fakePoolFactory(calls));
  assert.equal(result.state.statusCode, 200);
  assert.equal(result.body.target.neonProjectId, STAGING_DIAGNOSTIC_EXPECTED_PROJECT);
  assert.equal(result.body.connections.pooled.transactionReadOnly, "on");
  assert.equal(calls.length, 2);
  for (const call of calls) assert.deepEqual(call.queries, ["begin read only", STAGING_DIAGNOSTIC_SQL, "rollback"]);
  assert.doesNotMatch(result.state.body, /runtime-password|staging-runtime-probe-token|neon\.tech|connectionString|hostname|stack/iu);
});

{
  const calls = [];
  const result = await invoke(BASE_ENV, request({ host: BASE_ENV.VERCEL_URL }), fakePoolFactory(calls));
  assert.equal(result.state.statusCode, 404);
  assert.equal(result.body.error, "STAGING_DIAGNOSTIC_NOT_FOUND");
  assert.equal(calls.length, 0);
}

{
  const calls = [];
  const result = await invoke(
    { ...BASE_ENV, [STAGING_DIAGNOSTIC_TOKEN_ENV]: undefined },
    request({ host: BASE_ENV.VERCEL_URL }),
    fakePoolFactory(calls),
    async () => true,
  );
  assert.equal(result.state.statusCode, 200);
  assert.equal(calls.length, 2);
}

{
  const calls = [];
  const result = await invoke({ ...BASE_ENV, NEON_PROJECT_ID: undefined }, request({ host: BASE_ENV.VERCEL_URL, [STAGING_DIAGNOSTIC_TOKEN_HEADER]: TOKEN }), fakePoolFactory(calls, STAGING_DIAGNOSTIC_EXPECTED_PROJECT, "br-preview-runtime"));
  assert.equal(result.state.statusCode, 503);
  assert.equal(result.body.error, "RUNTIME_NEON_PROJECT_MISMATCH");
  assert.equal(calls.length, 0);
}

for (const [name, changes] of [
  ["production", { VERCEL_ENV: "production" }],
  ["wrong-project", { VERCEL_PROJECT_ID: "other-project" }],
  ["wrong-branch", { VERCEL_GIT_COMMIT_REF: "codex/other-branch" }],
  ["wrong-deployment-host", { VERCEL_URL: "fixoku-site-attacker-fixoku.vercel.app" }],
  ["conflicting-project-metadata", { NEON_PROJECT_ID: "tiny-fire-86403197", DATABASE_NEON_PROJECT_ID: "other-project" }],
  ["conflicting-branch-metadata", { NEON_BRANCH_ID: "br-one", DATABASE_NEON_BRANCH_ID: "br-two" }],
  ["wrong-token", { [STAGING_DIAGNOSTIC_TOKEN_ENV]: undefined, VERCEL_OIDC_TOKEN: undefined }],
  ["production-neon-project", { NEON_PROJECT_ID: STAGING_DIAGNOSTIC_PRODUCTION_PROJECT }],
]) {
  const calls = [];
  const result = await invoke({ ...BASE_ENV, ...changes }, request({ host: BASE_ENV.VERCEL_URL }), fakePoolFactory(calls));
  assert.notEqual(result.state.statusCode, 200, name);
  assert.equal(calls.length, 0, name);
}

{
  const calls = [];
  const result = await invoke(BASE_ENV, { ...request({ [STAGING_DIAGNOSTIC_TOKEN_HEADER]: TOKEN, "content-length": "1" }), body: "select 1" }, fakePoolFactory(calls));
  assert.equal(result.state.statusCode, 400);
  assert.equal(calls.length, 0);
}

{
  const calls = [];
  const result = await invoke(BASE_ENV, request({ [STAGING_DIAGNOSTIC_TOKEN_HEADER]: TOKEN }), fakePoolFactory(calls, STAGING_DIAGNOSTIC_PRODUCTION_PROJECT));
  assert.equal(result.state.statusCode, 503);
  assert.equal(result.body.error, "RUNTIME_PRODUCTION_TARGET_BLOCKED");
  assert.equal(calls.length, 1);
}

assert.equal(R16_STAGING_METADATA.pooledHost, "ep-old-tree-b1gdwjcz-pooler.c-5.eu-central-1.aws.neon.tech");
assert.equal(R16_STAGING_METADATA.directHost, "ep-old-tree-b1gdwjcz.c-5.eu-central-1.aws.neon.tech");

{
  const calls = [];
  const result = await invoke(
    R16_ENV,
    request({ host: R16_ENV.VERCEL_URL, [R16_CONTRACT.probeTokenHeader]: R16_TOKEN }),
    fakePoolFactory(calls, R16_STAGING_METADATA.project, R16_STAGING_METADATA.branch),
  );
  assert.equal(result.state.statusCode, 200);
  assert.equal(calls.length, 2);
  for (const call of calls) assert.deepEqual(call.queries, ["begin read only", STAGING_DIAGNOSTIC_SQL, "rollback"]);
}

for (const [name, changes] of [
  ["wrong-r16-pooled-host", { [R16_CONTRACT.metadata.pooledHost]: "attacker.example" }],
  ["wrong-r16-url-host", { DATABASE_URL: "postgresql://runtime-user:runtime-password@attacker.example/neondb?sslmode=require" }],
  ["wrong-r16-branch", { [R16_CONTRACT.metadata.branch]: "br-wrong" }],
  ["unauthorized-r16-token", { [R16_CONTRACT.probeTokenEnv]: undefined }],
]) {
  const calls = [];
  const result = await invoke(
    { ...R16_ENV, ...changes },
    request({ host: R16_ENV.VERCEL_URL, [R16_CONTRACT.probeTokenHeader]: R16_TOKEN }),
    fakePoolFactory(calls, R16_STAGING_METADATA.project, R16_STAGING_METADATA.branch),
  );
  assert.equal(result.state.statusCode, name === "unauthorized-r16-token" ? 404 : 503, name);
  assert.equal(calls.length, 0, name);
}

const vercelIgnore = fs.readFileSync(path.join(ROOT, ".vercelignore"), "utf8");
const diagnosticPath = path.join(ROOT, "api/internal/fixoku-staging-runtime-diagnostic.js");
const diagnosticSource = fs.readFileSync(diagnosticPath, "utf8");
const ignoredR97gPath = "api/internal/r97g-runtime-fingerprint.js";
const oidcHelperPath = "src/server/auth/vercel-oidc.js";
assert.match(vercelIgnore, new RegExp(`^${ignoredR97gPath.replaceAll("/", "\\/")}$`, "mu"));
assert.doesNotMatch(vercelIgnore, new RegExp(`^${oidcHelperPath.replaceAll("/", "\\/")}$`, "mu"));
assert.match(diagnosticSource, /from\s+["']\.\.\/\.\.\/src\/server\/auth\/vercel-oidc\.js["']/u);
assert.doesNotMatch(diagnosticSource, /r97g-runtime-fingerprint\.js/u);
for (const match of diagnosticSource.matchAll(/(?:from|import)\s*["'](\.\.?\/[^"']+)["']/gu)) {
  const importedPath = path.resolve(path.dirname(diagnosticPath), match[1]);
  assert.ok(fs.existsSync(importedPath), `static import exists: ${match[1]}`);
  const deploymentPath = path.relative(ROOT, importedPath).replaceAll("\\", "/");
  assert.doesNotMatch(vercelIgnore, new RegExp(`^${deploymentPath.replaceAll("/", "\\/")}$`, "mu"), `static import is deployable: ${match[1]}`);
}

assert.match(STAGING_DIAGNOSTIC_SQL, /begin|neon\.branch_id|neon\.project_id/iu);
assert.doesNotMatch(STAGING_DIAGNOSTIC_SQL, /\b(insert|update|delete|create|alter|drop|migrat(?:e|ion)|seed)\b/iu);
console.log("FIXOKU_STAGING_RUNTIME_DIAGNOSTIC=PASS");
console.log("FIXOKU_R16_PRE_ATTESTATION_DIAGNOSTIC=PASS");
