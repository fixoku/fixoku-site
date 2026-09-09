import assert from "node:assert/strict";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const list = await fetch(`${origin}/api/trainer/students`);
assert.equal(list.status, 401, "student roster must require authentication");
const detail = await fetch(`${origin}/api/trainer/students/not-a-real-id`);
assert.equal(detail.status, 401, "student detail must require authentication");
console.log(JSON.stringify({ studentsApi: "PASS", unauthenticatedList401: "PASS", unauthenticatedDetail401: "PASS", scope: "TRAINER_ONLY" }));
