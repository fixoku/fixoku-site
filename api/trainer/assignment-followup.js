// R387C: database-backed trainer assignment followup.
// Planning dates are stored on authoritative assignment rows.


import { permittedStart } from '../../src/server/domain/assignment-calendar-r402.js';
import { Readable } from 'node:stream';
import pg from 'pg';
import crypto from 'node:crypto';
import { createProfilePhotoUrl, getProfileMediaConfig, readProfilePhoto } from '../../src/server/domain/profile-media.js';
import { resolvePrincipal } from '../../src/server/auth/authorization.js';
import { assertTrainerPrincipal } from '../../src/server/domain/trainer-commerce.js';
import { eligibleToComplete, validUuid } from './assignment-followup-core.js';


const head = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]));
function respond(res, code, data) { res.statusCode=code; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(data)); }
async function bodyOf(req) { if(req.body && typeof req.body==='object' && !Buffer.isBuffer(req.body)) return req.body; let raw=typeof req.body==='string'?req.body:''; for await (const part of req) { raw+=part; if(raw.length>4096) throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413}); } try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('INVALID_JSON'),{status:400}); } }

function cleanRecord(raw, memberIds) { const out={}; for(const id of memberIds) { const at=raw?.[id]?.plannedAt; if(typeof at==='string' && Number.isFinite(Date.parse(at))) out[id]={plannedAt:at}; } return out; }
async function authoritativeAssignments(pool, trainerId) {
  const [groups, participants, singles] = await Promise.all([
    pool.query(`select id::text as id, status::text as status, mode::text as mode, class_number as "classNumber", scheduled_start_at as "scheduledStartAt" from r6_training_groups where trainer_user_id=$1`,[trainerId]),
    pool.query(`select p.training_group_id::text as "assignmentId", p.id::text as "studentId", p.planned_at as "plannedAt" from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id where g.trainer_user_id=$1 and p.status='ACTIVE'`,[trainerId]),
    pool.query(`select e.id::text as id, e.student_user_id::text as "studentId", e.status::text as status, a.id::text as "assignmentId", a.planned_at as "plannedAt", cs.calculation_base as "calculationBase", cs.rate_minor as "rateMinor" from trainer_assignments a join enrollments e on e.id=a.enrollment_id left join trainer_compensation_snapshots cs on cs.assignment_id=a.id where a.trainer_user_id=$1 and a.status='ACTIVE'`,[trainerId]),
  ]);
  const result={};
  for(const g of groups.rows) result[`r6-${g.id}`]={kind:'r6',id:g.id,status:g.status,mode:g.mode,classNumber:g.classNumber,scheduledStartAt:g.scheduledStartAt,memberIds:[]};
  for(const p of participants.rows) { const a=result[`r6-${p.assignmentId}`]; if(a && validUuid(p.studentId) && !a.memberIds.includes(p.studentId)) a.memberIds.push(p.studentId); }
  for(const row of singles.rows) if(validUuid(row.studentId)) result[`legacy-${row.id}`]={kind:'legacy',id:row.id,status:row.status,memberIds:[row.studentId],assignmentId:row.assignmentId,scheduledStartAt:row.plannedAt,isFree:row.calculationBase==='OWNER_FREE' && row.rateMinor===0};
  return result;
}
// R399: authorized, assignment-scoped profile identity. Never use a sibling's photo.
async function readProfiles(pool, trainerId) {
  const result = await pool.query(`
    with targets as (
      select 'r6-'||g.id::text as assignment_key,p.id as profile_target,p.student_user_id,
             p.child_profile_id,p.student_profile_id,p.enrollment_id,p.contact_status,p.agreed_start_at
      from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id
      where g.trainer_user_id=$1 and g.status in ('ASSIGNED','IN_PROGRESS','COMPLETED')
        and p.status in ('ACTIVE','COMPLETED')
      union all
      select 'legacy-'||e.id::text,a.id,e.student_user_id,e.beneficiary_child_profile_id,null::uuid,e.id,a.contact_status,a.agreed_start_at
      from trainer_assignments a join enrollments e on e.id=a.enrollment_id
      where a.trainer_user_id=$1 and a.status='ACTIVE' and e.status in ('ACTIVE','PAUSED','COMPLETED')
    )
    select t.assignment_key as "assignmentKey", t.profile_target::text as "targetId",
      t.student_user_id::text as "studentUserId",
      case when t.child_profile_id is not null then nullif(concat_ws(' ',cp.first_name,cp.last_name),'')
           else coalesce(nullif(concat_ws(' ',sp.first_name,sp.last_name),''),pu.display_name) end as name,
      case when t.child_profile_id is not null then cp.education_stage::text else sp.education_stage::text end as stage,
      case when t.child_profile_id is not null then coalesce(cp.grade,sp.grade) else sp.grade end as grade,
      case when t.child_profile_id is not null then coalesce(cp.school,sp.school) else sp.school end as school,
      case when t.child_profile_id is not null then cp.photo_storage_key else sp.photo_storage_key end as photo_key,
      case when t.child_profile_id is null or sp.id is not null then pu.email else null end as email,
      sp.phone, sp.guardian_phone as "guardianPhone", sp.guardian_name as "guardianName",
      sp.guardian_email as "guardianEmail", sp.guardian_relation as "guardianRelation",
      case when t.child_profile_id is not null then cp.date_of_birth else sp.date_of_birth end as birth_date,
      pkg.title as "packageTitle",pkg.slug as "packageSlug",pkg.cover as "packageCover",t.contact_status as "contactStatus",t.agreed_start_at as "agreedStartAt"
    from targets t join platform_users pu on pu.id=t.student_user_id
    left join r6_student_child_profiles cp on cp.id=t.child_profile_id and cp.owner_user_id=t.student_user_id and cp.status='ACTIVE'
    left join student_profiles sp on sp.user_id=t.student_user_id and sp.status='ACTIVE' and
      (case when t.child_profile_id is not null then sp.id=cp.legacy_student_profile_id
            when t.student_profile_id is not null then sp.id=t.student_profile_id else true end)
    left join lateral (
      select case when count(distinct pe.package_version_id)=1 then min(pv.title) else null end as title,
             case when count(distinct pe.package_version_id)=1 then min(pk.slug) else null end as slug,
             case when count(distinct pe.package_version_id)=1 then min(pk.icon_reference) else null end as cover
      from package_entitlement_enrollments pee
      join package_entitlements pe on pe.id=pee.package_entitlement_id
      join package_versions pv on pv.id=pe.package_version_id
      join packages pk on pk.id=pv.package_id
      where pee.enrollment_id=t.enrollment_id and pe.beneficiary_student_user_id=t.student_user_id
        and pe.beneficiary_child_profile_id is not distinct from t.child_profile_id
        and (pe.beneficiary_student_profile_id is null or pe.beneficiary_student_profile_id=sp.id)
        and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now()
        and (pe.expires_at is null or pe.expires_at>now())
    ) pkg on true
    where (t.child_profile_id is null or cp.id is not null)
      and (t.child_profile_id is not null or t.student_profile_id is null or sp.id is not null)
    order by t.assignment_key,t.profile_target`,[trainerId]);
  return result.rows;
}
function publicProfiles(rows) {
  const out = {};
  for (const row of rows) {
    const {photo_key,phone,guardianPhone,guardianName,guardianEmail,guardianRelation,birth_date,email,...safe}=row;
    const clean = v=>typeof v==='string' && v.trim() ? v.trim() : null;
    const birth=birth_date ? new Date(birth_date) : null;
    const cutoff=new Date(); cutoff.setUTCFullYear(cutoff.getUTCFullYear()-18);
    const adult=birth && Number.isFinite(birth.getTime()) ? birth<=cutoff : row.stage==='ADULT';
    const hasGuardian=[guardianPhone,guardianName,guardianEmail,guardianRelation].some(v=>clean(v));
    const guardian=!adult && hasGuardian;
    const contact={kind:guardian?'GUARDIAN':'STUDENT',name:guardian?clean(guardianName):clean(row.name),
      phone:guardian?clean(guardianPhone):clean(phone),email:guardian?clean(guardianEmail):clean(email)};
    const photoUrl=photo_key ? '/api/trainer/assignment-followup?photoAssignment='+encodeURIComponent(row.assignmentKey)+'&photoTarget='+encodeURIComponent(row.targetId) : null;
    (out[row.assignmentKey] ||= []).push({...safe,phone:contact.phone,email:contact.email,contact,photoUrl});
  }
  return out;
}
async function sendAssignedPhoto(req,res,rows) {
  const url=new URL(req.url||'', 'http://local');
  const key=url.searchParams.get('photoAssignment'), target=url.searchParams.get('photoTarget');
  if(!key || !validUuid(target)) return respond(res,400,{error:'INVALID_PHOTO_TARGET'});
  const matches=rows.filter(r=>r.assignmentKey===key && r.targetId===target);
  if(matches.length!==1 || !matches[0].photo_key) return respond(res,404,{error:'PHOTO_NOT_FOUND'});
  const config=getProfileMediaConfig();
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(config.provider==='R2'||config.provider==='S3') {
    const location=createProfilePhotoUrl(config,matches[0].photo_key);
    if(!location)return respond(res,404,{error:'PHOTO_NOT_FOUND'});
    res.statusCode=302;res.setHeader('Location',location);return res.end();
  }
  const photo=await readProfilePhoto(config,matches[0].photo_key);
  if(!photo)return respond(res,404,{error:'PHOTO_NOT_FOUND'});
  res.statusCode=200;res.setHeader('Content-Type',photo.mime);return res.end(photo.buffer);
}
async function databaseMarks(pool,trainerId,a){
    const q=a.kind==='r6'
      ? await pool.query(
        `select p.id::text as id,
                 p.planned_at as "plannedAt"
          from r6_training_group_participants p
          join r6_training_groups g
            on g.id=p.training_group_id
          where g.id=$1 and g.trainer_user_id=$2
            and p.status='ACTIVE'`,
        [a.id,trainerId])
      : await pool.query(
        `select e.student_user_id::text as id,
                 x.planned_at as "plannedAt"
          from trainer_assignments x
          join enrollments e on e.id=x.enrollment_id
          where e.id=$1 and x.trainer_user_id=$2
            and x.status='ACTIVE'`,
        [a.id,trainerId]);

    const marks={};
    const ids=new Set();
    for(const row of q.rows){
      if(ids.has(row.id)) return {};
      ids.add(row.id);
      if(row.plannedAt)
        marks[row.id]={
          plannedAt:new Date(row.plannedAt).toISOString()
        };
    }
    return marks;
  }

  async function snapshot(pool,trainerId,assignments){
    const out={};
    for(const [key,a] of Object.entries(assignments)){
      const marks=await databaseMarks(pool,trainerId,a);
      const freeReason=a.kind==='legacy' && a.isFree ? (await pool.query(`select metadata_json::jsonb->>'freeReason' as reason from platform_audit_events where action in ('trainer.assignment.assign','trainer.assignment.reassigned') and result='SUCCESS' and metadata_json::jsonb->>'trainerAssignmentId'=$1 and metadata_json::jsonb->>'trainerUserId'=$2 and metadata_json::jsonb->>'freeAssignment'='true' order by occurred_at desc limit 1`,[a.assignmentId,trainerId])).rows[0]?.reason||null : null;
      out[key]={
        freeReason,
        marks,
        eligibility:eligibleToComplete(a.memberIds,marks),
        status:a.status,
        scheduledStartAt:a.scheduledStartAt||null,
        classNumber:a.kind==='r6'?a.classNumber??null:null,
        memberIds:a.memberIds
      };
    }
    return out;
  }

  // R400: one locked assignment owns communication and the agreed start date.
  async function persistIndividual(pool,trainerId,a,body){
    const client=await pool.connect();
    const fail=(code,status=409)=>{throw Object.assign(new Error(code),{status});};
    try{
      await client.query('begin');
      const enrollment=(await client.query("select id from enrollments where id=$1 and student_user_id=$2 and status in ('ACTIVE','PAUSED') for update",[a.id,body.studentId])).rows[0];
      if(!enrollment) fail('ENROLLMENT_NOT_ACTIVE');
      const row=(await client.query("select * from trainer_assignments where id=$1 and enrollment_id=$2 and trainer_user_id=$3 and status='ACTIVE' for update",[a.assignmentId,a.id,trainerId])).rows[0];
      if(!row) fail('ASSIGNMENT_MISMATCH');
      const now=(await client.query('select clock_timestamp() as at')).rows[0].at;
      if(row.planned_at && new Date(row.planned_at)<=now) fail('TRAINING_ALREADY_STARTED');
      const futureDate=()=>{
        if(typeof body.startAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(body.startAt)) fail('START_DATE_INVALID',400);
        const d=permittedStart(body.startAt,now);if(!d)fail('START_DATE_OUTSIDE_ALLOWED_WINDOW',400);return d;
      };
      if(body.action==='contact'){
        const status=body.contactStatus;
        if(!['PENDING','UNREACHABLE','CONTACTED','AGREED'].includes(status))fail('CONTACT_STATUS_INVALID',400);
        const date=status==='AGREED'?futureDate():null;
        await client.query('update trainer_assignments set contact_status=$2,contact_updated_at=clock_timestamp(),agreed_start_at=$3,updated_at=now() where id=$1',[row.id,status,date]);
      }else if(body.action==='schedule'){
        const date=futureDate();
        if(row.contact_status!=='AGREED'||!row.agreed_start_at||new Date(row.agreed_start_at).getTime()!==date.getTime())fail('START_DATE_AGREEMENT_REQUIRED');
        await client.query('update trainer_assignments set planned_at=$2,updated_at=now() where id=$1',[row.id,date]);
      }else fail('INVALID_STUDENT_OR_ACTION',400);
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'trainer_assignment',$3,'SUCCESS',$4,$5)",[trainerId,'trainer.assignment.'+body.action,row.id,crypto.randomUUID(),JSON.stringify({previousStart:row.planned_at,previousContact:row.contact_status,contactStatus:body.contactStatus||null,startAt:body.startAt||null})]);
      const marks=await databaseMarks(client,trainerId,a);
      await client.query('commit');return {marks,eligibility:eligibleToComplete(a.memberIds,marks)};
    }catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}
  }
