import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
const json=(r,s,b)=>{r.statusCode=s;r.setHeader("Content-Type","application/json; charset=utf-8");r.setHeader("Cache-Control","no-store");r.end(JSON.stringify(b))};
const h=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
export default async function handler(req,res){
 const p=await resolvePrincipal(h(req)); if(!p)return json(res,401,{error:"UNAUTHENTICATED"}); const d=requirePermission(p,"assignment.manage"); if(d)return json(res,d.status,d.body); if(req.method!=="GET")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); try{
  const includeAssigned = new URL(req.url || "http://local", "http://local").searchParams.get("includeAssigned") === "true";
  const rows=(await pool.query(`select r.id,r.status,r.requested_at as "requestedAt",r.assigned_at as "assignedAt",coalesce(nullif(concat_ws(' ',child.first_name,child.last_name),''),u.display_name) as "studentName",coalesce(child.grade,sp.grade) as grade,coalesce(child.class_branch,sp.class_branch) as "classBranch",coalesce(child.education_stage,sp.education_stage) as "educationStage",child.id as "childProfileId",sp.id as "studentProfileId",a.contact_status as "contactStatus",a.agreed_start_at as "agreedStartAt",a.planned_at as "plannedAt",catalog.title as "packageTitle",catalog.slug as "packageSlug",catalog.cover as "packageCover",tp.title as "programTitle",a.trainer_user_id as "trainerUserId",tu.display_name as "trainerName" from trainer_assignment_requests r join enrollments e on e.id=r.enrollment_id join platform_users u on u.id=e.student_user_id left join student_profiles sp on sp.user_id=e.student_user_id left join r6_student_child_profiles child on child.id=e.beneficiary_child_profile_id left join lateral (select pv.title,pk.slug,pk.icon_reference as cover from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id left join order_items oi on oi.id=pee.source_order_item_id join package_versions pv on pv.id=coalesce(oi.package_version_id,pe.package_version_id) join packages pk on pk.id=pv.package_id where pee.enrollment_id=e.id order by (pe.status='ACTIVE') desc,pe.effective_at desc,pe.id limit 1) catalog on true join training_programs tp on tp.id=e.training_program_id left join trainer_assignments a on a.id=r.trainer_assignment_id left join platform_users tu on tu.id=a.trainer_user_id where u.email_verified=true and exists (select 1 from platform_memberships sm where sm.user_id=e.student_user_id and sm.role='STUDENT' and sm.status='ACTIVE' and sm.scope_type='STUDENT' and sm.scope_id=e.student_user_id) and (   r.status='PENDING'   and exists (     select 1
    from package_entitlement_enrollments pee
    join package_entitlements pe on pe.id=pee.package_entitlement_id and pe.status='ACTIVE' and pe.revoked_at is null
    left join order_items oi on oi.id=pee.source_order_item_id
    left join package_entitlement_definitions ped
      on ped.package_version_id=coalesce(oi.package_version_id,pe.package_version_id)
     and ped.training_program_id=e.training_program_id
    where pee.enrollment_id=e.id
      and (
       exists (select 1 from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=coalesce(oi.package_version_id,pe.package_version_id) and pc.is_active=true and pc.component_type='TRAINER_SERVICE' and pp.r6_product_type='TRAINING_SERVICE' and pp.service_mode='INDIVIDUAL')
       or (ped.delivery_mode='TRAINER_LED' and not exists (select 1 from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=coalesce(oi.package_version_id,pe.package_version_id) and pc.is_active=true and pp.r6_product_type='TRAINING_SERVICE' and pp.service_mode='GROUP'))
      )
   ) ${includeAssigned ? "or r.status='ASSIGNED'" : ""} ) order by (r.status='PENDING') desc,r.requested_at`)).rows;
  const metrics=(await pool.query("select (select count(distinct user_id)::int from platform_memberships where role='TRAINER' and status='ACTIVE') as \"activeTrainers\",(select count(distinct sp.user_id)::int from student_profiles sp join platform_users u on u.id=sp.user_id where sp.status='ACTIVE' and u.email_verified=true and exists (select 1 from platform_memberships sm where sm.user_id=sp.user_id and sm.role='STUDENT' and sm.status='ACTIVE' and sm.scope_type='STUDENT' and sm.scope_id=sp.user_id)) as \"activeStudents\",(select count(*)::int from trainer_assignment_requests where status='PENDING') as \"pendingAssignments\"" )).rows[0];
  return json(res,200,{requests:rows,metrics});
 } finally { await pool.end() }
}
