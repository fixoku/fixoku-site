import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createServer } from "node:http";
import { hashPassword } from "better-auth/crypto";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
process.on("uncaughtException", (error) => {
  // Better Auth's module level pool may retain an idle connection after the
  // disposable database is dropped. The server and fixture are already
  // closed at this point; ignore only PostgreSQL administrator termination.
  if (error?.code === "57P01") return;
  throw error;
});
const root = process.cwd();
const password = "R86-Owner-QA-Password-9!";
const port = 5480 + Math.floor(Math.random() * 80);
const origin = `http://127.0.0.1:${port}`;
const results = { PRODUCTION_DB_WRITE: "NONE", PAYTR_FLAGS: "UNCHANGED", DEPLOY: "NO" };
let fixture;
let server;
let serverOutput = "";

function id() { return crypto.randomUUID(); }
async function request(cookie, route, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(origin + route, { ...options, headers });
  return { status: response.status, body: await response.json().catch(() => ({})), response };
}
async function login(email) {
  const result = await request("", "/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(result.status, 200, `login:${email}:${JSON.stringify(result.body)}`);
  const cookie = result.response.headers.get("set-cookie") || "";
  assert.ok(cookie, `cookie:${email}`);
  return cookie.split(";", 1)[0];
}
function post(cookie, route, body) { return request(cookie, route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
function patch(cookie, route, body) { return request(cookie, route, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }

try {
  fixture = await createDisposableDatabase(process.env.DATABASE_URL, { migrationsFolder: path.join(root, "drizzle", "migrations") });
  const pool = fixture.pool;
  const identities = [
    ["r86-owner", "r86.owner@example.test", "R86 Owner", "OWNER"],
    ["r86-student", "r86.student@example.test", "R86 Student", "STUDENT"],
    ["r86-trainer", "r86.trainer@example.test", "R86 Trainer", "TRAINER"],
  ];
  const platform = {};
  await pool.query("begin");
  try {
    for (const [authId, email, name, role] of identities) {
      await pool.query('insert into "user" (id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())', [authId, name, email]);
      await pool.query('insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,\'credential\',$2,$3,now(),now())', [`${authId}-credential`, authId, await hashPassword(password)]);
      const row = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [authId, email, name])).rows[0];
      platform[role] = row.id;
      await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [row.id, role === "OWNER" ? "GLOBAL" : role, role === "OWNER" ? null : row.id, role]);
      if (role === "STUDENT") await pool.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'R86','Student','PRIMARY','3','ACTIVE')", [row.id]);
    }
    const product = (await pool.query("insert into physical_products(sku,title,description,product_type,r6_product_type,is_active,list_gross_minor,vat_rate_bps,currency,on_hand,reserved) values($1,'R86 Kitap','R86 fixture','PHYSICAL','BOOK',true,55000,0,'TRY',0,0) returning id", [`R86-BOOK-${id()}`])).rows[0];
    await pool.query("insert into r6_product_stage_scopes(physical_product_id,education_stage) values($1,'PRIMARY')", [product.id]);
    const studentPackage = (await pool.query("select id from packages where slug='student-primary-baslangic' and audience='STUDENT' and catalog_scope='STUDENT_COMMERCE' limit 1")).rows[0];
    assert.ok(studentPackage, "seeded student package missing");
    await pool.query("update packages set education_stage='PRIMARY',eligible_grades_json='[3]',display_order=1,status='PUBLISHED',panel_visible=true,public_web_visible=false,shipping_policy='FREE',shipping_price_minor=0 where id=$1", [studentPackage.id]);
    await pool.query("update package_versions set status='RETIRED',purchase_enabled=false where package_id=$1", [studentPackage.id]);
    const studentNextVersion = Number((await pool.query("select coalesce(max(version_number),0)+1 as next from package_versions where package_id=$1", [studentPackage.id])).rows[0].next);
    const studentVersion = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,price_minor,price_gross_minor,price_net_minor,vat_rate_bps,currency,purchase_enabled,status,published_at) values($1,$2,'R86 Student','R86 Student package','R86','[]',55000,55000,55000,0,'TRY',true,'PUBLISHED',now()) returning id", [studentPackage.id, studentNextVersion])).rows[0];
    await pool.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,is_active,quantity,display_order,metadata_json) values($1,'PHYSICAL_PRODUCT',$2,$2,'R86 Kitap',true,1,0,'{}')", [studentVersion.id, product.id]);
    const trainerPackage = (await pool.query("select id from packages where slug='ilkokul-akici-hizli-okuma-egitimi' and audience='TRAINER' and catalog_scope='TRAINER_COMMERCE' limit 1")).rows[0];
    assert.ok(trainerPackage, "seeded trainer package missing");
    await pool.query("update packages set education_stage='PRIMARY',eligible_grades_json='[]',display_order=1,status='PUBLISHED',panel_visible=true,public_web_visible=false,shipping_policy='FREE',shipping_price_minor=0 where id=$1", [trainerPackage.id]);
    await pool.query("update package_versions set status='RETIRED',purchase_enabled=false where package_id=$1", [trainerPackage.id]);
    const trainerNextVersion = Number((await pool.query("select coalesce(max(version_number),0)+1 as next from package_versions where package_id=$1", [trainerPackage.id])).rows[0].next);
    const trainerVersion = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,sku,invoice_product_code,invoice_product_name,invoice_description,unit,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,$2,'R86 Trainer','R86 Trainer package','R86','[]','R86-TRAINER','R86-TRAINER','R86 Trainer','R86','adet',2000,999167,1199000,1199000,'TRY',true,'PUBLISHED',now()) returning id", [trainerPackage.id, trainerNextVersion])).rows[0];
    await pool.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,is_active,quantity,display_order,metadata_json) values($1,'PHYSICAL_PRODUCT',$2,$2,'R86 Kitap',true,1,0,'{}')", [trainerVersion.id, product.id]);
    await pool.query("commit");
    results.FIXTURE = { productId: product.id, studentPackageId: studentPackage.id, studentVersionId: studentVersion.id, trainerPackageId: trainerPackage.id, trainerVersionId: trainerVersion.id };
  } catch (error) { await pool.query("rollback"); throw error; }

  process.env.DATABASE_URL = fixture.databaseUrl.toString();
  process.env.TEST_DATABASE_URL = fixture.databaseUrl.toString();
  process.env.APP_ORIGIN = origin;
  process.env.BETTER_AUTH_URL = origin;
  process.env.NODE_ENV = "test";
  process.env.FIXOKU_DEV_LOGIN_ENABLED = "0";
  process.env.LOCAL_REVIEW_MODE = "0";
  const authHandler = (await import("../api/auth/[...all].js")).default;
  const routes = new Map([
    ["/api/owner-sign-in", (await import("../api/owner-sign-in.js")).default],
    ["/api/public/student-commerce-packages", (await import("../api/public/student-commerce-packages.js")).default],
    ["/api/admin/student-commerce-packages", (await import("../api/admin/student-commerce-packages.js")).default],
    ["/api/admin/trainer-packages", (await import("../api/admin/trainer-packages.js")).default],
    ["/api/student/packages", (await import("../api/student/packages.js")).default],
    ["/api/student/cart", (await import("../api/student/cart.js")).default],
    ["/api/student/orders", (await import("../api/student/orders.js")).default],
    ["/api/trainer/packages", (await import("../api/trainer/packages.js")).default],
    ["/api/trainer/cart", (await import("../api/trainer/cart.js")).default],
    ["/api/trainer/orders", (await import("../api/trainer/orders.js")).default],
  ]);
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url || "/", origin).pathname;
    try {
      if (pathname.startsWith("/api/auth/")) return authHandler(request, response);
      if (pathname.startsWith("/api/admin/products/")) {
        request.query = { id: pathname.split("/").pop() };
        const handler = (await import("../api/admin/products/[id].js")).default;
        return await handler(request, response);
      }
      const handler = routes.get(pathname);
      if (!handler) { response.statusCode = pathname === "/" ? 200 : 404; response.setHeader("content-type", "application/json"); return response.end(JSON.stringify({ ok: pathname === "/" })); }
      return await handler(request, response);
    } catch (error) { if (!response.headersSent) { response.statusCode = 500; response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ error: error?.code || error?.message || "SERVER_ERROR" })); } }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { const response = await fetch(origin + "/"); if (response.status < 500) break; } catch { /* wait */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const owner = await login("r86.owner@example.test");
  const student = await login("r86.student@example.test");
  const trainer = await login("r86.trainer@example.test");
  const { productId, studentPackageId, studentVersionId, trainerPackageId, trainerVersionId } = results.FIXTURE;
  const studentPayload = { packageId: studentPackageId, versionId: studentVersionId, title: "R86 Student Published", subtitle: "R86", description: "R86 student description", slug: "student-primary-baslangic", educationStage: "PRIMARY", eligibleGrades: [3], priceMinor: 55000, currency: "TRY", shippingFeeMinor: 0, displayOrder: 1, features: ["R86"], panelVisible: true, publicWebVisible: true, products: [{ productId, quantity: 1, displayOrder: 0 }], components: [{ componentType: "PHYSICAL_PRODUCT", physicalProductId: productId, productId, quantity: 1, isActive: true }] };
  const blockedPublication = await patch(owner, "/api/admin/student-commerce-packages", { ...studentPayload, title: "R86 Student Draft", priceMinor: 12345 });
  assert.equal(blockedPublication.status, 409, JSON.stringify(blockedPublication.body));
  assert.equal(blockedPublication.body.saved, true, JSON.stringify(blockedPublication.body));
  assert.equal(blockedPublication.body.published, false, JSON.stringify(blockedPublication.body));
  assert.equal(blockedPublication.body.error, "PUBLICATION_CONDITIONS_UNMET", JSON.stringify(blockedPublication.body));
  assert.match(String(blockedPublication.body.message), /Taslak kaydedildi ancak yayınlanmadı/u);
  results.PUBLICATION_GATE_FAIL_CLOSED = "PASS";
  const studentSave = await patch(owner, "/api/admin/student-commerce-packages", { ...studentPayload, versionId: blockedPublication.body.packageVersionId, title: "R86 Student Published" });
  assert.equal(studentSave.status, 200, JSON.stringify(studentSave.body));
  assert.equal(studentSave.body.published, true, JSON.stringify(studentSave.body));
  results.OWNER_SAVE_AND_PUBLISH = "PASS";
  const publishedStudentVersionId = studentSave.body.packageVersionId;
  const hiddenStudent = await patch(owner, "/api/admin/student-commerce-packages", { ...studentPayload, versionId: publishedStudentVersionId, title: "R86 Student Hidden", publicWebVisible: false });
  assert.equal(hiddenStudent.status, 200, JSON.stringify(hiddenStudent.body));
  const publicBeforeHide = await request("", "/api/public/student-commerce-packages");
  assert.equal(publicBeforeHide.status, 200);
  assert.equal(publicBeforeHide.body.packages.some((item) => item.id === studentPackageId), false);
  results.STUDENT_WEB_VISIBILITY = "PASS";

  const trainerSave = await patch(owner, `/api/admin/trainer-packages?id=${trainerPackageId}`, { versionId: trainerVersionId, title: "R86 Trainer Published", slug: "ilkokul-akici-hizli-okuma-egitimi", description: "R86 trainer description", shortDescription: "R86", features: ["R86"], priceGrossMinor: 1199000, priceNetMinor: 999167, vatRateBps: 2000, currency: "TRY", shippingPolicy: "FREE", shippingPriceMinor: 0, purchaseEnabled: true, panelVisible: true, publicWebVisible: true });
  assert.equal(trainerSave.status, 200, JSON.stringify(trainerSave.body));
  assert.equal(trainerSave.body.published, true, JSON.stringify(trainerSave.body));
  results.TRAINER_PANEL_CATALOG = "PASS";

  const packageSnapshotBefore = (await pool.query("select pv.title,pv.price_minor,pv.status from package_versions pv where pv.package_id=$1 and pv.status='PUBLISHED' order by pv.version_number desc limit 1", [studentPackageId])).rows[0];
  const productSave = await patch(owner, `/api/admin/products/${productId}`, { title: "R86 Kitap Güncellendi", listGrossMinor: 60000 });
  assert.equal(productSave.status, 200, JSON.stringify(productSave.body));
  const productAfter = (await pool.query("select title,list_gross_minor from physical_products where id=$1", [productId])).rows[0];
  assert.equal(productAfter.title, "R86 Kitap Güncellendi");
  assert.equal(Number(productAfter.list_gross_minor), 60000);
  const packageSnapshotAfter = (await pool.query("select pv.title,pv.price_minor,pv.status from package_versions pv where pv.package_id=$1 and pv.status='PUBLISHED' order by pv.version_number desc limit 1", [studentPackageId])).rows[0];
  assert.deepEqual(packageSnapshotAfter, packageSnapshotBefore);
  results.OWNER_PRODUCT_SAVE = "PASS";

  const studentCatalog = await request(student, "/api/student/packages");
  assert.equal(studentCatalog.status, 200, JSON.stringify(studentCatalog.body));
  assert.ok(studentCatalog.body.packages.some((item) => item.packageId === studentPackageId || item.id === studentVersionId));
  const studentCart = await post(student, "/api/student/cart", { packageVersionId: publishedStudentVersionId, catalogEducationStage: "PRIMARY", catalogGrade: 3 });
  assert.equal(studentCart.status, 200, JSON.stringify(studentCart.body));
  const trainerCatalog = await request(trainer, "/api/trainer/packages");
  assert.equal(trainerCatalog.status, 200, JSON.stringify(trainerCatalog.body));
  assert.ok(trainerCatalog.body.packages.some((item) => item.packageId === trainerPackageId));
  const trainerCart = await post(trainer, "/api/trainer/cart", { packageVersionId: trainerSave.body.packageVersionId });
  assert.equal(trainerCart.status, 201, JSON.stringify(trainerCart.body));
  results.AUTHENTICATED_HTTP_QA = "PASS";
  results.ISOLATED_DATABASE_QA = "PASS";

  const studentCheckout = await post(student, "/api/student/orders", { paymentMethod: "PAYTR", idempotencyKey: `r86-student-${id()}`, billing: { type: "INDIVIDUAL", firstName: "R86", lastName: "Student", phone: "5555555555", addressLine: "R86" }, legalAcceptance: { preInformation: true, distanceSales: true, privacy: true } });
  const trainerCheckout = await post(trainer, "/api/trainer/orders", { paymentMethod: "PAYTR", idempotencyKey: `r86-trainer-${id()}`, shippingAddress: { firstName: "R86", lastName: "Trainer", phone: "5555555555", title: "R86", city: "Istanbul", district: "Kadikoy", addressLine: "R86" }, billing: { type: "INDIVIDUAL", firstName: "R86", lastName: "Trainer", sameAsShipping: true }, legalAcceptance: { preInformation: true, distanceSales: true } });
  assert.ok([400, 409].includes(studentCheckout.status), JSON.stringify(studentCheckout.body));
  assert.ok([400, 409].includes(trainerCheckout.status), JSON.stringify(trainerCheckout.body));
  results.CHECKOUT_API = { student: studentCheckout.body.error || "BLOCKED", trainer: trainerCheckout.body.error || "BLOCKED" };
} catch (error) {
  results.ERROR = error?.message || String(error);
  results.AUTHENTICATED_HTTP_QA = results.AUTHENTICATED_HTTP_QA || "BLOCKED";
  results.ISOLATED_DATABASE_QA = results.ISOLATED_DATABASE_QA || "FAIL";
  if (serverOutput) results.SERVER_TAIL = serverOutput.slice(-2000);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await fixture?.dispose?.();
}

console.log(JSON.stringify(results, null, 2));