async function delegateCompletion(originalReq,res,a) {
  const payload=a.kind==='r6' ? {action:'complete'} : {enrollmentId:a.id,idempotencyKey:`R6E:${a.id}`};
  const originalUrl=a.kind==='r6' ? `/api/admin/r6-training-groups/${encodeURIComponent(a.id)}` : '/api/trainer/completions';
  const proxy=Readable.from([Buffer.from(JSON.stringify(payload),'utf8')]);
  proxy.method='POST'; proxy.url=originalUrl; proxy.headers={...originalReq.headers,'content-type':'application/json'};
  proxy.socket=originalReq.socket; proxy.connection=originalReq.connection; proxy.query={id:a.id};
  const module=a.kind==='r6' ? await import('../admin/r6-training-groups/[id].js') : await import('./completions.js');
  return module.default(proxy,res);
}
export default async function handler(req,res) {

  if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  let principal,user;
  try { principal=await resolvePrincipal(head(req)); if(!principal) return respond(res,401,{error:'UNAUTHENTICATED'}); user=await assertTrainerPrincipal(principal); }
  catch {return respond(res,403,{error:'TRAINER_ACCESS_REQUIRED'});}
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:4000});
  try {
    if(req.method==='GET' && new URL(req.url||'', 'http://local').searchParams.has('photoAssignment')) {
      return await sendAssignedPhoto(req,res,await readProfiles(pool,user.id));
    }
    const assignments=await authoritativeAssignments(pool,user.id);
    if(req.method==='GET') {
      const profilesByAssignment=publicProfiles(await readProfiles(pool,user.id));
      return respond(res,200,{assignments:await snapshot(pool,user.id,assignments),profiles:{},profilesByAssignment,scope:'DATABASE',completionDays:21});
    }
    const body=await bodyOf(req);
    if(typeof body.assignmentKey!=='string' || !/^((r6|legacy)-[\da-f-]{36})$/iu.test(body.assignmentKey))return respond(res,400,{error:'INVALID_ASSIGNMENT_KEY'});
    const a=assignments[body.assignmentKey];
    if(!a)return respond(res,403,{error:'NOT_ASSIGNED_TO_TRAINER'});
    if(['COMPLETED','ARCHIVED','CANCELLED'].includes(String(a.status).toUpperCase()))return respond(res,409,{error:'ASSIGNMENT_NOT_ACTIVE'});
    if(body.action==='complete') {
      if(a.kind==='r6' && !['ASSIGNED','IN_PROGRESS'].includes(String(a.status).toUpperCase())) return respond(res,409,{error:'GROUP_NOT_IN_PROGRESS'});
      const persisted=await databaseMarks(pool,user.id,a);
      const marks=cleanRecord(persisted,a.memberIds);
      const eligibility=eligibleToComplete(a.memberIds,marks);
      if(!eligibility.ready)return respond(res,409,{error:eligibility.reason,daysLeft:eligibility.daysLeft});
      // A real payout can be created only by the ORIGINAL protected completion handler.
      // We do not make direct earnings/finance writes or forge completion flags.
      return await delegateCompletion(req,res,a);
    }
    if(a.kind==='r6') return respond(res,409,{error:'R399_USE_CLASS_AGREEMENT'});
    if(!['contact','schedule'].includes(body.action) || !validUuid(body.studentId) || !a.memberIds.includes(body.studentId))return respond(res,400,{error:'INVALID_STUDENT_OR_ACTION'});
    const result=await persistIndividual(pool,user.id,a,body);
    return respond(res,200,{ok:true,...result,scope:'DATABASE'});
  } catch(error) {
    const code=error.status && error.status>=400 && error.status<=499 ? error.status : 503;
    console.error('[FIXOKU_R387C] Assignment follow-up request failed:', error?.code||error?.message);
    return respond(res,code,{error:code===503?'FOLLOWUP_SERVICE_UNAVAILABLE':(error.code||error.message||'REQUEST_FAILED')});
  } finally { await pool.end(); }
}
