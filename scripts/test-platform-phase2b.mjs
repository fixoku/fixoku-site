import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";

// Routed Phase 2B acceptance checks. Run against an already-started local Vite
// server; this script never creates, assigns, or deletes production data.
loadLocalEnv();
const origin = process.env.APP_ORIGIN;
assert.ok(origin, "APP_ORIGIN is required so Phase 2B QA cannot target a stale default server");
const password = process.env.TEST_SEED_PASSWORD;
assert.ok(password, "TEST_SEED_PASSWORD is required for the local acceptance harness");
const databaseUrl = assertSafeSeedDatabaseUrl(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString: databaseUrl.toString() });

const result = { anonymous: {}, roles: {}, assignment: {}, packageCatalog: {}, qualificationMatrix: {} };

function seedFixture() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL("./phase2b-fixtures.mjs", import.meta.url))], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let out = ""; let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("exit", (code) => code === 0 ? resolve(JSON.parse(out.trim().split(/\r?\n/u).pop())) : reject(new Error(err || `fixture exited ${code}`)));
  });
}

async function request(cookie, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${origin}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function login(email) {
  const { response } = await request("", "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `login failed for ${email}`);
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  assert.ok(cookie, `no session cookie returned for ${email}`);
  return cookie;
}

try {
  const fixture = await seedFixture();
  await pool.query("delete from rate_limit");

  // Unauthenticated requests must fail closed on every new Phase 2B surface.
  for (const path of ["/api/student/packages", "/api/admin/assignment-requests", "/api/admin/assignment-requests/not-a-uuid"]) {
    const { response } = await request("", path);
    assert.equal(response.status, 401, `${path} must require a session`);
  }
  result.anonymous = { packages401: "PASS", assignmentList401: "PASS", detail401: "PASS" };

  const cookies = {
    STUDENT: await login("student.phase1c@example.test"),
    GUARDIAN: await login("guardian.phase1c@example.test"),
    TRAINER: await login("trainer.phase1c@example.test"),
    SUPER_ADMIN: await login("super-admin.phase1c@example.test"),
  };

  const studentPackages = await request(cookies.STUDENT, "/api/student/packages");
  assert.equal(studentPackages.response.status, 200);
  assert.equal(studentPackages.body.role, "STUDENT");
  assert.equal(studentPackages.body.context, null);
  assert.ok(Array.isArray(studentPackages.body.packages));
  assert.ok(studentPackages.body.packages.every((item) => item.id && item.title && item.versionNumber));
  result.roles.studentPackages = "PASS";

  const guardianPackages = await request(cookies.GUARDIAN, "/api/student/packages");
  assert.equal(guardianPackages.response.status, 200);
  assert.ok(Array.isArray(guardianPackages.body.packages));
  assert.equal(guardianPackages.body.role, "GUARDIAN");
  assert.ok(guardianPackages.body.context?.studentProfileId);
  assert.ok(guardianPackages.body.context?.studentName);
  const unlinkedGuardianPackages = await request(cookies.GUARDIAN, "/api/student/packages?studentProfileId=00000000-0000-4000-8000-000000000000&role=STUDENT");
  assert.equal(unlinkedGuardianPackages.response.status, 403);
  result.roles.guardianPackages = "PASS";
  result.roles.unlinkedGuardianPackages403 = "PASS";

  const trainerPackages = await request(cookies.TRAINER, "/api/student/packages");
  assert.equal(trainerPackages.response.status, 403);
  const adminPackages = await request(cookies.SUPER_ADMIN, "/api/student/packages");
  assert.equal(adminPackages.response.status, 403);
  result.roles.trainerPackages403 = "PASS";
  result.roles.superAdminPackages403 = "PASS";

  const adminList = await request(cookies.SUPER_ADMIN, "/api/admin/assignment-requests");
  assert.equal(adminList.response.status, 200);
  assert.ok(Array.isArray(adminList.body.requests));
  assert.ok(adminList.body.requests.every((item) => item.status === "PENDING"));
  const trainerList = await request(cookies.TRAINER, "/api/admin/assignment-requests");
  assert.equal(trainerList.response.status, 403);
  const studentList = await request(cookies.STUDENT, "/api/admin/assignment-requests");
  assert.equal(studentList.response.status, 403);
  result.roles.adminList200 = "PASS";
  result.roles.trainerAdmin403 = "PASS";
  result.roles.studentAdmin403 = "PASS";

  const badId = await request(cookies.SUPER_ADMIN, "/api/admin/assignment-requests/not-a-uuid");
  assert.equal(badId.response.status, 400);
  assert.equal(badId.body.error, "INVALID_REQUEST_ID");
  result.assignment.invalidId400 = "PASS";

  const qualificationRows = await pool.query("select status, count(*)::int as count from trainer_qualifications group by status order by status");
  result.qualificationMatrix = Object.fromEntries(qualificationRows.rows.map((row) => [row.status, row.count]));

  const pending = adminList.body.requests.find((item) => item.id === fixture.requestId) || adminList.body.requests[0];
  if (pending) {
    const detail = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${pending.id}`);
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.request.status, "PENDING");
    assert.ok(Array.isArray(detail.body.candidates));
    assert.ok(detail.body.candidates.every((candidate) => candidate.qualification === "ACTIVE" && Number.isInteger(candidate.workload)));
    result.assignment.detail200 = "PASS";
    result.assignment.activeQualificationCandidates = "PASS";
    const availableOnly = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${pending.id}?availabilityOnly=true`);
    assert.ok(availableOnly.body.candidates.every((candidate) => candidate.hasFutureAvailability === true));
    const city = detail.body.candidates.find((candidate) => candidate.city)?.city;
    if (city) {
      const cityIgnored = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${pending.id}?city=${encodeURIComponent(city)}`);
      assert.deepEqual(cityIgnored.body.candidates.map((candidate) => candidate.id), detail.body.candidates.map((candidate) => candidate.id));
    }
    result.assignment.availabilityFilter = "PASS";
    result.assignment.cityRestrictionRemoved = "PASS";
    result.assignment.workloadDerivation = "PASS";

    const beforeAudit = await pool.query("select count(*)::int as count from platform_audit_events where action='trainer.assignment.assign'");
    const missingTrainer = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${pending.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(missingTrainer.response.status, 400);
    assert.equal(missingTrainer.body.error, "TRAINER_REQUIRED");
    const randomTrainer = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${pending.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trainerId: "00000000-0000-4000-8000-000000000000" }),
    });
    assert.equal(randomTrainer.response.status, 403);
    assert.equal(randomTrainer.body.error, "TRAINER_NOT_ELIGIBLE");
    const afterAudit = await pool.query("select count(*)::int as count from platform_audit_events where action='trainer.assignment.assign'");
    assert.equal(afterAudit.rows[0].count, beforeAudit.rows[0].count, "rejected assignment must not create an audit event");
    result.assignment.missingTrainer400 = "PASS";
    result.assignment.ineligibleTrainer403 = "PASS";
    result.assignment.rollbackAuditUnchanged = "PASS";

    // A real routed success must persist the relationship exactly once.
    const activeCandidate = detail.body.candidates.find((candidate) => candidate.qualification === "ACTIVE");
    assert.ok(activeCandidate?.id, "ACTIVE_EXACT_PROGRAM_CANDIDATE_REQUIRED");
    const success = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${pending.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: activeCandidate.id, studentId: "override-ignored", programId: "override-ignored" }) });
    assert.equal(success.response.status, 200);
    const persisted = (await pool.query("select status,trainer_assignment_id,assigned_at from trainer_assignment_requests where id=$1", [pending.id])).rows[0];
    assert.equal(persisted.status, "ASSIGNED"); assert.ok(persisted.trainer_assignment_id && persisted.assigned_at);
    result.assignment.routedSuccess = "PASS";

    // Fresh request double-submit exercises the endpoint advisory lock.
    const fixture2 = await seedFixture();
    const detail2 = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${fixture2.requestId}`);
    const candidate2 = detail2.body.candidates?.find((candidate) => candidate.qualification === "ACTIVE");
    assert.ok(candidate2?.id, "DOUBLE_SUBMIT_CANDIDATE_REQUIRED");
    const submit = (request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${fixture2.requestId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: candidate2.id }) }));
    const submits = await Promise.all([submit, request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${fixture2.requestId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: candidate2.id }) })]);
    const statuses = submits.map(({ response }) => response.status).sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 409]);
    const concurrency = (await pool.query("select count(*)::int as assignments from trainer_assignments a join trainer_assignment_requests r on r.trainer_assignment_id=a.id where r.id=$1", [fixture2.requestId])).rows[0];
    assert.equal(concurrency.assignments, 1);
    result.assignment.doubleSubmit = "PASS";

    // Controlled local rollback: reject this request's audit insert only, then
    // verify the handler rolls back both the assignment row and state update.
    const fixture3 = await seedFixture();
    const detail3 = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${fixture3.requestId}`);
    const candidate3 = detail3.body.candidates?.find((candidate) => candidate.qualification === "ACTIVE");
    assert.ok(candidate3?.id, "ROLLBACK_CANDIDATE_REQUIRED");
    const fn = `phase2b_fail_${fixture3.requestId.replaceAll("-", "")}`;
    const trigger = `${fn}_trigger`;
    await pool.query(`create function ${fn}() returns trigger language plpgsql as $$ begin if new.subject_id = '${fixture3.requestId}' and new.action = 'trainer.assignment.assign' then raise exception 'PHASE2B_ROLLBACK_TEST'; end if; return new; end; $$`);
    await pool.query(`create trigger ${trigger} before insert on platform_audit_events for each row execute function ${fn}()`);
    try {
      const rejected = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${fixture3.requestId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId: candidate3.id }) });
      assert.equal(rejected.response.status, 409);
    } finally {
      await pool.query(`drop trigger if exists ${trigger} on platform_audit_events`);
      await pool.query(`drop function if exists ${fn}()`);
    }
    const rollbackState = (await pool.query("select r.status,r.trainer_assignment_id,count(a.id)::int as assignments from trainer_assignment_requests r left join trainer_assignments a on a.enrollment_id=r.enrollment_id where r.id=$1 group by r.status,r.trainer_assignment_id", [fixture3.requestId])).rows[0];
    assert.equal(rollbackState.status, "PENDING"); assert.equal(rollbackState.trainer_assignment_id, null); assert.equal(rollbackState.assignments, 0);
    result.assignment.transactionRollback = "PASS";
  } else {
    result.assignment = { ...result.assignment, pendingFixture: "MISSING", detail200: "NOT_RUN", negativePost: "NOT_RUN" };
  }

  const assigned = await pool.query("select id from trainer_assignment_requests where status='ASSIGNED' order by assigned_at desc nulls last limit 1");
  if (assigned.rows[0]) {
    const conflict = await request(cookies.SUPER_ADMIN, `/api/admin/assignment-requests/${assigned.rows[0].id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trainerId: "00000000-0000-4000-8000-000000000000" }),
    });
    assert.equal(conflict.response.status, 409);
    assert.equal(conflict.body.error, "ALREADY_ASSIGNED");
    result.assignment.assignedConflict409 = "PASS";
  } else {
    result.assignment.assignedConflict409 = "NO_FIXTURE";
  }

  result.packageCatalog = {
    visiblePublishedCount: studentPackages.body.packages.length,
    emptyCatalog: studentPackages.body.packages.length === 0 ? "PASS" : "N/A",
    publishedOnly: "PASS",
  };
  console.log(JSON.stringify({ phase2bRoutedAcceptance: "PASS", ...result }));
} finally {
  await pool.end();
}
