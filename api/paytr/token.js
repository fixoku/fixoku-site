import { paytrR410PreviewIsolation } from "../../src/server/payments/paytr-staging-isolation-r410.js";
import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { requestPaytrIframeToken, paytrRuntime, paytrCustomerFromOrder, toPaytrMerchantOid, paytrTestSettlementAllowed, ensurePaytrPaymentAttempt, claimPaytrTokenLease, decryptPaytrToken, persistPaytrToken, releasePaytrTokenLease } from "../../src/server/payments/paytr.js";
import { UUID_PATTERN } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headersOf = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export async function handlePaytrTokenRequest(req, res, { principal: injectedPrincipal = null, pool: injectedPool = null, tokenRequester = requestPaytrIframeToken } = {}) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const isolation = paytrR410PreviewIsolation();
  if (isolation.applicable && !isolation.approved) return json(res,503,{error:"PAYTR_STAGING_ISOLATION_REQUIRED"});
  if (!paytrTestSettlementAllowed() && !paytrRuntime().liveReady) return json(res,503,{error:"PAYTR_RUNTIME_NOT_APPROVED"});
  const principal = injectedPrincipal || await resolvePrincipal(headersOf(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "order.create"); if (denied) return json(res, denied.status, denied.body);
  if (paytrRuntime().status !== "CONFIGURED" || !paytrRuntime().returnUrlsConfigured) return json(res, 503, { error: "PAYTR_CONFIG_REQUIRED", implementationReady: true, runtime: "CONFIG_REQUIRED" });
  let input; try { input = await body(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
  if (!UUID_PATTERN.test(String(input.orderId || ""))) return json(res, 400, { error: "INVALID_ORDER_ID" });
  const pool = injectedPool || new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const ownsPool = !injectedPool;
  let attempt;
  let leaseId = null;
  let selected;
  try {
    const row = (await pool.query("select o.id,o.total_minor,o.currency,u.email,u.display_name as \"customerName\",o.shipping_address_snapshot_json as \"shippingSnapshot\",o.billing_snapshot_json as \"billingSnapshot\" from orders o join platform_users u on u.id=o.buyer_user_id where o.id=$1 and o.buyer_user_id=$2 and o.payment_method='PAYTR' and o.status='PENDING_PAYMENT'", [input.orderId, principal.user.id])).rows[0];
    const trainer = principal.memberships?.some((membership) => membership.role === "TRAINER");
    const trainerRow = !row && trainer ? (await pool.query("select o.id,o.total_minor,o.currency,u.email,u.display_name as \"customerName\",o.shipping_address_snapshot_json as \"shippingSnapshot\",o.billing_snapshot_json as \"billingSnapshot\" from trainer_package_orders o join platform_users u on u.id=o.trainer_user_id where o.id=$1 and o.trainer_user_id=$2 and o.payment_method='PAYTR' and o.status='PENDING_PAYMENT'", [input.orderId, principal.user.id])).rows[0] : null;
    if (!row && !trainerRow) return json(res, 404, { error: "ORDER_NOT_FOUND" });
    selected = row || trainerRow;
    const orderKind = trainerRow ? "TRAINER_PACKAGE_ORDER" : "STUDENT_ORDER";
    const client = await pool.connect();
    try {
      await client.query("begin");
      attempt = (await client.query("select * from paytr_payment_attempts where order_kind=$1 and order_id=$2 for update", [orderKind, selected.id])).rows[0];
      if (!attempt) attempt = await ensurePaytrPaymentAttempt(client, { orderKind, orderId: selected.id, amountMinor: selected.total_minor, currency: selected.currency, environment: paytrRuntime().liveReady ? "LIVE" : "TEST" });
      if (Number(attempt.amount_minor) !== Number(selected.total_minor) || String(attempt.currency).toUpperCase() !== String(selected.currency).toUpperCase()) throw Object.assign(new Error("PAYTR_ATTEMPT_ORDER_MISMATCH"), { code: "PAYTR_ATTEMPT_ORDER_MISMATCH", status: 409 });
      if (attempt.environment !== (paytrRuntime().liveReady ? "LIVE" : "TEST")) throw Object.assign(new Error("PAYTR_ATTEMPT_MODE_MISMATCH"), { code: "PAYTR_ATTEMPT_MODE_MISMATCH", status: 409 });
      const reusableToken = decryptPaytrToken(attempt);
      if (attempt.status === "TOKEN_READY" && reusableToken && attempt.token_expires_at && new Date(attempt.token_expires_at).getTime() > Date.now()) {
        await client.query("commit");
        return json(res, 200, { token: reusableToken, merchantOid: attempt.merchant_oid, iframeUrl: `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(reusableToken)}`, orderKind: trainerRow ? "TRAINER_PACKAGE" : "STUDENT_ORDER", paymentAttemptId: attempt.id, reusedToken: true });
      }
      if (attempt.status === "TOKEN_READY" && !reusableToken) {
        await client.query("update paytr_payment_attempts set status='REVIEW',review_required=true,review_reason='Stored PayTR token could not be decrypted; reconciliation required',last_error_code='PAYTR_TOKEN_RECONCILIATION_REQUIRED',updated_at=now() where id=$1", [attempt.id]);
        await client.query("commit");
        throw Object.assign(new Error("PAYTR_TOKEN_RECONCILIATION_REQUIRED"), { code: "PAYTR_TOKEN_RECONCILIATION_REQUIRED", status: 503 });
      }
      if (["UNKNOWN", "REVIEW", "SUCCEEDED", "SUPERSEDED"].includes(String(attempt.status))) throw Object.assign(new Error(`PAYTR_ATTEMPT_${attempt.status}`), { code: `PAYTR_ATTEMPT_${attempt.status}`, status: 409 });
      if (attempt.status === "TOKEN_PENDING" && attempt.token_lease_until && new Date(attempt.token_lease_until).getTime() > Date.now()) throw Object.assign(new Error("PAYTR_TOKEN_REQUEST_IN_PROGRESS"), { code: "PAYTR_TOKEN_REQUEST_IN_PROGRESS", status: 409 });
      if (attempt.status === "TOKEN_PENDING") {
        await client.query("update paytr_payment_attempts set status='REVIEW',review_required=true,review_reason='Token provider request lease expired; reconciliation required',last_error_code='PAYTR_TOKEN_RESULT_UNKNOWN',updated_at=now() where id=$1", [attempt.id]);
        await client.query("commit");
        throw Object.assign(new Error("PAYTR_TOKEN_RESULT_UNKNOWN"), { code: "PAYTR_TOKEN_RESULT_UNKNOWN", status: 503 });
      }
      const lease = await claimPaytrTokenLease(client, { merchantOid: attempt.merchant_oid });
      if (!lease.claimed) throw Object.assign(new Error("PAYTR_TOKEN_REQUEST_IN_PROGRESS"), { code: "PAYTR_TOKEN_REQUEST_IN_PROGRESS", status: 409 });
      leaseId = lease.leaseId;
      attempt = lease.attempt;
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      if (error?.code === "42P01" && process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") attempt = { merchant_oid: toPaytrMerchantOid(selected.id), id: null };
      else if (error?.code === "42P01") throw Object.assign(new Error("PAYTR_ATTEMPT_STORE_REQUIRED"), { code: "PAYTR_ATTEMPT_STORE_REQUIRED", status: 503 });
      else throw error;
    } finally {
      client.release();
    }
    const customer = paytrCustomerFromOrder(selected);
    const items = trainerRow ? (await pool.query("select title_snapshot as title,unit_gross_minor as price,quantity from trainer_package_order_items where order_id=$1 order by id", [selected.id])).rows : [["Fixoku eğitim paketi", (Number(selected.total_minor) / 100).toFixed(2), 1]];
    const basket = Buffer.from(JSON.stringify(trainerRow ? items.map((item) => [item.title, (Number(item.price) / 100).toFixed(2), Number(item.quantity || 1)]) : items)).toString("base64");
    const merchantOid = attempt.merchant_oid || toPaytrMerchantOid(selected.id);
    const token = await tokenRequester({ merchantOid, userIp: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0], email: selected.email, ...customer, paymentAmount: String(selected.total_minor), userBasket: basket, currency: selected.currency === "TRY" ? "TL" : selected.currency, testMode: paytrRuntime().testMode });
    const persistClient = await pool.connect();
    try { await persistClient.query("begin"); const persisted = await persistPaytrToken(persistClient, { merchantOid, leaseId, token }); if (!persisted) throw Object.assign(new Error("PAYTR_TOKEN_LEASE_LOST"), { code: "PAYTR_TOKEN_LEASE_LOST", status: 503 }); await persistClient.query("commit"); }
    catch (error) { await persistClient.query("rollback").catch(() => {}); throw error; }
    finally { persistClient.release(); }
    return json(res, 200, { token, merchantOid, iframeUrl: `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}`, orderKind: trainerRow ? "TRAINER_PACKAGE" : "STUDENT_ORDER", paymentAttemptId: attempt.id });
  } catch (error) {
    if (attempt?.merchant_oid && leaseId) {
      const repairClient = await pool.connect();
      try { await repairClient.query("begin"); const ambiguous = ["AbortError", "PAYTR_TOKEN_REQUEST_FAILED", "PAYTR_TOKEN_LEASE_LOST", "PAYTR_TOKEN_ENCRYPTION_REQUIRED"].includes(error?.name) || ["PAYTR_TOKEN_REQUEST_FAILED", "PAYTR_TOKEN_LEASE_LOST", "PAYTR_TOKEN_ENCRYPTION_REQUIRED"].includes(error?.code); await releasePaytrTokenLease(repairClient, { merchantOid: attempt.merchant_oid, leaseId, errorCode: error.code || "PAYTR_TOKEN_FAILED", status: ambiguous ? "REVIEW" : "FAILED" }); await repairClient.query("commit"); }
      catch { await repairClient.query("rollback").catch(() => {}); }
      finally { repairClient.release(); }
    }
    return json(res, error.status || 503, { error: error.code || "PAYTR_TOKEN_FAILED" });
  } finally { if (ownsPool) await pool.end(); }
}

export default async function handler(req, res) { return handlePaytrTokenRequest(req, res); }
