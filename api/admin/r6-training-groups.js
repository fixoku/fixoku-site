import { queuePanelNotification } from "../../src/server/domain/panel-notifications.js";
import { getProfileMediaConfig, readProfilePhoto } from "../../src/server/domain/profile-media.js";
import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { calculateR6PayoutFromMatrix, isUuid, normalizeR6GroupInput, r6GroupStatus } from "../../src/server/domain/r6-training.js";
import { assertActiveTrainerExpertise, effectiveTrainerQualificationPredicate, TRAINER_BASE_QUALIFICATION_CODES } from "../../src/server/domain/trainer-expertise.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function requiredQualification(client, input) {
  const row = input.requiredQualificationId
    ? (await client.query("select id,code,service_type as \"serviceType\",education_stage as \"educationStage\" from r6_qualification_definitions where id=$1", [input.requiredQualificationId])).rows[0]
    : (await client.query("select id,code,service_type as \"serviceType\",education_stage as \"educationStage\" from r6_qualification_definitions where service_type=$1 and education_stage=$2 order by code limit 1", [input.trainingType, input.educationStage])).rows[0];
  if (!row) throw Object.assign(new Error("R6_QUALIFICATION_NOT_FOUND"), { status: 409 });
  if (row.serviceType !== input.trainingType || row.educationStage !== input.educationStage) throw Object.assign(new Error("R6_QUALIFICATION_MISMATCH"), { status: 400 });
  return row;
}

async function assertTrainerEligible(client, trainerUserId, qualificationId) {
  const trainer = (await client.query("select u.id,u.display_name as \"displayName\",u.email from platform_users u join platform_memberships m on m.user_id=u.id and m.role='TRAINER' and m.status='ACTIVE' where u.id=$1", [trainerUserId])).rows[0];
  if (!trainer) throw Object.assign(new Error("R6_TRAINER_NOT_FOUND"), { status: 404 });
  const active = (await client.query(`select count(distinct qualification_id)::int as count from r6_trainer_qualification_grants g where trainer_user_id=$1 and qualification_id in (select id from r6_qualification_definitions where code=any($2::text[])) and ${effectiveTrainerQualificationPredicate("g")}`, [trainerUserId, TRAINER_BASE_QUALIFICATION_CODES])).rows[0];
  await assertActiveTrainerExpertise(client, trainerUserId, qualificationId);
  return { trainer, seniorBadge: Number(active?.count || 0) === TRAINER_BASE_QUALIFICATION_CODES.length };
}

async function assertParticipantTargets(client, participants) {
  for (const participant of participants) {
    const student = (await client.query("select id from platform_users where id=$1", [participant.studentUserId])).rows[0];
    if (!student) throw Object.assign(new Error("R6_STUDENT_NOT_FOUND"), { status: 404 });
    if (participant.childProfileId) {
      const child = (await client.query("select id from r6_student_child_profiles where id=$1 and owner_user_id=$2 and status='ACTIVE'", [participant.childProfileId, participant.studentUserId])).rows[0];
      if (!child) throw Object.assign(new Error("R6_CHILD_PROFILE_SCOPE_DENIED"), { status: 403 });
    } else {
      const profile = (await client.query("select id from student_profiles where id=$1 and user_id=$2 and status='ACTIVE'", [participant.studentProfileId, participant.studentUserId])).rows[0];
      if (!profile) throw Object.assign(new Error("R6_STUDENT_PROFILE_SCOPE_DENIED"), { status: 403 });
    }
    if (participant.enrollmentId) {
      const enrollment = (await client.query(`
        select e.id
        from enrollments e
        where e.id=$1 and e.student_user_id=$2
          and (
            $3::uuid is null
            or exists (
              select 1
              from package_entitlement_enrollments pee
              join package_entitlements pe on pe.id=pee.package_entitlement_id
              where pee.enrollment_id=e.id
                and pe.beneficiary_child_profile_id=$3
                and ($4::uuid is null or pe.beneficiary_student_profile_id=$4)
                and pe.status='ACTIVE'
            )
          )
      `, [participant.enrollmentId, participant.studentUserId, participant.childProfileId || null, participant.studentProfileId || null])).rows[0];
      if (!enrollment) throw Object.assign(new Error("R6_ENROLLMENT_SCOPE_DENIED"), { status: 403 });
    }
  }
}

