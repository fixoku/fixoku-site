// RELEASE-018A LOCAL-ONLY. Never deploy this file-backed preview API as a production store.
// Reads only the trainer's authoritative assignments; stores planning checkmarks under private/.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import pg from 'pg';
import { resolvePrincipal } from '../../src/server/auth/authorization.js';
import { assertTrainerPrincipal } from '../../src/server/domain/trainer-commerce.js';
import { eligibleToComplete, validUuid } from './assignment-followup-core.js';

const PRIVATE_DIR = path.resolve('private', 'trainer-assignment-followup');
const DATA_FILE = path.join(PRIVATE_DIR, 'local-preview-018a.json');
const loopback = (req) => {
  const host = String(req.headers?.host || '').split(':')[0].toLowerCase();
  const address = String(req.socket?.remoteAddress || '127.0.0.1').replace(/^::ffff:/u, '');
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host) && ['127.0.0.1', '::1'].includes(address);
};
const allowed = (req) => process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1' && process.env.VERCEL_ENV !== 'production' && process.env.LOCAL_REVIEW_MODE === '1' && loopback(req);
const head = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]));
function respond(res, code, data) { res.statusCode=code; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(data)); }
async function bodyOf(req) { let raw=''; for await (const part of req) { raw+=part; if(raw.length>4096) throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413}); } try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('INVALID_JSON'),{status:400}); } }
async function readStore() { try { const raw=JSON.parse(await fs.promises.readFile(DATA_FILE,'utf8')); return raw.version===1 && typeof raw.trainers==='object' && raw.trainers!==null ? raw : {version:1,trainers:{}}; } catch(e) { if(e.code==='ENOENT') return {version:1,trainers:{}}; throw e; } }
async function saveStore(store) { await fs.promises.mkdir(PRIVATE_DIR,{recursive:true,mode:0o700}); const temp=path.join(PRIVATE_DIR,`local-preview-018a.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`); try { await fs.promises.writeFile(temp,JSON.stringify(store,null,2)+'\n',{mode:0o600,flag:'wx'}); await fs.promises.rename(temp,DATA_FILE); } finally { await fs.promises.rm(temp,{force:true}).catch(()=>{}); } }
let serial = Promise.resolve();
function lockedWrite(fn) { const task=serial.then(fn); serial=task.catch(()=>{}); return task; }
function cleanRecord(raw, memberIds) { const out={}; for(const id of memberIds) { const at=raw?.[id]?.plannedAt; if(typeof at==='string' && Number.isFinite(Date.parse(at))) out[id]={plannedAt:at}; } return out; }
async function authoritativeAssignments(pool, trainerId) {
  const [groups, participants, singles] = await Promise.all([
    pool.query(`select id::text as id, status::text as status from r6_training_groups where trainer_user_id=$1`,[trainerId]),
    pool.query(`select p.training_group_id::text as "assignmentId", p.student_user_id::text as "studentId" from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id where g.trainer_user_id=$1 and p.status='ACTIVE'`,[trainerId]),
    pool.query(`select e.id::text as id, e.student_user_id::text as "studentId", e.status::text as status from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.trainer_user_id=$1 and a.status='ACTIVE'`,[trainerId]),
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
function snapshot(store, trainerId, assignments) {
  const rows=store.trainers?.[trainerId]||{};
  const out={};
  for(const [key,a] of Object.entries(assignments)) {
    const marks=cleanRecord(rows[key]?.marks,a.memberIds);
    out[key]={marks,eligibility:eligibleToComplete(a.memberIds,marks),status:a.status,memberIds:a.memberIds};
  }
  return out;
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
  if(!allowed(req))return respond(res,404,{error:'LOCAL_PREVIEW_ONLY'});
  if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  let principal,user;
  try { principal=await resolvePrincipal(head(req)); if(!principal) return respond(res,401,{error:'UNAUTHENTICATED'}); user=await assertTrainerPrincipal(principal); }
  catch {return respond(res,403,{error:'TRAINER_ACCESS_REQUIRED'});}
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:4000});
  try {
    const assignments=await authoritativeAssignments(pool,user.id);
    if(req.method==='GET') {
      const store=await readStore(); const profiles=await readProfiles(pool,assignments);
      return respond(res,200,{assignments:snapshot(store,user.id,assignments),profiles,scope:'LOCAL_PREVIEW_FILE',completionDays:21});
    }
    const body=await bodyOf(req);
    if(typeof body.assignmentKey!=='string' || !/^((r6|legacy)-[\da-f-]{36})$/iu.test(body.assignmentKey))return respond(res,400,{error:'INVALID_ASSIGNMENT_KEY'});
    const a=assignments[body.assignmentKey];
    if(!a)return respond(res,403,{error:'NOT_ASSIGNED_TO_TRAINER'});
    if(['COMPLETED','ARCHIVED','CANCELLED'].includes(String(a.status).toUpperCase()))return respond(res,409,{error:'ASSIGNMENT_NOT_ACTIVE'});
    if(body.action==='complete') {
      if(a.kind==='r6' && !['ASSIGNED','IN_PROGRESS'].includes(String(a.status).toUpperCase())) return respond(res,409,{error:'GROUP_NOT_IN_PROGRESS'});
      const record=(await readStore()).trainers?.[user.id]?.[body.assignmentKey];
      const marks=cleanRecord(record?.marks,a.memberIds);
      const eligibility=eligibleToComplete(a.memberIds,marks);
      if(!eligibility.ready)return respond(res,409,{error:eligibility.reason,daysLeft:eligibility.daysLeft});
      // A real payout can be created only by the ORIGINAL protected completion handler.
      // We do not make direct earnings/finance writes or forge completion flags.
      return await delegateCompletion(req,res,a);
    }
    if(!['plan','unplan'].includes(body.action) || !validUuid(body.studentId) || !a.memberIds.includes(body.studentId))return respond(res,400,{error:'INVALID_STUDENT_OR_ACTION'});
    const result=await lockedWrite(async()=>{
      const store=await readStore();
      const trainer=store.trainers[user.id] ||= {};
      const record=trainer[body.assignmentKey] ||= {marks:{}};
      record.marks ||= {};
      // Idempotence: repeated marking never restarts the 21-day timer.
      if(body.action==='plan' && !record.marks[body.studentId]) record.marks[body.studentId]={plannedAt:new Date().toISOString()};
      if(body.action==='unplan') delete record.marks[body.studentId];
      await saveStore(store);
      const marks=cleanRecord(record.marks,a.memberIds);
      return {marks,eligibility:eligibleToComplete(a.memberIds,marks)};
    });
    return respond(res,200,{ok:true,...result,scope:'LOCAL_PREVIEW_FILE'});
  } catch(error) {
    const code=error.status && error.status>=400 && error.status<=499 ? error.status : 503;
    console.error('[FIXOKU_018A] Assignment follow-up request failed:', error?.code||error?.message);
    return respond(res,code,{error:code===503?'FOLLOWUP_SERVICE_UNAVAILABLE':(error.code||error.message||'REQUEST_FAILED')});
  } finally { await pool.end(); }
}
