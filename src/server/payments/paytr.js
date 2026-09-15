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

export function paytrRuntime(env = process.env) {
  const c = paytrConfig(env);
  const credentials = Boolean(c.merchantId && c.merchantKey && c.merchantSalt);
  return { implementationReady: true, configured: c.enabled && credentials, status: c.enabled && credentials ? "CONFIGURED" : "CONFIG_REQUIRED", testMode: c.testMode };
}

export function paytrToken({ merchantOid, userIp, email, paymentAmount, userBasket, noInstallment = "0", maxInstallmentNum = "0", currency = "TL", testMode = "1" }, env = process.env) {
  const c = paytrConfig(env);
  if (!c.enabled || !c.merchantId || !c.merchantKey || !c.merchantSalt) {
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

export async function requestPaytrIframeToken(input, env = process.env) {
  const c = paytrConfig(env);
  const token = paytrToken(input, env);
  const form = new URLSearchParams({
    merchant_id: c.merchantId, user_ip: input.userIp, merchant_oid: input.merchantOid,
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
