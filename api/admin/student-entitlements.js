import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requireMembership } from "../../src/server/auth/authorization.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]));
const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { throw fail("INVALID_JSON"); }
}

function ids(value, field) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw fail(`${field}_REQUIRED`);
  const unique = [...new Set(value.map((item) => String(item || "").trim()))];
  if (unique.some((item) => !UUID.test(item))) throw fail(`${field}_INVALID`);
  return unique;
}

function parseGrades(value) {
  try { const result = JSON.parse(String(value || "[]")); return Array.isArray(result) ? result.map(Number).filter(Number.isInteger) : []; } catch { return []; }
}

function eligible(profile, pkg) {
  if (!profile?.educationStage || profile.educationStage !== pkg.educationStage) return false;
  if (profile.educationStage === "ADULT") return true;
  return parseGrades(pkg.eligibleGradesJson).includes(Number(profile.grade));
}

async function readCatalog(client) {
  const [students, packages, grants] = await Promise.all([
    client.query(`select u.id,u.display_name as "displayName",u.email,sp.id as "studentProfileId",sp.education_stage as "educationStage",sp.grade,sp.school
      from platform_users u
      join platform_memberships m on m.user_id=u.id and m.role='STUDENT' and m.status='ACTIVE' and m.scope_type='STUDENT' and m.scope_id=u.id
      left join student_profiles sp on sp.user_id=u.id and sp.status='ACTIVE'
      where u.email_verified=true order by u.display_name,u.id`),
    client.query(`select p.id as "packageId",pv.id as "packageVersionId",p.slug,pv.title as "packageTitle",p.education_stage as "educationStage",p.eligible_grades_json as "eligibleGradesJson",pv.title,pv.version_number as "versionNumber",pv.purchase_enabled as "purchaseEnabled",pv.status as "versionStatus",p.status as "packageStatus",p.panel_visible as "panelVisible"
      from packages p join package_versions pv on pv.package_id=p.id
      where p.audience='STUDENT' and p.catalog_scope='STUDENT_COMMERCE' and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true and p.panel_visible=true
      order by p.education_stage,p.display_order,pv.title,pv.version_number desc`),
    client.query(`select pe.id,pe.beneficiary_student_user_id as "studentUserId",pe.beneficiary_student_profile_id as "studentProfileId",pe.package_id as "packageId",pe.package_version_id as "packageVersionId",pe.status,pe.source_type as "sourceType",pe.note,pe.effective_at as "effectiveAt",pe.revoked_at as "revokedAt",pe.revoke_reason as "revokeReason",pv.title as "packageTitle",p.education_stage as "educationStage"
      from package_entitlements pe join packages p on p.id=pe.package_id join package_versions pv on pv.id=pe.package_version_id
      where pe.source_type='OWNER_MANUAL' order by pe.effective_at desc,pe.id desc`),
  ]);
  return { students: students.rows, packages: packages.rows, assignments: grants.rows };
}

async function assertOwner(req) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return { error: { status: 401, body: { error: "UNAUTHENTICATED" } } };
  const denied = requireMembership(principal, "OWNER");
  if (denied) return { error: denied };
  return { principal };
}

async function materializePrograms(client, { entitlementId, studentUserId, packageVersionId }) {
  const definitions = (await client.query(`select training_program_id as "trainingProgramId",delivery_mode as "deliveryMode" from package_entitlement_definitions where package_version_id=$1 order by training_program_id`, [packageVersionId])).rows;
  const enrollmentIds = [];
  const assignmentRequestIds = [];
  for (const definition of definitions) {
    const inserted = (await client.query(`insert into enrollments(student_user_id,beneficiary_child_profile_id,training_program_id,status)
      values($1,null,$2,'ACTIVE') on conflict do nothing returning id`, [studentUserId, definition.trainingProgramId])).rows[0];
    const enrollment = inserted || (await client.query(`select id from enrollments where student_user_id=$1 and training_program_id=$2 and beneficiary_child_profile_id is null`, [studentUserId, definition.trainingProgramId])).rows[0];
    if (!enrollment) throw fail("ENROLLMENT_MATERIALIZATION_FAILED", 409);
    enrollmentIds.push(enrollment.id);
    await client.query(`insert into package_entitlement_enrollments(package_entitlement_id,enrollment_id,training_program_id,source_order_item_id)
      values($1,$2,$3,null) on conflict(package_entitlement_id,training_program_id) do nothing`, [entitlementId, enrollment.id, definition.trainingProgramId]);
    if (["TRAINER_LED", "HYBRID"].includes(definition.deliveryMode)) {
      const request = (await client.query(`insert into trainer_assignment_requests(enrollment_id,status) values($1,'PENDING') on conflict do nothing returning id`, [enrollment.id])).rows[0]
        || (await client.query("select id from trainer_assignment_requests where enrollment_id=$1 and status='PENDING' order by created_at desc limit 1", [enrollment.id])).rows[0];
      if (request) assignmentRequestIds.push(request.id);
    }
  }
  return { enrollmentIds, assignmentRequestIds };
}

