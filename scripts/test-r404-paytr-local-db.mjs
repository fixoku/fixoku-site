import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { Readable } from "node:stream";
import { ensurePaytrPaymentAttempt, claimPaytrTokenLease, persistPaytrToken, decryptPaytrToken } from "../src/server/payments/paytr.js";

const sourceUrl = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "");
const schemaDatabase = String(process.env.R404_SCHEMA_DATABASE || "");
if (!['127.0.0.1', 'localhost', '::1'].includes(sourceUrl.hostname.toLowerCase()) || Number(sourceUrl.port) !== 51880) throw new Error("R404_LOCAL_DATABASE_GUARD_FAILED");
if (!/^r404_payment_schema_[0-9]{8}_[0-9]{6}$/u.test(schemaDatabase)) throw new Error("R404_SCHEMA_DATABASE_GUARD_FAILED");

const adminUrl = new URL(sourceUrl.toString());
adminUrl.pathname = "/postgres";
const databaseName = `fixoku_test_r404_paytr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`.toLowerCase();
const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 2 });
let db;
let created = false;

function signed(merchantOid, amount, status = "success", extra = {}) {
  const total = String(amount);
  return { merchant_oid: merchantOid, status, total_amount: total, ...extra, hash: crypto.createHmac("sha256", process.env.PAYTR_MERCHANT_KEY).update(`${merchantOid}${process.env.PAYTR_MERCHANT_SALT}${status}${total}`).digest("base64") };
}

async function invoke(callback, payload) {
  const req = Readable.from([new URLSearchParams(payload).toString()]);
  req.method = "POST";
  const output = { status: 200, body: "" };
  await callback(req, { set statusCode(value) { output.status = value; }, setHeader() {}, end(value) { output.body = value; } });
  return output;
}

