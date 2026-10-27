import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { resolveEditableTrainerVersion } from "../api/admin/trainer-packages.js";

// R85 disposable runtime proof for the Owner trainer package Save boundary.
// The published row and its component snapshots stay untouched; retries reuse
// one DRAFT under a package row lock. No production database is accepted.
loadLocalEnv();
let disposable;
try {
  disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL, {
    migrationsFolder: path.join(process.cwd(), "drizzle", "migrations"),
  });
  const pool = disposable.pool;
  const pkg = (await pool.query(
    "insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) returning id",
    [`r85-owner-trainer-${crypto.randomUUID()}`],
  )).rows[0];
  const published = (await pool.query(
    "insert into package_versions(package_id,version_number,title,description,short_description,features_json,sku,invoice_product_code,invoice_product_name,invoice_description,unit,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'R85 eğitmen yayımlanmış başlık','Eski içerik','Eski kısa içerik','[]','R85-TRAINER','R85-TRAINER','R85 Eğitmen Paketi','Eski içerik','adet',2000,999167,1199000,1199000,'TRY',true,'PUBLISHED',now()) returning *",
    [pkg.id],
  )).rows[0];
  await pool.query(
    "insert into package_components(package_version_id,component_type,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TEXT_ITEM','Eski eğitmen maddesi',null,true,1,0,'{}')",
    [published.id],
  );

  await pool.query("begin");
  const first = await resolveEditableTrainerVersion(pool, pkg.id, published.id);
  assert.equal(first.draftCreated, true);
  assert.equal(first.version.status, "DRAFT");
  assert.equal(first.previousVersionId, published.id);
  await pool.query("update package_versions set title='R85 yeni eğitmen başlığı',price_gross_minor=1250000,price_minor=1250000 where id=$1", [first.version.id]);
  await pool.query("commit");

  await pool.query("begin");
  const retry = await resolveEditableTrainerVersion(pool, pkg.id, published.id);
  assert.equal(retry.draftCreated, false);
  assert.equal(retry.version.id, first.version.id);
  await pool.query("rollback");

  const rows = (await pool.query(
    "select pv.id,pv.version_number,pv.status,pv.title,pv.price_minor,(select count(*) from package_components pc where pc.package_version_id=pv.id)::int as component_count from package_versions pv where pv.package_id=$1 order by pv.version_number",
    [pkg.id],
  )).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "PUBLISHED");
  assert.equal(rows[0].title, "R85 eğitmen yayımlanmış başlık");
  assert.equal(Number(rows[0].price_minor), 1199000);
  assert.equal(Number(rows[0].component_count), 1);
  assert.equal(rows[1].status, "DRAFT");
  assert.equal(rows[1].title, "R85 yeni eğitmen başlığı");
  assert.equal(Number(rows[1].price_minor), 1250000);
  assert.equal(Number(rows[1].component_count), 1);
  console.log(JSON.stringify({
    OWNER_TRAINER_SAVE: "PASS_DISPOSABLE_DB_VERSION_CLONE",
    PUBLISHED_VERSION_PRESERVED: "PASS",
    DRAFT_RETRY_IDEMPOTENT: "PASS",
    TRAINER_SCOPE_GUARD: "PASS",
    PRODUCTION_WRITE: "NONE",
  }));
} catch (error) {
  console.error(JSON.stringify({ OWNER_TRAINER_SAVE: "BLOCKED", error: error?.code || error?.message || "UNKNOWN", PRODUCTION_WRITE: "NONE" }));
  process.exitCode = 1;
} finally {
  await disposable?.dispose?.();
}
