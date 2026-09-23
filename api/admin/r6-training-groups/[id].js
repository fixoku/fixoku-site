import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
import { calculateR6PayoutFromMatrix, completionMonthBounds, isUuid } from "../../../src/server/domain/r6-training.js";
import { refundR6GroupParticipant } from "../../../src/server/domain/r6-training-lifecycle.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function readBody(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const id = String(req.url || "").split("/").pop().split("?")[0];
  if (!isUuid(id)) return json(res, 400, { error: "R6_GROUP_ID_INVALID" });
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

  const ownerDenied = requirePermission(principal, "training_group.manage");
  const trainerAllowed = !requirePermission(principal, "trainer.training.read", { role: "TRAINER" });
  const ownerAllowed = !ownerDenied;
  if (ownerDenied && !trainerAllowed) return json(res, ownerDenied.status, ownerDenied.body);

  let body;
  try { body = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
  const action = String(body.action || "complete").trim().toLowerCase();
  if (!["complete", "refund", "cancel"].includes(action)) return json(res, 400, { error: "R6_GROUP_ACTION_INVALID" });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`r6-training-group:${id}`]);
    const group = (await client.query("select * from r6_training_groups where id=$1 for update", [id])).rows[0];
    if (!group) throw Object.assign(new Error("R6_GROUP_NOT_FOUND"), { status: 404 });
    if (trainerAllowed && !ownerAllowed && String(group.trainer_user_id) !== String(principal.user.id)) throw Object.assign(new Error("R6_GROUP_SCOPE_DENIED"), { status: 403 });
    if (["refund", "cancel"].includes(action)) {
      if (!ownerAllowed) throw Object.assign(new Error("R6_GROUP_REFUND_OWNER_REQUIRED"), { status: 403 });
      const participantId = String(body.participantId || "");
      if (!isUuid(participantId)) throw Object.assign(new Error("R6_PARTICIPANT_ID_INVALID"), { status: 400 });
      const result = await refundR6GroupParticipant(client, {
        groupId: id,
        participantId,
        actorUserId: principal.user.id,
        reason: String(body.reason || (action === "cancel" ? "R6_PARTICIPANT_CANCELLED" : "R6_PARTICIPANT_REFUNDED")).slice(0, 300),
      });
      await client.query("commit");
      return json(res, 200, { status: "REFUNDED", ...result });
    }
    if (group.status === "COMPLETED") {
      const existing = (await client.query("select id,amount_minor as \"amountMinor\",currency,status,payable_at as \"payableAt\",billable_student_count as \"billableStudentCount\" from trainer_earning_ledger where source_type='R6_TRAINING_GROUP_COMPLETION' and source_id=$1 order by created_at desc limit 1", [id])).rows[0] || null;
      await client.query("commit");
      return json(res, 200, { status: "COMPLETED", replay: true, group, earning: existing });
    }
    if (!["ASSIGNED", "IN_PROGRESS"].includes(group.status)) throw Object.assign(new Error("R6_GROUP_NOT_COMPLETEABLE"), { status: 409 });
    const participants = (await client.query("select id,status,billable,student_user_id from r6_training_group_participants where training_group_id=$1 for update", [id])).rows;
    const active = participants.filter((participant) => participant.status === "ACTIVE");
    if (active.length < Number(group.min_students)) throw Object.assign(new Error("R6_GROUP_MINIMUM_NOT_MET"), { status: 409 });
    const billableCount = active.filter((participant) => participant.billable).length;
    if (!group.trainer_user_id) throw Object.assign(new Error("R6_GROUP_TRAINER_REQUIRED"), { status: 409 });
    const matrix = (await client.query("select training_type,student_count,amount_minor from r6_training_payout_matrix where training_type=$1", [group.training_type])).rows;
    const amountMinor = billableCount > 0 ? calculateR6PayoutFromMatrix(matrix, group.training_type, billableCount) : 0;
    const completedAt = new Date();
    const bounds = completionMonthBounds(completedAt);
    const earningKey = `R6_GROUP_COMPLETION:${id}`;
    const earning = (await client.query(`insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at,assignment_id,billable_student_count,payable_at,payable_period_start,payable_period_end) values($1,'SESSION','EARNED',$2,'TRY',$3,'R6_TRAINING_GROUP_COMPLETION',$4,$5,$6,$7,$8,$9,$10,$11) on conflict(idempotency_key) do nothing returning id,amount_minor as "amountMinor",currency,status,payable_at as "payableAt",billable_student_count as "billableStudentCount"`, [group.trainer_user_id, amountMinor, `R6 ${group.training_type} eğitimi tamamlandı`, id, earningKey, completedAt, null, billableCount, bounds.payableAt, bounds.payablePeriodStart, bounds.payablePeriodEnd])).rows[0];
    const recipients = (await client.query(`select distinct u.id,u.email,sp.guardian_email as "guardianEmail" from r6_training_group_participants p join platform_users u on u.id=p.student_user_id left join student_profiles sp on sp.id=p.student_profile_id where p.training_group_id=$1 and p.status='ACTIVE'`, [id])).rows;
    for (const recipient of recipients) {
      const emails = new Set([recipient.email, recipient.guardianEmail].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
      for (const email of emails) await client.query("insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key) values($1,'R6_TRAINING_COMPLETED',$2,'Eğitiminiz tamamlandı','Eğitim tamamlanma kaydınız oluşturuldu. Değerlendirmenizi panelinizden paylaşabilirsiniz.',$3) on conflict(dedupe_key) do nothing", [recipient.id, email, `r6-training-completed:${id}:${recipient.id}:${email}`]);
    }
    await client.query("update r6_training_group_participants set status='COMPLETED',updated_at=now() where training_group_id=$1 and status='ACTIVE'", [id]);
    const updated = (await client.query("update r6_training_groups set status='COMPLETED',completed_at=coalesce(completed_at,$1),projected_payout_minor=$2,updated_at=now() where id=$3 returning *", [completedAt, amountMinor, id])).rows[0];
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.training_group.completed','r6_training_group',$2,'SUCCESS',$3,$4)", [principal.user.id, id, crypto.randomUUID(), JSON.stringify({ trainerUserId: group.trainer_user_id, billableStudentCount: billableCount, amountMinor, payableAt: bounds.payableAt.toISOString() })]);
    await client.query("commit");
    return json(res, 200, { status: "COMPLETED", replay: false, group: updated, earning: earning || { id: null, amountMinor, currency: "TRY", status: "EARNED", payableAt: bounds.payableAt, billableStudentCount: billableCount } });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original error */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "R6_GROUP_COMPLETION_CONFLICT" : error.code || error.message || "R6_GROUP_COMPLETION_FAILED" });
  } finally { client.release(); await pool.end(); }
}
