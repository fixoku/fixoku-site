import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyPaytrCallback } from "../src/server/payments/paytr.js";

const env = {
  PAYTR_ENABLED: "0",
  PAYTR_MERCHANT_KEY: "local-test-key",
  PAYTR_MERCHANT_SALT: "local-test-salt",
};
const fields = { merchant_oid: "00000000-0000-4000-8000-000000000001", status: "success", total_amount: "120000" };
const hash = crypto.createHmac("sha256", env.PAYTR_MERCHANT_KEY)
  .update(`${fields.merchant_oid}${env.PAYTR_MERCHANT_SALT}${fields.status}${fields.total_amount}`)
  .digest("base64");

assert.equal(verifyPaytrCallback({ ...fields, hash }, env), true);
assert.equal(verifyPaytrCallback({ ...fields, hash: `${hash}tampered` }, env), false);
assert.equal(verifyPaytrCallback({ ...fields, total_amount: "120001", hash }, env), false);
assert.equal(verifyPaytrCallback({ ...fields, status: "failed", hash }, env), false);
assert.equal(verifyPaytrCallback({ ...fields, hash }, { PAYTR_MERCHANT_KEY: "", PAYTR_MERCHANT_SALT: "" }), false);

console.log(JSON.stringify({
  PAYTR_VALID_SIGNATURE: "PASS",
  PAYTR_TAMPERED_SIGNATURE_REJECTED: "PASS",
  PAYTR_AMOUNT_CHANGE_REJECTED: "PASS",
  PAYTR_STATUS_CHANGE_REJECTED: "PASS",
  PAYTR_UNCONFIGURED_FAIL_CLOSED: "PASS",
  EXTERNAL_PAYTR_NETWORK: "NOT_USED",
}));
