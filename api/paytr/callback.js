import pg from "../../src/server/db/guarded-pg.js";
import { tryQueueOwnerManagementEmail as queueOwnerManagementEmail } from "../../src/server/domain/owner-management-notifications-r390.js";
import { paytrRuntime, verifyPaytrCallback, fromPaytrMerchantOid, requestPaytrPaymentStatus, validatePaytrSettlement, paytrTestSettlementAllowed, recordPaytrAttemptCallback, assertPaytrCallbackOrderFacts } from "../../src/server/payments/paytr.js";
import { fulfillSuccessfulPayment } from "../../src/server/domain/commerce.js";
import { fulfillTrainerOrder } from "../../src/server/domain/trainer-commerce.js";
import { cleanPreviewGateResponse } from "../../src/server/auth/preview-contract.js";

const text = (res, status, value) => { res.statusCode = status; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end(value); };
async function fields(req) { let raw = ""; for await (const chunk of req) raw += chunk; return Object.fromEntries(new URLSearchParams(raw)); }
const debugAllowed = () => process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production" && process.env.FIXOKU_LOCAL_PAYTR_DEBUG === "1";
async function reportMismatch(pool, orderId, errorCode) {
  if (process.env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1") return;
  const client = await pool.connect();
  try { await client.query("begin"); await queueOwnerManagementEmail(client, { templateKey: "owner-payment-error", eventId: `${orderId}:${errorCode}`, metadata: { reference: orderId, errorCode, date: new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(new Date()), status: "İnceleme gerekiyor" } }); await client.query("commit"); }
  catch { await client.query("rollback").catch(() => {}); console.error("OWNER_PAYMENT_ALERT_QUEUE_FAILED"); }
  finally { client.release(); }
}

export default async function handler(req, res) {
  if (!cleanPreviewGateResponse(res)) return;
  if (req.method !== "POST") return text(res, 405, "METHOD_NOT_ALLOWED");
  if (!paytrTestSettlementAllowed() && !paytrRuntime().liveReady) return text(res, 503, "PAYTR_RUNTIME_NOT_APPROVED");
  if (!paytrRuntime().configured || !paytrRuntime().returnUrlsConfigured) return text(res, 503, "PAYTR_CONFIG_REQUIRED");
  let payload; try { payload = await fields(req); } catch { return text(res, 400, "BAD_REQUEST"); }
  if (!verifyPaytrCallback(payload)) return text(res, 401, "PAYTR_HASH_INVALID");
  if (!payload.merchant_oid || !["success", "failed"].includes(String(payload.status))) return text(res, 400, "INVALID_CALLBACK");
  let fallbackOrderId = null; try { fallbackOrderId = fromPaytrMerchantOid(payload.merchant_oid); } catch { /* attempt lookup is authoritative */ }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    let attemptStoreMissing = false;
    const lookup = await pool.query("select order_id,environment from paytr_payment_attempts where merchant_oid=$1", [payload.merchant_oid]).catch((error) => { if (error?.code === "42P01") { attemptStoreMissing = true; return { rows: [] }; } throw error; });
    const expectedEnvironment = paytrRuntime().liveReady ? "LIVE" : "TEST";
    const expectedTestMode = expectedEnvironment === "LIVE" ? "0" : "1";
    if (lookup.rows[0] && lookup.rows[0].environment !== expectedEnvironment) return text(res, 409, "PAYTR_ATTEMPT_MODE_MISMATCH");
    if (payload.test_mode != null && String(payload.test_mode) !== expectedTestMode) return text(res, 409, "PAYTR_MODE_MISMATCH");
    if (lookup.rows[0]) fallbackOrderId = lookup.rows[0].order_id;
    if (!lookup.rows[0] && (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")) return text(res, 503, "PAYTR_ATTEMPT_STORE_REQUIRED");
    if (!fallbackOrderId) return text(res, 400, "PAYTR_REFERENCE_INVALID");
    let providerStatus;
    if (payload.status === "success") {
      try { providerStatus = await requestPaytrPaymentStatus(payload.merchant_oid); }
      catch (error) {
        const client = await pool.connect();
        try { await client.query("begin"); const attempt = (await client.query("select * from paytr_payment_attempts where merchant_oid=$1 for update", [payload.merchant_oid])).rows[0]; if (!attempt) throw Object.assign(new Error("PAYTR_ATTEMPT_NOT_FOUND"), { code: "PAYTR_ATTEMPT_NOT_FOUND", status: 503 }); await recordPaytrAttemptCallback(client, { merchantOid: payload.merchant_oid, callbackStatus: "success", callbackHash: payload.hash, errorCode: error.code || "PAYTR_SETTLEMENT_NOT_CONFIRMED", reviewRequired: true, reviewReason: "Provider settlement could not be independently confirmed." }); await client.query("commit"); }
        catch (recordError) { await client.query("rollback").catch(() => {}); throw recordError; }
        finally { client.release(); }
        await reportMismatch(pool, fallbackOrderId, error.code || "PAYTR_SETTLEMENT_NOT_CONFIRMED");
        return text(res, error.status || 503, error.code || "PAYTR_SETTLEMENT_NOT_CONFIRMED");
      }
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const attempt = attemptStoreMissing ? null : (await client.query("select * from paytr_payment_attempts where merchant_oid=$1 for update", [payload.merchant_oid])).rows[0];
      if (!attempt && !attemptStoreMissing) throw Object.assign(new Error("PAYTR_ATTEMPT_NOT_FOUND"), { code: "PAYTR_ATTEMPT_NOT_FOUND", status: 503 });
      if (attempt && attempt.environment !== expectedEnvironment) throw Object.assign(new Error("PAYTR_ATTEMPT_MODE_MISMATCH"), { code: "PAYTR_ATTEMPT_MODE_MISMATCH", status: 409 });
      const orderId = attempt?.order_id || fallbackOrderId;
      const studentOrder = (await client.query("select id,status,total_minor,currency from orders where id=$1 and payment_method='PAYTR' for update", [orderId])).rows[0];
      const trainerOrder = (await client.query("select id,status,total_minor,currency from trainer_package_orders where id=$1 and payment_method='PAYTR' for update", [orderId])).rows[0];
      if (studentOrder && trainerOrder) throw Object.assign(new Error("PAYTR_ORDER_REFERENCE_CONFLICT"), { code: "PAYTR_ORDER_REFERENCE_CONFLICT", status: 409 });
      const order = studentOrder || trainerOrder;
      if (!order) throw Object.assign(new Error("ORDER_NOT_FOUND"), { code: "ORDER_NOT_FOUND", status: 404 });
      const expectedKind = studentOrder ? "STUDENT_ORDER" : "TRAINER_PACKAGE_ORDER";
      if (attempt) { if (attempt.order_kind !== expectedKind || String(attempt.order_id) !== String(order.id)) throw Object.assign(new Error("PAYTR_ORDER_REFERENCE_CONFLICT"), { code: "PAYTR_ORDER_REFERENCE_CONFLICT", status: 409 }); assertPaytrCallbackOrderFacts({ attempt, order, payload }); }
      if (payload.status === "failed") {
        if (payload.test_mode != null && String(payload.test_mode) !== expectedTestMode) throw Object.assign(new Error("PAYTR_MODE_MISMATCH"), { code: "PAYTR_MODE_MISMATCH", status: 409 });
        if (order.status === "PAID" || attempt?.status === "SUCCEEDED") { if (attempt) await recordPaytrAttemptCallback(client, { merchantOid: payload.merchant_oid, callbackStatus: "failed", callbackHash: payload.hash, errorCode: "PAYTR_LATE_FAILED_CALLBACK", reviewRequired: true, reviewReason: "A failed callback arrived after successful fulfilment." }); await client.query("commit"); return text(res, 200, "OK"); }
        if (studentOrder) await client.query("update orders set status='PAYMENT_FAILED',updated_at=now() where id=$1 and status='PENDING_PAYMENT'", [order.id]);
        else await client.query("update trainer_package_orders set status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),updated_at=now() where id=$1 and status='PENDING_PAYMENT'", [order.id]);
        if (attempt) await recordPaytrAttemptCallback(client, { merchantOid: payload.merchant_oid, callbackStatus: "failed", callbackHash: payload.hash, errorCode: "PAYTR_PAYMENT_FAILED" }); await client.query("commit"); return text(res, 200, "OK");
      }
      const settlement = validatePaytrSettlement({ payload, providerStatus, expectedAmountMinor: order.total_minor, expectedCurrency: order.currency, expectedTestMode });
      if (order.status === "PAID") {
        if (attempt?.status === "SUCCEEDED" && Number(attempt.collected_amount_minor) === settlement.collectedAmountMinor && String(attempt.provider_transaction_id || "") === String(settlement.providerTransactionId || "")) { await client.query("commit"); return text(res, 200, "OK"); }
        if (attempt) { await recordPaytrAttemptCallback(client, { merchantOid: payload.merchant_oid, callbackStatus: "success", callbackHash: payload.hash, settlement, providerTransactionId: settlement.providerTransactionId || null, errorCode: "PAYTR_DUPLICATE_SETTLEMENT", reviewRequired: true, reviewReason: "A different payment attempt reported success after the order was already paid." }); await client.query("commit"); await reportMismatch(pool, order.id, "PAYTR_DUPLICATE_SETTLEMENT"); return text(res, 409, "PAYTR_DUPLICATE_SETTLEMENT_REVIEW"); }
        await client.query("commit"); return text(res, 409, "PAYTR_DUPLICATE_SETTLEMENT_REVIEW");
      }
      const providerReference = `paytr:${payload.merchant_oid}`;
      if (trainerOrder) await fulfillTrainerOrder(client, { orderId: order.id, actorUserId: null, provider: "PAYTR", providerReference, amountMinor: settlement.orderAmountMinor, settlement, currency: settlement.currency, manageTransaction: false });
      else await fulfillSuccessfulPayment(client, { orderId: order.id, provider: "PAYTR", providerEventId: providerReference, amountMinor: settlement.orderAmountMinor, settlement, currency: settlement.currency, manageTransaction: false });
      if (attempt) await recordPaytrAttemptCallback(client, { merchantOid: payload.merchant_oid, callbackStatus: "success", callbackHash: payload.hash, settlement, providerTransactionId: settlement.providerTransactionId || null }); await client.query("commit"); return text(res, 200, "OK");
    } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
    finally { client.release(); }
  } catch (error) { const detail = debugAllowed() ? `${error.code || "CALLBACK_FAILED"}:${error.detail || error.constraint || error.message || ""}` : (error.code || "CALLBACK_FAILED"); return text(res, error.status || 409, detail); }
  finally { await pool.end(); }
}

