/* global process, Buffer */
import crypto from "node:crypto";

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
  const form = new URLSearchParams({
    merchant_id: c.merchantId, user_ip: input.userIp, merchant_oid: input.merchantOid,
    user_name: customer.userName, user_address: customer.userAddress, user_phone: customer.userPhone,
    email: input.email, payment_amount: String(input.paymentAmount), paytr_token: token,
    user_basket: input.userBasket, no_installment: String(input.noInstallment || "0"),
    max_installment: String(input.maxInstallmentNum || "0"), currency: input.currency || "TL",
    test_mode: String(input.testMode ?? c.testMode), merchant_ok_url: c.okUrl, merchant_fail_url: c.failUrl,
    debug_on: "0", lang: "tr",
  });
  const response = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status !== "success" || !result.token) { const error = new Error("PAYTR_TOKEN_REQUEST_FAILED"); error.code = "PAYTR_TOKEN_REQUEST_FAILED"; error.status = 503; throw error; }
  return result.token;
}
