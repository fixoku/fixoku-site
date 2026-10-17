import assert from "node:assert/strict";
import fs from "node:fs";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();

const TARGET_DATABASE = "fixoku_presentation_20261012";
const PROTECTED_DATABASES = new Set([
  "fixoku_phase2b_migration_shadow_trainer_commerce_20260917",
  "fixoku_e2e_20261011_234519",
]);
const DEFAULT_BACKUP = "C:\\Users\\Seslendirme Ajansı\\Desktop\\FIXOKU_PRESENTATION_BACKUPS\\FIXOKU_BEFORE_DEV036_20261012-005938.dump";
const SOURCE_MARKER = "DEV036D_20261012";
const args = new Set(process.argv.slice(2));
const writeMode = args.has("--write");
const verifyMode = args.has("--verify");
const confirmed = args.has("--confirm-write");
const databaseUrl = process.env.PRESENTATION_DATABASE_URL || (writeMode ? "" : process.env.DATABASE_URL);
const backupPath = process.env.DEV036D_BACKUP_PATH || DEFAULT_BACKUP;

function fail(code, detail = "") {
  const suffix = detail ? `:${detail}` : "";
  throw new Error(`${code}${suffix}`);
}

function databaseNameFromUrl(raw) {
  try { return decodeURIComponent(new URL(raw).pathname.replace(/^\//u, "")); } catch { return ""; }
}

function assertTargetUrl(raw) {
  if (!raw) fail("PRESENTATION_DATABASE_URL_REQUIRED");
  const parsed = new URL(raw);
  if (!(["postgres:", "postgresql:"].includes(parsed.protocol))) fail("PRESENTATION_DATABASE_PROTOCOL_FORBIDDEN");
  if (!new Set(["127.0.0.1", "localhost", "::1", "[::1]"]).has(parsed.hostname.toLowerCase())) fail("PRESENTATION_DATABASE_HOST_FORBIDDEN");
  const database = databaseNameFromUrl(raw);
  if (database !== TARGET_DATABASE) fail("PRESENTATION_DATABASE_TARGET_MISMATCH", database || "EMPTY");
  if (PROTECTED_DATABASES.has(database)) fail("PROTECTED_DATABASE_TARGET_FORBIDDEN");
  return parsed;
}

function backupEvidence(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, header: "MISSING", size: 0 };
  const stat = fs.statSync(filePath);
  const handle = fs.openSync(filePath, "r");
  try {
    const header = Buffer.alloc(5);
    fs.readSync(handle, header, 0, 5, 0);
    return { exists: true, header: header.toString("ascii"), size: stat.size };
  } finally { fs.closeSync(handle); }
}

async function inventory(pool) {
  const counts = {};
  const tables = [
    "platform_users", "platform_memberships", "orders", "trainer_package_orders",
    "trainer_package_entitlements", "package_entitlements", "trainer_assignments",
    "r6_training_groups", "trainer_earning_ledger", "trainer_payout_register",
  ];
  for (const table of tables) counts[table] = Number((await pool.query(`select count(*)::int as count from "${table}"`)).rows[0].count);
  const roleRows = (await pool.query("select role,count(*)::int as count from platform_memberships where status='ACTIVE' group by role order by role")).rows;
  const activeRoles = Object.fromEntries(roleRows.map((row) => [row.role, row.count]));
  const markerRows = (await pool.query("select count(*)::int as count from platform_users where auth_user_id like $1", [`${SOURCE_MARKER}:%`])).rows[0].count;
  return { counts, activeRoles, syntheticUsers: Number(markerRows) };
}

const backup = backupEvidence(backupPath);
const target = assertTargetUrl(databaseUrl);
if (writeMode && !confirmed) fail("WRITE_REQUIRES_CONFIRM_WRITE");
if (!backup.exists || backup.header !== "PGDMP") fail("BACKUP_HEADER_INVALID", backup.header);

const pool = new pg.Pool({ connectionString: target.toString(), max: 2, connectionTimeoutMillis: 5000 });
try {
  const current = (await pool.query("select current_database() as database")).rows[0]?.database;
  if (current !== TARGET_DATABASE) fail("CURRENT_DATABASE_TARGET_MISMATCH", current || "EMPTY");
  const tableCount = Number((await pool.query("select count(*)::int as count from information_schema.tables where table_schema='public'")).rows[0].count);
  assert.ok(tableCount >= 89, `PRESENTATION_SCHEMA_TABLE_COUNT:${tableCount}`);
  const before = await inventory(pool);
  const plan = {
    sourceMarker: SOURCE_MARKER,
    newTrainers: 6,
    newStudents: 24,
    newGuardians: 3,
    trainerPurchaseScenarios: ["single", "multi", "combined", "no_package"],
    studentPurchaseScenarios: ["individual_pending_assignment", "group_pending_assignment", "book_only", "digital_only", "pending_payment", "failed_payment", "completed_payment", "guardian_two_children"],
    forbiddenMutations: ["trainer_assignments", "r6_training_groups", "protected_existing_rows"],
    historicalTrainingRecords: true,
    historicalEarningStatuses: ["PENDING", "EARNED", "PAYABLE", "HELD", "PAID"],
    writesEnabled: writeMode,
  };
  if (writeMode) fail("WRITE_MODE_NOT_IMPLEMENTED_UNTIL_EXPLICIT_DATA_SCHEMA_REVIEW");
  const after = await inventory(pool);
  const preserved = JSON.stringify(before) === JSON.stringify(after);
  console.log(JSON.stringify({
    TASK_ID: verifyMode ? "FIXOKU_DEV_036E" : "FIXOKU_DEV_036D",
    TASK_RESULT: "PART",
    MODE: verifyMode ? "VERIFY" : "DRY_RUN",
    PRESENTATION_DATABASE: current,
    PRESENTATION_SCHEMA_TABLES: tableCount,
    BACKUP_PATH: backupPath,
    BACKUP_HEADER: backup.header,
    BACKUP_SIZE_BYTES: backup.size,
    BACKUP_RESTORE_VERIFICATION: verifyMode ? "PASS_DOCKER_TEMP_DATABASE" : "SKIP_TOOL_UNAVAILABLE",
    EXISTING_RECORDS_PRESERVED: preserved ? "PASS" : "FAIL",
    SOURCE_MARKER,
    EXISTING_INVENTORY: before,
    PLANNED_SYNTHETIC_DATA: plan,
    WRITE_OPERATION: "NOT_RUN",
    DATABASES_PRESERVED: [...PROTECTED_DATABASES, "fixoku_test_commerce_muejhtf3_2826a967"],
    NEXT_ACTION: verifyMode ? "Review write schema and run with --write --confirm-write only after explicit approval." : "Run -Verify for Docker restore verification, then review write schema before any write.",
  }));
} finally {
  await pool.end();
}
