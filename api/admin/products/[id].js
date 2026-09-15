import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
import { fields } from "../products.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function read(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage"); if (denied) return json(res, denied.status, denied.body);
  const id = String(req.query?.id || req.url?.split("/").pop()?.split("?")[0] || ""); if (!/^[0-9a-f-]{36}$/iu.test(id)) return json(res, 400, { error: "PRODUCT_ID_INVALID" });
  if (req.method !== "GET" && req.method !== "PATCH") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") { const product = (await pool.query(`select id,sku,title,product_type as "productType",is_active as "isActive",weight_grams as "weightGrams",dimensions_json as "dimensionsJson",stock_location as "stockLocation",on_hand as "onHand",reserved,on_hand-reserved as available,low_stock_threshold as "lowStockThreshold",cost_minor as "costMinor",currency from physical_products where id=$1`, [id])).rows[0]; if (!product) return json(res, 404, { error: "PRODUCT_NOT_FOUND" }); const movements = (await pool.query(`select id,movement_type as "movementType",quantity,source_type as "sourceType",source_id as "sourceId",idempotency_key as "idempotencyKey",occurred_at as "occurredAt" from inventory_movements where physical_product_id=$1 order by occurred_at desc limit 100`, [id])).rows; return json(res, 200, { product, movements }); }
    const input = await read(req);
    const current = (await pool.query("select * from physical_products where id=$1", [id])).rows[0]; if (!current) return json(res, 404, { error: "PRODUCT_NOT_FOUND" });
    const merged = fields({ sku: input.sku ?? current.sku, title: input.title ?? current.title, productType: input.productType ?? current.product_type, stockLocation: input.stockLocation ?? current.stock_location, weightGrams: input.weightGrams ?? current.weight_grams, dimensionsJson: input.dimensionsJson ?? current.dimensions_json, lowStockThreshold: input.lowStockThreshold ?? current.low_stock_threshold, costMinor: input.costMinor ?? current.cost_minor, currency: input.currency ?? current.currency, isActive: input.isActive ?? current.is_active });
    const row = (await pool.query(`update physical_products set sku=$1,title=$2,product_type=$3,is_active=$4,weight_grams=$5,dimensions_json=$6,stock_location=$7,low_stock_threshold=$8,cost_minor=$9,currency=$10,updated_at=now() where id=$11 returning id,sku,title,product_type as "productType",is_active as "isActive",weight_grams as "weightGrams",dimensions_json as "dimensionsJson",stock_location as "stockLocation",on_hand as "onHand",reserved,on_hand-reserved as available,low_stock_threshold as "lowStockThreshold",cost_minor as "costMinor",currency`, [merged.sku, merged.title, merged.productType, merged.isActive, merged.weightGrams, merged.dimensionsJson, merged.stockLocation, merged.lowStockThreshold, merged.costMinor, merged.currency, id])).rows[0]; return json(res, 200, { product: row });
  } catch (error) { return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "SKU_ALREADY_EXISTS" : error.message || "PRODUCT_UPDATE_FAILED" }); } finally { await pool.end(); }
}
