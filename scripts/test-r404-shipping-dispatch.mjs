import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { dispatchShipment, trackShipment, barcodeShipment, cancelShipment, reconcileShipment } from "../src/server/shipping/dispatch.js";
import { createMockShippingProvider } from "../src/server/shipping/mock.js";
import { shippingForBookCount } from "../src/server/domain/book-shipping.js";

const sourceUrl = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "");
const template = String(process.env.R404_SCHEMA_DATABASE || "");
if (!['127.0.0.1', 'localhost', '::1'].includes(sourceUrl.hostname.toLowerCase()) || Number(sourceUrl.port) !== 51880) throw new Error("R404_SHIPPING_LOCAL_DATABASE_GUARD_FAILED");
if (!/^r404_payment_schema_[0-9]{8}_[0-9]{6}$/u.test(template)) throw new Error("R404_SHIPPING_SCHEMA_GUARD_FAILED");
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const databaseName = `fixoku_test_r404_shipping_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`.toLowerCase();
const adminUrl = new URL(sourceUrl.toString()); adminUrl.pathname = "/postgres";
const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 2 });
let db; let created = false;
const id = () => crypto.randomUUID();
const sender = { name: "FIXOKU", address: "Test gönderici adresi 1", phone: "05361234567", cityId: 34, districtId: 34139 };

async function clientCall(pool, fn) { const client = await pool.connect(); try { return await fn(client); } finally { client.release(); } }