try {
  await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)} TEMPLATE ${quoteIdentifier(schemaDatabase)}`);
  created = true;
  const cloneUrl = new URL(sourceUrl.toString());
  cloneUrl.pathname = `/${databaseName}`;
  db = new pg.Pool({ connectionString: cloneUrl.toString(), max: 32 });
  db.on("error", () => {});
  const identity = (await db.query("select current_database() as database,inet_server_addr()::text as host,inet_server_port() as port")).rows[0];
  assert.equal(identity.database, databaseName);
  assert.equal(identity.port, 5432);
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_02_PAYTR_TOKEN_LEASES_AND_INTEGRITY.sql", import.meta.url), "utf8"));
  let nullGuardRejected = false;
  try { await db.query("insert into paytr_payment_attempts(order_kind,order_id,merchant_oid,amount_minor,currency,environment) values('STUDENT_ORDER',gen_random_uuid(),$1,1,'TRY','TEST')", [crypto.randomUUID().replaceAll('-', '')]); }
  catch (error) { nullGuardRejected = error?.code === "23514"; }
  assert.equal(nullGuardRejected, true);

  const trainer = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r404-${databaseName}`, `${databaseName}@example.invalid`, "R404 Sentetik Eğitmen"])).rows[0].id;
  const pkg = (await db.query("insert into packages(slug,audience,status,catalog_scope,eligible_grades_json,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','PUBLISHED','TRAINER_COMMERCE','[]',false,true,false,'FREE',0) returning id", [`r404-${databaseName}`])).rows[0].id;
  const version = (await db.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status,published_at,vat_rate_bps,price_net_minor,price_gross_minor,purchase_enabled) values($1,1,'R404 Sentetik Paket','Yerel test',100000,'TRY','PUBLISHED',now(),2000,83333,100000,true) returning id", [pkg])).rows[0].id;
  const order = (await db.query("insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,'PENDING_PAYMENT','PAYTR','TRY',100000,0,0,20000,100000,'{}','{}',$2,'r404') returning id", [trainer, `R404-${databaseName}`])).rows[0].id;
  await db.query("insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,sku_snapshot,invoice_product_name_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,line_total_minor,currency) values($1,$2,$3,'R404 Paket','Yerel','R404','R404 Paket',2000,83333,100000,0,100000,'TRY')", [order, pkg, version]);
  const student = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r404-student-${databaseName}`, `student-${databaseName}@example.invalid`, "R404 Sentetik Öğrenci"])).rows[0].id;
  const studentRecoveryUser = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r404-recovery-${databaseName}`, `recovery-${databaseName}@example.invalid`, "R404 Kurtarma Öğrencisi"])).rows[0].id;
  const studentConcurrentUser = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r404-concurrent-${databaseName}`, `concurrent-${databaseName}@example.invalid`, "R404 Eşzamanlı Öğrenci"])).rows[0].id;
  async function createStudentOrder(marker, beneficiary = student) {
    const studentOrder = (await db.query("insert into orders(buyer_user_id,beneficiary_student_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,idempotency_key,request_hash) values($1,$2,'PENDING_PAYMENT','PAYTR','TRY',100000,0,100000,'LEGACY_EDUCATION',$3,'r404') returning id", [beneficiary, beneficiary, marker])).rows[0].id;
    await db.query("insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json) values($1,$2,$3,'R404 Öğrenci','Yerel',1,'SELF_PACED',100000,100000,'TRY',1,'[]','[]')", [studentOrder, pkg, version]);
    await db.query("insert into payment_intents(order_id,status,amount_minor,currency,idempotency_key) values($1,'CREATED',100000,'TRY',$2)", [studentOrder, `R404-PI-${marker}`]);
    const attempt = (await db.query("insert into paytr_payment_attempts(order_kind,order_id,student_order_id,merchant_oid,amount_minor,currency,environment) values('STUDENT_ORDER',$1,$1,$2,100000,'TRY','TEST') returning merchant_oid", [studentOrder, crypto.randomUUID().replaceAll('-', '')])).rows[0].merchant_oid;
    return { orderId: studentOrder, merchantOid: attempt };
  }

  process.env.DATABASE_URL = cloneUrl.toString();
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "";
  process.env.FIXOKU_LOCAL_PAYTR_TEST = "1";
  process.env.PAYTR_ENABLED = "1";
  process.env.PAYTR_TEST_MODE = "1";
  process.env.PAYTR_MERCHANT_ID = "r404-local";
  process.env.PAYTR_MERCHANT_KEY = "r404-key";
  process.env.PAYTR_MERCHANT_SALT = "r404-salt";
  process.env.FIXOKU_PAYTR_STATUS_MOCK_JSON = JSON.stringify({ status: "success", payment_amount: "1000.00", payment_total: "1350.00", currency: "TRY", test_mode: "1", taksit: "3", odeme_tipi: "KART", transaction_id: "r404-provider-tx" });
  process.env.PAYTR_TOKEN_ENCRYPTION_KEY = Buffer.from("r404-token-encryption-key-32bytes!!").toString("base64");
  process.env.FIXOKU_LOCAL_PAYTR_DEBUG = "1";
  const { fromPaytrMerchantOid } = await import("../src/server/payments/paytr.js");
  const { default: callback } = await import("../api/paytr/callback.js");

  const concurrent = await Promise.all(Array.from({ length: 20 }, async () => {
    const client = await db.connect();
    try { await client.query("begin"); const row = await ensurePaytrPaymentAttempt(client, { orderKind: "TRAINER_PACKAGE_ORDER", orderId: order, amountMinor: 100000, currency: "TRY" }); await client.query("commit"); return row; }
    catch (error) { await client.query("rollback").catch(() => {}); throw error; }
    finally { client.release(); }
  }));
  assert.equal(new Set(concurrent.map((row) => row.id)).size, 1);
  assert.equal(new Set(concurrent.map((row) => row.merchant_oid)).size, 1);
  const merchantOid = concurrent[0].merchant_oid;
  assert.equal(fromPaytrMerchantOid(merchantOid).length, 36);

  const leaseClient = await db.connect();
  await leaseClient.query("begin");
  const lease = await claimPaytrTokenLease(leaseClient, { merchantOid });
  assert.equal(lease.claimed, true);
  await leaseClient.query("commit");
  leaseClient.release();
  const blockedClient = await db.connect();
  await blockedClient.query("begin");
  const blockedLease = await claimPaytrTokenLease(blockedClient, { merchantOid });
  assert.equal(blockedLease.claimed, false);
  await blockedClient.query("rollback");
  blockedClient.release();
  const persistClient = await db.connect();
  await persistClient.query("begin");
  await persistPaytrToken(persistClient, { merchantOid, leaseId: lease.leaseId, token: "synthetic-encrypted-token" });
  await persistClient.query("commit");
  persistClient.release();
  const encryptedRecord = (await db.query("select * from paytr_payment_attempts where merchant_oid=$1", [merchantOid])).rows[0];
  assert.equal(encryptedRecord.token_ciphertext.includes("synthetic-encrypted-token"), false);
  assert.equal(decryptPaytrToken(encryptedRecord), "synthetic-encrypted-token");
  let transitionRejected = false;
  try { await db.query("update paytr_payment_attempts set status='CREATED' where merchant_oid=$1", [merchantOid]); }
  catch (error) { transitionRejected = error?.code === "P0001"; }
  assert.equal(transitionRejected, true);

  process.env.PAYTR_ENABLED = "0";
  assert.equal((await invoke(callback, signed(merchantOid, 100000))).status, 503);
  process.env.PAYTR_ENABLED = "1";
  assert.equal((await invoke(callback, { ...signed(merchantOid, 100000), hash: "invalid" })).status, 401);
  assert.equal((await invoke(callback, signed(merchantOid, 100001))).status, 409);
  assert.equal((await invoke(callback, { ...signed(merchantOid, 100000), currency: "USD" })).status, 409);
  const successResponse = await invoke(callback, signed(merchantOid, 135000));
  if (successResponse.status !== 200) throw new Error(`SUCCESS_CALLBACK_${successResponse.status}_${successResponse.body}`);
  assert.equal((await db.query("select status from trainer_package_orders where id=$1", [order])).rows[0].status, "PAID");
  const replays = await Promise.all(Array.from({ length: 20 }, () => invoke(callback, signed(merchantOid, 135000))));
  assert.ok(replays.every((response) => response.status === 200));
  const attempt = (await db.query("select status,collected_amount_minor,installment_difference_minor,installment_count,review_required from paytr_payment_attempts where merchant_oid=$1", [merchantOid])).rows[0];
  assert.equal(attempt.status, "SUCCEEDED");
  assert.equal(Number(attempt.collected_amount_minor), 135000);
  assert.equal(Number(attempt.installment_difference_minor), 35000);
  assert.equal(Number(attempt.installment_count), 3);
  assert.equal(Number((await db.query("select count(*)::int as count from owner_finance_ledger where source_type='PAYTR_PAYMENT' and source_id=$1", [`paytr:${merchantOid}`])).rows[0].count), 1);

  const delayedFailure = await invoke(callback, signed(merchantOid, 135000, "failed"));
  assert.equal(delayedFailure.status, 200);
  const delayedState = (await db.query("select status,review_required from paytr_payment_attempts where merchant_oid=$1", [merchantOid])).rows[0];
  assert.equal(delayedState.status, "SUCCEEDED");
  assert.equal(delayedState.review_required, true);

  const studentSuccess = await createStudentOrder(`R404-STUDENT-SUCCESS-${databaseName}`);
  const studentSuccessResponse = await invoke(callback, signed(studentSuccess.merchantOid, 135000));
  if (studentSuccessResponse.status !== 200) throw new Error(`STUDENT_SUCCESS_${studentSuccessResponse.status}_${studentSuccessResponse.body}`);
  assert.equal((await db.query("select status from orders where id=$1", [studentSuccess.orderId])).rows[0].status, "PAID");
  const studentRecovery = await createStudentOrder(`R404-STUDENT-RECOVERY-${databaseName}`, studentRecoveryUser);
  assert.equal((await invoke(callback, signed(studentRecovery.merchantOid, 135000, "failed"))).status, 200);
  assert.equal((await db.query("select status from orders where id=$1", [studentRecovery.orderId])).rows[0].status, "PAYMENT_FAILED");
  const recoveryResponse = await invoke(callback, signed(studentRecovery.merchantOid, 135000));
  if (recoveryResponse.status !== 200) throw new Error(`RECOVERY_CALLBACK_${recoveryResponse.status}_${recoveryResponse.body}`);
  assert.equal((await db.query("select status from orders where id=$1", [studentRecovery.orderId])).rows[0].status, "PAID");
  const concurrentOrder = await createStudentOrder(`R404-STUDENT-CONCURRENT-${databaseName}`, studentConcurrentUser);
  const concurrentResponses = await Promise.all([invoke(callback, signed(concurrentOrder.merchantOid, 135000)), invoke(callback, signed(concurrentOrder.merchantOid, 135000, "failed"))]);
  assert.ok(concurrentResponses.every((response) => [200, 409, 503].includes(response.status)));
  if ((await db.query("select status from orders where id=$1", [concurrentOrder.orderId])).rows[0].status !== "PAID") { const retry = await invoke(callback, signed(concurrentOrder.merchantOid, 135000)); if (retry.status !== 200) throw new Error(`CONCURRENT_RECOVERY_${retry.status}_${retry.body}`); }
  assert.equal((await db.query("select status from orders where id=$1", [concurrentOrder.orderId])).rows[0].status, "PAID");
  const duplicateOid = crypto.randomUUID().replaceAll('-', '');
  await db.query("insert into paytr_payment_attempts(order_kind,order_id,trainer_order_id,merchant_oid,amount_minor,currency,environment) values('TRAINER_PACKAGE_ORDER',$1,$1,$2,100000,'TRY','TEST')", [order, duplicateOid]);
  assert.equal((await invoke(callback, signed(duplicateOid, 135000))).status, 409);

  console.log(JSON.stringify({
    CONTAINER_SCOPE: "R404_PAYMENT_ACCEPTANCE",
    DATABASE_CLONE_ISOLATION: "PASS",
    PAYMENT_ATTEMPT_SCHEMA_APPLIED: "PASS",
    TWENTY_CONCURRENT_TOKEN_ATTEMPTS_ONE_ATTEMPT: "PASS",
    TOKEN_LEASE_SINGLE_OWNER: "PASS",
    TOKEN_ENCRYPTED_AT_REST: "PASS",
    CALLBACK_DISABLED_REJECTED: "PASS",
    INVALID_SIGNATURE_REJECTED: "PASS",
    AMOUNT_MISMATCH_REJECTED: "PASS",
    CURRENCY_MISMATCH_REJECTED: "PASS",
    TRAINER_SUCCESS_CALLBACK: "PASS",
    STUDENT_SUCCESS_CALLBACK: "PASS",
    FAILED_TO_SUCCESS_RECOVERY: "PASS",
    CONCURRENT_SUCCESS_FAILED_CALLBACK: "PASS",
    DIFFERENT_ATTEMPT_DUPLICATE_REVIEW: "PASS",
    TWENTY_CALLBACK_REPLAYS_IDEMPOTENT: "PASS",
    INSTALLMENT_LEDGER_SEPARATION: "PASS",
    DELAYED_FAILED_CALLBACK_PRESERVES_ACCESS: "PASS",
    EXTERNAL_PAYTR_NETWORK: "NOT_USED",
  }));
} finally {
  if (db) await db.end();
  if (created) {
    await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [databaseName]);
    await admin.query(`drop database ${quoteIdentifier(databaseName)}`);
  }
  await admin.end();
}
