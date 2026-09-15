import { and, eq } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { enrollments, memberships, studentProfiles, trainerAssignments, trainingPrograms, users } from "../../src/server/db/schema.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "student.read", { role: "TRAINER" });
    if (denied) return json(res, denied.status, denied.body);
    const trainer = principal.user.id;
    const { db, pool } = createDb();
    try {
      const rows = await db.select({ assignment: trainerAssignments, enrollment: enrollments, program: trainingPrograms, user: users, profile: studentProfiles, membership: memberships })
        .from(trainerAssignments)
        .innerJoin(enrollments, eq(enrollments.id, trainerAssignments.enrollmentId))
        .innerJoin(trainingPrograms, eq(trainingPrograms.id, enrollments.trainingProgramId))
        .innerJoin(users, eq(users.id, enrollments.studentUserId))
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
        .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.role, "STUDENT"), eq(memberships.scopeType, "STUDENT"), eq(memberships.status, "ACTIVE")))
        .where(and(eq(trainerAssignments.trainerUserId, trainer), eq(trainerAssignments.status, "ACTIVE"), eq(enrollments.status, "ACTIVE")));
      const students = rows.map(({ user, profile, assignment, enrollment, program }) => ({ id: user.id, name: user.displayName, email: user.email, grade: profile?.grade ?? null, school: profile?.school ?? null, status: enrollment.status, linkedAt: assignment.createdAt, enrollments: [{ id: enrollment.id, status: enrollment.status, programTitle: program.title, progressPercent: enrollment.progressPercent, completedAt: enrollment.completedAt }] }));
      return json(res, 200, { students, count: students.length });
    } finally { await pool.end(); }
  } catch { return json(res, 503, { error: "STUDENTS_UNAVAILABLE" }); }
}
