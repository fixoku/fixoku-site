import assert from "node:assert/strict";
import {
  buildStudentBankFollowUp
} from "../src/server/domain/student-bank-transfer-follow-up.js";

const order = {
  id: "11111111-2222-4333-8444-555555555555",
  total_minor: 1599000,
  currency: "TRY"
};

const missing = buildStudentBankFollowUp(
  { reason: "NOT_RECEIVED" },
  order
);

assert.equal(missing.remainingMinor, 1599000);
assert.match(missing.body, /dogrulanmadi/);

const partial = buildStudentBankFollowUp(
  {
    reason: "PARTIAL_PAYMENT",
    receivedMinor: 500000
  },
  order
);

assert.equal(partial.remainingMinor, 1099000);
assert.match(partial.body, /10.990,00/);

const proof = buildStudentBankFollowUp(
  { reason: "PROOF_REQUEST" },
  order
);

assert.match(proof.body, /dekont/);

for (const value of [0, 1599000, -1, 1.7]) {
  assert.throws(() =>
    buildStudentBankFollowUp({
      reason: "PARTIAL_PAYMENT",
      receivedMinor: value
    }, order)
  );
}

assert.throws(() =>
  buildStudentBankFollowUp({
    reason: "INVALID"
  }, order)
);

console.log("R328_FOLLOW_UP_SCENARIOS=PASS");
console.log("R328_NO_AUTO_SETTLEMENT_BY_DESIGN=PASS");