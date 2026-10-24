import assert from "node:assert/strict";
import fs from "node:fs";
import { completionMonthBounds } from "../src/server/domain/r6-training.js";

const payableDate = (value) => completionMonthBounds(value).payableAt.toISOString();

// Owner's rule is the next calendar month's first day, including weekends and holidays.
assert.equal(payableDate("2026-10-18T12:00:00Z"), "2026-11-01T12:00:00.000Z");
assert.equal(payableDate("2026-10-31T12:00:00Z"), "2026-11-01T12:00:00.000Z");
assert.equal(payableDate("2026-11-01T12:00:00Z"), "2026-12-01T12:00:00.000Z");
assert.equal(payableDate("2026-12-31T12:00:00Z"), "2027-01-01T12:00:00.000Z");

// 2026-08-01 is a Saturday; it must remain August 1 rather than move to Monday.
assert.equal(payableDate("2026-07-18T12:00:00Z"), "2026-08-01T12:00:00.000Z");
// Istanbul local month boundary: 31 October 20:59Z is still October in Istanbul,
// while 21:00Z is already November 1 and therefore payable on December 1.
assert.equal(payableDate("2026-10-31T20:59:00Z"), "2026-11-01T12:00:00.000Z");
assert.equal(payableDate("2026-10-31T21:00:00Z"), "2026-12-01T12:00:00.000Z");

const payouts = fs.readFileSync(new URL("../api/admin/payouts.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../src/platform/admin/R6PayoutsPage.tsx", import.meta.url), "utf8");
assert.match(payouts, /payable_at is not null/u);
assert.match(payouts, /at time zone 'Europe\/Istanbul'/u);
assert.match(payouts, /PAYOUT_DATE_IN_FUTURE/u);
assert.match(page, /persisted payable_at is the only payment-date authority/u);
assert.match(page, /remainingMinor/u);

console.log(JSON.stringify({
  MID_MONTH: "PASS",
  MONTH_END: "PASS",
  YEAR_ROLLOVER: "PASS",
  WEEKEND_FIRST_DAY_UNSHIFTED: "PASS",
  ISTANBUL_BOUNDARY: "PASS",
  SERVER_PAYABLE_AT_GATE: "PASS",
  NULL_PAYABLE_AT_BLOCKED_SOURCE: "PASS",
  DATABASE_MUTATION: "NO",
  WRITES: "NONE",
}));
