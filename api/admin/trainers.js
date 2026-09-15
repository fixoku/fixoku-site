import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function readBody(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const SOURCE = new Set(["PACKAGE_COMPLETION", "ADMIN_GRANT", "LEGACY_IMPORT"]);
const ACTION = new Set(["grant", "suspend", "revoke", "reactivate"]);
export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "qualification.manage"); if (denied) return json(res, denied.status, denied.body);
  if (req.method !== "GET" && req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const rows = (await client.query(`select u.id,u.display_name as "displayName",u.email,m.status as "membershipStatus",q.id as "qualificationId",q.training_program_id as "trainingProgramId",tp.title as "programTitle",q.status as "qualificationStatus",q.source,q.granted_by as "grantedBy",q.granted_at as "grantedAt",q.valid_from as "validFrom",q.valid_until as "validUntil",q.reason,q.suspended_at as "suspendedAt",q.revoked_at as "revokedAt",q.revoked_by as "revokedBy",q.revoked_reason as "revokedReason" from platform_users u join platform_memberships m on m.user_id=u.id and m.role='TRAINER' and m.status='ACTIVE' left join trainer_qualifications q on q.trainer_user_id=u.id left join training_programs tp on tp.id=q.training_program_id order by u.display_name,q.granted_at desc`)).rows;
      const trainingPrograms = (await client.query("select id,title,slug from training_programs where audience='TRAINER' and status='PUBLISHED' order by display_order,id")).rows;
      return json(res, 200, { trainers: rows, trainingPrograms });
    }
    const body = await readBody(req); const userId = String(body.userId || ""); const programId = String(body.trainingProgramId || ""); const action = String(body.action || "grant");
    if (!/^[0-9a-f-]{36}$/iu.test(userId) || !/^[0-9a-f-]{36}$/iu.test(programId)) return json(res, 400, { error: "USER_AND_PROGRAM_REQUIRED" });
    if (!ACTION.has(action)) return json(res, 400, { error: "INVALID_QUALIFICATION_ACTION" });
    const source = String(body.source || "ADMIN_GRANT"); if (!SOURCE.has(source)) return json(res, 400, { error: "INVALID_QUALIFICATION_SOURCE" });
    await client.query("begin");
    const user = (await client.query("select id from platform_users where id=$1", [userId])).rows[0]; const program = (await client.query("select id from training_programs where id=$1 and audience='TRAINER'", [programId])).rows[0];
    if (!user || !program) { const e = Object.assign(new Error("USER_OR_PROGRAM_NOT_FOUND"), { status: 404 }); throw e; }
    if (action === "grant" || action === "reactivate") {
      await client.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'TRAINER',$1,'TRAINER','ACTIVE') on conflict (user_id,scope_type,scope_id,role) do update set status='ACTIVE',updated_at=now()", [userId]);
      const row = (await client.query(`insert into trainer_qualifications(trainer_user_id,training_program_id,status,source,granted_by,granted_at,valid_from,valid_until,reason,qualified_at,revoked_at,revoked_by,revoked_reason,suspended_at,status_changed_by,status_reason) values($1,$2,'ACTIVE',$3,$4,now(),now(),$5,$6,now(),null,null,null,null,$4,$6) on conflict(trainer_user_id,training_program_id) do update set status='ACTIVE',source=excluded.source,granted_by=excluded.granted_by,granted_at=excluded.granted_at,valid_from=excluded.valid_from,valid_until=excluded.valid_until,reason=excluded.reason,revoked_at=null,revoked_by=null,revoked_reason=null,suspended_at=null,status_changed_by=excluded.status_changed_by,status_reason=excluded.status_reason,updated_at=now() returning *`, [userId, programId, source, principal.user.id, body.validUntil || null, body.reason || null])).rows[0];
      await client.query("insert into trainer_qualification_history(qualification_id,trainer_user_id,training_program_id,status,source,changed_by,reason) values($1,$2,$3,'ACTIVE',$4,$5,$6)", [row.id, userId, programId, source, principal.user.id, body.reason || null]);
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'trainer_qualification','' || $3,'SUCCESS',gen_random_uuid(),$4)", [principal.user.id, action === "grant" ? "trainer.qualification.granted" : "trainer.qualification.reactivated", row.id, JSON.stringify({ userId, trainingProgramId: programId, source })]);
      await client.query("commit"); return json(res, 200, { qualification: row, status: "ACTIVE" });
    }
    const target = (await client.query("select * from trainer_qualifications where trainer_user_id=$1 and training_program_id=$2 for update", [userId, programId])).rows[0]; if (!target) { const e = Object.assign(new Error("QUALIFICATION_NOT_FOUND"), { status: 404 }); throw e; }
    const status = action === "suspend" ? "SUSPENDED" : "REVOKED"; const row = (await client.query("update trainer_qualifications set status=$1,revoked_at=case when $1='REVOKED' then now() else revoked_at end,revoked_by=case when $1='REVOKED' then $2 else revoked_by end,revoked_reason=case when $1='REVOKED' then $3 else revoked_reason end,suspended_at=case when $1='SUSPENDED' then now() else suspended_at end,status_changed_by=$2,status_reason=$3,updated_at=now() where id=$4 returning *", [status, principal.user.id, body.reason || null, target.id])).rows[0];
    await client.query("insert into trainer_qualification_history(qualification_id,trainer_user_id,training_program_id,status,source,changed_by,reason) values($1,$2,$3,$4,$5,$6,$7)", [row.id, userId, programId, status, row.source, principal.user.id, body.reason || null]);
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'trainer_qualification',$3,'SUCCESS',gen_random_uuid(),$4)", [principal.user.id, `trainer.qualification.${action}`, row.id, JSON.stringify({ userId, trainingProgramId: programId })]);
    await client.query("commit"); return json(res, 200, { qualification: row, status });
  } catch (cause) { try { await client.query("rollback"); } catch { /* noop */ } return json(res, cause.status || (cause.code === "23505" ? 409 : 400), { error: cause.code === "23505" ? "QUALIFICATION_CONFLICT" : cause.message || "QUALIFICATION_MUTATION_FAILED" }); } finally { client.release(); await pool.end(); }
}
