import assert from "node:assert/strict";
import crypto from "node:crypto";
import { paytrRuntime, paytrToken, verifyPaytrCallback } from "../src/server/payments/paytr.js";

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

const configuredTestEnv = { ...env, PAYTR_ENABLED: "1", PAYTR_MERCHANT_ID: "mid" };
assert.equal(paytrRuntime(configuredTestEnv).configured, true);
assert.equal(paytrRuntime({ ...configuredTestEnv, PAYTR_TEST_MODE: "0" }).configured, false);
assert.throws(() => paytrToken({ merchantOid: fields.merchant_oid, userIp: "127.0.0.1", email: "test@example.test", paymentAmount: fields.total_amount, userBasket: "[]", testMode: "0" }, configuredTestEnv), /PAYTR_CONFIG_REQUIRED/u);
const validProductionUrls = { ...configuredTestEnv, APP_ORIGIN: "https://fixoku.com", PAYTR_OK_URL: "https://fixoku.com/api/paytr/return-success", PAYTR_FAIL_URL: "https://fixoku.com/api/paytr/return-failure", PAYTR_CALLBACK_URL: "https://fixoku.com/api/paytr/callback" };
assert.equal(paytrRuntime(validProductionUrls).returnUrlsConfigured, true);
assert.equal(paytrRuntime({ ...validProductionUrls, PAYTR_CALLBACK_URL: "https://evil.example/api/paytr/callback" }).returnUrlsConfigured, false);
const invalidProductionLoopback = { ...configuredTestEnv, NODE_ENV: "production", APP_ORIGIN: "http://127.0.0.1:5173", PAYTR_OK_URL: "http://127.0.0.1:5173/api/paytr/return-success", PAYTR_FAIL_URL: "http://127.0.0.1:5173/api/paytr/return-failure", PAYTR_CALLBACK_URL: "http://127.0.0.1:5173/api/paytr/callback" };
assert.equal(paytrRuntime(invalidProductionLoopback).returnUrlsConfigured, false);

console.log(JSON.stringify({
  PAYTR_VALID_SIGNATURE: "PASS",
  PAYTR_TAMPERED_SIGNATURE_REJECTED: "PASS",
  PAYTR_AMOUNT_CHANGE_REJECTED: "PASS",
  PAYTR_STATUS_CHANGE_REJECTED: "PASS",
  PAYTR_UNCONFIGURED_FAIL_CLOSED: "PASS",
  PAYTR_LIVE_MODE_FAIL_CLOSED: "PASS",
  PAYTR_TOKEN_TEST_MODE_OVERRIDE_REJECTED: "PASS",
  PAYTR_PRODUCTION_HOST_ALLOWLIST: "PASS",
  PAYTR_PRODUCTION_LOOPBACK_REJECTED: "PASS",
  EXTERNAL_PAYTR_NETWORK: "NOT_USED",
}));
