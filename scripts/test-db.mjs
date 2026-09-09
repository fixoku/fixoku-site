import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(url, "TEST_DATABASE_URL or DATABASE_URL is required");
const pool = new pg.Pool({ connectionString: url, max: 2 });
const client = await pool.connect();
try {
  const tableResult = await client.query("select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename");
  assert.deepEqual(tableResult.rows.map((row) => row.tablename), ["account", "enrollments", "platform_audit_events", "platform_memberships", "platform_users", "presentations", "rate_limit", "resources", "session", "student_profiles", "trainer_assignments", "trainer_entitlements", "trainer_profiles", "trainer_student_links", "training_programs", "user", "verification"]);
  const indexResult = await client.query("select indexname from pg_indexes where schemaname = 'public' and tablename = 'platform_memberships'");
  assert.ok(indexResult.rows.some((row) => row.indexname === "platform_memberships_user_scope_role_uq"));
  const foreignKeyResult = await client.query("select count(*)::int as count from information_schema.table_constraints where table_schema = 'public' and table_name in ('platform_memberships','platform_audit_events','trainer_profiles','trainer_entitlements','training_programs','presentations','resources','student_profiles','trainer_student_links','enrollments','trainer_assignments') and constraint_type = 'FOREIGN KEY'");
  assert.equal(foreignKeyResult.rows[0].count, 14);
  await client.query("begin");
  await client.query("create temporary table phase1c_commit_probe(value integer)");
  await client.query("insert into phase1c_commit_probe values (1)");
  await client.query("commit");
  await client.query("begin");
  await client.query("create temporary table phase1c_rollback_probe(value integer)");
  await client.query("insert into phase1c_rollback_probe values (1)");
  await client.query("rollback");
  const rollbackResult = await client.query("select to_regclass('pg_temp.phase1c_rollback_probe') as name");
  assert.equal(rollbackResult.rows[0].name, null);
  console.log(JSON.stringify({ dbTest: "PASS", tables: tableResult.rows.map((row) => row.tablename), uniqueIndex: "PASS", foreignKeys: "PASS", transactionCommit: "PASS", transactionRollback: "PASS" }));
} finally {
  client.release();
  await pool.end();
}
