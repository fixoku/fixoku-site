import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission, validScopeType, PACKAGE_PERMISSIONS } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const read = async (req) => { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; };
const isOwner = (principal) => principal?.memberships?.some((membership) => membership.role === "OWNER" && membership.status === "ACTIVE" && validScopeType(membership) && membership.scopeType === "GLOBAL" && membership.scopeId == null && String(membership.userId || "") === String(principal.user?.id || ""));
const validPermission = (value) => Object.values(PACKAGE_PERMISSIONS).includes(String(value || ""));

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal?.user) return json(res, 401, { error: "UNAUTHENTICATED" });
  if (!isOwner(principal)) return json(res, 403, { error: "OWNER_ONLY" });
  const denied = requirePermission(principal, "membership.manage");
  if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const rows = (await client.query("select p.id,p.admin_user_id as \"adminUserId\",p.permission,p.granted_by as \"grantedBy\",p.granted_at as \"grantedAt\",p.revoked_at as \"revokedAt\",p.revoked_by as \"revokedBy\",p.revoke_reason as \"revokeReason\",u.display_name as \"adminName\",u.email as \"adminEmail\" from owner_admin_package_permissions p join platform_users u on u.id=p.admin_user_id order by p.admin_user_id,p.permission,p.granted_at desc")).rows;
      return json(res, 200, { permissions: rows });
    }
    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const body = await read(req);
    const adminUserId = String(body.adminUserId || "");
    const permission = String(body.permission || "");
    const action = String(body.action || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(adminUserId) || !validPermission(permission) || !["grant", "revoke"].includes(action)) return json(res, 400, { error: "PACKAGE_PERMISSION_INPUT_INVALID" });
    await client.query("begin");
    const target = (await client.query("select u.id from platform_users u join platform_memberships m on m.user_id=u.id where u.id=$1 and m.role='SUPER_ADMIN' and m.status='ACTIVE' and m.scope_type='GLOBAL' and m.scope_id is null for update", [adminUserId])).rows[0];
    if (!target) throw Object.assign(new Error("SUPER_ADMIN_REQUIRED"), { status: 409 });
    if (action === "grant") {
      const row = (await client.query("insert into owner_admin_package_permissions(admin_user_id,permission,granted_by) values($1,$2::package_permission_code,$3) on conflict (admin_user_id,permission) where revoked_at is null do nothing returning id,admin_user_id as \"adminUserId\",permission,granted_by as \"grantedBy\",granted_at as \"grantedAt\"", [adminUserId, permission, principal.user.id])).rows[0];
      if (!row) throw Object.assign(new Error("PACKAGE_PERMISSION_ALREADY_ACTIVE"), { status: 409 });
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'owner_admin.package_permission.granted','platform_user',$2,'SUCCESS',$3,$4)", [principal.user.id, adminUserId, crypto.randomUUID(), JSON.stringify({ permission })]);
      await client.query("commit"); return json(res, 201, { permission: row });
    }
    const row = (await client.query("update owner_admin_package_permissions set revoked_at=now(),revoked_by=$1,revoke_reason=$2 where admin_user_id=$3 and permission=$4::package_permission_code and revoked_at is null returning id,admin_user_id as \"adminUserId\",permission,revoked_at as \"revokedAt\",revoked_by as \"revokedBy\",revoke_reason as \"revokeReason\"", [principal.user.id, String(body.reason || "OWNER_REVOKED"), adminUserId, permission])).rows[0];
    if (!row) throw Object.assign(new Error("PACKAGE_PERMISSION_NOT_ACTIVE"), { status: 409 });
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'owner_admin.package_permission.revoked','platform_user',$2,'SUCCESS',$3,$4)", [principal.user.id, adminUserId, crypto.randomUUID(), JSON.stringify({ permission, reason: row.revokeReason })]);
    await client.query("commit"); return json(res, 200, { permission: row });
  } catch (error) { try { await client.query("rollback"); } catch { /* preserve */ } return json(res, error.status || (error.code === "42P01" ? 503 : 409), { error: error.code === "42P01" ? "PACKAGE_PERMISSION_SCHEMA_REQUIRED" : error.code || error.message || "PACKAGE_PERMISSION_FAILED" }); } finally { client.release(); await pool.end(); }
}
