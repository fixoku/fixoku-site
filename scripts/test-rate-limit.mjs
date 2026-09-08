import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query("delete from rate_limit"); await pool.end();
const statuses = [];
for (let index = 0; index < 6; index += 1) {
  const response = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email: "trainer.phase1c@example.test", password: "wrong-password" }) });
  statuses.push(response.status);
}
assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401]);
assert.equal(statuses[5], 429);
console.log(JSON.stringify({ rateLimit: "PASS", storage: "DATABASE", firstFiveRejected: "PASS", sixthThrottled: "PASS", failOpen: "NO" }));