async function assertParticipantEntitlements(client, input) {
  if (input.mode !== "GROUP" || !input.participants.length) return;
  if (!input.packageVersionId) throw Object.assign(new Error("R6_PACKAGE_REQUIRED"), { status: 409 });
  for (const participant of input.participants) {
    const owned = (await client.query(`
      select e.id as enrollment_id, pe.id as entitlement_id
      from package_entitlements pe
      join package_entitlement_enrollments pee on pee.package_entitlement_id=pe.id
      join enrollments e on e.id=pee.enrollment_id and e.training_program_id=pee.training_program_id
      join package_entitlement_definitions ped on ped.package_version_id=pe.package_version_id and ped.training_program_id=e.training_program_id and ped.delivery_mode in ('TRAINER_LED','HYBRID')
      left join student_profiles sp
        on sp.id=$5::uuid
        and sp.user_id=pe.beneficiary_student_user_id
        and sp.status='ACTIVE'
      left join r6_student_child_profiles c
        on c.id=$2::uuid
        and c.owner_user_id=pe.beneficiary_student_user_id
        and c.status='ACTIVE'
      join package_components pc on pc.package_version_id=pe.package_version_id and pc.is_active=true
      join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id)
        and ($3::uuid is null or pp.id=$3) and pp.is_active=true and pp.r6_product_type='TRAINING_SERVICE' and pp.service_mode='GROUP'
      and pe.revoked_at is null
      and exists (select 1 from r6_product_stage_scopes r395s where r395s.physical_product_id=pp.id and r395s.education_stage=$7 and r395s.education_stage=coalesce(c.education_stage,sp.education_stage)) and pp.service_type=$6
      where pe.package_version_id=$4
        and pe.beneficiary_student_user_id=$1
        and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now())
        and (pe.source_type='OWNER_MANUAL' or exists (select 1 from orders o where o.id=pe.source_order_id and o.status in ('PAID','PARTIALLY_REFUNDED')))
        and (
          ($2::uuid is not null and pe.beneficiary_child_profile_id=$2)
          or ($2::uuid is null and pe.beneficiary_child_profile_id is null
            and (pe.beneficiary_student_profile_id is null or pe.beneficiary_student_profile_id=$5))
        )
        and e.student_user_id=$1 and e.beneficiary_child_profile_id is not distinct from $2::uuid
        and e.status='ACTIVE'
        and not exists (select 1 from package_components pc2 join physical_products pp2 on pp2.id=coalesce(pc2.physical_product_id,pc2.reference_id) where pc2.package_version_id=pe.package_version_id and pc2.is_active=true and pp2.r6_product_type='TRAINING_SERVICE' and pp2.service_type is distinct from pp.service_type)
        and pee.source_order_item_id is not distinct from pe.source_order_item_id
        and not exists (select 1 from package_entitlement_enrollments other where other.enrollment_id=e.id and other.id<>pee.id)
        and not exists (select 1 from trainer_assignments ta where ta.enrollment_id=e.id and ta.status='ACTIVE')
      for update of e,pe,pee
    `, [participant.studentUserId, participant.childProfileId || null, input.trainingProductId || null, input.packageVersionId, participant.studentProfileId || null, input.trainingType, input.educationStage])).rows;
    const unique = [...new Map(owned.map(row => [row.enrollment_id, row])).values()];
    if (!unique.length) throw Object.assign(new Error("R399_ENROLLMENT_LINK_REQUIRED"), { status: 409 });
    if (unique.length !== 1) throw Object.assign(new Error("R399_ENROLLMENT_LINK_AMBIGUOUS"), { status: 409 });
    if (participant.enrollmentId && participant.enrollmentId !== unique[0].enrollment_id) throw Object.assign(new Error("R6_ENROLLMENT_SCOPE_DENIED"), { status: 403 });
    participant.enrollmentId = unique[0].enrollment_id;
  }
}

