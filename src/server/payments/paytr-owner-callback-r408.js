import crypto from "node:crypto";

import pg from "../db/guarded-pg.js";

import {
  verifyPaytrCallback,
  requestPaytrPaymentStatus,
  validatePaytrSettlement
} from "./paytr.js";

import {
  ownerPaytrTestAllowed,
  isOwnerTestReference,
  assertOwnerTestCallback
} from "./paytr-owner-test-r408.js";

export async function processOwnerTestCallback(payload) {
  return executeOwnerTestCallback(payload);
}

export async function executeOwnerTestCallback(payload, {
  env = process.env,
  injectedPool = null,
  statusRequester = requestPaytrPaymentStatus
} = {}) {
  if (!ownerPaytrTestAllowed(env))
    return { status:503, body:"OWNER_TEST_DISABLED" };

  if (!isOwnerTestReference(payload?.merchant_oid))
    return { status:400, body:"OWNER_TEST_REFERENCE_INVALID" };

  if (!verifyPaytrCallback(payload,env))
    return { status:401, body:"OWNER_TEST_SIGNATURE_INVALID" };

  const oid = payload.merchant_oid;

  const digest = crypto.createHash("sha256")
    .update(String(payload.hash))
    .digest("hex");

  const pool = injectedPool || new pg.Pool({
    connectionString:env.DATABASE_URL
  });

  let client;

  try {
    client = await pool.connect();

    await client.query("begin");

    const row = (await client.query(`
      select *
      from public.paytr_owner_test_attempts
      where merchant_oid=$1
      for update
    `,[oid])).rows[0];

    if (!row) {
      await client.query("rollback");
      return { status:404, body:"OWNER_TEST_ATTEMPT_NOT_FOUND" };
    }

    assertOwnerTestCallback({
      payload,
      env,
      attempt:{
        merchantOid:row.merchant_oid,
        environment:row.environment,
        amountMinor:Number(row.amount_minor),
        currency:row.currency
      }
    });

    if (row.status === "SUCCEEDED" ||
        row.status === "FAILED") {

      if (row.callback_hash_sha256 === digest) {
        await client.query(`
          update public.paytr_owner_test_attempts
          set callback_count=callback_count+1
          where merchant_oid=$1
        `,[oid]);

        await client.query("commit");
        return { status:200, body:"OK" };
      }

      await client.query(`
        update public.paytr_owner_test_attempts
        set last_error_code='CONFLICTING_CALLBACK', callback_count=callback_count+1
        where merchant_oid=$1
      `,[oid]);

      await client.query("commit");

      return { status:409, body:"OWNER_TEST_CALLBACK_CONFLICT" };
    }

    if (![
      "TOKEN_PENDING",
      "TOKEN_READY",
      "REVIEW_REQUIRED"
    ].includes(row.status)) {
      await client.query("rollback");

      return { status:409, body:"OWNER_TEST_STATE_INVALID" };
    }

    // Expiry limits token issuance, not receipt of a valid callback.
    // Late callbacks still require signature and settlement validation.

    if (payload.status === "failed") {
      await client.query(`
        update public.paytr_owner_test_attempts
        set status='FAILED',
            callback_hash_sha256=$2,
            callback_received_at=now(),
            completed_at=now(),
            callback_count=callback_count+1,
            collected_amount_minor=null,
            provider_verified=false,
            last_error_code='PAYTR_TEST_PAYMENT_FAILED'
        where merchant_oid=$1
      `,[oid,digest]);

      await client.query("commit");

      return { status:200, body:"OK" };
    }

    let settlement;

    try {
      const providerStatus = await statusRequester(oid,env);

      settlement = validatePaytrSettlement({
        payload,
        providerStatus,
        expectedAmountMinor:100,
        expectedCurrency:"TRY",
        expectedTestMode:"1"
      });

      if (settlement.orderAmountMinor !== 100 ||
          settlement.collectedAmountMinor !== 100 ||
          settlement.installments !== 1)
        throw new Error("OWNER_TEST_SETTLEMENT_MISMATCH");

    } catch {
      await client.query(`
        update public.paytr_owner_test_attempts
        set status='REVIEW_REQUIRED',
            callback_received_at=now(),
            callback_hash_sha256=$2,
            callback_count=callback_count+1,
            last_error_code='PROVIDER_STATUS_UNCONFIRMED'
        where merchant_oid=$1
      `,[oid,digest]);

      await client.query("commit");

      return { status:503, body:"OWNER_TEST_PROVIDER_REVIEW" };
    }

    const providerReference = settlement.providerTransactionId
      ? String(settlement.providerTransactionId).slice(0,160)
      : null;

    await client.query(`
      update public.paytr_owner_test_attempts
      set status='SUCCEEDED',
          callback_hash_sha256=$2,
          callback_received_at=now(),
          completed_at=now(),
          callback_count=callback_count+1,
          collected_amount_minor=100,
          provider_verified=true,
          provider_transaction_reference=$3,
          last_error_code=null
      where merchant_oid=$1
    `,[oid,digest,providerReference]);

    await client.query("commit");

    return { status:200, body:"OK" };

  } catch {
    if (client)
      await client.query("rollback").catch(()=>{});

    return { status:409, body:"OWNER_TEST_CALLBACK_REJECTED" };

  } finally {
    if (client) client.release();
    if (!injectedPool) await pool.end();
  }
}