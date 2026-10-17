import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import pg from "pg";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const taskStartLocal = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "long", hour12: false, timeZone: "Europe/Istanbul" }).format(new Date());
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "TEST_DATABASE_URL or DATABASE_URL is required");
const disposable = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
const previous = Object.fromEntries(["DATABASE_URL", "TEST_DATABASE_URL", "APP_ORIGIN", "BETTER_AUTH_URL", "NODE_ENV", "LOCAL_REVIEW_MODE", "EMAIL_PROVIDER", "PAYMENT_PROVIDER", "PAYTR_ENABLED", "COMMERCE_WEBHOOK_SECRET"].map((key) => [key, process.env[key]]));
const pools = new Set();
const originalConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function (...args) { pools.add(this); return originalConnect.apply(this, args); };
const origin = `http://127.0.0.1:${5300 + Math.floor(Math.random() * 70)}`;
const port = Number(new URL(origin).port);
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();
process.env.APP_ORIGIN = origin;
process.env.BETTER_AUTH_URL = origin;
process.env.NODE_ENV = "test";
process.env.LOCAL_REVIEW_MODE = "0";
process.env.EMAIL_PROVIDER = "DISABLED";
process.env.PAYMENT_PROVIDER = "";
process.env.PAYTR_ENABLED = "0";
delete process.env.COMMERCE_WEBHOOK_SECRET;

const password = "Release012D-Disposable-Password!";
const server = { process: null, output: "" };
const vitePath = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
let browser = null;
const results = {
  STUDENT_CHECKOUT_BROWSER: "FAIL",
  OWNER_STUDENT_APPROVAL_BROWSER: "FAIL",
  STUDENT_ENTITLEMENT_BROWSER: "FAIL",
  STUDENT_ASSIGNMENT_BROWSER: "FAIL",
  TRAINER_BANK_BROWSER: "FAIL",
  TRAINER_BADGE_BROWSER: "FAIL",
  PUBLIC_PACKAGE_TO_CART_BROWSER: "FAIL",
  UNAUTHORIZED_ACCESS: "FAIL",
};
let step = "seed";

async function createAccount(pool, { email, name, role, scopeType, scopeId = null }) {
  const { auth } = await import("../src/server/auth/auth.js");
  const created = await auth.api.signUpEmail({ body: { name, email, password } });
  assert.ok(created?.user?.id, `auth account created for ${email}`);
  await pool.query('update "user" set email_verified=true where id=$1', [created.user.id]);
  const platform = (await pool.query("update platform_users set email=$1,display_name=$2,email_verified=true where auth_user_id=$3 returning id", [email, name, created.user.id])).rows[0];
  assert.ok(platform?.id, `platform account created for ${email}`);
  const membershipScopeId = scopeId ?? (["STUDENT", "TRAINER"].includes(role) ? platform.id : null);
  await pool.query("delete from platform_memberships where user_id=$1", [platform.id]);
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [platform.id, scopeType, membershipScopeId, role]);
  return platform.id;
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try { const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(2_000) }); if (response.status < 500) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`LOCAL_SERVER_START_TIMEOUT:${server.output.slice(-800)}`);
}

async function login(page, route, email) {
  await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  await completeLogin(page, email);
}

