import { and, asc, eq, inArray } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { guardianProfiles, guardianStudentRelationships, memberships, studentProfiles, trainerAssignments, users } from "../../src/server/db/schema.js";

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}
const requestHeaders = (request) => new Headers(Object.entries(request.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const denied = (response) => json(response, 403, { error: "FORBIDDEN" });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Only opaque StudentProfile IDs are accepted as requested context, never authority. */
function requestedProfile(request) {
  const query = new URL(request.url, "http://local").searchParams;
  const profileIds = [...query.getAll("studentProfileId"), ...query.getAll("studentId")];
  const childIds = query.getAll("childProfileId");
  if (profileIds.length > 1 || childIds.length > 1 || (profileIds.length && !uuidPattern.test(profileIds[0])) || (childIds.length && !uuidPattern.test(childIds[0]))) return { invalid: true };
  if (profileIds.length && childIds.length) return { invalid: true };
  return { id: profileIds[0], childId: childIds[0] };
}

export default async function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(requestHeaders(request));
    if (!principal) return json(response, 401, { error: "UNAUTHENTICATED" });
    if (!principal.user) return denied(response);
    const portalRoles = [...new Set(principal.memberships.filter((membership) => ["STUDENT", "GUARDIAN"].includes(membership.role)).map((membership) => membership.role))];
    if (!portalRoles.length) return denied(response);
    // Do not choose a student/guardian identity by database row ordering.
    if (portalRoles.length !== 1) return json(response, 409, { error: "PORTAL_ROLE_SELECTION_REQUIRED" });
    const role = portalRoles[0];
    for (const permission of ["student.read", "enrollment.read"]) {
      const permissionError = requirePermission(principal, permission, { role });
      if (permissionError) return json(response, permissionError.status, permissionError.body);
    }
    const requested = requestedProfile(request);
    if (requested.invalid) return denied(response);
    const empty = () => requested.id || requested.childId ? denied(response) : json(response, 200, { role, context: null, students: [], enrollments: [] });
    const { db, pool } = createDb();
    try {
      let available = [];
      if (role === "STUDENT") {
        available = await db.select({ profile: studentProfiles, student: users }).from(studentProfiles)
          .innerJoin(users, eq(users.id, studentProfiles.userId))
          .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.scopeId, users.id), eq(memberships.role, "STUDENT"), eq(memberships.scopeType, "STUDENT"), eq(memberships.status, "ACTIVE")))
          .where(and(eq(studentProfiles.userId, principal.user.id), eq(studentProfiles.status, "ACTIVE"))).limit(1);
      } else {
        const guardian = await db.select({ id: guardianProfiles.id }).from(guardianProfiles)
          .where(and(eq(guardianProfiles.userId, principal.user.id), eq(guardianProfiles.status, "ACTIVE"))).limit(1);
        if (!guardian.length) return empty();
        available = await db.select({ profile: studentProfiles, student: users }).from(guardianStudentRelationships)
          .innerJoin(studentProfiles, eq(studentProfiles.id, guardianStudentRelationships.studentProfileId))
          .innerJoin(users, eq(users.id, studentProfiles.userId))
          .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.scopeId, users.id), eq(memberships.role, "STUDENT"), eq(memberships.scopeType, "STUDENT"), eq(memberships.status, "ACTIVE")))
          .where(and(eq(guardianStudentRelationships.guardianUserId, principal.user.id), eq(guardianStudentRelationships.status, "ACTIVE"), eq(studentProfiles.status, "ACTIVE")))
          .orderBy(asc(users.displayName), asc(studentProfiles.id));
      }
      // R64 child profiles are the selectable identity when present. Legacy
      // student rows remain available for accounts that have not adopted the
      // child table yet, while a child with a legacy profile replaces that
      // ambiguous owner row so siblings cannot share one portal scope.
      const childRows = (await pool.query(`
        select c.id as "childProfileId",c.legacy_student_profile_id as "studentProfileId",
          c.owner_user_id as "studentUserId",concat_ws(' ',c.first_name,c.last_name) as "studentName",
          c.education_stage as "educationStage",c.grade,sp.school,sp.status as "profileStatus"
        from r6_student_child_profiles c
        left join student_profiles sp on sp.id=c.legacy_student_profile_id
        where c.owner_user_id=$1 and c.status='ACTIVE'
        order by c.is_default desc,c.created_at,c.id
      `, [principal.user.id])).rows;
      const childLegacyIds = new Set(childRows.map((row) => String(row.studentProfileId || "")));
      const targets = [
        ...available
          .filter(({ profile }) => !childLegacyIds.has(String(profile.id)))
          .map(({ profile, student }) => ({ profile, student, studentProfileId: profile.id, childProfileId: null })),
        ...childRows.map((row) => ({
          profile: { id: row.childProfileId, grade: row.grade, school: row.school, status: row.profileStatus || "ACTIVE" },
          student: { id: row.studentUserId, displayName: row.studentName },
          studentProfileId: row.studentProfileId,
          childProfileId: row.childProfileId,
        })),
      ];
      if (!targets.length) return empty();
      const selected = requested.childId
        ? targets.find((target) => target.childProfileId === requested.childId)
        : requested.id
          ? targets.find((target) => target.profile.id === requested.id || target.studentProfileId === requested.id)
          : targets[0];
      if (!selected) return denied(response);
      const enrollmentRows = (await pool.query(`
        select e.id,e.student_user_id as "studentUserId",e.status,e.progress_percent as "progressPercent",
          e.completed_at as "completedAt",tp.id as "trainingProgramId",tp.title,tp.slug,
          tp.short_description as "shortDescription",tp.display_order as "displayOrder"
        from enrollments e
        inner join training_programs tp on tp.id=e.training_program_id
        where e.student_user_id=$1 and tp.audience='STUDENT'
          and (
            $2::uuid is null
            or exists (
              select 1
              from package_entitlement_enrollments pee
              join package_entitlements pe on pe.id=pee.package_entitlement_id
              where pee.enrollment_id=e.id
                and pe.beneficiary_child_profile_id=$2
                and pe.status='ACTIVE'
            )
          )
        order by tp.display_order,tp.title
      `, [selected.student.id, selected.childProfileId || null])).rows.map((row) => ({
        enrollment: {
          id: row.id,
          studentUserId: row.studentUserId,
          status: row.status,
          progressPercent: Number(row.progressPercent || 0),
          completedAt: row.completedAt,
        },
        program: {
          id: row.trainingProgramId,
          title: row.title,
          slug: row.slug,
          shortDescription: row.shortDescription,
        },
      }));
      const enrollmentIds = enrollmentRows.map(({ enrollment }) => enrollment.id);
      const assignmentRows = enrollmentIds.length ? await db.select({ enrollmentId: trainerAssignments.enrollmentId, name: users.displayName })
        .from(trainerAssignments)
        .innerJoin(users, eq(users.id, trainerAssignments.trainerUserId))
        .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.scopeId, users.id), eq(memberships.role, "TRAINER"), eq(memberships.scopeType, "TRAINER"), eq(memberships.status, "ACTIVE")))
        .where(and(inArray(trainerAssignments.enrollmentId, enrollmentIds), eq(trainerAssignments.status, "ACTIVE")))
        .orderBy(asc(users.displayName)) : [];
      return json(response, 200, {
        role,
        context: {
          ...(role === "GUARDIAN" ? { studentProfileId: selected.childProfileId || selected.studentProfileId, childProfileId: selected.childProfileId || null } : {}),
          student: { name: selected.student.displayName, grade: selected.profile.grade, school: selected.profile.school, status: selected.profile.status },
        },
        students: role === "GUARDIAN" ? targets.map((target) => ({ studentProfileId: target.childProfileId || target.studentProfileId, childProfileId: target.childProfileId || null, name: target.student.displayName, grade: target.profile.grade })) : [],
        enrollments: enrollmentRows.map(({ enrollment, program }) => ({
          id: enrollment.id,
          status: enrollment.status,
          program: { title: program.title, slug: program.slug, shortDescription: program.shortDescription },
          trainerNames: [...new Set(assignmentRows.filter((assignment) => assignment.enrollmentId === enrollment.id).map((assignment) => assignment.name))],
        })),
      });
    } finally { await pool.end(); }
  } catch { return json(response, 503, { error: "STUDENT_PORTAL_UNAVAILABLE" }); }
}