async function readGroupAssignmentCandidatesV22(client) {
  return (await client.query(`
    select distinct on (
      pe.beneficiary_student_user_id,
      pe.package_version_id,
      pp.id,
      pe.beneficiary_child_profile_id
    )
      u.id as "studentUserId",
      coalesce(c.legacy_student_profile_id,sp.id) as "studentProfileId",
      pe.beneficiary_child_profile_id as "childProfileId",
      case when c.id is not null then concat_ws(' ',c.first_name,c.last_name) else u.display_name end as "studentName",
      u.email as "studentEmail",
      case when c.id is not null then c.education_stage else sp.education_stage end as "educationStage",
      case when c.id is not null then c.grade else sp.grade end as grade,
      case when c.id is not null then c.class_branch else sp.class_branch end as "classBranch",
      case when c.id is not null then c.school else sp.school end as school,
      pe.package_version_id as "packageVersionId",
      pv.title as "packageTitle",
      (select pk.icon_reference from packages pk where pk.id=pv.package_id) as "packageCover",
      pp.id as "trainingProductId",
      pp.title as "trainingTitle",
      pp.service_type as "trainingType",
      pp.service_mode as "serviceMode",
      coalesce(pp.min_students,1)::int as "configuredMinStudents",
      coalesce(pp.max_students,5)::int as "maxStudents",
      qd.id as "requiredQualificationId",
      qd.code as "requiredQualificationCode",
      qd.title as "requiredQualificationTitle"
    from package_entitlements pe
    join platform_users u
      on u.id=pe.beneficiary_student_user_id
    left join student_profiles sp
      on sp.user_id=u.id
    left join r6_student_child_profiles c
      on c.id=pe.beneficiary_child_profile_id
     and c.status='ACTIVE'
    join package_versions pv
      on pv.id=pe.package_version_id
    join package_components pc
      on pc.package_version_id=pe.package_version_id
     and pc.is_active=true
    join physical_products pp
      on pp.id=coalesce(pc.physical_product_id,pc.reference_id)
     and pp.is_active=true
    join lateral (
      select q.id,q.code,q.title
      from r6_qualification_definitions q
      where q.service_type=pp.service_type
        and q.education_stage=coalesce(c.education_stage,sp.education_stage)
      order by q.code
      limit 1
    ) qd on true
    where pe.status='ACTIVE'
      and pe.revoked_at is null and pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now())
      and (pe.beneficiary_child_profile_id is null or c.id is not null)
      and (pe.source_type='OWNER_MANUAL' or exists (select 1 from orders o where o.id=pe.source_order_id and o.status in ('PAID','PARTIALLY_REFUNDED')))
      and pp.r6_product_type='TRAINING_SERVICE'
      and pp.service_mode='GROUP'
      and not exists (
        select 1
        from r6_training_group_participants rgp
        join r6_training_groups rg
          on rg.id=rgp.training_group_id
        where rgp.student_user_id=u.id
          and rgp.status='ACTIVE'
          and rg.mode='GROUP'
          and rg.education_stage=coalesce(c.education_stage,sp.education_stage)
          and rg.training_type=pp.service_type
          and rg.required_qualification_id=qd.id
          and rg.status in ('DRAFT','ASSIGNED','IN_PROGRESS')
          and (
            (pe.beneficiary_child_profile_id is not null and rgp.child_profile_id=pe.beneficiary_child_profile_id)
            or (pe.beneficiary_child_profile_id is null and rgp.child_profile_id is null and rgp.student_profile_id=coalesce(pe.beneficiary_student_profile_id,sp.id))
          )
      )
    order by
      pe.beneficiary_student_user_id,
      pe.package_version_id,
      pp.id,
      pe.beneficiary_child_profile_id,
      pe.effective_at desc
  `)).rows;
}
async function readGroups(client, { trainerUserId = null } = {}) {
  const rows = (await client.query(`
    select g.id,g.package_version_id as "packageVersionId",g.training_product_id as "trainingProductId",
      (select pk.icon_reference from package_versions v join packages pk on pk.id=v.package_id where v.id=g.package_version_id) as "packageCover",
      (select v.title from package_versions v where v.id=g.package_version_id) as "packageTitle",
      g.required_qualification_id as "requiredQualificationId",g.trainer_user_id as "trainerUserId",
      g.education_stage as "educationStage",g.training_type as "trainingType",g.mode,
      g.min_students as "minStudents",g.max_students as "maxStudents",g.status,
      g.class_number as "classNumber",g.scheduled_start_at as "scheduledStartAt",g.schedule_updated_at as "scheduleUpdatedAt",
      g.projected_payout_minor as "projectedPayoutMinor",g.completed_at as "completedAt",g.created_at as "createdAt",
      tu.display_name as "trainerName",qd.code as "requiredQualificationCode",qd.title as "requiredQualificationTitle",
      coalesce(json_agg(json_build_object('id',p.id,'studentUserId',p.student_user_id,'childProfileId',p.child_profile_id,'studentProfileId',p.student_profile_id,'enrollmentId',p.enrollment_id,'status',p.status,'billable',p.billable,'contactStatus',p.contact_status,'agreedStartAt',p.agreed_start_at,'contactUpdatedAt',p.contact_updated_at,'joinedAt',p.created_at,'removedAt',p.removed_at,'studentName',coalesce(nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),su.display_name),'studentEmail',su.email,'guardianName',sp.guardian_name,'guardianEmail',sp.guardian_email,'grade',case when c.id is not null then c.grade else sp.grade end,'classBranch',case when c.id is not null then c.class_branch else sp.class_branch end,'educationStage',case when c.id is not null then c.education_stage else sp.education_stage end,'school',case when c.id is not null then c.school else sp.school end) order by p.created_at) filter(where p.id is not null),'[]'::json) as participants,
      count(p.id) filter(where p.status='ACTIVE')::int as "activeParticipantCount",
      count(p.id) filter(where p.status='ACTIVE' and p.billable=true)::int as "billableParticipantCount"
    from r6_training_groups g
    left join platform_users tu on tu.id=g.trainer_user_id
    left join r6_qualification_definitions qd on qd.id=g.required_qualification_id
    left join r6_training_group_participants p on p.training_group_id=g.id
    left join platform_users su on su.id=p.student_user_id
    left join r6_student_child_profiles c on c.id=p.child_profile_id and c.owner_user_id=p.student_user_id
    left join student_profiles sp on sp.id=p.student_profile_id and sp.user_id=p.student_user_id
    where ($1::uuid is null or g.trainer_user_id=$1)
    group by g.id,tu.display_name,qd.code,qd.title
    order by g.created_at desc,g.id
  `, [trainerUserId])).rows;
  return rows.map((row) => ({ ...row, projectedPayoutMinor: Number(row.projectedPayoutMinor || 0), activeParticipantCount: Number(row.activeParticipantCount || 0), billableParticipantCount: Number(row.billableParticipantCount || 0) }));
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const manageDenied = requirePermission(principal, "training_group.manage");
  const trainerReadAllowed = !requirePermission(principal, "training_group.read", { role: "TRAINER" });
  if (manageDenied && !trainerReadAllowed) return json(res, manageDenied.status, manageDenied.body);
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const parsed = new URL(req.url || "http://local", "http://local");
      if (parsed.searchParams.has("studentChildPhoto") || parsed.searchParams.has("studentProfilePhoto")) {
        if (manageDenied) return json(res, manageDenied.status, manageDenied.body);
        if (!principal.memberships?.some(m=>m.role==="OWNER" && m.status==="ACTIVE" && m.scopeType==="GLOBAL" && m.scopeId==null && String(m.userId)===String(principal.user.id))) return json(res,403,{error:"OWNER_ONLY"});
        const child=parsed.searchParams.has("studentChildPhoto");
        if (child && parsed.searchParams.has("studentProfilePhoto")) return json(res,400,{error:"INVALID_PHOTO_TARGET"});
        const id=parsed.searchParams.get(child?"studentChildPhoto":"studentProfilePhoto");
        if (!isUuid(id)) return json(res,400,{error:"INVALID_STUDENT_ID"});
        // A child can only inherit the explicitly linked legacy profile, never an account-wide or sibling photo.
        const query=child ? `select coalesce(nullif(c.photo_storage_key,''),nullif(s.photo_storage_key,'')) as key
          from r6_student_child_profiles c left join student_profiles s on s.id=c.legacy_student_profile_id and s.user_id=c.owner_user_id
          where c.id=$1 and c.status='ACTIVE'` : `select nullif(s.photo_storage_key,'') as key from student_profiles s where s.id=$1 and s.status='ACTIVE'`;
        const row=(await client.query(query,[id])).rows[0];
        if (!row?.key) return json(res,404,{error:"PHOTO_NOT_FOUND"});
        const media=await readProfilePhoto(getProfileMediaConfig(),row.key);
        if (!media || !["image/jpeg","image/png","image/webp","image/gif"].includes(media.mime)) return json(res,404,{error:"PHOTO_NOT_FOUND"});
        res.statusCode=200;res.setHeader("Content-Type",media.mime);res.setHeader("Cache-Control","private, no-store");res.setHeader("X-Content-Type-Options","nosniff");res.end(media.buffer);return;
      }
      if (parsed.searchParams.has("trainerPhoto")) {
        if (manageDenied) return json(res, manageDenied.status, manageDenied.body);
        if (!principal.memberships?.some(m=>m.role==="OWNER" && m.status==="ACTIVE" && m.scopeType==="GLOBAL" && m.scopeId==null && String(m.userId)===String(principal.user.id))) return json(res,403,{error:"OWNER_ONLY"});
        const id=parsed.searchParams.get("trainerPhoto");
        if (!isUuid(id)) return json(res,400,{error:"INVALID_TRAINER_ID"});
        const row=(await client.query(`select tp.photo_storage_key as key from trainer_profiles tp where tp.user_id=$1 and exists(select 1 from platform_memberships m where m.user_id=tp.user_id and m.role='TRAINER' and m.status='ACTIVE' and m.scope_type='TRAINER' and m.scope_id=m.user_id)`,[id])).rows[0];
        if (!row?.key) return json(res,404,{error:"PHOTO_NOT_FOUND"});
        const media=await readProfilePhoto(getProfileMediaConfig(),row.key);
        if (!media || !["image/jpeg","image/png","image/webp","image/gif"].includes(media.mime)) return json(res,404,{error:"PHOTO_NOT_FOUND"});
        res.statusCode=200;res.setHeader("Content-Type",media.mime);res.setHeader("Cache-Control","private, no-store");res.setHeader("X-Content-Type-Options","nosniff");res.end(media.buffer);return;
      }
      const requestedTrainer = parsed.searchParams.get("trainerUserId") || null;
      if (manageDenied && requestedTrainer && String(requestedTrainer) !== String(principal.user.id)) return json(res, 403, { error: "R6_GROUP_SCOPE_DENIED" });
      return json(res, 200, { groups: await readGroups(client, { trainerUserId: manageDenied ? principal.user.id : requestedTrainer }), candidates: manageDenied ? [] : await readGroupAssignmentCandidatesV22(client) });
    }
    if (manageDenied) return json(res, manageDenied.status, manageDenied.body);
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
    if(!(principal.memberships?.some(m=>m.role==="OWNER" && m.status==="ACTIVE" && m.scopeType==="GLOBAL" && m.scopeId==null && String(m.userId)===String(principal.user.id)))) return json(res,403,{error:"OWNER_ONLY"});
    const input = normalizeR6GroupInput(body);
    if(input.participants.some(p=>!Number.isInteger(p.compensationMinor)||p.compensationMinor<=0||p.compensationMinor>2147483647)) return json(res,400,{error:"COMPENSATION_AMOUNT_REQUIRED"});
    if (input.trainerUserId && !isUuid(input.trainerUserId)) return json(res, 400, { error: "R6_TRAINER_ID_INVALID" });
    if (input.packageVersionId && !isUuid(input.packageVersionId)) return json(res, 400, { error: "R6_PACKAGE_ID_INVALID" });
    if (input.trainingProductId && !isUuid(input.trainingProductId)) return json(res, 400, { error: "R6_TRAINING_PRODUCT_ID_INVALID" });
    for (const participant of input.participants) {
      if (!isUuid(participant.studentUserId) || (participant.childProfileId && !isUuid(participant.childProfileId)) || (participant.studentProfileId && !isUuid(participant.studentProfileId)) || (participant.enrollmentId && !isUuid(participant.enrollmentId))) return json(res, 400, { error: "R6_PARTICIPANT_ID_INVALID" });
    }

    await client.query("begin");
    const qualification = await requiredQualification(client, input);
    if (input.trainingProductId) {
      const product = (await client.query(`select pp.id,pp.service_type as "serviceType",pp.service_mode as "serviceMode",exists(select 1 from r6_product_stage_scopes s where s.physical_product_id=pp.id and s.education_stage=$2) as "stageMatch" from physical_products pp where pp.id=$1 and pp.r6_product_type='TRAINING_SERVICE' and pp.is_active=true`, [input.trainingProductId, input.educationStage])).rows[0];
      if (!product || product.serviceType !== input.trainingType || product.serviceMode !== input.mode || !product.stageMatch) throw Object.assign(new Error("R6_TRAINING_PRODUCT_MISMATCH"), { status: 400 });
    }
    if (input.trainerUserId) await assertTrainerEligible(client, input.trainerUserId, qualification.id);
    if (input.mode === "GROUP") await client.query("select pg_advisory_xact_lock(hashtext('fixoku-r399-class-write'))");
    await assertParticipantTargets(client, input.participants);
    await assertParticipantEntitlements(client, input);
    if (input.mode === "GROUP" && new Set(input.participants.map(p=>p.enrollmentId)).size !== input.participants.length) throw Object.assign(new Error("R399_DUPLICATE_ENROLLMENT"), {status:409});
    const billableCount=input.participants.length;
    const projectedPayoutMinor=input.participants.reduce((sum,p)=>sum+p.compensationMinor,0);
    if(projectedPayoutMinor>2147483647) throw Object.assign(new Error('COMPENSATION_TOTAL_INVALID'),{status:400});
    const status = r6GroupStatus({ trainerUserId: input.trainerUserId, participantCount: input.participants.length, minStudents: input.minStudents });
    let group = null;
    if (input.mode === "GROUP") {
      if (input.participants.length < 1 || input.participants.length > 5 || input.participants.length > input.maxStudents) throw Object.assign(new Error("R399_CLASS_CAPACITY"), {status:409});
      for (const p of input.participants) {
        const duplicate = (await client.query(`select g.id from r6_training_group_participants x join r6_training_groups g on g.id=x.training_group_id
          where x.student_user_id=$1 and x.status='ACTIVE' and g.mode='GROUP' and g.education_stage=$2 and g.training_type=$3
          and g.status in ('DRAFT','ASSIGNED','IN_PROGRESS') and ( ($4::uuid is not null and (x.child_profile_id=$4 or (x.child_profile_id is null and x.student_profile_id=(select legacy_student_profile_id from r6_student_child_profiles where id=$4)))) or ($4::uuid is null and (x.student_profile_id=$5 or x.child_profile_id in (select id from r6_student_child_profiles where legacy_student_profile_id=$5)))) limit 1`, [p.studentUserId,input.educationStage,input.trainingType,p.childProfileId||null,p.studentProfileId||null])).rows[0];
        if (duplicate) throw Object.assign(new Error("R6_PARTICIPANT_ALREADY_GROUPED"),{status:409});
      }
      const requestedClass = body.existingClassId || null;
      if (requestedClass && !isUuid(requestedClass)) throw Object.assign(new Error("R399_CLASS_ID_INVALID"),{status:400});
      if (requestedClass || input.trainerUserId) {
        const open = (await client.query(`select g.*, (select count(*)::int from r6_training_group_participants p where p.training_group_id=g.id and p.status='ACTIVE') as occupied
          from r6_training_groups g where g.mode='GROUP' and g.education_stage=$1 and g.training_type=$2
          and g.status in ('DRAFT','ASSIGNED') and (g.scheduled_start_at is null or g.scheduled_start_at>clock_timestamp())
          and ($3::uuid is null or g.id=$3) and g.trainer_user_id is not distinct from $4::uuid
          and (select count(*) from r6_training_group_participants p where p.training_group_id=g.id and p.status='ACTIVE')<g.max_students
          order by g.created_at,g.id for update of g`,[input.educationStage,input.trainingType,requestedClass,input.trainerUserId||null])).rows;
        if (requestedClass && !open.length) throw Object.assign(new Error("R399_CLASS_NOT_OPEN"),{status:409});
        if (open.length) {
          group = open.find(g=>String(g.required_qualification_id)===String(qualification.id) && String(g.training_product_id||'')===String(input.trainingProductId||'') && (String(g.package_version_id||'')===String(input.packageVersionId||'') || Boolean(input.trainingProductId)) && Number(g.occupied)+input.participants.length<=Number(g.max_students)) || null;
          if (!group) throw Object.assign(new Error("R399_EXISTING_OPEN_CLASS_REQUIRED"),{status:409});
        }
      }
    }
    const existingClass = Boolean(group);
    const addedParticipantIds = [];
    if (!group) {
      const number = input.mode === "GROUP" && input.trainerUserId ? (await client.query("select coalesce(max(class_number),0)+1 as n from r6_training_groups where trainer_user_id=$1",[input.trainerUserId])).rows[0].n : null;
      group = (await client.query(`insert into r6_training_groups(package_version_id,training_product_id,required_qualification_id,trainer_user_id,education_stage,training_type,mode,min_students,max_students,status,projected_payout_minor,created_by,class_number) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`, [input.packageVersionId || null, input.trainingProductId || null, qualification.id, input.trainerUserId || null, input.educationStage, input.trainingType, input.mode, input.minStudents, input.maxStudents, status, projectedPayoutMinor, principal.user.id,number])).rows[0];
    }
    // A class may contain students from different packages, but the incoming
    // package is validated above and each enrollment retains its own order link.
    if (input.mode === "GROUP" && group.package_version_id !== input.packageVersionId) {
      if (!input.trainingProductId || !group.training_product_id) throw Object.assign(new Error("R399_CLASS_PRODUCT_REQUIRED"), {status:409});
      const unsafe = (await client.query(`select p.id from r6_training_group_participants p
        where p.training_group_id=$1 and p.status='ACTIVE' and (
          p.enrollment_id is null or
          (select count(*) from package_entitlement_enrollments l where l.enrollment_id=p.enrollment_id)<>1 or
          not exists (select 1 from package_entitlement_enrollments l
            join package_entitlements pe on pe.id=l.package_entitlement_id
            join enrollments e on e.id=l.enrollment_id and e.training_program_id=l.training_program_id
            where l.enrollment_id=p.enrollment_id and e.student_user_id=p.student_user_id
              and e.beneficiary_child_profile_id is not distinct from p.child_profile_id
              and pe.beneficiary_student_user_id=p.student_user_id
              and pe.beneficiary_child_profile_id is not distinct from p.child_profile_id
              and (p.child_profile_id is not null or pe.beneficiary_student_profile_id is null or pe.beneficiary_student_profile_id=p.student_profile_id)
              and l.source_order_item_id is not distinct from pe.source_order_item_id
              and pe.status='ACTIVE' and pe.revoked_at is null and pe.effective_at<=now()
              and (pe.expires_at is null or pe.expires_at>now())
              and e.status='ACTIVE')
        ) limit 1`, [group.id])).rows[0];
      if (unsafe) throw Object.assign(new Error("R399_CLASS_LEGACY_LINK_REQUIRED"), {status:409});
    }
    for (const participant of input.participants) {
      const added = (await client.query("insert into r6_training_group_participants(training_group_id,child_profile_id,student_profile_id,student_user_id,enrollment_id,status,billable,compensation_minor) values($1,$2,$3,$4,$5,'ACTIVE',true,$6) returning id", [group.id, participant.childProfileId || null, participant.studentProfileId || null, participant.studentUserId, participant.enrollmentId || null,participant.compensationMinor])).rows[0];
      addedParticipantIds.push(added.id);
    }
    const refreshedGroupState = (await client.query(
      `select
         g.min_students as "minStudents",
         g.max_students as "maxStudents",
         count(p.id) filter(where p.status='ACTIVE')::int as "activeParticipantCount"
       from r6_training_groups g
       left join r6_training_group_participants p on p.training_group_id=g.id
       where g.id=$1
       group by g.id`,
      [group.id],
    )).rows[0];

    const totalParticipantCount = Number(refreshedGroupState?.activeParticipantCount || 0);
    if (totalParticipantCount > Number(refreshedGroupState.maxStudents)) throw Object.assign(new Error("R399_CLASS_CAPACITY"),{status:409});
    const total=(await client.query("select sum(compensation_minor)::bigint as amount,count(*) filter(where compensation_minor is null)::int as missing from r6_training_group_participants where training_group_id=$1 and status='ACTIVE' and billable=true",[group.id])).rows[0];
    if(total.missing) throw Object.assign(new Error('GROUP_COMPENSATION_MISSING'),{status:409});
    const totalProjectedPayoutMinor=Number(total.amount||0);
    if(totalProjectedPayoutMinor>2147483647) throw Object.assign(new Error('COMPENSATION_TOTAL_INVALID'),{status:400});
    const totalStatus = r6GroupStatus({
      trainerUserId: input.trainerUserId,
      participantCount: totalParticipantCount,
      minStudents: Number(refreshedGroupState?.minStudents || input.minStudents || 1),
    });

    group = (await client.query(
      "update r6_training_groups set status=$1,projected_payout_minor=$2,updated_at=now() where id=$3 returning *",
      [totalStatus, totalProjectedPayoutMinor, group.id],
    )).rows[0];
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.training_group.created','r6_training_group',$2,'SUCCESS',$3,$4)", [principal.user.id, group.id, crypto.randomUUID(), JSON.stringify({ status, trainingType: input.trainingType, mode: input.mode, participantCount: billableCount, projectedPayoutMinor })]);
    if (group.mode === "GROUP" && group.trainer_user_id) {
      if (!existingClass) await queueR399ClassTrainerNotice(client,group,"R399_CLASS_ASSIGNED");
      else for (const participantId of addedParticipantIds) await queueR399ClassTrainerNotice(client,group,"R399_CLASS_STUDENT_ADDED",participantId);
      for (const participantId of addedParticipantIds) {
        await queueR399ClassLearnerNotice(client,group,"R399_CLASS_LEARNER_ASSIGNED",participantId);
        if (group.scheduled_start_at) await queueR399ClassLearnerNotice(client,group,"R399_CLASS_LEARNER_SCHEDULED",participantId);
      }
    }
    await client.query("commit");
    return json(res, 201, { group: { ...group, projectedPayoutMinor: totalProjectedPayoutMinor }, requiredQualification: qualification, status: totalStatus, projectedPayoutMinor: totalProjectedPayoutMinor });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original error */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "R6_GROUP_CONFLICT" : error.code || error.message || "R6_GROUP_UNAVAILABLE" });
  } finally { client.release(); await pool.end(); }
}

