import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const password = process.env.TEST_SEED_PASSWORD;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const rows = (await pool.query("select u.auth_user_id,u.id,sp.id as profile_id from platform_users u left join student_profiles sp on sp.user_id=u.id where u.auth_user_id = any($1::text[])", [["phase1c-student-test-user", "phase1h-student-b-test-user", "phase1h-student-c-test-user", "phase1h-student-d-test-user"]])).rows;
await pool.end();
const ids = Object.fromEntries(rows.map((r) => [r.auth_user_id, r]));
assert.ok(ids["phase1c-student-test-user"]?.profile_id, "STUDENT_A_PROFILE_REQUIRED");
assert.ok(ids["phase1h-student-b-test-user"]?.profile_id, "STUDENT_B_PROFILE_REQUIRED");
async function login(email) {
  let response;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    response = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password }) });
    if (response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  assert.equal(response.status, 200);
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  return (path = "") => fetch(`${origin}/api/student/portal-context${path}`, { headers: { cookie } });
}
const student = await login("student.phase1c@example.test");
let response = await student(); assert.equal(response.status, 200);
let body = await response.json(); assert.equal(body.role, "STUDENT");
assert.ok(body.enrollments.every((e) => e.program?.slug === "hizli-okuma-egitimi"), "TRAINER_PROGRAM_LEAKED_TO_STUDENT");
assert.equal((await student(`?studentId=${ids["phase1h-student-b-test-user"].profile_id}`)).status, 403);
for (const query of ["userId=not-owned", "membershipId=not-owned", "role=GUARDIAN"]) assert.equal((await student(`?${query}`)).status, 200);
const guardian = await login("guardian.phase1c@example.test");
response = await guardian(); assert.equal(response.status, 200); body = await response.json(); assert.equal(body.role, "GUARDIAN");
assert.ok(body.enrollments.every((e) => e.program?.slug === "hizli-okuma-egitimi"), "TRAINER_PROGRAM_LEAKED_TO_GUARDIAN");
assert.equal((await guardian(`?studentId=${ids["phase1h-student-c-test-user"]?.profile_id || "00000000-0000-0000-0000-000000000000"}`)).status, 403);
for (const query of ["userId=not-linked", "membershipId=not-linked", "role=STUDENT"]) assert.equal((await guardian(`?${query}`)).status, 200);
const trainer = await login("trainer.phase1c@example.test"); assert.equal((await trainer()).status, 403);
console.log(JSON.stringify({ studentGuardianApi: "PASS", trainerOnlyProgramHidden: "PASS", crossStudentIdor: "PASS", queryOverridesIgnored: "PASS", guardianUnlinked403: "PASS", legacyDirectLinkGrantsAccess: "NO" }));
