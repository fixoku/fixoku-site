import pg from "pg";
import { createAuthAccount, hashInvitationToken } from "../src/server/auth/invitations.js";

const json = (r, s, b) => { r.statusCode = s; r.setHeader("Content-Type", "application/json; charset=utf-8"); r.setHeader("Cache-Control", "no-store"); r.setHeader("X-Content-Type-Options", "nosniff"); r.end(JSON.stringify(b)); };
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const c of req) raw += c; return raw ? JSON.parse(raw) : {}; }
async function markEmailVerified(pool, authUserId, platformUserId) {
  await pool.query("update \"user\" set email_verified=true,updated_at=now() where id=$1", [authUserId]);
  await pool.query("update platform_users set email_verified=true,updated_at=now() where id=$1", [platformUserId]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  let body;
  try { body = await read(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
  const path = new URL(req.url || "http://local", "http://local").pathname;
  const kind = path.endsWith("/admin-invitation-accept") ? "admin" : path.endsWith("/trainer-invitation-accept") ? "trainer" : path.endsWith("/invitation-accept") ? String(body.kind || "").toLowerCase() : "";
  if (!kind || !["admin", "trainer"].includes(kind)) return json(res, 404, { error: "INVITATION_ROUTE_NOT_FOUND" });
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (token.length < 20 || password.length < 8) return json(res, 400, { error: "INVITATION_INPUT_INVALID" });
  const hash = hashInvitationToken(token);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const invite = kind === "admin"
      ? (await pool.query("update admin_invitations set used_at=now() where token_hash=$1 and used_at is null and expires_at>now() returning id,email,intended_role", [hash])).rows[0]
      : (await pool.query("update trainer_applications set invitation_used_at=now() where invitation_token_hash=$1 and invitation_used_at is null and invitation_expires_at>now() and status='APPROVED' returning id,email,first_name,last_name", [hash])).rows[0];
    if (!invite) return json(res, 400, { error: "INVITATION_INVALID_OR_USED" });
    const email = String(invite.email).toLowerCase();
    const suppliedEmail = String(body.email || email).trim().toLowerCase();
    if (suppliedEmail !== email) {
      if (kind === "admin") await pool.query("update admin_invitations set used_at=null where token_hash=$1 and used_at is not null", [hash]);
      else await pool.query("update trainer_applications set invitation_used_at=null where invitation_token_hash=$1 and invitation_used_at is not null", [hash]);
      return json(res, 400, { error: "INVITATION_EMAIL_MISMATCH" });
    }
    let user;
    try {
      user = await createAuthAccount({ email, name: String(body.name || `${invite.first_name || "Fixoku"} ${invite.last_name || "kullanıcısı"}`).trim(), password });
    } catch (error) {
      // Roll the one-time marker back when account creation failed, so a
      // transient SMTP/database issue does not burn a valid invitation.
      if (kind === "admin") await pool.query("update admin_invitations set used_at=null where token_hash=$1 and used_at is not null", [hash]);
      else await pool.query("update trainer_applications set invitation_used_at=null where invitation_token_hash=$1 and invitation_used_at is not null", [hash]);
      if (error?.status === 409 || error?.status === 422) return json(res, 409, { error: "ACCOUNT_ALREADY_EXISTS" });
      return json(res, 503, { error: "ACCOUNT_ACTIVATION_UNAVAILABLE" });
    }
    const platform = (await pool.query("select id from platform_users where auth_user_id=$1", [user.id])).rows[0];
    if (!platform?.id) return json(res, 503, { error: "ACCOUNT_PLATFORM_MAPPING_MISSING" });
    await pool.query("update platform_memberships set status='REVOKED',updated_at=now() where user_id=$1 and role='STUDENT'", [platform.id]);
    if (kind === "admin") {
      await pool.query("update platform_memberships set role='SUPER_ADMIN',scope_type='GLOBAL',scope_id=null,status='ACTIVE',updated_at=now() where user_id=$1", [platform.id]);
    } else {
      await pool.query("update platform_memberships set role='TRAINER',scope_type='TRAINER',scope_id=$1,status='ACTIVE',updated_at=now() where user_id=$1", [platform.id]);
      await pool.query("insert into trainer_profiles(user_id,first_name,last_name) values($1,$2,$3) on conflict(user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,updated_at=now()", [platform.id, invite.first_name || null, invite.last_name || null]);
    }
    await markEmailVerified(pool, user.id, platform.id);
    if (kind === "trainer") await pool.query("update trainer_applications set invitation_token_hash=null,invitation_expires_at=null,updated_at=now() where id=$1", [invite.id]);
    return json(res, 200, { success: true, role: kind === "admin" ? "SUPER_ADMIN" : "TRAINER", emailVerified: true });
  } catch (error) {
    if (error?.code === "23505") return json(res, 409, { error: "ACCOUNT_ALREADY_EXISTS" });
    return json(res, 503, { error: "ACCOUNT_ACTIVATION_UNAVAILABLE" });
  } finally { await pool.end(); }
}
