import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const previous = Object.fromEntries(["DATABASE_URL", "TEST_DATABASE_URL", "APP_ORIGIN", "BETTER_AUTH_URL", "NODE_ENV", "LOCAL_REVIEW_MODE", "EMAIL_PROVIDER"].map((key) => [key, process.env[key]]));
const pools = new Set();
const originalConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function (...args) { pools.add(this); return originalConnect.apply(this, args); };
const origin = `http://127.0.0.1:${5260 + Math.floor(Math.random() * 40)}`;
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();
process.env.APP_ORIGIN = origin;
process.env.BETTER_AUTH_URL = origin;
process.env.NODE_ENV = "test";
process.env.LOCAL_REVIEW_MODE = "1";
process.env.EMAIL_PROVIDER = "DISABLED";

const password = "Release011F-Disposable-Password!";
const server = { process: null, output: "" };
const vitePath = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

async function createAccount(pool, { email, name, role, scopeType, scopeId = null }) {
  const { auth } = await import("../src/server/auth/auth.js");
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  assert.ok(result?.user?.id, `auth account created for ${email}`);
  await pool.query('update "user" set email_verified=true where id=$1', [result.user.id]);
  const platform = (await pool.query("update platform_users set email=$1,display_name=$2,email_verified=true where auth_user_id=$3 returning id", [email, name, result.user.id])).rows[0];
  assert.ok(platform?.id, `platform account created for ${email}`);
  const membershipScopeId = scopeId ?? (["STUDENT", "TRAINER"].includes(role) ? platform.id : null);
  await pool.query("delete from platform_memberships where user_id=$1", [platform.id]);
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [platform.id, scopeType, membershipScopeId, role]);
  return platform.id;
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try { const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(2_000) }); if (response.status < 500) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`LOCAL_SERVER_START_TIMEOUT:${server.output.slice(-1000)}`);
}

