import assert from "node:assert/strict";
import fs from "node:fs";
import { privilegedTwoFactorRequired, requireMembership } from "../src/server/auth/authorization.js";

const owner = { user: { id: "ersin" }, memberships: [{ role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
const student = { user: { id: "student" }, memberships: [{ role: "STUDENT", status: "ACTIVE", scopeType: "STUDENT", scopeId: "student" }], session: { user: { twoFactorEnabled: false } } };
const previous = { NODE_ENV: process.env.NODE_ENV, FIXOKU_REQUIRE_PRIVILEGED_2FA: process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA, FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA: process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA, LOCAL_REVIEW_MODE: process.env.LOCAL_REVIEW_MODE };
try {
  process.env.NODE_ENV = "production";
  process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA = "1";
  delete process.env.LOCAL_REVIEW_MODE;
  delete process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA;
  assert.equal(privilegedTwoFactorRequired(owner), true);
  assert.deepEqual(requireMembership(owner, "OWNER"), { status: 403, body: { error: "TWO_FACTOR_REQUIRED" } });
  process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA = "0";
  assert.equal(privilegedTwoFactorRequired(owner), false);
  assert.equal(requireMembership(owner, "OWNER"), null);
  assert.deepEqual(requireMembership(student, "OWNER"), { status: 403, body: { error: "FORBIDDEN" } });

  const login = fs.readFileSync(new URL("../src/pages/OwnerPrivateLogin.jsx", import.meta.url), "utf8");
  assert.match(login, /TWO_FACTOR_REQUIRED/u);
  assert.match(login, /OWNER_MEMBERSHIP_FORBIDDEN/u);
  assert.match(login, /OWNER_MEMBERSHIP_REQUIRED/u);
  const endpoint = fs.readFileSync(new URL("../api/owner-sign-in.js", import.meta.url), "utf8");
  assert.match(endpoint, /OWNER_MEMBERSHIP_REQUIRED/u);
  assert.match(endpoint, /INVALID_EMAIL_OR_PASSWORD/u);
  assert.match(endpoint, /setHeader/u);
  const panel = fs.readFileSync(new URL("../api/panel-context.js", import.meta.url), "utf8");
  assert.match(panel, /UNAUTHENTICATED/u);
  const authorization = fs.readFileSync(new URL("../src/server/auth/authorization.js", import.meta.url), "utf8");
  assert.match(authorization, /TWO_FACTOR_REQUIRED/u);
  console.log(JSON.stringify({ OWNER_2FA_MISSING_CONFIG_DISTINCT: "PASS", OWNER_MEMBERSHIP_FORBIDDEN_DISTINCT: "PASS", STUDENT_OWNER_FORBIDDEN: "PASS", UNAUTHENTICATED_PANEL_GATE: "PASS", DATABASE_MUTATION: "NONE" }));
} finally {
  for (const [key, value] of Object.entries(previous)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}
