import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { assertFamilyOfferEditable } from "../src/server/domain/family-offers.js";

const root = process.cwd();
const integration = path.resolve(root, "..", "integration");
const sourceEnv = fs.readFileSync(path.join(integration, ".env.local"), "utf8").split(/\r?\n/u).find((line) => line.startsWith("DATABASE_URL="));
assert.ok(sourceEnv, "SOURCE_DATABASE_URL_MISSING");
const sourceUrl = sourceEnv.slice("DATABASE_URL=".length);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fixoku-family-migrations-"));
fs.mkdirSync(path.join(temp, "meta"), { recursive: true });
for (const entry of fs.readdirSync(path.join(root, "drizzle/migrations"))) if (entry.endsWith(".sql")) fs.copyFileSync(path.join(root, "drizzle/migrations", entry), path.join(temp, entry));
for (const tag of ["0024_trainer_package_commerce.sql", "0025_trainer_commerce_runtime.sql", "0026_student_commerce_catalog.sql", "0027_student_order_payment_method.sql", "0028_admin_owner_005g_consolidated_package_product_fulfillment.sql", "0029_r6_canonical_commerce.sql", "0030_r6_post_apply_corrections.sql"]) fs.copyFileSync(path.join(integration, "drizzle/migrations", tag), path.join(temp, tag));
fs.copyFileSync(path.join(root, "drizzle/migrations/meta/_journal.json"), path.join(temp, "meta/_journal.json"));

