import assert from "node:assert/strict";
import fs from "node:fs";
import { R97G_TEST_IDENTITIES } from "../src/server/auth/r97g-test-identities.js";
import { enabled } from "../api/local-review/switch-user.js";

const expected = new Map([
  ["testadmin@fixoku.com", "SUPER_ADMIN"],
  ["test1ogrenci@fixoku.com", "STUDENT"],
  ["test2ogrenci@fixoku.com", "STUDENT"],
  ["test3ogrenci@fixoku.com", "STUDENT"],
  ["testogretmen@fixoku.com", "TRAINER"],
]);
assert.equal(R97G_TEST_IDENTITIES.length, expected.size);
for (const identity of R97G_TEST_IDENTITIES) {
  assert.equal(expected.get(identity.email), identity.role, `R97G_IDENTITY_${identity.email}`);
  assert.notEqual(identity.role, "OWNER");
  assert.match(identity.slug, /^r97g-test-/u);
}

const source = fs.readFileSync(new URL("../api/local-review/switch-user.js", import.meta.url), "utf8");
const browserIdentitySource = fs.readFileSync(new URL("../src/shared/r97g-test-identities.js", import.meta.url), "utf8");
assert.match(source, /R97G_TEST_IDENTITIES/u);
assert.match(source, /LOCAL_REVIEW_MODE/u);
assert.match(source, /NODE_ENV === "production"/u);
assert.match(source, /remoteAddress/u);
assert.doesNotMatch(browserIdentitySource, /@fixoku\.com/u);

const previous = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV, LOCAL_REVIEW_MODE: process.env.LOCAL_REVIEW_MODE };
Object.assign(process.env, { NODE_ENV: "development", VERCEL: "", VERCEL_ENV: "", LOCAL_REVIEW_MODE: "1" });
assert.equal(enabled({ headers: { host: "127.0.0.1:5173" }, socket: { remoteAddress: "127.0.0.1" } }), true);
assert.equal(enabled({ headers: { host: "127.0.0.1:5173" }, socket: { remoteAddress: "203.0.113.10" } }), false);
assert.equal(enabled({ headers: { host: "preview.example.test" }, socket: { remoteAddress: "127.0.0.1" } }), false);
assert.equal(enabled({ headers: { host: "127.0.0.1:5173" }, socket: { remoteAddress: "127.0.0.1" } }), true);
Object.assign(process.env, { NODE_ENV: "production" });
assert.equal(enabled({ headers: { host: "127.0.0.1:5173" }, socket: { remoteAddress: "127.0.0.1" } }), false);
for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }

const seedSource = fs.readFileSync(new URL("./prepare-r97g-test-users.mjs", import.meta.url), "utf8");
assert.match(seedSource, /if \(!apply\)/u);
assert.match(seedSource, /stagingUsersCreated: "NO"/u);
assert.match(seedSource, /R97G_STAGING_APPROVED/u);
assert.match(seedSource, /hashPassword/u);

console.log(JSON.stringify({
  LOCAL_REVIEW_SWITCHER: "PASS",
  R97G_IDENTITIES: expected.size,
  OWNER_IN_SYNTHETIC_SET: "NO",
  LOOPBACK_GUARD: "PASS",
  PRODUCTION_GUARD: "PASS",
  STAGING_USERS_CREATED: "NO",
}));