async function completeLogin(page, email) {
  await page.getByLabel("E-posta adresi").fill(email);
  await page.locator("#role-password").fill(password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await page.waitForURL(/\/panel\//u, { timeout: 20_000 });
}

async function seed(pool) {
  const ownerId = await createAccount(pool, { email: "release012d-owner@example.invalid", name: "RELEASE012D Owner", role: "OWNER", scopeType: "GLOBAL" });
  const studentId = await createAccount(pool, { email: "release012d-student@example.invalid", name: "RELEASE012D Student", role: "STUDENT", scopeType: "STUDENT" });
  const trainerId = await createAccount(pool, { email: "release012d-trainer@example.invalid", name: "RELEASE012D Trainer", role: "TRAINER", scopeType: "TRAINER" });
  const profile = (await pool.query("update student_profiles set first_name='RELEASE012D',last_name='Student',education_stage='MIDDLE',grade='6',status='ACTIVE' where user_id=$1 returning id", [studentId])).rows[0];
  const program = (await pool.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,'RELEASE012D Ortaokul Programı','Disposable browser program','STUDENT','PUBLISHED','1') returning id", [`release012d-program-${crypto.randomUUID()}`])).rows[0];
  const studentProduct = (await pool.query("insert into physical_products(sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,currency) values($1,'RELEASE012D Öğrenci Hizmeti','Disposable service','SERVICE',true,100000,0,'TRY') returning id", [`RELEASE012D-STUDENT-${crypto.randomUUID()}`])).rows[0];
  const studentPackage = (await pool.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','MIDDLE','[6]',1,'PUBLISHED',false,true,true,'FREE',0) returning id", [`release012d-student-${crypto.randomUUID()}`])).rows[0];
  const studentVersion = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'BAŞLANGIÇ','RELEASE012D browser student package','Havale kabul paketi','[]',100000,'TRY',true,'PUBLISHED',now()) returning id", [studentPackage.id])).rows[0];
  await pool.query("insert into package_components(package_version_id,component_type,reference_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,'RELEASE012D Öğrenci Hizmeti','RELEASE012D Öğrenci Hizmeti',true,1,0,'{}'),($1,'TEXT_ITEM',null,'Browser kabul içeriği','Browser kabul içeriği',true,1,1,'{}')", [studentVersion.id, studentProduct.id]);
  await pool.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [studentVersion.id, program.id]);
  const trainerProduct = (await pool.query("insert into physical_products(sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,currency) values($1,'RELEASE012D Eğitmen Hizmeti','Disposable trainer service','SERVICE',true,100000,0,'TRY') returning id", [`RELEASE012D-TRAINER-${crypto.randomUUID()}`])).rows[0];
  const trainerPackage = (await pool.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values('ortaokul-hizli-okuma-egitimi','TRAINER','TRAINER_COMMERCE','MIDDLE','[]',1,'PUBLISHED',false,true,false,'FREE',0) on conflict(slug) do update set status='PUBLISHED',panel_visible=true returning id")).rows[0];
  const nextVersion = Number((await pool.query("select coalesce(max(version_number),0)+1 as next from package_versions where package_id=$1", [trainerPackage.id])).rows[0].next);
  const trainerVersion = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,price_gross_minor,price_net_minor,vat_rate_bps,currency,purchase_enabled,status,published_at) values($1,$2,'Ortaokul Hızlı Okuma Eğitmen Eğitimi','RELEASE012D browser trainer package','Eğitmen uzmanlık paketi','[]',100000,100000,100000,0,'TRY',true,'PUBLISHED',now()) returning id", [trainerPackage.id, nextVersion])).rows[0];
  await pool.query("insert into package_components(package_version_id,component_type,reference_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,'RELEASE012D Eğitmen Hizmeti','RELEASE012D Eğitmen Hizmeti',true,1,0,'{}')", [trainerVersion.id, trainerProduct.id]);
  const qualification = (await pool.query("select id from r6_qualification_definitions where code='MIDDLE_FAST'")).rows[0];
  await pool.query("insert into r6_trainer_package_qualification_map(package_version_id,qualification_id) values($1,$2) on conflict do nothing", [trainerVersion.id, qualification.id]);
  return { ownerId, studentId, trainerId, profileId: profile.id, studentVersionId: studentVersion.id, studentPackageId: studentPackage.id, trainerVersionId: trainerVersion.id, programId: program.id, studentEmail: "release012d-student@example.invalid", trainerEmail: "release012d-trainer@example.invalid", ownerEmail: "release012d-owner@example.invalid" };
}

async function createStudentOrder(page, data, { fromPublic = false } = {}) {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error.message || error).slice(0, 500)));
  if (!fromPublic) {
  step = "student packages load";
  await page.goto(`${origin}/panel/ogrenci/paketler`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Size Uygun Paketler" }).waitFor();
  const card = page.locator("article").filter({ hasText: "BAŞLANGIÇ" }).first();
  step = "student package add click";
  const [addResponse] = await Promise.all([
    page.waitForResponse(response =>
      response.url().includes("/api/student/cart") &&
      response.request().method() === "POST"
    ),
    card.getByRole("button", { name: "Satın al" }).click()
  ]);
  const addResult = await addResponse.json().catch(() => ({}));
  if (!addResponse.ok()) {
    throw new Error("STUDENT_ADD_TO_CART_FAILED:" + (addResult.error || addResponse.status()));
  }
  step = "student checkout page load";
  await page.waitForURL("**/panel/ogrenci/checkout", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  }
  step = "student individual billing click";
  await page.getByLabel("Bireysel Fatura").click();
  step = "student tc fill";
  await page.getByPlaceholder("11 haneli T.C. Kimlik No").fill("11111111111");
  step = "student bank radio";
  await page.locator("label").filter({ hasText: "Havale / EFT" }).last().click();
  step = "student cart preflight";
const cartResponse = await page.request.get(`${origin}/api/student/cart`);
const cartBody = await cartResponse.json().catch(() => ({}));
const cartItems = cartBody.cart?.items ?? cartBody.items ?? [];
if (!cartResponse.ok() || cartItems.length === 0) {
  throw new Error("STUDENT_CART_EMPTY_BEFORE_CHECKOUT");
}

step = "student legal consents";
await page.getByLabel("Ön bilgilendirme formunu okudum.").check();
await page.getByLabel("Mesafeli satış sözleşmesini kabul ediyorum.").check();
await page.getByLabel("KVKK aydınlatma metnini okudum.").check();
step = "student order submit";
  const orderButton = page.getByRole("button", { name: "Siparişi oluştur" });
  await orderButton.click();
  step = "student order wait";
  try {
    await page.locator('[role="status"]').filter({ hasText: "Ödeme Bekliyor" }).waitFor();
  } catch {
    const postText = await page.locator("body").innerText();
    const invalid = await page.locator("input:invalid,select:invalid,textarea:invalid").evaluateAll((els) => els.map((el) => ({ name: el.getAttribute("name"), id: el.id, value: el.value, message: el.validationMessage })).slice(0, 10));
    throw new Error(`STUDENT_CHECKOUT_POST_SUBMIT_TEXT:${page.url()}:${postText.slice(0, 1200)}:INVALID=${JSON.stringify(invalid)}:PAGE_ERRORS=${pageErrors.join("|")}`);
  }
  return true;
}

async function approveStudent(ownerPage, studentEmail) {
  await ownerPage.goto(`${origin}/panel/admin/odemeler`, { waitUntil: "networkidle" });
  await ownerPage.getByRole("heading", { name: "Öğrenci havale / EFT kuyruğu" }).waitFor();
  const row = ownerPage.locator("tr").filter({ hasText: studentEmail }).first();
  if (await row.count() === 0) {
    const debugResponse = await ownerPage.request.get(`${origin}/api/admin/student-bank-transfers`);
    throw new Error(`OWNER_STUDENT_QUEUE_ROW_MISSING:${debugResponse.status()}:${(await debugResponse.text()).slice(0, 300)}`);
  }
  await row.scrollIntoViewIfNeeded();
  await row.getByRole("button", { name: "Onayla" }).click();
  await ownerPage.getByText("Ödeme incelemesi kaydedildi", { exact: false }).waitFor();
  return true;
}

async function createTrainerOrder(trainerPage) {
  step = "trainer trainings load";
  await trainerPage.goto(`${origin}/panel/egitmen/egitimlerim`, { waitUntil: "networkidle" });
  const card = trainerPage.locator("article").filter({ hasText: "Ortaokul Hızlı Okuma Eğitmen Eğitimi" }).first();
  step = "trainer training detail";
  await card.getByRole("button", { name: /Eğitimi İncele/ }).click();
  step = "trainer training buy";
  await card.getByRole("button", { name: "Satın Al" }).click();
  step = "trainer checkout open";
  await trainerPage.getByRole("button", { name: "Ödemeye Geç" }).click();
  step = "trainer checkout identity";
  await trainerPage.getByLabel("Ad", { exact: true }).fill("RELEASE012D");
  await trainerPage.getByLabel("Soyad", { exact: true }).fill("Trainer");
  await trainerPage.getByLabel("Telefon", { exact: true }).fill("5551234567");
  step = "trainer checkout address";
  const addressSelects = trainerPage.locator("select");
  if (await addressSelects.count() !== 2) {
    throw new Error("TRAINER_ADDRESS_SELECT_COUNT_UNEXPECTED");
  }

  await addressSelects.nth(0).selectOption("İstanbul", { timeout: 5000 });

  await addressSelects.nth(1)
    .locator('option[value="Kadıköy"]')
    .waitFor({ state: "attached", timeout: 10000 });

  await addressSelects.nth(1).selectOption("Kadıköy", { timeout: 5000 });

  step = "trainer checkout payment";
  await trainerPage.getByLabel("Açık adres", { exact: true }).fill("Disposable browser adresi");
  await trainerPage.getByPlaceholder("11 haneli T.C. Kimlik No").fill("11111111111");
  await trainerPage.locator("label").filter({ hasText: "Havale / EFT" }).last().click();

  const trainerLegalConsent = trainerPage.getByLabel(
    "Ön bilgilendirme ve mesafeli satış koşullarını okudum.",
    { exact: true }
  );

  await trainerLegalConsent.check();

  step = "trainer order submit";
  await trainerPage.getByRole("button", { name: "Siparişi oluştur" }).click();

  step = "trainer bank form";
  await trainerPage.getByRole("heading", { name: "Havale / EFT Bildirimi" }).waitFor();
  await trainerPage.getByLabel("Ödeyen adı").fill("RELEASE012D Trainer");
  await trainerPage.getByLabel("Gönderen banka").fill("Test Bankası");
  await trainerPage.getByLabel("Gönderilen tutar (TL)").fill("1000");
  await trainerPage.getByLabel("Banka referans no").fill("RELEASE012D-TRANSFER");
  await trainerPage.getByRole("button", { name: "Havale/EFT bildirimini gönder" }).click();
  step = "trainer bank confirmation";
  await trainerPage.getByText("Havale/EFT bildiriminiz alındı", { exact: false }).waitFor();
  return true;
}

async function approveTrainer(ownerPage, trainerEmail) {
  await ownerPage.goto(`${origin}/panel/admin/egitmen-ticaret?section=purchases`, { waitUntil: "networkidle" });
  const row = ownerPage.locator("article").filter({ hasText: trainerEmail }).first();
  await row.getByText("Detay", { exact: false }).click();
  ownerPage.once("dialog", (dialog) => dialog.accept("RELEASE012D browser approval"));
  await row.getByRole("button", { name: "Ödeme geldi" }).click();
  await ownerPage.getByText("Ödeme onaylandı; satın alınan eğitim erişimi aktif edildi.", { exact: false }).waitFor();
  return true;
}

try {
  browser = await chromium.launch({ headless: true });
  const pool = disposable.pool;
  const data = await seed(pool);
  server.process = spawn(process.execPath, [vitePath, "--host", "127.0.0.1", "--port", String(port)], { cwd: process.cwd(), env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.process.stdout.on("data", (chunk) => { server.output += chunk.toString(); });
  server.process.stderr.on("data", (chunk) => { server.output += chunk.toString(); });
  await waitForServer();

  step = "public package page";
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`${origin}/egitim-paketleri`, { waitUntil: "networkidle" });
  const publicCatalogResponse = await publicPage.request.get(`${origin}/api/public/student-commerce-packages`);
  const publicCatalogBody = await publicCatalogResponse.json().catch(() => ({}));
  assert.equal(publicCatalogResponse.status(), 200, "public catalog API is available anonymously");
  assert.ok((publicCatalogBody.packages || []).some((item) => item.packageVersionId === data.studentVersionId), "published web-visible Owner package is public");
  assert.equal((publicCatalogBody.packages || []).some((item) => item.packageVersionId === data.trainerVersionId), false, "non-public trainer package is not exposed");
  step = "public middle category click";
  await publicPage.getByRole("button", { name: "Ortaokul Eğitim Paketlerimiz" }).click();
  const publicCard = publicPage.locator("article").filter({ hasText: "BAŞLANGIÇ" }).first();
  step = "public package Hemen Al click";
  const publicBuyLink = publicCard.getByRole("link", { name: /BAŞLANGIÇ paketi için öğrenci paneline git/ });
  await publicBuyLink.scrollIntoViewIfNeeded();
  const publicHref = await publicBuyLink.getAttribute("href");
  assert.ok(publicHref, "public package purchase link exists");
  const selectedPublicVersionId = new URL(publicHref, origin).searchParams.get("packageVersionId");
  assert.equal(selectedPublicVersionId, data.studentVersionId, "public package link keeps the published version identity");
  await publicBuyLink.click();
  await publicPage.waitForURL(/\/giris\?returnTo=/u, { timeout: 15_000 });
  const chooserReturnTo = new URL(publicPage.url()).searchParams.get("returnTo") || "";
  assert.match(chooserReturnTo, new RegExp(`packageVersionId=${data.studentVersionId}`), "login flow keeps selected package");
  await publicPage.getByRole("link", { name: /Öğrenci alanına geç/ }).click();
  await publicPage.waitForURL(/\/ogrenci-girisi\?returnTo=/u, { timeout: 10_000 });
  step = "public selected package login";
  await completeLogin(publicPage, data.studentEmail);
  await publicPage.waitForURL("**/panel/ogrenci/sepet", { timeout: 20_000 });
  await publicPage.getByRole("heading", { name: "Sepetim" }).waitFor();
  await publicPage.getByRole("button", { name: "Ödemeye Geç" }).click();
  await publicPage.waitForURL("**/panel/ogrenci/checkout", { timeout: 20_000 });
  await publicPage.getByRole("heading", { name: "Ödemeye Geçin" }).waitFor();
  const publicCartResponse = await publicPage.request.get(`${origin}/api/student/cart`);
  const publicCartBody = await publicCartResponse.json().catch(() => ({}));
  const publicCartItems = publicCartBody.items ?? publicCartBody.cart?.items ?? [];
  assert.equal(publicCartResponse.status(), 200, "student cart is readable after public selection");
  assert.equal(publicCartItems.length, 1, "public selection creates one cart item");
  assert.equal(publicCartItems[0]?.packageVersionId, data.studentVersionId, "cart keeps public package identity");
  assert.equal(Number(publicCartItems[0]?.priceMinor), 100000, "cart keeps Owner catalog price");
  results.PUBLIC_PACKAGE_TO_CART_BROWSER = "PASS";

  const studentContext = publicContext;
  const studentPage = publicPage;
  step = "student checkout create";
  await createStudentOrder(studentPage, data, { fromPublic: true });
  results.STUDENT_CHECKOUT_BROWSER = "PASS";
  const browserStudentOrder = (await pool.query("select id,status,payment_method,catalog_scope_snapshot from orders where buyer_user_id=$1 order by created_at desc limit 1", [data.studentId])).rows[0];
  if (!browserStudentOrder || browserStudentOrder.payment_method !== "BANK_TRANSFER" || browserStudentOrder.status !== "PENDING_PAYMENT" || browserStudentOrder.catalog_scope_snapshot !== "STUDENT_COMMERCE") throw new Error(`STUDENT_BROWSER_ORDER_STATE:${JSON.stringify(browserStudentOrder || {})}`);
  const entitlementBeforeApproval = (await pool.query("select id from package_entitlements where beneficiary_student_user_id=$1 and package_version_id=$2 and status='ACTIVE' limit 1", [data.studentId, data.studentVersionId])).rows[0];
  if (entitlementBeforeApproval) throw new Error("STUDENT_ENTITLEMENT_OPEN_BEFORE_BANK_APPROVAL");
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  step = "owner login";
  await login(ownerPage, "/owner-girisi", data.ownerEmail);
  step = "owner student approval";
  await approveStudent(ownerPage, data.studentEmail);
  results.OWNER_STUDENT_APPROVAL_BROWSER = "PASS";
  step = "student entitlement browser";
  await studentPage.goto(`${origin}/panel/ogrenci/paketler`, { waitUntil: "networkidle" });
  await studentPage.getByText("Sipariş kaydı mevcut", { exact: false }).waitFor();
  results.STUDENT_ENTITLEMENT_BROWSER = "PASS";
  step = "student assignment browser";
  await studentPage.goto(`${origin}/panel/ogrenci`, { waitUntil: "networkidle" });
  await studentPage.getByText("Henüz size atanmış bir eğitmen bulunmuyor.", { exact: false }).waitFor();
  results.STUDENT_ASSIGNMENT_BROWSER = "PASS";
  step = "unauthorized admin browser";
  await studentPage.goto(
    `${origin}/panel/admin/odemeler`,
    { waitUntil: "domcontentloaded", timeout: 15000 }
  );
  await studentPage.waitForTimeout(1000);
  const ownerPaymentApiResponse = await studentPage.request.get(`${origin}/api/admin/student-bank-transfers`);
  assert.ok([401, 403].includes(ownerPaymentApiResponse.status()), `student owner payment API must be denied: ${ownerPaymentApiResponse.status()}`);
  results.UNAUTHORIZED_ACCESS = (await studentPage.getByRole("heading", { name: "Öğrenci havale / EFT kuyruğu" }).count()) === 0 ? "PASS" : "FAIL";

  const trainerContext = await browser.newContext();
  const trainerPage = await trainerContext.newPage();
  step = "trainer login";
  await login(trainerPage, "/ogretmen-girisi", data.trainerEmail);
  step = "trainer bank order browser";
  await createTrainerOrder(trainerPage);
  results.TRAINER_BANK_BROWSER = "PASS";
  step = "owner trainer approval browser";
  await approveTrainer(ownerPage, data.trainerEmail);
  step = "trainer badge browser";
  await trainerPage.goto(`${origin}/panel/egitmen/egitimlerim`, { waitUntil: "networkidle" });
  const trainerCard = trainerPage.locator("article").filter({ hasText: "Ortaokul Hızlı Okuma Eğitmen Eğitimi" }).first();
  await trainerCard.getByText("Satın Alındı", { exact: false })
    .waitFor({ timeout: 8000 });

  await trainerCard.getByText("Uzmanlık Aktif", { exact: false })
    .waitFor({ timeout: 8000 });
  await trainerPage.goto(`${origin}/panel/egitmen/profil`, { waitUntil: "networkidle" });
  const expectedBadgeText = trainerPage.getByText(
    "Ortaokul Uzman Hızlı Okuma Eğitmeni",
    { exact: false }
  );

  const expectedBadgeImage = trainerPage.getByRole("img", {
    name: /Ortaokul Uzman Hızlı Okuma Eğitmeni/i
  });

  if (
    await expectedBadgeText.count() === 0 &&
    await expectedBadgeImage.count() === 0
  ) {
    throw new Error("TRAINER_PROFILE_BADGE_NOT_FOUND");
  }
  results.TRAINER_BADGE_BROWSER = "PASS";

  await studentContext.close();
  await trainerContext.close();
  await ownerContext.close();
  console.log(JSON.stringify({ ...results, TASK_START_LOCAL_TIME: taskStartLocal, TEST_DATABASE: "DISPOSABLE_ONLY", PORT: port }));
} catch (error) {
  console.log(JSON.stringify({ ...results, ERROR: error?.message?.split("\n", 1)[0] || "BROWSER_ACCEPTANCE_FAILED", STEP: step, TASK_START_LOCAL_TIME: taskStartLocal, TEST_DATABASE: "DISPOSABLE_ONLY", PORT: port }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server.process && !server.process.killed) { server.process.kill(); await Promise.race([once(server.process, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]); }
  pg.Pool.prototype.connect = originalConnect;
  for (const pool of pools) if (pool !== disposable.pool && !pool.ended && !pool.ending) await pool.end();
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await disposable.dispose();
}
