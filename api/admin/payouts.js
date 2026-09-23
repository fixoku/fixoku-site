import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function summary(pool, filters = {}) {
  const values = []; const where = ["1=1"];
  if (filters.trainerUserId && UUID.test(String(filters.trainerUserId))) { values.push(filters.trainerUserId); where.push(`e.trainer_user_id=$${values.length}`); }
  if (filters.month && /^\d{4}-\d{2}$/u.test(filters.month)) { values.push(`${filters.month}-01`); where.push(`e.payable_period_start=$${values.length}::date`); }
  const rows = (await pool.query(`select e.trainer_user_id as "trainerUserId",u.display_name as "trainerName",coalesce(e.payable_period_start,date_trunc('month',e.occurred_at)::date) as month,sum(case when e.status in ('PENDING','EARNED','PAYABLE','HELD') and e.entry_type<>'ADJUSTMENT' then e.amount_minor else 0 end)::bigint as "earnedMinor",sum(case when e.status in ('EARNED','PAYABLE') and e.entry_type<>'ADJUSTMENT' then e.amount_minor else 0 end)::bigint as "payableMinor",sum(case when e.status='PAID' and e.entry_type<>'ADJUSTMENT' then e.amount_minor else 0 end)::bigint as "paidMinor",sum(case when e.entry_type='ADJUSTMENT' then e.amount_minor else 0 end)::bigint as "adjustmentMinor",json_agg(json_build_object('id',e.id,'status',e.status,'entryType',e.entry_type,'amountMinor',e.amount_minor,'payableAt',e.payable_at,'sourceType',e.source_type,'sourceId',e.source_id,'adjustmentOfId',e.adjustment_of_id) order by e.occurred_at,e.created_at) as entries from trainer_earning_ledger e join platform_users u on u.id=e.trainer_user_id where ${where.join(" and ")} group by e.trainer_user_id,u.display_name,coalesce(e.payable_period_start,date_trunc('month',e.occurred_at)::date) order by month desc,u.display_name`, values)).rows;
  return rows.map((row) => ({ ...row, earnedMinor: Number(row.earnedMinor || 0), payableMinor: Number(row.payableMinor || 0), paidMinor: Number(row.paidMinor || 0), adjustmentMinor: Number(row.adjustmentMinor || 0) }));
}

async function markPaid(client, principal, body) {
  const trainerUserId = String(body.trainerUserId || ""); const amountMinor = Number(body.amountMinor); const currency = String(body.currency || "TRY").toUpperCase();
  if (!UUID.test(trainerUserId) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/u.test(currency) || !body.periodStart || !body.periodEnd || !body.paymentDate) throw Object.assign(new Error("PAYOUT_FIELDS_REQUIRED"), { status: 400 });
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`r6-payout:${trainerUserId}:${body.periodStart}:${body.periodEnd}`]);
    const unpaid = (await client.query("select e.id,(e.amount_minor-coalesce((select sum(a.amount_minor) from r6_trainer_payout_allocations a where a.earning_id=e.id),0))::int as amount from trainer_earning_ledger e where e.trainer_user_id=$1 and e.currency=$2 and e.occurred_at::date between $3::date and $4::date and e.status in ('EARNED','PAYABLE') and e.entry_type<>'ADJUSTMENT' and e.amount_minor>coalesce((select sum(a.amount_minor) from r6_trainer_payout_allocations a where a.earning_id=e.id),0) order by e.occurred_at,e.created_at,e.id for update", [trainerUserId, currency, body.periodStart, body.periodEnd])).rows;
    const total = unpaid.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (amountMinor > total) throw Object.assign(new Error("PAYOUT_AMOUNT_EXCEEDS_UNPAID"), { status: 409 });
    let remaining = amountMinor; const allocations = [];
    for (const row of unpaid) { if (remaining <= 0) break; const allocated = Math.min(remaining, Number(row.amount)); allocations.push({ id: row.id, amount: allocated, full: allocated === Number(row.amount) }); remaining -= allocated; }
    if (remaining !== 0) throw Object.assign(new Error("PAYOUT_ALLOCATION_FAILED"), { status: 409 });
    const payout = (await client.query("insert into trainer_payout_register(trainer_user_id,amount_minor,currency,period_start,period_end,payment_date,bank_reference,note,created_by,approved_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning *", [trainerUserId, amountMinor, currency, body.periodStart, body.periodEnd, body.paymentDate, String(body.bankReference || body.reference || "").trim().slice(0, 200) || null, String(body.note || "").trim().slice(0, 500) || null, principal.user.id])).rows[0];
    for (const allocation of allocations) { await client.query("insert into r6_trainer_payout_allocations(payout_id,earning_id,amount_minor) values($1,$2,$3)", [payout.id, allocation.id, allocation.amount]); if (allocation.full) await client.query("update trainer_earning_ledger set status='PAID',paid_at=now() where id=$1 and status in ('EARNED','PAYABLE')", [allocation.id]); }
    await client.query("insert into owner_finance_ledger(entry_type,source_type,source_id,amount_minor,currency,metadata_json,created_by) values('TRAINER_PAYOUT','PAYOUT',$1,$2,$3,$4,$5)", [payout.id, -amountMinor, currency, JSON.stringify({ trainerUserId, earningIds: allocations.map((item) => item.id), allocationCount: allocations.length }), principal.user.id]);
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.payout.paid','trainer_payout',$2,'SUCCESS',gen_random_uuid(),$3)", [principal.user.id, payout.id, JSON.stringify({ trainerUserId, amountMinor, allocationCount: allocations.length })]);
    await client.query("commit"); return { payout, allocations, status: "PAID" };
  } catch (error) { try { await client.query("rollback"); } catch { /* preserve */ } throw error; }
}

