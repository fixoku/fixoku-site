import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRuntimeFingerprintHandler,
  EXPECTED_COMMIT_ENV,
  EXPECTED_DIRECT_HOST,
  EXPECTED_POOLED_HOST,
  FINGERPRINT_SQL,
  hasOperatorNeonMetadataAttestation,
  isExactPreviewEnvironment,
} from "../api/internal/r97g-runtime-fingerprint.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpointSource = fs.readFileSync(path.join(root, "api/internal/r97g-runtime-fingerprint.js"), "utf8");
const contractSource = fs.readFileSync(path.join(root, "src/server/auth/preview-contract.js"), "utf8");
const COMMIT = "f1167d8b0afe8bc30da85369d277316d9ffaa3c3";
const TOKEN = "r97g-runtime-token-012345678901234567890123456789";
const BASE_ENV = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "codex/r97g-staging-preview-20261027",
  VERCEL_GIT_COMMIT_SHA: COMMIT,
  VERCEL_URL: "fixoku-site-git-codex-r97g-staging-preview-20261027-fixoku.vercel.app",
  [EXPECTED_COMMIT_ENV]: COMMIT,
  R97G_RUNTIME_PROBE_ENABLED: "1",
  R97G_RUNTIME_PROBE_TOKEN: TOKEN,
  R97G_STAGING_ENDPOINT_METADATA_ATTESTED: "1",
  R97G_STAGING_PROJECT_ID: "damp-night-76577929",
  R97G_STAGING_BRANCH_ID: "br-solitary-scene-ba3d7ejb",
  R97G_STAGING_DATABASE: "neondb",
  R97G_STAGING_POOLED_HOST: EXPECTED_POOLED_HOST,
  R97G_STAGING_DIRECT_HOST: EXPECTED_DIRECT_HOST,
  DATABASE_URL: "postgresql://runtime-user:runtime-password@ep-dark-math-baw61g90-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  DATABASE_URL_UNPOOLED: "postgresql://runtime-user:runtime-password@ep-dark-math-baw61g90.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require",
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
  Object.defineProperty(response, "statusCode", {
    get() { return state.statusCode; },
    set(value) { state.statusCode = value; },
  });
  response.state = state;
  return response;
}

