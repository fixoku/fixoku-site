import assert from "node:assert/strict";
import { privilegedTwoFactorRequired, requirePermission } from "../src/server/auth/authorization.js";
const principal = { user: { id: "owner" }, memberships: [{ role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }], session: { user: { twoFactorEnabled: false } } };
const previous = { enforce: process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA, local: process.env.LOCAL_REVIEW_MODE, node: process.env.NODE_ENV };
try {
  process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA = "1"; delete process.env.LOCAL_REVIEW_MODE; process.env.NODE_ENV = "test";
  assert.equal(privilegedTwoFactorRequired(principal), true); assert.deepEqual(requirePermission(principal, "finance.read"), { status: 403, body: { error: "TWO_FACTOR_REQUIRED" } });
  principal.session.user.twoFactorEnabled = true; assert.equal(requirePermission(principal, "finance.read"), null);
  principal.session.user.twoFactorEnabled = false; process.env.LOCAL_REVIEW_MODE = "1"; assert.equal(privilegedTwoFactorRequired(principal), false); assert.equal(requirePermission(principal, "finance.read"), null);
  console.log(JSON.stringify({ ADMIN_2FA_SERVER_ENFORCEMENT: "PASS", LOCAL_REVIEW_2FA_BYPASS: "PASS", OWNER_FINANCE_PERMISSION: "PASS" }));
} finally { for (const [key, value] of Object.entries(previous)) { if (value == null) delete process.env[key]; else process.env[key] = value; } }
