/* global process, Buffer */
import crypto from "node:crypto";

const tokenTimeoutMs = 15_000;
const tokenLeaseMs = 30_000;

export const paytrConfig = (env = process.env) => ({
  enabled: String(env.PAYTR_ENABLED || "0") === "1",
  merchantId: String(env.PAYTR_MERCHANT_ID || ""),
  merchantKey: String(env.PAYTR_MERCHANT_KEY || ""),
  merchantSalt: String(env.PAYTR_MERCHANT_SALT || ""),
  testMode: String(env.PAYTR_TEST_MODE || "1"),
  okUrl: String(env.PAYTR_OK_URL || ""),
  failUrl: String(env.PAYTR_FAIL_URL || ""),
  callbackUrl: String(env.PAYTR_CALLBACK_URL || ""),
});

function isLoopbackHost(hostname) {
  return ["127.0.0.1", "localhost", "::1"].includes(String(hostname || "").toLowerCase());
}

function isProductionRuntime(env) {
  return String(env.NODE_ENV || "").toLowerCase() === "production"
    || String(env.VERCEL_ENV || "").toLowerCase() === "production";
}

function isPaytrEndpoint(value, expectedPath, env = {}) {
  try {
    const url = new URL(String(value || ""));
    if (!/^https?:$/u.test(url.protocol) || url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) return false;
    if (isLoopbackHost(url.hostname)) return !isProductionRuntime(env) && (url.protocol === "http:" || url.protocol === "https:");
    if (url.protocol !== "https:") return false;
    const configuredOrigin = String(env.APP_ORIGIN || env.BETTER_AUTH_URL || "").trim();
    if (configuredOrigin) {
      try {
        const origin = new URL(configuredOrigin);
        return origin.protocol === "https:" && url.hostname === origin.hostname && url.port === origin.port;
      } catch {
        return false;
      }
    }
    return ["fixoku.com", "www.fixoku.com"].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function assertPaytrUrlConfig(config, env) {
  if (!isPaytrEndpoint(config.okUrl, "/api/paytr/return-success", env)
    || !isPaytrEndpoint(config.failUrl, "/api/paytr/return-failure", env)
    || !isPaytrEndpoint(config.callbackUrl, "/api/paytr/callback", env)) {
    const error = new Error("PAYTR_URL_CONFIG_REQUIRED"); error.code = "PAYTR_URL_CONFIG_REQUIRED"; error.status = 503; throw error;
  }
}

export function paytrRuntime(env = process.env) {
  const c = paytrConfig(env);
  const credentials = Boolean(c.merchantId && c.merchantKey && c.merchantSalt);
  const testOnly = c.testMode === "1";
  const configured = c.enabled && credentials && testOnly;
  return {
    implementationReady: true,
    configured,
    status: configured ? "CONFIGURED" : "CONFIG_REQUIRED",
    testMode: c.testMode,
    testOnly,
    returnUrlsConfigured: isPaytrEndpoint(c.okUrl, "/api/paytr/return-success", env)
      && isPaytrEndpoint(c.failUrl, "/api/paytr/return-failure", env)
      && isPaytrEndpoint(c.callbackUrl, "/api/paytr/callback", env),
  };
}

export function paytrToken({ merchantOid, userIp, email, paymentAmount, userBasket, noInstallment = "0", maxInstallmentNum = "0", currency = "TL", testMode = "1" }, env = process.env) {
  const c = paytrConfig(env);
  if (!c.enabled || !c.merchantId || !c.merchantKey || !c.merchantSalt || c.testMode !== "1" || String(testMode) !== "1") {
    const error = new Error("PAYTR_CONFIG_REQUIRED"); error.code = "PAYTR_CONFIG_REQUIRED"; error.status = 503; throw error;
  }
  const payload = `${c.merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallmentNum}${currency}${testMode}${c.merchantSalt}`;
  return crypto.createHmac("sha256", c.merchantKey).update(payload).digest("base64");
}

export function verifyPaytrCallback(fields, env = process.env) {
  const c = paytrConfig(env);
  if (!c.merchantKey || !c.merchantSalt) return false;
  const merchantOid = String(fields.merchant_oid || "");
  const status = String(fields.status || "");
  const totalAmount = String(fields.total_amount || "");
  const expected = crypto.createHmac("sha256", c.merchantKey).update(`${merchantOid}${c.merchantSalt}${status}${totalAmount}`).digest("base64");
  const actual = Buffer.from(String(fields.hash || "")); const wanted = Buffer.from(expected);
  return actual.length === wanted.length && crypto.timingSafeEqual(wanted, actual);
}

export function assertPaytrCallbackOrderFacts({ attempt, order, payload }) {
  if (!attempt || !order) throw settlementError("PAYTR_ATTEMPT_NOT_FOUND", 409);
  if (String(attempt.currency).toUpperCase() !== String(order.currency).toUpperCase() || Number(attempt.amount_minor) !== Number(order.total_minor)) throw settlementError("PAYTR_ATTEMPT_ORDER_MISMATCH");
  if (String(payload.merchant_oid) !== String(attempt.merchant_oid)) throw settlementError("PAYTR_REFERENCE_INVALID", 400);
  if (payload.payment_amount != null && parsePaytrMinor(payload.payment_amount) !== Number(attempt.amount_minor)) throw settlementError("PAYTR_BASE_AMOUNT_MISMATCH");
}


/** Use only persisted checkout snapshots, never customer fields from an unauthenticated client. */
export function paytrCustomerFromOrder(row) {
  const object = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value === "string") {
      try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; }
      catch { return {}; }
    }
    return {};
  };
  const shipping = object(row?.shippingSnapshot);
  const billing = object(row?.billingSnapshot);
  const join = (...parts) => parts.map((part) => String(part || "").trim()).filter(Boolean).join(" ");
  const userName = join(billing.firstName, billing.lastName) || join(shipping.firstName, shipping.lastName) || String(row?.customerName || "").trim();
  const userAddress = [shipping.addressLine || billing.addressLine, shipping.district || billing.district, shipping.city || billing.city].map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  const userPhone = String(shipping.phone || billing.phone || "").trim();
  return { userName, userAddress, userPhone };
}

