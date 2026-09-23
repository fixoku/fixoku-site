import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  const denied = requirePermission(principal, "package.read");
  if (denied) return json(res, denied.status, denied.body);
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    const offers = (await client.query("select id,title,status,current_revision_number,updated_at from family_offers where customer_user_id=$1 and status='SENT' order by updated_at desc", [principal.user.id])).rows;
    const result = [];
    for (const offer of offers) {
      const revision = (await client.query("select id,revision_number,pricing_snapshot from family_offer_revisions where offer_id=$1 and revision_number=$2 and status='SENT'", [offer.id, offer.current_revision_number])).rows[0];
      if (!revision) continue;
      const children = (await client.query("select id,local_key,first_name,last_name,grade,education_stage from family_offer_draft_children where revision_id=$1 order by created_at,id", [revision.id])).rows;
      const selections = (await client.query("select draft_child_id,title_snapshot,product_type,service_mode,sale_gross_minor,currency from family_offer_child_selections where revision_id=$1 order by created_at,id", [revision.id])).rows;
      const byChild = new Map(children.map((child) => [child.id, { ...child, selections: [] }]));
      for (const selection of selections) byChild.get(selection.draft_child_id)?.selections.push(selection);
      result.push({ id: offer.id, title: offer.title, status: offer.status, revisionNumber: Number(revision.revision_number), updatedAt: offer.updated_at, children: [...byChild.values()], pricing: typeof revision.pricing_snapshot === "string" ? JSON.parse(revision.pricing_snapshot) : revision.pricing_snapshot });
    }
    return json(res, 200, { offers: result });
  } finally { client.release(); await pool.end(); }
}
