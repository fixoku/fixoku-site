import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { resolveEditableStudentVersion } from "../api/admin/student-commerce-packages.js";
import publicStudentCatalog from "../api/public/student-commerce-packages.js";

// R85 disposable runtime proof for the Owner Save boundary. No production URL
// is accepted by createDisposableDatabase; every mutation is isolated and the
// database is dropped by the same invocation that created it.
loadLocalEnv();
let disposable;
try {
  disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL, {
    migrationsFolder: path.join(process.cwd(), "drizzle", "migrations"),
  });
  const pool = disposable.pool;
  const pkg = (await pool.query(
    "insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','MIDDLE','[6]',1,'PUBLISHED',true,false,'FREE',0) returning id",
    [`r85-owner-student-${crypto.randomUUID()}`],
  )).rows[0];
  const published = (await pool.query(
    "insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'R85 yayımlanmış başlık','Eski içerik','Eski kısa içerik','[]',10000,'TRY',true,'PUBLISHED',now()) returning *",
    [pkg.id],
  )).rows[0];
  await pool.query(
    "insert into package_components(package_version_id,component_type,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TEXT_ITEM','Eski madde',null,true,1,0,'{}')",
    [published.id],
  );

  await pool.query("begin");
  const first = await resolveEditableStudentVersion(pool, pkg.id, published.id);
  assert.equal(first.draftCreated, true);
  assert.equal(first.version.status, "DRAFT");
  assert.equal(first.previousVersionId, published.id);
  await pool.query("update package_versions set title='R85 yeni başlık',price_minor=12500 where id=$1", [first.version.id]);
  await pool.query("commit");

  await pool.query("begin");
  const retry = await resolveEditableStudentVersion(pool, pkg.id, published.id);
  assert.equal(retry.draftCreated, false);
  assert.equal(retry.version.id, first.version.id);
  await pool.query("rollback");

  const rows = (await pool.query(
    "select pv.id,pv.version_number,pv.status,pv.title,pv.price_minor,(select count(*) from package_components pc where pc.package_version_id=pv.id)::int as component_count from package_versions pv where pv.package_id=$1 order by pv.version_number",
    [pkg.id],
  )).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "PUBLISHED");
  assert.equal(rows[0].title, "R85 yayımlanmış başlık");
  assert.equal(Number(rows[0].price_minor), 10000);
  assert.equal(Number(rows[0].component_count), 1);
  assert.equal(rows[1].status, "DRAFT");
  assert.equal(rows[1].title, "R85 yeni başlık");
  assert.equal(Number(rows[1].price_minor), 12500);
  assert.equal(Number(rows[1].component_count), 1);
  await pool.query("update package_versions set status='RETIRED',purchase_enabled=false where id=$1", [published.id]);
  await pool.query("update package_versions set status='PUBLISHED',purchase_enabled=false,published_at=now() where id=$1", [first.version.id]);
  await pool.query("update packages set status='PUBLISHED',public_web_visible=true where id=$1", [pkg.id]);
  process.env.DATABASE_URL = disposable.databaseUrl.toString();
  const response = await new Promise((resolve) => {
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { resolve({ statusCode: this.statusCode, body: JSON.parse(body) }); } };
    void publicStudentCatalog({ method: "GET" }, res);
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.packages.find((item) => item.id === pkg.id)?.title, "R85 yeni başlık");
  await pool.query("update packages set public_web_visible=false where id=$1", [pkg.id]);
  const hidden = await new Promise((resolve) => {
    const res = { setHeader() {}, end(body) { resolve(JSON.parse(body)); } };
    void publicStudentCatalog({ method: "GET" }, res);
  });
  assert.equal(hidden.packages.some((item) => item.id === pkg.id), false);
  console.log(JSON.stringify({
    OWNER_STUDENT_SAVE: "PASS_DISPOSABLE_DB_VERSION_CLONE",
    PUBLISHED_VERSION_PRESERVED: "PASS",
    DRAFT_RETRY_IDEMPOTENT: "PASS",
    PUBLIC_WEB_VISIBILITY: "PASS_DISPOSABLE_PUBLIC_API",
    PRODUCTION_WRITE: "NONE",
  }));
} catch (error) {
  console.error(JSON.stringify({
    OWNER_STUDENT_SAVE: "BLOCKED",
    error: error?.code || error?.message || "UNKNOWN",
    PRODUCTION_WRITE: "NONE",
  }));
  process.exitCode = 1;
} finally {
  await disposable?.dispose?.();
}