async function request(cookie, requestPath, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  headers.set("connection", "close");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${origin}${requestPath}`, { ...options, headers });
  return { response, body: await response.json().catch(() => ({})) };
}

async function login(email) {
  const result = await request("", "/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(result.response.status, 200, `login failed: ${email}`);
  const cookie = result.response.headers.get("set-cookie");
  assert.ok(cookie, `session cookie missing: ${email}`);
  return cookie.split(";", 1)[0];
}

try {
  const pool = disposable.pool;
  const ownerId = await createAccount(pool, { email: "release011f-owner@example.invalid", name: "RELEASE011F Owner", role: "OWNER", scopeType: "GLOBAL" });
  const studentId = await createAccount(pool, { email: "release011f-student@example.invalid", name: "RELEASE011F Student", role: "STUDENT", scopeType: "STUDENT" });
  const trainerId = await createAccount(pool, { email: "release011f-trainer@example.invalid", name: "RELEASE011F Trainer", role: "TRAINER", scopeType: "TRAINER" });
  const profile = (await pool.query("update student_profiles set first_name='RELEASE011F',last_name='Student',education_stage='MIDDLE',grade='6',status='ACTIVE' where user_id=$1 returning id", [studentId])).rows[0];
  const program = (await pool.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,'RELEASE011F Birebir Program','Disposable student transfer program','STUDENT','PUBLISHED','1') returning id", [`release011f-program-${crypto.randomUUID()}`])).rows[0];
  const product = (await pool.query("insert into physical_products(sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,currency) values($1,'RELEASE011F Eğitim Hizmeti','Disposable service','SERVICE',true,100000,0,'TRY') returning id", [`RELEASE011F-${crypto.randomUUID()}`])).rows[0];
  const pkg = (await pool.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','MIDDLE','[6]',1,'PUBLISHED',false,true,true,'FREE',0) returning id", [`release011f-package-${crypto.randomUUID()}`])).rows[0];
  const version = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'RELEASE011F Öğrenci Paketi','Disposable package','Disposable package','[]',100000,'TRY',true,'PUBLISHED',now()) returning id", [pkg.id])).rows[0];
  await pool.query("insert into package_components(package_version_id,component_type,reference_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,'RELEASE011F Eğitim Hizmeti','RELEASE011F Eğitim Hizmeti',true,1,0,'{}')", [version.id, product.id]);
  await pool.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [version.id, program.id]);
  await pool.query("insert into student_cart_items(buyer_user_id,beneficiary_student_profile_id,package_version_id,quantity) values($1,$2,$3,1)", [studentId, profile.id, version.id]);

  server.process = spawn(process.execPath, [vitePath, "--host", "127.0.0.1", "--port", origin.split(":").at(-1)], { cwd: process.cwd(), env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.process.stdout.on("data", (chunk) => { server.output += chunk.toString(); });
  server.process.stderr.on("data", (chunk) => { server.output += chunk.toString(); });
  await waitForServer();

  const studentCookie = await login("release011f-student@example.invalid");
  const ownerCookie = await login("release011f-owner@example.invalid");
  const trainerCookie = await login("release011f-trainer@example.invalid");
  const orderRequest = await request(studentCookie, "/api/student/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "release011f-bank-order" }, body: JSON.stringify({ studentProfileId: profile.id, paymentMethod: "BANK_TRANSFER", billing: { type: "INDIVIDUAL", firstName: "RELEASE011F", lastName: "Student", sameAsShipping: false } }) });
  assert.equal(orderRequest.response.status, 201, JSON.stringify(orderRequest.body));
  const orderId = orderRequest.body.order.id;
  assert.equal(orderRequest.body.order.status, "PENDING_PAYMENT");
  assert.equal((await pool.query("select count(*)::int as count from package_entitlements where source_order_id=$1", [orderId])).rows[0].count, 0);
  assert.equal((await pool.query("select count(*)::int as count from trainer_assignment_requests tar join enrollments e on e.id=tar.enrollment_id where e.student_user_id=$1", [studentId])).rows[0].count, 0);

  const queue = await request(ownerCookie, "/api/admin/student-bank-transfers");
  assert.equal(queue.response.status, 200);
  assert.ok(queue.body.transfers.some((row) => row.orderId === orderId));
  const wrongStudentApproval = await request(studentCookie, "/api/admin/student-bank-transfers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, action: "APPROVE" }) });
  assert.equal(wrongStudentApproval.response.status, 403);
  const wrongTrainerApproval = await request(trainerCookie, "/api/admin/student-bank-transfers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, action: "APPROVE" }) });
  assert.equal(wrongTrainerApproval.response.status, 403);
  const ownerApproval = await request(ownerCookie, "/api/admin/student-bank-transfers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, action: "APPROVE" }) });
  assert.equal(ownerApproval.response.status, 200, JSON.stringify(ownerApproval.body));
  assert.equal(ownerApproval.body.orderStatus, "PAID");
  assert.equal((await pool.query("select status from orders where id=$1", [orderId])).rows[0].status, "PAID");
  assert.equal(Number((await pool.query("select count(*) from package_entitlements where source_order_id=$1", [orderId])).rows[0].count), 1);
  const enrollmentCount = Number((await pool.query("select count(*) from enrollments where student_user_id=$1 and training_program_id=$2", [studentId, program.id])).rows[0].count);
  assert.equal(enrollmentCount, 1, JSON.stringify({ enrollmentCount, item: (await pool.query("select delivery_mode_snapshot,entitlement_definitions_snapshot from order_items where order_id=$1", [orderId])).rows[0], approval: ownerApproval.body }));
  assert.equal(Number((await pool.query("select count(*) from trainer_assignment_requests tar join enrollments e on e.id=tar.enrollment_id where e.student_user_id=$1 and tar.status='PENDING'", [studentId])).rows[0].count), 1);
  assert.equal(Number((await pool.query("select count(*) from trainer_assignments ta join enrollments e on e.id=ta.enrollment_id where e.student_user_id=$1 and ta.status='ACTIVE'", [studentId])).rows[0].count), 0);
  const duplicateApproval = await request(ownerCookie, "/api/admin/student-bank-transfers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, action: "APPROVE" }) });
  assert.equal(duplicateApproval.response.status, 200);
  assert.equal(duplicateApproval.body.duplicateApproval, true);
  assert.equal(Number((await pool.query("select count(*) from package_entitlements where source_order_id=$1", [orderId])).rows[0].count), 1);
  assert.equal(Number((await pool.query("select count(*) from payment_transactions pt join payment_intents pi on pi.id=pt.payment_intent_id where pi.order_id=$1 and pt.transaction_type='SETTLEMENT'", [orderId])).rows[0].count), 1);

  const rejectOrder = (await pool.query("insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,status,payment_method,currency,subtotal_minor,total_minor,catalog_scope_snapshot,idempotency_key,request_hash) values($1,$2,$3,'PENDING_PAYMENT','BANK_TRANSFER','TRY',100000,100000,'STUDENT_COMMERCE','release011f-reject','release011f-reject-hash') returning id", [studentId, studentId, profile.id])).rows[0].id;
  await pool.query("insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot) values($1,$2,$3,'RELEASE011F Öğrenci Paketi','Disposable',1,'TRAINER_LED',100000,100000,'TRY',1,$4)", [rejectOrder, pkg.id, version.id, JSON.stringify([{ trainingProgramId: program.id, deliveryMode: "TRAINER_LED" }])]);
  await pool.query("insert into payment_intents(order_id,status,provider,amount_minor,currency,idempotency_key) values($1,'CREATED',null,100000,'TRY',$2)", [rejectOrder, `PAYMENT_INTENT:${rejectOrder}`]);
  const rejection = await request(ownerCookie, "/api/admin/student-bank-transfers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: rejectOrder, action: "REJECT", note: "Disposable test rejection" }) });
  assert.equal(rejection.response.status, 200);
  assert.equal((await pool.query("select status from orders where id=$1", [rejectOrder])).rows[0].status, "CANCELLED");
  assert.equal(Number((await pool.query("select count(*) from package_entitlements where source_order_id=$1", [rejectOrder])).rows[0].count), 0);

  const trainerRegression = await request(ownerCookie, "/api/admin/trainer-bank-transfers");
  assert.equal(trainerRegression.response.status, 200);
  console.log(JSON.stringify({ STUDENT_BANK_ORDER: "PASS", OWNER_PAYMENT_QUEUE: "PASS", OWNER_APPROVAL: "PASS", OWNER_REJECTION: "PASS", FULFILLMENT: "PASS", STUDENT_ASSIGNMENT_ELIGIBILITY: "PASS", DUPLICATE_APPROVAL: "PASS", UNAUTHORIZED_APPROVAL: "PASS", OWNER_UI: "API_CONNECTED", TRAINER_BANK_REGRESSION: "PASS", TEST_DATABASE_CLEANUP: "DISPOSABLE_ONLY" }));
} finally {
  if (server.process && !server.process.killed) { server.process.kill(); await once(server.process, "exit").catch(() => {}); }
  pg.Pool.prototype.connect = originalConnect;
  for (const pool of pools) if (pool !== disposable.pool && !pool.ended && !pool.ending) await pool.end();
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await disposable.dispose();
}
