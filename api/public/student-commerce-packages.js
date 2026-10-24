import pg from "pg";
import crypto from "node:crypto";

const send = (res, status, body, requestId = null) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (requestId) res.setHeader("X-Fixoku-Catalog-Request-Id", requestId);
  res.end(JSON.stringify(body));
};

const parseFeatures = (value) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((line) => typeof line === "string" && line.trim()).map((line) => line.trim().slice(0, 600)).slice(0, 30) : [];
  } catch { return []; }
};

const allowedImage = (value) => {
  const image = String(value || "").trim();
  if (image.startsWith("/images/") && !image.startsWith("//") && !image.includes("\\") && !image.includes("..")) return image;
  if (/^https:\/\/[\w.-]+(?::443)?\/[\S]*$/i.test(image) && image.length <= 1000) return image;
  return null;
};

/** Public, strictly read-only projection of Owner-managed student commerce packages. */
export default async function handler(req, res) {
  const requestId = crypto.randomUUID();
  if (req.method !== "GET") return send(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return send(res, 503, { error: "KATALOG_BAGLANTISI_HAZIR_DEGIL", requestId }, requestId);
  const pool = new pg.Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 });
  try {
    const { rows } = await pool.query(`
      select p.id, p.slug, p.education_stage::text as "educationStage",
             p.display_order as "displayOrder", p.icon_reference as "coverImage",
             pv.id as "packageVersionId", pv.title,
             pv.short_description as subtitle, pv.description,
             pv.features_json as "featuresJson", pv.price_minor as "priceMinor",
             pv.currency, pv.purchase_enabled as "purchaseEnabled"
      from packages p
      join lateral (
        select pv.* from package_versions pv
        where pv.package_id = p.id and pv.status = 'PUBLISHED'
        order by pv.version_number desc, pv.id desc limit 1
      ) pv on true
      where p.audience = 'STUDENT'
        and p.catalog_scope = 'STUDENT_COMMERCE'
        and p.status = 'PUBLISHED'
        and p.public_web_visible = true
        and p.slug not like 'phase2b-%'
        and p.slug not like 'demo-003d-%'
      order by p.education_stage, p.display_order, p.slug, p.id
    `);
    // Only select details belonging to the published, publicly visible versions above.
    // Owner stores the "Paket İçeriği" list as package_components TEXT_ITEM rows.
    // Do not expose inactive items or draft-version content to visitors.
    const visibleVersionIds = rows.map((row) => row.packageVersionId);
    const textByVersion = new Map();
    if (visibleVersionIds.length) {
      const { rows: textRows } = await pool.query(`
        select package_version_id as "versionId", title_snapshot as "title"
        from package_components
        where package_version_id = any($1::uuid[])
          and component_type = 'TEXT_ITEM'
          and is_active = true
        order by package_version_id, display_order, id
      `, [visibleVersionIds]);
      for (const part of textRows) {
        const title = String(part.title || "").trim().slice(0, 600);
        if (!title) continue;
        if (!textByVersion.has(part.versionId)) textByVersion.set(part.versionId, []);
        const list = textByVersion.get(part.versionId);
        if (list.length < 30) list.push(title);
      }
    }
    const packages = rows.map((row) => ({
      id: row.id, packageVersionId: row.packageVersionId, slug: row.slug, educationStage: row.educationStage,
      displayOrder: Number(row.displayOrder || 0),
      title: String(row.title || ""), subtitle: String(row.subtitle || ""),
      description: String(row.description || ""),
      features: textByVersion.get(row.packageVersionId)?.length
        ? textByVersion.get(row.packageVersionId)
        : parseFeatures(row.featuresJson),
      coverImage: allowedImage(row.coverImage),
      priceMinor: row.priceMinor === null ? null : Number(row.priceMinor),
      currency: row.currency === "TRY" ? "TRY" : null,
      purchaseEnabled: Boolean(row.purchaseEnabled),
    }));
    return send(res, 200, { packages, requestId }, requestId);
  } catch (error) {
    // Keep database diagnostics on server only.
    console.error("PUBLIC_STUDENT_COMMERCE_CATALOG_ERROR", requestId, error?.code || error?.name || "UNKNOWN");
    return send(res, 503, { error: "KATALOG_GECICI_OLARAK_ERISILEMIYOR", requestId }, requestId);
  } finally { await pool.end(); }
}
