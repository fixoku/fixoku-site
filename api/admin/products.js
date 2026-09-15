import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)]));
async function read(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function fields(input, partial = false) {
  const value = {
    sku: String(input.sku ?? "").trim().toUpperCase(), title: String(input.title ?? "").trim(),
    productType: String(input.productType || "PHYSICAL").toUpperCase(), stockLocation: String(input.stockLocation ?? "").trim(),
    weightGrams: input.weightGrams === null || input.weightGrams === "" ? null : Number(input.weightGrams),
    dimensionsJson: input.dimensionsJson === null || input.dimensionsJson === "" ? null : String(input.dimensionsJson),
    lowStockThreshold: input.lowStockThreshold === "" || input.lowStockThreshold == null ? 0 : Number(input.lowStockThreshold),
    costMinor: input.costMinor === "" || input.costMinor == null ? 0 : Number(input.costMinor), currency: String(input.currency || "TRY").toUpperCase(),
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
  };
  if ((!partial || input.sku !== undefined) && !/^[A-Z0-9][A-Z0-9._-]{1,63}$/u.test(value.sku)) throw Object.assign(new Error("SKU_INVALID"), { status: 400 });
  if ((!partial || input.title !== undefined) && (value.title.length < 2 || value.title.length > 180)) throw Object.assign(new Error("TITLE_REQUIRED"), { status: 400 });
  if ((!partial || input.stockLocation !== undefined) && value.stockLocation.length > 120) throw Object.assign(new Error("STOCK_LOCATION_INVALID"), { status: 400 });
  if (!["PHYSICAL", "DIGITAL"].includes(value.productType)) throw Object.assign(new Error("PRODUCT_TYPE_INVALID"), { status: 400 });
  if (value.weightGrams !== null && (!Number.isSafeInteger(value.weightGrams) || value.weightGrams < 0)) throw Object.assign(new Error("WEIGHT_INVALID"), { status: 400 });
  if (!Number.isSafeInteger(value.lowStockThreshold) || value.lowStockThreshold < 0) throw Object.assign(new Error("LOW_STOCK_THRESHOLD_INVALID"), { status: 400 });
  if (!Number.isSafeInteger(value.costMinor) || value.costMinor < 0) throw Object.assign(new Error("COST_MINOR_INVALID"), { status: 400 });
  if (!/^[A-Z]{3}$/u.test(value.currency)) throw Object.assign(new Error("CURRENCY_INVALID"), { status: 400 });
  return value;
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage"); if (denied) return json(res, denied.status, denied.body);
  if (req.method !== "GET" && req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") {
      const rows = (await pool.query(`select id,sku,title,product_type as "productType",is_active as "isActive",weight_grams as "weightGrams",dimensions_json as "dimensionsJson",stock_location as "stockLocation",on_hand as "onHand",reserved, on_hand-reserved as available,low_stock_threshold as "lowStockThreshold",cost_minor as "costMinor",currency,created_at as "createdAt",updated_at as "updatedAt" from physical_products order by is_active desc,title,sku`)).rows;
      return json(res, 200, { products: rows });
    }
    const body = fields(await read(req));
    const row = (await pool.query(`insert into physical_products(sku,title,product_type,is_active,weight_grams,dimensions_json,stock_location,low_stock_threshold,cost_minor,currency) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,sku,title,product_type as "productType",is_active as "isActive",weight_grams as "weightGrams",dimensions_json as "dimensionsJson",stock_location as "stockLocation",on_hand as "onHand",reserved,on_hand-reserved as available,low_stock_threshold as "lowStockThreshold",cost_minor as "costMinor",currency`, [body.sku, body.title, body.productType, body.isActive, body.weightGrams, body.dimensionsJson, body.stockLocation, body.lowStockThreshold, body.costMinor, body.currency])).rows[0];
    return json(res, 201, { product: row });
  } catch (error) { return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "SKU_ALREADY_EXISTS" : error.message || "PRODUCTS_UNAVAILABLE" }); } finally { await pool.end(); }
}

export { fields };
