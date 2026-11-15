// R387C: database-backed trainer assignment followup.
// Planning dates are stored on authoritative assignment rows.


import { Readable } from 'node:stream';
import pg from 'pg';
import { resolvePrincipal } from '../../src/server/auth/authorization.js';
import { assertTrainerPrincipal } from '../../src/server/domain/trainer-commerce.js';
import { eligibleToComplete, validUuid } from './assignment-followup-core.js';


const head = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]));
function respond(res, code, data) { res.statusCode=code; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(data)); }
async function bodyOf(req) { if(req.body && typeof req.body==='object' && !Buffer.isBuffer(req.body)) return req.body; let raw=typeof req.body==='string'?req.body:''; for await (const part of req) { raw+=part; if(raw.length>4096) throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413}); } try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('INVALID_JSON'),{status:400}); } }

function cleanRecord(raw, memberIds) { const out={}; for(const id of memberIds) { const at=raw?.[id]?.plannedAt; if(typeof at==='string' && Number.isFinite(Date.parse(at))) out[id]={plannedAt:at}; } return out; }
async function authoritativeAssignments(pool, trainerId) {
  const [groups, participants, singles] = await Promise.all([
    pool.query(`select id::text as id, status::text as status from r6_training_groups where trainer_user_id=$1`,[trainerId]),
    pool.query(`select p.training_group_id::text as "assignmentId", p.student_user_id::text as "studentId", p.planned_at as "plannedAt" from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id where g.trainer_user_id=$1 and p.status='ACTIVE'`,[trainerId]),
    pool.query(`select e.id::text as id, e.student_user_id::text as "studentId", e.status::text as status, a.planned_at as "plannedAt" from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.trainer_user_id=$1 and a.status='ACTIVE'`,[trainerId]),
  ]);
  const result={};
  for(const g of groups.rows) result[`r6-${g.id}`]={kind:'r6',id:g.id,status:g.status,memberIds:[]};
  for(const p of participants.rows) { const a=result[`r6-${p.assignmentId}`]; if(a && validUuid(p.studentId) && !a.memberIds.includes(p.studentId)) a.memberIds.push(p.studentId); }
  for(const row of singles.rows) if(validUuid(row.studentId)) result[`legacy-${row.id}`]={kind:'legacy',id:row.id,status:row.status,memberIds:[row.studentId]};
  return result;
}
async function readProfiles(pool, assignments) {
  const ids=[...new Set(Object.values(assignments).flatMap(a=>a.memberIds))];
  if(!ids.length)return {};
  // Only profile data of the trainer's assigned students. Photo URLs are not fabricated.
  const q=await pool.query(`select pu.id::text as id, pu.display_name as name, pu.email,
    sp.phone, sp.guardian_phone as "guardianPhone"
    from platform_users pu left join lateral
     (select phone, guardian_phone from student_profiles where user_id=pu.id order by updated_at desc limit 1) sp on true
    where pu.id=any($1::uuid[])`,[ids]);
  return Object.fromEntries(q.rows.map(r=>[r.id,{name:r.name,email:r.email,phone:r.phone||r.guardianPhone||null,photoUrl:null}]));
}
async function databaseMarks(pool,trainerId,a){
    const q=a.kind==='r6'
      ? await pool.query(
        `select p.student_user_id::text as id,
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
      if(ids.has(row.id))
        throw Object.assign(
          new Error('AMBIGUOUS_STUDENT_ASSIGNMENT'),
          {status:409}
        );
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
      out[key]={
        marks,
        eligibility:eligibleToComplete(a.memberIds,marks),
        status:a.status,
        memberIds:a.memberIds
      };
    }
    return out;
  }

  async function persistPlan(pool,trainerId,a,body){
    const client=await pool.connect();
    try{
      await client.query('begin');
      const planning=body.action==='plan';

      if(a.kind==='r6'){
        const g=await client.query(
          `select id from r6_training_groups
            where id=$1 and trainer_user_id=$2
            and status in ('DRAFT','ASSIGNED','IN_PROGRESS')
            for update`,[a.id,trainerId]);
        if(g.rowCount!==1)
          throw Object.assign(
            new Error('GROUP_NOT_ACTIVE'),{status:409});

        const q=await client.query(
          `update r6_training_group_participants
            set planned_at=case when $3::boolean
              then coalesce(planned_at,now())
              else null end
            where training_group_id=$1
              and student_user_id=$2
              and status='ACTIVE'
            returning id`,
          [a.id,body.studentId,planning]);

        if(q.rowCount!==1)
          throw Object.assign(
            new Error('PARTICIPANT_MISMATCH'),{status:409});
      }else{
        const q=await client.query(
          `update trainer_assignments x
            set planned_at=case when $4::boolean
              then coalesce(x.planned_at,now())
              else null end
            from enrollments e
            where x.enrollment_id=e.id
              and e.id=$1 and x.trainer_user_id=$2
              and e.student_user_id=$3
              and x.status='ACTIVE'
              and e.status not in ('COMPLETED','CANCELLED')
            returning x.id`,
          [a.id,trainerId,body.studentId,planning]);

        if(q.rowCount!==1)
          throw Object.assign(
            new Error('ASSIGNMENT_MISMATCH'),{status:409});
      }

      const marks=await databaseMarks(client,trainerId,a);
      await client.query('commit');

      return {
        marks,
        eligibility:eligibleToComplete(a.memberIds,marks)
      };

    }catch(error){
      await client.query('rollback').catch(()=>{});
      throw error;
    }finally{
      client.release();
    }
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
    const assignments=await authoritativeAssignments(pool,user.id);
    if(req.method==='GET') {
      const profiles=await readProfiles(pool,assignments);
      return respond(res,200,{assignments:await snapshot(pool,user.id,assignments),profiles,scope:'DATABASE',completionDays:21});
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
    if(!['plan','unplan'].includes(body.action) || !validUuid(body.studentId) || !a.memberIds.includes(body.studentId))return respond(res,400,{error:'INVALID_STUDENT_OR_ACTION'});
    const result=await persistPlan(pool,user.id,a,body);
    return respond(res,200,{ok:true,...result,scope:'DATABASE'});
  } catch(error) {
    const code=error.status && error.status>=400 && error.status<=499 ? error.status : 503;
    console.error('[FIXOKU_R387C] Assignment follow-up request failed:', error?.code||error?.message);
    return respond(res,code,{error:code===503?'FOLLOWUP_SERVICE_UNAVAILABLE':(error.code||error.message||'REQUEST_FAILED')});
  } finally { await pool.end(); }
}
