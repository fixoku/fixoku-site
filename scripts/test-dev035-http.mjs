import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "better-auth/crypto";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const password = process.env.TEST_SEED_PASSWORD || "DEV035-Disposable-Password!";
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
async function selectLoopbackPort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = probe.address();
  const port = address && typeof address === "object" ? address.port : null;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  assert.ok(Number.isInteger(port) && port > 0, "LOOPBACK_PORT_SELECTION_FAILED");
  return port;
}
const port = await selectLoopbackPort();
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const pool = disposable.pool;
const origin = `http://127.0.0.1:${port}`;
const vitePath = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
let server;
let serverOutput = "";

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`LOCAL_SERVER_EXITED:${server.exitCode}`);
    try {
      const response = await fetch(`${origin}/`, { redirect: "manual", signal: AbortSignal.timeout(2_000) });
      const location = response.headers.get("location");
      if (location) assert.equal(new URL(location, origin).origin, origin, "LOCAL_SERVER_EXTERNAL_REDIRECT");
      if (response.status < 500) return;
    } catch (error) {
      if (error?.code === "ERR_ASSERTION") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`LOCAL_SERVER_START_TIMEOUT:${serverOutput.slice(-1000)}`);
}

async function request(cookie, requestPath, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  headers.set("connection", "close");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${origin}${requestPath}`, { ...options, headers, redirect: "manual" });
  const location = response.headers.get("location");
  if (location) assert.equal(new URL(location, origin).origin, origin, "LOCAL_SERVER_EXTERNAL_REDIRECT");
  return { response, body: await response.json().catch(() => ({})) };
}

async function login(email) {
  const result = await request("", "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.response.status, 200, `login failed: ${email}`);
  const setCookie = result.response.headers.get("set-cookie");
  assert.ok(setCookie, `session cookie missing: ${email}`);
  return setCookie.split(";", 1)[0];
}

async function createAuthUser({ authId, email, name, role, scopeType, scopeId = null }) {
  const passwordHash = await hashPassword(password);
  await pool.query("insert into \"user\" (id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())", [authId, name, email]);
  await pool.query("insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now())", [`${authId}-credential`, authId, passwordHash]);
  const platform = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [authId, email, name])).rows[0];
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [platform.id, scopeType, scopeId ?? (role === "OWNER" ? null : platform.id), role]);
  return platform.id;
}

try {
  const ownerEmail = "dev035-owner@example.test";
  const qualifiedEmail = "dev035-qualified-trainer@example.test";
  const unqualifiedEmail = "dev035-unqualified-trainer@example.test";
  const studentEmail = "dev035-student@example.test";
  const ownerId = await createAuthUser({ authId: "dev035-owner-auth", email: ownerEmail, name: "DEV035 Owner", role: "OWNER", scopeType: "GLOBAL" });
  const qualifiedTrainerId = await createAuthUser({ authId: "dev035-qualified-trainer-auth", email: qualifiedEmail, name: "DEV035 Qualified Trainer", role: "TRAINER", scopeType: "TRAINER" });
  const unqualifiedTrainerId = await createAuthUser({ authId: "dev035-unqualified-trainer-auth", email: unqualifiedEmail, name: "DEV035 Unqualified Trainer", role: "TRAINER", scopeType: "TRAINER" });
  const studentId = await createAuthUser({ authId: "dev035-student-auth", email: studentEmail, name: "DEV035 Student", role: "STUDENT", scopeType: "STUDENT" });

  const program = (await pool.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,'DEV035 Birebir Program','Disposable integration program','STUDENT','PUBLISHED','1') returning id", [`dev035-program-${crypto.randomUUID()}`])).rows[0];
  const product = (await pool.query("insert into physical_products(sku,title,description,product_type,is_active,service_type,service_mode,min_students,max_students,currency) values($1,'DEV035 Birebir Hizmet','Disposable training service','SERVICE',true,'FAST_READING','INDIVIDUAL',1,1,'TRY') returning id", [`DEV035-${crypto.randomUUID()}`])).rows[0];
  const packageRow = (await pool.query("insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','LEGACY_EDUCATION','PUBLISHED',false,true,false,'FREE',0) returning id", [`dev035-package-${crypto.randomUUID()}`])).rows[0];
  const version = (await pool.query("insert into package_versions(package_id,version_number,title,description,features_json,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'DEV035 Birebir Paket','Disposable package','[]',120000,'TRY',true,'PUBLISHED',now()) returning id", [packageRow.id])).rows[0];
  await pool.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,null,'DEV035 Birebir Hizmet','DEV035 Birebir Hizmet',true,1,0,'{}')", [version.id, product.id]);
  await pool.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [version.id, program.id]);
  await pool.query("insert into trainer_qualifications(trainer_user_id,training_program_id,status,valid_from) values($1,$2,'ACTIVE',now())", [qualifiedTrainerId, program.id]);

  const studentProfile = (await pool.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'DEV035','Student','HIGH','9','ACTIVE') returning id", [studentId])).rows[0];
  const order = (await pool.query("insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,status,currency,subtotal_minor,total_minor,idempotency_key,request_hash) values($1,$2,$3,'PAID','TRY',120000,120000,$4,'dev035') returning id", [studentId, studentId, studentProfile.id, `dev035-order-${crypto.randomUUID()}`])).rows[0];
  const orderItem = (await pool.query("insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot) values($1,$2,$3,'DEV035 Birebir Paket','Disposable package',1,'TRAINER_LED',120000,120000,'TRY',1,$4) returning id", [order.id, packageRow.id, version.id, JSON.stringify([{ trainingProgramId: program.id, deliveryMode: "TRAINER_LED" }])])).rows[0];
  const entitlement = (await pool.query("insert into package_entitlements(beneficiary_student_user_id,beneficiary_student_profile_id,package_id,package_version_id,source_order_id,source_order_item_id,status,issuance_key) values($1,$2,$3,$4,$5,$6,'ACTIVE',$7) returning id", [studentId, studentProfile.id, packageRow.id, version.id, order.id, orderItem.id, `DEV035-ENTITLEMENT-${crypto.randomUUID()}`])).rows[0];
  const enrollment = (await pool.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') returning id", [studentId, program.id])).rows[0];
  await pool.query("insert into package_entitlement_enrollments(package_entitlement_id,enrollment_id,training_program_id,source_order_item_id) values($1,$2,$3,$4)", [entitlement.id, enrollment.id, program.id, orderItem.id]);
  const requestId = (await pool.query("insert into trainer_assignment_requests(enrollment_id,status) values($1,'PENDING') returning id", [enrollment.id])).rows[0].id;

  const amounts = [
    ["PENDING", 1100, "pending"],
    ["EARNED", 2200, "earned"],
    ["PAYABLE", 3300, "payable"],
    ["HELD", 4400, "held"],
    ["PAID", 5500, "paid"],
  ];
  for (const [status, amountMinor, key] of amounts) {
    await pool.query("insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at,payable_at,enrollment_id) values($1,'SESSION',$2,$3,'TRY',$4,'DEV035',$5,$6,now(),now(),$7)", [qualifiedTrainerId, status, amountMinor, `DEV035 ${status}`, key, `dev035-${key}-${crypto.randomUUID()}`, enrollment.id]);
  }

  server = spawn(process.execPath, [vitePath, "--mode", "test", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      USERPROFILE: process.env.USERPROFILE,
      DATABASE_URL: disposable.databaseUrl.toString(),
      TEST_DATABASE_URL: disposable.databaseUrl.toString(),
      BETTER_AUTH_SECRET: "R68B-DISPOSABLE-SYNTHETIC-SECRET-ONLY",
      APP_ORIGIN: origin,
      BETTER_AUTH_URL: origin,
      NODE_ENV: "test",
      LOCAL_REVIEW_MODE: "1",
      EMAIL_PROVIDER: "DISABLED",
      PAYTR_ENABLED: "0",
      SHIPPING_PROVIDER: "DISABLED",
      DIGITAL_STORAGE_PROVIDER: "LOCAL",
      PROFILE_MEDIA_PROVIDER: "LOCAL",
      FIXOKU_SKIP_LOCAL_ENV: "1",
      FIXOKU_DEV_LOGIN_ENABLED: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer();

  const ownerCookie = await login(ownerEmail);
  const qualifiedCookie = await login(qualifiedEmail);
  const unqualifiedCookie = await login(unqualifiedEmail);

  const assignmentList = await request(ownerCookie, "/api/admin/assignment-requests");
  assert.equal(assignmentList.response.status, 200);
  assert.ok(assignmentList.body.requests.some((row) => row.id === requestId));
  const assignment = await request(ownerCookie, `/api/admin/assignment-requests/${requestId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: qualifiedTrainerId }) });
  assert.equal(assignment.response.status, 200);
  const duplicate = await request(ownerCookie, `/api/admin/assignment-requests/${requestId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: qualifiedTrainerId }) });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error, "ALREADY_ASSIGNED");

  const secondStudent = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'DEV035 Student 2',true) returning id", ["dev035-student-2-auth", "dev035-student-2@example.test"])).rows[0].id;
  await pool.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'DEV035','Student2','HIGH','9','ACTIVE')", [secondStudent]);
  const secondEnrollment = (await pool.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') returning id", [secondStudent, program.id])).rows[0].id;
  const secondRequest = (await pool.query("insert into trainer_assignment_requests(enrollment_id,status) values($1,'PENDING') returning id", [secondEnrollment])).rows[0].id;
  const unauthorizedAssignment = await request(ownerCookie, `/api/admin/assignment-requests/${secondRequest}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: unqualifiedTrainerId }) });
  assert.equal(unauthorizedAssignment.response.status, 403);
  assert.equal(unauthorizedAssignment.body.error, "TRAINER_NOT_ELIGIBLE");

  const earnings = await request(qualifiedCookie, "/api/trainer/earnings");
  assert.equal(earnings.response.status, 200);
  assert.deepEqual(new Set(earnings.body.entries.map((entry) => entry.status)), new Set(["PENDING", "EARNED", "PAYABLE", "HELD", "PAID"]));
  assert.equal(earnings.body.summary.heldMinor, 4400);
  const otherEarnings = await request(unqualifiedCookie, "/api/trainer/earnings");
  assert.equal(otherEarnings.response.status, 200);
  assert.equal(otherEarnings.body.entries.length, 0);
  const trainerPayoutRead = await request(qualifiedCookie, "/api/admin/payouts");
  assert.equal(trainerPayoutRead.response.status, 403);

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);
  const payoutPayload = { trainerUserId: qualifiedTrainerId, amountMinor: 5500, currency: "TRY", periodStart, periodEnd, paymentDate: periodEnd, bankReference: "DEV035-HTTP-001" };
  const payoutBody = JSON.stringify(payoutPayload);
  const payout = await request(ownerCookie, "/api/admin/payouts", { method: "POST", headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(payoutBody)) }, body: payoutBody });
  assert.equal(payout.response.status, 201);
  assert.equal(payout.body.status, "PAID");
  const payoutReplay = await request(ownerCookie, "/api/admin/payouts", { method: "POST", headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(payoutBody)) }, body: payoutBody });
  assert.equal(payoutReplay.response.status, 409, JSON.stringify(payoutReplay.body));
  assert.equal(payoutReplay.body.error, "PAYOUT_AMOUNT_EXCEEDS_DUE");
  const payoutRead = await request(ownerCookie, `/api/admin/payouts?trainerUserId=${qualifiedTrainerId}`);
  assert.equal(payoutRead.response.status, 200);
  assert.equal(payoutRead.body.ownerOnly, true);

  console.log(JSON.stringify({
    AUTHENTICATED_LOGIN: "PASS",
    INDIVIDUAL_ASSIGNMENT_HTTP: "PASS",
    EXPERTISE_AUTHORIZATION: "PASS",
    DUPLICATE_ASSIGNMENT_REJECTED: "PASS",
    TRAINER_EARNINGS_HTTP: "PASS",
    EARNINGS_STATUS_MATRIX: "PASS",
    TRAINER_FINANCE_SCOPE_REJECTED: "PASS",
    OWNER_PAYOUT_HTTP: "PASS",
    PAYOUT_IDEMPOTENCY: "PASS",
    DATABASE_ISOLATION: "DISPOSABLE_ONLY",
  }));
} catch (error) {
  if (serverOutput) error.message += `\n${serverOutput}`;
  throw error;
} finally {
  if (server && !server.killed) { server.kill(); await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]); }
  await disposable.dispose();
}
