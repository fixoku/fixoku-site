// FIXOKU_022I_PRESERVE_CASE_OPTIONAL_SUBTITLE
import pg from "pg";
import { resolvePrincipal, requirePermission, requirePackagePermission, packagePermissionFor, PACKAGE_PERMISSIONS } from "../../src/server/auth/authorization.js";
import { UUID_PATTERN, normalizeCurrency } from "../../src/server/domain/commerce.js";
import { validateEducationSegment, EDUCATION_STAGE_GRADES } from "../../src/server/domain/student-segment.js";
import { publishPackageVersionsAtomically } from "../../src/server/domain/package-version.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const bad = (code, status = 400) => Object.assign(new Error(code), { code, status });
const parseJson = (value, yedek) => { try { return JSON.parse(value || ""); } catch { return yedek; } };

function packageFields(input) {
  const title = (typeof input.title === "string" ? input.title : "").trim();
  const subtitle = (typeof input.subtitle === "string" ? input.subtitle : "").trim();
  const description = String(input.description || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  const features = Array.isArray(input.features) ? input.features.map((item) => String(item).trim()).filter(Boolean).slice(0, 30) : [];
  const stage = String(input.educationStage || "").toUpperCase();
  const grades = stage === "ADULT" ? [] : [...new Set((Array.isArray(input.eligibleGrades) ? input.eligibleGrades : []).map(Number))].sort((a, b) => a - b);
  validateEducationSegment(stage, stage === "ADULT" ? null : grades[0]);
  if (stage !== "ADULT" && (grades.length < 1 || grades.some((grade) => !EDUCATION_STAGE_GRADES[stage].includes(grade)))) throw bad("ELIGIBLE_GRADES_INVALID");
  const priceMinor = input.priceMinor === null || input.priceMinor === "" || input.priceMinor === undefined ? null : Number(input.priceMinor);
  const currency = input.currency === null || input.currency === "" || input.currency === undefined ? null : normalizeCurrency(input.currency);
  const shippingFeeMinor = Number(input.shippingFeeMinor || 0);
  const displayOrder = Number(input.displayOrder || 0);
  const panelVisible = input.panelVisible === undefined ? true : Boolean(input.panelVisible);
  const publicWebVisible = input.publicWebVisible === undefined ? false : Boolean(input.publicWebVisible);
  const products = Array.isArray(input.products) ? input.products.map((item, index) => ({ productId: String(item.productId || ""), quantity: Number(item.quantity), displayOrder: Number(item.displayOrder ?? index) })) : [];
  if (title.length < 2 || title.length > 180) throw bad("TITLE_REQUIRED");
  if (subtitle.length > 300) throw bad("SUBTITLE_REQUIRED");
  if (description.length > 4000) throw bad("DESCRIPTION_TOO_LONG"); /* FIXOKU_022J_OPTIONAL_DESCRIPTION */
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) throw bad("SLUG_INVALID");
  if (priceMinor !== null && (!Number.isSafeInteger(priceMinor) || priceMinor < 0)) throw bad("PRICE_MINOR_INVALID");
  if ((priceMinor !== null && !currency) || (priceMinor === null && currency !== null)) throw bad("PRICE_CURRENCY_PAIR_REQUIRED");
  if (!Number.isSafeInteger(shippingFeeMinor) || shippingFeeMinor < 0) throw bad("SHIPPING_FEE_INVALID");
  if (!Number.isSafeInteger(displayOrder) || displayOrder < 0) throw bad("DISPLAY_ORDER_INVALID");
  if (products.some((item) => !UUID_PATTERN.test(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || !Number.isSafeInteger(item.displayOrder) || item.displayOrder < 0)) throw bad("PACKAGE_PRODUCT_INVALID");
  if (new Set(products.map((item) => item.productId)).size !== products.length) throw bad("PACKAGE_PRODUCT_DUPLICATE");
  return { title, subtitle, description, slug, features, educationStage: stage, eligibleGrades: grades, priceMinor, currency, shippingFeeMinor, displayOrder, panelVisible, publicWebVisible, products };
}

async function validateProducts(client, items, educationStage = null) {
  if (!items.length) return [];
  const rows = (await client.query("select pp.id,pp.sku,pp.title,pp.description,pp.product_type as \"productType\",pp.r6_product_type as \"r6ProductType\",pp.is_active as \"isActive\",coalesce(array_agg(scope.education_stage::text) filter(where scope.education_stage is not null),'{}') as \"stageScopes\" from physical_products pp left join r6_product_stage_scopes scope on scope.physical_product_id=pp.id where pp.id=any($1::uuid[]) group by pp.id", [items.map((item) => item.productId)])).rows;
  const acceptedTypes = new Set(["PHYSICAL", "SOFTWARE", "SERVICE", "DIGITAL"]);
  if (rows.length !== items.length || rows.some((row) => !row.isActive || !acceptedTypes.has(row.productType) || (educationStage && row.stageScopes.length && !row.stageScopes.includes(educationStage)))) throw bad("PACKAGE_PRODUCT_UNAVAILABLE", 409);
  return items.map((item) => ({ ...item, ...rows.find((row) => row.id === item.productId) }));
}

async function readCatalog(client) {
  const rows = (await client.query(`select p.id,p.slug,p.status,p.icon_reference as "iconReference",p.panel_visible as "panelVisible",p.public_web_visible as "publicWebVisible",p.education_stage as "educationStage",p.eligible_grades_json as "eligibleGradesJson",p.display_order as "displayOrder",p.physical_product as "requiresShipping",p.shipping_price_minor as "shippingFeeMinor",pv.id as "packageVersionId",pv.version_number as "versionNumber",pv.title,pv.short_description as subtitle,pv.description,pv.features_json as "featuresJson",pv.price_minor as "priceMinor",pv.currency,pv.purchase_enabled as "purchaseEnabled",pv.status as "versionStatus",pv.published_at as "publishedAt",pc.id as "componentId",pc.component_type as "componentType",pc.reference_id as "referenceId",pc.physical_product_id as "physicalProductId",pc.display_label as "displayLabel",pc.is_active as "isActive",pc.title_snapshot as "titleSnapshot",pc.quantity,pc.display_order as "componentDisplayOrder",prod.sku as "productSku",prod.title as "productTitle",prod.product_type as "productType",prod.image_reference as "imageReference" from packages p join package_versions pv on pv.package_id=p.id left join package_components pc on pc.package_version_id=pv.id left join physical_products prod on prod.id=coalesce(pc.physical_product_id,pc.reference_id) where p.audience='STUDENT' and p.catalog_scope='STUDENT_COMMERCE' order by p.education_stage,p.display_order,p.id,pv.version_number desc,pc.display_order,pc.id`)).rows;
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, { id: row.id, slug: row.slug, status: row.status, iconReference: row.iconReference, panelVisible: row.panelVisible, publicWebVisible: row.publicWebVisible, educationStage: row.educationStage, eligibleGrades: parseJson(row.eligibleGradesJson, []), displayOrder: row.displayOrder, requiresShipping: row.requiresShipping, shippingFeeMinor: row.shippingFeeMinor, versions: [] });
    const pkg = map.get(row.id);
    let version = pkg.versions.find((item) => item.id === row.packageVersionId);
    if (!version) { version = { id: row.packageVersionId, versionNumber: row.versionNumber, title: row.title, subtitle: row.subtitle, description: row.description, features: parseJson(row.featuresJson, []), priceMinor: row.priceMinor, currency: row.currency, purchaseEnabled: row.purchaseEnabled, status: row.versionStatus, publishedAt: row.publishedAt, products: [], components: [] }; pkg.versions.push(version); }
    if (row.componentId) { const component = { componentId: row.componentId, componentType: row.componentType, productId: row.physicalProductId || row.referenceId, physicalProductId: row.physicalProductId || row.referenceId, sku: row.productSku, title: row.productTitle || row.titleSnapshot, titleSnapshot: row.titleSnapshot, displayLabel: row.displayLabel, isActive: row.isActive, quantity: row.quantity, displayOrder: row.componentDisplayOrder, imageReference: row.imageReference }; version.components.push(component); if (component.productId) version.products.push({ productId: component.productId, sku: component.sku, title: component.title, productType: row.productType, quantity: component.quantity, displayOrder: component.displayOrder, displayLabel: component.displayLabel, isActive: component.isActive }); }
  }
  const products = (await client.query(`select pp.id,pp.sku,pp.title,pp.description,pp.product_type as "productType",pp.r6_product_type as "r6ProductType",pp.list_gross_minor as "listGrossMinor",pp.vat_rate_bps as "vatRateBps",pp.default_access_days as "defaultAccessDays",pp.service_type as "serviceType",pp.service_mode as "serviceMode",pp.min_students as "minStudents",pp.max_students as "maxStudents",(pp.product_type='PHYSICAL') as "requiresShipping",pp.is_active as "isActive",pp.image_reference as "imageReference",coalesce(array_agg(scope.education_stage::text) filter(where scope.education_stage is not null),'{}') as "stageScopes" from physical_products pp left join r6_product_stage_scopes scope on scope.physical_product_id=pp.id where pp.is_active=true group by pp.id order by pp.product_type,pp.title,pp.sku`)).rows;
  return { packages: [...map.values()], products };
}

