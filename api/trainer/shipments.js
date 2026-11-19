import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal } from "../../src/server/domain/trainer-commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const trainer = await assertTrainerPrincipal(principal);
    const verified = (await client.query("select email_verified from platform_users where id=$1", [trainer.id])).rows[0];
    if (!verified?.email_verified) return json(res, 403, { error: "EMAIL_VERIFICATION_REQUIRED" });
    const rows = (await client.query(`select s.id,s.order_id as "orderId",s.status,s.carrier,s.tracking_number as "trackingNumber",s.tracking_url as "trackingUrl",s.label_reference as "labelReference",s.shipping_charge_minor as "shippingChargeMinor",s.shipped_at as "shippedAt",s.delivered_at as "deliveredAt",s.created_at as "createdAt",d.provider_name as "providerName",d.reference_no as "referenceNo",d.dispatch_status as "dispatchStatus",d.provider_tracking_number as "providerTrackingNumber",d.provider_tracking_url as "providerTrackingUrl",d.last_provider_query_at as "lastProviderQueryAt" from trainer_order_shipments s left join shipment_dispatches d on d.trainer_order_shipment_id=s.id where s.trainer_user_id=$1 order by s.created_at desc`, [trainer.id])).rows;
    for (const row of rows) row.items = (await client.query('select si.id,si.quantity,si.title_snapshot as "titleSnapshot",si.sku_snapshot as "skuSnapshot",si.display_label_snapshot as "displayLabelSnapshot" from trainer_order_shipment_items si where si.trainer_order_shipment_id=$1 order by si.id', [row.id])).rows;
    return json(res, 200, { shipments: rows });
  } catch (error) { return json(res, error.status || 503, { error: error.code || "SHIPMENTS_UNAVAILABLE" }); } finally { client.release(); await pool.end(); }
}
