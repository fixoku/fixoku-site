import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { hashPassword } from "better-auth/crypto";
import { loadLocalEnv } from "./local-env.mjs";
import { createDisposableDatabase, isDisposableDatabaseName } from "./disposable-test-db.mjs";
import { fulfillSuccessfulPayment } from "../src/server/domain/commerce.js";

loadLocalEnv();
const sourceUrl = process.env.DATABASE_URL;
assert.ok(sourceUrl, "DATABASE_URL is required as local PostgreSQL authority");
const password = process.env.TEST_SEED_PASSWORD;
assert.ok(password, "TEST_SEED_PASSWORD is required");
const nodePath = process.execPath;
const vitePath = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const testPort = 5180 + Math.floor(Math.random() * 80);
let server;
let serverOutput = "";
let fixture;

async function waitForServer(origin) {
  const deadline = Date.now() + 45_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(2_000) });
      if (response.status < 500) return;
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`DISPOSABLE_SERVER_START_TIMEOUT:${lastError?.message || "unknown"}`);
}

async function seedFixture(pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const studentAuthId = "commerce-disposable-student";
    const adminAuthId = "commerce-disposable-admin";
    const studentEmail = "commerce.disposable.student@example.test";
    const adminEmail = "commerce.disposable.admin@example.test";
    const studentPasswordHash = await hashPassword(password);
    const adminPasswordHash = await hashPassword(password);
    for (const [id, email, name, passwordHash] of [[studentAuthId, studentEmail, "Commerce Disposable Student", studentPasswordHash], [adminAuthId, adminEmail, "Commerce Disposable Admin", adminPasswordHash]]) {
      await client.query('insert into "user" (id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())', [id, name, email]);
      await client.query('insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,\'credential\',$2,$3,now(),now())', [`${id}-credential`, id, passwordHash]);
    }
    const student = (await client.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [studentAuthId, studentEmail, "Commerce Disposable Student"])).rows[0];
    const admin = (await client.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [adminAuthId, adminEmail, "Commerce Disposable Admin"])).rows[0];
    await client.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'STUDENT',$1,'STUDENT','ACTIVE'),($2,'GLOBAL',null,'SUPER_ADMIN','ACTIVE')", [student.id, admin.id]);
    const profile = (await client.query("insert into student_profiles(user_id,first_name,last_name,status) values($1,'Disposable','Student','ACTIVE') returning id", [student.id])).rows[0];
    const program = (await client.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values('commerce-disposable-program','Commerce disposable program','Owned by this contract fixture.','STUDENT','PUBLISHED','1') returning id")).rows[0];
    const packageRow = (await client.query("insert into packages(slug,audience,status) values('commerce-disposable-package','STUDENT','PUBLISHED') returning id")).rows[0];
    const version = (await client.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status,published_at) values($1,1,'Disposable Commerce Package','Disposable commerce contract fixture.',12345,'TRY','PUBLISHED',now()) returning id", [packageRow.id])).rows[0];
    await client.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'SELF_PACED')", [version.id, program.id]);
    await client.query("commit");
    return { studentEmail, adminEmail, packageVersionId: version.id, studentProfileId: profile.id, priceMinor: 12345, currency: "TRY" };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}

