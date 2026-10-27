import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { resolveTrainerPresentationViewer } from "../src/server/domain/trainer-shared-presentations.js";
import { productionPrivateMediaAvailable } from "../src/server/domain/digital-delivery.js";

loadLocalEnv();
const sourceUrl = process.env.R96B_SOURCE_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "R96B_SOURCE_DATABASE_URL_OR_LOCAL_DATABASE_REQUIRED");
const mediaRoot = process.env.R96B_MEDIA_ROOT || path.resolve(process.cwd(), "..", "..", "curriculum-recovery-001", "private");
const pdfRoot = process.env.R96B_PDF_ROOT || "D:\\FİXOKU\\GÜNCEL\\SUNUMLAR\\SUNUMLAR";
const curriculumRoot = path.join(mediaRoot, "trainer-curriculum");
const presentationRoot = path.join(mediaRoot, "trainer-shared-presentations");
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const pool = disposable.pool;

const curriculumExpected = new Map([
  ["ilkokul-akici-hizli-okuma-egitimi", [185, 17]],
  ["lise-hizli-okuma-egitimi", [238, 21]],
  ["lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt", [142, 1]],
  ["ortaokul-hizli-okuma-egitimi", [236, 22]],
  ["ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs", [145, 1]],
]);
const presentationPdfNames = [
  "EĞİTMEN İÇİN VELİ SEMİNER SUNUMU.pdf",
  "EĞİTMENLER İÇİN KURUM SUNUMU.pdf",
  "FİOKU GENEL TANITIM BROŞÜRÜ.pdf",
  "FİXOKU EĞİTMEN EĞİTİMİ BROŞÜRÜ UZUN.pdf",
  "FİXOKU GENEL SUNUM.pdf",
];

async function seedPackage(slug, title, trainerUserId, versionNumber = 1) {
  const pkg = (await pool.query(
    `insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor)
     values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0)
     on conflict(slug) do update set status='PUBLISHED',panel_visible=true
     returning id`, [slug],
  )).rows[0];
  const version = (await pool.query(
    `insert into package_versions(package_id,version_number,title,description,features_json,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at)
     values($1,$2,$3,$3,'[]',100000,120000,120000,'TRY',true,'PUBLISHED',now())
     on conflict(package_id,version_number) do update set status='PUBLISHED',purchase_enabled=true
     returning id`, [pkg.id, versionNumber, title],
  )).rows[0];
  await pool.query(
    `insert into trainer_package_entitlements(trainer_user_id,package_id,package_version_id,status,source,note)
     values($1,$2,$3,'ACTIVE','MANUAL_GIFT','LOCAL_REVIEW_FULL_ACCESS')
     on conflict (trainer_user_id,package_id) where status='ACTIVE' do update set note=excluded.note,source=excluded.source,revoked_at=null`,
    [trainerUserId, pkg.id, version.id],
  );
}

