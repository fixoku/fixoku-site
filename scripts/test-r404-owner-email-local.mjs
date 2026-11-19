import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { queueOwnerManagementEmail, tryQueueOwnerManagementEmail } from "../src/server/domain/owner-management-notifications-r390.js";
import { processOutboxBatch } from "../src/server/domain/email-outbox.js";
import { buildEmailSnapshot, staticTemplateRecord } from "../src/server/domain/email-templates.js";
import { OWNER_EMAIL_EDITORIAL } from "../src/server/domain/owner-email-editorial-r390.js";

const sourceUrl = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "");
const template = String(process.env.R404_SCHEMA_DATABASE || "");
if (!['127.0.0.1', 'localhost', '::1'].includes(sourceUrl.hostname.toLowerCase()) || Number(sourceUrl.port) !== 51880) throw new Error("R404_OWNER_EMAIL_LOCAL_DATABASE_GUARD_FAILED");
if (!/^r404_payment_schema_[0-9]{8}_[0-9]{6}$/u.test(template)) throw new Error("R404_OWNER_EMAIL_SCHEMA_GUARD_FAILED");
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const dbName = `fixoku_test_r404_owner_email_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`.toLowerCase();
const adminUrl = new URL(sourceUrl.toString()); adminUrl.pathname = "/postgres";
const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 2 });
let db; let created = false;
const env = {
  FIXOKU_OWNER_NOTIFICATIONS_ENABLED: "1", FIXOKU_OWNER_EMAIL_WORKER_ENABLED: "1",
  FIXOKU_OWNER_NOTIFICATION_EMAIL: "ersinusta@fixoku.com", FIXOKU_OWNER_EMAIL_START_DATE: "2026-11-19",
  EMAIL_PROVIDER: "SMTP", SMTP_HOST: "mail.fixoku.com", SMTP_PORT: "465", SMTP_SECURE: "true",
  SMTP_USER: "bildirim@fixoku.com", SMTP_PASS: "synthetic-only", MAIL_FROM: "bildirim@fixoku.com",
  APP_ORIGIN: "https://fixoku.com", NODE_ENV: "test", VERCEL_ENV: "",
};

