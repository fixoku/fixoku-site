import pg from "pg";
import { z } from "zod";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const orderStatuses = ["PENDING_PAYMENT", "PAYMENT_FAILED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED", "PAYMENT_REVIEW"];
const querySchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(orderStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "totalMinor", "status"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});
const sortColumns = Object.freeze({ createdAt: "o.created_at", totalMinor: "o.total_minor", status: "o.status" });
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "order.read");
    if (denied) return json(res, denied.status, denied.body);
    const url = new URL(req.url || "/api/admin/orders", "http://local");
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return json(res, 400, { error: "INVALID_QUERY" });
    const { search, status, page, pageSize, sort, direction } = parsed.data;
    const conditions = []; const values = [];
    if (status) { values.push(status); conditions.push(`o.status = $${values.length}`); }
    if (search) { values.push(`%${search}%`); const index = values.length; conditions.push(`(o.id::text ilike $${index} or buyer.display_name ilike $${index} or buyer.email ilike $${index} or beneficiary.display_name ilike $${index} or concat_ws(' ', sp.first_name, sp.last_name) ilike $${index})`); }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const countResult = await pool.query(`select count(*)::int as total from orders o join platform_users buyer on buyer.id=o.buyer_user_id join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id ${where}`, values);
      const listValues = [...values, pageSize, (page - 1) * pageSize];
      const rows = (await pool.query(`select o.id,o.created_at as "createdAt",o.status,o.currency,o.subtotal_minor as "subtotalMinor",o.shipping_minor as "shippingMinor",o.total_minor as "totalMinor",o.catalog_scope_snapshot as "catalogScopeSnapshot",buyer.display_name as "buyerName",buyer.email as "buyerEmail",coalesce(nullif(trim(concat_ws(' ',sp.first_name,sp.last_name)),''),beneficiary.display_name) as "beneficiaryName",pi.status as "paymentStatus",count(oi.id)::int as "itemCount" from orders o join platform_users buyer on buyer.id=o.buyer_user_id join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id left join payment_intents pi on pi.order_id=o.id left join order_items oi on oi.order_id=o.id ${where} group by o.id,buyer.display_name,buyer.email,beneficiary.display_name,sp.first_name,sp.last_name,pi.status order by ${sortColumns[sort]} ${direction === "asc" ? "asc" : "desc"},o.id desc limit $${listValues.length - 1} offset $${listValues.length}`, listValues)).rows;
      const total = Number(countResult.rows[0]?.total || 0);
      const trainerOrders = (await pool.query(`select o.id,o.created_at as "createdAt",o.status,o.currency,o.subtotal_minor as "subtotalMinor",o.shipping_minor as "shippingMinor",o.total_minor as "totalMinor",u.display_name as "trainerName",count(oi.id)::int as "itemCount" from trainer_package_orders o join platform_users u on u.id=o.trainer_user_id left join trainer_package_order_items oi on oi.order_id=o.id group by o.id,u.display_name order by o.created_at desc limit 100`)).rows;
      for (const order of trainerOrders) order.physicalItems = (await pool.query(`select poi.quantity,poi.title_snapshot as "titleSnapshot",poi.sku_snapshot as "skuSnapshot",poi.display_label_snapshot as "displayLabelSnapshot",pp.image_reference as "imageReference" from trainer_order_physical_items poi join trainer_package_order_items oi on oi.id=poi.trainer_package_order_item_id join physical_products pp on pp.id=poi.physical_product_id where oi.order_id=$1 order by poi.id`, [order.id])).rows;
      return json(res, 200, { orders: rows, trainerOrders, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } });
    } finally { await pool.end(); }
  } catch { return json(res, 503, { error: "ORDERS_UNAVAILABLE" }); }
}
