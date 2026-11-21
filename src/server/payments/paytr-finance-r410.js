function fail(code) {
  throw Object.assign(new Error(code), {code});
}

function integer(value) {
  if (!/^\d+$/u.test(String(value ?? "")))
    fail("PAYTR_FINANCE_INVALID_INTEGER");

  const n = Number(value);

  if (!Number.isSafeInteger(n) || n < 0)
    fail("PAYTR_FINANCE_INVALID_INTEGER");

  return n;
}

export function decimalMinor(value) {
  if (typeof value !== "string")
    fail("PAYTR_FINANCE_INVALID_DECIMAL");

  const m = value.trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/u);

  if (!m)
    fail("PAYTR_FINANCE_INVALID_DECIMAL");

  const amount =
    BigInt(m[1]) * 100n +
    BigInt((m[2] || "").padEnd(2,"0") || "0");

  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    fail("PAYTR_FINANCE_AMOUNT_OVERFLOW");

  return Number(amount);
}

export function validatePaytrFinance({
  attempt,
  providerStatus
}) {
  if (
    attempt?.environment !== "LIVE" ||
    attempt?.status !== "SUCCEEDED" ||
    attempt?.review_required !== false ||
    !attempt?.verified_at ||
    !attempt?.succeeded_at ||
    !["STUDENT_ORDER","TRAINER_PACKAGE_ORDER"].includes(
      attempt.order_kind
    ) ||
    !/^[a-f0-9]{32}$/u.test(
      String(attempt.merchant_oid || "")
    )
  ) fail("PAYTR_FINANCE_ATTEMPT_NOT_ELIGIBLE");

  if (
    providerStatus?.status !== "success" ||
    String(providerStatus.test_mode) !== "0"
  ) fail("PAYTR_FINANCE_PROVIDER_NOT_CONFIRMED");

  if (
    providerStatus.merchant_oid != null &&
    String(providerStatus.merchant_oid) !==
      attempt.merchant_oid
  ) fail("PAYTR_FINANCE_REFERENCE_MISMATCH");

  if (
    attempt.currency !== "TRY" ||
    !["TL","TRY"].includes(
      String(providerStatus.currency)
    )
  ) fail("PAYTR_FINANCE_CURRENCY_MISMATCH");

  if (providerStatus.odeme_tipi !== "KART")
    fail("PAYTR_FINANCE_PAYMENT_TYPE_UNSUPPORTED");

  if (
    providerStatus.returns != null &&
    (
      !Array.isArray(providerStatus.returns) ||
      providerStatus.returns.length > 0
    )
  ) fail("PAYTR_FINANCE_REFUND_REVIEW_REQUIRED");

  const gross = decimalMinor(
    providerStatus.payment_amount
  );

  const collected = decimalMinor(
    providerStatus.payment_total
  );

  const deduction = decimalMinor(
    providerStatus.kesinti_tutari
  );

  const net = decimalMinor(
    providerStatus.net_tutar
  );

  const rawInstallments = String(
    providerStatus.taksit ?? ""
  );

  if (!/^(0|[2-9]|1[0-2])$/u.test(rawInstallments))
    fail("PAYTR_FINANCE_INSTALLMENT_INVALID");

  const installments =
    rawInstallments === "0"
      ? 1
      : Number(rawInstallments);

  if (
    gross <= 0 ||
    gross !== integer(attempt.amount_minor) ||
    collected !== integer(attempt.collected_amount_minor) ||
    installments !== integer(attempt.installment_count) ||
    collected < gross
  ) fail("PAYTR_FINANCE_ORDER_MISMATCH");

  if (
    !Number.isSafeInteger(net + deduction) ||
    net + deduction !== collected
  ) fail("PAYTR_FINANCE_NET_REVIEW_REQUIRED");

  const customerDifference = collected - gross;

  if (
    customerDifference !==
      integer(attempt.installment_difference_minor)
  ) fail("PAYTR_FINANCE_DIFFERENCE_MISMATCH");

  if (installments === 1 && customerDifference !== 0)
    fail("PAYTR_FINANCE_SINGLE_PAYMENT_REVIEW_REQUIRED");

  const merchantPaymentCost = deduction - customerDifference;

  return Object.freeze({
    status:"VERIFIED",
    currency:"TRY",
    merchantOid:attempt.merchant_oid,
    orderKind:attempt.order_kind,
    orderAmountMinor:gross,
    collectedAmountMinor:collected,
    deductionMinor:deduction,
    providerNetMinor:net,
    customerInstallmentDifferenceMinor:customerDifference,
    merchantPaymentCostMinor:merchantPaymentCost,
    effectiveDeductionPercent:
      Number((deduction / collected * 100).toFixed(4)),
    installmentCount:installments,
    installmentCategory:
      installments === 1
        ? "SINGLE"
        : installments === 2 && customerDifference === 0
          ? "TWO_NO_CUSTOMER_SURCHARGE"
          : customerDifference > 0
            ? "CUSTOMER_SURCHARGE"
            : "OTHER_NO_CUSTOMER_SURCHARGE",
    bankTransferConfirmed:false
  });
}