async function grant(client, actorUserId, student, pkg, note) {
  if (!student.studentProfileId) throw fail("STUDENT_PROFILE_REQUIRED", 409);
  if (!eligible(student, pkg)) throw fail("PACKAGE_NOT_ELIGIBLE_FOR_STUDENT", 409);
  const existing = (await client.query(`select * from package_entitlements where beneficiary_student_user_id=$1 and package_version_id=$2 order by case when status='ACTIVE' then 0 else 1 end,effective_at desc,id desc limit 1 for update`, [student.id, pkg.packageVersionId])).rows[0];
  if (existing?.status === "ACTIVE") return { status: "DUPLICATE", entitlement: existing, enrollmentIds: [], assignmentRequestIds: [] };
  let entitlement;
  if (existing?.source_type === "OWNER_MANUAL") {
    entitlement = (await client.query(`update package_entitlements set beneficiary_student_profile_id=$1,source_type='OWNER_MANUAL',assigned_by=$2,note=$3,status='ACTIVE',effective_at=now(),revoked_at=null,revoked_by=null,revoke_reason=null,updated_at=now() where id=$4 returning *`, [student.studentProfileId, actorUserId, note, existing.id])).rows[0];
  } else if (existing) {
    return { status: "ALREADY_OWNED", entitlement: existing, enrollmentIds: [], assignmentRequestIds: [] };
  } else {
    const issuanceKey = `OWNER_MANUAL:${student.id}:${pkg.packageVersionId}`;
    entitlement = (await client.query(`insert into package_entitlements(beneficiary_student_user_id,beneficiary_student_profile_id,package_id,package_version_id,source_type,assigned_by,note,status,issuance_key)
      values($1,$2,$3,$4,'OWNER_MANUAL',$5,$6,'ACTIVE',$7) returning *`, [student.id, student.studentProfileId, pkg.packageId, pkg.packageVersionId, actorUserId, note, issuanceKey])).rows[0];
  }
  const materialized = await materializePrograms(client, { entitlementId: entitlement.id, studentUserId: student.id, packageVersionId: pkg.packageVersionId });
  await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json)
    values($1,'student.entitlement.owner_granted','package_entitlement',$2,'SUCCESS',$3,$4)`, [actorUserId, entitlement.id, crypto.randomUUID(), JSON.stringify({ studentUserId: student.id, studentProfileId: student.studentProfileId, packageId: pkg.packageId, packageVersionId: pkg.packageVersionId, sourceType: "OWNER_MANUAL", note, enrollmentIds: materialized.enrollmentIds, assignmentRequestIds: materialized.assignmentRequestIds })]);
  await client.query(`insert into panel_notifications(recipient_user_id,event_type,title,body,metadata_json,dedupe_key) values($1,'STUDENT_ENTITLEMENT_GRANTED','Eğitim paketiniz tanımlandı',$2,$3,$4) on conflict(dedupe_key) do nothing`, [student.id, `${pkg.title} paketi Owner tarafından hesabınıza tanımlandı.`, JSON.stringify({ path: "/panel/ogrenci", entitlementId: entitlement.id, source: "OWNER_MANUAL" }), `student-entitlement-granted:${entitlement.id}`]);
  return { status: "GRANTED", entitlement, ...materialized };
}

async function revoke(client, actorUserId, entitlementIds, reason) {
  const results = [];
  for (const entitlementId of entitlementIds) {
    const row = (await client.query(`select * from package_entitlements where id=$1 and source_type='OWNER_MANUAL' and status='ACTIVE' for update`, [entitlementId])).rows[0];
    if (!row) { results.push({ entitlementId, status: "NOT_ACTIVE" }); continue; }
    await client.query(`update package_entitlements set status='REVOKED',revoked_at=now(),revoked_by=$1,revoke_reason=$2,updated_at=now() where id=$3`, [actorUserId, reason, row.id]);
    const enrollments = (await client.query(`select pee.enrollment_id as "enrollmentId" from package_entitlement_enrollments pee where pee.package_entitlement_id=$1`, [row.id])).rows;
    for (const enrollment of enrollments) {
      const other = (await client.query(`select 1 from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id where pee.enrollment_id=$1 and pe.status='ACTIVE' and pe.revoked_at is null limit 1`, [enrollment.enrollmentId])).rows[0];
      if (!other) await client.query(`update enrollments set status=case when status='COMPLETED' then status else 'PAUSED' end,updated_at=now() where id=$1`, [enrollment.enrollmentId]);
      await client.query(`update trainer_assignment_requests set status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),updated_at=now() where enrollment_id=$1 and status='PENDING'`, [enrollment.enrollmentId]);
    }
    await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'student.entitlement.owner_revoked','package_entitlement',$2,'SUCCESS',$3,$4)`, [actorUserId, row.id, crypto.randomUUID(), JSON.stringify({ reason, sourceType: "OWNER_MANUAL" })]);
    results.push({ entitlementId: row.id, status: "REVOKED" });
  }
  return results;
}

