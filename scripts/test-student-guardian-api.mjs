import assert from "node:assert/strict";
import pg from "pg";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const password = process.env.TEST_SEED_PASSWORD;
const databaseUrl = assertSafeSeedDatabaseUrl(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString: databaseUrl.toString() });
await pool.query("delete from rate_limit");
await pool.end();
const unauth = await fetch(`${origin}/api/student/portal-context`);
assert.equal(unauth.status, 401);

async function login(email) {
  const response = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200);
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  return (path = "") => fetch(`${origin}/api/student/portal-context${path}`, { headers: { cookie } });
}

const student = await login("student.phase1c@example.test");
let response = await student();
assert.equal(response.status, 200);
let body = await response.json();
assert.equal(body.role, "STUDENT");
assert.ok(body.context?.student?.name);
assert.ok(!body.enrollments.some((item) => item.program.title.includes("Eğitmen")));
assert.equal((await student("?studentId=not-owned")).status, 403);
assert.equal((await student("?userId=not-owned")).status, 200);

const guardian = await login("guardian.phase1c@example.test");
response = await guardian();
assert.equal(response.status, 200);
body = await response.json();
assert.equal(body.role, "GUARDIAN");
assert.ok(body.context?.student?.name);
assert.ok(!body.enrollments.some((item) => item.program.title.includes("Eğitmen")));
assert.equal((await guardian("?studentId=not-linked")).status, 403);
assert.equal((await guardian("?userId=not-linked")).status, 200);

const trainer = await login("trainer.phase1c@example.test");
assert.equal((await trainer()).status, 403);
console.log(JSON.stringify({ studentGuardianApi: "PASS", anonymous401: "PASS", trainer403: "PASS", crossStudentIdor: "PASS", queryOverridesIgnored: "PASS", guardianLinkAuthority: "REAL", localDatabaseGuard: "PASS" }));
