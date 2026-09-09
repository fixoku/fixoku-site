import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const password = process.env.TEST_SEED_PASSWORD;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query("delete from rate_limit"); await pool.query("delete from availability_slots where trainer_user_id in (select id from platform_users where auth_user_id='phase1c-trainer-test-user')"); await pool.end();
let cookie = "";
async function req(path, options = {}) { const headers = new Headers(options.headers || {}); headers.set("origin", origin); if (cookie) headers.set("cookie", cookie); const response = await fetch(origin + path, { ...options, headers }); const setCookie = response.headers.get("set-cookie"); if (setCookie) cookie = setCookie.split(";")[0]; return { response, body: await response.json().catch(() => ({})) }; }
let result = await req("/api/trainer/availability"); assert.equal(result.response.status, 401);
result = await req("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "trainer.phase1c@example.test", password }) }); assert.equal(result.response.status, 200);
const start = new Date(Date.now() + 4 * 60 * 60 * 1000); start.setMinutes(0, 0, 0); const end = new Date(start.getTime() + 60 * 60 * 1000);
result = await req("/api/trainer/availability", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString(), capacity: 1 }) }); assert.equal(result.response.status, 200);
result = await req("/api/trainer/availability", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt: new Date(start.getTime() + 15 * 60000).toISOString(), endsAt: new Date(end.getTime() + 15 * 60000).toISOString(), capacity: 1 }) }); assert.equal(result.response.status, 409);
result = await req("/api/trainer/availability"); assert.equal(result.response.status, 200); assert.ok(result.body.slots.some((slot) => slot.id));
console.log(JSON.stringify({ availabilityApi: "PASS", overlapGuard: "PASS", ownership: "SERVER_RESOLVED", lessonSchedule: "DEFERRED" }));
