import { and, eq } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
import { createDb } from "../../../src/server/db/client.js";
import { enrollments, memberships, studentProfiles, trainerAssignments, users } from "../../../src/server/db/schema.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "student.read", { role: "TRAINER" });
    if (denied) return json(res, denied.status, denied.body);
    const studentId = String(req.query?.id || "");
    if (!studentId || studentId.length > 100) return json(res, 400, { error: "INVALID_STUDENT_ID" });
    const { db, pool } = createDb();
    try {
      const rows = await db.select({ assignment: trainerAssignments, enrollment: enrollments, user: users, profile: studentProfiles, membership: memberships })
        .from(trainerAssignments)
        .innerJoin(enrollments, eq(enrollments.id, trainerAssignments.enrollmentId))
        .innerJoin(users, eq(users.id, enrollments.studentUserId))
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
        .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.role, "STUDENT"), eq(memberships.scopeType, "STUDENT"), eq(memberships.status, "ACTIVE")))
        .where(and(eq(trainerAssignments.trainerUserId, principal.user.id), eq(trainerAssignments.status, "ACTIVE"), eq(enrollments.studentUserId, studentId), eq(enrollments.status, "ACTIVE"))).limit(1);
      if (!rows.length) return json(res, 404, { error: "STUDENT_NOT_FOUND" });
      const { user, profile, assignment } = rows[0];
      return json(res, 200, { student: { id: user.id, name: user.displayName, email: user.email, grade: profile?.grade ?? null, school: profile?.school ?? null, status: profile?.status ?? "ACTIVE", linkedAt: assignment.createdAt } });
    } finally { await pool.end(); }
  } catch { return json(res, 503, { error: "STUDENT_UNAVAILABLE" }); }
}