async function replaceComponents(client, versionId, products) {
  await client.query("update package_components set is_active=false where package_version_id=$1 and component_type in ('PHYSICAL_PRODUCT','DIGITAL_ACCESS','TRAINER_SERVICE')", [versionId]);
  for (const product of products) {
    const componentType = product.productType === "PHYSICAL" ? "PHYSICAL_PRODUCT" : product.productType === "SOFTWARE" || product.productType === "DIGITAL" ? "DIGITAL_ACCESS" : "TRAINER_SERVICE";
    await client.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,$2,$3,$4,$5,$6,true,$7,$8,$9)", [versionId, componentType, componentType === "PHYSICAL_PRODUCT" ? product.id : null, componentType === "PHYSICAL_PRODUCT" ? product.id : null, product.title, product.title, product.quantity, product.displayOrder, JSON.stringify({ sku: product.sku, fulfillmentType: product.productType })]);
  }
}

export async function replaceStructuredComponents(client, versionId, components, educationStage = null) {
  const productIds = components.filter((item) => item.componentType !== "TEXT_ITEM").map((item) => item.physicalProductId || item.productId);
  if (productIds.some((id) => !UUID_PATTERN.test(String(id || "")))) throw bad("PACKAGE_PRODUCT_INVALID");
  if (new Set(productIds).size !== productIds.length) throw bad("PACKAGE_PRODUCT_DUPLICATE", 409);
  const products = productIds.length ? (await client.query("select pp.id,pp.sku,pp.title,pp.product_type as \"productType\",pp.r6_product_type as \"r6ProductType\",pp.is_active as \"isActive\",coalesce(array_agg(scope.education_stage::text) filter(where scope.education_stage is not null),'{}') as \"stageScopes\" from physical_products pp left join r6_product_stage_scopes scope on scope.physical_product_id=pp.id where pp.id=any($1::uuid[]) group by pp.id", [productIds])).rows : [];
  if (products.length !== productIds.length || products.some((item) => !item.isActive || (educationStage && item.stageScopes.length && !item.stageScopes.includes(educationStage)))) throw bad("PACKAGE_PRODUCT_UNAVAILABLE", 409);
  await client.query("delete from package_components where package_version_id=$1", [versionId]);
  for (const [index, item] of components.entries()) {
    const componentType = String(item.componentType || "");
    // The array order is authoritative.  Persist a dense, deterministic order
    // even when a stale client sends duplicate or sparse displayOrder values.
    const displayOrder = index;
    const isActive = item.isActive === undefined ? true : Boolean(item.isActive);
    if (componentType === "TEXT_ITEM") {
      const title = String(item.text ?? item.title ?? "").trim();
      if (!title || title.length > 4000) throw bad("TEXT_ITEM_INVALID");
      await client.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TEXT_ITEM',null,null,$2,null,$3,1,$4,'{}')", [versionId, title, isActive, displayOrder]);
      continue;
    }
    if (!["PHYSICAL_PRODUCT", "DIGITAL_ACCESS", "TRAINER_SERVICE"].includes(componentType)) throw bad("PACKAGE_COMPONENT_TYPE_INVALID");
    const productId = String(item.physicalProductId || item.productId || "");
    if (!UUID_PATTERN.test(productId)) throw bad("PACKAGE_PRODUCT_INVALID");
    const product = products.find((candidate) => candidate.id === productId);
    const quantity = Number(item.quantity);
    const displayLabel = item.displayLabel == null || String(item.displayLabel).trim() === "" ? null : String(item.displayLabel).trim().slice(0, 300);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw bad("PACKAGE_PRODUCT_INVALID");
    const expectedType = product.productType === "PHYSICAL" ? "PHYSICAL_PRODUCT" : product.productType === "SOFTWARE" || product.productType === "DIGITAL" ? "DIGITAL_ACCESS" : "TRAINER_SERVICE";
    if (componentType !== expectedType) throw bad("PACKAGE_COMPONENT_PRODUCT_TYPE_INVALID");
    await client.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [versionId, componentType, productId, componentType === "PHYSICAL_PRODUCT" ? productId : null, product.title, displayLabel, isActive, quantity, displayOrder, JSON.stringify({ sku: product.sku, fulfillmentType: product.productType, r6ProductType: product.r6ProductType })]);
  }
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage"); if (denied) return json(res, denied.status, denied.body);
  if (!["GET", "POST", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    if (req.method === "GET") { const packageDenied = await requirePackagePermission(client, principal, PACKAGE_PERMISSIONS.READ); if (packageDenied) return json(res, packageDenied.status, packageDenied.body); return json(res, 200, await readCatalog(client)); }
    const input = await read(req); const action = String(input.action || "");
    const packageDenied = await requirePackagePermission(client, principal, packagePermissionFor(req.method, action)); if (packageDenied) return json(res, packageDenied.status, packageDenied.body);
    if (req.method === "PATCH" && ["priceMinor", "priceGrossMinor", "currency", "priceNetMinor"].some((field) => Object.prototype.hasOwnProperty.call(input, field))) { const priceDenied = await requirePackagePermission(client, principal, PACKAGE_PERMISSIONS.PRICE_EDIT); if (priceDenied) return json(res, priceDenied.status, priceDenied.body); }
    if (req.method === "POST" && action === "publish") {
      await client.query("begin");
      const target = (await client.query("select pv.id as version_id,pv.package_id,p.slug,p.audience,p.catalog_scope as \"catalogScope\",pv.version_number from package_versions pv join packages p on p.id=pv.package_id where pv.id=$1 and p.audience='STUDENT' and p.catalog_scope='STUDENT_COMMERCE'", [input.versionId])).rows[0];
      if (!target) throw bad("PACKAGE_VERSION_NOT_FOUND", 404);
      const result = await publishPackageVersionsAtomically(client, { targets: [target], principal });
      await client.query("commit"); return json(res, 200, result);
    }
    if (req.method === "POST" && action === "retire") {
      if (!UUID_PATTERN.test(String(input.versionId || ""))) throw bad("PACKAGE_VERSION_ID_INVALID");
      await client.query("begin");
      const target = (await client.query("select pv.id,pv.status,p.audience,p.catalog_scope,p.id as package_id from package_versions pv join packages p on p.id=pv.package_id where pv.id=$1 for update", [input.versionId])).rows[0];
      if (!target || target.audience !== "STUDENT" || target.catalog_scope !== "STUDENT_COMMERCE") throw bad("PACKAGE_VERSION_NOT_FOUND", 404);
      await client.query("select id from packages where id=$1 and audience='STUDENT' and catalog_scope='STUDENT_COMMERCE' for update", [target.package_id]);
      await client.query("update package_versions set status='RETIRED',purchase_enabled=false,updated_at=now() where id=$1", [target.id]);
      await client.query("update packages set status='RETIRED',updated_at=now() where id=$1 and not exists(select 1 from package_versions where package_id=$1 and status='PUBLISHED')", [target.package_id]);
      await client.query("commit");
      return json(res, 200, { retired: true });
    }
    if (req.method === "POST" && action === "createDraft") {
      if (!UUID_PATTERN.test(String(input.packageId || ""))) throw bad("PACKAGE_ID_INVALID");
      await client.query("begin");
      const source = (await client.query("select pv.*,p.audience,p.catalog_scope from package_versions pv join packages p on p.id=pv.package_id where p.id=$1 order by pv.version_number desc limit 1 for update", [input.packageId])).rows[0];
      if (!source || source.audience !== "STUDENT" || source.catalog_scope !== "STUDENT_COMMERCE") throw bad("PACKAGE_NOT_FOUND", 404);
      const existingDraft = (await client.query("select id from package_versions where package_id=$1 and status='DRAFT' for update", [input.packageId])).rows[0];
      if (existingDraft) { await client.query("commit"); return json(res, 200, { packageVersionId: existingDraft.id, existing: true }); }
      const next = Number(source.version_number) + 1;
      const draft = (await client.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,currency,purchase_enabled,status) values($1,$2,$3,$4,$5,$6,$7,$8,false,'DRAFT') returning id", [input.packageId, next, source.title, source.description, source.short_description, source.features_json, source.price_minor, source.currency])).rows[0];
      await client.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) select $1,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json from package_components where package_version_id=$2", [draft.id, source.id]);
      await client.query("commit"); return json(res, 201, { packageVersionId: draft.id });
    }
    if (req.method === "POST" && action === "componentsSave") {
      if (!UUID_PATTERN.test(String(input.packageId || "")) || !UUID_PATTERN.test(String(input.versionId || ""))) throw bad("PACKAGE_ID_INVALID");
      if (!Array.isArray(input.components)) throw bad("PACKAGE_COMPONENTS_REQUIRED");
      await client.query("begin");
      const version = (await client.query("select pv.id,pv.status,p.audience,p.catalog_scope from package_versions pv join packages p on p.id=pv.package_id where pv.id=$1 and p.id=$2 for update", [input.versionId, input.packageId])).rows[0];
      if (!version || version.audience !== "STUDENT" || version.catalog_scope !== "STUDENT_COMMERCE") throw bad("PACKAGE_VERSION_NOT_FOUND", 404);
      if (version.status !== "DRAFT") throw bad("PUBLISHED_VERSION_IMMUTABLE", 409);
      const stage = (await client.query("select p.education_stage as stage from packages p join package_versions pv on pv.package_id=p.id where pv.id=$1", [input.versionId])).rows[0]?.stage || null;
      await replaceStructuredComponents(client, input.versionId, input.components, stage);
      await client.query("commit"); return json(res, 200, { saved: true });
    }
    if (req.method === "POST") throw bad("PACKAGE_CREATION_FORBIDDEN", 403);
    const fields = packageFields(input); const products = await validateProducts(client, fields.products, fields.educationStage);
    const requiresShipping = products.some((item) => item.productType === "PHYSICAL");
    const shippingFeeMinor = requiresShipping ? fields.shippingFeeMinor : 0;
    await client.query("begin");
    if (req.method === "POST") {
      const pkg = (await client.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE',$2::education_stage,$3,$4,'DRAFT',$5,$6,$7) returning id", [fields.slug, fields.educationStage, JSON.stringify(fields.eligibleGrades), fields.displayOrder, requiresShipping, shippingFeeMinor > 0 ? "FIXED_PRICE" : "FREE", shippingFeeMinor])).rows[0];
      const version = (await client.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,currency,purchase_enabled,status) values($1,1,$2,$3,$4,$5,$6,$7,false,'DRAFT') returning id", [pkg.id, fields.title, fields.description, fields.subtitle, JSON.stringify(fields.features), fields.priceMinor, fields.currency])).rows[0];
      await replaceComponents(client, version.id, products); await client.query("commit"); return json(res, 201, { packageId: pkg.id, packageVersionId: version.id });
    }
    if (!UUID_PATTERN.test(String(input.packageId || "")) || !UUID_PATTERN.test(String(input.versionId || ""))) throw bad("PACKAGE_ID_INVALID");
    const version = (await client.query("select pv.status,p.id,p.audience,p.catalog_scope from package_versions pv join packages p on p.id=pv.package_id where pv.id=$1 and p.id=$2 for update", [input.versionId, input.packageId])).rows[0];
    if (!version || version.audience !== "STUDENT" || version.catalog_scope !== "STUDENT_COMMERCE") throw bad("PACKAGE_VERSION_NOT_FOUND", 404);
    if (version.status !== "DRAFT") throw bad("PUBLISHED_VERSION_IMMUTABLE", 409);
    await client.query("update packages set slug=$1,education_stage=$2::education_stage,eligible_grades_json=$3,display_order=$4,physical_product=$5,panel_visible=$6,public_web_visible=$7,shipping_policy=$8,shipping_price_minor=$9,updated_at=now() where id=$10", [fields.slug, fields.educationStage, JSON.stringify(fields.eligibleGrades), fields.displayOrder, requiresShipping, fields.panelVisible, fields.publicWebVisible, shippingFeeMinor > 0 ? "FIXED_PRICE" : "FREE", shippingFeeMinor, input.packageId]);
    const coverReference = String(input.iconReference ?? "").trim();
    if (coverReference && !(coverReference.startsWith("/images/") || /^https:\/\/[^\s]+$/u.test(coverReference)) || coverReference.length > 1000) throw bad("PACKAGE_COVER_URL_INVALID");
    await client.query("update packages set icon_reference=$1 where id=$2 and audience='STUDENT' and catalog_scope='STUDENT_COMMERCE'", [coverReference || null, input.packageId]);
    await client.query("update package_versions set title=$1,short_description=$2,description=$3,features_json=$4,price_minor=$5,currency=$6,purchase_enabled=false,updated_at=now() where id=$7", [fields.title, fields.subtitle, fields.description, JSON.stringify(fields.features), fields.priceMinor, fields.currency, input.versionId]);
    await replaceComponents(client, input.versionId, products); await client.query("commit"); return json(res, 200, { saved: true });
  } catch (error) { try { await client.query("rollback"); } catch { /* preserve */ } return json(res, error.status || (error.code === "23505" ? 409 : 400), { error: error.code === "23505" ? "SLUG_ALREADY_EXISTS" : error.code || error.message || "STUDENT_PACKAGE_MUTATION_FAILED" }); } finally { client.release(); await pool.end(); }
}
