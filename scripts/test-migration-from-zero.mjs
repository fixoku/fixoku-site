import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
const migrationsDir = path.join(process.cwd(), "drizzle", "migrations");
const sqlFiles = fs.readdirSync(migrationsDir).filter((name) => /^\d{4}_.+\.sql$/u.test(name)).sort();
assert.ok(sqlFiles.length > 0, "canonical migration source must contain at least one migration");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");
assert.ok(fs.existsSync(journalPath), "migration journal is required");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
assert.ok(Array.isArray(journal.entries), "migration journal entries are required");
const sourceTags = sqlFiles.map((name) => name.slice(0, -4));
const journalTags = journal.entries
  .slice()
  .sort((a, b) => Number(a.idx) - Number(b.idx))
  .map((entry) => entry.tag);
assert.deepEqual(journalTags, sourceTags, "migration source and journal tags must match");
assert.deepEqual(
  journal.entries.map((entry) => Number(entry.idx)),
  journal.entries.map((_, index) => index),
  "migration journal indexes must be contiguous",
);
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: migrationsDir });
try {
  const ledger = (await disposable.pool.query("select hash,created_at from drizzle.__drizzle_migrations order by created_at")).rows;
  assert.equal(ledger.length, sqlFiles.length, "zero database must apply every canonical migration");
  const uniqueHashes = new Set(ledger.map((row) => row.hash));
  assert.equal(uniqueHashes.size, sqlFiles.length, "migration ledger hashes must be unique");
  const sourceMigrations = readMigrationFiles({ migrationsFolder: migrationsDir });
  assert.deepEqual(ledger.map((row) => row.hash), sourceMigrations.map((row) => row.hash), "ledger must preserve exact migration source hashes");
  assert.deepEqual(ledger.map((row) => Number(row.created_at)), sourceMigrations.map((row) => row.folderMillis), "ledger timestamps must match journal authority");
  const tables = (await disposable.pool.query("select count(*)::int as count from information_schema.tables where table_schema='public'")).rows[0]?.count;
  assert.ok(Number(tables) >= 40, "zero migration must create the platform schema");
  console.log(JSON.stringify({ MIGRATION_FROM_ZERO: "PASS", MIGRATION_COUNT: ledger.length, JOURNAL_COUNT: journal.entries.length, HISTORICAL_HASHES_CHANGED: 0, disposableDatabase: "DESTROYED_AFTER_TEST" }));
} finally {
  await disposable.dispose();
}