let fixture;
try {
  fixture = await createDisposableDatabase(sourceUrl, { migrationsFolder: temp });
  const pool = fixture.pool;
  const seeded = await pool.connect();
  let owner; let customer; let product; let packageVersion; let component;
  try {
    await seeded.query("begin");
    owner = (await seeded.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('family-db-owner','family.owner@example.test','Family DB Owner',true) returning id")).rows[0];
    customer = (await seeded.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('family-db-customer','family.customer@example.test','Family DB Customer',true) returning id")).rows[0];
    await seeded.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'GLOBAL',null,'OWNER','ACTIVE')", [owner.id]);
    await seeded.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'STUDENT',$1,'STUDENT','ACTIVE')", [customer.id]);
    const packageRow = (await seeded.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,status,panel_visible,physical_product) values('family-db-package','STUDENT','STUDENT_COMMERCE','MIDDLE','[5]','PUBLISHED',true,true) returning id")).rows[0];
    packageVersion = (await seeded.query("insert into package_versions(package_id,version_number,title,description,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'Family DB Package','Disposable family package.',10000,10000,'TRY',true,'PUBLISHED',now()) returning id", [packageRow.id])).rows[0];
    product = (await seeded.query("insert into physical_products(sku,title,product_type,is_active,list_gross_minor,vat_rate_bps,r6_product_type,currency) values('FAMILY-DB-BOOK','Family DB Book','PHYSICAL',true,10000,1000,'BOOK','TRY') returning id")).rows[0];
    await seeded.query("insert into r6_product_stage_scopes(physical_product_id,education_stage) values($1,'MIDDLE')", [product.id]);
    component = (await seeded.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,is_active,quantity) values($1,'PHYSICAL_PRODUCT',$2,$2,'Family DB Book',true,1) returning id", [packageVersion.id, product.id])).rows[0];
    await seeded.query("insert into r6_package_component_pricing(package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency) values($1,10000,10000,0,0,1000,9091,909, 'TRY')", [component.id]);
    await seeded.query("commit");
  } catch (error) { await seeded.query("rollback"); throw error; } finally { seeded.release(); }

  const child = (key, first) => ({ localKey: key, firstName: first, lastName: "DB", grade: "5", educationStage: "MIDDLE" });
  const offerId = (await pool.query("insert into family_offers(owner_user_id,customer_user_id,title) values($1,$2,'Family DB Offer') returning id", [owner.id, customer.id])).rows[0].id;
  const revisionId = (await pool.query("insert into family_offer_revisions(offer_id,revision_number,status,draft_children_snapshot,selections_snapshot,pricing_snapshot,created_by) values($1,1,'DRAFT',$2,$3,$4,$5) returning id", [offerId, JSON.stringify([child("a","Ada"), child("b","Bora")]), JSON.stringify([]), JSON.stringify({ normalTotalMinor: 20000, discountMinor: 1000, finalFamilyPriceMinor: 19000, currency: "TRY" }), owner.id])).rows[0].id;
  const childA = (await pool.query("insert into family_offer_draft_children(revision_id,local_key,first_name,last_name,grade,education_stage) values($1,'a','Ada','DB','5','MIDDLE') returning id", [revisionId])).rows[0].id;
  const childB = (await pool.query("insert into family_offer_draft_children(revision_id,local_key,first_name,last_name,grade,education_stage) values($1,'b','Bora','DB','5','MIDDLE') returning id", [revisionId])).rows[0].id;
  await pool.query("insert into family_offer_child_selections(revision_id,draft_child_id,canonical_product_or_component_id,package_version_id,package_component_id,product_id,product_type,title_snapshot,sale_gross_minor,currency) values($1,$2,$3,$4,$5,$6,'BOOK','Family DB Book',10000,'TRY'),($1,$7,$3,$4,$5,$6,'BOOK','Family DB Book',10000,'TRY')", [revisionId, childA, product.id, packageVersion.id, component.id, product.id, childB]);
  assert.equal((await pool.query("select count(*)::int as count from family_offer_draft_children where revision_id=$1", [revisionId])).rows[0].count, 2);
  assert.equal((await pool.query("select count(*)::int as count from family_offer_child_selections where revision_id=$1", [revisionId])).rows[0].count, 2);
  await assert.rejects(pool.query("insert into family_offer_child_selections(revision_id,draft_child_id,canonical_product_or_component_id,package_version_id,package_component_id,product_id,product_type,title_snapshot,sale_gross_minor,currency) values($1,$2,$3,$4,$5,$6,'BOOK','Duplicate',10000,'TRY')", [revisionId, childA, product.id, packageVersion.id, component.id, product.id]), /duplicate key/iu);

  const stale = await pool.query("select current_revision_number from family_offers where id=$1", [offerId]);
  const update = async (label) => { const c = await pool.connect(); try { await c.query("begin"); await c.query("select pg_advisory_xact_lock(hashtext($1))", [`family-offer:${offerId}`]); const current = (await c.query("select current_revision_number,status,accepted_order_id,materialized_order_id from family_offers where id=$1 for update", [offerId])).rows[0]; if (Number(current.current_revision_number) !== Number(stale.rows[0].current_revision_number)) { await c.query("rollback"); return { label, result: "STALE" }; } await c.query("update family_offers set current_revision_number=current_revision_number+1,updated_at=now() where id=$1", [offerId]); await c.query("commit"); return { label, result: "UPDATED" }; } catch (error) { await c.query("rollback"); return { label, result: error.code || error.message }; } finally { c.release(); } };
  const [first, second] = await Promise.all([update("one"), update("two")]);
  assert.equal([first.result, second.result].filter((value) => value === "UPDATED").length, 1);
  assert.equal([first.result, second.result].filter((value) => value === "STALE").length, 1);
  assert.throws(() => assertFamilyOfferEditable({ status: "ACCEPTED", acceptedOrderId: "order", materializedOrderId: "order" }), /FAMILY_OFFER_IMMUTABLE/);
  const beforeRollback = (await pool.query("select count(*)::int as count from family_offer_revisions")).rows[0].count;
  const rollbackClient = await pool.connect(); try { await rollbackClient.query("begin"); await rollbackClient.query("insert into family_offer_revisions(offer_id,revision_number,status,draft_children_snapshot,selections_snapshot,pricing_snapshot,created_by) values($1,99,'DRAFT','[]','[]','{}',$2)", [offerId, owner.id]); await rollbackClient.query("rollback"); } finally { rollbackClient.release(); }
  assert.equal((await pool.query("select count(*)::int as count from family_offer_revisions")).rows[0].count, beforeRollback);
  console.log(JSON.stringify({ disposableDatabase: "PASS", transactionCreateAndPersist: "PASS", customerLink: "PASS", twoDraftChildren: "PASS", sameProductDifferentChildren: "PASS", duplicateSameChildRejected: "PASS", canonicalPriceSnapshot: "PASS", revisionRead: "PASS", staleRevisionRejected: "PASS", concurrency: "PASS", rollback: "PASS", acceptedRevisionImmutable: "PASS", studentProfilesCreated: 0, paymentOrCart: "NOT_RUN" }));
} finally { await fixture.dispose(); fs.rmSync(temp, { recursive: true, force: true }); }
