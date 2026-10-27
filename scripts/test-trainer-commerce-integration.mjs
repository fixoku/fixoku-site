import assert from "node:assert/strict";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { fulfillTrainerOrder } from "../src/server/domain/trainer-commerce.js";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL, {
  migrationsFolder: path.join(process.cwd(), "drizzle", "migrations"),
});
const pool = disposable.pool;

async function seedTrainer() {
  return (await pool.query(
    "insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id",
    ["trainer-commerce-integration-auth", "trainer-commerce-integration@example.test", "Trainer Commerce Integration"],
  )).rows[0].id;
}

async function seedPackage(trainerUserId, { slug, title }) {
  const pkg = (await pool.query("select id from packages where slug=$1", [slug])).rows[0]
    || (await pool.query(
      "insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) returning id",
      [slug],
    )).rows[0];
  const nextVersion = Number((await pool.query("select coalesce(max(version_number),0)+1 as next from package_versions where package_id=$1", [pkg.id])).rows[0].next);
  const version = (await pool.query(
    "insert into package_versions(package_id,version_number,title,description,features_json,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,$2,$3,$3,'[]',100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id",
    [pkg.id, nextVersion, title],
  )).rows[0];
  const order = (await pool.query(
    `insert into trainer_package_orders
      (trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,
       shipping_address_snapshot_json,billing_snapshot_json,invoice_status,idempotency_key,request_hash)
     values($1,'PENDING_PAYMENT','PAYTR','TRY',120000,0,0,20000,120000,'{}','{}','PENDING',$2,$3)
     returning id`,
    [trainerUserId, `integration:${slug}`, `hash:${slug}`],
  )).rows[0];
  const item = (await pool.query(
    `insert into trainer_package_order_items
      (order_id,package_id,package_version_id,title_snapshot,description_snapshot,features_snapshot_json,sku_snapshot,
       invoice_product_name_snapshot,unit_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,
       discount_minor,line_total_minor,currency,quantity)
     values($1,$2,$3,$4,$4,'[]',$5,$4,'adet',2000,100000,120000,0,0,120000,'TRY',1)
     returning id`,
    [order.id, pkg.id, version.id, title, `SKU-${slug}`],
  )).rows[0];
  return { packageId: pkg.id, packageVersionId: version.id, orderId: order.id, itemId: item.id };
}

try {
  const trainerUserId = await seedTrainer();
  await pool.query(
    "insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'TRAINER',$1,'TRAINER','ACTIVE')",
    [trainerUserId],
  );

  const combined = await seedPackage(trainerUserId, {
    slug: "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set",
    title: "Ortaokul + Lise Paragraf Eğitmen Eğitimi İkili Set",
  });
  const first = await fulfillTrainerOrder(pool, {
    orderId: combined.orderId,
    actorUserId: trainerUserId,
    provider: "DISPOSABLE_TEST",
    providerReference: "trainer-combined-001",
  });
  assert.equal(first.replay, false);
  assert.equal((await pool.query("select count(*)::int as count from trainer_package_entitlements where source_order_id=$1", [combined.orderId])).rows[0].count, 1);
  assert.equal((await pool.query("select count(*)::int as count from r6_trainer_qualification_grants where source_order_id=$1", [combined.orderId])).rows[0].count, 2);
  const replay = await fulfillTrainerOrder(pool, { orderId: combined.orderId, actorUserId: trainerUserId, provider: "DISPOSABLE_TEST", providerReference: "trainer-combined-replay" });
  assert.equal(replay.replay, true);
  assert.equal((await pool.query("select count(*)::int as count from r6_trainer_qualification_grants where source_order_id=$1", [combined.orderId])).rows[0].count, 2);

  const unknown = await seedPackage(trainerUserId, { slug: "bilinmeyen-egitmen-egitimi", title: "Bilinmeyen Eğitmen Eğitimi" });
  await assert.rejects(
    () => fulfillTrainerOrder(pool, { orderId: unknown.orderId, actorUserId: trainerUserId, provider: "DISPOSABLE_TEST", providerReference: "trainer-unknown-001" }),
    (error) => error?.code === "TRAINER_EXPERTISE_MAPPING_MISSING",
  );
  assert.equal((await pool.query("select status from trainer_package_orders where id=$1", [unknown.orderId])).rows[0].status, "PENDING_PAYMENT");

  const book = await seedPackage(trainerUserId, { slug: "trainer-standalone-book", title: "Standalone Book Product" });
  const bookResult = await fulfillTrainerOrder(pool, { orderId: book.orderId, actorUserId: trainerUserId, provider: "DISPOSABLE_TEST", providerReference: "trainer-book-001" });
  assert.equal(bookResult.replay, false);
  assert.equal((await pool.query("select count(*)::int as count from r6_trainer_qualification_grants where source_order_id=$1", [book.orderId])).rows[0].count, 0);

  console.log(JSON.stringify({
    TRAINER_PACKAGE_PAYMENT: "PASS",
    COMBINED_PACKAGE_EXPERTISE: "PASS",
    EXPERTISE_IDEMPOTENCY: "PASS",
    UNKNOWN_EDUCATION_PACKAGE_FAIL_CLOSED: "PASS",
    BOOK_PACKAGE_NO_EXPERTISE: "PASS",
    DATABASE_ISOLATION: "DISPOSABLE_ONLY",
  }));
} finally {
  await disposable.dispose();
}
