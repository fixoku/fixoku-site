import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
async function readBody(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "trainer.training.read", { role: "TRAINER" }); if (denied) return json(res, denied.status, denied.body);
  let body; try { body = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
  const enrollmentId = String(body.enrollmentId || ""); const idempotencyKey = String(body.idempotencyKey || `completion:${enrollmentId}`).trim();
  if (!UUID.test(enrollmentId) || !idempotencyKey || idempotencyKey.length > 160) return json(res, 400, { error: "ENROLLMENT_AND_IDEMPOTENCY_REQUIRED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    await client.query("begin"); await client.query("select pg_advisory_xact_lock(hashtext($1))", [enrollmentId]);
    const assignment = (await client.query("select a.*,e.student_user_id,e.training_program_id,e.status as enrollment_status from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.enrollment_id=$1 and a.trainer_user_id=$2 and a.status='ACTIVE' for update", [enrollmentId, principal.user.id])).rows[0];
    if (!assignment) { const e = Object.assign(new Error("TRAINER_ASSIGNMENT_NOT_FOUND"), { status: 404 }); throw e; }
    const existing = (await client.query("select * from enrollment_completions where enrollment_id=$1 for update", [enrollmentId])).rows[0];
    if (existing) { await client.query("commit"); return json(res, existing.idempotency_key === idempotencyKey ? 200 : 409, { status: "COMPLETED", completionId: existing.id, earningCreated: false, replay: existing.idempotency_key === idempotencyKey }); }
    const completion = (await client.query("insert into enrollment_completions(enrollment_id,assignment_id,completed_by,idempotency_key,metadata_json) values($1,$2,$3,$4,$5) returning *", [enrollmentId, assignment.id, principal.user.id, idempotencyKey, JSON.stringify({ source: "TRAINER_COMPLETION" })])).rows[0];
    await client.query("update enrollments set status='COMPLETED',progress_percent=100,completed_at=coalesce(completed_at,now()),updated_at=now() where id=$1", [enrollmentId]);
    const snapshot = (await client.query("select * from trainer_compensation_snapshots where assignment_id=$1", [assignment.id])).rows[0];
    const baseRow = snapshot?.type === 'PERCENTAGE' ? (await client.query("select oi.total_minor from package_entitlement_enrollments pee join order_items oi on oi.id=pee.source_order_item_id where pee.enrollment_id=$1 order by oi.created_at desc limit 1", [enrollmentId])).rows[0] : null; const baseMinor = Number(baseRow?.total_minor || 0); const amountMinor = snapshot?.type === 'PERCENTAGE' ? Math.floor(baseMinor * Number(snapshot.percentage_bps || 0) / 10000) : (Number.isSafeInteger(snapshot?.rate_minor) ? snapshot.rate_minor : 0); const currency = snapshot?.currency || "TRY";
    const earningKey = `COMPLETION:${enrollmentId}`;
    const earning = (await client.query("insert into trainer_earning_ledger(trainer_user_id,student_user_id,training_program_id,assignment_id,enrollment_id,compensation_snapshot_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at) values($1,$2,$3,$4,$5,$6,'SESSION','EARNED',$7,$8,'Eğitim tamamlanması','EDUCATION_COMPLETION',$9,$10,now()) on conflict(idempotency_key) do nothing returning id", [principal.user.id, assignment.student_user_id, assignment.training_program_id, assignment.id, enrollmentId, snapshot?.id || null, amountMinor, currency, completion.id, earningKey])).rows[0];
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'education.completion.recorded','enrollment',$2,'SUCCESS',$3,$4)", [principal.user.id, enrollmentId, crypto.randomUUID(), JSON.stringify({ assignmentId: assignment.id, completionId: completion.id, earningId: earning?.id || null })]);
    await client.query("commit"); return json(res, 200, { status: "COMPLETED", completionId: completion.id, earningCreated: Boolean(earning), earningId: earning?.id || null, amountMinor, currency });
  } catch (cause) { try { await client.query("rollback"); } catch { /* noop */ } return json(res, cause.status || (cause.code === "23505" ? 409 : 400), { error: cause.code === "23505" ? "COMPLETION_CONFLICT" : cause.message || "COMPLETION_FAILED" }); } finally { client.release(); await pool.end(); }
}
