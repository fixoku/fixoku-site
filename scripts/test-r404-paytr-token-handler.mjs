import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import pg from "pg";
import { handlePaytrTokenRequest } from "../api/paytr/token.js";

const source = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "");
const template = String(process.env.R404_SCHEMA_DATABASE || "");
if (source.hostname !== "127.0.0.1" || source.port !== "51880" || !/^r404_payment_schema_/u.test(template)) throw new Error("R404_TOKEN_HANDLER_DB_GUARD_FAILED");
const adminUrl = new URL(source.toString()); adminUrl.pathname = "/postgres";
const name = `fixoku_test_r404_token_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool; let server; let created = false;

try {
  await admin.query(`create database ${quote(name)} template ${quote(template)}`); created = true;
  const clone = new URL(source.toString()); clone.pathname = `/${name}`;
  pool = new pg.Pool({ connectionString: clone.toString(), max: 20 }); pool.on("error", () => {});
  await pool.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql", import.meta.url), "utf8"));
  await pool.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_02_PAYTR_TOKEN_LEASES_AND_INTEGRITY.sql", import.meta.url), "utf8"));
  const buyer = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'Token Handler Buyer',true) returning id", [`r404-token-${name}`, `${name}@example.invalid`])).rows[0].id;
  const pkg = (await pool.query("insert into packages(slug,audience,status,catalog_scope,eligible_grades_json,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','PUBLISHED','STUDENT_COMMERCE','[]',false,true,false,'FREE',0) returning id", [`${name}-pkg`])).rows[0].id;
  const version = (await pool.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status,published_at,vat_rate_bps,price_net_minor,price_gross_minor,purchase_enabled) values($1,1,'Token Test','Local',100000,'TRY','PUBLISHED',now(),2000,83333,100000,true) returning id", [pkg])).rows[0].id;
  const order = (await pool.query("insert into orders(buyer_user_id,beneficiary_student_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,$1,'PENDING_PAYMENT','PAYTR','TRY',100000,0,100000,'STUDENT_COMMERCE','{}','{}',$2,'r404') returning id", [buyer, `${name}-order`])).rows[0].id;
  await pool.query("insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json) values($1,$2,$3,'Token Test','Local',1,'SELF_PACED',100000,100000,'TRY',1,'[]','[]')", [order, pkg, version]);
  await pool.query("insert into payment_intents(order_id,status,amount_minor,currency,idempotency_key) values($1,'CREATED',100000,'TRY',$2)", [order, `${name}-intent`]);

  process.env.NODE_ENV = "test"; process.env.VERCEL_ENV = ""; process.env.FIXOKU_LOCAL_PAYTR_TEST = "1"; process.env.DATABASE_URL = clone.toString(); process.env.PAYTR_ENABLED = "1"; process.env.PAYTR_TEST_MODE = "1"; process.env.PAYTR_MERCHANT_ID = "r404-handler"; process.env.PAYTR_MERCHANT_KEY = "r404-handler-key"; process.env.PAYTR_MERCHANT_SALT = "r404-handler-salt"; process.env.PAYTR_TOKEN_ENCRYPTION_KEY = Buffer.from("r404-token-encryption-key-32bytes!!").toString("base64");
  const principal = { user: { id: buyer, email: `${name}@example.invalid`, displayName: "Token Handler Buyer" }, memberships: [{ role: "STUDENT", scopeType: "STUDENT", scopeId: buyer, status: "ACTIVE" }] };
  let providerCalls = 0;
  const tokenRequester = async () => { providerCalls += 1; await new Promise((resolve) => setTimeout(resolve, 80)); return "synthetic-handler-token"; };
  server = http.createServer((req, res) => void handlePaytrTokenRequest(req, res, { principal, pool, tokenRequester }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); const url = `http://127.0.0.1:${address.port}/api/paytr/token`;
  const responses = await Promise.all(Array.from({ length: 20 }, () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order }) }).then(async (response) => ({ status: response.status, body: await response.json() }))));
  assert.equal(providerCalls, 1);
  assert.ok(responses.some((item) => item.status === 200));
  assert.ok(responses.every((item) => [200, 409].includes(item.status)));
  const reused = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order }) });
  assert.equal(reused.status, 200); assert.equal(providerCalls, 1); assert.equal((await reused.json()).reusedToken, true);
  const attempt = (await pool.query("select status,token_status,token_ciphertext,token_lease_id from paytr_payment_attempts where order_id=$1", [order])).rows[0];
  assert.equal(attempt.status, "TOKEN_READY"); assert.equal(attempt.token_status, "READY"); assert.ok(attempt.token_ciphertext); assert.equal(attempt.token_lease_id, null);
  console.log(JSON.stringify({ HTTP_HANDLER_CONCURRENCY: "PASS", PROVIDER_HTTP_CALL_COUNT: 1, TOKEN_REUSE_ENCRYPTED: "PASS", PARALLEL_REQUESTS: 20 }));
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) await pool.end();
  if (created) { await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [name]); await admin.query(`drop database ${quote(name)}`); }
  await admin.end();
}
