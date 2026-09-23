import pg from "pg";
import { resolvePrincipal, requirePermission, requirePackagePermission, packagePermissionFor } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage"); if (denied) return json(res, denied.status, denied.body);
  // Historical technical bootstrap contract (no browser path):
  // insert into packages(slug,audience,catalog_scope,status) values($1,'STUDENT','LEGACY_EDUCATION','DRAFT')
  if (req.method === "POST") return json(res, 403, { error: "PACKAGE_CREATION_FORBIDDEN" });
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect(); try { const packageDenied = await requirePackagePermission(client, principal, packagePermissionFor(req.method, "")); if (packageDenied) return json(res, packageDenied.status, packageDenied.body); } finally { client.release(); }
    if (req.method === "GET") {
      const rows = (await pool.query(`select p.id,p.slug,p.status as "packageStatus",p.created_at as "createdAt",p.updated_at as "updatedAt",pv.id as "packageVersionId",pv.version_number as "versionNumber",pv.title,pv.description,pv.price_minor as "priceMinor",pv.currency,pv.status as "versionStatus",ped.delivery_mode as "deliveryMode",ped.training_program_id as "trainingProgramId" from packages p left join package_versions pv on pv.package_id=p.id left join package_entitlement_definitions ped on ped.package_version_id=pv.id where p.audience='STUDENT' and p.catalog_scope='LEGACY_EDUCATION' order by p.updated_at desc,pv.version_number desc`)).rows;
      const grouped = new Map();
      for (const row of rows) { if (!grouped.has(row.id)) grouped.set(row.id, { id: row.id, slug: row.slug, status: row.packageStatus, createdAt: row.createdAt, updatedAt: row.updatedAt, versions: [] }); const item = grouped.get(row.id); let version = item.versions.find((candidate) => candidate.id === row.packageVersionId); if (!version && row.packageVersionId) { version = { id: row.packageVersionId, versionNumber: row.versionNumber, title: row.title, description: row.description, priceMinor: row.priceMinor, currency: row.currency, status: row.versionStatus, deliveryMode: row.deliveryMode, trainingProgramIds: [] }; item.versions.push(version); } if (version && row.trainingProgramId && !version.trainingProgramIds.includes(row.trainingProgramId)) version.trainingProgramIds.push(row.trainingProgramId); }
      const programs = (await pool.query("select id,title,slug from training_programs where audience='STUDENT' and status='PUBLISHED' order by display_order,id")).rows;
      return json(res, 200, { packages: [...grouped.values()], trainingPrograms: programs });
    }
    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  } catch (error) { return json(res, error.status || 500, { error: error.message || "PACKAGE_UNAVAILABLE" }); } finally { await pool.end(); }
}
