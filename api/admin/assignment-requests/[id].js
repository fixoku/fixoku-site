import crypto from "node:crypto";
import { queueOwnerManagementEmail } from "../../../src/server/domain/owner-management-notifications-r390.js";
import pg from "pg";
import {getProfileMediaConfig,readProfilePhoto} from "../../../src/server/domain/profile-media.js";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
import { effectiveTrainerQualificationPredicate } from "../../../src/server/domain/trainer-expertise.js";
import { queueEmailOutbox, queuePanelNotification } from "../../../src/server/domain/panel-notifications.js";

const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
async function readBody(req){if(req.body && typeof req.body === "object") return req.body; let raw="";for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function readEnrollmentQualification(client, enrollmentId) {
  return (await client.query(`
    select distinct q.id,q.code,q.title
    from package_entitlement_enrollments pee
    join package_entitlements pe on pe.id=pee.package_entitlement_id and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now())
    left join orders o on o.id=pe.source_order_id
    left join order_items oi on oi.id=pee.source_order_item_id
    join package_components pc on pc.package_version_id=coalesce(oi.package_version_id,pe.package_version_id) and pc.is_active=true
    join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id)
      and pp.is_active=true and pp.r6_product_type='TRAINING_SERVICE' and pp.service_mode='INDIVIDUAL'
    join enrollments e on e.id=pee.enrollment_id
    left join r6_student_child_profiles c on c.id=e.beneficiary_child_profile_id and c.status='ACTIVE'
    left join student_profiles sp on sp.user_id=e.student_user_id
    join r6_qualification_definitions q on q.service_type=pp.service_type
      and q.education_stage=coalesce(c.education_stage,sp.education_stage)
    where pee.enrollment_id=$1
      and (pe.source_type='OWNER_MANUAL' or o.status in ('PAID','PARTIALLY_REFUNDED'))
    order by q.code
    limit 1
  `, [enrollmentId])).rows[0] || null;
}

export { assertTrainerEligibleForEnrollment, readEnrollmentQualification };

async function assertTrainerEligibleForEnrollment(client, trainerUserId, enrollmentId) {
  const r6Qualification = await readEnrollmentQualification(client, enrollmentId);
  if (r6Qualification) {
    const eligible = (await client.query(`
      select exists(
        select 1 from platform_memberships m
        join r6_trainer_qualification_grants g on g.trainer_user_id=m.user_id
        where m.user_id=$1 and m.role='TRAINER' and m.scope_type='TRAINER' and m.scope_id=m.user_id and m.status='ACTIVE'
          and g.qualification_id=$2
          and ${effectiveTrainerQualificationPredicate("g")}
      ) as eligible
    `, [trainerUserId, r6Qualification.id])).rows[0]?.eligible === true;
    if (!eligible) throw Object.assign(new Error("TRAINER_NOT_ELIGIBLE"), { status: 403 });
    return r6Qualification;
  }
  const legacy = (await client.query(
    "select q.id from trainer_qualifications q where q.trainer_user_id=$1 and q.training_program_id=(select training_program_id from enrollments where id=$2) and q.status='ACTIVE' and q.valid_from<=now() and (q.valid_until is null or q.valid_until>now())",
    [trainerUserId, enrollmentId],
  )).rows[0];
  if (!legacy) throw Object.assign(new Error("TRAINER_NOT_ELIGIBLE"), { status: 403 });
  return null;
}


async function r399IndividualLearnerEmail(client, enrollmentId) {
  const row=(await client.query(`select u.email,u.email_verified,
    case when e.beneficiary_child_profile_id is not null then cp.date_of_birth else sp.date_of_birth end as birth_date,
    case when e.beneficiary_child_profile_id is not null then cp.education_stage else sp.education_stage end as stage,
    sp.guardian_name,sp.guardian_phone,sp.guardian_email,sp.guardian_relation
    from enrollments e join platform_users u on u.id=e.student_user_id
    left join r6_student_child_profiles cp on cp.id=e.beneficiary_child_profile_id and cp.owner_user_id=u.id and cp.status='ACTIVE'
    left join student_profiles sp on sp.user_id=u.id and sp.status='ACTIVE' and (e.beneficiary_child_profile_id is null or sp.id=cp.legacy_student_profile_id)
    where e.id=$1 and (e.beneficiary_child_profile_id is null or cp.id is not null)`,[enrollmentId])).rows[0];
  if(!row)return null;
  const clean=v=>typeof v==='string'?v.trim():'';
  const cutoff=new Date();cutoff.setUTCFullYear(cutoff.getUTCFullYear()-18);
  const birth=row.birth_date?new Date(row.birth_date):null;
  const adult=birth&&Number.isFinite(birth.getTime())?birth<=cutoff:row.stage==='ADULT';
  const guardian=!adult&&[row.guardian_name,row.guardian_phone,row.guardian_email,row.guardian_relation].some(v=>clean(v));
  const email=guardian?clean(row.guardian_email):row.email_verified?clean(row.email):'';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email.toLowerCase():null;
}
async function r399IndividualTrainerNotice(client, trainerId, assignmentId) {
  const row=(await client.query("select id,email,email_verified from platform_users where id=$1",[trainerId])).rows[0];
  if(!row)return;
  const email=row.email_verified&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email||'')?row.email:null;
  await queuePanelNotification(client,{recipientUserId:row.id,recipientEmail:email,eventType:'R399_TRAINER_REMOVED',title:'Öğrenci atamanız güncellendi',body:'Bir öğrenci atamanız kaldırıldı. Güncel atamalarınızı panelinizden inceleyebilirsiniz.',metadata:{path:'/panel/egitmen/atamalarim',reference:assignmentId},dedupeKey:`r399-individual-removed:${assignmentId}:trainer`});
}

