import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();

// Validate deployment and URL guardrails before hashing or opening a connection.
const url = process.env.SEED_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const parsedUrl = assertSafeSeedDatabaseUrl(url);
const password = process.env.TEST_SEED_PASSWORD;
assert.ok(typeof password === "string" && password.length >= 12, "TEST_SEED_PASSWORD must be at least 12 characters");

const principals = [
  { key: "super-admin", id: "phase1c-super-admin-test-user", email: "super-admin.phase1c@example.test", name: "Fixoku Test Super Admin", role: "SUPER_ADMIN", scope: "GLOBAL" },
  { key: "trainer", id: "phase1c-trainer-test-user", email: "trainer.phase1c@example.test", name: "Phase 1C Trainer", role: "TRAINER", scope: "TRAINER" },
  { key: "student", id: "phase1c-student-test-user", email: "student.phase1c@example.test", name: "ERSİN", role: "STUDENT", scope: "STUDENT" },
  { key: "guardian", id: "phase1c-guardian-test-user", email: "guardian.phase1c@example.test", name: "Ersin Velisi", role: "GUARDIAN", scope: "STUDENT" },
];

const pool = new pg.Pool({ connectionString: parsedUrl.toString(), max: 2 });
const client = await pool.connect();
const createdMemberships = [];
try {
  await client.query("begin");
  for (const principal of principals) {
    const passwordHash = await hashPassword(password);
    await client.query(
      'insert into "user" (id, name, email, email_verified, created_at, updated_at) values ($1,$2,$3,true,now(),now()) on conflict (id) do update set name=excluded.name, email=excluded.email, email_verified=true, updated_at=now()',
      [principal.id, principal.name, principal.email],
    );
    await client.query(
      "insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values ($1,$2,'credential',$3,$4,now(),now()) on conflict (id) do update set password=excluded.password, updated_at=now()",
      [`${principal.id}-credential`, principal.id, principal.id, passwordHash],
    );
    const platformUser = await client.query(
      "insert into platform_users (id, auth_user_id, email, display_name, email_verified) values (gen_random_uuid(),$1,$2,$3,true) on conflict (email) do update set auth_user_id=excluded.auth_user_id, display_name=excluded.display_name, email_verified=true, updated_at=now() returning id",
      [principal.id, principal.email, principal.name],
    );
    const platformUserId = platformUser.rows[0].id;
    const scopeTarget = principal.role === "GUARDIAN"
      ? (await client.query("select id from platform_users where auth_user_id=$1", ["phase1c-student-test-user"])).rows[0]?.id
      : principal.role === "SUPER_ADMIN" ? null : platformUserId;
    const existing = await client.query(
      "select id, scope_id from platform_memberships where user_id=$1 and scope_type=$2 and role=$3 limit 1",
      [platformUserId, principal.scope, principal.role],
    );
    if (existing.rowCount) {
      if (scopeTarget && !existing.rows[0].scope_id) await client.query("update platform_memberships set scope_id=$1, updated_at=now() where id=$2", [scopeTarget, existing.rows[0].id]);
      continue;
    }
    const membership = await client.query(
      "insert into platform_memberships (user_id, scope_type, scope_id, role, status) values ($1,$2,$3,$4,'ACTIVE') returning id",
      [platformUserId, principal.scope, scopeTarget, principal.role],
    );
    const correlationId = `${principal.key}-${Date.now()}-${randomUUID()}`;
    await client.query(
      "insert into platform_audit_events (actor_user_id, action, subject_type, subject_id, result, correlation_id, metadata_json) values ($1,'membership.create','platform_membership',$2,'SUCCESS',$3,$4)",
      [platformUserId, membership.rows[0].id, correlationId, JSON.stringify({ role: principal.role, scopeType: principal.scope })],
    );
    createdMemberships.push(principal.role);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}

console.log(JSON.stringify({ seed: "PASS", principals: principals.length, membershipsCreated: createdMemberships.length, password: "REDACTED", productionGuard: "PASS" }));
