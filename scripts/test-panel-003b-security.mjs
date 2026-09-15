import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { requirePermission, validScopeType } from "../src/server/auth/authorization.js";

loadLocalEnv();
const database = assertSafeSeedDatabaseUrl(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString: database.toString() });
const uuid = "00000000-0000-4000-8000-000000000001";
const principal = (role) => ({ user: { id: uuid }, memberships: [{ role, status: "ACTIVE", scopeType: role === "OWNER" || role === "SUPER_ADMIN" ? "GLOBAL" : role === "TRAINER" || role === "STUDENT" ? role : "STUDENT", scopeId: role === "TRAINER" || role === "STUDENT" ? uuid : null }] });
try {
  assert.equal(validScopeType(principal("OWNER").memberships[0], uuid), true);
  assert.equal(requirePermission(principal("SUPER_ADMIN"), "finance.read")?.status, 403);
  assert.equal(requirePermission(principal("TRAINER"), "finance.read")?.status, 403);
  assert.equal(requirePermission(principal("OWNER"), "finance.read"), null);
  assert.equal(requirePermission(principal("STUDENT"), "payout.manage")?.status, 403);
  const tables = (await pool.query("select tablename from pg_tables where schemaname='public' and tablename=any($1::text[])", [["trainer_qualification_history", "trainer_compensation_snapshots", "enrollment_completions", "package_components", "inventory_movements", "shipments", "digital_entitlements", "digital_download_audits", "panel_notifications", "notification_email_outbox", "owner_finance_ledger", "trainer_payout_register"]])).rows;
  assert.equal(tables.length, 12);
  const stockCheck = (await pool.query("select count(*)::int as count from information_schema.check_constraints where constraint_name in ('physical_products_stock_chk','inventory_movements_quantity_chk')")).rows[0];
  assert.equal(stockCheck.count, 2);
  const uniqueCompletion = (await pool.query("select count(*)::int as count from pg_indexes where tablename='enrollment_completions' and indexdef ilike '%UNIQUE%enrollment_id%'")).rows[0];
  assert.equal(uniqueCompletion.count, 1);
  console.log(JSON.stringify({ ownerFinanceFailClosed: "PASS", adminFinanceDenied: "PASS", trainerFinanceDenied: "PASS", studentPayoutDenied: "PASS", qualificationHistory: "PASS", compensationSnapshot: "PASS", completionExactlyOnceConstraint: "PASS", stockUnderflowConstraints: "PASS", shipmentDownloadNotificationTables: "PASS" }));
} finally { await pool.end(); }
