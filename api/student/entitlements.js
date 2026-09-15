import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { listBeneficiaries, resolveBeneficiary } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headersOf = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Catalog availability and beneficiary ownership are returned as separate server-derived state. */
export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headersOf(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  if (!principal.user) return json(res, 403, { error: "FORBIDDEN" });
  const role = principal.memberships.some((m) => m.role === "GUARDIAN") ? "GUARDIAN" : principal.memberships.find((m) => m.role === "STUDENT")?.role;
  if (!role) return json(res, 403, { error: "FORBIDDEN" });
  const requested = new URL(req.url, "http://local").searchParams.get("studentProfileId");
  if (requested && !uuid.test(requested)) return json(res, 400, { error: "INVALID_STUDENT_PROFILE_ID" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    let studentProfileId = requested;
    if (role === "GUARDIAN" && !studentProfileId) {
      studentProfileId = (await client.query("select sp.id from guardian_profiles gp join guardian_student_relationships gsr on gsr.guardian_user_id=gp.user_id and gsr.status='ACTIVE' join student_profiles sp on sp.id=gsr.student_profile_id and sp.status='ACTIVE' where gp.user_id=$1 and gp.status='ACTIVE' order by sp.id limit 1", [principal.user.id])).rows[0]?.id || null;
    }
    const students = await listBeneficiaries(client, principal);
    const beneficiary = await resolveBeneficiary(client, principal, studentProfileId);
    const rows = (await client.query("select pv.id as \"packageVersionId\",pv.package_id as \"packageId\",pv.version_number as \"versionNumber\",pv.title,pv.description,pv.price_minor as \"priceMinor\",pv.currency,p.status as \"packageStatus\",pv.status as \"versionStatus\",ped.delivery_mode as \"deliveryMode\",pe.id as \"entitlementId\",pe.status as \"entitlementStatus\",pe.effective_at as \"effectiveAt\",pe.revoked_at as \"revokedAt\",pe.expires_at as \"expiresAt\",po.id as \"pendingOrderId\" from package_versions pv join packages p on p.id=pv.package_id left join package_entitlement_definitions ped on ped.package_version_id=pv.id left join lateral (select pe1.id,pe1.status,pe1.effective_at,pe1.revoked_at,pe1.expires_at from package_entitlements pe1 where pe1.package_version_id=pv.id and pe1.beneficiary_student_user_id=$1 order by case when pe1.status='ACTIVE' then 0 when pe1.status='REVOKED' then 1 else 2 end,pe1.effective_at desc limit 1) pe on true left join lateral (select o.id from orders o join order_items oi on oi.order_id=o.id where o.beneficiary_student_user_id=$1 and o.status='PENDING_PAYMENT' and oi.package_version_id=pv.id order by o.created_at desc limit 1) po on true where p.audience='STUDENT' and ((pv.status='PUBLISHED' and p.status='PUBLISHED') or pe.id is not null) order by pv.title,pv.version_number desc", [beneficiary.studentUserId])).rows;
    await client.query("commit");
    const packageMap = new Map(); for (const row of rows) { const existing = packageMap.get(row.packageVersionId); if (!existing) packageMap.set(row.packageVersionId, { ...row, id: row.packageVersionId, deliveryMode: row.deliveryMode || "SELF_PACED", accessState: row.entitlementStatus === "ACTIVE" ? "OWNED" : row.entitlementStatus === "REVOKED" ? "REVOKED" : row.entitlementStatus === "EXPIRED" ? "EXPIRED" : row.pendingOrderId ? "PENDING_PAYMENT" : "AVAILABLE" }); else if (row.deliveryMode && existing.deliveryMode !== row.deliveryMode) existing.deliveryMode = "HYBRID"; }
    return json(res, 200, { role, context: { studentProfileId: beneficiary.studentProfileId, studentUserId: beneficiary.studentUserId, studentName: beneficiary.studentName }, students: role === "GUARDIAN" ? students.map(({ studentProfileId, studentName }) => ({ studentProfileId, name: studentName })) : [], packages: [...packageMap.values()] });
  } catch (error) { try { await client.query("rollback"); } catch { /* preserve original */ } return json(res, error.status || 409, { error: error.code || error.message || "ENTITLEMENTS_READ_FAILED" }); } finally { client.release(); await pool.end(); }
}
