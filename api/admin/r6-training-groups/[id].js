import { queueOwnerManagementEmail } from "../../../src/server/domain/owner-management-notifications-r390.js";
import crypto from "node:crypto";
import { assertTrainerEligible, queueR399ClassTrainerNotice, queueR399ClassLearnerNotice } from "../r6-training-groups.js";
import { ownerEducationCompletion, ownerEducationEarning } from "../../../src/server/domain/owner-education-r390g.js";
import pg from "pg";
import { queueEmailOutbox } from "../../../src/server/domain/panel-notifications.js";
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
  if (!["complete", "refund", "cancel", "assigntrainer", "contact", "schedule", "remove"].includes(action)) return json(res, 400, { error: "R6_GROUP_ACTION_INVALID" });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (["assigntrainer","contact","schedule","remove"].includes(action)) await client.query("select pg_advisory_xact_lock(hashtext('fixoku-r399-class-write'))");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`r6-training-group:${id}`]);
    const group = (await client.query("select * from r6_training_groups where id=$1 for update", [id])).rows[0];
    if (!group) throw Object.assign(new Error("R6_GROUP_NOT_FOUND"), { status: 404 });
    if (trainerAllowed && !ownerAllowed && String(group.trainer_user_id) !== String(principal.user.id)) throw Object.assign(new Error("R6_GROUP_SCOPE_DENIED"), { status: 403 });
    if (action === "assigntrainer") {
      if (!ownerAllowed || !principal.memberships?.some(m=>m.role==="OWNER" && m.status==="ACTIVE" && m.scopeType==="GLOBAL" && m.scopeId==null && String(m.userId)===String(principal.user.id))) throw Object.assign(new Error("OWNER_ONLY"),{status:403});
      const trainerId = String(body.trainerUserId || "");
      if (!isUuid(trainerId)) throw Object.assign(new Error("R6_TRAINER_ID_INVALID"),{status:400});
      if (group.mode!=="GROUP" || group.status!=="DRAFT" || group.trainer_user_id || group.scheduled_start_at || !group.required_qualification_id) throw Object.assign(new Error("R399_DRAFT_ASSIGNMENT_REQUIRED"),{status:409});
      await assertTrainerEligible(client,trainerId,group.required_qualification_id);
      const count = (await client.query("select count(*)::int as n from r6_training_group_participants where training_group_id=$1 and status='ACTIVE'",[id])).rows[0].n;
      if (count<1 || count>group.max_students) throw Object.assign(new Error("R399_CLASS_CAPACITY"),{status:409});
      const open = (await client.query(`select g.id from r6_training_groups g where g.trainer_user_id=$1 and g.education_stage=$2 and g.training_type=$3 and g.mode='GROUP' and g.status in ('DRAFT','ASSIGNED') and (g.scheduled_start_at is null or g.scheduled_start_at>clock_timestamp()) and (select count(*) from r6_training_group_participants p where p.training_group_id=g.id and p.status='ACTIVE')<g.max_students limit 1 for update of g`,[trainerId,group.education_stage,group.training_type])).rows[0];
      if (open) throw Object.assign(new Error("R399_EXISTING_OPEN_CLASS_REQUIRED"),{status:409});
      const number = (await client.query("select coalesce(max(class_number),0)+1 as n from r6_training_groups where trainer_user_id=$1",[trainerId])).rows[0].n;
      const updated = (await client.query("update r6_training_groups set trainer_user_id=$1,class_number=$2,status='ASSIGNED',updated_at=now() where id=$3 returning *",[trainerId,number,id])).rows[0];
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r399.class.assigned','r6_training_group',$2,'SUCCESS',$3,$4)",[principal.user.id,id,crypto.randomUUID(),JSON.stringify({trainerUserId:trainerId,classNumber:number})]);
      await queueR399ClassTrainerNotice(client,updated,"R399_CLASS_ASSIGNED");
      await queueR399ClassLearnerNotice(client,updated,"R399_CLASS_LEARNER_ASSIGNED");
      await client.query("commit");
      return json(res,200,{group:updated,status:updated.status});
    }
    // R399IB: class contact, confirmed common date and non-financial removal.
    if (["contact","schedule","remove"].includes(action)) {
      const globalOwner = ownerAllowed && principal.memberships?.some(m=>m.role==="OWNER" && m.status==="ACTIVE" && m.scopeType==="GLOBAL" && m.scopeId==null && String(m.userId)===String(principal.user.id));
      const assignedTrainer = trainerAllowed && String(group.trainer_user_id)===String(principal.user.id);
      const fail=(code,status=409)=>{throw Object.assign(new Error(code),{status});};
      if (action==="remove" ? !globalOwner : !assignedTrainer) fail("R399_CLASS_ACTION_SCOPE_DENIED",403);
      if (group.mode!=="GROUP" || !["DRAFT","ASSIGNED","IN_PROGRESS"].includes(group.status)) fail("R399_CLASS_NOT_ACTIVE");
      const audit=async (event,metadata)=>client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'r6_training_group',$3,'SUCCESS',$4,$5)",[principal.user.id,event,id,crypto.randomUUID(),JSON.stringify(metadata)]);
      const now=(await client.query("select clock_timestamp() as at")).rows[0].at;
      const futureDate=(value)=>{
        if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail("R399_START_DATE_INVALID",400);
        const date=new Date(value);
        if(!Number.isFinite(date.getTime()) || date<=now) fail("R399_START_DATE_MUST_BE_FUTURE",400);
        return date;
      };
      if(action==="schedule"){
        if(!group.trainer_user_id || !["ASSIGNED","IN_PROGRESS"].includes(group.status)) fail("R399_TRAINER_REQUIRED");
        if(group.scheduled_start_at && new Date(group.scheduled_start_at)<=now) fail("R399_CLASS_ALREADY_STARTED");
        const date=futureDate(body.startAt);
        const rows=(await client.query("select id,contact_status,agreed_start_at from r6_training_group_participants where training_group_id=$1 and status='ACTIVE' for update",[id])).rows;
        if(!rows.length || rows.some(p=>p.contact_status!=="AGREED" || !p.agreed_start_at || new Date(p.agreed_start_at).getTime()!==date.getTime())) fail("R399_ALL_PARTICIPANTS_MUST_AGREE");
        const updated=(await client.query("update r6_training_groups set scheduled_start_at=$2,schedule_updated_at=clock_timestamp(),schedule_updated_by=$3,updated_at=now() where id=$1 returning *",[id,date,principal.user.id])).rows[0];
        await client.query("update r6_training_group_participants set planned_at=$2,updated_at=now() where training_group_id=$1 and status='ACTIVE'",[id,date]);
        await audit("r399.class.schedule",{previousStartAt:group.scheduled_start_at,startAt:date});
        if (!group.scheduled_start_at || new Date(group.scheduled_start_at).getTime()!==date.getTime()) {
          await queueR399ClassLearnerNotice(client,updated,group.scheduled_start_at?"R399_CLASS_LEARNER_RESCHEDULED":"R399_CLASS_LEARNER_SCHEDULED");
          if (process.env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED === "1") {
            const teacher = (await client.query("select display_name from platform_users where id=$1",[updated.trainer_user_id])).rows[0];
            const fmt = value => new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}).format(new Date(value));
            const revision = new Date(updated.schedule_updated_at).toISOString();
            await queueOwnerManagementEmail(client, {
              templateKey: group.scheduled_start_at ? "owner-class-rescheduled" : "owner-class-scheduled",
              eventId: `${id}:${crypto.createHash("sha256").update(revision).digest("hex")}`,
              metadata: {trainerName: teacher?.display_name, programName: updated.training_type,
                reference: `Sınıf ${updated.class_number || id}`, sessionDate: fmt(updated.scheduled_start_at),
                date: group.scheduled_start_at ? fmt(group.scheduled_start_at) : "", status:"Mutabakat tamamlandı"}
            });
          }
        }
        await client.query("commit");return json(res,200,{group:updated,status:updated.status});
      }
      const participantId=String(body.participantId||"");
      if(!isUuid(participantId)) fail("R6_PARTICIPANT_ID_INVALID",400);
      const participant=(await client.query("select * from r6_training_group_participants where id=$1 and training_group_id=$2 for update",[participantId,id])).rows[0];
      if(!participant || participant.status!=="ACTIVE") fail("R399_PARTICIPANT_NOT_ACTIVE");
      if(action==="contact"){
        if(!group.trainer_user_id || !["ASSIGNED","IN_PROGRESS"].includes(group.status)) fail("R399_TRAINER_REQUIRED");
        if(group.scheduled_start_at && new Date(group.scheduled_start_at)<=now) fail("R399_CLASS_ALREADY_STARTED");
        const status=String(body.contactStatus||"");
        if(!["PENDING","UNREACHABLE","CONTACTED","AGREED"].includes(status)) fail("R399_CONTACT_STATUS_INVALID",400);
        const date=status==="AGREED"?futureDate(body.startAt):null;
        const matches=!!date && !!group.scheduled_start_at && date.getTime()===new Date(group.scheduled_start_at).getTime();
        const updated=(await client.query("update r6_training_group_participants set contact_status=$2,contact_updated_at=clock_timestamp(),agreed_start_at=$3,planned_at=$4,updated_at=now() where id=$1 returning id,contact_status,agreed_start_at,planned_at",[participantId,status,date,matches?date:null])).rows[0];
        await audit("r399.class.contact",{participantId,previousStatus:participant.contact_status,previousAgreedStartAt:participant.agreed_start_at,contactStatus:status,agreedStartAt:date});
        await client.query("commit");return json(res,200,{participant:updated});
      }
      const reason=typeof body.reason==="string"?body.reason.trim():"";
      if(!reason || reason.length>500) fail("R399_REMOVAL_REASON_REQUIRED",400);
      if(participant.enrollment_id){
        const enrollment=(await client.query("select status from enrollments where id=$1 for update",[participant.enrollment_id])).rows[0];
        if(!enrollment || enrollment.status==="COMPLETED") fail("R399_COMPLETED_ENROLLMENT_PROTECTED");
      }
      await queueR399ClassLearnerNotice(client,group,"R399_LEARNER_REMOVED",participantId);
      // Only assignment state changes: no refund, entitlement, enrollment progress or ledger modification.
      await client.query("update r6_training_group_participants set status='CANCELLED',removed_at=clock_timestamp(),removed_by=$2,removal_reason=$3,updated_at=now() where id=$1",[participantId,principal.user.id,reason]);
      const totals=(await client.query("select count(*)::int as active,coalesce(sum(compensation_minor) filter(where billable),0)::bigint as amount from r6_training_group_participants where training_group_id=$1 and status='ACTIVE'",[id])).rows[0];
      if(Number(totals.amount)>2147483647) fail("COMPENSATION_TOTAL_INVALID");
      await client.query("update r6_training_groups set projected_payout_minor=$2,updated_at=now() where id=$1",[id,Number(totals.amount)]);
      await audit("r399.class.participant_removed",{participantId,enrollmentId:participant.enrollment_id,reason,previousStatus:participant.status,compensationMinor:participant.compensation_minor});
      await queueR399ClassTrainerNotice(client,group,"R399_CLASS_STUDENT_REMOVED",participantId);
      if (participant.enrollment_id && process.env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED === "1") {
        const eligible=(await client.query(`select coalesce(nullif(trim(concat_ws(' ',cp.first_name,cp.last_name)),''),nullif(trim(concat_ws(' ',sp.first_name,sp.last_name)),''),'Öğrenci profili') as name
          from enrollments e join package_entitlement_enrollments l on l.enrollment_id=e.id and l.training_program_id=e.training_program_id
          join package_entitlements pe on pe.id=l.package_entitlement_id and pe.beneficiary_student_user_id=e.student_user_id
          left join r6_student_child_profiles cp on cp.id=e.beneficiary_child_profile_id and cp.owner_user_id=e.student_user_id and cp.status='ACTIVE'
          left join student_profiles sp on sp.id=$3 and sp.user_id=e.student_user_id and sp.status='ACTIVE' and (e.beneficiary_child_profile_id is null or sp.id=cp.legacy_student_profile_id)
          where e.id=$1 and e.student_user_id=$2 and e.beneficiary_child_profile_id is not distinct from $4::uuid
          and e.beneficiary_child_profile_id is not distinct from pe.beneficiary_child_profile_id
          and (e.beneficiary_child_profile_id is null or cp.id is not null)
          and e.status='ACTIVE' and e.completed_at is null and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now())
          and l.source_order_item_id is not distinct from pe.source_order_item_id
          and (pe.source_type='OWNER_MANUAL' or exists(select 1 from orders o where o.id=pe.source_order_id and o.status in ('PAID','PARTIALLY_REFUNDED')))
          and not exists(select 1 from trainer_assignments t where t.enrollment_id=e.id and t.status='ACTIVE')
          and not exists(select 1 from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id where p.enrollment_id=e.id and p.status='ACTIVE' and g.status in ('DRAFT','ASSIGNED','IN_PROGRESS'))
          limit 1`,[participant.enrollment_id,participant.student_user_id,participant.student_profile_id,participant.child_profile_id])).rows[0];
        if (eligible) await queueOwnerManagementEmail(client,{templateKey:"owner-reassignment-pending",eventId:`class:${participantId}`,metadata:{studentName:eligible.name,programName:group.training_type,reference:participantId,date:new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}).format(new Date()),status:"Sınıf yeniden atama bekliyor"}});
      }
      await client.query("commit");return json(res,200,{status:"CANCELLED",participantId,activeParticipantCount:totals.active,refundCreated:false});
    }
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
    const participants = (await client.query("select id,status,billable,student_user_id,enrollment_id,compensation_minor,planned_at from r6_training_group_participants where training_group_id=$1 for update", [id])).rows;
    const active = participants.filter((participant) => participant.status === "ACTIVE");
    if(active.some(p=>
      !p.planned_at ||
      !Number.isFinite(Date.parse(p.planned_at)) ||
      Date.now()-Date.parse(p.planned_at)<21*86400000
    )){
      throw Object.assign(
        new Error("TRAINING_21_DAY_REQUIREMENT"),
        {status:409}
      );
    }
    if (active.length < Number(group.min_students)) throw Object.assign(new Error("R6_GROUP_MINIMUM_NOT_MET"), { status: 409 });
    const billableCount = active.filter((participant) => participant.billable).length;
    if (!group.trainer_user_id) throw Object.assign(new Error("R6_GROUP_TRAINER_REQUIRED"), { status: 409 });
    const payable=active.filter(p=>p.billable);
    if(payable.some(p=>!Number.isInteger(p.compensation_minor)||p.compensation_minor<=0)) throw Object.assign(new Error('GROUP_COMPENSATION_MISSING'),{status:409});
    const amountMinor=payable.reduce((sum,p)=>sum+p.compensation_minor,0);
    if(amountMinor>2147483647) throw Object.assign(new Error('COMPENSATION_TOTAL_INVALID'),{status:400});
    const completedAt = new Date();
    const bounds = completionMonthBounds(completedAt);
    const earningKey = `R6_GROUP_COMPLETION:${id}`;
    const earning = (await client.query(`insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at,assignment_id,billable_student_count,payable_at,payable_period_start,payable_period_end) values($1,'SESSION','EARNED',$2,'TRY',$3,'R6_TRAINING_GROUP_COMPLETION',$4,$5,$6,$7,$8,$9,$10,$11) on conflict(idempotency_key) do nothing returning id,amount_minor as "amountMinor",currency,status,payable_at as "payableAt",billable_student_count as "billableStudentCount"`, [group.trainer_user_id, amountMinor, `R6 ${group.training_type} eğitimi tamamlandı`, id, earningKey, completedAt, null, billableCount, bounds.payableAt, bounds.payablePeriodStart, bounds.payablePeriodEnd])).rows[0];
    for (const participant of active) {
      if (!participant.enrollment_id) continue;
      const completionKey = `R6_GROUP_COMPLETION:${id}:${participant.enrollment_id}`;
      const newCompletion = (await client.query(
        "insert into enrollment_completions(enrollment_id,assignment_id,completed_by,idempotency_key,metadata_json) values($1,null,$2,$3,$4) on conflict(enrollment_id) do nothing returning id",
        [participant.enrollment_id, principal.user.id, completionKey, JSON.stringify({ source: "R6_TRAINING_GROUP_COMPLETION", trainingGroupId: id, participantId: participant.id })],
      )).rows[0];
      if (newCompletion?.id) await ownerEducationCompletion(client,{completionId:newCompletion.id,enrollmentId:participant.enrollment_id,trainerUserId:group.trainer_user_id,completedAt});
      await client.query(
        "update enrollments set status='COMPLETED',progress_percent=100,completed_at=coalesce(completed_at,$2),updated_at=now() where id=$1 and status<>'CANCELLED'",
        [participant.enrollment_id, completedAt],
      );
    }
    if (earning?.id && amountMinor > 0) await ownerEducationEarning(client,{earningId:earning.id,amountMinor,currency:"TRY",completedAt,trainerUserId:group.trainer_user_id,programName:`Grup eğitimi (${active.length} öğrenci)`});
    const recipients = (await client.query(`select distinct u.id,u.email,sp.guardian_email as "guardianEmail" from r6_training_group_participants p join platform_users u on u.id=p.student_user_id left join student_profiles sp on sp.id=p.student_profile_id where p.training_group_id=$1 and p.status='ACTIVE'`, [id])).rows;
    for (const recipient of recipients) {
      const emails = new Set([recipient.email, recipient.guardianEmail].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
      for (const email of emails) await queueEmailOutbox(client, { recipientUserId: recipient.id, eventType: "R6_TRAINING_COMPLETED", recipientEmail: email, subject: "Eğitiminiz tamamlandı", body: "Eğitim tamamlanma kaydınız oluşturuldu. Değerlendirmenizi panelinizden paylaşabilirsiniz.", metadata: { path: "/panel/ogrenci", reference: id, programName: "Fixoku eğitimi" }, dedupeKey: `r6-training-completed:${id}:${recipient.id}:${email}` });
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