try {
  await admin.query(`create database ${quote(databaseName)} template ${quote(template)}`); created = true;
  const cloneUrl = new URL(sourceUrl.toString()); cloneUrl.pathname = `/${databaseName}`;
  db = new pg.Pool({ connectionString: cloneUrl.toString(), max: 32 }); db.on("error", () => {});
  const identity = (await db.query("select current_database() as database,inet_server_addr()::text as host,inet_server_port() as port")).rows[0];
  assert.equal(identity.database, databaseName); assert.equal(identity.port, 5432);
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_02_PAYTR_TOKEN_LEASES_AND_INTEGRITY.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_03_SHIPMENT_DISPATCH_IDEMPOTENCY.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r408/R408_02_BOOK_PARCEL_PROFILES.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r408/R408_03_SHIPMENT_MEASUREMENT.sql", import.meta.url), "utf8"));
  const tableCheck = (await db.query("select count(*)::int as n from information_schema.tables where table_schema='public' and table_name in ('shipment_dispatches','shipment_dispatch_attempts','shipment_status_events')")).rows[0].n;
  assert.equal(Number(tableCheck), 3);

  const student = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r404-shipping-student-${databaseName}`, `shipping-student-${databaseName}@example.invalid`, "R404 Öğrenci"])).rows[0].id;
  const trainer = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r404-shipping-trainer-${databaseName}`, `shipping-trainer-${databaseName}@example.invalid`, "R404 Eğitmen"])).rows[0].id;
  const product = (await db.query("insert into physical_products(sku,title,product_type,is_active,list_gross_minor,vat_rate_bps) values($1,'R404 Test Kitabı','PHYSICAL',true,55000,0) returning id", [`R404-SHIP-${databaseName}`])).rows[0].id;

  const studentOrder = (await db.query("insert into orders(buyer_user_id,beneficiary_student_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,idempotency_key,request_hash,shipping_address_snapshot_json) values($1,$1,'PAID','PAYTR','TRY',110000,10000,120000,'STUDENT_COMMERCE',$2,'r404-shipping','{\"firstName\":\"R404\",\"lastName\":\"Öğrenci\",\"phone\":\"05551234567\",\"addressLine\":\"Alıcı adresi 1\",\"cityId\":34,\"districtId\":34139}' ) returning id", [student, `R404-SHIP-STUDENT-${databaseName}`])).rows[0].id;
  const studentShipment = (await db.query("insert into shipments(order_id,beneficiary_student_user_id,address_snapshot_json,shipping_charge_minor,status,provider_enabled) values($1,$2,$3,10000,'PACKED',false) returning id", [studentOrder, student, JSON.stringify({ firstName: "R404", lastName: "Öğrenci", phone: "05551234567", addressLine: "Alıcı adresi 1", cityId: 34, districtId: 34139 })])).rows[0].id;
  await db.query("insert into shipment_items(shipment_id,physical_product_id,quantity,title_snapshot) values($1,$2,2,'R404 Test Kitabı')", [studentShipment, product]);

  const pkg = (await db.query("insert into packages(slug,audience,status,catalog_scope,eligible_grades_json,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','PUBLISHED','TRAINER_COMMERCE','[]',true,true,false,'FREE',0) returning id", [`r404-shipping-pkg-${databaseName}`])).rows[0].id;
  const version = (await db.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status,published_at,vat_rate_bps,price_net_minor,price_gross_minor,purchase_enabled) values($1,1,'R404 Eğitmen Paketi','Yerel',100000,'TRY','PUBLISHED',now(),2000,83333,100000,true) returning id", [pkg])).rows[0].id;
  const trainerOrder = (await db.query("insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,'PAID','BANK_TRANSFER','TRY',100000,0,0,20000,100000,$2,'{}',$3,'r404-shipping') returning id", [trainer, JSON.stringify({ firstName: "R404", lastName: "Eğitmen", phone: "05559876543", addressLine: "Eğitmen adresi 1", cityId: 34, districtId: 34139 }), `R404-SHIP-TRAINER-${databaseName}`])).rows[0].id;
  const orderItem = (await db.query("insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,sku_snapshot,invoice_product_name_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,line_total_minor,currency) values($1,$2,$3,'R404 Eğitmen Paketi','Yerel','R404-TRAINER','R404 Eğitmen Paketi',2000,83333,100000,0,100000,'TRY') returning id", [trainerOrder, pkg, version])).rows[0].id;
  const component = (await db.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,is_active,quantity,display_order,metadata_json) values($1,'PHYSICAL_PRODUCT',$2,$2,'R404 Test Kitabı',true,1,0,'{}') returning id", [version, product])).rows[0].id;
  const physicalItem = (await db.query("insert into trainer_order_physical_items(trainer_package_order_item_id,package_component_id,physical_product_id,quantity,title_snapshot,sku_snapshot,display_label_snapshot) values($1,$2,$3,1,'R404 Test Kitabı','R404-SHIP','R404 Test Kitabı') returning id", [orderItem, component, product])).rows[0].id;
  const trainerShipment = (await db.query("insert into trainer_order_shipments(order_id,trainer_user_id,address_snapshot_json,shipping_charge_minor,status,provider_enabled) values($1,$2,$3,0,'PACKED',false) returning id", [trainerOrder, trainer, JSON.stringify({ firstName: "R404", lastName: "Eğitmen", phone: "05559876543", addressLine: "Eğitmen adresi 1", cityId: 34, districtId: 34139 })])).rows[0].id;
  await db.query("insert into trainer_order_shipment_items(trainer_order_shipment_id,trainer_order_physical_item_id,physical_product_id,quantity,title_snapshot,sku_snapshot,display_label_snapshot) values($1,$2,$3,1,'R404 Test Kitabı','R404-SHIP','R404 Test Kitabı')", [trainerShipment, physicalItem, product]);

  const mock = createMockShippingProvider();
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => clientCall(db, client => dispatchShipment(client, { shipmentKind: "STUDENT", shipmentId: studentShipment, provider: mock, packageCount: 1, sender }))));
  assert.equal(mock.calls.create, 1); assert.equal(new Set(concurrent.map(result => result.dispatch.id)).size, 1);
  const dispatchRow = (await db.query("select * from shipment_dispatches where shipment_id=$1", [studentShipment])).rows[0];
  assert.equal(dispatchRow.dispatch_status, "CREATED"); assert.equal(Number(dispatchRow.package_count), 1);
  assert.equal(Number((await db.query("select count(*)::int as n from shipment_dispatch_attempts where dispatch_id=$1 and operation='CREATE'", [dispatchRow.id])).rows[0].n), 1);
  const tracked = await clientCall(db, client => trackShipment(client, { dispatchId: dispatchRow.id, provider: mock })); assert.equal(tracked.dispatch.dispatch_status, "CREATED");
  const trackedReplay = await clientCall(db, client => trackShipment(client, { dispatchId: dispatchRow.id, provider: mock })); assert.equal(trackedReplay.providerCall, false);
  assert.equal(mock.calls.track, 1);
  const labeled = await clientCall(db, client => barcodeShipment(client, { dispatchId: dispatchRow.id, provider: mock })); assert.ok(labeled.dispatch.barcode_payload);
  const labelReplay = await clientCall(db, client => barcodeShipment(client, { dispatchId: dispatchRow.id, provider: mock })); assert.equal(labelReplay.providerCall, false); assert.equal(mock.calls.barcode, 1);
  const cancelled = await clientCall(db, client => cancelShipment(client, { dispatchId: dispatchRow.id, provider: mock })); assert.equal(cancelled.dispatch.dispatch_status, "CANCELLED");
  const cancelReplay = await clientCall(db, client => cancelShipment(client, { dispatchId: dispatchRow.id, provider: mock })); assert.equal(cancelReplay.providerCall, false); assert.equal(cancelReplay.refund, "SEPARATE_OPERATION");

  const invalidCount = await clientCall(db, async client => { try { await dispatchShipment(client, { shipmentKind: "TRAINER", shipmentId: trainerShipment, provider: mock, packageCount: 0, sender }); return false; } catch (error) { return error.code === "VERIFIED_PACKAGE_COUNT_REQUIRED"; } });
  assert.equal(invalidCount, true);
  const trainerResult = await clientCall(db, client => dispatchShipment(client, { shipmentKind: "TRAINER", shipmentId: trainerShipment, provider: mock, packageCount: 2, sender }));
  assert.equal(trainerResult.dispatch.dispatch_status, "CREATED"); assert.equal(Number(trainerResult.dispatch.package_count), 2);
  assert.equal(Number((await db.query("select count(*)::int as n from shipment_dispatches where trainer_order_shipment_id=$1", [trainerShipment])).rows[0].n), 1);

  const unpaidOrder = (await db.query("insert into orders(buyer_user_id,beneficiary_student_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,idempotency_key,request_hash) values($1,$1,'PENDING_PAYMENT','PAYTR','TRY',55000,10000,65000,'STUDENT_COMMERCE',$2,'r404') returning id", [student, `R404-SHIP-UNPAID-${databaseName}`])).rows[0].id;
  const unpaidShipment = (await db.query("insert into shipments(order_id,beneficiary_student_user_id,address_snapshot_json,shipping_charge_minor,status) values($1,$2,$3,10000,'PACKED') returning id", [unpaidOrder, student, JSON.stringify({ firstName: "R404", lastName: "Öğrenci", phone: "05551234567", addressLine: "Alıcı adresi 1", cityId: 34, districtId: 34139 })])).rows[0].id;
  await db.query("insert into shipment_items(shipment_id,physical_product_id,quantity,title_snapshot) values($1,$2,1,'R404 Test Kitabı')", [unpaidShipment, product]);
  await assert.rejects(() => clientCall(db, client => dispatchShipment(client, { shipmentKind: "STUDENT", shipmentId: unpaidShipment, provider: mock, packageCount: 1, sender })), { code: "PAYMENT_NOT_SETTLED" });
  const timeoutBehavior = { createError: "KG_PROVIDER_TIMEOUT" }; const timeoutMock = createMockShippingProvider({ behavior: timeoutBehavior });
  const timeoutResult = await clientCall(db, client => dispatchShipment(client, { shipmentKind: "STUDENT", shipmentId: unpaidShipment, provider: timeoutMock, packageCount: 1, sender }).catch(error => error));
  assert.equal(timeoutResult.code, "PAYMENT_NOT_SETTLED");
  assert.equal(shippingForBookCount(1), 10000); assert.equal(shippingForBookCount(2), 15000); assert.equal(shippingForBookCount(3), 0);

  console.log(JSON.stringify({
    CONTAINER_SCOPE: "R404_PAYMENT_ACCEPTANCE", DATABASE_CLONE_ISOLATION: "PASS", R404_01_02_03_MIGRATIONS: "PASS",
    STUDENT_PHYSICAL_DISPATCH: "PASS", TRAINER_PHYSICAL_DISPATCH: "PASS", TWENTY_PARALLEL_DISPATCH_ONE_PROVIDER_CREATE: "PASS",
    MOCK_CREATE_CALLS: mock.calls.create, TRACKING_CALLS: mock.calls.track, BARCODE_CALLS: mock.calls.barcode, CANCEL_CALLS: mock.calls.cancel,
    TRACKING_CACHE_REPLAY: "PASS", BARCODE_REPLAY: "PASS", CANCEL_REPLAY: "PASS", REFUND_SEPARATE_FROM_CANCEL: "PASS",
    UNPAID_BLOCKED: "PASS", INVALID_PACKAGE_COUNT_BLOCKED: "PASS", SHIPPING_TARIFF_MATRIX: "PASS", REAL_PROVIDER_NETWORK: "NOT_USED",
  }));
} finally {
  if (db) await db.end();
  if (created) { await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [databaseName]); await admin.query(`drop database ${quote(databaseName)}`); }
  await admin.end();
}
