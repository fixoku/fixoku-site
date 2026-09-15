/* global process */
import pg from "pg";
import { createAuthAccount } from "./invitations.js";

/**
 * Controlled first-owner bootstrap for an operator-run process. This function
 * deliberately has no HTTP route and refuses to run unless the explicit
 * bootstrap guard is present. Passwords are accepted only in memory.
 */
export async function bootstrapOwner({ email, name, password, env = process.env } = {}) {
  if (String(env.FIXOKU_OWNER_BOOTSTRAP || "") !== "1" || String(env.FIXOKU_OWNER_BOOTSTRAP_CONFIRM || "") !== "I_UNDERSTAND") {
    const error = new Error("OWNER_BOOTSTRAP_EXPLICIT_GUARD_REQUIRED"); error.code = "OWNER_BOOTSTRAP_EXPLICIT_GUARD_REQUIRED"; throw error;
  }
  if (!email || !password || String(password).length < 12) {
    const error = new Error("OWNER_BOOTSTRAP_INPUT_INVALID"); error.code = "OWNER_BOOTSTRAP_INPUT_INVALID"; throw error;
  }
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  try {
    const owner = await pool.query("select 1 from platform_memberships where role='OWNER' and status='ACTIVE' limit 1");
    if (owner.rowCount) { const error = new Error("OWNER_ALREADY_EXISTS"); error.code = "OWNER_ALREADY_EXISTS"; throw error; }
    const existing = await pool.query("select 1 from \"user\" where lower(email)=lower($1) limit 1", [email]);
    if (existing.rowCount) { const error = new Error("OWNER_BOOTSTRAP_EMAIL_IN_USE"); error.code = "OWNER_BOOTSTRAP_EMAIL_IN_USE"; throw error; }
    const user = await createAuthAccount({ email: String(email).trim().toLowerCase(), name: String(name || "Fixoku Owner").trim(), password: String(password) });
    const platform = (await pool.query("select id from platform_users where auth_user_id=$1", [user.id])).rows[0];
    if (!platform?.id) throw new Error("OWNER_BOOTSTRAP_PLATFORM_MAPPING_MISSING");
    await pool.query("update platform_memberships set status='REVOKED',updated_at=now() where user_id=$1 and role='STUDENT'", [platform.id]);
    await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'GLOBAL',null,'OWNER','ACTIVE') on conflict (user_id,scope_type,scope_id,role) do update set status='ACTIVE',updated_at=now()", [platform.id]);
    await pool.query("update \"user\" set email_verified=true,updated_at=now() where id=$1", [user.id]);
    await pool.query("update platform_users set email_verified=true,updated_at=now() where id=$1", [platform.id]);
    return { userId: platform.id, authUserId: user.id, email: user.email, role: "OWNER" };
  } finally { await pool.end(); }
}
