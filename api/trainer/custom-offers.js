import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { addTrainerCartItem, assertTrainerPrincipal } from "../../src/server/domain/trainer-commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function body(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function safeOffer(row, lines) { return { id: row.id, title: row.title, status: row.status, currency: row.currency, listGrossMinor: Number(row.list_gross_minor || 0), specialGrossMinor: Number(row.special_gross_minor || 0), discountMinor: Number(row.discount_minor || 0), discountPercentBps: Number(row.discount_percent_bps || 0), expiresAt: row.expires_at, lines }; }

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  // Trainers read their own offer inbox through the trainer training scope;
  // `package.read` is a student/guardian permission and would reject every
  // authenticated trainer before the target-user query can enforce privacy.
  const denied = requirePermission(principal, req.method === "GET" ? "trainer.training.read" : "order.create");
  if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const trainer = await assertTrainerPrincipal(principal);
    const rows = (await client.query(`select o.*,l.id as line_id,l.title_snapshot,l.package_version_id,l.list_gross_minor as line_list_gross_minor,l.gross_minor as line_gross_minor,l.net_minor as line_net_minor,l.vat_minor as line_vat_minor,l.vat_rate_bps as line_vat_rate_bps,l.discount_minor as line_discount_minor,l.quantity from r6_custom_offers o join r6_custom_offer_lines l on l.offer_id=o.id where o.customer_user_id=$1 and o.status='SENT' and (o.expires_at is null or o.expires_at>now()) and l.line_kind='PACKAGE' order by o.created_at desc,l.line_order,l.id`, [trainer.id])).rows;
    const grouped = new Map();
    for (const row of rows) {
      if (!grouped.has(row.id)) grouped.set(row.id, { row, lines: [] });
      grouped.get(row.id).lines.push({ id: row.line_id, titleSnapshot: row.title_snapshot, packageVersionId: row.package_version_id, quantity: Number(row.quantity || 1), listGrossMinor: Number(row.line_list_gross_minor || 0), grossMinor: Number(row.line_gross_minor || 0), netMinor: Number(row.line_net_minor || 0), vatMinor: Number(row.line_vat_minor || 0), vatRateBps: Number(row.line_vat_rate_bps || 0), discountMinor: Number(row.line_discount_minor || 0) });
    }
    if (req.method === "GET") return json(res, 200, { offers: [...grouped.values()].map(({ row, lines }) => safeOffer(row, lines)) });
    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const input = await body(req);
    const offerId = String(input.offerId || "");
    const offer = grouped.get(offerId);
    if (!offer || offer.lines.length !== 1) return json(res, 404, { error: "OFFER_NOT_FOUND" });
    const packageVersionId = offer.lines[0].packageVersionId;
    const item = await addTrainerCartItem(client, trainer.id, packageVersionId).catch((error) => { throw error; });
    return json(res, 201, { prepared: true, offer: safeOffer(offer.row, offer.lines), item, checkoutPath: `/panel/egitmen/checkout?customOfferId=${encodeURIComponent(offerId)}` });
  } catch (error) {
    return json(res, error.status || 409, { error: error.code || error.message || "TRAINER_OFFER_UNAVAILABLE" });
  } finally { client.release(); await pool.end(); }
}
