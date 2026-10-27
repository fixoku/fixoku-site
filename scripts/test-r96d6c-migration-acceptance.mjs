import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
const migrationsDir = path.join(process.cwd(), "drizzle", "migrations");
const journal = JSON.parse(fs.readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8"));
const sqlFiles = fs.readdirSync(migrationsDir).filter((name) => /^\d{4}_.+\.sql$/u.test(name)).sort();
const sourceMigrations = readMigrationFiles({ migrationsFolder: migrationsDir });
assert.deepEqual(journal.entries.map((entry) => entry.tag), sqlFiles.map((name) => name.slice(0, -4)), "JOURNAL_SOURCE_TAGS_MISMATCH");
assert.deepEqual(journal.entries.map((entry) => Number(entry.idx)), journal.entries.map((_, index) => index), "JOURNAL_INDEX_SEQUENCE_MISMATCH");
assert.deepEqual(sourceMigrations.map((row) => row.folderMillis), journal.entries.map((entry) => Number(entry.when)), "JOURNAL_TIMESTAMP_MISMATCH");

const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: migrationsDir });
try {
  const q = async (sql, params = []) => (await disposable.pool.query(sql, params)).rows;
  const before = await q("select hash,created_at from drizzle.__drizzle_migrations order by created_at,id");
  assert.equal(before.length, sqlFiles.length, "MIGRATION_LEDGER_COUNT_MISMATCH");
  assert.deepEqual(before.map((row) => row.hash), sourceMigrations.map((row) => row.hash), "MIGRATION_LEDGER_HASH_MISMATCH");
  assert.deepEqual(before.map((row) => Number(row.created_at)), sourceMigrations.map((row) => row.folderMillis), "MIGRATION_LEDGER_TIMESTAMP_MISMATCH");

  // Replay against the same disposable database must be a no-op.
  const { drizzle } = await import("drizzle-orm/node-postgres");
  await migrate(drizzle(disposable.pool), { migrationsFolder: migrationsDir });
  const after = await q("select hash,created_at from drizzle.__drizzle_migrations order by created_at,id");
  assert.deepEqual(after, before, "MIGRATION_REPLAY_CHANGED_LEDGER");

  const refundTable = await q("select to_regclass('public.order_refund_requests') as table_name");
  assert.equal(refundTable[0].table_name, "order_refund_requests", "REFUND_TABLE_MISSING");
  const activeIndex = await q("select indexdef from pg_indexes where schemaname='public' and indexname='order_refund_requests_active_order_uq'");
  assert.match(activeIndex[0]?.indexdef || "", /UNIQUE INDEX/u, "REFUND_ACTIVE_UNIQUE_INDEX_MISSING");
  const foreignKeys = await q("select count(*)::int as count from pg_constraint where conrelid='public.order_refund_requests'::regclass and contype='f'");
  assert.ok(Number(foreignKeys[0].count) >= 4, "REFUND_FOREIGN_KEYS_MISSING");
  const eventForeignKey = await q("select count(*)::int as count from pg_constraint where conrelid='public.order_refund_request_events'::regclass and contype='f'");
  assert.ok(Number(eventForeignKey[0].count) >= 2, "REFUND_EVENT_FOREIGN_KEYS_MISSING");

  console.log(JSON.stringify({
    MIGRATION_0042: "PASS",
    JOURNAL_SOURCE_PARITY: "PASS",
    HASH_PARITY: "PASS",
    TIMESTAMP_PARITY: "PASS",
    REPLAY_NOOP: "PASS",
    UNIQUE_INDEX: "PASS",
    FOREIGN_KEYS: "PASS",
    MIGRATION_COUNT: before.length,
    DATABASE_ISOLATION: `DISPOSABLE_ONLY:${disposable.databaseName}`,
  }));
} finally {
  await disposable.dispose();
}
