import pg from "../../src/server/db/guarded-pg.js";
import { fulfillSuccessfulPayment } from "../../src/server/domain/commerce.js";
import { cleanPreviewGateResponse } from "../../src/server/auth/preview-contract.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); } }

/** Provider-neutral webhook boundary. A configured shared secret is required before production wiring. */
export default async function handler(req, res) {
  if (!cleanPreviewGateResponse(res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!process.env.COMMERCE_WEBHOOK_SECRET) return json(res, 503, { error: "PAYMENT_PROVIDER_NOT_CONFIGURED" });
  const supplied = String(req.headers["x-commerce-webhook-secret"] || "");
  if (supplied !== process.env.COMMERCE_WEBHOOK_SECRET) return json(res, 401, { error: "WEBHOOK_UNAUTHORIZED" });
  let payload;
  try { payload = await body(req); } catch (error) { return json(res, error.status || 400, { error: error.message }); }
  if (!payload.provider || !payload.providerEventId || !payload.orderId || !payload.eventType) return json(res, 400, { error: "WEBHOOK_IDENTITY_REQUIRED" });
  if (!["PAYMENT_SUCCEEDED", "payment.succeeded", "succeeded"].includes(payload.eventType)) return json(res, 202, { ignored: true, eventType: payload.eventType });
  if (["PAYTR", "BANK_TRANSFER", "DEV_ONLY_LOCAL"].includes(String(payload.provider).toUpperCase())) return json(res, 403, { error: "DEDICATED_PAYMENT_APPROVAL_REQUIRED" });
  if (!Number.isSafeInteger(payload.amountMinor) || payload.amountMinor <= 0 || !/^[A-Z]{3}$/.test(String(payload.currency || ""))) return json(res, 400, { error: "PAYMENT_SETTLEMENT_FACTS_REQUIRED" });
  return json(res, 503, { error: "COMMERCE_WEBHOOK_PROVIDER_NOT_APPROVED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await fulfillSuccessfulPayment(pool, { orderId: payload.orderId, provider: payload.provider, providerEventId: payload.providerEventId, amountMinor: payload.amountMinor, currency: payload.currency });
    return json(res, 200, { duplicate: Boolean(result.replay), event: { id: result.webhookEventId, status: result.replay ? "APPLIED" : "APPLIED" }, ...result });
  } catch (error) { return json(res, error.status || 409, { error: error.code || error.message || "WEBHOOK_FAILED" }); } finally { await pool.end(); }
}
