import assert from "node:assert/strict";
import http from "node:http";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { loadLocalEnv } from "./local-env.mjs";
import { createDisposableDatabase } from "./disposable-test-db.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "LOCAL_DATABASE_URL_REQUIRED");

const disposable = await createDisposableDatabase(sourceUrl);
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();
process.env.APP_ORIGIN = "http://127.0.0.1:5173";
process.env.BETTER_AUTH_URL = process.env.APP_ORIGIN;
process.env.BETTER_AUTH_SECRET = "R90I-local-auth-regression-secret-20261024";
process.env.NODE_ENV = "test";
process.env.LOCAL_REVIEW_MODE = "0";
process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA = "1";
process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA = "0";
delete process.env.FIXOKU_TRAINER_CANDIDATE_ENABLED;
process.env.EMAIL_PROVIDER = "DISABLED";
process.env.BETTER_AUTH_TEST_MAIL_SINK = "1";

const trackedPools = new Set();
const originalConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function trackedConnect(...args) {
  trackedPools.add(this);
  return originalConnect.apply(this, args);
};

const password = "R90I-Auth-Regression-Password!";
const origin = process.env.APP_ORIGIN;
const pool = disposable.pool;
const appIds = [];

async function createPrincipal({ key, email, role, emailVerified = true }) {
  const authId = `r90i-${key}-auth`;
  const platform = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values($1,$2,$3,$4) returning id`,
    [authId, email, `R90I ${key}`, emailVerified],
  )).rows[0];
  const passwordHash = await hashPassword(password);
  await pool.query(
    `insert into "user"(id,name,email,email_verified,created_at,updated_at)
     values($1,$2,$3,$4,now(),now())`,
    [authId, `R90I ${key}`, email, emailVerified],
  );
  await pool.query(
    `insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at)
     values($1,$2,'credential',$2,$3,now(),now())`,
    [`${authId}-credential`, authId, passwordHash],
  );
  if (role) {
    const scopeType = role === "OWNER" ? "GLOBAL" : role;
    const scopeId = role === "OWNER" ? null : platform.id;
    await pool.query(
      `insert into platform_memberships(user_id,scope_type,scope_id,role,status)
       values($1,$2,$3,$4,'ACTIVE')`,
      [platform.id, scopeType, scopeId, role],
    );
  }
  return platform.id;
}

function responseAdapter() {
  const result = { statusCode: 200, headers: {}, body: "" };
  return {
    result,
    set statusCode(value) { result.statusCode = value; },
    setHeader(name, value) { result.headers[String(name).toLowerCase()] = value; },
    end(value = "") { result.body = String(value); },
  };
}

function splitSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const raw = response.headers.get("set-cookie");
  return raw ? raw.split(/,\s*(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u) : [];
}

function applyCookies(jar, response) {
  for (const cookie of splitSetCookies(response)) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (value) jar.set(name, value); else jar.delete(name);
  }
}

const jars = new Map();
async function request(originUrl, route, options = {}, jarName = "anonymous") {
  const jar = jars.get(jarName) || new Map();
  jars.set(jarName, jar);
  const headers = new Headers(options.headers || {});
  headers.set("origin", originUrl);
  headers.set("x-fixoku-local-review-proof", process.env.BETTER_AUTH_SECRET);
  if (jar.size) headers.set("cookie", [...jar].map(([name, value]) => `${name}=${value}`).join("; "));
  const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { ...options, headers });
  applyCookies(jar, response);
  return { response, body: await response.json().catch(() => ({})), hasCookie: jar.size > 0 };
}

let server;
try {
  await createPrincipal({ key: "owner", email: "ersin@fixoku.com", role: "OWNER" });
  await createPrincipal({ key: "trainer", email: "r90i-trainer@example.test", role: "TRAINER" });
  const candidateId = await createPrincipal({ key: "candidate", email: "r90i-candidate@example.test", role: null, emailVerified: true });
  const pendingCandidateId = await createPrincipal({ key: "pending-candidate", email: "r90i-pending@example.test", role: null, emailVerified: false });
  const studentId = await createPrincipal({ key: "student", email: "r90i-student@example.test", role: "STUDENT" });
  for (const [platformId, email, emailVerified] of [[candidateId, "r90i-candidate@example.test", true], [pendingCandidateId, "r90i-pending@example.test", false]]) {
    const app = (await pool.query(
      `insert into trainer_applications(first_name,last_name,email,status,legal_acknowledged,candidate_user_id)
       values('R90I','Candidate',$1,'RECEIVED',true,$2) returning id`,
      [email, platformId],
    )).rows[0];
    appIds.push(app.id);
    await pool.query(`update platform_users set email_verified=$1 where id=$2`, [emailVerified, platformId]);
  }

  const { default: ownerSignIn } = await import("../api/owner-sign-in.js");
  const { default: platformSignIn } = await import("../api/platform-sign-in.js");
  const { default: panelContext } = await import("../api/panel-context.js");
  const { default: trainerCandidate } = await import("../api/trainer-candidate.js");
  const routes = new Map([
    ["/api/owner-sign-in", ownerSignIn],
    ["/api/platform-sign-in", platformSignIn],
    ["/api/panel-context", panelContext],
    ["/api/trainer-candidate", trainerCandidate],
  ]);
  server = http.createServer((request_, response_) => {
    const pathname = new URL(request_.url || "/", "http://local").pathname;
    const handler = routes.get(pathname);
    if (!handler) { response_.statusCode = 404; response_.end(); return; }
    Promise.resolve(handler(request_, response_)).catch(() => { if (!response_.writableEnded) { response_.statusCode = 503; response_.end(JSON.stringify({ error: "HARNESS_HANDLER_FAILED" })); } });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const anonymous = await request(origin, "/api/panel-context?panel=%2Fpanel%2Fegitmen");
  assert.equal(anonymous.response.status, 401);

  const owner = await request(origin, "/api/owner-sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ersin@fixoku.com", password }),
  }, "owner");
  assert.equal(owner.response.status, 200, JSON.stringify(owner.body));
  assert.equal(owner.hasCookie, true);
  const ownerContext = await request(origin, "/api/panel-context?panel=%2Fpanel%2Fowner", {}, "owner");
  assert.equal(ownerContext.response.status, 200, JSON.stringify(ownerContext.body));
  assert.ok(ownerContext.body.roles.includes("OWNER"));

  const trainer = await request(origin, "/api/platform-sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "r90i-trainer@example.test", password }),
  }, "trainer");
  assert.equal(trainer.response.status, 200, JSON.stringify(trainer.body));
  assert.equal(trainer.hasCookie, true);
  const trainerContext = await request(origin, "/api/panel-context?panel=%2Fpanel%2Fegitmen", {}, "trainer");
  assert.equal(trainerContext.response.status, 200, JSON.stringify(trainerContext.body));
  assert.deepEqual(trainerContext.body.roles, ["TRAINER"]);

  const candidate = await request(origin, "/api/platform-sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "r90i-candidate@example.test", password }),
  }, "candidate");
  assert.equal(candidate.response.status, 200, JSON.stringify(candidate.body));
  assert.equal(candidate.hasCookie, true);
  const candidatePanel = await request(origin, "/api/panel-context?panel=%2Fpanel%2Fegitmen", {}, "candidate");
  assert.equal(candidatePanel.response.status, 403);
  const candidateProfile = await request(origin, "/api/trainer-candidate?action=profile", {}, "candidate");
  assert.equal(candidateProfile.response.status, 200, JSON.stringify(candidateProfile.body));
  assert.equal(candidateProfile.body.ownerApproved, false);

  const pending = await request(origin, "/api/platform-sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "r90i-pending@example.test", password }),
  }, "pending");
  assert.equal(pending.response.status, 200, JSON.stringify(pending.body));
  assert.equal(pending.hasCookie, true);
  const pendingPanel = await request(origin, "/api/panel-context?panel=%2Fpanel%2Fegitmen", {}, "pending");
  assert.equal(pendingPanel.response.status, 403);
  const pendingProfile = await request(origin, "/api/trainer-candidate?action=profile", {}, "pending");
  assert.equal(pendingProfile.response.status, 403);
  assert.equal(pendingProfile.body.error, "EMAIL_VERIFICATION_REQUIRED");

  const unauthorized = await request(origin, "/api/platform-sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "r90i-trainer@example.test", password: "wrong-password" }),
  }, "unauthorized");
  assert.equal(unauthorized.response.status, 401);
  const student = await request(origin, "/api/platform-sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "r90i-student@example.test", password }),
  }, "student");
  assert.equal(student.response.status, 200);
  const studentPanelAfterLogin = await request(origin, "/api/panel-context?panel=%2Fpanel%2Fegitmen", {}, "student");
  assert.equal(studentPanelAfterLogin.response.status, 403);

  const { privilegedTwoFactorRequired, requireMembership } = await import("../src/server/auth/authorization.js");
  const ownerPrincipal = { memberships: [{ role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
  const superAdminPrincipal = { memberships: [{ role: "SUPER_ADMIN", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
  const studentPrincipal = { memberships: [{ role: "STUDENT", status: "ACTIVE", scopeType: "STUDENT", scopeId: "student" }], session: { user: { twoFactorEnabled: false } } };
  assert.equal(privilegedTwoFactorRequired(ownerPrincipal), false);
  assert.equal(privilegedTwoFactorRequired(superAdminPrincipal), true);
  assert.deepEqual(requireMembership(ownerPrincipal, "OWNER"), null);
  assert.equal(requireMembership(studentPrincipal, "OWNER")?.body?.error, "FORBIDDEN");

  console.log(JSON.stringify({
    OWNER_LOGIN: "PASS_EMAIL_PASSWORD_ONLY",
    TRAINER_LOGIN: "PASS_COOKIE_AND_PANEL_CONTEXT",
    TRAINER_CANDIDATE_LOGIN: "PASS_VERIFIED_SCOPED_200_PENDING_EMAIL_VERIFICATION_SCOPED_403",
    SESSION_COOKIE: "PASS_PLATFORM_PROXY_FORWARDS_SET_COOKIE",
    ROLE_SECURITY: "PASS_OWNER_OVERRIDE_ONLY_SUPER_ADMIN_2FA_PRESERVED",
    REGRESSION_TESTS: "PASS_DISPOSABLE_POSTGRES",
    DATABASE_ISOLATION: disposable.databaseName,
    UNAUTHORIZED: "PASS_401_AND_PANEL_403",
  }));
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  for (const poolToClose of trackedPools) if (poolToClose !== disposable.pool && !poolToClose.ended && !poolToClose.ending) await poolToClose.end();
  pg.Pool.prototype.connect = originalConnect;
  await disposable.dispose();
}
