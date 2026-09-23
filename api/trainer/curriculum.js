import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal } from "../../src/server/domain/trainer-commerce.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};

const headers = (req) =>
  new Headers(
    Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)])
  );

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const principal = await resolvePrincipal(headers(req));

  if (!principal) {
    return json(res, 401, { error: "UNAUTHENTICATED" });
  }

  const parsed = new URL(req.url, "http://local");
  const packageId = String(parsed.searchParams.get("packageId") || "");

  if (!UUID.test(packageId)) {
    return json(res, 400, { error: "INVALID_PACKAGE" });
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const user = await assertTrainerPrincipal(principal);

    const result = await pool.query(
      `select p.slug
         from packages p
         join trainer_package_entitlements e
           on e.package_id = p.id
        where p.id = $1
          and e.trainer_user_id = $2
          and e.status = 'ACTIVE'
        limit 1`,
      [packageId, user.id]
    );

    const pkg = result.rows[0];

    if (!pkg) {
      return json(res, 403, { error: "ENTITLEMENT_REQUIRED" });
    }

    const folder = path.resolve(
      "private",
      "trainer-curriculum",
      pkg.slug
    );

    const manifestFile = path.join(folder, "manifest.json");

    if (!fs.existsSync(manifestFile)) {
      return json(res, 404, { error: "CURRICULUM_NOT_FOUND" });
    }

    const manifest = JSON.parse(
      fs.readFileSync(manifestFile, "utf8")
    );

    const items = Array.isArray(manifest.items)
      ? manifest.items.map((item) => ({
          index: Number(item.index),
          type: item.type === "video" ? "video" : "slide",
          slideNo: Number(item.slideNo),
          title: String(item.title || ""),
          src:
            `/api/trainer/curriculum-media?packageId=${encodeURIComponent(packageId)}` +
            `&item=${encodeURIComponent(String(item.index))}`,
          thumbSrc:
            `/api/trainer/curriculum-media?packageId=${encodeURIComponent(packageId)}` +
            `&item=${encodeURIComponent(String(item.index))}&mode=thumb`,
        }))
      : [];

    return json(res, 200, {
      slideCount: Number(manifest.slideCount || 0),
      videoCount: Number(manifest.videoCount || 0),
      itemCount: items.length,
      items,
    });
  }
  catch (error) {
    console.error("[trainer-curriculum]", error);
    return json(res, 403, { error: "CURRICULUM_ACCESS_FAILED" });
  }
  finally {
    await pool.end();
  }
}