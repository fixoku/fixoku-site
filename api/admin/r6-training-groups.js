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
      select 1
      from package_entitlements pe
      join package_components pc on pc.package_version_id=pe.package_version_id and pc.is_active=true
      join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id)
        and ($3::uuid is null or pp.id=$3) and pp.r6_product_type='TRAINING_SERVICE' and pp.service_mode='GROUP' and pp.service_type=$6
      where pe.package_version_id=$4
        and pe.beneficiary_student_user_id=$1
        and pe.status='ACTIVE' and pe.revoked_at is null
        and (pe.source_type='OWNER_MANUAL' or exists (select 1 from orders o where o.id=pe.source_order_id and o.status in ('PAID','PARTIALLY_REFUNDED')))
        and (
          ($2::uuid is not null and pe.beneficiary_child_profile_id=$2)
          or ($2::uuid is null and pe.beneficiary_child_profile_id is null
            and (pe.beneficiary_student_profile_id is null or pe.beneficiary_student_profile_id=$5))
        )
      limit 1
    `, [participant.studentUserId, participant.childProfileId || null, input.trainingProductId || null, input.packageVersionId, participant.studentProfileId || null, input.trainingType])).rows[0];
    if (!owned) throw Object.assign(new Error("R6_PARTICIPANT_ENTITLEMENT_REQUIRED"), { status: 409 });
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
      u.display_name as "studentName",
      u.email as "studentEmail",
      coalesce(c.education_stage,sp.education_stage) as "educationStage",
      coalesce(c.grade,sp.grade) as grade,
      sp.class_branch as "classBranch",
      sp.school,
      pe.package_version_id as "packageVersionId",
      pv.title as "packageTitle",
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
      g.required_qualification_id as "requiredQualificationId",g.trainer_user_id as "trainerUserId",
      g.education_stage as "educationStage",g.training_type as "trainingType",g.mode,
      g.min_students as "minStudents",g.max_students as "maxStudents",g.status,
      g.projected_payout_minor as "projectedPayoutMinor",g.completed_at as "completedAt",g.created_at as "createdAt",
      tu.display_name as "trainerName",qd.code as "requiredQualificationCode",qd.title as "requiredQualificationTitle",
      coalesce(json_agg(json_build_object('id',p.id,'studentUserId',p.student_user_id,'childProfileId',p.child_profile_id,'studentProfileId',p.student_profile_id,'enrollmentId',p.enrollment_id,'status',p.status,'billable',p.billable,'studentName',coalesce(su.display_name,concat_ws(' ',c.first_name,c.last_name)),'studentEmail',su.email,'guardianName',sp.guardian_name,'guardianEmail',sp.guardian_email,'grade',sp.grade,'classBranch',sp.class_branch) order by p.created_at) filter(where p.id is not null),'[]'::json) as participants,
      count(p.id) filter(where p.status='ACTIVE')::int as "activeParticipantCount",
      count(p.id) filter(where p.status='ACTIVE' and p.billable=true)::int as "billableParticipantCount"
    from r6_training_groups g
    left join platform_users tu on tu.id=g.trainer_user_id
    left join r6_qualification_definitions qd on qd.id=g.required_qualification_id
    left join r6_training_group_participants p on p.training_group_id=g.id
    left join platform_users su on su.id=p.student_user_id
    left join r6_student_child_profiles c on c.id=p.child_profile_id
    left join student_profiles sp on sp.id=p.student_profile_id
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
      const requestedTrainer = parsed.searchParams.get("trainerUserId") || null;
      if (manageDenied && requestedTrainer && String(requestedTrainer) !== String(principal.user.id)) return json(res, 403, { error: "R6_GROUP_SCOPE_DENIED" });
      return json(res, 200, { groups: await readGroups(client, { trainerUserId: manageDenied ? principal.user.id : requestedTrainer }), candidates: await readGroupAssignmentCandidatesV22(client) });
    }
    if (manageDenied) return json(res, manageDenied.status, manageDenied.body);
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
    const input = normalizeR6GroupInput(body);
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
    await assertParticipantTargets(client, input.participants);
    await assertParticipantEntitlements(client, input);
    const matrixRows = (await client.query("select training_type,student_count,amount_minor from r6_training_payout_matrix where training_type=$1", [input.trainingType])).rows;
    const billableCount = input.participants.length;
    const initialPayoutRow = matrixRows.find((candidate) =>
      String(candidate.training_type || candidate.trainingType).toUpperCase() === String(input.trainingType).toUpperCase() &&
      Number(candidate.student_count ?? candidate.studentCount) === billableCount
    );
    const projectedPayoutMinor = billableCount && initialPayoutRow
      ? calculateR6PayoutFromMatrix(matrixRows, input.trainingType, billableCount)
      : 0;
    const status = r6GroupStatus({ trainerUserId: input.trainerUserId, participantCount: input.participants.length, minStudents: input.minStudents });
    /* AUTO_GROUP_REUSE_V21 */
let group = null;
const automaticGroupAssignment =
  input.mode === "GROUP" &&
  Boolean(input.trainerUserId) &&
  Array.isArray(input.participants) &&
  input.participants.length === 1;

if (automaticGroupAssignment) {
  const participant = input.participants[0];

  const duplicate = (await client.query(
    `select rg.id
     from r6_training_group_participants rgp
     join r6_training_groups rg on rg.id=rgp.training_group_id
     where rgp.student_user_id=$1
       and (
         ($5::uuid is not null and rgp.child_profile_id=$5)
         or ($5::uuid is null and $6::uuid is not null and rgp.student_profile_id=$6)
       )
       and rgp.status='ACTIVE'
       and rg.mode='GROUP'
       and rg.education_stage=$2
       and rg.training_type=$3
       and rg.required_qualification_id=$4
       and rg.status in ('DRAFT','ASSIGNED','IN_PROGRESS')
     limit 1`,
    [participant.studentUserId, input.educationStage, input.trainingType, qualification.id, participant.childProfileId || null, participant.studentProfileId || null]
  )).rows[0];

  if (duplicate) {
    throw Object.assign(new Error("R6_PARTICIPANT_ALREADY_GROUPED"), { status: 409 });
  }

  group = (await client.query(
    `select g.*
     from r6_training_groups g
     where g.trainer_user_id=$1
       and g.required_qualification_id=$2
       and g.education_stage=$3
       and g.training_type=$4
       and g.mode='GROUP'
       and g.status in ('DRAFT','ASSIGNED','IN_PROGRESS')
       and (
         select count(*)::int
         from r6_training_group_participants p
         where p.training_group_id=g.id
           and p.status='ACTIVE'
       ) < g.max_students
     order by g.created_at asc, g.id asc
     limit 1
     for update skip locked`,
    [input.trainerUserId, qualification.id, input.educationStage, input.trainingType]
  )).rows[0] || null;
}

if (!group) {
  group = (await client.query(`insert into r6_training_groups(package_version_id,training_product_id,required_qualification_id,trainer_user_id,education_stage,training_type,mode,min_students,max_students,status,projected_payout_minor,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`, [input.packageVersionId || null, input.trainingProductId || null, qualification.id, input.trainerUserId || null, input.educationStage, input.trainingType, input.mode, input.minStudents, input.maxStudents, status, projectedPayoutMinor, principal.user.id])).rows[0];
}
    for (const participant of input.participants) {
      await client.query("insert into r6_training_group_participants(training_group_id,child_profile_id,student_profile_id,student_user_id,enrollment_id,status,billable) values($1,$2,$3,$4,$5,'ACTIVE',true)", [group.id, participant.childProfileId || null, participant.studentProfileId || null, participant.studentUserId, participant.enrollmentId || null]);
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
    const totalPayoutRow = matrixRows.find((candidate) =>
      String(candidate.training_type || candidate.trainingType).toUpperCase() === String(input.trainingType).toUpperCase() &&
      Number(candidate.student_count ?? candidate.studentCount) === totalParticipantCount
    );
    const totalProjectedPayoutMinor = totalParticipantCount && totalPayoutRow
      ? calculateR6PayoutFromMatrix(matrixRows, input.trainingType, totalParticipantCount)
      : 0;
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
    await client.query("commit");
    return json(res, 201, { group: { ...group, projectedPayoutMinor }, requiredQualification: qualification, status, projectedPayoutMinor });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original error */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "R6_GROUP_CONFLICT" : error.code || error.message || "R6_GROUP_UNAVAILABLE" });
  } finally { client.release(); await pool.end(); }
}

export { assertParticipantTargets, assertParticipantEntitlements, assertTrainerEligible, readGroups, requiredQualification };
