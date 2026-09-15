/* global process */
import { getSmtpConfig } from "./email-outbox.js";
import { getDigitalStorageConfig } from "./digital-delivery.js";
import { shippingRuntime } from "../shipping/adapter.js";

/**
 * Provider health is deliberately configuration-only. It never probes an
 * external service from a page request and never returns credentials.
 */
export function providerHealth(env = process.env) {
  const smtp = getSmtpConfig(env);
  const emailTest = String(env.EMAIL_PROVIDER || "").toUpperCase() === "TEST" || String(env.EMAIL_TEST_MODE || "") === "1";
  const email = smtp ? { provider: emailTest ? "TEST" : "SMTP", status: emailTest ? "CONFIGURED_TEST" : "CONFIGURED", configured: true } : { provider: String(env.EMAIL_PROVIDER || "SMTP").toUpperCase(), status: "DISABLED_CONFIG_REQUIRED", configured: false };
  const storage = getDigitalStorageConfig(env);
  const digitalStorage = { provider: storage.provider, status: storage.enabled ? "CONFIGURED" : storage.reason || "CONFIGURATION_REQUIRED", configured: Boolean(storage.enabled) };
  const shipping = shippingRuntime(env);
  return { email, digitalStorage, shipping: { provider: shipping.provider, status: shipping.status, configured: shipping.enabled } };
}
