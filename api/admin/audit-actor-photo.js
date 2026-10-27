import pg from "pg";
import { resolvePrincipal, requirePermission, validScopeType } from "../../src/server/auth/authorization.js";
import { getProfileMediaConfig, readProfilePhoto } from "../../src/server/domain/profile-media.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = req => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
const authorized = principal => principal?.memberships?.some(m => ["OWNER", "SUPER_ADMIN"].includes(m.role) && validScopeType(m) && m.scopeType === "GLOBAL" && m.scopeId == null);

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "audit.read");
    if (denied) return json(res, denied.status, denied.body);
    if (!authorized(principal)) return json(res, 403, { error: "FORBIDDEN" });
    const url = new URL(req.url || "/api/admin/audit-actor-photo", "http://local");
    const userId = url.searchParams.get("userId") || "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return json(res, 400, { error: "INVALID_USER_ID" });
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 1 });
    let photoKey = null;
    try {
      const found = await pool.query(`select
        coalesce((select tp.photo_storage_key from trainer_profiles tp where tp.user_id=$1),
                 (select sp.photo_storage_key from student_profiles sp where sp.user_id=$1)) as key
        where exists(select 1 from platform_audit_events ae where ae.actor_user_id=$1)`, [userId]);
      photoKey = found.rows[0]?.key || null;
    } finally { await pool.end(); }
    if (!photoKey) return json(res, 404, { error: "PHOTO_NOT_FOUND" });
    const media = await readProfilePhoto(getProfileMediaConfig(), photoKey);
    if (!media) return json(res, 404, { error: "PHOTO_NOT_FOUND" });
    if (!["image/jpeg", "image/png", "image/webp"].includes(media.mime)) return json(res, 415, { error: "UNSUPPORTED_IMAGE" });
    res.statusCode = 200;
    res.setHeader("Content-Type", media.mime);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");
    res.end(media.buffer);
  } catch {
    return json(res, 503, { error: "PHOTO_UNAVAILABLE" });
  }
}
