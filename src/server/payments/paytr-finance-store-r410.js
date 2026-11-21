import crypto from "node:crypto";
import {
  validatePaytrFinance
} from "./paytr-finance-r410.js";

// Caller owns the verified database transaction.
// Provider response must come from the server-side PayTR request.
// This module never contacts PayTR or modifies payment status.

export function financeEvidence(value) {
  const facts = [
    value.merchantOid,
    value.orderKind,
    value.currency,
    value.orderAmountMinor,
    value.collectedAmountMinor,
    value.deductionMinor,
    value.providerNetMinor,
    value.customerInstallmentDifferenceMinor,
    value.merchantPaymentCostMinor,
    value.installmentCount,
    value.installmentCategory
  ];

  return crypto.createHash("sha256")
    .update(JSON.stringify(facts))
    .digest("hex");
}

export async function recordPaytrFinance(
  client,
  {attemptId,providerStatus}
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
      .test(String(attemptId || ""))
  ) throw new Error("FINANCE_ATTEMPT_ID_INVALID");

  const attempt = (await client.query(`
    select id,order_id,order_kind,merchant_oid,
      environment,status,review_required,
      verified_at,succeeded_at,currency,
      amount_minor,collected_amount_minor,
      installment_count,installment_difference_minor
    from public.paytr_payment_attempts
    where id=$1 for update
  `,[attemptId])).rows[0];

  if (!attempt)
    throw new Error("FINANCE_ATTEMPT_NOT_FOUND");

  const value = validatePaytrFinance({
    attempt,providerStatus
  });

  const evidence = financeEvidence(value);

  await client.query(`
    select pg_advisory_xact_lock(hashtext($1))
  `,[
    "R410_PAYTR_FINANCE:"+
    attempt.order_kind+":"+attempt.order_id
  ]);

  const existing = (await client.query(`
    select attempt_id,evidence_sha256
    from public.r410_paytr_finance
    where attempt_id=$1
       or (order_kind=$2 and order_id=$3)
    for update
  `,[
    attempt.id,
    attempt.order_kind,
    attempt.order_id
  ])).rows;

  const event = async(type) => {
    await client.query(`
      insert into public.r410_paytr_finance_events(
        attempt_id,event_type,evidence_sha256
      ) values($1,$2,$3)
      on conflict(
        attempt_id,event_type,evidence_sha256
      ) do nothing
    `,[attempt.id,type,evidence]);
  };

  if (existing.length) {
    if (
      existing.length===1 &&
      String(existing[0].attempt_id)===
        String(attempt.id) &&
      existing[0].evidence_sha256===evidence
    ) return {status:"ALREADY_RECORDED"};

    await event("CONFLICT_REVIEW_REQUIRED");

    return {status:"REVIEW_REQUIRED"};
  }

  await client.query(`
    insert into public.r410_paytr_finance(
      attempt_id,merchant_oid,order_kind,order_id,
      currency,order_amount_minor,
      collected_amount_minor,deduction_minor,
      provider_net_minor,customer_difference_minor,
      merchant_payment_cost_minor,installment_count,
      installment_category,evidence_sha256,payment_at
    ) values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15
    )
  `,[
    attempt.id,
    value.merchantOid,
    value.orderKind,
    attempt.order_id,
    value.currency,
    value.orderAmountMinor,
    value.collectedAmountMinor,
    value.deductionMinor,
    value.providerNetMinor,
    value.customerInstallmentDifferenceMinor,
    value.merchantPaymentCostMinor,
    value.installmentCount,
    value.installmentCategory,
    evidence,
    attempt.succeeded_at
  ]);

  await event("VERIFIED");

  return {status:"RECORDED",value};
}