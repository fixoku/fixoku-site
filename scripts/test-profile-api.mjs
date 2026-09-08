import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const reset = new pg.Pool({ connectionString: process.env.DATABASE_URL }); await reset.query("delete from rate_limit"); await reset.end();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const email = "trainer.phase1c@example.test";
const password = process.env.TEST_SEED_PASSWORD;
assert.ok(password, "TEST_SEED_PASSWORD_REQUIRED");
const jar = { cookie: "" };
async function request(path, options = {}) { const headers = new Headers(options.headers || {}); headers.set("origin", origin); if (jar.cookie) headers.set("cookie", jar.cookie); const response = await fetch(`${origin}${path}`, { ...options, headers }); const setCookie = response.headers.get("set-cookie"); if (setCookie) jar.cookie = setCookie.split(";")[0]; return { response, body: await response.json().catch(() => ({})) }; }
let r = await request("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }); assert.equal(r.response.status, 200);
r = await request("/api/trainer/profile"); assert.equal(r.response.status, 200); assert.equal(r.body.profile.email, email);
r = await request("/api/trainer/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "Özlem", lastName: "Yılmaz", phone: "+90 532 123 45 67", city: "İstanbul", profession: "Sınıf Öğretmeni", institution: "Özel Bilge Koleji", bio: "Okuma becerileri alanında çalışıyorum." }) }); assert.equal(r.response.status, 200); assert.equal(r.body.profile.city, "İstanbul");
r = await request("/api/trainer/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "SUPER_ADMIN" }) }); assert.equal(r.response.status, 400);
r = await request("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); assert.equal(r.response.status, 200);
r = await request("/api/trainer/profile"); assert.equal(r.response.status, 401);
const studentJar = { cookie: "" }; const studentHeaders = new Headers({ "content-type": "application/json", origin }); const studentLogin = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: studentHeaders, body: JSON.stringify({ email: "student.phase1c@example.test", password }) }); assert.equal(studentLogin.status, 200); studentJar.cookie = (studentLogin.headers.get("set-cookie") || "").split(";")[0]; const denied = await fetch(`${origin}/api/trainer/profile`, { headers: { cookie: studentJar.cookie } }); assert.equal(denied.status, 403);
console.log(JSON.stringify({ profileApi: "PASS", get: "PASS", patch: "PASS", unknownFieldRejected: "PASS", logout401: "PASS", student403: "PASS", dataSource: "REAL_POSTGRES" }));
