import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
const json=(r,s,b)=>{r.statusCode=s;r.setHeader("Content-Type","application/json; charset=utf-8");r.setHeader("Cache-Control","no-store");r.end(JSON.stringify(b))};
const h=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
export default async function handler(req,res){
 const p=await resolvePrincipal(h(req)); if(!p)return json(res,401,{error:"UNAUTHENTICATED"}); const d=requirePermission(p,"user.manage"); if(d)return json(res,d.status,d.body); if(req.method!=="GET")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); try{
  const includeAssigned = new URL(req.url || "http://local", "http://local").searchParams.get("includeAssigned") === "true";
  const rows=(await pool.query(`select r.id,r.status,r.requested_at as "requestedAt",r.assigned_at as "assignedAt",u.display_name as "studentName",tp.title as "programTitle",a.trainer_user_id as "trainerUserId",tu.display_name as "trainerName" from trainer_assignment_requests r join enrollments e on e.id=r.enrollment_id join platform_users u on u.id=e.student_user_id join training_programs tp on tp.id=e.training_program_id left join trainer_assignments a on a.id=r.trainer_assignment_id left join platform_users tu on tu.id=a.trainer_user_id where r.status='PENDING' ${includeAssigned ? "or r.status='ASSIGNED'" : ""} order by (r.status='PENDING') desc,r.requested_at`)).rows;
  const metrics=(await pool.query("select (select count(*)::int from platform_memberships where role='TRAINER' and status='ACTIVE') as \"activeTrainers\",(select count(*)::int from student_profiles where status='ACTIVE') as \"activeStudents\",(select count(*)::int from trainer_assignment_requests where status='PENDING') as \"pendingAssignments\"")).rows[0];
  return json(res,200,{requests:rows,metrics});
 } finally { await pool.end() }
}