export default async function handler(req,res){
  const principal=await resolvePrincipal(headers(req)); if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});
  const denied=requirePermission(principal,"assignment.manage"); if(denied)return json(res,denied.status,denied.body);
  const id=String(req.url||"").split("/").pop().split("?")[0]; if(!UUID.test(id))return json(res,400,{error:"INVALID_REQUEST_ID"});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
  try{
    const requestRow=(await c.query("select r.id,r.status,r.requested_at as \"requestedAt\",u.display_name as \"studentName\",u.email as \"studentEmail\",tp.title as \"programTitle\",e.id as \"enrollmentId\",e.training_program_id as \"trainingProgramId\",e.student_user_id as \"studentUserId\" from trainer_assignment_requests r join enrollments e on e.id=r.enrollment_id join platform_users u on u.id=e.student_user_id join training_programs tp on tp.id=e.training_program_id where r.id=$1",[id])).rows[0];
    if(!requestRow)return json(res,404,{error:"NOT_FOUND"});
    if(req.method==='GET'){
      const parsed=new URL(req.url,"http://local");const availabilityOnly=parsed.searchParams.get("availabilityOnly")==="true";
      const currentAssignment=(await c.query("select a.id,a.trainer_user_id as \"trainerUserId\",tu.display_name as \"trainerName\",a.status,a.created_at as \"createdAt\",a.ended_at as \"endedAt\",a.ended_reason as \"endedReason\" from trainer_assignments a join platform_users tu on tu.id=a.trainer_user_id where a.enrollment_id=$1 and a.status='ACTIVE' order by a.created_at desc limit 1",[requestRow.enrollmentId])).rows[0]||null;
      if(currentAssignment) {
        const state=(await c.query("select a.planned_at as \"plannedAt\", a.contact_status as \"contactStatus\", a.agreed_start_at as \"agreedStartAt\", e.status as \"enrollmentStatus\", e.completed_at as \"completedAt\" from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.id=$1",[currentAssignment.id])).rows[0];
        currentAssignment.plannedAt=state?.plannedAt||null;
        currentAssignment.contactStatus=state?.contactStatus||"PENDING";
        currentAssignment.agreedStartAt=state?.agreedStartAt||null;
        currentAssignment.canRemove=Boolean(state && !state.plannedAt && !state.completedAt && ['ACTIVE','PAUSED'].includes(state.enrollmentStatus));
      }
      const history=(await c.query("select h.id,h.assignment_id as \"assignmentId\",h.trainer_user_id as \"trainerUserId\",u.display_name as \"trainerName\",h.event_type as \"eventType\",h.reason,h.changed_by as \"changedBy\",h.occurred_at as \"occurredAt\" from trainer_assignment_history h join platform_users u on u.id=h.trainer_user_id where h.enrollment_id=$1 order by h.occurred_at desc",[requestRow.enrollmentId])).rows;
      const required = await readEnrollmentQualification(c,requestRow.enrollmentId);
      const candidates=(await c.query(`select u.id,u.display_name as name,u.email,tp.city,
         $4::text as qualification,to_jsonb(tp)->>'photo_url' as "photoUrl",tp.photo_storage_key as "photoStorageKey",
         (select count(distinct a.enrollment_id)::int from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.trainer_user_id=u.id and a.status='ACTIVE' and e.status in ('ACTIVE','PAUSED')) as workload,
         (select count(distinct a.enrollment_id)::int from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.trainer_user_id=u.id and e.status='COMPLETED' and e.completed_at is not null and a.created_at<=e.completed_at and (a.ended_at is null or a.ended_at>=e.completed_at)) as "completedWorkload",
         exists(select 1 from availability_slots s where s.trainer_user_id=u.id and s.status='OPEN' and s.starts_at>now()) as "hasFutureAvailability"
         from platform_users u left join trainer_profiles tp on tp.user_id=u.id
         where exists(select 1 from platform_memberships m where m.user_id=u.id and m.role='TRAINER' and m.status='ACTIVE' and m.scope_type='TRAINER' and m.scope_id=u.id)
         and (($1::uuid is not null and exists(select 1 from r6_trainer_qualification_grants g where g.trainer_user_id=u.id and g.qualification_id=$1 and ${effectiveTrainerQualificationPredicate("g")}))
         or ($1::uuid is null and exists(select 1 from trainer_qualifications q where q.trainer_user_id=u.id and q.training_program_id=$2 and q.status='ACTIVE' and q.valid_from<=now() and (q.valid_until is null or q.valid_until>now()))))
         and (not $3::boolean or exists(select 1 from availability_slots s where s.trainer_user_id=u.id and s.status='OPEN' and s.starts_at>now())) order by u.display_name`,[required?.id||null,requestRow.trainingProgramId,availabilityOnly,required?.title||"Aktif uzmanlık"])).rows;
      if(parsed.searchParams.has("trainerPhoto")) {
        const requestedPhotoId=parsed.searchParams.get("trainerPhoto");
        let candidate=candidates.find(x=>x.id===requestedPhotoId);
        if (!candidate && currentAssignment?.trainerUserId===requestedPhotoId) {
          candidate=(await c.query('select photo_storage_key as "photoStorageKey" from trainer_profiles where user_id=$1',[requestedPhotoId])).rows[0];
        }
        if(!candidate?.photoStorageKey)return json(res,404,{error:"PHOTO_NOT_FOUND"});
        const media=await readProfilePhoto(getProfileMediaConfig(),candidate.photoStorageKey);
        if(!media || !["image/jpeg","image/png","image/webp","image/gif"].includes(media.mime))return json(res,404,{error:"PHOTO_NOT_FOUND"});
        res.statusCode=200;res.setHeader("Content-Type",media.mime);res.setHeader("Cache-Control","private, no-store");res.setHeader("X-Content-Type-Options","nosniff");res.end(media.buffer);return;
      }
      if(currentAssignment) {
        const snap=(await c.query("select calculation_base,rate_minor from trainer_compensation_snapshots where assignment_id=$1",[currentAssignment.id])).rows[0];
        if(snap?.calculation_base==='OWNER_FREE' && snap.rate_minor===0) currentAssignment.freeReason=(await c.query(`select metadata_json::jsonb->>'freeReason' as reason from platform_audit_events where action in ('trainer.assignment.assign','trainer.assignment.reassigned') and result='SUCCESS' and metadata_json::jsonb->>'trainerAssignmentId'=$1 and metadata_json::jsonb->>'trainerUserId'=$2 and metadata_json::jsonb->>'freeAssignment'='true' order by occurred_at desc limit 1`,[currentAssignment.id,currentAssignment.trainerUserId])).rows[0]?.reason||null;
      }
      return json(res,200,{request:requestRow,currentAssignment,history,candidates});
    }
    if(req.method!=='POST')return json(res,405,{error:"METHOD_NOT_ALLOWED"});
    if(!(principal.memberships?.some(m=>m.role==="OWNER" && m.status==="ACTIVE" && m.scopeType==="GLOBAL" && m.scopeId==null && String(m.userId)===String(principal.user.id)))) return json(res,403,{error:"OWNER_ONLY"});
    const input=await readBody(req);
    if(input.action==='remove') {
      const reason=typeof input.reason==='string'?input.reason.trim():'';
      if(!reason || reason.length>500) return json(res,400,{error:'REMOVAL_REASON_REQUIRED'});
      if(!UUID.test(String(input.assignmentId||''))) return json(res,400,{error:'ASSIGNMENT_ID_REQUIRED'});
      await c.query('begin');
      await c.query('select pg_advisory_xact_lock(hashtext($1))',[id]);
      const request=(await c.query('select * from trainer_assignment_requests where id=$1 for update',[id])).rows[0];
      if(!request || request.status!=='ASSIGNED' || request.trainer_assignment_id!==input.assignmentId) throw Object.assign(new Error('ASSIGNMENT_CHANGED'),{status:409});
      const enrollment=(await c.query('select * from enrollments where id=$1 for update',[request.enrollment_id])).rows[0];
      if(!enrollment || !['ACTIVE','PAUSED'].includes(enrollment.status) || enrollment.completed_at) throw Object.assign(new Error('ENROLLMENT_NOT_REMOVABLE'),{status:409});
      const assignment=(await c.query("select * from trainer_assignments where id=$1 and enrollment_id=$2 and status='ACTIVE' for update",[input.assignmentId,enrollment.id])).rows[0];
      if(!assignment) throw Object.assign(new Error('ASSIGNMENT_CHANGED'),{status:409});
      if(assignment.planned_at) throw Object.assign(new Error('ASSIGNMENT_ALREADY_PLANNED'),{status:409});
      const valid=(await c.query(`select exists(select 1 from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id left join orders o on o.id=pe.source_order_id where pee.enrollment_id=$1 and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now()) and (pe.source_type='OWNER_MANUAL' or o.status in ('PAID','PARTIALLY_REFUNDED'))) as valid`,[enrollment.id])).rows[0].valid;
      await c.query("update trainer_assignments set status='ARCHIVED',ended_at=now(),ended_reason=$2,updated_at=now() where id=$1",[assignment.id,reason]);
      await c.query("insert into trainer_assignment_history(assignment_id,enrollment_id,trainer_user_id,event_type,reason,changed_by) values($1,$2,$3,'REMOVED',$4,$5)",[assignment.id,enrollment.id,assignment.trainer_user_id,reason,principal.user.id]);
      await c.query("update trainer_assignment_requests set status='CANCELLED',cancelled_at=now(),updated_at=now() where id=$1",[id]);
      const pending=valid?(await c.query("insert into trainer_assignment_requests(enrollment_id,status) values($1,'PENDING') on conflict (enrollment_id) where status='PENDING' do update set updated_at=now() returning id",[enrollment.id])).rows[0]:null;
      await c.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.assignment.remove','trainer_assignment_request',$2,'SUCCESS',$3,$4)",[principal.user.id,id,crypto.randomUUID(),JSON.stringify({assignmentId:assignment.id,enrollmentId:enrollment.id,reason,pendingRequestId:pending?.id||null})]);
      await r399IndividualTrainerNotice(c,assignment.trainer_user_id,assignment.id);
      await queuePanelNotification(c,{recipientUserId:requestRow.studentUserId,recipientEmail:await r399IndividualLearnerEmail(c,enrollment.id),eventType:'R399_LEARNER_REMOVED',title:'Eğitim atamanız güncellendi',body:'Mevcut eğitim atamanız kaldırıldı. Eğitim hakkınızın güncel durumunu panelinizden inceleyebilirsiniz.',metadata:{path:'/panel/ogrenci',reference:assignment.id},dedupeKey:`r399-individual-removed:${assignment.id}:learner`});
      if (pending && process.env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED === "1") {
        const child = enrollment.beneficiary_child_profile_id ? (await c.query("select concat_ws(' ',first_name,last_name) as name from r6_student_child_profiles where id=$1 and owner_user_id=$2",[enrollment.beneficiary_child_profile_id,enrollment.student_user_id])).rows[0] : null;
        await queueOwnerManagementEmail(c,{templateKey:"owner-reassignment-pending",eventId:`individual:${assignment.id}`,metadata:{studentName:child?.name || (enrollment.beneficiary_child_profile_id ? "Öğrenci profili" : requestRow.studentName),programName:requestRow.programTitle,reference:pending.id,date:new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}).format(new Date()),status:"Birebir yeniden atama bekliyor"}});
      }
      await c.query('commit');
      return json(res,200,{status:'REMOVED',pendingRequestId:pending?.id||null,entitlementPreserved:true});
    }
    const freeAssignment=input.freeAssignment===true;
    const freeReason=typeof input.freeReason==='string'?input.freeReason.trim():'';
    if(freeAssignment && (input.compensationMinor!==0 || !freeReason || freeReason.length>500))return json(res,400,{error:"FREE_ASSIGNMENT_REASON_REQUIRED"});
    if(!freeAssignment && (!(Number.isInteger(input.compensationMinor) && input.compensationMinor>0 && input.compensationMinor<=2147483647) || input.freeReason))return json(res,400,{error:"COMPENSATION_AMOUNT_REQUIRED"});if(!input.trainerId)return json(res,400,{error:"TRAINER_REQUIRED"});if(!UUID.test(String(input.trainerId)))return json(res,403,{error:"TRAINER_NOT_ELIGIBLE"});
    await c.query('begin');await c.query('select pg_advisory_xact_lock(hashtext($1))',[id]);
    const locked=(await c.query("select * from trainer_assignment_requests where id=$1 for update",[id])).rows[0];if(!locked)throw Object.assign(new Error('NOT_FOUND'),{status:404});
    const isReassignment=locked.status==='ASSIGNED' && input.reassign===true;
    if(locked.status==='ASSIGNED'&&!isReassignment)throw Object.assign(new Error('ALREADY_ASSIGNED'),{status:409});
    if(locked.status!=='PENDING'&&!isReassignment)throw Object.assign(new Error('ALREADY_ASSIGNED'),{status:409});
    if(isReassignment&&!String(input.reassignmentReason||'').trim())throw Object.assign(new Error('REASSIGNMENT_REASON_REQUIRED'),{status:400});
    const trainer=(await c.query("select u.id,u.email from platform_users u join platform_memberships m on m.user_id=u.id and m.role='TRAINER' and m.scope_type='TRAINER' and m.scope_id=u.id and m.status='ACTIVE' where u.id=$1",[input.trainerId])).rows[0];
    if(!trainer)throw Object.assign(new Error('TRAINER_NOT_ELIGIBLE'),{status:403});
    // R60C16E: A group-only service must be assigned through the group workflow.
    // Legacy trainer-led programs with no explicit service-mode retain existing behavior.
    const modeRows=(await c.query(`select distinct pp.service_mode as "serviceMode"
      from package_entitlement_enrollments pee
      join package_entitlements pe on pe.id=pee.package_entitlement_id and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now())
      left join orders o on o.id=pe.source_order_id
      left join order_items oi on oi.id=pee.source_order_item_id
      join package_components pc on pc.package_version_id=coalesce(oi.package_version_id,pe.package_version_id) and pc.is_active=true
      join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) and pp.r6_product_type='TRAINING_SERVICE'
      where pee.enrollment_id=$1 and (pe.source_type='OWNER_MANUAL' or o.status in ('PAID','PARTIALLY_REFUNDED'))`,[requestRow.enrollmentId])).rows;
    if(modeRows.some((row)=>row.serviceMode==='GROUP') && !modeRows.some((row)=>row.serviceMode==='INDIVIDUAL')) {
      throw Object.assign(new Error('GROUP_ASSIGNMENT_WORKFLOW_REQUIRED'),{status:409});
    }
    const activeEntitlement=(await c.query("select 1 from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now()) left join orders o on o.id=pe.source_order_id join enrollments e on e.id=pee.enrollment_id and e.status in ('ACTIVE','PAUSED') where pee.enrollment_id=$1 and (pe.source_type='OWNER_MANUAL' or o.status in ('PAID','PARTIALLY_REFUNDED')) limit 1",[requestRow.enrollmentId])).rows[0];
    if(!activeEntitlement)throw Object.assign(new Error('ACTIVE_ENTITLEMENT_REQUIRED'),{status:409});
    await assertTrainerEligibleForEnrollment(c,input.trainerId,requestRow.enrollmentId);
    if(input.availabilityOnly===true){const slot=(await c.query("select id from availability_slots where trainer_user_id=$1 and status='OPEN' and starts_at>now() limit 1",[input.trainerId])).rows[0];if(!slot)throw Object.assign(new Error('TRAINER_NOT_AVAILABLE'),{status:403});}
    const previous=(await c.query("select a.*,u.email as \"oldTrainerEmail\",u.display_name as \"oldTrainerName\" from trainer_assignments a join platform_users u on u.id=a.trainer_user_id where a.enrollment_id=$1 and a.status='ACTIVE' for update",[locked.enrollment_id])).rows[0]||null;
    if(!isReassignment&&previous)throw Object.assign(new Error('ALREADY_ASSIGNED'),{status:409});
    if(isReassignment&&previous?.trainer_user_id===input.trainerId)throw Object.assign(new Error('SAME_TRAINER'),{status:400});
    const previousWork=previous ? Number((await c.query("select count(*)::int as count from trainer_earning_ledger where assignment_id=$1 and status<>'REVERSED'",[previous.id])).rows[0]?.count||0) : 0;
    if(isReassignment&&previousWork>0&&!['PRESERVE','ADJUST_PENDING'].includes(String(input.compensationDecision||'')))throw Object.assign(new Error('COMPENSATION_DECISION_REQUIRED'),{status:400});
    if(isReassignment&&previous) await c.query("update trainer_assignments set status='ARCHIVED',ended_at=now(),ended_reason=$1,updated_at=now() where id=$2",[String(input.reassignmentReason).trim().slice(0,500),previous.id]);
    const assignment=(await c.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE') returning id",[input.trainerId,locked.enrollment_id])).rows[0];
    const versions=(await c.query(`select distinct coalesce(oi.package_version_id,pe.package_version_id) as id from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id left join orders o on o.id=pe.source_order_id left join order_items oi on oi.id=pee.source_order_item_id where pee.enrollment_id=$1 and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now()) and (pe.source_type='OWNER_MANUAL' or o.status in ('PAID','PARTIALLY_REFUNDED'))`,[locked.enrollment_id])).rows;
    if(versions.length!==1 || !versions[0].id) throw Object.assign(new Error('COMPENSATION_PACKAGE_AMBIGUOUS'),{status:409});
    const comp={type:'FIXED_AMOUNT',rate_minor:input.compensationMinor,percentage_bps:null,calculation_base:freeAssignment?'OWNER_FREE':'ORDER_TOTAL',currency:'TRY',package_version_id:versions[0].id};
    await c.query("insert into trainer_compensation_snapshots(assignment_id,trainer_user_id,enrollment_id,type,rate_minor,percentage_bps,calculation_base,currency,package_version_id) values($1,$2,$3,coalesce($4,'FIXED_AMOUNT')::trainer_compensation_type,$5,$6,coalesce($7,'ORDER_TOTAL'),coalesce($8,'TRY'),$9)",[assignment.id,input.trainerId,locked.enrollment_id,comp?.type||null,comp.rate_minor,comp?.percentage_bps??null,comp?.calculation_base||null,comp?.currency||null,comp?.package_version_id||null]);
    await c.query("insert into trainer_assignment_history(assignment_id,enrollment_id,trainer_user_id,event_type,reason,changed_by) values($1,$2,$3,$4,$5,$6)",[assignment.id,locked.enrollment_id,input.trainerId,isReassignment?'REASSIGNED_IN':'ASSIGNED',isReassignment?String(input.reassignmentReason).trim().slice(0,500):null,principal.user.id]);
    if(isReassignment&&previous) await c.query("insert into trainer_assignment_history(assignment_id,enrollment_id,trainer_user_id,event_type,reason,changed_by) values($1,$2,$3,'REASSIGNED_OUT',$4,$5)",[previous.id,locked.enrollment_id,previous.trainer_user_id,`${String(input.reassignmentReason).trim().slice(0,500)}${previousWork === 0 ? " · Mevcut hak ediş korunmadı" : String(input.compensationDecision).toUpperCase() === "PRESERVE" ? " · Mevcut hak ediş korundu" : " · Ayrı hak ediş kararı gerekli"}`,principal.user.id]);
    await c.query("update trainer_assignment_requests set status='ASSIGNED',trainer_assignment_id=$1,assigned_at=coalesce(assigned_at,now()),updated_at=now() where id=$2",[assignment.id,id]);
    const dedupeBase=`assignment:${assignment.id}`;
    await c.query("insert into panel_notifications(recipient_user_id,event_type,title,body,metadata_json,dedupe_key) values($1,$2,$3,$4,$5,$6) on conflict(dedupe_key) do nothing",[input.trainerId,isReassignment?'TRAINER_REASSIGNMENT':'TRAINER_ASSIGNMENT',isReassignment?'Yeni eğitmen ataması':'Yeni öğrenci ataması',`${requestRow.studentName} öğrencisi için ${requestRow.programTitle} ataması yapıldı.${freeAssignment?" Bu eğitim için hakediş: 0 ₺. Owner açıklaması: "+freeReason:""}`,JSON.stringify({path:'/panel/egitmen/atamalarim',assignmentId:assignment.id,enrollmentId:locked.enrollment_id,reason:input.reassignmentReason||null}),`${dedupeBase}:trainer`]);
    await c.query("insert into panel_notifications(recipient_user_id,event_type,title,body,metadata_json,dedupe_key) values($1,$2,$3,$4,$5,$6) on conflict(dedupe_key) do nothing",[requestRow.studentUserId,isReassignment?'TRAINER_REASSIGNMENT':'TRAINER_ASSIGNMENT',isReassignment?'Eğitmen değişikliği':'Eğitmen ataması',`${requestRow.programTitle} eğitiminiz için ${isReassignment?'yeni eğitmen atandı':'eğitmen atandı'}.`,JSON.stringify({path:'/panel/ogrenci',assignmentId:assignment.id,enrollmentId:locked.enrollment_id,reason:input.reassignmentReason||null}),`${dedupeBase}:student`]);
    if(isReassignment&&previous) await c.query("insert into panel_notifications(recipient_user_id,event_type,title,body,metadata_json,dedupe_key) values($1,'TRAINER_REASSIGNMENT','Atama değişikliği',$2,$3,$4) on conflict(dedupe_key) do nothing",[previous.trainer_user_id,`${requestRow.studentName} öğrencisinin eğitmen ataması değiştirildi.`,JSON.stringify({assignmentId:assignment.id,enrollmentId:locked.enrollment_id,reason:input.reassignmentReason}),`${dedupeBase}:old-trainer`]);
    await queueEmailOutbox(c,{recipientUserId:input.trainerId,eventType:isReassignment?'TRAINER_REASSIGNMENT':'TRAINER_ASSIGNMENT',recipientEmail:trainer.email,subject:isReassignment?'Yeni eğitmen ataması':'Yeni öğrenci ataması',body:`${requestRow.studentName} öğrencisi için ${requestRow.programTitle} ataması panelinizde hazır.`,metadata:{path:'/panel/egitmen/atamalarim',studentName:requestRow.studentName,programName:requestRow.programTitle},dedupeKey:`${dedupeBase}:trainer-email`});
    await queueEmailOutbox(c,{recipientUserId:requestRow.studentUserId,eventType:'R399_LEARNER_ASSIGNMENT',recipientEmail:await r399IndividualLearnerEmail(c,locked.enrollment_id),subject:'Eğitmen atamanız güncellendi',body:'Güncel eğitmen atamanızı güvenli panelinizden inceleyebilirsiniz.',metadata:{path:'/panel/ogrenci',reference:assignment.id},dedupeKey:`${dedupeBase}:student-email`});
    if(isReassignment&&previous) {
      const oldTrainer=(await c.query("select email,email_verified from platform_users where id=$1",[previous.trainer_user_id])).rows[0];
      if(oldTrainer?.email_verified) await queueEmailOutbox(c,{recipientUserId:previous.trainer_user_id,eventType:'TRAINER_REASSIGNMENT',recipientEmail:oldTrainer.email,subject:'Atama değişikliği',body:'Bir öğrenci atamanız değiştirildi.',metadata:{path:'/panel/egitmen/atamalarim',reference:previous.id},dedupeKey:`${dedupeBase}:old-trainer-email`});
    }
    await c.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'trainer_assignment_request',$3,'SUCCESS',$4,$5)",[principal.user.id,isReassignment?'trainer.assignment.reassigned':'trainer.assignment.assign',id,crypto.randomUUID(),JSON.stringify({enrollmentId:locked.enrollment_id,trainerUserId:input.trainerId,previousTrainerUserId:previous?.trainer_user_id||null,trainerAssignmentId:assignment.id,reason:input.reassignmentReason||null,previousWork,compensationMinor:input.compensationMinor,freeAssignment,freeReason:freeAssignment?freeReason:null,compensationDecision:previousWork>0?input.compensationDecision:'ZERO_WORK',emailNotificationQueued:true})]);
    await c.query('commit');return json(res,200,{status:'ASSIGNED',reassigned:isReassignment,trainerAssignmentId:assignment.id,previousTrainerUserId:previous?.trainer_user_id||null,previousWork,compensationMinor:input.compensationMinor,compensationDecision:previousWork>0?input.compensationDecision:'ZERO_WORK',notificationsCreated:isReassignment&&previous?3:2,emailNotificationsQueued:2});
  }catch(err){try{await c.query('rollback')}catch{ /* preserve original error */ }return json(res,err.status||409,{error:err.message||'ASSIGNMENT_FAILED'});}finally{c.release();await pool.end();}
}
