import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]));
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function fields(input) {
  const productType = String(input.productType || "PHYSICAL").toUpperCase();
  const r6ProductType = input.r6ProductType == null || input.r6ProductType === "" ? null : String(input.r6ProductType).toUpperCase();
  const vatRateBps = input.vatRateBps == null || input.vatRateBps === "" ? (r6ProductType === "BOOK" ? 0 : r6ProductType ? 2000 : null) : Number(input.vatRateBps);
  const listGrossMinor = input.listGrossMinor == null || input.listGrossMinor === "" ? 0 : Number(input.listGrossMinor);
  const defaultAccessDays = input.defaultAccessDays == null || input.defaultAccessDays === "" ? null : Number(input.defaultAccessDays);
  const serviceType = input.serviceType == null || input.serviceType === "" ? null : String(input.serviceType).toUpperCase();
  const serviceMode = input.serviceMode == null || input.serviceMode === "" ? null : String(input.serviceMode).toUpperCase();
  const minStudents = input.minStudents == null || input.minStudents === "" ? null : Number(input.minStudents);
  const maxStudents = input.maxStudents == null || input.maxStudents === "" ? null : Number(input.maxStudents);
  const value = {
    sku: String(input.sku ?? "").trim().toUpperCase(),
    title: String(input.title ?? input.name ?? "").trim(),
    description: String(input.description ?? "").trim(),
    productType,
    stockLocation: productType === "PHYSICAL" ? String(input.stockLocation ?? "").trim() || null : null,
    weightGrams: productType === "PHYSICAL" && input.weightGrams !== null && input.weightGrams !== "" && input.weightGrams !== undefined ? Number(input.weightGrams) : null,
    dimensionsJson: productType === "PHYSICAL" && input.dimensionsJson ? String(input.dimensionsJson) : null,
    lowStockThreshold: productType === "PHYSICAL" && input.lowStockThreshold !== "" && input.lowStockThreshold != null ? Number(input.lowStockThreshold) : 0,
    costMinor: input.costMinor === "" || input.costMinor == null ? 0 : Number(input.costMinor),
    currency: String(input.currency || "TRY").toUpperCase(),
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    imageReference: input.imageReference == null || input.imageReference === "" ? null : String(input.imageReference).trim(),
    r6ProductType, vatRateBps, listGrossMinor, defaultAccessDays, serviceType, serviceMode, minStudents, maxStudents,
  };
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/u.test(value.sku)) throw Object.assign(new Error("SKU_INVALID"), { status: 400 });
  if (value.title.length < 2 || value.title.length > 180) throw Object.assign(new Error("TITLE_REQUIRED"), { status: 400 });
  if (value.description.length > 2000) throw Object.assign(new Error("DESCRIPTION_INVALID"), { status: 400 });
  if (!["PHYSICAL", "SOFTWARE", "SERVICE", "DIGITAL"].includes(value.productType)) throw Object.assign(new Error("PRODUCT_TYPE_INVALID"), { status: 400 });
  if (value.stockLocation && value.stockLocation.length > 120) throw Object.assign(new Error("STOCK_LOCATION_INVALID"), { status: 400 });
  if (value.weightGrams !== null && (!Number.isSafeInteger(value.weightGrams) || value.weightGrams < 0)) throw Object.assign(new Error("WEIGHT_INVALID"), { status: 400 });
  if (!Number.isSafeInteger(value.lowStockThreshold) || value.lowStockThreshold < 0) throw Object.assign(new Error("LOW_STOCK_THRESHOLD_INVALID"), { status: 400 });
  if (!Number.isSafeInteger(value.costMinor) || value.costMinor < 0) throw Object.assign(new Error("COST_MINOR_INVALID"), { status: 400 });
  if (!/^[A-Z]{3}$/u.test(value.currency)) throw Object.assign(new Error("CURRENCY_INVALID"), { status: 400 });
  if (value.r6ProductType !== null && !["BOOK", "SOFTWARE", "TRAINING_SERVICE"].includes(value.r6ProductType)) throw Object.assign(new Error("R6_PRODUCT_TYPE_INVALID"), { status: 400 });
  if (!Number.isSafeInteger(value.listGrossMinor) || value.listGrossMinor < 0) throw Object.assign(new Error("LIST_GROSS_MINOR_INVALID"), { status: 400 });
  if (value.vatRateBps !== null && (!Number.isSafeInteger(value.vatRateBps) || value.vatRateBps < 0 || value.vatRateBps > 10000)) throw Object.assign(new Error("VAT_RATE_BPS_INVALID"), { status: 400 });
  if (value.defaultAccessDays !== null && (!Number.isSafeInteger(value.defaultAccessDays) || value.defaultAccessDays < 1)) throw Object.assign(new Error("ACCESS_DAYS_INVALID"), { status: 400 });
  if (value.serviceMode !== null && !["INDIVIDUAL", "GROUP"].includes(value.serviceMode)) throw Object.assign(new Error("SERVICE_MODE_INVALID"), { status: 400 });
  if (value.minStudents !== null && (!Number.isSafeInteger(value.minStudents) || value.minStudents < 1)) throw Object.assign(new Error("MIN_STUDENTS_INVALID"), { status: 400 });
  if (value.maxStudents !== null && (!Number.isSafeInteger(value.maxStudents) || value.maxStudents < 1 || (value.minStudents !== null && value.maxStudents < value.minStudents))) throw Object.assign(new Error("MAX_STUDENTS_INVALID"), { status: 400 });
  // eslint-disable-next-line no-control-regex
  if (value.imageReference !== null && (value.imageReference.length > 1000 || /[\u0000-\u001f]/u.test(value.imageReference))) throw Object.assign(new Error("IMAGE_REFERENCE_INVALID"), { status: 400 });
  return value;
}

