import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { UUID_PATTERN, normalizeCurrency } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));
async function readBody(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function validFields(body) {
  const title = String(body.title || "").trim(); const slug = String(body.slug || "").trim().toLowerCase(); const description = String(body.description || "").trim();
  const priceMinor = Number(body.priceMinor); const currency = normalizeCurrency(body.currency || "TRY"); const deliveryMode = String(body.deliveryMode || "");
  const ids = Array.isArray(body.trainingProgramIds) ? [...new Set(body.trainingProgramIds.map(String))] : [];
  if (title.length < 2 || title.length > 180) throw Object.assign(new Error("TITLE_REQUIRED"), { status: 400 });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) throw Object.assign(new Error("SLUG_INVALID"), { status: 400 });
  if (!description || description.length > 4000) throw Object.assign(new Error("DESCRIPTION_REQUIRED"), { status: 400 });
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) throw Object.assign(new Error("PRICE_MINOR_INVALID"), { status: 400 });
  if (!currency) throw Object.assign(new Error("CURRENCY_INVALID"), { status: 400 });
  if (!["SELF_PACED", "TRAINER_LED", "HYBRID"].includes(deliveryMode)) throw Object.assign(new Error("DELIVERY_MODE_INVALID"), { status: 400 });
  if (!ids.length || ids.some((id) => !UUID_PATTERN.test(id))) throw Object.assign(new Error("TRAINING_PROGRAM_REQUIRED"), { status: 400 });
  return { title, slug, description, priceMinor, currency, deliveryMode, ids };
}
async function validatePrograms(client, ids) {
  const rows = (await client.query("select id from training_programs where id=any($1::uuid[]) and audience='STUDENT' and status='PUBLISHED'", [ids])).rows;
  if (rows.length !== ids.length) throw Object.assign(new Error("TRAINING_PROGRAM_UNAVAILABLE"), { status: 409 });
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage"); if (denied) return json(res, denied.status, denied.body);
  if (req.method !== "GET" && req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") {
      const rows = (await pool.query(`select p.id,p.slug,p.status as "packageStatus",p.created_at as "createdAt",p.updated_at as "updatedAt",pv.id as "packageVersionId",pv.version_number as "versionNumber",pv.title,pv.description,pv.price_minor as "priceMinor",pv.currency,pv.status as "versionStatus",ped.delivery_mode as "deliveryMode",ped.training_program_id as "trainingProgramId" from packages p left join package_versions pv on pv.package_id=p.id left join package_entitlement_definitions ped on ped.package_version_id=pv.id order by p.updated_at desc,pv.version_number desc`)).rows;
      const grouped = new Map();
      for (const row of rows) { if (!grouped.has(row.id)) grouped.set(row.id, { id: row.id, slug: row.slug, status: row.packageStatus, createdAt: row.createdAt, updatedAt: row.updatedAt, versions: [] }); const item = grouped.get(row.id); let version = item.versions.find((candidate) => candidate.id === row.packageVersionId); if (!version && row.packageVersionId) { version = { id: row.packageVersionId, versionNumber: row.versionNumber, title: row.title, description: row.description, priceMinor: row.priceMinor, currency: row.currency, status: row.versionStatus, deliveryMode: row.deliveryMode, trainingProgramIds: [] }; item.versions.push(version); } if (version && row.trainingProgramId && !version.trainingProgramIds.includes(row.trainingProgramId)) version.trainingProgramIds.push(row.trainingProgramId); }
      const programs = (await pool.query("select id,title,slug from training_programs where audience='STUDENT' and status='PUBLISHED' order by display_order,id")).rows;
      return json(res, 200, { packages: [...grouped.values()], trainingPrograms: programs });
    }
    const body = await readBody(req); const fields = validFields(body); const client = await pool.connect();
    try { await client.query("begin"); await validatePrograms(client, fields.ids); const packageRow = (await client.query("insert into packages(slug,audience,status) values($1,'STUDENT','DRAFT') returning *", [fields.slug])).rows[0]; const version = (await client.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status) values($1,1,$2,$3,$4,$5,'DRAFT') returning *", [packageRow.id, fields.title, fields.description, fields.priceMinor, fields.currency])).rows[0]; for (const programId of fields.ids) await client.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,$3)", [version.id, programId, fields.deliveryMode]); await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'commerce.package.created','package',$2,'SUCCESS',$3,$4)", [principal.user.id, packageRow.id, crypto.randomUUID(), JSON.stringify({ packageVersionId: version.id, trainingProgramIds: fields.ids })]); await client.query("commit"); return json(res, 201, { package: packageRow, version }); } catch (error) { try { await client.query("rollback"); } catch { /* noop */ } return json(res, error.status || (error.code === "23505" ? 409 : 400), { error: error.code === "23505" ? "SLUG_ALREADY_EXISTS" : error.message || "PACKAGE_CREATE_FAILED" }); } finally { client.release(); }
  } catch (error) { return json(res, error.status || 500, { error: error.message || "PACKAGE_UNAVAILABLE" }); } finally { await pool.end(); }
}
