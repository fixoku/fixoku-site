import { resolvePrincipal, requirePermission } from "../src/server/auth/authorization.js";
import { getSmtpConfig } from "../src/server/domain/email-outbox.js";
import { getDigitalStorageConfig } from "../src/server/domain/digital-delivery.js";
import { shippingRuntime } from "../src/server/shipping/adapter.js";
import { paytrRuntime } from "../src/server/payments/paytr.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.end(JSON.stringify(body));
};

const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  let principal;
  try { principal = await resolvePrincipal(headers(req)); } catch { return json(res, 503, { error: "AUTHORITY_UNAVAILABLE" }); }
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "provider.read");
  if (denied) return json(res, denied.status, denied.body);

  const smtp = getSmtpConfig();
  const storage = getDigitalStorageConfig();
  const shipping = shippingRuntime();
  const paytr = paytrRuntime();
  const emailTest = String(process.env.EMAIL_PROVIDER || "").toUpperCase() === "TEST" || String(process.env.EMAIL_TEST_MODE || "") === "1";
  return json(res, 200, {
    providers: {
      email: { name: emailTest ? "TEST" : "SMTP", status: smtp ? (emailTest ? "CONFIGURED_TEST" : "CONFIGURED") : "DISABLED_CONFIG_REQUIRED", configured: Boolean(smtp), reason: smtp ? null : "SMTP_CONFIG_REQUIRED" },
      digitalStorage: { name: storage.provider, status: storage.enabled ? "CONFIGURED" : (storage.reason || "DISABLED_CONFIG_REQUIRED"), configured: Boolean(storage.enabled), reason: storage.enabled ? null : storage.reason },
      shipping: { name: shipping.provider === "DISABLED" ? "Kargo seçilmedi" : shipping.provider === "SENDEO" ? "Sendeo" : shipping.provider, status: shipping.provider === "DISABLED" ? "CONFIG_REQUIRED" : shipping.status, configured: Boolean(shipping.enabled), runtimeVerified: false, readyForLive: false, reason: shipping.enabled ? "CARRIER_API_CONTRACT_UNVERIFIED" : (shipping.status === "CARRIER_SELECTION_REQUIRED" ? "CARRIER_SELECTION_REQUIRED" : "SHIPPING_CONFIG_REQUIRED") },
      paytr: { name: "PayTR", status: paytr.configured ? "CONFIGURED_UNVERIFIED" : "CONFIG_REQUIRED", configured: Boolean(paytr.configured), runtimeVerified: false, readyForLive: false, reason: paytr.configured ? "PAYTR_PROVIDER_RUNTIME_TEST_REQUIRED" : "PAYTR_CONFIG_REQUIRED" },
    },
  });
}