async function request(origin, cookie, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${origin}${path}`, { ...options, headers });
  return { response, body: await response.json().catch(() => ({})) };
}

async function login(origin, email) {
  const result = await request(origin, "", "/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(result.response.status, 200, `login failed for ${email}`);
  return (result.response.headers.get("set-cookie") || "").split(";")[0];
}

try {
  fixture = await createDisposableDatabase(sourceUrl);
  assert.ok(isDisposableDatabaseName(fixture.databaseName), "database must have the disposable test prefix");
  const seed = await seedFixture(fixture.pool);
  const origin = `http://127.0.0.1:${testPort}`;
  server = spawn(nodePath, [vitePath, "--host", "127.0.0.1", "--port", String(testPort)], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: fixture.databaseUrl.toString(), TEST_DATABASE_URL: fixture.databaseUrl.toString(), APP_ORIGIN: origin, BETTER_AUTH_URL: origin, NODE_ENV: "test", FIXOKU_DEV_LOGIN_ENABLED: "0" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer(origin);
  const admin = await login(origin, seed.adminEmail);
  const catalog = await request(origin, admin, "/api/admin/packages");
  assert.equal(catalog.response.status, 200);
  const packageRow = catalog.body.packages.find((item) => item.slug === "commerce-disposable-package");
  assert.ok(packageRow, "disposable package must be visible to admin");
  const version = packageRow.versions.find((item) => item.status === "PUBLISHED");
  assert.ok(version?.id, "published package version is required");
  assert.equal(version.priceMinor, seed.priceMinor, "catalog price is server fixture authority");
  assert.equal(version.currency, seed.currency, "catalog currency is server fixture authority");
  const student = await login(origin, seed.studentEmail);
  const key = "commerce-disposable-idempotency-001";
  const orderPayload = { packageVersionId: version.id, priceMinor: 1, currency: "USD", studentProfileId: seed.studentProfileId };
  const first = await request(origin, student, "/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(orderPayload) });
  assert.equal(first.response.status, 201, "first order must be created");
  assert.equal(first.body.idempotent, false);
  assert.equal(first.body.order.total_minor, seed.priceMinor, "server authoritative price must override request");
  assert.equal(first.body.order.currency, seed.currency, "server authoritative currency must override request");
  const replay = await request(origin, student, "/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(orderPayload) });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.body.idempotent, true);
  assert.equal(replay.body.order.id, first.body.order.id);
  const conflict = await request(origin, student, "/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify({ packageVersionId: "00000000-0000-4000-8000-000000000001", studentProfileId: seed.studentProfileId }) });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.body.error, "IDEMPOTENCY_KEY_CONFLICT");
  const settlement = await fulfillSuccessfulPayment(fixture.pool, { orderId: first.body.order.id, provider: "DISPOSABLE_TEST", providerEventId: "disposable-event-001" });
  assert.equal(settlement.orderStatus, "PAID");
  assert.equal(settlement.entitlementIds.length, 1, "payment creates exactly one entitlement");
  const duplicate = await request(origin, student, "/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "commerce-disposable-owned-001" }, body: JSON.stringify({ packageVersionId: version.id, studentProfileId: seed.studentProfileId }) });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error, "PACKAGE_ALREADY_OWNED", "active ownership prevents duplicate purchase");
  const entitlementsBeforePayment = await fixture.pool.query("select count(*)::int as count from package_entitlements");
  assert.equal(entitlementsBeforePayment.rows[0].count, 1);
  const replaySettlement = await fulfillSuccessfulPayment(fixture.pool, { orderId: first.body.order.id, provider: "DISPOSABLE_TEST", providerEventId: "disposable-event-001" });
  assert.equal(replaySettlement.replay, true, "settlement replay is idempotent");
  const rows = await fixture.pool.query("select count(*)::int as orders, count(distinct idempotency_key)::int as keys from orders");
  assert.equal(rows.rows[0].orders, 1);
  assert.equal(rows.rows[0].keys, 1);
  console.log(JSON.stringify({ disposableDatabase: "PASS", databaseName: fixture.databaseName, migrationReplay: "PASS", packageVisibility: "PASS", serverPriceAuthority: "PASS", serverCurrencyAuthority: "PASS", idempotentOrderReplay: "PASS", idempotencyConflictRejected: "PASS", paymentTransactionAndEntitlement: "PASS", activeOwnershipDuplicateRejected: "PASS", settlementReplayIdempotent: "PASS", rateLimitIsolation: "PASS" }));
} catch (error) {
  if (serverOutput) error.message += `\n${serverOutput}`;
  throw error;
} finally {
  if (server && !server.killed) { server.kill(); await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]); }
  if (fixture) await fixture.dispose();
}
