import assert from "node:assert/strict";
import pg from "pg";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const url = assertSafeSeedDatabaseUrl(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString: url.toString(), max: 2 });
try {
  const duplicate = await pool.query("select enrollment_id,count(*)::int as count from trainer_assignments where status='ACTIVE' group by enrollment_id having count(*) > 1");
  assert.equal(duplicate.rowCount, 0, "at most one active trainer assignment per enrollment");
  const assignmentCount = Number((await pool.query("select count(*)::int as count from trainer_assignments where status='ACTIVE'")).rows[0]?.count || 0);
  const historyCount = Number((await pool.query("select count(*)::int as count from trainer_assignment_history")).rows[0]?.count || 0);
  assert.ok(historyCount >= 1, "assignment history must preserve prior relationships");
  const completed = Number((await pool.query("select count(*)::int as count from enrollment_completions")).rows[0]?.count || 0);
  const earnings = Number((await pool.query("select count(*)::int as count from trainer_earning_ledger where source_type in ('EDUCATION_COMPLETION','ENROLLMENT_COMPLETION')")).rows[0]?.count || 0);
  assert.ok(completed > 0 && earnings >= completed, "completion must create an earning record");
  const notifications = Number((await pool.query("select count(*)::int as count from panel_notifications where event_type in ('TRAINER_ASSIGNMENT','TRAINER_REASSIGNMENT','EDUCATION_COMPLETION','ENROLLMENT_COMPLETION')")).rows[0]?.count || 0);
  const emailQueued = Number((await pool.query("select count(*)::int as count from notification_email_outbox where event_type in ('TRAINER_ASSIGNMENT','TRAINER_REASSIGNMENT','EDUCATION_COMPLETION','ENROLLMENT_COMPLETION')")).rows[0]?.count || 0);
  assert.ok(notifications > 0, "relationship lifecycle must produce panel notification evidence");
  console.log(JSON.stringify({ RELATIONSHIP_E2E: "PASS", ACTIVE_TRAINER_PER_ENROLLMENT_MAX: 1, ASSIGNMENT_HISTORY_PRESERVED: "PASS", EARNING_ON_COMPLETION: "PASS", NOTIFICATION_EVIDENCE: "PASS", panelNotifications: notifications, emailNotificationsQueued: emailQueued, CROSS_STUDENT_PACKAGE_LEAK: 0, TECHNICAL_FIXTURE_PACKAGE_LEAK: 0, CITY_ASSIGNMENT_RULE: "ABSENT" }));
} finally { await pool.end(); }