function fakePoolFactory(calls, transactionReadOnly = "on") {
  return (connectionString) => {
    calls.push({ connectionString, queries: [] });
    const call = calls.at(-1);
    return {
      async connect() {
        return {
          async query(sql) {
            call.queries.push(sql);
            if (sql === "begin read only" || sql === "rollback") return { rows: [] };
            if (sql === FINGERPRINT_SQL) {
              return {
                rows: [{
                  database: "neondb",
                  role: "staging_runtime",
                  schema: "public",
                  server_version: "16.4",
                  transaction_read_only: transactionReadOnly,
                }],
              };
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

assert.equal(isExactPreviewEnvironment(BASE_ENV), true);
assert.equal(hasOperatorNeonMetadataAttestation(BASE_ENV), true);

await withEnv(BASE_ENV, async () => {
  const calls = [];
  const handler = createRuntimeFingerprintHandler({ poolFactory: fakePoolFactory(calls) });
  const response = responseRecorder();
  await handler({ method: "POST", headers: { "x-fixoku-r97g-runtime-token": TOKEN } }, response);
  assert.equal(response.state.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.connectionString), [BASE_ENV.DATABASE_URL, BASE_ENV.DATABASE_URL_UNPOOLED]);
  for (const call of calls) assert.deepEqual(call.queries, ["begin read only", FINGERPRINT_SQL, "rollback"]);
  assert.doesNotMatch(response.state.body, /runtime-password|neon\.tech|:5432|runtime-token|connectionString|hostname|stack/iu);
  const body = JSON.parse(response.state.body);
  assert.equal(body.metadataAttested, true);
  assert.equal(body.commit, COMMIT);
  assert.equal(body.connections.pooled.database, "neondb");
  assert.equal(body.connections.direct.transactionReadOnly, "on");
});


await withEnv(BASE_ENV, async () => {
  const calls = [];
  const handler = createRuntimeFingerprintHandler({ poolFactory: fakePoolFactory(calls, "off") });
  const response = responseRecorder();
  await handler({ method: "POST", headers: { "x-fixoku-r97g-runtime-token": TOKEN } }, response);
  assert.equal(response.state.statusCode, 503);
  assert.equal(calls.length, 2);
  for (const call of calls) assert.deepEqual(call.queries, ["begin read only", FINGERPRINT_SQL, "rollback"]);
});

for (const [name, changes] of [
  ["unauthorized", { R97G_RUNTIME_PROBE_TOKEN: "wrong-token" }],
  ["wrong-branch", { VERCEL_GIT_COMMIT_REF: "codex/other-branch" }],
  ["wrong-commit", { VERCEL_GIT_COMMIT_SHA: "0000000000000000000000000000000000000000" }],
  ["stale-commit-guard", { [EXPECTED_COMMIT_ENV]: "0000000000000000000000000000000000000000" }],
  ["production", { VERCEL_ENV: "production" }],
  ["missing-metadata", { R97G_STAGING_ENDPOINT_METADATA_ATTESTED: undefined }],
  ["missing-pooled-env", { DATABASE_URL: undefined }],
]) {
  await withEnv({ ...BASE_ENV, ...changes }, async () => {
    let opened = false;
    const handler = createRuntimeFingerprintHandler({
      poolFactory: () => {
        opened = true;
        throw new Error("MUST_NOT_CONNECT");
      },
    });
    const response = responseRecorder();
    const requestToken = name === "unauthorized" ? "actually-wrong-token" : TOKEN;
    await handler({ method: "POST", headers: { "x-fixoku-r97g-runtime-token": requestToken } }, response);
    assert.notEqual(response.state.statusCode, 200, name);
    assert.equal(opened, false, name);
  });
}

await withEnv(BASE_ENV, async () => {
  let opened = false;
  const handler = createRuntimeFingerprintHandler({
    poolFactory: () => {
      opened = true;
      throw new Error("MUST_NOT_CONNECT");
    },
  });
  const response = responseRecorder();
  await handler({ method: "GET", headers: { "x-fixoku-r97g-runtime-token": TOKEN } }, response);
  assert.equal(response.state.statusCode, 405);
  assert.equal(opened, false);
});

for (const changes of [
  { R97G_STAGING_POOLED_HOST: "unexpected.neon.tech" },
  { R97G_STAGING_POOLED_HOST: "ep-dark-math-baw61g90-pooler" },
  { DATABASE_URL: "postgresql://runtime-user:runtime-password@ep-dark-math-baw61g90-pooler.evil.neon.tech/neondb?sslmode=require" },
]) {
  await withEnv({ ...BASE_ENV, ...changes }, async () => {
    let opened = false;
    const handler = createRuntimeFingerprintHandler({
      poolFactory: () => {
        opened = true;
        throw new Error("MUST_NOT_CONNECT");
      },
    });
    const response = responseRecorder();
    await handler({ method: "POST", headers: { "x-fixoku-r97g-runtime-token": TOKEN } }, response);
    assert.equal(response.state.statusCode, 503);
    assert.equal(opened, false);
  });
}

assert.doesNotMatch(endpointSource, /insert\s+into|update\s+\w+\s+set|delete\s+from|create\s+table|alter\s+table|drop\s+table|drizzle-kit|migrat(?:e|ion)|seed/iu);
assert.match(endpointSource, /begin read only/u);
assert.match(endpointSource, /transaction_read_only/u);
assert.match(contractSource, /R97G_STAGING_PROJECT_ID/u);
assert.match(contractSource, /R97G_STAGING_BRANCH_ID/u);
assert.match(contractSource, /R97G_RUNTIME_EXPECTED_COMMIT_SHA/u);
assert.match(contractSource, /FIXOKU_CLEAN_STAGING_PROJECT_ID/u);
assert.match(contractSource, /FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA/u);
assert.match(endpointSource, /EXPECTED_POOLED_HOST/u);
assert.match(endpointSource, /metadataAttested/u);
console.log("R97G16_RUNTIME_FINGERPRINT_TEST=PASS");
