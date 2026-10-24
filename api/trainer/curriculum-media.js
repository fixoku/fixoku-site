import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal } from "../../src/server/domain/trainer-commerce.js";
import { createSignedReadUrl, fetchPrivateObject, getDigitalStorageConfig, productionPrivateMediaAvailable } from "../../src/server/domain/digital-delivery.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const headers = (req) =>
  new Headers(
    Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)])
  );

const stop = (res, status) => {
  res.statusCode = status;
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end();
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return stop(res, 405);
  }

  const principal = await resolvePrincipal(headers(req));

  if (!principal) {
    return stop(res, 401);
  }
  if (!productionPrivateMediaAvailable()) return stop(res, 503);

  const parsed = new URL(req.url, "http://local");
  const packageId = String(parsed.searchParams.get("packageId") || "");
  const itemIndex = Number(parsed.searchParams.get("item"));
  const mode = String(parsed.searchParams.get("mode") || "");

  if (
    !UUID.test(packageId) ||
    !Number.isInteger(itemIndex) ||
    itemIndex < 1 ||
    itemIndex > 999
  ) {
    return stop(res, 400);
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
           and e.revoked_at is null
        limit 1`,
      [packageId, user.id]
    );

    const pkg = result.rows[0];

    if (!pkg) {
      return stop(res, 403);
    }

    const storage = getDigitalStorageConfig();
    const remote = storage.provider === "S3" || storage.provider === "R2";
    const folder = path.resolve("private", "trainer-curriculum", pkg.slug);
    let manifest;
    if (remote) {
      const response = await fetchPrivateObject(storage, `trainer-curriculum/${pkg.slug}/manifest.json`);
      if (!response.ok) return stop(res, response.status === 404 ? 404 : 503);
      try { manifest = await response.json(); } catch { return stop(res, 503); }
    } else {
      const manifestFile = path.join(folder, "manifest.json");
      if (!fs.existsSync(manifestFile)) return stop(res, 404);
      try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch { return stop(res, 503); }
    }

    const item = Array.isArray(manifest.items)
      ? manifest.items.find(
          (entry) => Number(entry.index) === itemIndex
        )
      : null;

    if (!item) {
      return stop(res, 404);
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    if (mode === "thumb") {
      const slideNo = Number(item.slideNo);

      if (!Number.isInteger(slideNo) || slideNo < 1 || slideNo > Number(manifest.slideCount || 0)) {
        return stop(res, 404);
      }

      if (remote) {
        res.statusCode = 302;
        res.setHeader("Location", createSignedReadUrl(storage, `trainer-curriculum/${pkg.slug}/thumbs/thumb-${String(slideNo).padStart(3, "0")}.jpg`));
        res.setHeader("Referrer-Policy", "no-referrer");
        return res.end();
      }

      const thumb = path.join(
        folder,
        "thumbs",
        `thumb-${String(slideNo).padStart(3, "0")}.jpg`
      );

      if (!fs.existsSync(thumb)) {
        return stop(res, 404);
      }

      const stat = fs.statSync(thumb);

      res.statusCode = 200;
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Length", String(stat.size));

      fs.createReadStream(thumb).pipe(res);
      return;
    }

    const fileName = path.basename(String(item.file || ""));

    if (!fileName || fileName !== String(item.file || "")) {
      return stop(res, 400);
    }

    const file =
      item.type === "video"
        ? path.join(folder, "videos", fileName)
        : path.join(folder, fileName);

    if (remote) {
      res.statusCode = 302;
      res.setHeader("Location", createSignedReadUrl(storage, `trainer-curriculum/${pkg.slug}/${item.type === "video" ? "videos/" : ""}${fileName}`));
      res.setHeader("Referrer-Policy", "no-referrer");
      return res.end();
    }

    if (!fs.existsSync(file)) {
      return stop(res, 404);
    }

    const stat = fs.statSync(file);

    if (item.type !== "video") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Length", String(stat.size));

      fs.createReadStream(file).pipe(res);
      return;
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    const range = String(req.headers.range || "");

    if (!range) {
      res.statusCode = 200;
      res.setHeader("Content-Length", String(stat.size));

      fs.createReadStream(file).pipe(res);
      return;
    }

    const match = /bytes=(\d+)-(\d*)/u.exec(range);

    if (!match) {
      return stop(res, 416);
    }

    const start = Number(match[1]);
    const end = match[2]
      ? Math.min(Number(match[2]), stat.size - 1)
      : stat.size - 1;

    if (start > end || start >= stat.size) {
      return stop(res, 416);
    }

    res.statusCode = 206;

    res.setHeader(
      "Content-Range",
      `bytes ${start}-${end}/${stat.size}`
    );

    res.setHeader(
      "Content-Length",
      String(end - start + 1)
    );

    fs.createReadStream(file, { start, end }).pipe(res);
  }
  catch (error) {
    console.error("[trainer-curriculum-media]", error);
    return stop(res, 403);
  }
  finally {
    await pool.end();
  }
}
