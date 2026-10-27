import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
const migrationsDir = path.join(process.cwd(), "drizzle", "migrations");
const journal = JSON.parse(fs.readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8"));

const currentPriceSql = fs.readFileSync(path.join(migrationsDir, "0031_core001_price_catalog_shipping.sql"), "utf8");
const currentPriceData = /package_data jsonb := '([\s\S]*?)'::jsonb;/u.exec(currentPriceSql);
assert.ok(currentPriceData, "current price authority must be present in migration 0031");
const expectedPrices = new Map(JSON.parse(currentPriceData[1]).map((item) => [item.slug, Number(item.gross)]));

const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: migrationsDir });
try {
  const q = async (sql, params = []) => (await disposable.pool.query(sql, params)).rows;
  const ledger = await q("select count(*)::int as count from drizzle.__drizzle_migrations");
  assert.equal(ledger[0].count, journal.entries.length);

  const activeBooks = await q("select count(*)::int as count from physical_products where r6_product_type='BOOK' and is_active=true");
  assert.equal(activeBooks[0].count, 8);
  const oldBooks = await q("select count(*)::int as count from physical_products where sku in ('FIXOKU-HIGH-ZIHIN-EGZERSIZLERI','FIXOKU-ADULT-ZIHIN-EGZERSIZLERI') and is_active=true");
  assert.equal(oldBooks[0].count, 0);

  const software = await q("select count(*)::int as count from physical_products where r6_product_type='SOFTWARE' and is_active=true and list_gross_minor=450000 and vat_rate_bps=2000 and default_access_days=365");
  assert.equal(software[0].count, 1);
  const training = await q("select count(*)::int as count from physical_products where r6_product_type='TRAINING_SERVICE' and is_active=true and vat_rate_bps=2000");
  assert.equal(training[0].count, 10);

  const prices = await q("select p.slug,pv.price_minor,pv.price_gross_minor,pv.title from packages p join package_versions pv on pv.package_id=p.id and pv.status='DRAFT' where p.catalog_scope='STUDENT_COMMERCE' order by p.slug");
  assert.equal(prices.length, 26);
  for (const row of prices) {
    assert.equal(Number(row.price_minor), expectedPrices.get(row.slug), `price:${row.slug}`);
    assert.equal(Number(row.price_gross_minor), expectedPrices.get(row.slug), `gross:${row.slug}`);
  }
  assert.equal(prices.find((row) => row.slug === "student-high-paragraf-egitim")?.title, "LİSEL PARAGRAF EĞİTİMİ");

  const pricing = await q("select count(*)::int as count from r6_package_component_pricing");
  assert.ok(pricing[0].count > 0);
  const payout = await q("select count(*)::int as count from r6_training_payout_matrix");
  assert.equal(payout[0].count, 10);
  const qualifications = await q("select count(*)::int as count from r6_qualification_definitions");
  assert.equal(qualifications[0].count, 6);

  console.log(JSON.stringify({
    MIGRATION_REHEARSAL: "PASS",
    MIGRATION_COUNT: ledger[0].count,
    ACTIVE_CANONICAL_BOOKS: activeBooks[0].count,
    NONCANONICAL_ACTIVE_BOOKS: oldBooks[0].count,
    SOFTWARE_PRODUCTS: software[0].count,
    TRAINING_SERVICE_PRODUCTS: training[0].count,
    PACKAGE_COUNT: prices.length,
    PACKAGE_PRICING_ROWS: pricing[0].count,
    PAYOUT_MATRIX_ROWS: payout[0].count,
    QUALIFICATION_DEFINITIONS: qualifications[0].count,
    DATABASE_MUTATION: "DISPOSABLE_ONLY",
  }));
} finally {
  await disposable.dispose();
}
