import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { UUID_PATTERN } from "../../src/server/domain/commerce.js";
import { canCreateChildProfile } from "../../src/server/domain/student-account-capability.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function readBody(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const text = (value, max = 120) => String(value ?? "").trim().slice(0, max);
function normalizeDateOfBirth(value){
  if(value == null || String(value).trim() === "") return null;
  const raw = String(value).trim();
  if(!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) throw Object.assign(new Error("CHILD_DATE_OF_BIRTH_INVALID"),{status:400});
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if(date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date > todayUtc) throw Object.assign(new Error("CHILD_DATE_OF_BIRTH_INVALID"),{status:400});
  return raw;
}

function validate(input) {
  const firstName = text(input.firstName); const lastName = text(input.lastName);
  if (!firstName || !lastName) throw Object.assign(new Error("CHILD_NAME_REQUIRED"), { status: 400 });
  const educationStage = input.educationStage ? text(input.educationStage, 20).toUpperCase() : null;
  if (educationStage && !["PRIMARY", "MIDDLE", "HIGH", "ADULT"].includes(educationStage)) throw Object.assign(new Error("CHILD_STAGE_INVALID"), { status: 400 });
  const legacyStudentProfileId = input.legacyStudentProfileId ? text(input.legacyStudentProfileId, 80) : null;
  if (legacyStudentProfileId && !UUID_PATTERN.test(legacyStudentProfileId)) throw Object.assign(new Error("CHILD_LEGACY_PROFILE_INVALID"), { status: 400 });
  return { firstName, lastName, dateOfBirth: normalizeDateOfBirth(input.dateOfBirth), educationStage, grade: input.grade ? text(input.grade, 40) : null, legacyStudentProfileId };
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "child_profile.manage"); if (denied) return json(res, denied.status, denied.body);
  const url = new URL(req.url || "/api/student/children", "http://local");
  const id = url.searchParams.get("id") || null;
  if (id && !UUID_PATTERN.test(id)) return json(res, 400, { error: "CHILD_ID_INVALID" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    // Only an Owner-sent, current family offer grants access to this workspace.
    // A draft or an offer for another account must never enable child profiles.
    const familyEnabled = Boolean((await client.query(`
      select 1 from family_offers fo
      join family_offer_revisions fr on fr.offer_id=fo.id
       and fr.revision_number=fo.current_revision_number and fr.status='SENT'
      where fo.customer_user_id=$1 and fo.status='SENT'
      limit 1`, [principal.user.id])).rowCount);
    if (!familyEnabled) return json(res, 403, { error: "FAMILY_OFFER_REQUIRED" });
    if (req.method === "GET") {
      const rows = (await client.query(`select c.id,c.owner_user_id as "ownerUserId",c.legacy_student_profile_id as "legacyStudentProfileId",c.first_name as "firstName",c.last_name as "lastName",c.date_of_birth as "dateOfBirth",c.education_stage as "educationStage",c.grade,c.status,c.is_default as "isDefault",a.selected_at as "selectedAt" from r6_student_child_profiles c left join r6_student_active_profiles a on a.child_profile_id=c.id and a.owner_user_id=c.owner_user_id where c.owner_user_id=$1 and c.status='ACTIVE' order by c.is_default desc,c.created_at,c.id`, [principal.user.id])).rows;
      return json(res, 200, { children: rows, capability: { allowMultipleStudents: (principal.user.allowMultipleStudents === true || familyEnabled), canCreate: rows.length === 0 || (principal.user.allowMultipleStudents === true || familyEnabled) } });
    }
    if (req.method === "POST") {
      const input = validate(await readBody(req));
      await client.query("begin");
      const account = (await client.query("select allow_multiple_students from platform_users where id=$1 for update", [principal.user.id])).rows[0];
      if (!account) { await client.query("rollback"); return json(res, 403, { error: "FORBIDDEN" }); }
      if (input.legacyStudentProfileId) {
        const owned = (await client.query("select id from student_profiles where id=$1 and user_id=$2 and status='ACTIVE'", [input.legacyStudentProfileId, principal.user.id])).rows[0];
        if (!owned) { await client.query("rollback"); return json(res, 403, { error: "CHILD_OWNERSHIP_DENIED" }); }
      }
      const count = Number((await client.query("select count(*)::int as count from r6_student_child_profiles where owner_user_id=$1 and status='ACTIVE'", [principal.user.id])).rows[0]?.count || 0);
      if (!canCreateChildProfile({ activeChildCount: count, allowMultipleStudents: (account.allow_multiple_students || familyEnabled) })) {
        await client.query("rollback");
        return json(res, 403, { error: "MULTIPLE_STUDENTS_NOT_ALLOWED" });
      }
      if (count === 0 && !account.allow_multiple_students && !familyEnabled && !input.legacyStudentProfileId) {
        const legacy = (await client.query("select id from student_profiles where user_id=$1 and status='ACTIVE' limit 1", [principal.user.id])).rows[0];
        if (legacy) { await client.query("rollback"); return json(res, 403, { error: "MULTIPLE_STUDENTS_NOT_ALLOWED" }); }
      }
      const row = (await client.query(`insert into r6_student_child_profiles(owner_user_id,legacy_student_profile_id,first_name,last_name,date_of_birth,education_stage,grade,is_default) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,owner_user_id as "ownerUserId",legacy_student_profile_id as "legacyStudentProfileId",first_name as "firstName",last_name as "lastName",date_of_birth as "dateOfBirth",education_stage as "educationStage",grade,status,is_default as "isDefault"`, [principal.user.id, input.legacyStudentProfileId, input.firstName, input.lastName, input.dateOfBirth, input.educationStage, input.grade, count === 0])).rows[0];
      if (row.isDefault) await client.query("insert into r6_student_active_profiles(owner_user_id,child_profile_id) values($1,$2) on conflict(owner_user_id) do update set child_profile_id=excluded.child_profile_id,selected_at=now()", [principal.user.id, row.id]);
      await client.query("commit");
      return json(res, 201, { child: row });
    }
    if (!id) return json(res, 400, { error: "CHILD_ID_REQUIRED" });
    const owned = (await client.query("select * from r6_student_child_profiles where id=$1 and owner_user_id=$2 and status='ACTIVE' for update", [id, principal.user.id])).rows[0];
    if (!owned) return json(res, 404, { error: "CHILD_NOT_FOUND" });
    if (req.method === "DELETE") {
      await client.query("update r6_student_child_profiles set status='ARCHIVED',updated_at=now() where id=$1", [id]);
      await client.query("delete from r6_student_active_profiles where owner_user_id=$1 and child_profile_id=$2", [principal.user.id, id]);
      return json(res, 200, { archived: true, childId: id });
    }
    const body = await readBody(req);
    if (body.action === "select") {
      await client.query("insert into r6_student_active_profiles(owner_user_id,child_profile_id) values($1,$2) on conflict(owner_user_id) do update set child_profile_id=excluded.child_profile_id,selected_at=now()", [principal.user.id, id]);
      return json(res, 200, { selected: true, childId: id });
    }
    const input = validate({ ...owned, ...body });
    const row = (await client.query(`update r6_student_child_profiles set first_name=$1,last_name=$2,date_of_birth=$3,education_stage=$4,grade=$5,updated_at=now() where id=$6 and owner_user_id=$7 returning id,owner_user_id as "ownerUserId",legacy_student_profile_id as "legacyStudentProfileId",first_name as "firstName",last_name as "lastName",date_of_birth as "dateOfBirth",education_stage as "educationStage",grade,status,is_default as "isDefault"`, [input.firstName, input.lastName, input.dateOfBirth, input.educationStage, input.grade, id, principal.user.id])).rows[0];
    return json(res, 200, { child: row });
  } catch (error) { try { await client.query("rollback"); } catch { /* Preserve the original error. */ } return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "CHILD_CONFLICT" : error.code || error.message || "CHILD_PROFILE_UNAVAILABLE" }); } finally { client.release(); await pool.end(); }
}
