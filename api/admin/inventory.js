import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]));
const TYPES = new Set(["RECEIPT", "RESERVATION", "RELEASE", "SHIPMENT", "RETURN", "ADJUSTMENT", "DAMAGE"]);

function applyMovement(product, input) {
  const quantity = Number(input.quantity); const type = String(input.movementType || "").toUpperCase();
  let onHand = Number(product.on_hand); let reserved = Number(product.reserved);
  if (type === "RECEIPT" || type === "RETURN") onHand += quantity;
  if (type === "RESERVATION") reserved += quantity;
  if (type === "RELEASE") reserved -= quantity;
  if (type === "DAMAGE") onHand -= quantity;
  if (type === "SHIPMENT") { onHand -= quantity; reserved -= Math.min(reserved, quantity); }
  if (type === "ADJUSTMENT") onHand += input.direction === "DECREASE" ? -quantity : quantity;
  if (onHand < 0 || reserved < 0 || reserved > onHand) throw Object.assign(new Error("STOCK_UNDERFLOW"), { status: 409 });
  return { onHand, reserved, available: onHand - reserved };
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "user.manage"); if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (req.method === "GET") {
      const productId = new URL(req.url, "http://local").searchParams.get("physicalProductId");
      const params = productId ? [productId] : []; const where = productId ? "where m.physical_product_id=$1" : "";
      const movements = (await pool.query(`select m.id,m.physical_product_id as "physicalProductId",p.sku,p.title,m.movement_type as "movementType",m.quantity,m.source_type as "sourceType",m.source_id as "sourceId",m.idempotency_key as "idempotencyKey",m.actor_user_id as "actorUserId",m.occurred_at as "occurredAt" from inventory_movements m join physical_products p on p.id=m.physical_product_id ${where} order by m.occurred_at desc limit 250`, params)).rows;
      return json(res, 200, { movements });
    }
    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    let input; try { input = await body(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
    const quantity = Number(input.quantity); const movementType = String(input.movementType || "").toUpperCase(); const idempotencyKey = String(input.idempotencyKey || "").trim();
    if (!/^[0-9a-f-]{36}$/iu.test(String(input.physicalProductId || "")) || !Number.isSafeInteger(quantity) || quantity <= 0 || !TYPES.has(movementType) || !idempotencyKey || idempotencyKey.length > 180) return json(res, 400, { error: "PRODUCT_MOVEMENT_AND_IDEMPOTENCY_REQUIRED" });
    if (movementType === "ADJUSTMENT" && !["INCREASE", "DECREASE"].includes(input.direction)) return json(res, 400, { error: "ADJUSTMENT_DIRECTION_REQUIRED" });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const existing = (await client.query("select id,physical_product_id,movement_type,quantity from inventory_movements where idempotency_key=$1 for update", [idempotencyKey])).rows[0];
      if (existing) { if (String(existing.physical_product_id) !== String(input.physicalProductId) || existing.movement_type !== movementType || Number(existing.quantity) !== quantity) throw Object.assign(new Error("IDEMPOTENCY_CONFLICT"), { status: 409 }); const current = (await client.query("select on_hand,reserved,on_hand-reserved as available from physical_products where id=$1", [input.physicalProductId])).rows[0]; await client.query("commit"); return json(res, 200, { status: "REPLAYED", movementId: existing.id, onHand: current.on_hand, reserved: current.reserved, available: current.available }); }
      const product = (await client.query("select * from physical_products where id=$1 for update", [input.physicalProductId])).rows[0]; if (!product) throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { status: 404 });
      const next = applyMovement(product, { ...input, quantity, movementType });
      const movement = (await client.query("insert into inventory_movements(physical_product_id,movement_type,quantity,source_type,source_id,idempotency_key,actor_user_id) values($1,$2,$3,$4,$5,$6,$7) returning id", [input.physicalProductId, movementType, quantity, String(input.sourceType || "ADMIN"), String(input.sourceId || "manual"), idempotencyKey, principal.user.id])).rows[0];
      await client.query("update physical_products set on_hand=$1,reserved=$2,updated_at=now() where id=$3", [next.onHand, next.reserved, input.physicalProductId]);
      await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'inventory.movement.recorded','physical_product',$2,'SUCCESS',gen_random_uuid(),$3)", [principal.user.id, input.physicalProductId, JSON.stringify({ movementId: movement.id, movementType, quantity, direction: input.direction || null, sourceType: input.sourceType || "ADMIN", sourceId: input.sourceId || "manual" })]);
      await client.query("commit"); return json(res, 200, { status: "RECORDED", movementId: movement.id, ...next });
    } catch (error) { try { await client.query("rollback"); } catch { /* preserve original */ } return json(res, error.status || (error.code === "23505" ? 409 : 400), { error: error.code === "23505" ? "DUPLICATE_MOVEMENT" : error.message || "INVENTORY_FAILED" }); } finally { client.release(); }
  } finally { await pool.end(); }
}

export { applyMovement };