function validatePaytrCustomer(input) {
  const userName = String(input?.userName || "").trim();
  const userAddress = String(input?.userAddress || "").trim();
  const userPhone = String(input?.userPhone || "").trim();
  if (!userName || userName.length > 60 || !userAddress || userAddress.length > 400 || !userPhone || userPhone.length > 20) {
    const error = new Error("PAYTR_CUSTOMER_INFO_REQUIRED"); error.code = "PAYTR_CUSTOMER_INFO_REQUIRED"; error.status = 422; throw error;
  }
  return { userName, userAddress, userPhone };
}

export async function requestPaytrIframeToken(input, env = process.env) {
  const c = paytrConfig(env);
  const customer = validatePaytrCustomer(input);
  assertPaytrUrlConfig(c, env);
  const token = paytrToken(input, env);
  if (env.FIXOKU_PAYTR_TOKEN_MOCK && !isProductionRuntime(env)) return String(env.FIXOKU_PAYTR_TOKEN_MOCK);
  const form = new URLSearchParams({
    merchant_id: c.merchantId, user_ip: input.userIp, merchant_oid: input.merchantOid,
    user_name: customer.userName, user_address: customer.userAddress, user_phone: customer.userPhone,
    email: input.email, payment_amount: String(input.paymentAmount), paytr_token: token,
    user_basket: input.userBasket, no_installment: String(input.noInstallment || "0"),
    max_installment: String(input.maxInstallmentNum || "0"), currency: input.currency || "TL",
    test_mode: String(input.testMode ?? c.testMode), merchant_ok_url: c.okUrl, merchant_fail_url: c.failUrl,
    debug_on: "0", lang: "tr",
  });
  const fetcher = typeof env.FIXOKU_PAYTR_TOKEN_FETCHER === "function" ? env.FIXOKU_PAYTR_TOKEN_FETCHER : globalThis.fetch;
  const response = await fetcher("https://www.paytr.com/odeme/api/get-token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form, redirect: "error", signal: AbortSignal.timeout(tokenTimeoutMs) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status !== "success" || !result.token) { const error = new Error(result.status === "failed" ? "PAYTR_TOKEN_PROVIDER_REJECTED" : "PAYTR_TOKEN_REQUEST_FAILED"); error.code = result.status === "failed" ? "PAYTR_TOKEN_PROVIDER_REJECTED" : "PAYTR_TOKEN_REQUEST_FAILED"; error.status = 503; throw error; }
  return result.token;
}


export function toPaytrMerchantOid(orderId) {
  const value = String(orderId || "").toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
    throw Object.assign(new Error("PAYTR_ORDER_ID_INVALID"), {code:"PAYTR_ORDER_ID_INVALID",status:400});
  }
  return value.replace(/-/g, "");
}