const selectProducts = `select id,sku,title,description,product_type as "productType",r6_product_type as "r6ProductType",list_gross_minor as "listGrossMinor",vat_rate_bps as "vatRateBps",default_access_days as "defaultAccessDays",service_type as "serviceType",service_mode as "serviceMode",min_students as "minStudents",max_students as "maxStudents",legacy_code as "legacyCode",(product_type='PHYSICAL') as "requiresShipping",is_active as "isActive",weight_grams as "weightGrams",dimensions_json as "dimensionsJson",stock_location as "stockLocation",on_hand as "onHand",reserved,on_hand-reserved as available,low_stock_threshold as "lowStockThreshold",cost_minor as "costMinor",currency,image_reference as "imageReference",created_at as "createdAt",updated_at as "updatedAt" from physical_products`;

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "product.manage"); if (denied) return json(res, denied.status, denied.body);
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") return json(res, 200, { products: (await pool.query(`${selectProducts} order by is_active desc,title,sku`)).rows });
    const body = fields(await read(req));
    const row = (await pool.query(`insert into physical_products(sku,title,description,product_type,is_active,weight_grams,dimensions_json,stock_location,low_stock_threshold,cost_minor,currency,image_reference,r6_product_type,list_gross_minor,vat_rate_bps,default_access_days,service_type,service_mode,min_students,max_students) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning id,sku,title,description,product_type as "productType",r6_product_type as "r6ProductType",list_gross_minor as "listGrossMinor",vat_rate_bps as "vatRateBps",default_access_days as "defaultAccessDays",service_type as "serviceType",service_mode as "serviceMode",min_students as "minStudents",max_students as "maxStudents"`, [body.sku, body.title, body.description, body.productType, body.isActive, body.weightGrams, body.dimensionsJson, body.stockLocation, body.lowStockThreshold, body.costMinor, body.currency, body.imageReference, body.r6ProductType, body.listGrossMinor, body.vatRateBps, body.defaultAccessDays, body.serviceType, body.serviceMode, body.minStudents, body.maxStudents])).rows[0];
    return json(res, 201, { product: row });
  } catch (error) { return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "SKU_ALREADY_EXISTS" : error.message || "PRODUCTS_UNAVAILABLE" }); } finally { await pool.end(); }
}

export { fields, selectProducts };
