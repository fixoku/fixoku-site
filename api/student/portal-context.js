import { and, asc, eq, inArray } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { enrollments, guardianProfiles, guardianStudentRelationships, memberships, studentProfiles, trainerAssignments, trainingPrograms, users } from "../../src/server/db/schema.js";

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
  const supplied = [...query.getAll("studentProfileId"), ...query.getAll("studentId")];
  if (supplied.length > 1 || (supplied.length && !uuidPattern.test(supplied[0]))) return { invalid: true };
  return { id: supplied[0] };
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
    const empty = () => requested.id ? denied(response) : json(response, 200, { role, context: null, students: [], enrollments: [] });
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
      if (!available.length) return empty();
      const selected = requested.id ? available.find(({ profile }) => profile.id === requested.id) : available[0];
      if (!selected) return denied(response);
      const enrollmentRows = await db.select({ enrollment: enrollments, program: trainingPrograms }).from(enrollments)
        .innerJoin(trainingPrograms, eq(trainingPrograms.id, enrollments.trainingProgramId))
        // Student/Guardian education views may only expose student-facing programs.
        // Trainer-only programs remain available to trainer APIs and are never
        // silently relabelled for a learner.
        .where(and(eq(enrollments.studentUserId, selected.student.id), eq(trainingPrograms.audience, "STUDENT")))
        .orderBy(asc(trainingPrograms.displayOrder), asc(trainingPrograms.title));
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
          ...(role === "GUARDIAN" ? { studentProfileId: selected.profile.id } : {}),
          student: { name: selected.student.displayName, grade: selected.profile.grade, school: selected.profile.school, status: selected.profile.status },
        },
        students: role === "GUARDIAN" ? available.map(({ profile, student }) => ({ studentProfileId: profile.id, name: student.displayName })) : [],
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
