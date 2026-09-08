import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();

const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const email = "trainer.phase1c@example.test";
const password = process.env.TEST_SEED_PASSWORD;
assert.ok(password, "TEST_SEED_PASSWORD_REQUIRED");
const testDb = process.env.TEST_DATABASE_URL;
assert.ok(testDb, "TEST_DATABASE_URL_REQUIRED");
for (const databaseUrl of [...new Set([testDb, process.env.DATABASE_URL])]) {
  const resetPool = new pg.Pool({ connectionString: databaseUrl });
  await resetPool.query("delete from rate_limit");
  await resetPool.end();
}
const jar = { cookie: "" };
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (jar.cookie) headers.set("cookie", jar.cookie);
  const response = await fetch(`${origin}${path}`, { ...options, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) jar.cookie = setCookie.split(";")[0];
  return { response, body: await response.json().catch(() => ({})) };
}

let result = await request("/api/panel-context");
assert.equal(result.response.status, 401);
result = await request("/api/auth/sign-up/email", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ name: "Blocked", email: "new.phase1c@example.test", password }) });
assert.notEqual(result.response.status, 200);
result = await request("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", origin: "https://untrusted.example" }, body: JSON.stringify({ email, password }) });
assert.notEqual(result.response.status, 200);
result = await request("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password: "wrong-password" }) });
assert.equal(result.response.status, 401);
result = await request("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password }) });
assert.equal(result.response.status, 200);
for (const resetEmail of [email, "unknown.phase1c@example.test"]) {
  result = await request("/api/auth/request-password-reset", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email: resetEmail, redirectTo: "/sifre-yenile" }) });
  assert.equal(result.response.status, 200);
}
result = await request("/api/panel-context");
assert.equal(result.response.status, 200);
assert.deepEqual(result.body.roles, ["TRAINER"]);
assert.equal(result.body.destination, "/panel/egitmen");
assert.ok(result.body.permissions.includes("student.read"));
result = await request("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json", origin }, body: "{}" });
assert.equal(result.response.status, 200);
result = await request("/api/panel-context");
assert.equal(result.response.status, 401);
console.log(JSON.stringify({ auth: "PASS", signupDisabled: "PASS", originProtection: "PASS", login: "PASS", session: "PASS", logout: "PASS", passwordLogged: "NO" }));
