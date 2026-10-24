import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
import { createSignedReadUrl, getDigitalStorageConfig, productionPrivateMediaAvailable } from "../../src/server/domain/digital-delivery.js";
import { getRealTrainerLessons } from "./video-config.js";
import { previewUnlocked } from "./video-preview-progress.js";

const reply = (res, status, body = "") => {
  res.statusCode = status;
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.end(body);
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
export default async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405);
  let principal;
  try { principal = await resolvePrincipal(headers(req)); } catch { return reply(res, 401); }
  if (!principal) return reply(res, 401);
  if (!productionPrivateMediaAvailable()) return reply(res, 503);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const user = await assertTrainerPrincipal(principal);
    const parsed = new URL(req.url, "http://local");
    const packageId = parsed.searchParams.get("packageId");
    const videoIndex = Number(parsed.searchParams.get("video"));
    const poster = parsed.searchParams.get("poster") === "1";
    if (!TRAINER_COMMERCE_UUID.test(String(packageId || "")) || !Number.isInteger(videoIndex) || videoIndex < 1) return reply(res, 400);
    const result = await pool.query(`select p.slug from packages p join trainer_package_entitlements e on e.package_id=p.id where p.id=$1 and p.audience='TRAINER' and e.trainer_user_id=$2 and e.status='ACTIVE' and e.revoked_at is null limit 1`, [packageId, user.id]);
    const slug = result.rows[0]?.slug;
    if (!slug) return reply(res, 403);
    const lessons = getRealTrainerLessons(slug);
    const lesson = lessons[videoIndex - 1];
    if (!lesson) return reply(res, 404);
    if (!poster && !previewUnlocked(user.id, packageId, videoIndex)) return reply(res, 403);
    const storage = getDigitalStorageConfig();
    if (storage.provider === "S3" || storage.provider === "R2") {
      const storageKey = poster
        ? `trainer-video-posters/${slug}/${lesson.poster}`
        : `trainer-curriculum-intake/release-015l-egitmen-dersleri/${slug}/${lesson.filename}`;
      res.statusCode = 302;
      res.setHeader("Location", createSignedReadUrl(storage, storageKey));
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      return res.end();
    }
    const file = poster ? path.resolve("private", "trainer-video-posters", slug, lesson.poster) : path.resolve("private", "trainer-curriculum-intake", "release-015l-egitmen-dersleri", slug, lesson.filename);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return reply(res, 404);
    const stat = fs.statSync(file);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Content-Type", poster ? "image/jpeg" : "video/mp4");
    if (poster) {
      res.statusCode = 200;
      res.setHeader("Content-Length", String(stat.size));
      return fs.createReadStream(file).pipe(res);
    }
    res.setHeader("Accept-Ranges", "bytes");
    const range = String(req.headers.range || "");
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/u.exec(range);
      if (!match) return reply(res, 416);
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) return reply(res, 416);
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Content-Length", String(end - start + 1));
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.statusCode = 200;
    res.setHeader("Content-Length", String(stat.size));
    return fs.createReadStream(file).pipe(res);
  } catch { return reply(res, 403); }
  finally { await pool.end(); }
}
