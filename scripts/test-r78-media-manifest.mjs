import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const planPath = process.env.R78_PLAN_PATH || "D:\\FIXOKU\\_R72B_SAFE_AUDITS\\R72B_R2_MEDIA_UPLOAD_PLAN_2026-11-10T04-57-10-418Z.json";
const progressPath = process.env.R78_PROGRESS_PATH || "D:\\FIXOKU\\_R75_STAGING_UPLOAD_AUDITS\\R75_VERIFIED_PROGRESS.jsonl";
const inventoryPath = process.env.R78_R2_INVENTORY_PATH || "";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
}

function classify(objects) {
  return objects.reduce((map, item) => {
    map[item.kind] = (map[item.kind] || 0) + 1;
    return map;
  }, {});
}

const plan = readJson(planPath);
const planHash = sha256(planPath);
const lines = fs.readFileSync(progressPath, "utf8").replace(/^\uFEFF/u, "").split(/\r?\n/u).filter(Boolean);
const progress = lines.map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`R75_PROGRESS_JSON_INVALID:${index + 1}:${error.message}`); }
});
const expected = {
  "independent-video": 26,
  "independent-poster": 26,
  "curriculum-slide": 946,
  "curriculum-thumbnail": 946,
  "curriculum-video": 61,
  "curriculum-manifest": 5,
  "independent-manifest": 1,
  "shared-presentation-pdf": 5,
};

assert.equal(plan.status, "PLAN_ONLY_NOT_UPLOADED");
assert.equal(plan.objectCount, 2016);
assert.equal(plan.objects.length, plan.objectCount);
assert.equal(new Set(plan.objects.map((item) => item.key)).size, plan.objectCount, "PLAN_KEYS_UNIQUE");
assert.equal(plan.objects.reduce((sum, item) => sum + Number(item.bytes || 0), 0), 6522380530, "PLAN_BYTES_TOTAL");
assert.deepEqual(classify(plan.objects), expected, "PLAN_KIND_COUNTS");
assert.equal(progress.length, plan.objectCount, "R75_VERIFIED_COUNT");
assert.equal(new Set(progress.map((item) => item.key)).size, progress.length, "R75_KEYS_UNIQUE");
assert.ok(progress.every((item) => item.status === "SHA256_VERIFIED"), "R75_ALL_HASH_VERIFIED");
assert.ok(progress.every((item) => item.planSha256 === planHash), "R75_PLAN_HASH_MATCH");

const byKey = new Map(plan.objects.map((item) => [item.key, item]));
for (const row of progress) {
  const planned = byKey.get(row.key);
  assert.ok(planned, `R75_KEY_NOT_IN_PLAN:${row.key}`);
  assert.equal(Number(row.bytes), Number(planned.bytes), `R75_BYTES_MATCH:${row.key}`);
  assert.equal(String(row.sha256).toUpperCase(), String(planned.sha256).toUpperCase(), `R75_SHA256_MATCH:${row.key}`);
}

let liveInventory = "UNVERIFIED_NO_READ_ONLY_R2_INVENTORY_INPUT";
let liveDiff = null;
if (inventoryPath) {
  const inventory = readJson(inventoryPath);
  const rows = Array.isArray(inventory) ? inventory : inventory.objects;
  assert.ok(Array.isArray(rows), "R2_INVENTORY_OBJECTS_REQUIRED");
  const remote = new Map(rows.map((item) => [String(item.key), item]));
  const plannedKeys = new Set(byKey.keys());
  const missing = [...plannedKeys].filter((key) => !remote.has(key));
  const extra = [...remote.keys()].filter((key) => !plannedKeys.has(key));
  const mismatched = [...plannedKeys].filter((key) => remote.has(key) && Number(remote.get(key).bytes ?? remote.get(key).size) !== Number(byKey.get(key).bytes));
  liveDiff = { remoteCount: remote.size, missing, extra, mismatched };
  liveInventory = missing.length || extra.length || mismatched.length ? "FAIL" : "PASS";
}

console.log(JSON.stringify({
  PLAN_SHA256: planHash,
  PLAN_OBJECTS: plan.objectCount,
  PLAN_BYTES: plan.bytes,
  PLAN_KIND_COUNTS: classify(plan.objects),
  R75_VERIFIED_ROWS: progress.length,
  R75_SHA256_VERIFIED: progress.every((item) => item.status === "SHA256_VERIFIED") ? "PASS" : "FAIL",
  R75_PLAN_HASH_MATCH: progress.every((item) => item.planSha256 === planHash) ? "PASS" : "FAIL",
  R75_PLAN_KEY_BYTES_HASH_MATCH: "PASS",
  R2_LIVE_INVENTORY: liveInventory,
  R2_LIVE_DIFF: liveDiff,
  DATABASE_MUTATION: "NONE",
  R2_WRITE: "NONE",
}));
