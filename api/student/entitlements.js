import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { listBeneficiaries, resolveBeneficiary } from "../../src/server/domain/commerce.js";
import { validateEducationSegment } from "../../src/server/domain/student-segment.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headersOf = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));
const parseJson = (value, yedek) => { try { return JSON.parse(value || ""); } catch { return yedek; } };

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headersOf(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" }); if (!principal.user) return json(res, 403, { error: "FORBIDDEN" });
  const role = principal.memberships.some((membership) => membership.role === "GUARDIAN") ? "GUARDIAN" : principal.memberships.some((membership) => membership.role === "STUDENT") ? "STUDENT" : null; if (!role) return json(res, 403, { error: "FORBIDDEN" });
  const requested = new URL(req.url, "http://local").searchParams.get("childProfileId") || new URL(req.url, "http://local").searchParams.get("studentProfileId");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    const students = await listBeneficiaries(client, principal);
    const beneficiary = await resolveBeneficiary(client, principal, requested || null);
    if (!beneficiary.educationStage) return json(res, 409, { error: "STUDENT_SEGMENT_REQUIRED", profile: { studentProfileId: beneficiary.studentProfileId, educationStage: null, grade: beneficiary.grade } });
    const segment = validateEducationSegment(beneficiary.educationStage, beneficiary.grade);
    const rows = (await client.query(`select p.slug,p.display_order as "displayOrder",p.panel_visible as "panelVisible",p.public_web_visible as "publicWebVisible",p.shipping_price_minor as "shippingFeeMinor",p.physical_product as "requiresShipping",pv.id as "packageVersionId",pv.package_id as "packageId",pv.version_number as "versionNumber",pv.title,pv.short_description as subtitle,pv.description,pv.features_json as "featuresJson",pv.price_minor as "priceMinor",pv.currency,pv.purchase_enabled as "purchaseEnabled",po.id as "pendingOrderId",own.id as "ownershipId",coalesce(json_agg(json_build_object('componentType',pc.component_type,'title',coalesce(pc.display_label,pc.title_snapshot),'titleSnapshot',pc.title_snapshot,'displayLabel',pc.display_label,'productType',prod.product_type,'quantity',pc.quantity,'displayOrder',pc.display_order,'isActive',pc.is_active,'imageReference',prod.image_reference) order by pc.display_order,pc.id) filter (where pc.id is not null and pc.is_active),'[]') as components from packages p join package_versions pv on pv.package_id=p.id left join package_components pc on pc.package_version_id=pv.id left join physical_products prod on prod.id=pc.physical_product_id left join lateral (select o.id from orders o join order_items oi on oi.order_id=o.id where o.beneficiary_student_user_id=$1 and o.status='PENDING_PAYMENT' and oi.package_version_id=pv.id order by o.created_at desc limit 1) po on true left join lateral (select pe.id from package_entitlements pe where pe.beneficiary_student_user_id=$1 and pe.package_version_id=pv.id and pe.status='ACTIVE' limit 1) own on true where p.catalog_scope='STUDENT_COMMERCE' and p.audience='STUDENT' and p.panel_visible=true and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true and p.education_stage=$2::education_stage and ($2::text='ADULT' or p.eligible_grades_json::jsonb @> to_jsonb($3::int)) group by p.id,pv.id,po.id,own.id order by p.display_order,pv.title`, [beneficiary.studentUserId, segment.educationStage, segment.grade])).rows;
    const packages = rows.map((row) => {
      const components = Array.isArray(row.components) ? row.components : parseJson(row.components, []);
      const products = components.filter((item) => item.componentType === "PHYSICAL_PRODUCT");
      const contentItems = components.filter((item) => item.componentType === "TEXT_ITEM");
      return { ...row, features: parseJson(row.featuresJson, []), components, contentItems, products, accessState: row.ownershipId ? "OWNED" : row.pendingOrderId ? "PENDING_PAYMENT" : "AVAILABLE", priceRequired: !Number.isSafeInteger(row.priceMinor) || !row.currency };
    });
    return json(res, 200, { role, context: { ...beneficiary, educationStage: segment.educationStage, grade: segment.grade }, students: role === "GUARDIAN" ? students.map(({ studentProfileId, studentName, educationStage, grade }) => ({ studentProfileId, name: studentName, educationStage, grade })) : [], packages });
  } catch (error) { return json(res, error.status || 409, { error: error.code || error.message || "ENTITLEMENTS_READ_FAILED" }); } finally { client.release(); await pool.end(); }
}
