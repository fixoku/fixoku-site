/* global process */
/** Provider-neutral shipping boundary. A provider implementation must return
 * normalized values and must never leak credentials or provider payloads. */
export class ShippingConfigurationError extends Error { constructor(message = "SHIPPING_PROVIDER_RUNTIME=DISABLED_CONFIG_REQUIRED") { super(message); this.code = "DISABLED_CONFIG_REQUIRED"; this.status = 503; } }

const timeoutSignal = (timeoutMs) => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); return { signal: controller.signal, clear: () => clearTimeout(timer) }; };
const ALLOWED_PROVIDERS = new Set(["DISABLED", "SENDEO", "MNG", "YURTICI", "ARAS"]);
const config = (env = process.env) => ({ provider: String(env.SHIPPING_PROVIDER || "").trim().toUpperCase(), token: env.SHIPPING_TOKEN || env.token || "", baseUrl: env.SHIPPING_BASE_URL || env.baseUrl || "" });

export function shippingRuntime(env = process.env) { const current = config(env); if (!current.provider || current.provider === "DISABLED") return { provider: "DISABLED", enabled: false, status: "DISABLED_CONFIG_REQUIRED" }; if (!ALLOWED_PROVIDERS.has(current.provider)) return { provider: "DISABLED", enabled: false, status: "CARRIER_SELECTION_REQUIRED" }; let validUrl = false; try { validUrl = Boolean(current.baseUrl && ["https:", "http:"].includes(new URL(current.baseUrl).protocol)); } catch { validUrl = false; } return { provider: current.provider, enabled: Boolean(current.token && validUrl), status: current.token && validUrl ? "CONFIGURED" : "CONFIG_REQUIRED" }; }

export function createShippingAdapter(options = {}) {
  const current = { ...config(), ...options, provider: options.provider || process.env.SHIPPING_PROVIDER || "MNG" }; const timeoutMs = Number(options.timeoutMs || process.env.SHIPPING_TIMEOUT_MS || 8000);
  async function request(path, payload, { method = "POST" } = {}) {
    if (!ALLOWED_PROVIDERS.has(String(current.provider).toUpperCase()) || current.provider === "DISABLED" || !current.token || !current.baseUrl) throw new ShippingConfigurationError();
    let target; try { target = new URL(path, current.baseUrl).toString(); } catch { throw new ShippingConfigurationError("SHIPPING_PROVIDER_BASE_URL_INVALID"); }
    const timeout = timeoutSignal(timeoutMs);
    try {
      const response = await fetch(target, { method, signal: timeout.signal, headers: { authorization: `Bearer ${current.token}`, "content-type": "application/json", accept: "application/json" }, body: method === "GET" ? undefined : JSON.stringify(payload || {}) });
      const data = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error("SHIPPING_PROVIDER_ERROR"); error.code = "PROVIDER_ERROR"; error.status = response.status >= 500 ? 503 : 502; throw error; }
      return data;
    } catch (error) { if (error?.name === "AbortError") { const timeoutError = new Error("SHIPPING_PROVIDER_TIMEOUT"); timeoutError.code = "PROVIDER_TIMEOUT"; timeoutError.status = 503; throw timeoutError; } throw error; } finally { timeout.clear(); }
  }
  return Object.freeze({
    runtime: shippingRuntime({ ...process.env, ...options, SHIPPING_PROVIDER: current.provider, SHIPPING_TOKEN: current.token, SHIPPING_BASE_URL: current.baseUrl }),
    quote: (input) => request("/quote", input),
    createShipment: (input) => request("/shipments", input),
    createLabel: (input) => request("/labels", input),
    getTracking: (trackingNumber) => request(`/tracking/${encodeURIComponent(String(trackingNumber))}`, null, { method: "GET" }),
    cancelShipment: (providerReference) => request(`/shipments/${encodeURIComponent(String(providerReference))}/cancel`, {}, { method: "POST" }),
  });
}

export const SHIPPING_PROVIDER_RUNTIME = shippingRuntime;
