import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createStudentCommerceOrder } from "../../src/server/domain/student-commerce.js";
import { normalizeBankReference } from "../../src/server/domain/bank-reference-guard.js";
import {prepareBankDraft,requireBankDraft,linkBankDraft,validateBankTransferDate} from "../../src/server/domain/bank-checkout-drafts.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); }
}
function amountMinor(value) {
  if (Number.isSafeInteger(value) && value > 0) return value;
  const text = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/u.test(text)) throw Object.assign(new Error("REPORTED_AMOUNT_INVALID"), { status: 400 });
  const amount = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw Object.assign(new Error("REPORTED_AMOUNT_INVALID"), { status: 400 });
  return amount;
}
function requiredText(value, code, max = 180) {
  const text = String(value || "").trim();
  if (!text || text.length > max) throw Object.assign(new Error(code), { status: 400 });
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "order.create");
  if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let client;
  try {
    const input = await readBody(req);
    if(input.action === "PREPARE_DRAFT") { client=await pool.connect(); await client.query("begin"); const draft=await prepareBankDraft(client,principal,"STUDENT",input); await client.query("commit"); return json(res,200,{draft}); }
    const payerName = requiredText(input.payerName, "PAYER_NAME_REQUIRED", 180);
    const bankName = requiredText(input.bankName, "BANK_NAME_REQUIRED", 180);
    const reference = normalizeBankReference(input.reference);
    const date = validateBankTransferDate(input.transferDate);
    const reportedAmountMinor = amountMinor(input.reportedAmountMinor);

    client = await pool.connect();
    await client.query("begin");
    const draft=await requireBankDraft(client,principal,"STUDENT",input,reportedAmountMinor);
    if(draft.replay){await client.query("commit");return json(res,200,draft.replay);}
    const result = await createStudentCommerceOrder(client, principal, { ...input, paymentMethod: "BANK_TRANSFER", idempotencyKey:draft.idempotencyKey }, { manageTransaction: false });
    const order = result.order;
    if (reportedAmountMinor !== Number(order.total_minor)) throw Object.assign(new Error("BANK_TRANSFER_AMOUNT_MISMATCH"), { status: 409 });
    const notification = (await client.query(`
      insert into student_bank_transfer_notifications(order_id,buyer_user_id,status,payer_name,bank_name,reported_amount_minor,currency,transfer_date,reference)
      values($1,$2,'SUBMITTED',$3,$4,$5,$6,$7,$8)
      on conflict(order_id) do update set payer_name=excluded.payer_name,bank_name=excluded.bank_name,reported_amount_minor=excluded.reported_amount_minor,currency=excluded.currency,transfer_date=excluded.transfer_date,reference=excluded.reference,status='SUBMITTED',updated_at=now()
      where student_bank_transfer_notifications.status in ('SUBMITTED','IN_REVIEW')
      returning *
    `, [order.id, principal.user.id, payerName, bankName, reportedAmountMinor, order.currency, date, reference])).rows[0];
    await linkBankDraft(client,principal,"STUDENT",draft,order);
    if (!notification) {
      const existing = (await client.query("select * from student_bank_transfer_notifications where order_id=$1", [order.id])).rows[0];
      if (existing?.status === "APPROVED") { await client.query("commit"); return json(res, 200, { replay: true, order: { id: order.id, status: order.status, paymentMethod: order.payment_method, totalMinor: Number(order.total_minor), currency: order.currency }, notification: existing }); }
      throw Object.assign(new Error("BANK_TRANSFER_NOTIFICATION_NOT_REVIEWABLE"), { status: 409 });
    }
    await client.query("commit");
    return json(res, result.replay ? 200 : 201, {
      replay: Boolean(result.replay),
      order: { id: order.id, status: order.status, paymentMethod: order.payment_method, totalMinor: Number(order.total_minor), currency: order.currency },
      notification,
      bankReference: draft.row.reference,
      entitlementActivated: false,
      message: "Havale/EFT bildiriminiz alındı. Ödeme Owner tarafından doğrulanana kadar paket erişimi açılmaz.",
    });
  } catch (error) {
    if (client) await client.query("rollback").catch(() => {});
    return json(res, error.status || 409, { error: error.code || error.message || "BANK_TRANSFER_FAILED" });
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
