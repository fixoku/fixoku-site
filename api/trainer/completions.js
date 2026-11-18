import crypto from "node:crypto";
import { ownerEducationCompletion } from "../../src/server/domain/owner-education-r390g.js";
import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { completionMonthBounds } from "../../src/server/domain/r6-training.js";
import { queuePanelNotification } from "../../src/server/domain/panel-notifications.js";
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
    if (!assignment.planned_at ||
        !Number.isFinite(Date.parse(assignment.planned_at)) ||
        Date.now()-Date.parse(assignment.planned_at)<21*86400000)
      throw Object.assign(
        new Error("TRAINING_21_DAY_REQUIREMENT"),
        {status:409}
      );
    const completedAt = new Date();
    const bounds = completionMonthBounds(completedAt);
    const completion = (await client.query("insert into enrollment_completions(enrollment_id,assignment_id,completed_by,idempotency_key,metadata_json) values($1,$2,$3,$4,$5) returning *", [enrollmentId, assignment.id, principal.user.id, idempotencyKey, JSON.stringify({ source: "TRAINER_COMPLETION" })])).rows[0];
    await client.query("update enrollments set status='COMPLETED',progress_percent=100,completed_at=coalesce(completed_at,$2),updated_at=now() where id=$1", [enrollmentId, completedAt]);
    const snapshot = (await client.query("select * from trainer_compensation_snapshots where assignment_id=$1", [assignment.id])).rows[0];
    const baseRow = snapshot?.type === 'PERCENTAGE' ? (await client.query("select oi.total_minor from package_entitlement_enrollments pee join order_items oi on oi.id=pee.source_order_item_id where pee.enrollment_id=$1 order by oi.created_at desc limit 1", [enrollmentId])).rows[0] : null; const baseMinor = Number(baseRow?.total_minor || 0); const amountMinor = snapshot?.type === 'PERCENTAGE' ? Math.floor(baseMinor * Number(snapshot.percentage_bps || 0) / 10000) : (Number.isSafeInteger(snapshot?.rate_minor) ? snapshot.rate_minor : 0); const currency = snapshot?.currency || "TRY";
    const freeNote = snapshot?.type === 'FIXED_AMOUNT' && snapshot?.calculation_base === 'OWNER_FREE' && snapshot?.rate_minor === 0 ? (await client.query(`select metadata_json::jsonb->>'freeReason' as reason from platform_audit_events where action in ('trainer.assignment.assign','trainer.assignment.reassigned') and result='SUCCESS' and metadata_json::jsonb->>'trainerAssignmentId'=$1 and metadata_json::jsonb->>'trainerUserId'=$2 and metadata_json::jsonb->>'freeAssignment'='true' order by occurred_at desc limit 1`,[assignment.id,principal.user.id])).rows[0]?.reason : null;
    const isFree = typeof freeNote==='string' && freeNote.trim().length>0 && freeNote.trim().length<=500;
    if (!snapshot || !Number.isSafeInteger(amountMinor) || (!isFree && amountMinor <= 0) || (snapshot.calculation_base==='OWNER_FREE' && !isFree)) throw Object.assign(new Error("COMPENSATION_AMOUNT_REQUIRED"), { status: 409 });
    const earningKey = `COMPLETION:${enrollmentId}`;
    const earning = isFree ? null : (await client.query("insert into trainer_earning_ledger(trainer_user_id,student_user_id,training_program_id,assignment_id,enrollment_id,compensation_snapshot_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at,payable_at,payable_period_start,payable_period_end) values($1,$2,$3,$4,$5,$6,'SESSION','EARNED',$7,$8,'Eğitim tamamlanması','EDUCATION_COMPLETION',$9,$10,$11,$12,$13,$14) on conflict(idempotency_key) do nothing returning id,payable_at as \"payableAt\"", [principal.user.id, assignment.student_user_id, assignment.training_program_id, assignment.id, enrollmentId, snapshot?.id || null, amountMinor, currency, completion.id, earningKey, completedAt, bounds.payableAt, bounds.payablePeriodStart, bounds.payablePeriodEnd])).rows[0];

    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'education.completion.recorded','enrollment',$2,'SUCCESS',$3,$4)", [principal.user.id, enrollmentId, crypto.randomUUID(), JSON.stringify({ assignmentId: assignment.id, completionId: completion.id, earningId: earning?.id || null })]);
    const student = (await client.query("select id,email from platform_users where id=$1", [assignment.student_user_id])).rows[0];
    await queuePanelNotification(client, {
      recipientUserId: assignment.student_user_id,
      recipientEmail: student?.email,
      eventType: "EDUCATION_COMPLETED",
      title: "Eğitim tamamlandı",
      body: "Eğitiminiz tamamlandı; sertifika ve değerlendirme seçeneklerini panelinizden inceleyebilirsiniz.",
      metadata: { path: "/panel/ogrenci", enrollmentId, completionId: completion.id },
      dedupeKey: `education-completed:${enrollmentId}`,
    });
    if (!isFree) await queuePanelNotification(client, {
      recipientUserId: principal.user.id,
      recipientEmail: principal.user.email,
      eventType: "TRAINER_EARNING_CREATED",
      title: "Hakediş durumu güncellendi",
      body: `${amountMinor / 100} ${currency} tutarında eğitim hakedişi kaydı oluşturuldu.`,
      metadata: { path: "/panel/egitmen/hakedislerim", enrollmentId, earningId: earning?.id || null },
      dedupeKey: `trainer-earning-created:${completion.id}`,
    });
    await ownerEducationCompletion(client,{completionId:completion.id,enrollmentId,trainerUserId:principal.user.id,completedAt,earningId:earning?.id,amountMinor,currency});
    await client.query("commit"); return json(res, 200, { status: "COMPLETED", completionId: completion.id, earningCreated: Boolean(earning), earningId: earning?.id || null, amountMinor, currency, payableAt: isFree ? null : (earning?.payableAt || bounds.payableAt) });
  } catch (cause) { try { await client.query("rollback"); } catch { /* noop */ } return json(res, cause.status || (cause.code === "23505" ? 409 : 400), { error: cause.code === "23505" ? "COMPLETION_CONFLICT" : cause.message || "COMPLETION_FAILED" }); } finally { client.release(); await pool.end(); }
}