export function fromPaytrMerchantOid(merchantOid) {
  const value = String(merchantOid || "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(value)) {
    throw Object.assign(new Error("PAYTR_REFERENCE_INVALID"), {code:"PAYTR_REFERENCE_INVALID",status:400});
  }
  return [value.slice(0,8),value.slice(8,12),value.slice(12,16),value.slice(16,20),value.slice(20)].join("-");
}

export function paymentAttemptOrderKind(order) {
  return order === "TRAINER_PACKAGE_ORDER" ? "TRAINER_PACKAGE_ORDER" : "STUDENT_ORDER";
}

/**
 * Creates or reuses the one active PayTR attempt for an order. Call inside a
 * transaction after the order has been authenticated. The advisory lock and
 * partial unique index make this safe when two tabs request a token together.
 */
export async function ensurePaytrPaymentAttempt(client, { orderKind, orderId, amountMinor, currency, environment = "TEST" }) {
  const kind = paymentAttemptOrderKind(orderKind);
  const normalizedOrderId = String(orderId || "").toLowerCase();
  const amount = parsePaytrMinor(amountMinor);
  const normalizedCurrency = normalizePaytrCurrency(currency);
  if (normalizedCurrency !== "TRY") throw Object.assign(new Error("PAYTR_PAYMENT_CURRENCY_MISMATCH"), { code: "PAYTR_PAYMENT_CURRENCY_MISMATCH", status: 409 });
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`PAYTR_ATTEMPT:${kind}:${normalizedOrderId}`]);
  const existing = (await client.query("select * from paytr_payment_attempts where order_kind=$1 and order_id=$2 and status in ('CREATED','TOKEN_PENDING','TOKEN_READY','PAYMENT_PENDING','UNKNOWN','REVIEW') for update", [kind, normalizedOrderId])).rows[0];
  if (existing) {
    if (Number(existing.amount_minor) !== amount || normalizePaytrCurrency(existing.currency) !== normalizedCurrency) throw Object.assign(new Error("PAYTR_ATTEMPT_IMMUTABLE_MISMATCH"), { code: "PAYTR_ATTEMPT_IMMUTABLE_MISMATCH", status: 409 });
    if (["SUCCEEDED", "UNKNOWN", "REVIEW"].includes(String(existing.status))) throw Object.assign(new Error(`PAYTR_ATTEMPT_${existing.status}`), { code: `PAYTR_ATTEMPT_${existing.status}`, status: 409 });
    if (String(existing.status) === "TOKEN_PENDING" && existing.token_requested_at && (Date.now() - new Date(existing.token_requested_at).getTime()) < 60_000) throw Object.assign(new Error("PAYTR_TOKEN_REQUEST_IN_PROGRESS"), { code: "PAYTR_TOKEN_REQUEST_IN_PROGRESS", status: 409 });
    if (["FAILED", "CANCELLED", "SUPERSEDED"].includes(String(existing.status))) {
      return (await client.query("update paytr_payment_attempts set status='CREATED',token_status='NOT_REQUESTED',last_error_code=null,review_required=false,review_reason=null,updated_at=now() where id=$1 returning *", [existing.id])).rows[0];
    }
    return existing;
  }
  const merchantOid = crypto.randomUUID().replaceAll("-", "");
  const columns = kind === "STUDENT_ORDER"
    ? "order_kind,order_id,student_order_id,merchant_oid,amount_minor,currency,environment"
    : "order_kind,order_id,trainer_order_id,merchant_oid,amount_minor,currency,environment";
  const values = kind === "STUDENT_ORDER"
    ? [kind, normalizedOrderId, normalizedOrderId, merchantOid, amount, normalizedCurrency, environment]
    : [kind, normalizedOrderId, normalizedOrderId, merchantOid, amount, normalizedCurrency, environment];
  return (await client.query(`insert into paytr_payment_attempts(${columns}) values($1,$2,$3,$4,$5,$6,$7) returning *`, values)).rows[0];
}

