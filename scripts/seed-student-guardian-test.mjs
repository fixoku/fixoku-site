import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
loadLocalEnv();
const url = assertSafeSeedDatabaseUrl(process.env.SEED_DATABASE_URL || (process.env.SEED_TARGET === "test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL));
const pool = new pg.Pool({ connectionString: url.toString() });
const client = await pool.connect();
try {
  await client.query("begin");
  const guardian = (await client.query("select id from platform_users where auth_user_id='phase1c-guardian-test-user'")).rows[0]?.id;
  assert.ok(guardian, "GUARDIAN_PRINCIPAL_REQUIRED");
  await client.query("insert into guardian_profiles(user_id,status) values($1,'ACTIVE') on conflict(user_id) do update set status='ACTIVE',updated_at=now()", [guardian]);
  for (const authId of ["phase1c-student-test-user", "phase1h-student-b-test-user"]) {
    const profile = (await client.query("select sp.id from student_profiles sp join platform_users u on u.id=sp.user_id where u.auth_user_id=$1 and sp.status='ACTIVE'", [authId])).rows[0]?.id;
    assert.ok(profile, `STUDENT_PROFILE_REQUIRED:${authId}`);
    await client.query("insert into guardian_student_relationships(guardian_user_id,student_profile_id,status) values($1,$2,'ACTIVE') on conflict(guardian_user_id,student_profile_id) do update set status='ACTIVE',updated_at=now()", [guardian, profile]);
  }
  await client.query("commit");
  console.log(JSON.stringify({ guardianProfile: "PASS", relationships: "A,B", productionGuard: "PASS", database: url.pathname }));
} catch (e) { await client.query("rollback"); throw e; } finally { client.release(); await pool.end(); }
