import crypto from "node:crypto";
import { paytrRuntime, verifyPaytrCallback } from "./paytr.js";

const ORIGIN = "https://fixoku.com";
const PREFIX = "FIXOKUR408TEST";
const TTL = 1800;

export function ownerPaytrTestAllowed(env = process.env) {
  const runtime = paytrRuntime(env);

  return (
    env.FIXOKU_PAYTR_OWNER_TEST_ENABLED === "1" &&
    env.FIXOKU_PRODUCTION_RUNTIME_ENABLED === "1" &&
    env.VERCEL_ENV === "production" &&
    env.NODE_ENV === "production" &&
    env.APP_ORIGIN === ORIGIN &&
    env.PAYTR_ENABLED === "1" &&
    env.PAYTR_TEST_MODE === "1" &&
    env.PAYTR_LIVE_APPROVED !== "1" &&
    env.PAYTR_LIVE_RUNTIME_VERIFIED !== "1" &&
    env.PAYTR_OK_URL === ORIGIN + "/api/paytr/return-success" &&
    env.PAYTR_FAIL_URL === ORIGIN + "/api/paytr/return-failure" &&
    env.PAYTR_CALLBACK_URL === ORIGIN + "/api/paytr/callback" &&
    runtime.configured === true &&
    runtime.returnUrlsConfigured === true &&
    runtime.liveReady === false
  );
}

export function isOwnerTestReference(value) {
  return /^FIXOKUR408TEST[0-9A-F]{32}$/u.test(String(value || ""));
}

export function createOwnerTestReference() {
  return PREFIX + crypto.randomBytes(16).toString("hex").toUpperCase();
}

export function ownerTestExpiry(now = Date.now()) {
  return new Date(now + TTL * 1000).toISOString();
}

export function assertOwnerTestCallback({
  payload,
  attempt,
  env = process.env
}) {
  if (!ownerPaytrTestAllowed(env)) {
    throw new Error("OWNER_TEST_DISABLED");
  }

  if (!isOwnerTestReference(payload?.merchant_oid)) {
    throw new Error("OWNER_TEST_REFERENCE_INVALID");
  }

  if (!verifyPaytrCallback(payload, env)) {
    throw new Error("OWNER_TEST_SIGNATURE_INVALID");
  }

  if (!attempt || attempt.merchantOid !== payload.merchant_oid) {
    throw new Error("OWNER_TEST_ATTEMPT_NOT_FOUND");
  }

  if (attempt.environment !== "TEST") {
    throw new Error("OWNER_TEST_MODE_INVALID");
  }

  if (payload.test_mode != null && String(payload.test_mode) !== "1") {
    throw new Error("OWNER_TEST_MODE_INVALID");
  }

  if (!["success","failed"].includes(String(payload.status))) {
    throw new Error("OWNER_TEST_STATUS_INVALID");
  }

  if (!/^[0-9]+$/u.test(String(payload.total_amount))) {
    throw new Error("OWNER_TEST_AMOUNT_INVALID");
  }

  const total = Number(payload.total_amount);

  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("OWNER_TEST_AMOUNT_INVALID");
  }

  if (attempt.amountMinor !== 100 || attempt.currency !== "TRY") {
    throw new Error("OWNER_TEST_AMOUNT_INVALID");
  }

  if (payload.status === "success" && total !== attempt.amountMinor) {
    throw new Error("OWNER_TEST_AMOUNT_MISMATCH");
  }

  return {
    merchantOid: attempt.merchantOid,
    environment: "TEST",
    status: payload.status === "success" ? "SUCCEEDED" : "FAILED",
    amountMinor: total,
    createsOrder: false,
    grantsEntitlement: false,
    createsShipment: false,
    createsFinanceEntry: false,
    createsCommission: false
  };
}