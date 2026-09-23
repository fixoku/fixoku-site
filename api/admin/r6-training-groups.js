import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { calculateR6PayoutFromMatrix, isUuid, normalizeR6GroupInput, r6GroupStatus } from "../../src/server/domain/r6-training.js";
import { assertActiveTrainerExpertise } from "../../src/server/domain/trainer-expertise.js";

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
  const active = (await client.query("select count(distinct qualification_id)::int as count from r6_trainer_qualification_grants where trainer_user_id=$1 and status='ACTIVE' and (valid_until is null or valid_until>now())", [trainerUserId])).rows[0];
  await assertActiveTrainerExpertise(client, trainerUserId, qualificationId);
  return { trainer, seniorBadge: Number(active?.count || 0) >= 6 };
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
      const enrollment = (await client.query("select id from enrollments where id=$1 and student_user_id=$2", [participant.enrollmentId, participant.studentUserId])).rows[0];
      if (!enrollment) throw Object.assign(new Error("R6_ENROLLMENT_SCOPE_DENIED"), { status: 403 });
    }
  }
}

async function readGroups(client, { trainerUserId = null } = {}) {
  const rows = (await client.query(`
    select g.id,g.package_version_id as "packageVersionId",g.training_product_id as "trainingProductId",
      g.required_qualification_id as "requiredQualificationId",g.trainer_user_id as "trainerUserId",
      g.education_stage as "educationStage",g.training_type as "trainingType",g.mode,
      g.min_students as "minStudents",g.max_students as "maxStudents",g.status,
      g.projected_payout_minor as "projectedPayoutMinor",g.completed_at as "completedAt",g.created_at as "createdAt",
      tu.display_name as "trainerName",qd.code as "requiredQualificationCode",qd.title as "requiredQualificationTitle",
      coalesce(json_agg(json_build_object('id',p.id,'studentUserId',p.student_user_id,'childProfileId',p.child_profile_id,'studentProfileId',p.student_profile_id,'enrollmentId',p.enrollment_id,'status',p.status,'billable',p.billable,'studentName',coalesce(su.display_name,concat_ws(' ',c.first_name,c.last_name)),'studentEmail',su.email,'guardianName',sp.guardian_name,'guardianEmail',sp.guardian_email) order by p.created_at) filter(where p.id is not null),'[]'::json) as participants,
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
      return json(res, 200, { groups: await readGroups(client, { trainerUserId: manageDenied ? principal.user.id : requestedTrainer }) });
    }
    if (manageDenied) return json(res, manageDenied.status, manageDenied.body);
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
    const input = normalizeR6GroupInput(body);
    if (input.trainerUserId && !isUuid(input.trainerUserId)) return json(res, 400, { error: "R6_TRAINER_ID_INVALID" });
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
    const matrixRows = (await client.query("select training_type,student_count,amount_minor from r6_training_payout_matrix where training_type=$1", [input.trainingType])).rows;
    const billableCount = input.participants.length;
    const projectedPayoutMinor = billableCount ? calculateR6PayoutFromMatrix(matrixRows, input.trainingType, billableCount) : 0;
    const status = r6GroupStatus({ trainerUserId: input.trainerUserId, participantCount: input.participants.length, minStudents: input.minStudents });
    const group = (await client.query(`insert into r6_training_groups(package_version_id,training_product_id,required_qualification_id,trainer_user_id,education_stage,training_type,mode,min_students,max_students,status,projected_payout_minor,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`, [input.packageVersionId || null, input.trainingProductId || null, qualification.id, input.trainerUserId || null, input.educationStage, input.trainingType, input.mode, input.minStudents, input.maxStudents, status, projectedPayoutMinor, principal.user.id])).rows[0];
    for (const participant of input.participants) {
      await client.query("insert into r6_training_group_participants(training_group_id,child_profile_id,student_profile_id,student_user_id,enrollment_id,status,billable) values($1,$2,$3,$4,$5,'ACTIVE',true)", [group.id, participant.childProfileId || null, participant.studentProfileId || null, participant.studentUserId, participant.enrollmentId || null]);
    }
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.training_group.created','r6_training_group',$2,'SUCCESS',$3,$4)", [principal.user.id, group.id, crypto.randomUUID(), JSON.stringify({ status, trainingType: input.trainingType, mode: input.mode, participantCount: billableCount, projectedPayoutMinor })]);
    await client.query("commit");
    return json(res, 201, { group: { ...group, projectedPayoutMinor }, requiredQualification: qualification, status, projectedPayoutMinor });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original error */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "R6_GROUP_CONFLICT" : error.code || error.message || "R6_GROUP_UNAVAILABLE" });
  } finally { client.release(); await pool.end(); }
}

export { assertParticipantTargets, assertTrainerEligible, readGroups, requiredQualification };
