import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.R96B_SOURCE_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "R96B_SOURCE_DATABASE_URL_OR_LOCAL_DATABASE_REQUIRED");
const mediaRoot = process.env.R96B_MEDIA_ROOT || path.resolve(process.cwd(), "private");
const slug = "lise-hizli-okuma-egitimi";
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const pool = disposable.pool;
const trackedPools = new Set();
const originalPoolConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function trackedConnect(...args) { trackedPools.add(this); return originalPoolConnect.apply(this, args); };
const password = "R96D1-Disposable-Video-Password!";
const origin = "http://127.0.0.1:5173";
Object.assign(process.env, { DATABASE_URL: disposable.databaseUrl.toString(), TEST_DATABASE_URL: disposable.databaseUrl.toString(), APP_ORIGIN: origin, BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "R96D1-disposable-video-auth-secret-only", NODE_ENV: "test", LOCAL_REVIEW_MODE: "1", DIGITAL_STORAGE_PROVIDER: "LOCAL", DIGITAL_STORAGE_ROOT: mediaRoot, EMAIL_PROVIDER: "DISABLED", BETTER_AUTH_TEST_MAIL_SINK: "1" });
function cookieJar() { return new Map(); }
function applySetCookies(jar, response) { const values = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : []; for (const value of values) { const pair = value.split(";", 1)[0]; const split = pair.indexOf("="); if (split > 0) jar.set(pair.slice(0, split), pair.slice(0, split) && pair.slice(split + 1)); } }
function cookieHeader(jar) { return [...jar].map(([name, value]) => `${name}=${value}`).join("; "); }
async function createTrainer() {
  const authId = "r96d-video-trainer-auth"; const email = "r96d-video-trainer@example.test";
  const platform = (await pool.query(`insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'R96D Video Trainer',true) returning id`, [authId, email])).rows[0].id;
  await pool.query(`insert into "user"(id,name,email,email_verified,created_at,updated_at) values($1,'R96D Video Trainer',$2,true,now(),now())`, [authId, email]);
  await pool.query(`insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now())`, [`${authId}-credential`, authId, await hashPassword(password)]);
  await pool.query(`insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'TRAINER',$1,'TRAINER','ACTIVE')`, [platform]);
  const pkg = (await pool.query(`insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values('lise-hizli-okuma-egitimi','TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) on conflict(slug) do update set status='PUBLISHED',panel_visible=true returning id`)).rows[0];
  const version = (await pool.query(`insert into package_versions(package_id,version_number,title,description,features_json,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'R96D Lise Hızlı Okuma','R96D Lise Hızlı Okuma','[]',100000,120000,120000,'TRY',true,'PUBLISHED',now()) on conflict(package_id,version_number) do update set status='PUBLISHED',purchase_enabled=true returning id`, [pkg.id])).rows[0];
  await pool.query(`insert into trainer_package_entitlements(trainer_user_id,package_id,package_version_id,status,source,note) values($1,$2,$3,'ACTIVE','MANUAL_GIFT','R96D1_VIDEO_HTTP')`, [platform, pkg.id, version.id]);
  return { authId, email, platform, packageId: pkg.id };
}
let server;
try {
  const trainer = await createTrainer();
  const { auth } = await import("../src/server/auth/auth.js");
  const { default: videos } = await import("../api/trainer/videos.js");
  const { default: videoMedia } = await import("../api/trainer/video-media.js");
  const routes = new Map([["/api/trainer/videos", videos], ["/api/trainer/video-media", videoMedia]]);
  server = http.createServer((request, response) => { const handler = routes.get(new URL(request.url || "/", origin).pathname); if (!handler) { response.statusCode = 404; response.end(); return; } Promise.resolve(handler(request, response)).catch((error) => { if (!response.writableEnded) { response.statusCode = 503; response.end(String(error)); } }); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`; const jar = cookieJar();
  const login = await auth.handler(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }, body: JSON.stringify({ email: trainer.email, password }) }));
  applySetCookies(jar, login); assert.equal(login.status, 200, "TRAINER_LOGIN");
  const authHeaders = { origin, "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET, cookie: cookieHeader(jar) };
  const videosUrl = `${base}/api/trainer/videos?packageId=${encodeURIComponent(trainer.packageId)}`;
  const initial = await fetch(videosUrl, { headers: authHeaders }); const initialBody = await initial.json(); assert.equal(initial.status, 200, "VIDEO_LIST_200"); assert.equal(initialBody.videos.length, 7, "LISE_LESSON_COUNT_7");
  const results = [];
  for (let index = 1; index <= 7; index += 1) {
    const progress = await fetch(videosUrl, { method: "POST", headers: { ...authHeaders, "content-type": "application/json" }, body: JSON.stringify({ videoIndex: index, durationSeconds: 1, startSeconds: 0, endSeconds: 1, ended: true }) }); assert.equal(progress.status, 200, `VIDEO_${index}_PREVIEW_UNLOCK_PROGRESS`);
    const range = await fetch(`${base}/api/trainer/video-media?packageId=${encodeURIComponent(trainer.packageId)}&video=${index}`, { headers: { ...authHeaders, range: "bytes=0-1023" } }); const bytes = new Uint8Array(await range.arrayBuffer());
    assert.equal(range.status, 206, `VIDEO_${index}_RANGE_206`); assert.equal(range.headers.get("content-type"), "video/mp4", `VIDEO_${index}_MIME_MP4`); assert.equal(range.headers.get("accept-ranges"), "bytes", `VIDEO_${index}_ACCEPT_RANGES`); assert.equal(bytes.byteLength, 1024, `VIDEO_${index}_RANGE_LENGTH`); assert.match(range.headers.get("content-range") || "", /^bytes 0-1023\/\d+$/u, `VIDEO_${index}_CONTENT_RANGE`);
    results.push({ videoIndex: index, status: range.status, mime: range.headers.get("content-type"), contentRange: range.headers.get("content-range"), bytes: bytes.byteLength });
  }
  const revoked = await pool.query("update trainer_package_entitlements set status='REVOKED',revoked_at=now(),revoke_reason='R96D1 HTTP test' where trainer_user_id=$1 and package_id=$2", [trainer.platform, trainer.packageId]); assert.equal(revoked.rowCount, 1, "ENTITLEMENT_REVOKED");
  const deniedMetadata = await fetch(videosUrl, { headers: authHeaders }); assert.equal(deniedMetadata.status, 403, "REVOKED_ENTITLEMENT_METADATA_403");
  const denied = await fetch(`${base}/api/trainer/video-media?packageId=${encodeURIComponent(trainer.packageId)}&video=1`, { headers: authHeaders }); assert.equal(denied.status, 403, "REVOKED_ENTITLEMENT_MEDIA_403");
  console.log(JSON.stringify({ LISE_PACKAGE: "lise-hizli-okuma-egitimi", LESSON_ENDPOINTS: results, HTTP_RANGE_MIME: "PASS_7_OF_7", ACTIVE_ENTITLEMENT: "PASS_7_OF_7", REVOKED_ENTITLEMENT: "PASS_403_METADATA_AND_MEDIA", DATABASE_ISOLATION: disposable.databaseName }));
} finally { if (server) await new Promise((resolve) => server.close(resolve)); for (const trackedPool of trackedPools) if (trackedPool !== disposable.pool && !trackedPool.ended && !trackedPool.ending) await trackedPool.end(); pg.Pool.prototype.connect = originalPoolConnect; await disposable.dispose(); }





