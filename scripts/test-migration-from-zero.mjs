import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
const migrationsDir = path.join(process.cwd(), "drizzle", "migrations");
const sqlFiles = fs.readdirSync(migrationsDir).filter((name) => /^\d{4}_.+\.sql$/u.test(name)).sort();
assert.equal(sqlFiles.length, 24, "canonical migration source must contain 24 migrations");
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: migrationsDir });
try {
  const ledger = (await disposable.pool.query("select hash,created_at from drizzle.__drizzle_migrations order by created_at")).rows;
  assert.equal(ledger.length, 24, "zero database must apply all 24 migrations");
  const uniqueHashes = new Set(ledger.map((row) => row.hash));
  assert.equal(uniqueHashes.size, 24, "migration ledger hashes must be unique");
  const tables = (await disposable.pool.query("select count(*)::int as count from information_schema.tables where table_schema='public'")).rows[0]?.count;
  assert.ok(Number(tables) >= 40, "zero migration must create the platform schema");
  console.log(JSON.stringify({ MIGRATION_FROM_ZERO: "PASS", MIGRATION_COUNT: ledger.length, HISTORICAL_HASHES_CHANGED: 0, disposableDatabase: "DESTROYED_AFTER_TEST" }));
} finally {
  await disposable.dispose();
}
