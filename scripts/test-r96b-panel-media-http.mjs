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
const mediaRoot = process.env.R96B_MEDIA_ROOT || path.resolve(process.cwd(), "..", "..", "curriculum-recovery-001", "private");
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const pool = disposable.pool;
const trackedPools = new Set();
const originalPoolConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function trackedConnect(...args) {
  trackedPools.add(this);
  return originalPoolConnect.apply(this, args);
};
const password = "R96B-Disposable-Panel-Password!";
const origin = "http://127.0.0.1:5173";
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();
process.env.APP_ORIGIN = origin;
process.env.BETTER_AUTH_URL = origin;
process.env.BETTER_AUTH_SECRET = "R96B-disposable-auth-secret-only";
process.env.NODE_ENV = "test";
process.env.LOCAL_REVIEW_MODE = "1";
process.env.DIGITAL_STORAGE_PROVIDER = "LOCAL";
process.env.DIGITAL_STORAGE_ROOT = mediaRoot;
process.env.EMAIL_PROVIDER = "DISABLED";
process.env.BETTER_AUTH_TEST_MAIL_SINK = "1";

async function createPrincipal({ key, email, role = null, emailVerified = true }) {
  const authId = `r96b-http-${key}-auth`;
  const platform = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values($1,$2,$3,$4) returning id`, [authId, email, `R96B ${key}`, emailVerified],
  )).rows[0].id;
  await pool.query(
    `insert into "user"(id,name,email,email_verified,created_at,updated_at)
     values($1,$2,$3,$4,now(),now())`, [authId, `R96B ${key}`, email, emailVerified],
  );
  await pool.query(
    `insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at)
     values($1,$2,'credential',$2,$3,now(),now())`, [`${authId}-credential`, authId, await hashPassword(password)],
  );
  if (role) await pool.query(
    `insert into platform_memberships(user_id,scope_type,scope_id,role,status)
     values($1,$2,$1,$3,'ACTIVE')`, [platform, role, role],
  );
  return platform;
}

async function seedPackage(trainerUserId, slug) {
  const pkg = (await pool.query(
    `insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor)
     values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0)
     on conflict(slug) do update set status='PUBLISHED',panel_visible=true
     returning id`, [slug],
  )).rows[0];
  const version = (await pool.query(
    `insert into package_versions(package_id,version_number,title,description,features_json,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at)
     values($1,99,$2,$2,'[]',100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id`, [pkg.id, `R96B ${slug}`],
  )).rows[0];
  await pool.query(
    `insert into trainer_package_entitlements(trainer_user_id,package_id,package_version_id,status,source,note)
     values($1,$2,$3,'ACTIVE','MANUAL_GIFT','LOCAL_REVIEW_FULL_ACCESS')`, [trainerUserId, pkg.id, version.id],
  );
  return { id: pkg.id, versionId: version.id };
}

function cookieJar() { return new Map(); }
function applySetCookies(jar, response) {
  const values = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const split = pair.indexOf("=");
    if (split > 0) jar.set(pair.slice(0, split), pair.slice(split + 1));
  }
}
function cookieHeader(jar) { return [...jar].map(([name, value]) => `${name}=${value}`).join("; "); }

let server;
try {
  const trainer = await createPrincipal({ key: "trainer", email: "r96b-trainer@example.test", role: "TRAINER" });
  const candidate = await createPrincipal({ key: "candidate", email: "r96b-candidate@example.test" });
  await pool.query(`insert into trainer_applications(first_name,last_name,email,status,legal_acknowledged,candidate_user_id) values('R96B','Candidate','r96b-candidate@example.test','RECEIVED',true,$1)`, [candidate]);
  const student = await createPrincipal({ key: "student", email: "r96b-student@example.test", role: "STUDENT" });
  const paid = await seedPackage(trainer, "ilkokul-akici-hizli-okuma-egitimi");

  const { default: sharedCatalog } = await import("../api/trainer/shared-presentation-catalog.js");
  const { default: sharedMedia } = await import("../api/trainer/shared-presentation-media.js");
  const { default: curriculum } = await import("../api/trainer/curriculum.js");
  const { default: curriculumMedia } = await import("../api/trainer/curriculum-media.js");
  const routes = new Map([
    ["/api/trainer/shared-presentation-catalog", sharedCatalog],
    ["/api/trainer/shared-presentation-media", sharedMedia],
    ["/api/trainer/curriculum", curriculum],
    ["/api/trainer/curriculum-media", curriculumMedia],
  ]);
  server = http.createServer((request, response) => {
    const handler = routes.get(new URL(request.url || "/", origin).pathname);
    if (!handler) { response.statusCode = 404; response.end(); return; }
    Promise.resolve(handler(request, response)).catch(() => { if (!response.writableEnded) { response.statusCode = 503; response.end(); } });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const jars = new Map();
  async function signIn(name, email) {
    const jar = cookieJar(); jars.set(name, jar);
    const { auth } = await import("../src/server/auth/auth.js");
    const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }, body: JSON.stringify({ email, password }) }));
    applySetCookies(jar, response);
    assert.equal(response.status, 200, `${name}_LOGIN`);
  }
  async function get(name, route) {
    const jar = jars.get(name);
    const headers = { origin, "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET };
    if (jar?.size) headers.cookie = cookieHeader(jar);
    const response = await fetch(`${base}${route}`, { headers });
    return { response, body: await response.json().catch(() => null) };
  }

  const anonymous = await fetch(`${base}/api/trainer/shared-presentation-catalog`);
  assert.equal(anonymous.status, 401, "ANONYMOUS_PRESENTATIONS_401");
  await signIn("trainer", "r96b-trainer@example.test");
  const trainerCatalog = await get("trainer", "/api/trainer/shared-presentation-catalog");
  assert.equal(trainerCatalog.response.status, 200, "TRAINER_FREE_PRESENTATIONS_200");
  assert.equal(trainerCatalog.body.presentations.length, 5, "TRAINER_FREE_PRESENTATIONS_COUNT");
  const trainerCover = await get("trainer", "/api/trainer/shared-presentation-media?presentation=fixoku-genel-sunum&page=1&mode=thumb");
  assert.equal(trainerCover.response.status, 200, "TRAINER_PRESENTATION_MEDIA_200");
  const paidCurriculum = await get("trainer", `/api/trainer/curriculum?packageId=${paid.id}`);
  assert.equal(paidCurriculum.response.status, 200, "ACTIVE_ENTITLEMENT_CURRICULUM_200");
  assert.equal(paidCurriculum.body.slideCount, 185, "ACTIVE_ENTITLEMENT_CURRICULUM_COUNT");
  const paidMedia = await get("trainer", `/api/trainer/curriculum-media?packageId=${paid.id}&item=1`);
  assert.equal(paidMedia.response.status, 200, "ACTIVE_ENTITLEMENT_MEDIA_200");
  await pool.query("update trainer_package_entitlements set status='REVOKED',revoked_at=now(),revoke_reason='R96B test revoke' where trainer_user_id=$1 and package_id=$2", [trainer, paid.id]);
  const revokedCurriculum = await get("trainer", `/api/trainer/curriculum?packageId=${paid.id}`);
  assert.equal(revokedCurriculum.response.status, 403, "REVOKED_CURRICULUM_403");
  const revokedMedia = await get("trainer", `/api/trainer/curriculum-media?packageId=${paid.id}&item=1`);
  assert.equal(revokedMedia.response.status, 403, "REVOKED_MEDIA_403");
  await signIn("candidate", "r96b-candidate@example.test");
  const candidateCatalog = await get("candidate", "/api/trainer/shared-presentation-catalog");
  assert.equal(candidateCatalog.response.status, 200, "VERIFIED_CANDIDATE_FREE_PRESENTATIONS_200");
  await signIn("student", "r96b-student@example.test");
  const studentCatalog = await get("student", "/api/trainer/shared-presentation-catalog");
  assert.equal(studentCatalog.response.status, 403, "STUDENT_PRESENTATIONS_403");

  console.log(JSON.stringify({
    ANONYMOUS_PRESENTATIONS: "PASS_401",
    TRAINER_FREE_PRESENTATIONS: "PASS_200_5_ITEMS",
    VERIFIED_CANDIDATE_FREE_PRESENTATIONS: "PASS_200_NO_OWNER_APPROVAL",
    STUDENT_PRESENTATIONS: "PASS_403",
    ACTIVE_ENTITLEMENT_CURRICULUM_AND_MEDIA: "PASS_200",
    REVOKED_ENTITLEMENT_CURRICULUM_AND_MEDIA: "PASS_403",
    DATABASE_ISOLATION: disposable.databaseName,
  }));
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  for (const trackedPool of trackedPools) {
    if (trackedPool !== disposable.pool && !trackedPool.ended && !trackedPool.ending) await trackedPool.end();
  }
  pg.Pool.prototype.connect = originalPoolConnect;
  await disposable.dispose();
}
