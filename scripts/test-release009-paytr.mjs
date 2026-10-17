import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import callback from "../api/paytr/callback.js";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
const previous = Object.fromEntries(["DATABASE_URL", "PAYTR_ENABLED", "PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"].map((key) => [key, process.env[key]]));
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.PAYTR_ENABLED = "1";
process.env.PAYTR_MERCHANT_ID = "disposable-test-only";
process.env.PAYTR_MERCHANT_KEY = "disposable-key";
process.env.PAYTR_MERCHANT_SALT = "disposable-salt";
function signed(orderId, amount, status = "success") {
  return { merchant_oid: orderId, status, total_amount: String(amount), hash: crypto.createHmac("sha256", process.env.PAYTR_MERCHANT_KEY).update(`${orderId}${process.env.PAYTR_MERCHANT_SALT}${status}${amount}`).digest("base64") };
}
async function invoke(payload) {
  const req = Readable.from([new URLSearchParams(payload).toString()]); req.method = "POST";
  const output = { status: 200, body: "" };
  await callback(req, { set statusCode(value) { output.status = value; }, setHeader() {}, end(value) { output.body = value; } });
  return output;
}
try {
  const pool = disposable.pool;
  const trainer = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('release009-paytr-trainer','paytr-trainer@example.invalid','Sentetik Eğitmen',true) returning id")).rows[0].id;
  const pkg = (await pool.query("select p.id as package_id,pv.id as version_id from packages p join package_versions pv on pv.package_id=p.id where p.slug='ilkokul-akici-hizli-okuma-egitimi' order by pv.version_number desc limit 1")).rows[0];
  await pool.query("update physical_products set on_hand=100 where id in (select physical_product_id from package_components where package_version_id=$1 and component_type='PHYSICAL_PRODUCT')", [pkg.version_id]);
  const order = (await pool.query("insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,'PENDING_PAYMENT','PAYTR','TRY',100000,0,0,0,100000,'{}','{}','RELEASE009_PAYTR','synthetic') returning id", [trainer])).rows[0].id;
  await pool.query("insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,sku_snapshot,invoice_product_name_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,line_total_minor,currency) values($1,$2,$3,'Sentetik','Sentetik','RELEASE009','Sentetik',0,100000,100000,0,100000,'TRY')", [order, pkg.package_id, pkg.version_id]);
  process.env.PAYTR_ENABLED = "0";
  assert.equal((await invoke(signed(order, 100000))).status, 503, "disabled callback fail closed");
  process.env.PAYTR_ENABLED = "1";
  assert.equal((await invoke({ ...signed(order, 100000), hash: "invalid" })).status, 401);
  assert.equal((await invoke(signed(order, 100001))).status, 409, "amount mismatch");
  const paid = await invoke(signed(order, 100000));
  assert.equal(paid.status, 200, "trainer callback settlement");
  assert.equal(paid.body, "OK");
  assert.equal((await invoke(signed(order, 100000))).status, 200, "callback replay");
  assert.equal((await pool.query("select status from trainer_package_orders where id=$1", [order])).rows[0].status, "PAID");
  assert.equal(Number((await pool.query("select count(*) as count from trainer_package_entitlements where source_order_id=$1", [order])).rows[0].count), 1);
  assert.equal(Number((await pool.query("select count(*) as count from r6_trainer_qualification_grants where source_order_id=$1", [order])).rows[0].count), 1);
  console.log(JSON.stringify({ CALLBACK_DISABLED_REJECTED: "PASS", INVALID_SIGNATURE_REJECTED: "PASS", AMOUNT_MISMATCH_REJECTED: "PASS", TRAINER_CALLBACK_TRANSACTION: "PASS", CALLBACK_REPLAY: "PASS", ENTITLEMENT_EXPERTISE: "PASS", PAYTR_NETWORK_CALLS: 0, DATABASE_ISOLATION: "DISPOSABLE_ONLY" }));
} finally {
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await disposable.dispose();
}
