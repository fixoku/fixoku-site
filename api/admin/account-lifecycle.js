import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { hashInvitationToken, issueInvitationMail, newInvitationToken } from "../../src/server/auth/invitations.js";

const json = (r, s, b) => { r.statusCode = s; r.setHeader("Content-Type", "application/json; charset=utf-8"); r.setHeader("Cache-Control", "no-store"); r.setHeader("X-Content-Type-Options", "nosniff"); r.end(JSON.stringify(b)); };
const h = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let x = ""; for await (const c of req) x += c; return x ? JSON.parse(x) : {}; }

export default async function handler(req, res) {
  const principal = await resolvePrincipal(h(req));
  if (!principal?.user) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "user.manage");
  if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const path = new URL(req.url || "http://local", "http://local").pathname;
    if (req.method === "GET") {
      const apps = (await pool.query("select id,first_name as \"firstName\",last_name as \"lastName\",email,city,status,created_at as \"createdAt\",review_note as \"reviewNote\" from trainer_applications order by created_at desc")).rows;
      const closures = (await pool.query('select acr.id,acr.user_id as "userId",u.display_name as "accountName",u.email as "accountEmail",acr.status,acr.reason,acr.review_note as "reviewNote",acr.created_at as "createdAt",acr.updated_at as "updatedAt" from account_closure_requests acr join platform_users u on u.id=acr.user_id order by acr.created_at desc')).rows;
      return json(res, 200, { applications: apps, closureRequests: closures });
    }
    const b = await read(req);
    if (path.endsWith("/closure-requests") && b.id) {
      const status = { review: "REVIEWING", approve: "APPROVED", reject: "REJECTED", complete: "COMPLETED" }[String(b.action || "")];
      if (!status) return json(res, 400, { error: "INVALID_CLOSURE_ACTION" });
      const row = (await pool.query('update account_closure_requests set status=$1,review_note=$2,updated_at=now() where id=$3 returning id,user_id as "userId",status,review_note as "reviewNote",updated_at as "updatedAt"', [status, b.note || null, b.id])).rows[0];
      if (!row) return json(res, 404, { error: "NOT_FOUND" });
      return json(res, 200, { request: row, hardDelete: false, retention: "EXTERNAL_LEGAL_POLICY_REQUIRED" });
    }
    if (path.endsWith("/trainer-applications") && b.id) {
      const action = String(b.action || "");
      const status = { approve: "APPROVED", reject: "REJECTED", review: "REVIEWING" }[action];
      if (!status) return json(res, 400, { error: "INVALID_ACTION" });
      if (status === "REJECTED") {
        const row = (await pool.query("update trainer_applications set status=$1,review_note=$2,invitation_token_hash=null,invitation_expires_at=null,updated_at=now() where id=$3 returning id,status", [status, b.note || null, b.id])).rows[0];
        if (!row) return json(res, 404, { error: "NOT_FOUND" });
        return json(res, 200, { application: row, invitationIssued: false });
      }
      if (status === "REVIEWING") {
        const row = (await pool.query("update trainer_applications set status=$1,review_note=$2,updated_at=now() where id=$3 returning id,status", [status, b.note || null, b.id])).rows[0];
        if (!row) return json(res, 404, { error: "NOT_FOUND" });
        return json(res, 200, { application: row, invitationIssued: false });
      }
      const raw = newInvitationToken();
      const hash = hashInvitationToken(raw);
      const row = (await pool.query("update trainer_applications set status='APPROVED',review_note=$1,invitation_token_hash=$2,invitation_expires_at=now()+interval '48 hours',invitation_used_at=null,updated_at=now() where id=$3 returning id,status,email,invitation_expires_at as \"expiresAt\"", [b.note || null, hash, b.id])).rows[0];
      if (!row) return json(res, 404, { error: "NOT_FOUND" });
      issueInvitationMail({ kind: "trainer-activation", email: row.email, token: raw, path: "/ogretmen-aktivasyon" });
      return json(res, 200, { application: { id: row.id, status: row.status }, invitationIssued: true, expiresAt: row.expiresAt });
    }
    if (path.endsWith("/admin-invitations")) {
      if (!principal.memberships.some((m) => m.role === "OWNER")) return json(res, 403, { error: "OWNER_ONLY" });
      const email = String(b.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return json(res, 400, { error: "INVALID_EMAIL" });
      const raw = newInvitationToken();
      const hash = hashInvitationToken(raw);
      const row = (await pool.query("insert into admin_invitations(email,intended_role,token_hash,expires_at,created_by) values($1,'SUPER_ADMIN',$2,now()+interval '48 hours',$3) returning id,email,intended_role,expires_at as \"expiresAt\"", [email, hash, principal.user.id])).rows[0];
      issueInvitationMail({ kind: "admin-invitation", email, token: raw, path: "/admin-davet-kabul" });
      return json(res, 201, { invitation: { ...row, singleUse: true } });
    }
    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    if (error?.code === "23505") return json(res, 409, { error: "INVITATION_ALREADY_EXISTS" });
    return json(res, 503, { error: "LIFECYCLE_UNAVAILABLE" });
  } finally { await pool.end(); }
}
