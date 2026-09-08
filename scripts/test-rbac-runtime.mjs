import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const password = process.env.TEST_SEED_PASSWORD; assert.ok(password);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); await pool.query("delete from rate_limit"); await pool.end();
async function login(email) { const response = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password }) }); assert.equal(response.status, 200); return response.headers.get("set-cookie")?.split(";")[0] || ""; }
async function context(cookie, panel) { return fetch(`${origin}/api/panel-context?panel=${encodeURIComponent(panel)}`, { headers: { cookie } }); }
let response = await fetch(`${origin}/api/panel-context?panel=/panel/admin`); assert.equal(response.status, 401);
const studentCookie = await login("student.phase1c@example.test"); response = await context(studentCookie, "/panel/ogrenci"); assert.equal(response.status, 200); response = await context(studentCookie, "/panel/egitmen"); assert.equal(response.status, 403);
const guardianCookie = await login("guardian.phase1c@example.test"); response = await context(guardianCookie, "/panel/ogrenci"); assert.equal(response.status, 200);
const adminCookie = await login("super-admin.phase1c@example.test"); response = await context(adminCookie, "/panel/admin"); assert.equal(response.status, 200);
console.log(JSON.stringify({ runtimeRbac: "PASS", unauthenticated401: "PASS", studentAllowed: "PASS", guardianAllowed: "PASS", studentTrainer403: "PASS", adminAllowed: "PASS" }));
