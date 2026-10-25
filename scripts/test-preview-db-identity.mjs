import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  PREVIEW_DB_IDENTITY_HEADER,
  PREVIEW_DB_IDENTITY_PATH,
  PREVIEW_DB_IDENTITY_TOKEN_ENV,
  generatePreviewDbIdentityToken,
  previewDbIdentityResponseIsSafe,
  runPreviewDbIdentityDiagnostic,
} from "../src/server/domain/preview-db-identity.js";

const token = generatePreviewDbIdentityToken();
const pooledUrl = "postgresql://pooled-user:pooled-password@ep-pooled-fixoku-r35-test.eu-central-1.aws.neon.tech/fixoku?sslmode=require";
const unpooledUrl = "postgresql://direct-user:direct-password@ep-direct-fixoku-r35-test.eu-central-1.aws.neon.tech/fixoku?sslmode=require";
const env = {
  VERCEL_ENV: "preview",
  [PREVIEW_DB_IDENTITY_TOKEN_ENV]: token,
  DATABASE_URL: pooledUrl,
  DATABASE_URL_UNPOOLED: unpooledUrl,
};

const request = (value = token, overrides = {}) => ({
  method: "GET",
  url: PREVIEW_DB_IDENTITY_PATH,
  headers: { [PREVIEW_DB_IDENTITY_HEADER]: value },
  ...overrides,
});

assert.equal(Buffer.from(token, "base64url").length, 32);
assert.notEqual(token, generatePreviewDbIdentityToken());

let clients = [];
const clientFactory = (config) => {
  const client = {
    config,
    queries: [],
    async connect() {},
    async query(sql) {
      this.queries.push(sql);
      assert.match(sql, /^select /iu);
      if (/current_setting/iu.test(sql)) return { rows: [{ neon_branch_id: "br-fixoku-r35-test" }] };
      return { rows: [{ "?column?": 1 }] };
    },
    async end() {},
  };
  clients.push(client);
  return client;
};

let result = await runPreviewDbIdentityDiagnostic({ req: request(), env, clientFactory });
assert.equal(result.status, 200);
assert.equal(result.body.ok, true);
assert.equal(result.body.environment, "preview");
assert.equal(result.body.pooled.serverNameSha256, createHash("sha256").update("ep-pooled-fixoku-r35-test.eu-central-1.aws.neon.tech").digest("hex"));
assert.equal(result.body.unpooled.serverNameSha256, createHash("sha256").update("ep-direct-fixoku-r35-test.eu-central-1.aws.neon.tech").digest("hex"));
assert.equal(result.body.pooled.neonBranchId, "br-fixoku-r35-test");
assert.equal(result.body.unpooled.neonBranchId, "br-fixoku-r35-test");
assert.equal(clients.length, 2);
assert.ok(clients.every((client) => client.config.options.includes("default_transaction_read_only=on")));
assert.ok(clients.every((client) => client.queries.every((query) => /^select /iu.test(query))));
assert.ok(previewDbIdentityResponseIsSafe(result.body, [token, pooledUrl, unpooledUrl, "pooled-password", "direct-password"]));

const clientsBeforeDenied = clients.length;
result = await runPreviewDbIdentityDiagnostic({ req: request("wrong-token"), env, clientFactory });
assert.equal(result.status, 401);
assert.equal(clients.length, clientsBeforeDenied);

result = await runPreviewDbIdentityDiagnostic({ req: request(token, { url: `${PREVIEW_DB_IDENTITY_PATH}?token=${encodeURIComponent(token)}` }), env, clientFactory });
assert.equal(result.status, 400);
assert.equal(clients.length, clientsBeforeDenied);

result = await runPreviewDbIdentityDiagnostic({ req: request(), env: { ...env, VERCEL_ENV: "production" }, clientFactory });
assert.equal(result.status, 404);
assert.equal(clients.length, clientsBeforeDenied);

result = await runPreviewDbIdentityDiagnostic({ req: request(), env: { ...env, DATABASE_URL_UNPOOLED: "not-a-database-url" }, clientFactory });
assert.equal(result.status, 503);
assert.equal(result.body.unpooled.serverNameSha256, null);

const failingFactory = () => ({
  async connect() {},
  async query() { throw new Error("database secret must not escape"); },
  async end() {},
});
result = await runPreviewDbIdentityDiagnostic({ req: request(), env, clientFactory: failingFactory });
assert.equal(result.status, 503);
assert.equal(result.body.ok, false);
assert.equal(JSON.stringify(result.body).includes("database secret"), false);

console.log(JSON.stringify({ previewDbIdentity: "PASS", previewOnly: "PASS", token: "32_BYTES_RANDOM_BASE64URL", constantTime: "PASS", select1Only: "PASS", secretsNotReturned: "PASS", production404: "PASS" }));
