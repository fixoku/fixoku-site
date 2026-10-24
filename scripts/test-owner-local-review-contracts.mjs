import assert from "node:assert/strict";
import fs from "node:fs";
import { localReviewRuntimeAllowed, ownerLocalFixtureAllowed } from "../src/server/auth/local-review-runtime.js";
import { privilegedTwoFactorRequired } from "../src/server/auth/authorization.js";

const base = {
  NODE_ENV: "development",
  LOCAL_REVIEW_MODE: "1",
  FIXOKU_LOCAL_ORIGIN: "http://127.0.0.1:5173",
  FIXOKU_LOCAL_OWNER_REVIEW: "1",
  FIXOKU_LOCAL_OWNER_EMAIL: "owner.local.test@example.test",
  FIXOKU_LOCAL_OWNER_PASSWORD: "synthetic-owner-password",
  DATABASE_URL: "postgresql://synthetic:secret@127.0.0.1:55432/fixoku_owner_local",
  TEST_DATABASE_URL: "postgresql://synthetic:secret@127.0.0.1:55432/fixoku_owner_local",
};

assert.equal(localReviewRuntimeAllowed(base), true);
assert.equal(ownerLocalFixtureAllowed(base), true);
assert.equal(ownerLocalFixtureAllowed({ ...base, NODE_ENV: "production" }), false);
assert.equal(ownerLocalFixtureAllowed({ ...base, VERCEL_ENV: "production" }), false);
assert.equal(ownerLocalFixtureAllowed({ ...base, DATABASE_URL: "postgresql://synthetic:secret@203.0.113.10:55432/fixoku_owner_local" }), false);
assert.equal(ownerLocalFixtureAllowed({ ...base, DATABASE_URL: "postgresql://synthetic:secret@127.0.0.1:5432/fixoku_platform_dev" }), false);
const previousEnv = { NODE_ENV: process.env.NODE_ENV, LOCAL_REVIEW_MODE: process.env.LOCAL_REVIEW_MODE, FIXOKU_LOCAL_ORIGIN: process.env.FIXOKU_LOCAL_ORIGIN, DATABASE_URL: process.env.DATABASE_URL };
Object.assign(process.env, { ...base, NODE_ENV: "production" });
assert.equal(privilegedTwoFactorRequired({ memberships: [{ role: "OWNER" }], session: { user: { twoFactorEnabled: false } } }), true);
for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }

const source = fs.readFileSync(new URL("../api/local-review/switch-user.js", import.meta.url), "utf8");
assert.match(source, /owner-local/u);
assert.match(source, /LOCAL_OWNER_REVIEW_DISABLED/u);
const packageApi = fs.readFileSync(new URL("../api/admin/owner-legal-review-package.js", import.meta.url), "utf8");
assert.match(packageApi, /ownerLocalFixtureAllowed/u);
assert.match(packageApi, /Content-Disposition/u);
assert.equal(fs.existsSync(new URL("../public/downloads/fixoku-owner-legal-review-package.md", import.meta.url)), false);
const legal = JSON.parse(fs.readFileSync(new URL("../src/platform/admin/legal-owner-documents-v3.json", import.meta.url), "utf8"));
assert.equal(legal.length, 21);
assert.equal(legal.filter((doc) => /TASLAK|BEKLENİYOR/iu.test(doc.markdown)).length, 21);
const packageText = fs.readFileSync(new URL("../docs/legal/owner-legal-review-package.md", import.meta.url), "utf8");
assert.match(packageText, /21 belge/u);
for (const document of legal) assert.ok(packageText.includes(document.markdown.trim()), `LEGAL_PACKAGE_CONTENT_MISSING:${document.id}`);

console.log(JSON.stringify({
  LOCAL_OWNER_RUNTIME: "PASS",
  PRODUCTION_OWNER_SHORTCUT: "REJECTED",
  REMOTE_DATABASE_SHORTCUT: "REJECTED",
  OWNER_ROLE_SOURCE: "PRESERVED",
  LEGAL_DOCUMENT_COUNT: 21,
  LEGAL_DOCUMENTS_DRAFT: "PASS",
  DATABASE_MUTATION: "NONE",
}));
