import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "qualification.manage"); if (denied) return json(res, denied.status, denied.body);
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const id = String(req.url || "").split("/").pop().split("?")[0]; if (!/^[0-9a-f-]{36}$/iu.test(id)) return json(res, 400, { error: "INVALID_TRAINER_ID" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const trainer = (await pool.query("select u.id,u.display_name as \"displayName\",u.email,m.status as \"membershipStatus\" from platform_users u left join platform_memberships m on m.user_id=u.id and m.role='TRAINER' where u.id=$1 order by m.updated_at desc limit 1", [id])).rows[0];
    if (!trainer) return json(res, 404, { error: "TRAINER_NOT_FOUND" });
    const qualifications = (await pool.query("select q.*,tp.title as \"programTitle\" from trainer_qualifications q join training_programs tp on tp.id=q.training_program_id where q.trainer_user_id=$1 order by q.updated_at desc", [id])).rows;
    const history = (await pool.query("select h.*,tp.title as \"programTitle\" from trainer_qualification_history h join training_programs tp on tp.id=h.training_program_id where h.trainer_user_id=$1 order by h.changed_at desc", [id])).rows;
    const assignments = (await pool.query("select a.id,a.status,a.created_at as \"createdAt\",a.ended_at as \"endedAt\",a.ended_reason as \"endedReason\",e.id as \"enrollmentId\",e.student_user_id as \"studentUserId\",e.status as \"enrollmentStatus\" from trainer_assignments a join enrollments e on e.id=a.enrollment_id where a.trainer_user_id=$1 order by a.created_at desc", [id])).rows;
    return json(res, 200, { trainer, qualifications, qualificationHistory: history, assignments });
  } catch { return json(res, 503, { error: "TRAINER_UNAVAILABLE" }); } finally { await pool.end(); }
}