async function addAdjustment(client, principal, body) {
  const trainerUserId = String(body.trainerUserId || ""); const amountMinor = Number(body.amountMinor); const currency = String(body.currency || "TRY").toUpperCase();
  if (!UUID.test(trainerUserId) || !Number.isSafeInteger(amountMinor) || amountMinor === 0 || !/^[A-Z]{3}$/u.test(currency)) throw Object.assign(new Error("ADJUSTMENT_FIELDS_REQUIRED"), { status: 400 });
  const sourceId = String(body.sourceId || `manual:${Date.now()}`).slice(0, 160); const adjustmentOfId = body.adjustmentOfId && UUID.test(String(body.adjustmentOfId)) ? body.adjustmentOfId : null;
  const row = (await client.query("insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,adjustment_of_id,occurred_at) values($1,'ADJUSTMENT','EARNED',$2,$3,$4,'OWNER_ADJUSTMENT',$5,$6,$7,now()) on conflict(idempotency_key) do nothing returning *", [trainerUserId, amountMinor, currency, String(body.note || "R6 payout adjustment").slice(0, 500), sourceId, `R6_ADJUSTMENT:${sourceId}`, adjustmentOfId])).rows[0];
  if (!row) throw Object.assign(new Error("ADJUSTMENT_ALREADY_EXISTS"), { status: 409 });
  await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.payout.adjusted','trainer_earning',$2,'SUCCESS',gen_random_uuid(),$3)", [principal.user.id, row.id, JSON.stringify({ trainerUserId, amountMinor, adjustmentOfId })]);
  return row;
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, req.method === "GET" ? "finance.read" : "payout.manage"); if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") { const url = new URL(req.url || "/api/admin/payouts", "http://local"); return json(res, 200, { ownerOnly: true, summary: await summary(pool, { trainerUserId: url.searchParams.get("trainerUserId"), month: url.searchParams.get("month") }), payouts: (await pool.query("select * from trainer_payout_register order by payment_date desc,created_at desc")).rows }); }
    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const body = await read(req); const client = await pool.connect();
    try { if (String(body.action || "markPaid").toLowerCase() === "adjustment") return json(res, 201, { adjustment: await addAdjustment(client, principal, body), status: "ADJUSTMENT" }); return json(res, 201, await markPaid(client, principal, body)); } finally { client.release(); }
  } catch (error) { return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "PAYOUT_CONFLICT" : error.code || error.message || "PAYOUT_UNAVAILABLE" }); } finally { await pool.end(); }
}
