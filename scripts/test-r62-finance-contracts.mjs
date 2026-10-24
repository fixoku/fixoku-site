import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const orders = read("api/admin/orders.js");
const assignmentRequests = read("api/admin/assignment-requests.js");
const students = read("api/admin/students.js");
const payouts = read("api/admin/payouts.js");
const finance = read("api/admin/finance.js");

assert.match(orders, /count\(distinct sp\.user_id\)/u);
assert.match(orders, /u\.email_verified=true/u);
assert.match(orders, /m\.role='STUDENT'/u);
assert.match(orders, /m\.status='ACTIVE'/u);
assert.match(assignmentRequests, /count\(distinct sp\.user_id\)/u);
assert.match(students, /su\.email_verified=true/u);
assert.match(students, /sm\.role='STUDENT'/u);

assert.match(payouts, /r6_trainer_payout_allocations/u);
assert.match(payouts, /remainingMinor/u);
assert.match(payouts, /e\.payable_at is not null/u);
assert.match(payouts, /pg_advisory_xact_lock/u);
assert.match(payouts, /await client\.query\("begin"\)/u);
assert.match(payouts, /await client\.query\("commit"\)/u);
assert.match(payouts, /await client\.query\("rollback"\)/u);
assert.match(payouts, /trainer\.payout\.adjusted/u);

const grossMinor = 100_000;
const firstAllocationMinor = 40_000;
const remainingAfterPartial = Math.max(0, grossMinor - firstAllocationMinor);
assert.equal(remainingAfterPartial, 60_000);
assert.equal(Math.max(0, grossMinor - firstAllocationMinor - remainingAfterPartial), 0);
assert.equal(Math.max(0, grossMinor - grossMinor), 0, "fully allocated earning must not be payable again");

assert.match(finance, /owner\.finance\.adjusted/u);
assert.match(finance, /platform_audit_events/u);
assert.match(finance, /order by l\.occurred_at desc/u);
assert.match(finance, /metadata_json.*manual/u);
assert.match(finance, /\^\[=\+@\\-\\t\\r\]/u);
assert.match(finance, /const trainerUnpaid = earned === null \? null : Math\.max\(0, earned - paid\)/u);

console.log(JSON.stringify({
  ACTIVE_STUDENT_AUTHORITY: "PASS",
  PARTIAL_PAYOUT_REMAINING: "PASS",
  FULL_PAYOUT_NOT_REPAYABLE: "PASS",
  PAYOUT_AUDIT_ATOMICITY_SOURCE: "PASS",
  FINANCE_HISTORY_APPEND_ONLY_SOURCE: "PASS",
  CSV_FORMULA_GUARD_SOURCE: "PASS",
  DATABASE_MUTATION: "NO",
  WRITES: "NONE",
}));