// R399IG1: transactional, deduplicated trainer notifications; no direct SMTP.
export async function queueR399ClassTrainerNotice(client, group, eventType, participantId = null) {
  if (group.mode !== "GROUP" || !group.trainer_user_id) return false;
  const titles = {
    R399_CLASS_ASSIGNED: ["Yeni sınıf ataması", "Yeni sınıfınız panelinizde hazır."],
    R399_CLASS_STUDENT_ADDED: ["Sınıfınıza yeni öğrenci eklendi", "Güncel öğrenci listenizi panelinizden inceleyebilirsiniz."],
    R399_CLASS_STUDENT_REMOVED: ["Sınıf öğrenci listesi güncellendi", "Sınıfınızdan bir öğrenci çıkarıldı. Güncel liste panelinizde."]
  };
  const message = titles[eventType];
  if (!message || (eventType !== "R399_CLASS_ASSIGNED" && !participantId)) throw new Error("R399_NOTICE_INVALID");
  const trainer = (await client.query(`select u.id,u.email,u.email_verified,u.display_name from platform_users u
    where u.id=$1 and exists(select 1 from platform_memberships m where m.user_id=u.id and m.role='TRAINER' and m.status='ACTIVE' and m.scope_type='TRAINER' and m.scope_id=u.id)`, [group.trainer_user_id])).rows[0];
  if (!trainer) return false;
  const email = trainer.email_verified && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trainer.email || "") ? trainer.email : null;
  return queuePanelNotification(client, {recipientUserId:trainer.id,recipientEmail:email,eventType,title:message[0],body:message[1],
    metadata:{path:"/panel/egitmen/atamalarim",reference:group.id,recipientName:trainer.display_name,classId:group.id,classNumber:group.class_number,participantId},
    dedupeKey:`r399-class:${eventType}:${group.id}:${trainer.id}:${participantId || "assignment"}`});
}