async function grantBulk(client, actorUserId, students, packages, note) {
  const results = [];
  for (const student of students) for (const pkg of packages) {
    // A mixed bulk request may contain one eligible and one ineligible pair.
    // Keep each pair atomic so a failure after entitlement insertion cannot
    // leave enrollments, requests, audit rows, or notifications behind while
    // another pair is allowed to commit.
    await client.query("savepoint student_entitlement_grant");
    try {
      results.push({ studentId: student.id, packageVersionId: pkg.packageVersionId, ...(await grant(client, actorUserId, student, pkg, note)) });
      await client.query("release savepoint student_entitlement_grant");
    } catch (error) {
      await client.query("rollback to savepoint student_entitlement_grant");
      await client.query("release savepoint student_entitlement_grant");
      results.push({ studentId: student.id, packageVersionId: pkg.packageVersionId, status: "FAILED", error: error.code || error.message });
    }
  }
  return results;
}

export default async function handler(req, res) {
  const auth = await assertOwner(req);
  if (auth.error) return json(res, auth.error.status, auth.error.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (req.method === "GET") return json(res, 200, await readCatalog(client));
    if (!['POST', 'DELETE'].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const input = await readBody(req);
    await client.query("begin");
    if (req.method === "DELETE" || String(input.action || "").toLowerCase() === "revoke") {
      const entitlementIds = ids(input.entitlementIds || (input.entitlementId ? [input.entitlementId] : []), "ENTITLEMENT_IDS");
      const reason = String(input.reason || "").trim().slice(0, 500);
      if (!reason) throw fail("REVOKE_REASON_REQUIRED");
      const results = await revoke(client, auth.principal.user.id, entitlementIds, reason);
      await client.query("commit");
      return json(res, 200, { results });
    }
    const studentIds = ids(input.studentIds || (input.studentId ? [input.studentId] : []), "STUDENT_IDS");
    const packageVersionIds = ids(input.packageVersionIds || (input.packageVersionId ? [input.packageVersionId] : []), "PACKAGE_VERSION_IDS");
    const note = String(input.note || "").trim().slice(0, 1000) || null;
    const catalog = await readCatalog(client);
    const students = studentIds.map((id) => catalog.students.find((row) => row.id === id));
    const packages = packageVersionIds.map((id) => catalog.packages.find((row) => row.packageVersionId === id));
    if (students.some((row) => !row)) throw fail("STUDENT_NOT_FOUND", 404);
    if (packages.some((row) => !row)) throw fail("PACKAGE_UNAVAILABLE", 409);
    const results = await grantBulk(client, auth.principal.user.id, students, packages, note);
    if (results.some((row) => row.status === "GRANTED")) await client.query("commit");
    else { await client.query("rollback"); if (results.every((row) => ["DUPLICATE", "ALREADY_OWNED"].includes(row.status))) return json(res, 409, { error: "NO_NEW_ENTITLEMENTS", results }); return json(res, 409, { error: "NO_ENTITLEMENTS_GRANTED", results }); }
    return json(res, 201, { results, sourceType: "OWNER_MANUAL", paymentCreated: false, revenueCreated: false });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original */ }
    return json(res, error.status || 503, { error: error.code || error.message || "STUDENT_ENTITLEMENT_OPERATION_FAILED" });
  } finally { client.release(); await pool.end(); }
}

export { eligible, materializePrograms, readCatalog, grant, grantBulk, revoke };
