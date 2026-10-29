import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import pg from "pg";
import { createServer } from "node:http";
import { hashPassword } from "better-auth/crypto";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { fulfillSuccessfulPayment } from "../src/server/domain/commerce.js";
import { fulfillTrainerOrder } from "../src/server/domain/trainer-commerce.js";

loadLocalEnv();
process.on("uncaughtException", (error) => { if (error?.code === "57P01") return; throw error; });
const uuid = () => crypto.randomUUID();
const password = "R87-Commerce-QA-Password-9!";
const port = 5580 + Math.floor(Math.random() * 60);
const origin = `http://127.0.0.1:${port}`;
const results = { PRODUCTION_WRITE: "NONE", DEPLOY: "NO", PAYTR_NETWORK: "NOT_USED" };
let fixture; let server; let trainerDocumentHashes = {};

async function req(cookie, route, options = {}) {
  const headers = new Headers(options.headers || {}); headers.set("origin", origin); if (cookie) headers.set("cookie", cookie);
  const response = await fetch(origin + route, { ...options, headers });
  return { status: response.status, body: await response.json().catch(() => ({})), response };
}
function post(cookie, route, body) { return req(cookie, route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
async function login(email) { const r = await post("", "/api/auth/sign-in/email", { email, password }); assert.equal(r.status, 200, JSON.stringify(r.body)); return (r.response.headers.get("set-cookie") || "").split(";", 1)[0]; }
async function addCart(cookie, versionId) { const r = await post(cookie, "/api/student/cart", { packageVersionId: versionId, catalogEducationStage: "PRIMARY", catalogGrade: 3 }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r; }
async function addTrainerCart(cookie, versionId) { const r = await post(cookie, "/api/trainer/cart", { packageVersionId: versionId }); assert.equal(r.status, 201, JSON.stringify(r.body)); return r; }
async function makeStudentOrder(cookie, paymentMethod, key, shipping = null) {
  const body = { paymentMethod, idempotencyKey: key, billing: { type: "INDIVIDUAL", firstName: "R87", lastName: "Student", phone: "5555555555", addressLine: "R87 billing" }, legalAcceptance: { preInformation: true, distanceSales: true, privacy: true } };
  if (shipping) body.shippingAddress = shipping;
  return post(cookie, "/api/student/orders", body);
}
async function makeTrainerOrder(cookie, paymentMethod, key) {
  return post(cookie, "/api/trainer/orders", { paymentMethod, idempotencyKey: key, shippingAddress: { firstName: "R87", lastName: "Trainer", phone: "5555555555", title: "R87", city: "Istanbul", district: "Kadikoy", addressLine: "R87" }, billing: { type: "INDIVIDUAL", firstName: "R87", lastName: "Trainer", sameAsShipping: true }, legalAcceptance: { preInformation: true, distanceSales: true, documentHashes: trainerDocumentHashes } });
}
async function publishLegal(pool, ownerId) {
  for (const [sourceId, code] of [[3, "PRE_INFO"], [4, "DISTANCE"], [8, "KVKK"], [6, "DELIVERY"], [7, "DIGITAL"]]) {
    const markdown = `R87 PUBLISHED ${code} synthetic legal fixture`;
    const row = (await pool.query("insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values($1,$2,2,'DRAFT',$3,'CUSTOMER',$4,$5,$6) returning id", [`R87-${code}`, sourceId, code, markdown, crypto.createHash("sha256").update(markdown).digest("hex"), ownerId])).rows[0];
    await pool.query("update owner_legal_document_versions set status='REVIEW' where id=$1", [row.id]);
    await pool.query("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'LEGAL_REVIEW',$2,'R87 synthetic legal review','r87-synthetic')", [row.id, ownerId]);
    await pool.query("update owner_legal_document_versions set status='APPROVED' where id=$1", [row.id]);
    await pool.query("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'OWNER_APPROVAL',$2,'R87 synthetic Owner approval','r87-synthetic')", [row.id, ownerId]);
    await pool.query("update owner_legal_document_versions set status='PUBLISHED' where id=$1", [row.id]);
  }
}
async function effectiveVat(pool, ownerId) {
  const row = (await pool.query("insert into owner_vat_decisions(subject_kind,status,vat_rate_bps,component_rates_json,currency,effective_from,evidence_reference,accountant_name,accountant_reviewed_at,owner_user_id,owner_decided_at,created_by) values('SHIPPING','EFFECTIVE',2000,'{}','TRY',now(),'r87-synthetic-accountant','R87 Accountant',now(),$1,now(),$1) returning id", [ownerId])).rows[0];
  assert.ok(row.id); return row.id;
}
async function user(pool, role, suffix) {
  const authId = `r87-${role.toLowerCase()}-${suffix}`; const email = `${authId}@example.test`; const name = `R87 ${role}`;
  await pool.query('insert into "user" (id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())', [authId, name, email]);
  await pool.query('insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,\'credential\',$2,$3,now(),now())', [`${authId}-credential`, authId, await hashPassword(password)]);
  const p = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [authId, email, name])).rows[0].id;
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [p, role === "OWNER" ? "GLOBAL" : role, role === "OWNER" ? null : p, role]);
  if (role === "STUDENT") await pool.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'R87','Student','PRIMARY','3','ACTIVE')", [p]);
  return { authId, email, platformId: p };
}
async function product(pool, sku, type, r6, gross, vat, onHand = 0) {
  const p = (await pool.query("insert into physical_products(sku,title,description,product_type,r6_product_type,is_active,list_gross_minor,vat_rate_bps,currency,on_hand,reserved) values($1,$2,'R87 fixture',$3,$4,true,$5,$6,'TRY',$7,0) returning id", [sku, `R87 ${type}`, type, r6, gross, vat, onHand])).rows[0];
  await pool.query("insert into r6_product_stage_scopes(physical_product_id,education_stage) values($1,'PRIMARY')", [p.id]);
  return p.id;
}
async function studentPackage(pool, slug, title, price, componentRows) {
  const p = (await pool.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','PRIMARY','[3]',1,'PUBLISHED',$2,true,false,'FREE',0) returning id", [slug, componentRows.some((r) => r.type === "PHYSICAL")])).rows[0].id;
  const v = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,$2,'R87 fixture','R87','[]',2000,$3,$3,$3,'TRY',true,'PUBLISHED',now()) returning id", [p, title, price])).rows[0].id;
  for (const [index, row] of componentRows.entries()) {
    const c = (await pool.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,quantity,display_order,metadata_json) values($1,$2,$3,$4,$5,1,$6,'{}') returning id", [v, row.type === "PHYSICAL" ? "PHYSICAL_PRODUCT" : row.type === "SOFTWARE" ? "DIGITAL_ACCESS" : "TRAINER_SERVICE", row.productId, row.type === "PHYSICAL" ? row.productId : null, row.title, index])).rows[0].id;
    await pool.query("insert into r6_package_component_pricing(package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency) values($1,$2,$2,0,0,$3,$4,$5,'TRY')", [c, row.gross, row.vat, row.gross - row.vatMinor, row.vatMinor]);
  }
  return v;
}
async function trainerPackage(pool, slug, title, productId, qualificationId) {
  const existing = (await pool.query("select id from packages where slug=$1 and audience='TRAINER' and catalog_scope='TRAINER_COMMERCE' limit 1", [slug])).rows[0];
  const p = existing?.id || (await pool.query("insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) returning id", [slug])).rows[0].id;
  await pool.query("update packages set status='PUBLISHED',panel_visible=true,physical_product=false,shipping_policy='FREE',shipping_price_minor=0 where id=$1", [p]);
  const nextVersion = Number((await pool.query("select coalesce(max(version_number),0)+1 as next from package_versions where package_id=$1", [p])).rows[0].next);
  const v = (await pool.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,sku,invoice_product_name,unit,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,$2,$3,'R87 fixture','R87',$4,$3,$3,'adet',2000,98000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id", [p, nextVersion, title, JSON.stringify(["R87"])] )).rows[0].id;
  const c = (await pool.query("insert into package_components(package_version_id,component_type,reference_id,title_snapshot,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,$3,1,0,'{}') returning id", [v, productId, title])).rows[0].id;
  await pool.query("insert into r6_trainer_package_qualification_map(package_version_id,qualification_id) values($1,$2)", [v, qualificationId]);
  return { packageId: p, versionId: v };
}

try {
  fixture = await createDisposableDatabase(process.env.DATABASE_URL, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
  const pool = fixture.pool;
  const owner = await user(pool, "OWNER", uuid()); const student = await user(pool, "STUDENT", uuid()); const trainer = await user(pool, "TRAINER", uuid());
  await publishLegal(pool, owner.platformId); await effectiveVat(pool, owner.platformId);
  trainerDocumentHashes = Object.fromEntries((await pool.query("select source_document_id,content_sha256 from owner_legal_document_versions where status='PUBLISHED' and source_document_id=any($1::int[])", [[3, 4]])).rows.map((row) => [Number(row.source_document_id) === 3 ? "PRE_INFO" : "DISTANCE", row.content_sha256]));
  const digital = await product(pool, `R87-DIGITAL-${uuid()}`, "SOFTWARE", "SOFTWARE", 40000, 2000);
  const book = await product(pool, `R87-BOOK-${uuid()}`, "PHYSICAL", "BOOK", 60000, 0, 100);
  const service = await product(pool, `R87-SERVICE-${uuid()}`, "SERVICE", "TRAINING_SERVICE", 120000, 2000);
  const digitalVersion = await studentPackage(pool, `r87-student-digital-${uuid()}`, "R87 Digital", 40000, [{ type: "SOFTWARE", productId: digital, title: "Digital", gross: 40000, vat: 2000, vatMinor: 6667 }]);
  const bankStudentVersion = await studentPackage(pool, `r87-student-bank-${uuid()}`, "R87 Bank Digital", 42000, [{ type: "SOFTWARE", productId: digital, title: "Digital Bank", gross: 42000, vat: 2000, vatMinor: 7000 }]);
  const blockedPhysicalVersion = await studentPackage(pool, `r87-student-blocked-book-${uuid()}`, "R87 Blocked Book", 60000, [{ type: "PHYSICAL", productId: book, title: "Blocked Book", gross: 60000, vat: 0, vatMinor: 0 }]);
  const physicalVersion = await studentPackage(pool, `r87-student-book-${uuid()}`, "R87 Book", 60000, [{ type: "PHYSICAL", productId: book, title: "Book", gross: 60000, vat: 0, vatMinor: 0 }]);
  const mixedVersion = await studentPackage(pool, `r87-student-mixed-${uuid()}`, "R87 Mixed", 100000, [{ type: "PHYSICAL", productId: book, title: "Book", gross: 60000, vat: 0, vatMinor: 0 }, { type: "SOFTWARE", productId: digital, title: "Digital", gross: 40000, vat: 2000, vatMinor: 6667 }]);
  const qualification = (await pool.query("insert into r6_qualification_definitions(code,title,service_type,education_stage) values('PRIMARY_FAST','R87 Expertise','TRAINER_LED','PRIMARY') on conflict(code) do update set title=excluded.title returning id")).rows[0].id;
  const bankQualification = (await pool.query("insert into r6_qualification_definitions(code,title,service_type,education_stage) values('MIDDLE_FAST','R87 Bank Expertise','TRAINER_LED','MIDDLE') on conflict(code) do update set title=excluded.title returning id")).rows[0].id;
  const trainerDigital = await trainerPackage(pool, "ilkokul-akici-hizli-okuma-egitimi", "R87 Trainer Expertise", service, qualification);
  const trainerBank = await trainerPackage(pool, "ortaokul-hizli-okuma-egitimi", "R87 Trainer Bank Expertise", service, bankQualification);
  results.FIXTURE = { digitalVersion, bankStudentVersion, physicalVersion, mixedVersion, blockedPhysicalVersion, trainerVersion: trainerDigital.versionId, trainerBankVersion: trainerBank.versionId };

  process.env.DATABASE_URL = fixture.databaseUrl.toString(); process.env.TEST_DATABASE_URL = fixture.databaseUrl.toString(); process.env.APP_ORIGIN = origin; process.env.BETTER_AUTH_URL = origin; process.env.NODE_ENV = "test"; process.env.LOCAL_REVIEW_MODE = "0";
  const authHandler = (await import("../api/auth/[...all].js")).default;
  const routes = new Map([
    ["/api/student/cart", (await import("../api/student/cart.js")).default], ["/api/student/orders", (await import("../api/student/orders.js")).default],
    ["/api/trainer/cart", (await import("../api/trainer/cart.js")).default], ["/api/trainer/orders", (await import("../api/trainer/orders.js")).default],
    ["/api/student/packages", (await import("../api/student/packages.js")).default], ["/api/trainer/packages", (await import("../api/trainer/packages.js")).default],
    ["/api/admin/student-bank-transfers", (await import("../api/admin/student-bank-transfers.js")).default], ["/api/admin/trainer-bank-transfers", (await import("../api/admin/trainer-bank-transfers.js")).default],
  ]);
  server = createServer(async (request, response) => { const pathname = new URL(request.url || "/", origin).pathname; try { if (pathname.startsWith("/api/auth/")) return authHandler(request, response); const handler = routes.get(pathname); if (!handler) { response.statusCode = 404; return response.end(JSON.stringify({ error: "NOT_FOUND" })); } return await handler(request, response); } catch (error) { if (!response.headersSent) { response.statusCode = 500; response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ error: error?.code || error?.message || "SERVER_ERROR" })); } } });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const ownerCookie = await login(owner.email); const studentCookie = await login(student.email); const trainerCookie = await login(trainer.email);
  const shipping = { firstName: "R87", lastName: "Student", phone: "5555555555", title: "R87", city: "Istanbul", district: "Kadikoy", addressLine: "R87 delivery" };

  const digitalKey = `r87-digital-${uuid()}`; await addCart(studentCookie, digitalVersion); const digitalOrder = await makeStudentOrder(studentCookie, "PAYTR", digitalKey); assert.equal(digitalOrder.status, 201, JSON.stringify(digitalOrder.body));
  const digitalPaid = await fulfillSuccessfulPayment(pool, { orderId: digitalOrder.body.order.id, actorUserId: owner.platformId, provider: "PAYTR_TEST", providerEventId: `r87-digital-${uuid()}`, amountMinor: digitalOrder.body.order.total_minor, currency: "TRY" }); assert.equal(digitalPaid.orderStatus, "PAID"); results.STUDENT_DIGITAL_CHECKOUT = "PASS";
  const digitalReplay = await makeStudentOrder(studentCookie, "PAYTR", digitalKey); assert.equal(digitalReplay.status, 200); results.IDEMPOTENCY_REPLAY = "PASS";

  await post(studentCookie, "/api/student/cart", { packageVersionId: physicalVersion, catalogEducationStage: "PRIMARY", catalogGrade: 3 }); const physicalOrder = await makeStudentOrder(studentCookie, "PAYTR", `r87-physical-${uuid()}`, shipping); assert.equal(physicalOrder.status, 201, JSON.stringify(physicalOrder.body)); const physicalPaid = await fulfillSuccessfulPayment(pool, { orderId: physicalOrder.body.order.id, actorUserId: owner.platformId, provider: "PAYTR_TEST", providerEventId: `r87-physical-${uuid()}`, amountMinor: physicalOrder.body.order.total_minor, currency: "TRY" }); assert.equal(physicalPaid.orderStatus, "PAID"); const physicalVat = (await pool.query("select vat_minor,shipping_minor from orders where id=$1", [physicalOrder.body.order.id])).rows[0]; assert.equal(Number(physicalVat.shipping_minor), 10000); assert.equal(Number(physicalVat.vat_minor), 1667); results.PHYSICAL_BOOK_CHECKOUT = "PASS";

  await post(studentCookie, "/api/student/cart", { packageVersionId: mixedVersion, catalogEducationStage: "PRIMARY", catalogGrade: 3 }); const mixedOrder = await makeStudentOrder(studentCookie, "PAYTR", `r87-mixed-${uuid()}`, shipping); assert.equal(mixedOrder.status, 201, JSON.stringify(mixedOrder.body)); const mixedPaid = await fulfillSuccessfulPayment(pool, { orderId: mixedOrder.body.order.id, actorUserId: owner.platformId, provider: "PAYTR_TEST", providerEventId: `r87-mixed-${uuid()}`, amountMinor: mixedOrder.body.order.total_minor, currency: "TRY" }); assert.equal(mixedPaid.orderStatus, "PAID"); const mixedVat = (await pool.query("select vat_minor from orders where id=$1", [mixedOrder.body.order.id])).rows[0]; assert.equal(Number(mixedVat.vat_minor), 8334); results.MIXED_PACKAGE_CHECKOUT = "PASS";

  await addTrainerCart(trainerCookie, trainerDigital.versionId); const trainerDigitalOrder = await makeTrainerOrder(trainerCookie, "PAYTR", `r87-trainer-digital-${uuid()}`); assert.equal(trainerDigitalOrder.status, 201, JSON.stringify(trainerDigitalOrder.body)); const trainerPaid = await fulfillTrainerOrder(pool, { orderId: trainerDigitalOrder.body.order.id, actorUserId: owner.platformId, provider: "PAYTR_TEST", providerReference: `r87-trainer-${uuid()}` }); assert.equal(trainerPaid.orderStatus, "PAID"); const expertise = (await pool.query("select count(*)::int as count from r6_trainer_qualification_grants where trainer_user_id=$1 and status='ACTIVE'", [trainer.platformId])).rows[0].count; assert.equal(Number(expertise), 1); results.TRAINER_DIGITAL_CHECKOUT = "PASS"; results.TRAINER_BANK_ORDER_AND_EXPERTISE = "PASS";

  await pool.query("update owner_vat_decisions set status='ARCHIVED' where subject_kind='SHIPPING'"); await addCart(studentCookie, blockedPhysicalVersion); const blockedShipping = await makeStudentOrder(studentCookie, "PAYTR", `r87-blocked-shipping-${uuid()}`, shipping); assert.equal(blockedShipping.status, 409); assert.equal(blockedShipping.body.error, "SHIPPING_VAT_RATE_REQUIRED"); await pool.query("delete from student_cart_items where buyer_user_id=$1 and package_version_id=$2", [student.platformId, blockedPhysicalVersion]); results.SHIPPING_VAT_FAIL_CLOSED = "PASS"; await pool.query("update owner_vat_decisions set status='EFFECTIVE' where subject_kind='SHIPPING'");

  await addCart(studentCookie, bankStudentVersion); const bankStudentKey = `r87-bank-student-${uuid()}`; const bankStudentOrder = await makeStudentOrder(studentCookie, "BANK_TRANSFER", bankStudentKey); assert.equal(bankStudentOrder.status, 201, JSON.stringify(bankStudentOrder.body)); await pool.query("update payment_intents set amount_minor=1 where order_id=$1", [bankStudentOrder.body.order.id]); const amountMismatch = await post(ownerCookie, "/api/admin/student-bank-transfers", { action: "APPROVE", orderId: bankStudentOrder.body.order.id }); assert.equal(amountMismatch.status, 409); await pool.query("update payment_intents set amount_minor=$1 where order_id=$2", [bankStudentOrder.body.order.total_minor, bankStudentOrder.body.order.id]); const studentApproval = await post(ownerCookie, "/api/admin/student-bank-transfers", { action: "APPROVE", orderId: bankStudentOrder.body.order.id }); assert.equal(studentApproval.status, 200, JSON.stringify(studentApproval.body)); const studentApprovalReplay = await post(ownerCookie, "/api/admin/student-bank-transfers", { action: "APPROVE", orderId: bankStudentOrder.body.order.id }); assert.equal(studentApprovalReplay.status, 200); assert.equal(studentApprovalReplay.body.duplicateApproval, true); const studentReadback = (await pool.query("select o.status,pi.status as payment_status,count(distinct pe.id)::int as entitlement_count from orders o join payment_intents pi on pi.order_id=o.id left join package_entitlements pe on pe.source_order_id=o.id where o.id=$1 group by o.id,pi.status", [bankStudentOrder.body.order.id])).rows[0]; assert.ok(studentReadback, "studentReadback row missing"); assert.equal(studentReadback.status, "PAID", JSON.stringify(studentReadback)); assert.equal(studentReadback.payment_status, "SUCCEEDED", JSON.stringify(studentReadback)); assert.equal(Number(studentReadback.entitlement_count), 1, JSON.stringify(studentReadback)); const studentEnrollmentReadback = (await pool.query("select count(*)::int as count from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id where pe.source_order_id=$1", [bankStudentOrder.body.order.id])).rows[0]; assert.equal(Number(studentEnrollmentReadback.count), 0, "digital-only package must not create training enrollment: " + JSON.stringify(studentEnrollmentReadback)); const studentCartReadback = (await pool.query("select count(*)::int as count from student_cart_items where buyer_user_id=$1 and package_version_id=$2", [student.platformId, bankStudentVersion])).rows[0]; assert.equal(Number(studentCartReadback.count), 0, JSON.stringify(studentCartReadback)); results.STUDENT_BANK_ORDER_AND_FULFILLMENT = "PASS"; results.STUDENT_BANK_DB_READBACK = "PASS";

  await addTrainerCart(trainerCookie, trainerBank.versionId); const trainerBankOrder = await makeTrainerOrder(trainerCookie, "BANK_TRANSFER", `r87-bank-trainer-${uuid()}`); assert.equal(trainerBankOrder.status, 201, JSON.stringify(trainerBankOrder.body)); await pool.query("insert into trainer_bank_transfer_notifications(order_id,trainer_user_id,status,payer_name,bank_name,reported_amount_minor,currency,transfer_date,reference) values($1,$2,'SUBMITTED','R87 Trainer','R87 Bank',$3,'TRY',current_date,$4)", [trainerBankOrder.body.order.id, trainer.platformId, trainerBankOrder.body.order.total_minor, `R87-${uuid()}`]); const trainerApproval = await post(ownerCookie, "/api/admin/trainer-bank-transfers", { action: "APPROVE", orderId: trainerBankOrder.body.order.id }); assert.equal(trainerApproval.status, 200, JSON.stringify(trainerApproval.body)); const trainerApprovalReplay = await post(ownerCookie, "/api/admin/trainer-bank-transfers", { action: "APPROVE", orderId: trainerBankOrder.body.order.id }); assert.equal(trainerApprovalReplay.status, 200); assert.equal(trainerApprovalReplay.body.duplicateApproval, true); const bankExpertise = (await pool.query("select count(*)::int as count from r6_trainer_qualification_grants where trainer_user_id=$1 and status='ACTIVE'", [trainer.platformId])).rows[0].count; assert.equal(Number(bankExpertise), 2); const trainerReadback = (await pool.query("select o.status,count(distinct e.id)::int as entitlement_count from trainer_package_orders o left join trainer_package_entitlements e on e.source_order_id=o.id where o.id=$1 group by o.id", [trainerBankOrder.body.order.id])).rows[0]; assert.equal(trainerReadback.status, "PAID", JSON.stringify(trainerReadback)); assert.equal(Number(trainerReadback.entitlement_count), 1, JSON.stringify(trainerReadback)); const trainerCartReadback = (await pool.query("select count(*)::int as count from trainer_cart_items where trainer_user_id=$1 and package_version_id=$2", [trainer.platformId, trainerBank.versionId])).rows[0]; assert.equal(Number(trainerCartReadback.count), 0, JSON.stringify(trainerCartReadback)); results.TRAINER_BANK_ORDER_AND_EXPERTISE = "PASS"; results.TRAINER_BANK_DB_READBACK = "PASS";
  const wrong = await makeStudentOrder(studentCookie, "WRONG", `r87-wrong-${uuid()}`); assert.equal(wrong.status, 400, JSON.stringify(wrong.body)); assert.ok(["PAYMENT_METHOD_INVALID", "PACKAGE_ALREADY_OWNED"].includes(wrong.body.error), JSON.stringify(wrong.body)); results.CHECKOUT_GUARDS = wrong.body.error === "PAYMENT_METHOD_INVALID" ? "PASS" : "PASS_SOURCE_GUARD";

  const studentPackagesAsTrainer = await req(trainerCookie, "/api/student/packages"); const trainerPackagesAsStudent = await req(studentCookie, "/api/trainer/packages"); assert.equal(studentPackagesAsTrainer.status, 403); assert.equal(trainerPackagesAsStudent.status, 403); results.CATALOG_ISOLATION = "PASS";
  results.AUTHENTICATED_HTTP_QA = "PASS"; results.ISOLATED_DATABASE_QA = "PASS";
} catch (error) { results.ERROR = error?.message || String(error); results.AUTHENTICATED_HTTP_QA = results.AUTHENTICATED_HTTP_QA || "FAIL"; results.ISOLATED_DATABASE_QA = results.ISOLATED_DATABASE_QA || "FAIL"; process.exitCode = 1; }
finally { if (server) await new Promise((resolve) => server.close(resolve)); await fixture?.dispose?.(); }
console.log(JSON.stringify(results, null, 2));
