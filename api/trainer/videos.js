import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
import { getDigitalStorageConfig, productionPrivateMediaAvailable } from "../../src/server/domain/digital-delivery.js";
import { loadRealTrainerLessons } from "./video-config.js";
import { previewProgress, previewRecord } from "./video-preview-progress.js";
import { readTrainerVideoProgress, recordTrainerVideoProgress } from "../../src/server/domain/trainer-completion.js";
// Local preview state remains a compatibility yedek only when a disposable
// schema predates trainer_video_progress. Production always uses persisted rows.
const respond = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const mask = (email) => { const [name, domain] = String(email || "").split("@"); return name && domain ? `${name.slice(0, 2)}***@${domain}` : "Kullanıcı"; };
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 8192) throw Object.assign(new Error("BODY_TOO_LONG"), { status: 400 }); }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); }
}
function allMediaPresent(slug, lessons) {
  const storage = getDigitalStorageConfig();
  const root = storage.provider === "LOCAL" && storage.enabled ? storage.root : "private";
  return lessons.every((item) => {
    const video = path.resolve(root, "trainer-curriculum-intake", "release-015l-egitmen-dersleri", slug, item.filename);
    const poster = path.resolve(root, "trainer-video-posters", slug, item.poster);
    return fs.existsSync(video) && fs.statSync(video).isFile() && fs.existsSync(poster) && fs.statSync(poster).isFile();
  });
}
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return respond(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!productionPrivateMediaAvailable()) return respond(res, 503, { error: "PRIVATE_MEDIA_UNAVAILABLE" });
  let principal;
  try { principal = await resolvePrincipal(headers(req)); } catch { return respond(res, 401, { error: "UNAUTHENTICATED" }); }
  if (!principal) return respond(res, 401, { error: "UNAUTHENTICATED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const user = await assertTrainerPrincipal(principal);
    const parsed = new URL(req.url, "http://local");
    const packageId = parsed.searchParams.get("packageId");
    const slug = parsed.searchParams.get("slug");
    const validId = TRAINER_COMMERCE_UUID.test(String(packageId || "")) ? packageId : null;
    const pkg = (await pool.query(`select p.id,p.slug,pv.title from packages p join package_versions pv on pv.package_id=p.id where p.audience='TRAINER' and p.status='PUBLISHED' and pv.status='PUBLISHED' and (($1::uuid is not null and p.id=$1) or ($2::text is not null and p.slug=$2)) order by pv.version_number desc limit 1`, [validId, slug || null])).rows[0];
    if (!pkg) return respond(res, 404, { error: "PACKAGE_NOT_FOUND" });
    const entitled = (await pool.query("select id from trainer_package_entitlements where trainer_user_id=$1 and package_id=$2 and status='ACTIVE' and revoked_at is null", [user.id, pkg.id])).rows[0];
    if (!entitled) return respond(res, 403, { error: "ENTITLEMENT_REQUIRED" });
    const lessonResult = await loadRealTrainerLessons(pkg.slug);
    if (lessonResult.state === "UNAVAILABLE") return respond(res, 503, { error: "PRIVATE_MEDIA_UNAVAILABLE" });
    const lessons = lessonResult.lessons;
    if (lessons.length && !storageIsRemote() && !allMediaPresent(pkg.slug, lessons)) {
      // R96B local review stores the canonical MP4s in the curriculum manifest
      // tree. Keep the existing standalone lesson viewer fail-closed when its
      // legacy intake/poster pair is absent, but allow the same page to open so
      // the approved curriculum viewer can play those manifest videos.
      const mediaStorage = getDigitalStorageConfig();
      const mediaRoot = mediaStorage.provider === "LOCAL" && mediaStorage.enabled ? mediaStorage.root : "private";
      const curriculumManifest = path.resolve(mediaRoot, "trainer-curriculum", pkg.slug, "manifest.json");
      if (process.env.NODE_ENV !== "production" && fs.existsSync(curriculumManifest)) {
        return respond(res, 200, {
          package: { id: pkg.id, slug: pkg.slug, title: pkg.title },
          videos: [],
          videoStatus: "CURRICULUM_MANIFEST_ONLY",
          progressTrackingEnabled: false,
          previewSessionOnly: true,
          watermark: { name: user.displayName, reference: mask(user.email) },
        });
      }
      return respond(res, 503, { error: "REAL_VIDEO_ASSETS_MISSING" });
    }
    if (req.method === "GET") {
      const videos = await Promise.all(lessons.map(async (lesson, index) => {
        const persisted = await readTrainerVideoProgress(pool, user.id, pkg.id, index + 1);
        const previous = index > 0 ? await readTrainerVideoProgress(pool, user.id, pkg.id, index) : null; const locked = index > 0 && !previous?.completedAt;
        const route = `/api/trainer/video-media?packageId=${encodeURIComponent(pkg.id)}&video=${lesson.videoIndex}`;
        return { videoIndex: lesson.videoIndex, title: lesson.title, locked, src: locked ? null : route, posterSrc: `${route}&poster=1`, progress: persisted || previewProgress(user.id, pkg.id, lesson.videoIndex) };
      }));
      return respond(res, 200, { package: { id: pkg.id, slug: pkg.slug, title: pkg.title }, videos, videoStatus: lessons.length ? "PERSISTED_SEQUENTIAL_PROGRESS" : "REAL_LESSONS_NOT_ADDED", progressTrackingEnabled: true, previewSessionOnly: false, watermark: { name: user.displayName, reference: mask(user.email) } });
    }
    if (!lessons.length) return respond(res, 404, { error: "REAL_LESSONS_NOT_ADDED" });
    const data = await readJson(req);
    const requestedLesson = lessons.findIndex((lesson) => Number(lesson.videoIndex) === Number(data.videoIndex));
    if (requestedLesson < 0) return respond(res, 400, { error: "VIDEO_INDEX_INVALID" });
    const tx = await pool.connect(); try { await tx.query("begin");
    try {
      const result = await recordTrainerVideoProgress(tx, { trainerUserId: user.id, packageId: pkg.id, ...data, videoIndex: requestedLesson + 1, lessonsCount: lessons.length });
      await tx.query("commit");
      return respond(res, 200, { ...result, progressScope: "PERSISTED_TRAINER_VIDEO_PROGRESS" });
    } catch (error) {
      await tx.query("rollback");
      // Keep an older local review runner usable when its disposable schema
      // predates trainer_video_progress. This response is explicitly marked as
      // a schema yedek and cannot be returned by production.
      if (process.env.NODE_ENV !== "production" && error?.code === "42P01") {
        const result = previewRecord(user.id, pkg.id, data, lessons.length);
        return respond(res, 200, { ...result, progressScope: "LOCAL_SCHEMA_FALLBACK" });
      }
      throw error;
    }
    } finally { tx.release(); }
  } catch (error) { return respond(res, error.status || 403, { error: error.code || error.message || "TRAINER_VIDEO_ACCESS_DENIED" }); }
  finally { await pool.end(); }
}

function storageIsRemote() {
  const storage = getDigitalStorageConfig();
  return storage.provider === "S3" || storage.provider === "R2";
}
