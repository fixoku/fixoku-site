import assert from "node:assert/strict";
import fs from "node:fs";
import { privilegedTwoFactorRequired, requireMembership } from "../src/server/auth/authorization.js";

const owner = { user: { id: "owner" }, memberships: [{ role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
const superAdmin = { user: { id: "admin" }, memberships: [{ role: "SUPER_ADMIN", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
const student = { user: { id: "student" }, memberships: [{ role: "STUDENT", status: "ACTIVE", scopeType: "STUDENT", scopeId: "student" }], session: { user: { twoFactorEnabled: false } } };
const previous = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV, VERCEL: process.env.VERCEL, FIXOKU_REQUIRE_PRIVILEGED_2FA: process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA, FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA: process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA, LOCAL_REVIEW_MODE: process.env.LOCAL_REVIEW_MODE };
try {
  process.env.NODE_ENV = "production";
  process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA = "1";
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL;
  delete process.env.LOCAL_REVIEW_MODE;
  process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA = "0";
  delete process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA;
  assert.equal(privilegedTwoFactorRequired(owner), true, "R82_GLOBAL_ZERO_DOES_NOT_WEAKEN_PRODUCTION");
  process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA = "0";
  assert.equal(privilegedTwoFactorRequired(owner), false, "R82_OWNER_PASSWORD_ONLY_CONFIG");
  assert.equal(requireMembership(owner, "OWNER"), null, "R82_OWNER_MEMBERSHIP_GATE");
  assert.equal(privilegedTwoFactorRequired(superAdmin), true, "R82_SUPER_ADMIN_2FA_PRESERVED");
  assert.deepEqual(requireMembership(student, "OWNER"), { status: 403, body: { error: "FORBIDDEN" } }, "R82_STUDENT_OWNER_REJECTED");
  assert.deepEqual(requireMembership(null, "OWNER"), { status: 401, body: { error: "UNAUTHENTICATED" } }, "R82_ANONYMOUS_OWNER_REJECTED");

  const login = fs.readFileSync(new URL("../src/pages/OwnerPrivateLogin.jsx", import.meta.url), "utf8");
  assert.match(login, /owner-private-email/u);
  assert.match(login, /owner-private-password/u);
  assert.match(login, /Giriş Yap/u);
  for (const forbidden of ["twoFactorRedirect", "owner-2fa", "Authenticator", "TOTP", "QR", "6 haneli", "Şifremi unuttum", "sifremi-unuttum"]) assert.doesNotMatch(login, new RegExp(forbidden, "iu"), `R82_OWNER_UI_FORBIDDEN:${forbidden}`);
  const route = fs.readFileSync(new URL("../api/owner-sign-in.js", import.meta.url), "utf8");
  assert.match(route, /ownerAuth/u);
  assert.match(route, /requireApplicationOrigin/u);
  assert.match(route, /OWNER_AUTH_ORIGIN_UNAVAILABLE/u);
  assert.doesNotMatch(route, /https:\/\/fixoku\.com/u);
  assert.match(route, /OWNER_MEMBERSHIP_REQUIRED/u);
  assert.match(route, /scope_type='GLOBAL'/u);
  assert.match(route, /role='OWNER'/u);
  assert.match(route, /sign-out/u);
  assert.doesNotMatch(route, /local-review|switch-user|FIXOKU_LOCAL_OWNER/u);
  const auth = fs.readFileSync(new URL("../src/server/auth/auth.js", import.meta.url), "utf8");
  assert.match(auth, /export const auth = betterAuth\(\{ \.\.\.authOptions, plugins: \[twoFactor/u);
  assert.match(auth, /export const ownerAuth = betterAuth\(\{ \.\.\.authOptions, plugins: \[\] \}/u);
  console.log(JSON.stringify({
    OWNER_PASSWORD_ONLY_AUTHORITY: "PASS",
    OWNER_MEMBERSHIP_GATE: "PASS",
    SUPER_ADMIN_2FA_PRESERVED: "PASS",
    GLOBAL_ZERO_PRODUCTION_SAFE: "PASS",
    STUDENT_OWNER_REJECTED: "PASS",
    ANONYMOUS_OWNER_REJECTED: "PASS",
    OWNER_UI_EMAIL_PASSWORD_ONLY: "PASS",
    LOCAL_REVIEW_SHORTCUT: "NOT_USED",
    DATABASE_MUTATION: "NONE",
  }));
} finally {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
