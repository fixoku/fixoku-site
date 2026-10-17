import assert from "node:assert/strict";
import pg from "pg";
import crypto from "node:crypto";
import { loadLocalEnv } from "./local-env.mjs";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { consumeLifecycleMail, clearLifecycleMail } from "../src/server/domain/test-email-capture.js";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();
process.env.NODE_ENV = "test";
process.env.BETTER_AUTH_TEST_MAIL_SINK = "1";
process.env.EMAIL_PROVIDER = "DISABLED";
process.env.APP_ORIGIN = "http://127.0.0.1:5173";
// Track pools opened by in-process auth so cleanup can close them before DROP.
const pools = new Set();
const originalConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function (...args) { pools.add(this); return originalConnect.apply(this, args); };
const origin = process.env.APP_ORIGIN;
const email = "release009-student@example.invalid";
const password = "Release009-Disposable-Password!";
let exitCode = 0;
function response() {
  const result = { statusCode: 200, body: null };
  return { result, set statusCode(value) { result.statusCode = value; }, setHeader() {}, end(value) { result.body = value ? JSON.parse(value) : null; } };
}
try {
  const { default: account } = await import("../api/account-lifecycle.js");
  const { default: publicAuth } = await import("../api/auth/[...all].js");
  const { auth } = await import("../src/server/auth/auth.js");
  for (const url of ["/api/auth/sign-up/email", "/api/auth/sign-up/email/", "/api/auth/sign-up%2Femail"]) {
    const denied = response();
    publicAuth({ method: "POST", url }, denied);
    assert.equal(denied.result.statusCode, 403, "public signup must stay disabled");
  }
  clearLifecycleMail();
  const registered = response();
  await account({ method: "POST", url: "/api/account-lifecycle/register", body: {
    firstName: "Sentetik", lastName: "Öğrenci", email, password,
    phone: "+905000000000", school: "Sentetik Lise", educationStage: "HIGH", grade: "9",
    city: "İzmir", district: "Konak", acceptTerms: true, acceptKvkk: true, marketingConsent: false,
  } }, registered);
  assert.equal(registered.result.statusCode, 201, "controlled registration");
  const mail = consumeLifecycleMail((item) => item.kind === "verification" && item.to === email);
  assert.ok(mail?.url, "verification captured in process");
  const token = new URL(mail.url).searchParams.get("token");
  assert.ok(token, "verification token exists");
  const verified = response();
  await account({ method: "GET", url: `/api/account-lifecycle/verify-email?token=${encodeURIComponent(token)}`, headers: { origin } }, verified);
  assert.equal(verified.result.statusCode, 200, "email verification must return success");
  const profile = (await disposable.pool.query("select u.email_verified,m.role,sp.education_stage,sp.grade from platform_users u join platform_memberships m on m.user_id=u.id join student_profiles sp on sp.user_id=u.id where u.email=$1", [email])).rows[0];
  assert.equal(profile.email_verified, true);
  assert.equal(profile.role, "STUDENT");
  assert.equal(profile.education_stage, "HIGH");
  assert.equal(profile.grade, "9");
  const login = async (nextPassword) => auth.handler(new Request("http://local/api/auth/sign-in/email", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email, password: nextPassword }) }));
  const signedIn = await login(password);
  assert.equal(signedIn.status, 200, "verified user login");
  const cookie = signedIn.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  const signedOut = await auth.handler(new Request("http://local/api/auth/sign-out", { method: "POST", headers: { origin, cookie } }));
  assert.equal(signedOut.status, 200, "logout");
  clearLifecycleMail();
  const requested = response();
  await account({ method: "POST", url: "/api/account-lifecycle/password-reset-request", body: { email } }, requested);
  const resetMail = consumeLifecycleMail((item) => item.kind === "reset" && item.to === email);
  assert.ok(resetMail?.url, "reset mail captured without SMTP");
  const resetToken = new URL(resetMail.url).pathname.split("/").at(-1);
  const nextPassword = "Release009-Reset-Password!";
  const reset = await auth.handler(new Request("http://local/api/auth/reset-password", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ token: resetToken, newPassword: nextPassword }) }));
  assert.equal(reset.status, 200, "password reset");
  const relogin = await login(nextPassword);
  assert.equal(relogin.status, 200, "new password login");
  const invitationToken = crypto.randomBytes(32).toString("base64url");
  const invitationHash = crypto.createHash("sha256").update(invitationToken).digest("hex");
  const trainerEmail = "release009-trainer@example.invalid";
  await disposable.pool.query("insert into trainer_applications(first_name,last_name,email,status,legal_acknowledged,invitation_token_hash,invitation_expires_at) values('Sentetik','Eğitmen',$1,'APPROVED',true,$2,now()+interval '1 hour')", [trainerEmail, invitationHash]);
  const { default: acceptInvitation } = await import("../api/invitation-accept.js");
  const invited = response();
  const inviteRequest = { method: "POST", url: "/api/account-lifecycle/trainer-invitation-accept", body: { token: invitationToken, password } };
  await acceptInvitation(inviteRequest, invited);
  assert.equal(invited.result.statusCode, 200, `trainer invitation activation status=${invited.result.statusCode} error=${invited.result.body?.error || "none"}`);
  const trainerRoles = (await disposable.pool.query("select m.role,m.status from platform_memberships m join platform_users u on u.id=m.user_id where u.email=$1 and m.status='ACTIVE'", [trainerEmail])).rows;
  assert.deepEqual(trainerRoles.map((row) => row.role), ["TRAINER"]);
  const replay = response();
  await acceptInvitation(inviteRequest, replay);
  assert.equal(replay.result.statusCode, 400, "invitation token reuse denied");
  console.log(JSON.stringify({ PUBLIC_SIGNUP_DENIED: "PASS", CONTROLLED_STUDENT_REGISTRATION: "PASS", EMAIL_VERIFICATION_SYNC: "PASS", LOGIN: "PASS", LOGOUT: "PASS", PASSWORD_RESET: "PASS", RELOGIN: "PASS", TRAINER_INVITATION: "PASS", INVITATION_REUSE_DENIED: "PASS", REAL_EMAIL_SENT: 0, DATABASE_ISOLATION: "DISPOSABLE_ONLY" }));
} catch (error) {
  exitCode = 1;
  console.log(JSON.stringify({ AUTH_ACCEPTANCE: "FAIL", check: error instanceof assert.AssertionError ? error.message.split("\n", 1)[0] : "harness failure", errorClass: error?.code || error?.name || "UNKNOWN" }));
} finally {
  pg.Pool.prototype.connect = originalConnect;
  for (const pool of pools) if (pool !== disposable.pool && !pool.ended && !pool.ending) await pool.end();
  await disposable.dispose();
}
process.exitCode = exitCode;
