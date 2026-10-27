import crypto from "node:crypto";
import pg from "pg";
import { z } from "zod";
import { resolvePrincipal, requireMembership, requirePermission } from "../../src/server/auth/authorization.js";
import { canDisableMultipleStudents } from "../../src/server/domain/student-account-capability.js";

const uuid = z.string().uuid();
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function readBody(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requireMembership(principal, "OWNER") || requirePermission(principal, "user.manage");
  if (denied) return json(res, denied.status, denied.body);
  const userId = new URL(req.url || "/api/admin/student-account-capability", "http://local").searchParams.get("userId");
  if (!uuid.safeParse(userId).success) return json(res, 400, { error: "USER_ID_INVALID" });
  let input;
  if (req.method === "PATCH") {
    try { input = await readBody(req); } catch { return json(res, 400, { error: "INVALID_BODY" }); }
    if (!input || typeof input.allowMultipleStudents !== "boolean" || Object.keys(input).some((key) => key !== "allowMultipleStudents")) return json(res, 400, { error: "CAPABILITY_INVALID" });
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (req.method === "PATCH") await client.query("begin");
    const account = (await client.query(`select u.id as "userId",u.email,u.display_name as "displayName",u.allow_multiple_students as "allowMultipleStudents" from platform_users u where u.id=$1 and exists (select 1 from platform_memberships m where m.user_id=u.id and m.status='ACTIVE' and m.role in ('STUDENT','GUARDIAN')) ${req.method === "PATCH" ? "for update" : ""}`, [userId])).rows[0];
    if (!account) { if (req.method === "PATCH") await client.query("rollback"); return json(res, 404, { error: "ACCOUNT_NOT_FOUND" }); }
    const counts = (await client.query("select count(*)::int as count from r6_student_child_profiles where owner_user_id=$1 and status='ACTIVE'", [userId])).rows[0];
    const activeChildCount = Number(counts?.count || 0);
    if (req.method === "GET") return json(res, 200, { account: { ...account, activeChildCount } });
    if (!input.allowMultipleStudents && !canDisableMultipleStudents({ activeChildCount })) {
      await client.query("rollback");
      return json(res, 409, { error: "MULTIPLE_STUDENTS_ACTIVE", activeChildCount });
    }
    const updated = (await client.query("update platform_users set allow_multiple_students=$1,updated_at=now() where id=$2 returning allow_multiple_students as \"allowMultipleStudents\"", [input.allowMultipleStudents, userId])).rows[0];
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'STUDENT_ACCOUNT_CAPABILITY_SET','PLATFORM_USER',$2,'SUCCESS',$3,$4)", [principal.user.id, userId, req.headers?.["x-request-id"] || crypto.randomUUID(), JSON.stringify({ previousValue: account.allowMultipleStudents, allowMultipleStudents: updated.allowMultipleStudents, activeChildCount })]);
    await client.query("commit");
    return json(res, 200, { account: { ...account, allowMultipleStudents: updated.allowMultipleStudents, activeChildCount } });
  } catch { try { await client.query("rollback"); } catch { /* Preserve unavailable response. */ } return json(res, 503, { error: "STUDENT_ACCOUNT_CAPABILITY_UNAVAILABLE" }); }
  finally { client.release(); await pool.end(); }
}