function tokenEncryptionKey(env = process.env) {
  const raw = String(env.PAYTR_TOKEN_ENCRYPTION_KEY || "");
  if (!raw) return null;
  try { const decoded = Buffer.from(raw, "base64"); return decoded.length === 32 ? decoded : crypto.createHash("sha256").update(raw).digest(); }
  catch { return crypto.createHash("sha256").update(raw).digest(); }
}

export function encryptPaytrToken(token, env = process.env) {
  const key = tokenEncryptionKey(env);
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), authTag: cipher.getAuthTag().toString("base64url"), keyVersion: String(env.PAYTR_TOKEN_ENCRYPTION_KEY_VERSION || "v1") };
}

export function decryptPaytrToken(record, env = process.env) {
  const key = tokenEncryptionKey(env);
  if (!key || !record?.token_ciphertext || !record?.token_iv || !record?.token_auth_tag) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.token_iv, "base64url"));
    decipher.setAuthTag(Buffer.from(record.token_auth_tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(record.token_ciphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch { return null; }
}

export async function claimPaytrTokenLease(client, { merchantOid, leaseId = crypto.randomUUID(), now = new Date() }) {
  const row = (await client.query(`update paytr_payment_attempts
    set token_lease_id=$1,token_lease_until=$2,status='TOKEN_PENDING',token_status='PENDING',token_requested_at=coalesce(token_requested_at,now()),updated_at=now()
    where merchant_oid=$3 and status in ('CREATED','FAILED','CANCELLED')
      and (token_lease_until is null or token_lease_until < $4)
    returning *`, [leaseId, new Date(now.getTime() + tokenLeaseMs), merchantOid, now])).rows[0];
  if (row) return { leaseId, attempt: row, claimed: true };
  return { leaseId, attempt: (await client.query("select * from paytr_payment_attempts where merchant_oid=$1 for update", [merchantOid])).rows[0] || null, claimed: false };
}

export async function persistPaytrToken(client, { merchantOid, leaseId, token, env = process.env }) {
  const encrypted = encryptPaytrToken(token, env);
  if (!encrypted) throw Object.assign(new Error("PAYTR_TOKEN_ENCRYPTION_REQUIRED"), { code: "PAYTR_TOKEN_ENCRYPTION_REQUIRED", status: 503 });
  return (await client.query(`update paytr_payment_attempts set token_ciphertext=$1,token_iv=$2,token_auth_tag=$3,token_key_version=$4,token_status='READY',status='TOKEN_READY',token_expires_at=now()+interval '15 minutes',token_lease_id=null,token_lease_until=null,last_error_code=null,updated_at=now() where merchant_oid=$5 and token_lease_id=$6 returning *`, [encrypted.ciphertext, encrypted.iv, encrypted.authTag, encrypted.keyVersion, merchantOid, leaseId])).rows[0] || null;
}

export async function releasePaytrTokenLease(client, { merchantOid, leaseId, errorCode, status = "FAILED" }) {
  return (await client.query("update paytr_payment_attempts set status=$1,token_status='FAILED',token_lease_id=null,token_lease_until=null,last_error_code=$2,updated_at=now() where merchant_oid=$3 and token_lease_id=$4 returning *", [status, errorCode, merchantOid, leaseId])).rows[0] || null;
}

export async function markPaytrAttemptToken(client, { merchantOid, status, errorCode = null }) {
  const tokenStatus = status === "READY" ? "READY" : status === "PENDING" ? "PENDING" : status === "EXPIRED" ? "EXPIRED" : "FAILED";
  const attemptStatus = status === "READY" ? "TOKEN_READY" : status === "PENDING" ? "TOKEN_PENDING" : "FAILED";
  return (await client.query("update paytr_payment_attempts set token_status=$1,status=$2,last_error_code=$3,token_requested_at=coalesce(token_requested_at,now()),token_expires_at=case when $2='TOKEN_READY' then now()+interval '15 minutes' else token_expires_at end,updated_at=now() where merchant_oid=$4 returning *", [tokenStatus, attemptStatus, errorCode, merchantOid])).rows[0] || null;
}

export async function recordPaytrAttemptCallback(client, { merchantOid, callbackStatus, callbackHash, settlement = null, providerTransactionId = null, errorCode = null, reviewRequired = false, reviewReason = null }) {
  const status = callbackStatus === "success" && settlement ? "SUCCEEDED" : callbackStatus === "failed" ? "FAILED" : reviewRequired ? "REVIEW" : "UNKNOWN";
  return (await client.query(`update paytr_payment_attempts
    set last_callback_status=$1,last_callback_hash=$2,last_error_code=$3,review_required=$4,review_reason=$5,
        provider_reference=coalesce(provider_reference,$6),provider_transaction_id=coalesce(provider_transaction_id,$7),
        collected_amount_minor=coalesce($8,collected_amount_minor),installment_count=coalesce($9,installment_count),
        installment_difference_minor=coalesce($10,installment_difference_minor),verified_at=case when $11 then coalesce(verified_at,now()) else verified_at end,
        succeeded_at=case when $12 then coalesce(succeeded_at,now()) else succeeded_at end,
        failed_at=case when $13 then coalesce(failed_at,now()) else failed_at end,status=case when status='SUCCEEDED' and $4 then status else $14 end,updated_at=now()
    where merchant_oid=$15 returning *`, [callbackStatus, callbackHash, errorCode, reviewRequired, reviewReason, settlement ? `paytr:${merchantOid}` : null, providerTransactionId, settlement?.collectedAmountMinor ?? null, settlement?.installments ?? null, settlement?.installmentDifferenceMinor ?? null, Boolean(settlement), status === "SUCCEEDED", status === "FAILED", status, merchantOid])).rows[0] || null;
}


function settlementError(code, status = 409) {
  return Object.assign(new Error(code), {
    code,
    status
  });
}

export function normalizePaytrCurrency(value) {
  const currency = String(value ?? "").trim().toUpperCase();
  return currency === "TL" ? "TRY" : currency;
}

export function parsePaytrMinor(value) {
  const text = String(value ?? "");

  if (!/^[0-9]{1,12}$/.test(text)) {
    throw settlementError("PAYTR_INVALID_MINOR_AMOUNT");
  }

  const amount = Number(text);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw settlementError("PAYTR_INVALID_MINOR_AMOUNT");
  }

  return amount;
}

export function parsePaytrDecimalMinor(value) {
  const text = String(value ?? "").trim();

  if (!/^[0-9]{1,10}(?:[.,][0-9]{1,2})?$/.test(text)) {
    throw settlementError("PAYTR_INVALID_DECIMAL_AMOUNT");
  }

  const [whole, fraction = ""] = text.replace(",", ".").split(".");

  return parsePaytrMinor(
    String(Number(whole) * 100 + Number(fraction.padEnd(2, "0")))
  );
}

export async function requestPaytrPaymentStatus(
  merchantOid,
  env = process.env,
  fetcher = globalThis.fetch
) {
  const config = paytrConfig(env);

  if (
    !config.enabled ||
    !config.merchantId ||
    !config.merchantKey ||
    !config.merchantSalt ||
    config.testMode !== "1"
  ) {
    throw settlementError("PAYTR_CONFIG_REQUIRED", 503);
  }

  if (!/^[a-f0-9]{32}$/.test(String(merchantOid))) {
    throw settlementError("PAYTR_REFERENCE_INVALID");
  }

  if (env.FIXOKU_PAYTR_STATUS_MOCK_JSON && !isProductionRuntime(env)) {
    try {
      const mock = JSON.parse(String(env.FIXOKU_PAYTR_STATUS_MOCK_JSON));
      return mock;
    } catch {
      throw settlementError("PAYTR_STATUS_MOCK_INVALID", 503);
    }
  }

  const signature = crypto
    .createHmac("sha256", config.merchantKey)
    .update(config.merchantId + merchantOid + config.merchantSalt)
    .digest("base64");

  const body = new URLSearchParams({
    merchant_id: config.merchantId,
    merchant_oid: merchantOid,
    paytr_token: signature
  });

  const response = await fetcher(
    "https://www.paytr.com/odeme/durum-sorgu",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!response.ok) {
    throw settlementError("PAYTR_STATUS_HTTP_FAILED", 503);
  }

  const result = await response.json();

  if (result?.status !== "success") {
    throw settlementError("PAYTR_STATUS_NOT_CONFIRMED", 503);
  }

  return result;
}

export function validatePaytrSettlement({
  payload,
  providerStatus,
  expectedAmountMinor,
  expectedCurrency,
  expectedTestMode
}) {
  if (
    !payload ||
    payload.status !== "success" ||
    providerStatus?.status !== "success"
  ) {
    throw settlementError("PAYTR_PAYMENT_NOT_CONFIRMED");
  }

  if (!["0", "1"].includes(String(expectedTestMode))) {
    throw settlementError("PAYTR_INVALID_EXPECTED_MODE");
  }

  if (
    String(providerStatus.test_mode ?? "") !==
    String(expectedTestMode)
  ) {
    throw settlementError("PAYTR_PAYMENT_MODE_MISMATCH");
  }

  if (
    payload.test_mode != null &&
    String(payload.test_mode) !== String(expectedTestMode)
  ) {
    throw settlementError("PAYTR_CALLBACK_MODE_MISMATCH");
  }

  const orderAmount = parsePaytrMinor(expectedAmountMinor);

  const providerBase = parsePaytrDecimalMinor(
    providerStatus.payment_amount
  );

  const providerTotal = parsePaytrDecimalMinor(
    providerStatus.payment_total
  );

  const callbackTotal = parsePaytrMinor(payload.total_amount);

  if (
    providerBase !== orderAmount ||
    providerTotal !== callbackTotal ||
    providerTotal < orderAmount
  ) {
    throw settlementError("PAYTR_PAYMENT_AMOUNT_MISMATCH");
  }

  if (
    payload.payment_amount != null &&
    parsePaytrMinor(payload.payment_amount) !== orderAmount
  ) {
    throw settlementError("PAYTR_BASE_AMOUNT_MISMATCH");
  }

  const currency = normalizePaytrCurrency(expectedCurrency);

  if (
    currency !== "TRY" ||
    normalizePaytrCurrency(providerStatus.currency) !== currency ||
    (
      payload.currency != null &&
      normalizePaytrCurrency(payload.currency) !== currency
    )
  ) {
    throw settlementError("PAYTR_PAYMENT_CURRENCY_MISMATCH");
  }

  const installmentText = String(providerStatus.taksit ?? "");

  if (!/^(?:0|1|[2-9]|1[012])$/.test(installmentText)) {
    throw settlementError("PAYTR_INSTALLMENT_INVALID");
  }

  if (
    !["KART", "CARD", "CART"].includes(
      String(providerStatus.odeme_tipi ?? "").toUpperCase()
    )
  ) {
    throw settlementError("PAYTR_PAYMENT_METHOD_MISMATCH");
  }

  if (
    providerStatus.returns != null &&
    (
      !Array.isArray(providerStatus.returns) ||
      providerStatus.returns.length > 0
    )
  ) {
    throw settlementError("PAYTR_REFUND_REVIEW_REQUIRED");
  }

  return {
    orderAmountMinor: orderAmount,
    collectedAmountMinor: providerTotal,
    installmentDifferenceMinor: providerTotal - orderAmount,
    providerTransactionId: providerStatus.transaction_id || providerStatus.transaction_reference || providerStatus.reference || null,
    currency,
    installments: Math.max(1, Number(installmentText)),
    testMode: String(expectedTestMode)
  };
}


export function paytrTestSettlementAllowed(env = process.env) {
  const localUrl = (() => { try { const url = new URL(String(env.DATABASE_URL || "")); return ["127.0.0.1", "localhost", "::1"].includes(url.hostname.toLowerCase()); } catch { return false; } })();
  const local = env.FIXOKU_LOCAL_PAYTR_TEST === "1" && localUrl && env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production" && String(env.PAYTR_TEST_MODE || "1") === "1";
  return local || (env.VERCEL_ENV === "preview" &&
    env.NODE_ENV === "production" &&
    env.PAYTR_TEST_MODE === "1" &&
    env.FIXOKU_PAYTR_STAGING_TEST_APPROVED === "1");
}
