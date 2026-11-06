import assert from "node:assert/strict";
import fs from "node:fs";
import guardedPg from "../src/server/db/guarded-pg.js";
import {
  FINGERPRINT_SQL,
  createCleanRuntimeFingerprintHandler,
} from "../api/internal/fixoku-clean-runtime-fingerprint.js";
import {
  CLEAN_PREVIEW_BRANCH,
  CLEAN_STAGING_DIRECT_HOST,
  CLEAN_STAGING_POOLED_HOST,
  assertCleanPreviewConnectionUrl,
  assertSafeDatabaseUrl,
  cleanPreviewEnvironmentStatus,
  isExactCleanPreviewEnvironment,
} from "../src/server/db/runtime-guard.js";

const COMMIT = "1483683e96883b01549739eddef9cbc23eb76dfb";
const TOKEN = "clean-runtime-probe-token-01234567890123456789";
const POOLED_URL = `postgresql://runtime-user:runtime-password@${CLEAN_STAGING_POOLED_HOST}/neondb?sslmode=require`;
const DIRECT_URL = `postgresql://runtime-user:runtime-password@${CLEAN_STAGING_DIRECT_HOST}/neondb?sslmode=require`;
const BASE_ENV = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: CLEAN_PREVIEW_BRANCH,
  VERCEL_GIT_COMMIT_SHA: COMMIT,
  FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA: COMMIT,
  FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED: "1",
  FIXOKU_CLEAN_RUNTIME_PROBE_TOKEN: TOKEN,
  FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED: "1",
  FIXOKU_CLEAN_STAGING_PROJECT_ID: "tiny-fire-86403197",
  FIXOKU_CLEAN_STAGING_BRANCH_ID: "br-sweet-resonance-b17h2ttf",
  FIXOKU_CLEAN_STAGING_DATABASE: "neondb",
  FIXOKU_CLEAN_STAGING_POOLED_HOST: CLEAN_STAGING_POOLED_HOST,
  FIXOKU_CLEAN_STAGING_DIRECT_HOST: CLEAN_STAGING_DIRECT_HOST,
  DATABASE_URL: POOLED_URL,
  DATABASE_URL_UNPOOLED: DIRECT_URL,
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
              return { rows: [{ database: "neondb", role: "staging_runtime", schema: "public", server_version: "16.4", transaction_read_only: transactionReadOnly }] };
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

assert.equal(isExactCleanPreviewEnvironment(BASE_ENV), true);
assert.equal(cleanPreviewEnvironmentStatus(BASE_ENV).ok, true);
assert.equal(assertCleanPreviewConnectionUrl(POOLED_URL, "pooled", BASE_ENV), POOLED_URL);
assert.equal(assertCleanPreviewConnectionUrl(DIRECT_URL, "direct", BASE_ENV), DIRECT_URL);
assert.equal(assertSafeDatabaseUrl(POOLED_URL, BASE_ENV), POOLED_URL);
assert.equal(assertSafeDatabaseUrl("postgresql://production-user:production-password@production.example.test/fixoku", {
  VERCEL: "1",
  VERCEL_ENV: "production",
}), "postgresql://production-user:production-password@production.example.test/fixoku");

await withEnv(BASE_ENV, async () => {
  assert.throws(
    () => new guardedPg.Pool({ connectionString: POOLED_URL.replace(CLEAN_STAGING_POOLED_HOST, "production.example.test") }),
    /DATABASE_TARGET_HOST_UNVERIFIED/u,
  );
});

assert.match(fs.readFileSync(new URL("../src/server/db/client.js", import.meta.url), "utf8"), /from "\.\/guarded-pg\.js"/u);
assert.match(fs.readFileSync(new URL("../src/server/db/client.ts", import.meta.url), "utf8"), /from "\.\/guarded-pg\.js"/u);
assert.match(fs.readFileSync(new URL("../api/paytr/callback.js", import.meta.url), "utf8"), /from "\.\.\/\.\.\/src\/server\/db\/guarded-pg\.js"/u);

await withEnv(BASE_ENV, async () => {
  const calls = [];
  const handler = createCleanRuntimeFingerprintHandler({ poolFactory: fakePoolFactory(calls) });
  const response = responseRecorder();
  await handler({ method: "POST", headers: { "x-fixoku-clean-runtime-token": TOKEN } }, response);
  assert.equal(response.state.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.connectionString), [POOLED_URL, DIRECT_URL]);
  for (const call of calls) assert.deepEqual(call.queries, ["begin read only", FINGERPRINT_SQL, "rollback"]);
  assert.doesNotMatch(response.state.body, /runtime-password|clean-runtime-probe-token|connectionString|hostname|stack/iu);
  const body = JSON.parse(response.state.body);
  assert.equal(body.branch, CLEAN_PREVIEW_BRANCH);
  assert.equal(body.connections.pooled.transactionReadOnly, "on");
});

for (const [name, changes] of [
  ["wrong-branch", { VERCEL_GIT_COMMIT_REF: "codex/other-branch" }],
  ["wrong-commit", { VERCEL_GIT_COMMIT_SHA: "0000000000000000000000000000000000000000" }],
  ["stale-expected-commit", { FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA: "0000000000000000000000000000000000000000" }],
  ["production", { VERCEL_ENV: "production" }],
  ["probe-disabled", { FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED: "0" }],
  ["wrong-project", { FIXOKU_CLEAN_STAGING_PROJECT_ID: "production-project" }],
  ["wrong-metadata-host", { FIXOKU_CLEAN_STAGING_POOLED_HOST: "unexpected.neon.tech" }],
  ["missing-pooled-url", { DATABASE_URL: undefined }],
]) {
  await withEnv({ ...BASE_ENV, ...changes }, async () => {
    let opened = false;
    const handler = createCleanRuntimeFingerprintHandler({ poolFactory: () => { opened = true; throw new Error("MUST_NOT_CONNECT"); } });
    const response = responseRecorder();
    await handler({ method: "POST", headers: { "x-fixoku-clean-runtime-token": TOKEN } }, response);
    assert.notEqual(response.state.statusCode, 200, name);
    assert.equal(opened, false, name);
  });
}

for (const [name, url] of [
  ["pooled-host", POOLED_URL.replace(CLEAN_STAGING_POOLED_HOST, "evil.neon.tech")],
  ["direct-host", DIRECT_URL.replace(CLEAN_STAGING_DIRECT_HOST, CLEAN_STAGING_POOLED_HOST)],
  ["database", POOLED_URL.replace("/neondb?", "/postgres?" )],
  ["sslmode", POOLED_URL.replace("sslmode=require", "sslmode=disable")],
]) {
  assert.throws(() => assertCleanPreviewConnectionUrl(url, name === "direct-host" ? "direct" : "pooled", BASE_ENV), /DATABASE_TARGET|DATABASE_URL_SSLMODE/iu, name);
}

await withEnv(BASE_ENV, async () => {
  const handler = createCleanRuntimeFingerprintHandler({ poolFactory: fakePoolFactory([], "off") });
  const response = responseRecorder();
  await handler({ method: "POST", headers: { "x-fixoku-clean-runtime-token": TOKEN } }, response);
  assert.equal(response.state.statusCode, 503);
});

await withEnv(BASE_ENV, async () => {
  const handler = createCleanRuntimeFingerprintHandler({ poolFactory: () => { throw new Error("MUST_NOT_CONNECT"); } });
  const response = responseRecorder();
  await handler({ method: "GET", headers: { "x-fixoku-clean-runtime-token": TOKEN } }, response);
  assert.equal(response.state.statusCode, 405);
});

console.log("R146_RUNTIME_SECURITY_TEST=PASS");