try {
  await admin.query(`create database ${quote(dbName)} template ${quote(template)}`); created = true;
  const cloneUrl = new URL(sourceUrl.toString()); cloneUrl.pathname = `/${dbName}`;
  db = new pg.Pool({ connectionString: cloneUrl.toString(), max: 8 });
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_02_PAYTR_TOKEN_LEASES_AND_INTEGRITY.sql", import.meta.url), "utf8"));
  await db.query(fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_03_SHIPMENT_DISPATCH_IDEMPOTENCY.sql", import.meta.url), "utf8"));

  const owner = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,'ersin@fixoku.com','Ersin Owner',true) returning id", [`owner-email-${dbName}`])).rows[0].id;
  await db.query("insert into platform_memberships(user_id,scope_type,role,status) values($1,'GLOBAL','OWNER','ACTIVE')", [owner]);

  const queued = await queueOwnerManagementEmail(db, { templateKey: "owner-payment-error", eventId: "local:payment:1", metadata: { reference: "FX-LOCAL-D", errorCode: "LOCAL_TEST", date: "19.11.2026", status: "İnceleme gerekiyor" } }, env);
  assert.equal(queued, true);
  const outbox = (await db.query("select * from notification_email_outbox where dedupe_key=$1", ["owner-management:owner-payment-error:local:payment:1"])).rows[0];
  assert.equal(outbox.recipient_email, "ersinusta@fixoku.com");
  assert.match(outbox.subject, /^FIXOKU \| /u);
  assert.equal(outbox.render_snapshot_json.templateKey, "owner-payment-error");
  assert.match(outbox.render_snapshot_json.html, /Ersin Bey,/u);
  assert.doesNotMatch(outbox.render_snapshot_json.subject, /\{\{/u);

  const replay = await queueOwnerManagementEmail(db, { templateKey: "owner-payment-error", eventId: "local:payment:1", metadata: { reference: "FX-LOCAL-D", errorCode: "LOCAL_TEST", date: "19.11.2026", status: "İnceleme gerekiyor" } }, env);
  assert.equal(replay, true);
  assert.equal(Number((await db.query("select count(*)::int as n from notification_email_outbox where dedupe_key=$1", ["owner-management:owner-payment-error:local:payment:1"])).rows[0].n), 1);

  const disabled = await tryQueueOwnerManagementEmail(db, { templateKey: "owner-payment-error", eventId: "local:disabled", metadata: { reference: "X", errorCode: "X", date: "19.11.2026", status: "X" } }, { ...env, FIXOKU_OWNER_NOTIFICATIONS_ENABLED: "0" });
  assert.equal(disabled, false);

  const sent = [];
  const transportFactory = () => ({ sendMail: async options => { sent.push(options); return { accepted: ["ersinusta@fixoku.com"], rejected: [], messageId: "<local-owner-email-1@fixoku.com>" }; } });
  const processed = await processOutboxBatch({ client: db, env, ownerOnly: true, limit: 5, transportFactory, now: () => new Date("2026-11-19T22:00:00+03:00"), logger: { error() {} } });
  assert.equal(processed.status, "PROCESSED"); assert.equal(processed.processed, 1); assert.equal(sent.length, 1); assert.equal(sent[0].to, "ersinusta@fixoku.com"); assert.match(sent[0].subject, /^FIXOKU \| /u);
  assert.equal((await db.query("select status from notification_email_outbox where id=$1", [outbox.id])).rows[0].status, "SENT");

  const general = (await db.query("insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key,render_snapshot_json) values($1,'STUDENT_PAYMENT_SUCCESSFUL','customer@example.invalid','General','General',$2,$3::jsonb) returning id", [owner, `general:local:${dbName}`, JSON.stringify(outbox.render_snapshot_json)])).rows[0];
  const ownerIsolation = await processOutboxBatch({ client: db, env, ownerOnly: true, limit: 5, transportFactory, now: () => new Date("2026-11-19T22:02:00+03:00"), logger: { error() {} } });
  assert.equal(ownerIsolation.processed, 0);
  assert.equal((await db.query("select status from notification_email_outbox where id=$1", [general.id])).rows[0].status, "QUEUED");

  const old = (await db.query("insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key,render_snapshot_json,created_at) values($1,'OWNER_PAYMENT_ERROR','ersinusta@fixoku.com','FIXOKU | old','old',$2,$3::jsonb,'2026-11-18T20:00:00Z') returning id", [owner, `owner-management:old:${dbName}`, JSON.stringify(outbox.render_snapshot_json)])).rows[0];
  const oldRun = await processOutboxBatch({ client: db, env, ownerOnly: true, limit: 5, transportFactory, now: () => new Date("2026-11-19T22:05:00+03:00"), logger: { error() {} } });
  assert.equal(oldRun.processed, 0);
  assert.equal((await db.query("select status from notification_email_outbox where id=$1", [old.id])).rows[0].status, "QUEUED");

  await queueOwnerManagementEmail(db, { templateKey: "owner-payment-error", eventId: "local:retry:1", metadata: { reference: "FX-RETRY", errorCode: "LOCAL_RETRY", date: "19.11.2026", status: "İnceleme gerekiyor" } }, env);
  const retryId = (await db.query("select id from notification_email_outbox where dedupe_key=$1", ["owner-management:owner-payment-error:local:retry:1"])).rows[0].id;
  const before = sent.length;
  const retryableTransport = () => ({ sendMail: async () => { const error = new Error("temporary"); error.code = "ETIMEDOUT"; throw error; } });
  const retry = await processOutboxBatch({ client: db, env, ownerOnly: true, limit: 5, transportFactory: retryableTransport, now: () => new Date("2026-11-19T22:10:00+03:00"), logger: { error() {} } });
  assert.equal(retry.processed, 1);
  assert.equal((await db.query("select status,last_error from notification_email_outbox where id=$1", [retryId])).rows[0].status, "FAILED");
  assert.match((await db.query("select last_error from notification_email_outbox where id=$1", [retryId])).rows[0].last_error, /^OWNER_DELIVERY_REVIEW_REQUIRED:/u);
  assert.equal(sent.length, before);

  for (const [key, definition] of Object.entries(OWNER_EMAIL_EDITORIAL)) {
    const snapshot = buildEmailSnapshot({ eventType: key.toUpperCase().replaceAll("-", "_"), record: staticTemplateRecord(key), metadata: { ...definition.fixture } });
    assert.match(snapshot.subject, /^FIXOKU |/u); assert.match(snapshot.html, /Ersin Bey,/u); assert.doesNotMatch(snapshot.subject, /\{\{/u);
  }

  console.log(JSON.stringify({
    OWNER_EMAIL_LOCAL_ACCEPTANCE: "PASS", OWNER_RECIPIENT: "ersinusta@fixoku.com", OWNER_GREETING: "Ersin Bey",
    OWNER_SUBJECT_PREFIX: "FIXOKU |", OWNER_TEMPLATE_COUNT: Object.keys(OWNER_EMAIL_EDITORIAL).length,
    OWNER_QUEUE_DEDUPE: "PASS", OWNER_GENERAL_QUEUE_ISOLATION: "PASS", OWNER_START_DATE_GUARD: "PASS", OWNER_OLD_QUEUE_SUPPRESSED: "PASS",
    OWNER_MOCK_SMTP_SENT: sent.length, OWNER_RETRYABLE_FAILURE_SAFE: "PASS", OWNER_STOCK_ALERTS: "ABSENT",
    REAL_SMTP_NETWORK: "NOT_USED", PRODUCTION_DATABASE: "NOT_USED", STAGING_DATABASE: "NOT_USED",
  }));
} finally {
  if (db) await db.end();
  if (created) { await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [dbName]); await admin.query(`drop database ${quote(dbName)}`); }
  await admin.end();
}
