import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
import { fields, selectProducts } from "../products.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "product.manage"); if (denied) return json(res, denied.status, denied.body);
  const id = String(req.query?.id || req.url?.split("/").pop()?.split("?")[0] || ""); if (!/^[0-9a-f-]{36}$/iu.test(id)) return json(res, 400, { error: "PRODUCT_ID_INVALID" });
  if (!["GET", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const current = (await pool.query("select * from physical_products where id=$1", [id])).rows[0]; if (!current) return json(res, 404, { error: "PRODUCT_NOT_FOUND" });
    if (req.method === "GET") { const product = (await pool.query(`${selectProducts} where id=$1`, [id])).rows[0]; const movements = product.productType === "PHYSICAL" ? (await pool.query(`select id,movement_type as "movementType",quantity,source_type as "sourceType",source_id as "sourceId",idempotency_key as "idempotencyKey",occurred_at as "occurredAt" from inventory_movements where physical_product_id=$1 order by occurred_at desc limit 100`, [id])).rows : []; return json(res, 200, { product, movements }); }
    const input = await read(req);
    // SKU, product type, and R6 type are canonical identities referenced by
    // package components and historical order snapshots.  A product edit may
    // change descriptive/commercial fields, but it must never silently turn a
    // published package's component into another product type or identity.
    if (input.sku !== undefined && String(input.sku).trim().toUpperCase() !== String(current.sku).trim().toUpperCase()) return json(res, 409, { error: "PRODUCT_IDENTITY_IMMUTABLE" });
    if (input.productType !== undefined && String(input.productType).trim().toUpperCase() !== String(current.product_type).trim().toUpperCase()) return json(res, 409, { error: "PRODUCT_IDENTITY_IMMUTABLE" });
    const requestedR6Type = input.r6ProductType === null || input.r6ProductType === "" ? null : String(input.r6ProductType).trim().toUpperCase();
    const currentR6Type = current.r6_product_type == null ? null : String(current.r6_product_type).trim().toUpperCase();
    if (input.r6ProductType !== undefined && requestedR6Type !== currentR6Type) return json(res, 409, { error: "PRODUCT_IDENTITY_IMMUTABLE" });
    if (input.stageScopes !== undefined && (!Array.isArray(input.stageScopes) || input.stageScopes.length < 1 || input.stageScopes.some((s) => !["PRIMARY","MIDDLE","HIGH","ADULT"].includes(s)))) return json(res,400,{error:"PRODUCT_STAGES_INVALID"});
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Lock the canonical row before deriving the update so a concurrent
      // Owner edit cannot overwrite a newer product or stage-scope change.
      const lockedCurrent = (await client.query("select * from physical_products where id=$1 for update", [id])).rows[0];
      if (!lockedCurrent) throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { status: 404 });
      if (input.sku !== undefined && String(input.sku).trim().toUpperCase() !== String(lockedCurrent.sku).trim().toUpperCase()) throw Object.assign(new Error("PRODUCT_IDENTITY_IMMUTABLE"), { status: 409 });
      if (input.productType !== undefined && String(input.productType).trim().toUpperCase() !== String(lockedCurrent.product_type).trim().toUpperCase()) throw Object.assign(new Error("PRODUCT_IDENTITY_IMMUTABLE"), { status: 409 });
      if (input.r6ProductType !== undefined) {
        const lockedR6Type = lockedCurrent.r6_product_type == null ? null : String(lockedCurrent.r6_product_type).trim().toUpperCase();
        if (requestedR6Type !== lockedR6Type) throw Object.assign(new Error("PRODUCT_IDENTITY_IMMUTABLE"), { status: 409 });
      }
      const merged = fields({ sku: input.sku ?? lockedCurrent.sku, title: input.title ?? lockedCurrent.title, description: input.description ?? lockedCurrent.description, productType: input.productType ?? lockedCurrent.product_type, stockLocation: input.stockLocation ?? lockedCurrent.stock_location, weightGrams: input.weightGrams ?? lockedCurrent.weight_grams, dimensionsJson: input.dimensionsJson ?? lockedCurrent.dimensions_json, lowStockThreshold: input.lowStockThreshold ?? lockedCurrent.low_stock_threshold, costMinor: input.costMinor ?? lockedCurrent.cost_minor, currency: input.currency ?? lockedCurrent.currency, imageReference: input.imageReference ?? lockedCurrent.image_reference, isActive: input.isActive ?? lockedCurrent.is_active, r6ProductType: input.r6ProductType ?? lockedCurrent.r6_product_type, listGrossMinor: input.listGrossMinor ?? lockedCurrent.list_gross_minor, vatRateBps: input.vatRateBps ?? lockedCurrent.vat_rate_bps, defaultAccessDays: input.defaultAccessDays ?? lockedCurrent.default_access_days, serviceType: input.serviceType ?? lockedCurrent.service_type, serviceMode: input.serviceMode ?? lockedCurrent.service_mode, minStudents: input.minStudents ?? lockedCurrent.min_students, maxStudents: input.maxStudents ?? lockedCurrent.max_students });
      if (lockedCurrent.product_type === "PHYSICAL" && merged.productType !== "PHYSICAL" && (Number(lockedCurrent.on_hand) !== 0 || Number(lockedCurrent.reserved) !== 0)) throw Object.assign(new Error("PHYSICAL_STOCK_MUST_BE_ZERO"), { status: 409 });
      await client.query(`update physical_products set sku=$1,title=$2,description=$3,product_type=$4,is_active=$5,weight_grams=$6,dimensions_json=$7,stock_location=$8,low_stock_threshold=$9,cost_minor=$10,currency=$11,image_reference=$12,r6_product_type=$13,list_gross_minor=$14,vat_rate_bps=$15,default_access_days=$16,service_type=$17,service_mode=$18,min_students=$19,max_students=$20,updated_at=now() where id=$21`, [merged.sku, merged.title, merged.description, merged.productType, merged.isActive, merged.weightGrams, merged.dimensionsJson, merged.stockLocation, merged.lowStockThreshold, merged.costMinor, merged.currency, merged.imageReference, merged.r6ProductType, merged.listGrossMinor, merged.vatRateBps, merged.defaultAccessDays, merged.serviceType, merged.serviceMode, merged.minStudents, merged.maxStudents, id]);
      if (input.stageScopes !== undefined) {
        await client.query("delete from r6_product_stage_scopes where physical_product_id=$1",[id]);
        for (const stage of [...new Set(input.stageScopes)]) await client.query("insert into r6_product_stage_scopes(physical_product_id,education_stage) values($1,$2::education_stage)",[id,stage]);
      }
      await client.query("commit");
    } catch(error) { await client.query("rollback").catch(()=>{}); throw error; }
    finally { client.release(); }
    return json(res, 200, { product: (await pool.query(`${selectProducts} where id=$1`, [id])).rows[0] });
  } catch (error) { return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "SKU_ALREADY_EXISTS" : error.message || "PRODUCT_UPDATE_FAILED" }); } finally { await pool.end(); }
}
