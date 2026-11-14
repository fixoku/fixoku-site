import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal } from "../../src/server/domain/trainer-commerce.js";
import { fetchPrivateObject, getDigitalStorageConfig, productionPrivateMediaAvailable } from "../../src/server/domain/digital-delivery.js";

import { curriculumIdentity, readCurriculumProgress, recordCurriculumItem } from "../../src/server/domain/trainer-curriculum-progress.js";
import { grantTrainerPackageCompletionExpertise } from "../../src/server/domain/trainer-expertise.js";
import { loadRealTrainerLessons } from "./video-config.js";

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

function validManifestItem(item) {
  if (!item || typeof item !== "object") return false;
  const file = String(item.file || "");
  const type = item.type === "video" ? "video" : item.type === "slide" ? "slide" : "";
  if (!type || !file || path.basename(file) !== file) return false;
  return type === "video" ? /\.mp4$/iu.test(file) : /\.png$/iu.test(file);
}

export default async function handler(req, res) {
  if (! ["GET", "POST"].includes(req.method)) {
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
          and e.status = 'ACTIVE' and e.revoked_at is null
        limit 1`,
      [packageId, user.id]
    );

    const pkg = result.rows[0];

    if (!pkg) {
      return json(res, 403, { error: "ENTITLEMENT_REQUIRED" });
    }

    if (!productionPrivateMediaAvailable()) return json(res, 503, { error: "PRIVATE_MEDIA_UNAVAILABLE" });
    const storage = getDigitalStorageConfig();
    const remote = storage.provider === "S3" || storage.provider === "R2";
    let manifest;
    if (remote) {
      const response = await fetchPrivateObject(storage, `trainer-curriculum/${pkg.slug}/manifest.json`);
      if (!response.ok) return json(res, response.status === 404 ? 404 : 503, { error: response.status === 404 ? "CURRICULUM_NOT_FOUND" : "PRIVATE_MEDIA_UNAVAILABLE" });
      try { manifest = await response.json(); } catch { return json(res, 503, { error: "CURRICULUM_MANIFEST_INVALID" }); }
    } else {
      const root = storage.provider === "LOCAL" && storage.root ? storage.root : "private";
      const folder = path.resolve(root, "trainer-curriculum", pkg.slug);
      const manifestFile = path.join(folder, "manifest.json");
      if (!fs.existsSync(manifestFile)) return json(res, 404, { error: "CURRICULUM_NOT_FOUND" });
      try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch { return json(res, 503, { error: "CURRICULUM_MANIFEST_INVALID" }); }
    }

    const rawItems = Array.isArray(manifest.items) ? manifest.items : [];
    if (rawItems.some((item) => !validManifestItem(item))) return json(res, 503, { error: "CURRICULUM_MANIFEST_INVALID" });
    const items = rawItems
      .map((item) => ({
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
        }));

    const manifestSha256 = curriculumIdentity(rawItems);
    if (req.method === "POST") {
      let raw = "";
      for await (const chunk of req) { raw += chunk; if (raw.length > 4096) return json(res, 400, {error:"BODY_TOO_LONG"}); }
      let input;
      try { input = JSON.parse(raw); } catch { return json(res,400,{error:"INVALID_JSON"}); }
      if (!Number.isInteger(input?.itemIndex) || input.manifestSha256 !== manifestSha256) return json(res,409,{error:"CURRICULUM_MANIFEST_CHANGED"});
      const tx = await pool.connect();
      try {
        await tx.query("begin");
        await tx.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`qualification-completion:${user.id}:${packageId}`]);
        const access = (await tx.query("select id from trainer_package_entitlements where trainer_user_id=$1 and package_id=$2 and status='ACTIVE' and revoked_at is null limit 1 for share",[user.id,packageId])).rows[0];
        if (!access) throw Object.assign(new Error("ENTITLEMENT_REQUIRED"),{status:403});
        const progress = await recordCurriculumItem(tx,{trainerUserId:user.id,packageId,items:rawItems,itemIndex:input.itemIndex});
        let expertiseActivated = false;
        if (progress.completedAt) {
          const lessons = await loadRealTrainerLessons(pkg.slug);
          const version = (await tx.query("select id from package_versions where package_id=$1 and status='PUBLISHED' order by version_number desc limit 1",[packageId])).rows[0];
          if (lessons.state !== "UNAVAILABLE" && lessons.lessons.length && version) {
            const grant = await grantTrainerPackageCompletionExpertise(tx,{trainerUserId:user.id,packageId,packageVersionId:version.id,lessonsCount:lessons.lessons.length});
            expertiseActivated = grant.created > 0;
          }
        }
        await tx.query("commit");
        return json(res,200,{progress,expertiseActivated});
      } catch(error) { await tx.query("rollback"); return json(res,error.status || 503,{error:error.code || "CURRICULUM_SAVE_FAILED"}); }
      finally { tx.release(); }
    }
    const progress = await readCurriculumProgress(pool,{trainerUserId:user.id,packageId,manifestSha256});
    return json(res, 200, {
      manifestSha256, progress,
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
