import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function read(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const transitions = { WAITING: ["PREPARING", "CANCELLED"], PREPARING: ["PACKED", "CANCELLED"], PACKED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED", "RETURNED"], DELIVERED: ["RETURNED"], RETURNED: [], CANCELLED: [] };

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "user.manage"); if (denied) return json(res, denied.status, denied.body);
  const id = String(req.query?.id || req.url?.split("/").pop()?.split("?")[0] || ""); if (!/^[0-9a-f-]{36}$/iu.test(id)) return json(res, 400, { error: "SHIPMENT_ID_INVALID" });
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PATCH") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    const shipment = (await client.query("select s.*,s.order_id as \"orderId\",s.beneficiary_student_user_id as \"beneficiaryStudentUserId\",s.address_snapshot_json as \"addressSnapshotJson\",s.tracking_number as \"trackingNumber\",s.label_reference as \"labelReference\",s.shipping_charge_minor as \"shippingChargeMinor\",s.actual_shipping_cost_minor as \"actualShippingCostMinor\",s.provider_enabled as \"providerEnabled\",s.shipped_at as \"shippedAt\",s.delivered_at as \"deliveredAt\" from shipments s where s.id=$1", [id])).rows[0]; if (!shipment) return json(res, 404, { error: "SHIPMENT_NOT_FOUND" });
    const items = (await client.query("select si.id,si.physical_product_id as \"physicalProductId\",si.quantity,si.title_snapshot as \"titleSnapshot\",p.sku,p.on_hand as \"onHand\",p.reserved,p.on_hand-p.reserved as available from shipment_items si join physical_products p on p.id=si.physical_product_id where si.shipment_id=$1 order by si.id", [id])).rows;
    if (req.method === "GET") return json(res, 200, { shipment: { ...shipment, items }, provider: { name: process.env.SHIPPING_PROVIDER || "DISABLED", runtime: process.env.SHIPPING_TOKEN ? "CONFIGURED" : "CONFIG_REQUIRED" } });
    const input = await read(req); if (req.method === "PATCH") { const carrier = input.carrier === undefined ? shipment.carrier : String(input.carrier || "").trim() || null; const trackingNumber = input.trackingNumber === undefined ? shipment.tracking_number : String(input.trackingNumber || "").trim() || null; const labelReference = input.labelReference === undefined ? shipment.label_reference : String(input.labelReference || "").trim() || null; const row = (await client.query("update shipments set carrier=$1,tracking_number=$2,label_reference=$3,updated_at=now() where id=$4 returning id,carrier,tracking_number as \"trackingNumber\",label_reference as \"labelReference\"", [carrier, trackingNumber, labelReference, id])).rows[0]; await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'shipment.details.updated','shipment',$2,'SUCCESS',gen_random_uuid(),$3)",[principal.user.id,id,JSON.stringify({carrier,trackingNumber,labelReference})]); return json(res,200,{shipment:row}); }
    const nextStatus = String(input.status || input.action || "").toUpperCase(); if (!transitions[shipment.status]?.includes(nextStatus)) { if (shipment.status === nextStatus) return json(res, 200, { status: "REPLAYED", shipment: { id, status: shipment.status } }); return json(res, 409, { error: "INVALID_SHIPMENT_TRANSITION", from: shipment.status, to: nextStatus }); }
    await client.query("begin");
    if (["SHIPPED", "RETURNED", "CANCELLED"].includes(nextStatus)) {
      for (const item of items) {
        const movementType = nextStatus === "SHIPPED" ? "SHIPMENT" : nextStatus === "RETURNED" ? "RETURN" : "RELEASE";
        const movementKey = `SHIPMENT:${id}:${item.id}:${movementType}`;
        const exists = (await client.query("select id from inventory_movements where idempotency_key=$1", [movementKey])).rows[0];
        if (exists) continue;
        const product = (await client.query("select on_hand,reserved from physical_products where id=$1 for update", [item.physicalProductId])).rows[0]; if (!product) throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { status: 409 });
        let onHand = Number(product.on_hand); let reserved = Number(product.reserved); const qty = Number(item.quantity);
        if (movementType === "SHIPMENT") { onHand -= qty; reserved -= Math.min(reserved, qty); } else if (movementType === "RETURN") onHand += qty; else reserved -= Math.min(reserved, qty);
        if (onHand < 0 || reserved < 0 || reserved > onHand) throw Object.assign(new Error("STOCK_UNDERFLOW"), { status: 409 });
        await client.query("insert into inventory_movements(physical_product_id,movement_type,quantity,source_type,source_id,idempotency_key,actor_user_id) values($1,$2,$3,'SHIPMENT',$4,$5,$6)",[item.physicalProductId,movementType,qty,id,movementKey,principal.user.id]); await client.query("update physical_products set on_hand=$1,reserved=$2,updated_at=now() where id=$3",[onHand,reserved,item.physicalProductId]);
      }
    }
    const row = (await client.query("update shipments set status=$1::shipment_status,shipped_at=case when $1::text='SHIPPED' then coalesce(shipped_at,now()) else shipped_at end,delivered_at=case when $1::text='DELIVERED' then coalesce(delivered_at,now()) else delivered_at end,updated_at=now() where id=$2 returning id,status,carrier,tracking_number as \"trackingNumber\",shipped_at as \"shippedAt\",delivered_at as \"deliveredAt\"", [nextStatus, id])).rows[0];
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'shipment',$3,'SUCCESS',gen_random_uuid(),$4)",[principal.user.id,`shipment.status.${nextStatus.toLowerCase()}`,id,JSON.stringify({from:shipment.status,to:nextStatus,itemCount:items.length})]); await client.query("commit"); return json(res,200,{status:"TRANSITIONED",shipment:row,inventoryMovementRecorded:["SHIPPED","RETURNED","CANCELLED"].includes(nextStatus)});
  } catch (error) { try { await client.query("rollback"); } catch { /* preserve */ } return json(res,error.status || (error.code === "23505" ? 409 : 400),{error:error.message || "SHIPMENT_OPERATION_FAILED"}); } finally { client.release(); await pool.end(); }
}
