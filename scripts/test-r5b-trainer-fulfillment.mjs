import assert from "node:assert/strict";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { fulfillTrainerOrder } from "../src/server/domain/trainer-commerce.js";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const pool = disposable.pool;
async function fixture({ stock, suffix }) {
  const user = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`r5b-${suffix}`, `r5b-${suffix}@local.test`, `R5B ${suffix}`])).rows[0];
  const product = (await pool.query("insert into physical_products(sku,title,description,product_type,is_active,on_hand,reserved,low_stock_threshold,cost_minor,currency) values($1,$2,'','PHYSICAL',true,$3,0,0,0,'TRY') returning id,sku,title", [`R5B-${suffix.toUpperCase()}-BOOK`, `R5B ${suffix} Kitabı`, stock])).rows[0];
  const pkg = (await pool.query("insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',true,true,false,'FREE',0) returning id", [`r5b-${suffix}-package`])).rows[0];
  const version = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,sku,invoice_product_name,unit,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,$2,$2,$2,'[]',$3,$2,'adet',2000,10000,12000,12000,'TRY',true,'PUBLISHED',now()) returning id", [pkg.id, `R5B ${suffix} Product`, `R5B-${suffix.toUpperCase()}-PACKAGE`])).rows[0];
  const component = (await pool.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'PHYSICAL_PRODUCT',$2,$2,$3,$4,true,2,0,'{}') returning id", [version.id, product.id, product.title, `${product.title} Özel Etiket`])).rows[0];
  const order = (await pool.query("insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,invoice_status,idempotency_key,request_hash) values($1,'PENDING_PAYMENT','PAYTR','TRY',12000,0,0,2000,12000,'{}','{}','PENDING',$2,$3) returning id,status", [user.id, `r5b-${suffix}`, `hash-${suffix}`])).rows[0];
  const orderItem = (await pool.query("insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,features_snapshot_json,sku_snapshot,invoice_product_name_snapshot,unit_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,discount_minor,line_total_minor,currency,quantity) values($1,$2,$3,$4,$4,'[]',$5,$4,'adet',2000,10000,12000,0,0,12000,'TRY',1) returning id", [order.id, pkg.id, version.id, `R5B ${suffix} Product`, `R5B-${suffix.toUpperCase()}-PACKAGE`])).rows[0];
  return { user, product, pkg, version, component, order, orderItem };
}

try {
  const happy = await fixture({ stock: 10, suffix: "happy" });
  const first = await fulfillTrainerOrder(pool, { orderId: happy.order.id, actorUserId: happy.user.id, provider: "TEST", providerReference: "r5b-happy" });
  assert.equal(first.replay, false);
  const physical = (await pool.query("select * from trainer_order_physical_items where trainer_package_order_item_id=$1", [happy.orderItem.id])).rows;
  assert.equal(physical.length, 1); assert.equal(physical[0].physical_product_id, happy.product.id); assert.equal(physical[0].sku_snapshot, happy.product.sku); assert.equal(physical[0].title_snapshot, happy.product.title); assert.equal(physical[0].display_label_snapshot, `${happy.product.title} Özel Etiket`); assert.equal(Number(physical[0].quantity), 2);
  const shipment = (await pool.query("select * from trainer_order_shipments where order_id=$1", [happy.order.id])).rows[0]; assert.ok(shipment);
  assert.equal((await pool.query("select count(*)::int count from trainer_order_shipment_items where trainer_order_shipment_id=$1", [shipment.id])).rows[0].count, 1);
  assert.equal((await pool.query("select reserved from physical_products where id=$1", [happy.product.id])).rows[0].reserved, 2);
  assert.equal((await pool.query("select count(*)::int count from inventory_movements where source_type='TRAINER_ORDER' and source_id=$1", [happy.order.id])).rows[0].count, 1);
  assert.equal((await pool.query("select count(*)::int count from orders where id=$1", [happy.order.id])).rows[0].count, 0);
  const replay = await fulfillTrainerOrder(pool, { orderId: happy.order.id, actorUserId: happy.user.id, provider: "TEST", providerReference: "r5b-replay" }); assert.equal(replay.replay, true);
  assert.equal((await pool.query("select count(*)::int count from trainer_order_physical_items where trainer_package_order_item_id=$1", [happy.orderItem.id])).rows[0].count, 1);
  assert.equal((await pool.query("select count(*)::int count from trainer_order_shipment_items where trainer_order_shipment_id=$1", [shipment.id])).rows[0].count, 1);
  assert.equal((await pool.query("select count(*)::int count from inventory_movements where source_type='TRAINER_ORDER' and source_id=$1", [happy.order.id])).rows[0].count, 1);
  assert.equal((await pool.query("select reserved from physical_products where id=$1", [happy.product.id])).rows[0].reserved, 2);

  const low = await fixture({ stock: 1, suffix: "low" });
  await assert.rejects(() => fulfillTrainerOrder(pool, { orderId: low.order.id, actorUserId: low.user.id, provider: "TEST", providerReference: "r5b-low" }), (error) => error?.code === "INSUFFICIENT_STOCK");
  assert.equal((await pool.query("select status from trainer_package_orders where id=$1", [low.order.id])).rows[0].status, "PENDING_PAYMENT");
  assert.equal((await pool.query("select count(*)::int count from trainer_order_physical_items where trainer_package_order_item_id=$1", [low.orderItem.id])).rows[0].count, 0);
  assert.equal((await pool.query("select count(*)::int count from trainer_order_shipments where order_id=$1", [low.order.id])).rows[0].count, 0);
  assert.equal((await pool.query("select count(*)::int count from inventory_movements where source_type='TRAINER_ORDER' and source_id=$1", [low.order.id])).rows[0].count, 0);
  assert.equal((await pool.query("select on_hand,reserved from physical_products where id=$1", [low.product.id])).rows[0].reserved, 0);
  console.log(JSON.stringify({ TRAINER_FULFILLMENT_HAPPY_PATH: "PASS", TRAINER_FULFILLMENT_REPLAY: "PASS", TRAINER_INSUFFICIENT_STOCK_ROLLBACK: "PASS", TRAINER_SHARED_INVENTORY: "PASS", TRAINER_SHIPMENT_ITEMS: "PASS", STUDENT_ORDERS_TABLE_MISUSED: "NO", disposableDatabase: "DESTROYED_AFTER_TEST" }));
} finally { await disposable.dispose(); }