export { assertParticipantTargets, assertParticipantEntitlements, assertTrainerEligible, readGroups, requiredQualification };

// R399IG2A: notify the exact participant's account, never a sibling profile.
export async function queueR399ClassLearnerNotice(client, group, eventType, participantId = null) {
  if (group.mode !== "GROUP" || (!group.trainer_user_id && eventType !== "R399_LEARNER_REMOVED")) return 0;
  const messages = {
    R399_LEARNER_REMOVED: ["Eğitim atamanız güncellendi", "Sınıf atamanız kaldırıldı. Eğitim hakkınızın güncel durumunu panelinizden inceleyebilirsiniz."],
    R399_CLASS_LEARNER_ASSIGNED: ["Eğitmeniniz atandı", "Eğitmen atamanızı güvenli panelinizden inceleyebilirsiniz."],
    R399_CLASS_LEARNER_SCHEDULED: ["Eğitim başlangıç tarihi belirlendi", "Eğitim başlangıç tarihiniz belirlendi."],
    R399_CLASS_LEARNER_RESCHEDULED: ["Eğitim başlangıç tarihi güncellendi", "Eğitim başlangıç tarihiniz güncellendi."]
  };
  const message = messages[eventType];
  if (!message) throw new Error("R399_LEARNER_NOTICE_INVALID");
  const scheduled = ["R399_CLASS_LEARNER_SCHEDULED","R399_CLASS_LEARNER_RESCHEDULED"].includes(eventType);
  const date = scheduled ? new Date(group.scheduled_start_at) : null;
  if (scheduled && (!group.scheduled_start_at || !Number.isFinite(date.getTime()))) throw new Error("R399_NOTICE_DATE_INVALID");
  const sessionDate = date ? new Intl.DateTimeFormat("tr-TR", {timeZone:"Europe/Istanbul",dateStyle:"long",timeStyle:"short"}).format(date) : null;
  const revision = scheduled ? new Date(group.schedule_updated_at).toISOString() : String(group.trainer_user_id);
  const rows = (await client.query(`select p.id,u.id as user_id,u.email,u.email_verified,u.display_name,
    case when p.child_profile_id is not null then cp.date_of_birth else sp.date_of_birth end as birth_date,
    case when p.child_profile_id is not null then cp.education_stage else sp.education_stage end as stage,
    sp.guardian_name,sp.guardian_phone,sp.guardian_email,sp.guardian_relation,
    (p.child_profile_id is not null and sp.id is null) as independent_child
    from r6_training_group_participants p join platform_users u on u.id=p.student_user_id
    left join r6_student_child_profiles cp on cp.id=p.child_profile_id and cp.owner_user_id=u.id and cp.status='ACTIVE'
    left join student_profiles sp on sp.user_id=u.id and sp.status='ACTIVE' and
      (case when p.child_profile_id is not null then sp.id=cp.legacy_student_profile_id
            when p.student_profile_id is not null then sp.id=p.student_profile_id else true end)
    where p.training_group_id=$1 and p.status='ACTIVE' and ($2::uuid is null or p.id=$2)
    and (p.child_profile_id is null or cp.id is not null)
    and (p.child_profile_id is not null or sp.id is not null)`,[group.id,participantId])).rows;
  const clean = v => typeof v === "string" ? v.trim() : "";
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const cutoff = new Date(); cutoff.setUTCFullYear(cutoff.getUTCFullYear()-18);
  for (const row of rows) {
    const birth = row.birth_date ? new Date(row.birth_date) : null;
    const adult = birth && Number.isFinite(birth.getTime()) ? birth<=cutoff : row.stage==="ADULT";
    const guardian = !adult && [row.guardian_name,row.guardian_phone,row.guardian_email,row.guardian_relation].some(v=>clean(v));
    // Independent child belongs to this account; use its verified account email.
    // A partially populated guardian record never falls back to student email.
    const candidate = guardian ? clean(row.guardian_email) : row.email_verified ? clean(row.email) : "";
    const email = validEmail(candidate) ? candidate.toLowerCase() : null;
    const body = sessionDate ? `${message[1]} Türkiye saati: ${sessionDate}.` : message[1];
    await queuePanelNotification(client,{recipientUserId:row.user_id,recipientEmail:email,eventType,title:message[0],body,
      metadata:{path:"/giris",reference:group.id,recipientName:guardian?clean(row.guardian_name):row.display_name,sessionDate,participantId:row.id},
      dedupeKey:`r399-learner:${eventType}:${group.id}:${row.id}:${revision}`});
  }
  return rows.length;
}
