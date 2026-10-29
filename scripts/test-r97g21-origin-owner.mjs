import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveApplicationOrigin, resolveTrustedOrigins, requireApplicationOrigin } from "../src/server/auth/origin.js";

const branch = "codex/r97g-staging-preview-20261027";
const commit = "f1167d8b0afe8bc30da85369d277316d9ffaa3c3";
const branchOrigin = "https://fixoku-site-git-codex-r97g-staging-preview-20261027-fixoku.vercel.app";
const deploymentOrigin = "https://fixoku-site-m9vgwqmtg-fixoku.vercel.app";
const base = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_URL: "fixoku-site-m9vgwqmtg-fixoku.vercel.app",
  VERCEL_GIT_COMMIT_REF: branch,
  VERCEL_GIT_COMMIT_SHA: commit,
  R97G_RUNTIME_EXPECTED_COMMIT_SHA: commit,
  APP_ORIGIN: branchOrigin,
  BETTER_AUTH_URL: branchOrigin,
};

assert.equal(resolveApplicationOrigin(base), branchOrigin);
assert.deepEqual(resolveTrustedOrigins(base), [branchOrigin, deploymentOrigin]);
assert.equal(requireApplicationOrigin(base), branchOrigin);

assert.equal(resolveApplicationOrigin({ ...base, VERCEL_GIT_COMMIT_REF: "codex/other-branch" }), null);
assert.equal(resolveApplicationOrigin({ ...base, VERCEL_GIT_COMMIT_SHA: "0000000000000000000000000000000000000000" }), null);
assert.equal(resolveApplicationOrigin({ ...base, R97G_RUNTIME_EXPECTED_COMMIT_SHA: "0000000000000000000000000000000000000000" }), null);
assert.equal(resolveApplicationOrigin({ ...base, VERCEL_ENV: "production" }), null);
assert.equal(resolveApplicationOrigin({ ...base, APP_ORIGIN: "https://fixoku-site-other-branch-fixoku.vercel.app", BETTER_AUTH_URL: "https://fixoku-site-other-branch-fixoku.vercel.app" }), null);
assert.equal(resolveApplicationOrigin({ ...base, APP_ORIGIN: "https://random.example.test", BETTER_AUTH_URL: "https://random.example.test" }), null);
assert.equal(resolveApplicationOrigin({ ...base, VERCEL_URL: "random.example.test" }), null);

const ownerRoute = fs.readFileSync(new URL("../api/owner-sign-in.js", import.meta.url), "utf8");
const authSource = fs.readFileSync(new URL("../src/server/auth/auth.js", import.meta.url), "utf8");
const authorizationSource = fs.readFileSync(new URL("../src/server/auth/authorization.js", import.meta.url), "utf8");
assert.match(ownerRoute, /requireApplicationOrigin/u);
assert.match(ownerRoute, /OWNER_AUTH_ORIGIN_UNAVAILABLE/u);
assert.match(ownerRoute, /callbackURL: "\/panel\/owner"/u);
assert.match(authSource, /baseURL: appOrigin/u);
assert.match(authSource, /trustedOrigins/u);
assert.match(authSource, /useSecureCookies: process\.env\.NODE_ENV === "production"/u);
for (const role of ["OWNER", "SUPER_ADMIN", "STUDENT", "TRAINER"]) assert.match(authorizationSource, new RegExp(role, "u"));

console.log(JSON.stringify({
  PREVIEW_BRANCH_ORIGIN: "PASS",
  PREVIEW_DEPLOYMENT_ORIGIN_TRUSTED: "PASS",
  PREVIEW_WRONG_BRANCH_REJECTED: "PASS",
  PREVIEW_WRONG_COMMIT_REJECTED: "PASS",
  PREVIEW_PRODUCTION_REJECTED: "PASS",
  RANDOM_ORIGIN_REJECTED: "PASS",
  OWNER_CALLBACK: "PASS",
  BETTER_AUTH_BASE_AND_TRUSTED_ORIGINS: "PASS",
  SECURE_COOKIES_POLICY: "PASS",
  ROLE_SURFACES: "PASS",
}));
