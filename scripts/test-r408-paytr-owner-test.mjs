import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  ownerPaytrTestAllowed,
  createOwnerTestReference,
  isOwnerTestReference,
  ownerTestExpiry,
  assertOwnerTestCallback
} from "../src/server/payments/paytr-owner-test-r408.js";

const env = {
  FIXOKU_PAYTR_OWNER_TEST_ENABLED: "1",
  FIXOKU_PRODUCTION_RUNTIME_ENABLED: "1",
  VERCEL_ENV: "production",
  NODE_ENV: "production",
  APP_ORIGIN: "https://fixoku.com",
  PAYTR_ENABLED: "1",
  PAYTR_TEST_MODE: "1",
  PAYTR_MERCHANT_ID: "synthetic-merchant",
  PAYTR_MERCHANT_KEY: "synthetic-key",
  PAYTR_MERCHANT_SALT: "synthetic-salt",
  PAYTR_OK_URL: "https://fixoku.com/api/paytr/return-success",
  PAYTR_FAIL_URL: "https://fixoku.com/api/paytr/return-failure",
  PAYTR_CALLBACK_URL: "https://fixoku.com/api/paytr/callback"
};

let count = 0;

function check(name, fn) {
  fn();
  count++;
  console.log(name + "=PASS");
}

const oid = createOwnerTestReference();

const attempt = {
  merchantOid: oid,
  environment: "TEST",
  amountMinor: 100,
  currency: "TRY"
};

function signed(extra = {}) {
  const payload = {
    merchant_oid: oid,
    status: "success",
    total_amount: "100",
    test_mode: "1",
    ...extra
  };
  payload.hash = crypto.createHmac("sha256",env.PAYTR_MERCHANT_KEY)
    .update(payload.merchant_oid + env.PAYTR_MERCHANT_SALT +
      payload.status + payload.total_amount)
    .digest("base64");
  return payload;
}

const run = (payload = signed(), a = attempt, e = env) =>
  assertOwnerTestCallback({payload,attempt:a,env:e});

check("VALID_TEST_GATE",()=>assert.equal(ownerPaytrTestAllowed(env),true));
check("DEFAULT_DISABLED",()=>assert.equal(ownerPaytrTestAllowed({}),false));

for (const [name,extra] of [
  ["OWNER_TEST_SWITCH_DISABLED",{FIXOKU_PAYTR_OWNER_TEST_ENABLED:"0"}],
  ["PRODUCTION_GUARD_DISABLED",{FIXOKU_PRODUCTION_RUNTIME_ENABLED:"0"}],
  ["PREVIEW_REJECTED",{VERCEL_ENV:"preview"}],
  ["NON_PRODUCTION_REJECTED",{NODE_ENV:"test"}],
  ["WRONG_ORIGIN_REJECTED",{APP_ORIGIN:"https://staging.fixoku.com"}],
  ["PAYTR_DISABLED",{PAYTR_ENABLED:"0"}],
  ["LIVE_MODE_REJECTED",{PAYTR_TEST_MODE:"0"}],
  ["LIVE_APPROVAL_REJECTED",{PAYTR_LIVE_APPROVED:"1"}],
  ["LIVE_VERIFICATION_REJECTED",{PAYTR_LIVE_RUNTIME_VERIFIED:"1"}],
  ["WRONG_CALLBACK_REJECTED",{PAYTR_CALLBACK_URL:"https://staging.fixoku.com/api/paytr/callback"}],
  ["MISSING_CREDENTIAL_REJECTED",{PAYTR_MERCHANT_KEY:""}]
]) {
  check(name,()=>assert.equal(ownerPaytrTestAllowed({...env,...extra}),false));
}

check("REFERENCE_NAMESPACE",()=>{
  assert.equal(isOwnerTestReference(oid),true);
  assert.equal(isOwnerTestReference(crypto.randomUUID()),false);
  assert.notEqual(createOwnerTestReference(),oid);
});

check("TEST_EXPIRY",()=>{
  assert.equal(new Date(ownerTestExpiry(0)).getTime(),1800000);
});

check("INVALID_SIGNATURE_REJECTED",()=>{
  assert.throws(()=>run({...signed(),hash:"invalid"}),/SIGNATURE_INVALID/);
});

check("UNKNOWN_ATTEMPT_REJECTED",()=>{
  assert.throws(()=>run(signed(),null),/ATTEMPT_NOT_FOUND/);
});

check("INVALID_MODE_REJECTED",()=>{
  assert.throws(()=>run(signed({test_mode:"0"})),/MODE_INVALID/);
});

check("TAMPERED_AMOUNT_REJECTED",()=>{
  assert.throws(()=>run(signed({total_amount:"101"})),/AMOUNT_MISMATCH/);
});

check("SUCCESS_NO_BUSINESS_SIDE_EFFECTS",()=>{
  const result = run();
  assert.equal(result.status,"SUCCEEDED");
  for (const key of [
    "createsOrder","grantsEntitlement","createsShipment",
    "createsFinanceEntry","createsCommission"
  ]) assert.equal(result[key],false);
});

assert.equal(count,20);
console.log("TEST_COUNT=" + count);
console.log("EXTERNAL_PAYTR_NETWORK=NOT_USED");
console.log("DATABASE_CONNECTION=NO");
console.log("R408_H5C_SECURITY_CORE=PASS");