try {
  process.env.DATABASE_URL = disposable.databaseUrl.toString();
  process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();
  process.env.NODE_ENV = "test";
  process.env.LOCAL_REVIEW_MODE = "1";
  process.env.DIGITAL_STORAGE_PROVIDER = "LOCAL";
  process.env.DIGITAL_STORAGE_ROOT = mediaRoot;

  const trainer = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values('r96b-ozlem-auth','r96b-ozlem@example.test','Özlem KAPLAN R96B',true) returning id`,
  )).rows[0].id;
  await pool.query(
    `insert into platform_memberships(user_id,scope_type,scope_id,role,status)
     values($1,'TRAINER',$1,'TRAINER','ACTIVE')`, [trainer],
  );
  const verifiedCandidate = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values('r96b-candidate-auth','r96b-candidate@example.test','R96B Candidate',true) returning id`,
  )).rows[0].id;
  await pool.query(
    `insert into trainer_applications(first_name,last_name,email,status,legal_acknowledged,candidate_user_id)
     values('R96B','Candidate','r96b-candidate@example.test','RECEIVED',true,$1)`, [verifiedCandidate],
  );
  const pendingCandidate = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values('r96b-pending-auth','r96b-pending@example.test','R96B Pending',false) returning id`,
  )).rows[0].id;
  await pool.query(
    `insert into trainer_applications(first_name,last_name,email,status,legal_acknowledged,candidate_user_id)
     values('R96B','Pending','r96b-pending@example.test','RECEIVED',true,$1)`, [pendingCandidate],
  );

  for (const [slug] of curriculumExpected) await seedPackage(slug, `R96B ${slug}`, trainer);

  const markerCount = Number((await pool.query(
    "select count(*)::int as count from trainer_package_entitlements where trainer_user_id=$1 and source='MANUAL_GIFT' and note='LOCAL_REVIEW_FULL_ACCESS' and status='ACTIVE'",
    [trainer],
  )).rows[0].count);
  assert.equal(markerCount, 5, "LOCAL_REVIEW_FULL_ACCESS_ENTITLEMENT_COUNT");

  const activePrincipal = { user: { id: trainer, emailVerified: true }, memberships: [{ role: "TRAINER", status: "ACTIVE", scopeType: "TRAINER" }] };
  const candidatePrincipal = { user: { id: verifiedCandidate, emailVerified: true }, memberships: [] };
  const pendingPrincipal = { user: { id: pendingCandidate, emailVerified: false }, memberships: [] };
  const studentPrincipal = { user: { id: randomUUID(), emailVerified: true }, memberships: [{ role: "STUDENT", status: "ACTIVE", scopeType: "STUDENT" }] };
  assert.equal((await resolveTrainerPresentationViewer(pool, activePrincipal))?.kind, "TRAINER");
  assert.equal((await resolveTrainerPresentationViewer(pool, candidatePrincipal))?.kind, "VERIFIED_CANDIDATE");
  assert.equal(await resolveTrainerPresentationViewer(pool, pendingPrincipal), null);
  assert.equal(await resolveTrainerPresentationViewer(pool, studentPrincipal), null);
  assert.equal(await resolveTrainerPresentationViewer(pool, null), null);

  const manifest = JSON.parse(fs.readFileSync(path.join(presentationRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.presentations.length, 5, "SHARED_PRESENTATION_COUNT");
  for (const item of manifest.presentations) {
    const pages = fs.readdirSync(path.join(presentationRoot, item.id, "pages")).filter((name) => name.endsWith(".jpg"));
    const thumbs = fs.readdirSync(path.join(presentationRoot, item.id, "thumbs")).filter((name) => name.endsWith(".jpg"));
    assert.equal(pages.length, item.pageCount, `${item.id}_PAGES`);
    assert.equal(thumbs.length, item.pageCount, `${item.id}_THUMBS`);
  }
  for (const [slug, [slides, videos]] of curriculumExpected) {
    const curriculum = JSON.parse(fs.readFileSync(path.join(curriculumRoot, slug, "manifest.json"), "utf8"));
    assert.equal(curriculum.slideCount, slides, `${slug}_SLIDE_COUNT`);
    assert.equal(curriculum.videoCount, videos, `${slug}_VIDEO_COUNT`);
    for (const item of curriculum.items) {
      const file = path.join(curriculumRoot, slug, item.type === "video" ? "videos" : "", item.file);
      assert.ok(fs.existsSync(file), `${slug}_MISSING_${item.file}`);
    }
  }
  for (const file of presentationPdfNames) assert.ok(fs.existsSync(path.join(pdfRoot, file)), `PDF_MISSING_${file}`);

  const sharedSource = fs.readFileSync("src/server/domain/trainer-shared-presentations.js", "utf8");
  const curriculumSource = fs.readFileSync("api/trainer/curriculum-media.js", "utf8");
  assert.doesNotMatch(sharedSource, /trainer_package_entitlements/u, "FREE_PRESENTATION_MUST_NOT_USE_PAID_ENTITLEMENT");
  assert.match(sharedSource, /VERIFIED_CANDIDATE/u, "VERIFIED_CANDIDATE_POLICY");
  assert.match(curriculumSource, /e\.status = 'ACTIVE'/u, "PAID_MEDIA_ACTIVE_ENTITLEMENT_GATE");
  assert.equal(productionPrivateMediaAvailable({ NODE_ENV: "production", DIGITAL_STORAGE_PROVIDER: "LOCAL", DIGITAL_STORAGE_ROOT: mediaRoot }), false, "LOCAL_FIXTURE_DISABLED_IN_PRODUCTION");

  console.log(JSON.stringify({
    ANONYMOUS_PRESENTATION_ACCESS: "PASS_403_POLICY",
    UNVERIFIED_CANDIDATE_ACCESS: "PASS_403_POLICY",
    VERIFIED_CANDIDATE_PRESENTATION_ACCESS: "PASS_NO_OWNER_APPROVAL",
    ACTIVE_TRAINER_PRESENTATION_ACCESS: "PASS_NO_PACKAGE_PURCHASE",
    STUDENT_PRESENTATION_ACCESS: "PASS_403_POLICY",
    LOCAL_REVIEW_FULL_ACCESS: "PASS_DISPOSABLE_MARKER_AND_5_ENTITLEMENTS",
    CURRICULUM_MEDIA_COUNTS_AND_FILES: "PASS_946_SLIDES_62_VIDEOS",
    SHARED_PRESENTATION_PAGE_THUMBS: "PASS_5_MANIFESTS",
    REAL_PDF_SOURCES: "PASS_5_FILES_PRESENT",
    PAID_MEDIA_ENTITLEMENT_GATE: "PASS_PRESERVED",
    PRODUCTION_LOCAL_FIXTURE: "PASS_FAIL_CLOSED",
    DATABASE_ISOLATION: disposable.databaseName,
  }));
} finally {
  await disposable.dispose();
}
