import assert from "node:assert/strict";
import fs from "node:fs";
import {
  fromPaytrMerchantOid,
  normalizePaytrCurrency,
  paytrTestSettlementAllowed,
  requestPaytrIframeToken,
  toPaytrMerchantOid,
  validatePaytrSettlement,
  assertPaytrCallbackOrderFacts,
} from "../src/server/payments/paytr.js";

const orderId = "00000000-0000-4000-8000-000000000001";
const env = {
  PAYTR_ENABLED: "1",
  PAYTR_MERCHANT_ID: "r404-local",
  PAYTR_MERCHANT_KEY: "r404-key",
  PAYTR_MERCHANT_SALT: "r404-salt",
  PAYTR_TEST_MODE: "1",
  APP_ORIGIN: "http://127.0.0.1:4173",
  PAYTR_OK_URL: "http://127.0.0.1:4173/api/paytr/return-success",
  PAYTR_FAIL_URL: "http://127.0.0.1:4173/api/paytr/return-failure",
  PAYTR_CALLBACK_URL: "http://127.0.0.1:4173/api/paytr/callback",
  DATABASE_URL: "postgresql://local@127.0.0.1:51880/fixoku_test_r404",
  NODE_ENV: "test",
  VERCEL_ENV: "",
  FIXOKU_PAYTR_TOKEN_MOCK: "synthetic-token",
  FIXOKU_LOCAL_PAYTR_TEST: "1",
};

const merchantOid = toPaytrMerchantOid(orderId);
assert.equal(fromPaytrMerchantOid(merchantOid), orderId);
assert.equal(merchantOid.length, 32);

const token = await requestPaytrIframeToken({
  merchantOid,
  userIp: "127.0.0.1",
  email: "r404@example.invalid",
  userName: "R404 Test",
  userAddress: "Local test address",
  userPhone: "+905555555555",
  paymentAmount: "11990",
  userBasket: "W1sbIlRlc3QiLCIxMTkuOTAiLDFdXQ==",
  currency: "TL",
  testMode: "1",
}, env);
assert.equal(token, "synthetic-token");

const settlement = validatePaytrSettlement({
  payload: { status: "success", total_amount: "13500", payment_amount: "11990", currency: "TL", test_mode: "1" },
  providerStatus: { status: "success", payment_amount: "119.90", payment_total: "135.00", currency: "TRY", test_mode: "1", taksit: "3", odeme_tipi: "KART", transaction_id: "synthetic-tx-1" },
  expectedAmountMinor: 11990,
  expectedCurrency: "TRY",
  expectedTestMode: "1",
});
assert.deepEqual({ order: settlement.orderAmountMinor, collected: settlement.collectedAmountMinor, surcharge: settlement.installmentDifferenceMinor, installments: settlement.installments }, { order: 11990, collected: 13500, surcharge: 1510, installments: 3 });
assert.equal(normalizePaytrCurrency("TL"), "TRY");
assert.doesNotThrow(() => assertPaytrCallbackOrderFacts({ attempt: { amount_minor: 11990, currency: "TRY", merchant_oid: merchantOid }, order: { total_minor: 11990, currency: "TRY" }, payload: { merchant_oid: merchantOid, payment_amount: "11990" } }));
assert.throws(() => assertPaytrCallbackOrderFacts({ attempt: { amount_minor: 11990, currency: "TRY", merchant_oid: merchantOid }, order: { total_minor: 11990, currency: "TRY" }, payload: { merchant_oid: merchantOid, payment_amount: "11991" } }), /PAYTR_BASE_AMOUNT_MISMATCH/u);

assert.throws(() => validatePaytrSettlement({
  payload: { status: "success", total_amount: "13501", payment_amount: "11990", currency: "TL", test_mode: "1" },
  providerStatus: { status: "success", payment_amount: "119.90", payment_total: "135.00", currency: "TRY", test_mode: "1", taksit: "3", odeme_tipi: "KART" },
  expectedAmountMinor: 11990,
  expectedCurrency: "TRY",
  expectedTestMode: "1",
}), /PAYTR_PAYMENT_AMOUNT_MISMATCH/u);

assert.equal(paytrTestSettlementAllowed(env), true);
assert.equal(paytrTestSettlementAllowed({ ...env, NODE_ENV: "production", VERCEL_ENV: "production" }), false);
assert.equal(paytrTestSettlementAllowed({ ...env, DATABASE_URL: "postgresql://remote@example.invalid/db" }), false);
await assert.rejects(() => requestPaytrIframeToken({ merchantOid, userIp: "127.0.0.1", email: "r404@example.invalid", userName: "R404 Test", userAddress: "Local test address", userPhone: "+905555555555", paymentAmount: "11990", userBasket: "W1sbIlRlc3QiLCIxMTkuOTAiLDFdXQ==", currency: "TL", testMode: "1" }, { ...env, FIXOKU_PAYTR_TOKEN_MOCK: "", FIXOKU_PAYTR_TOKEN_FETCHER: async () => { throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); } }), /timeout/u);

const migration = fs.readFileSync(new URL("../drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql", import.meta.url), "utf8");
for (const tokenText of ["paytr_payment_attempts", "merchant_oid", "student_order_id", "trainer_order_id", "review_required", "installment_difference_minor", "Rollback plan"]) assert.match(migration, new RegExp(tokenText.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "u"));

console.log(JSON.stringify({
  MERCHANT_OID_ROUNDTRIP: "PASS",
  TOKEN_NETWORK_MOCK_ONLY: "PASS",
  INSTALLMENT_ACCOUNTING_MINOR_UNITS: "PASS",
  SURCHARGE_SEPARATED_FROM_ORDER_PRICE: "PASS",
  AMOUNT_MISMATCH_REJECTED: "PASS",
  LOCAL_TEST_GATE: "PASS",
  PRODUCTION_TEST_GATE_REJECTED: "PASS",
  REMOTE_DATABASE_TEST_GATE_REJECTED: "PASS",
  TOKEN_TIMEOUT_SURFACES_ERROR: "PASS",
  PAYMENT_ATTEMPT_MIGRATION_CONTRACT: "PASS",
  EXTERNAL_PAYTR_NETWORK: "NOT_USED",
}));
