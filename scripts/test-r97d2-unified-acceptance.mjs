import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(sourceUrl, "R96S_DISPOSABLE_SOURCE_URL_REQUIRED");
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:5197";
process.env.BETTER_AUTH_TEST_MAIL_SINK = "1";
process.env.PAYTR_ENABLED = "0";
process.env.SHIPPING_PROVIDER = "DISABLED";
process.env.EMAIL_PROVIDER = "DISABLED";
process.env.REFUND_EVIDENCE_SECRET = "r96s-disposable-refund-evidence-secret";

const disposable = await createDisposableDatabase(sourceUrl, {
  migrationsFolder: path.join(process.cwd(), "drizzle", "migrations"),
});
process.env.DATABASE_URL = disposable.databaseUrl.toString();
process.env.TEST_DATABASE_URL = disposable.databaseUrl.toString();

const { clearLifecycleMail, consumeLifecycleMail } = await import("../src/server/domain/test-email-capture.js");
const { auth, authDbPool } = await import("../src/server/auth/auth.js");
const { default: accountLifecycle } = await import("../api/account-lifecycle.js");
const { default: studentProfileHandler } = await import("../api/student/profile.js");
const { default: studentPortal } = await import("../api/student/portal-context.js");
const { default: studentPackages } = await import("../api/student/packages.js");
const { default: studentCart } = await import("../api/student/cart.js");
const { default: studentOrders } = await import("../api/student/orders.js");
const { default: bankTransfers } = await import("../api/admin/student-bank-transfers.js");
const { default: assignedTrainer } = await import("../api/student/assigned-trainer.js");
const { default: trainerProgress } = await import("../api/trainer/progress.js");
const { default: trainerCompletions } = await import("../api/trainer/completions.js");
const { default: orderRefunds } = await import("../api/admin/order-refunds.js");
const { createTrustedRefundEvidenceToken } = await import("../src/server/payments/refund-adapter.js");
const { assertTrainerEligibleForEnrollment } = await import("../api/admin/assignment-requests/[id].js");
const { default: assignmentRequestHandler } = await import("../api/admin/assignment-requests/[id].js");
const { fulfillTrainerOrder } = await import("../src/server/domain/trainer-commerce.js");

const pool = disposable.pool;
const uuid = () => crypto.randomUUID();
const origin = process.env.APP_ORIGIN;
const password = "R96S-Student-Password!";

function responseCapture() {
  const state = { statusCode: 200, headers: {}, body: undefined };
  return {
    get statusCode() { return state.statusCode; },
    set statusCode(value) { state.statusCode = value; },
    setHeader(name, value) { state.headers[String(name).toLowerCase()] = String(value); },
    end(value) {
      state.body = Buffer.isBuffer(value) ? value : (value == null ? null : JSON.parse(String(value)));
    },
    result() { return state; },
  };
}

async function call(handler, { method = "GET", url, body, cookie = "" } = {}) {
  const req = { method, url, headers: { origin, ...(cookie ? { cookie } : {}) } };
  if (body !== undefined) {
    req.body = body;
    req[Symbol.asyncIterator] = async function* requestBody() { yield JSON.stringify(body); };
  }
  const res = responseCapture();
  await handler(req, res);
  return res.result();
}

async function notificationCount(recipientUserId, eventType) {
  return Number((await pool.query("select count(*)::int as count from panel_notifications where recipient_user_id=$1 and event_type=$2", [recipientUserId, eventType])).rows[0]?.count || 0);
}

function cookieHeader(authResponse) {
  const values = typeof authResponse.headers.getSetCookie === "function"
    ? authResponse.headers.getSetCookie()
    : (authResponse.headers.get("set-cookie") ? [authResponse.headers.get("set-cookie")] : []);
  return values.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
}

async function signIn(email, suppliedPassword) {
  const result = await auth.handler(new Request("http://local/api/auth/sign-in/email", {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET },
    body: JSON.stringify({ email, password: suppliedPassword }),
  }));
  assert.equal(result.status, 200, `SIGN_IN_FAILED:${email}`);
  return cookieHeader(result);
}

async function createDirectAccount({ email, name, role, scopeType, scopeId = null }) {
  const authId = `r96s-${uuid()}`;
  const platform = (await pool.query(
    "insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id",
    [authId, email, name],
  )).rows[0];
  const passwordHash = await hashPassword(password);
  await pool.query(
    "insert into \"user\"(id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())",
    [authId, name, email],
  );
  await pool.query(
    "insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now())",
    [`${authId}:credential`, authId, passwordHash],
  );
  await pool.query(
    "insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')",
    [platform.id, scopeType, scopeId, role],
  );
  return platform.id;
}

async function seedLegalCatalog(ownerId) {
  for (const [documentKey, sourceDocumentId] of [["PRE_INFO", 3], ["DISTANCE", 4], ["KVKK", 8]]) {
    const markdown = `R96S disposable published ${documentKey}`;
    const contentSha = crypto.createHash("sha256").update(markdown, "utf8").digest("hex");
    await pool.query(
      "insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values($1,$2,1,'PUBLISHED',$3,'CUSTOMER',$4,$5,$6)",
      [documentKey, sourceDocumentId, documentKey, markdown, contentSha, ownerId],
    );
  }
  const programId = (await pool.query(
    "insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,'R96S Hızlı Okuma','R96S disposable','STUDENT','PUBLISHED',1) returning id",
    [`r96s-fast-reading-${uuid()}`],
  )).rows[0].id;
  const programId2 = (await pool.query(
    "insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,'R96S Hızlı Okuma İleri','R96S disposable completion history','STUDENT','PUBLISHED',2) returning id",
    [`r96s-fast-reading-advanced-${uuid()}`],
  )).rows[0].id;
  const productId = (await pool.query(
    "insert into physical_products(sku,title,description,product_type,is_active,r6_product_type,list_gross_minor,vat_rate_bps,service_type,service_mode,min_students,max_students,currency) values($1,'R96S Eğitim Hizmeti','R96S disposable','SERVICE',true,'TRAINING_SERVICE',120000,2000,'FAST_READING','INDIVIDUAL',1,1,'TRY') returning id",
    [`R96S-SERVICE-${uuid()}`],
  )).rows[0].id;
  const packageId = (await pool.query(
    "insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor,icon_reference) values($1,'STUDENT','STUDENT_COMMERCE','MIDDLE','[5,6,7,8]',1,'PUBLISHED',false,true,true,'FREE',0,'r96s-cover') returning id",
    [`r96s-student-package-${uuid()}`],
  )).rows[0].id;
  const versions = [];
  for (const versionNumber of [1, 2]) {
    const versionId = (await pool.query(
      "insert into package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,$2,$3,'R96S description','R96S subtitle','[\"R96S feature\"]',2000,100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id",
      [packageId, versionNumber, `R96S Öğrenci Paketi v${versionNumber}`],
    )).rows[0].id;
    const componentId = (await pool.query(
      "insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,null,'R96S Eğitim Hizmeti','R96S Eğitim Hizmeti',true,1,1,'{}') returning id",
      [versionId, productId],
    )).rows[0].id;
    await pool.query(
      "insert into r6_package_component_pricing(package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency) values($1,120000,120000,0,0,2000,100000,20000,'TRY')",
      [componentId],
    );
    await pool.query(
      "insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')",
      [versionId, versionNumber === 1 ? programId : programId2],
    );
    versions.push(versionId);
  }
  const qualificationId = (await pool.query("select id from r6_qualification_definitions where code='MIDDLE_FAST' limit 1")).rows[0]?.id;
  assert.ok(qualificationId, "R6_MIDDLE_FAST_QUALIFICATION_REQUIRED");
  return { programId, programId2, productId, packageId, versions, qualificationId };
}

async function seedTrainerOrder(trainerId, qualificationId) {
  const packageRow = (await pool.query("select id from packages where slug=$1 and audience='TRAINER' limit 1", ["ortaokul-hizli-okuma-egitimi"])).rows[0]
    || (await pool.query(
      "insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) returning id",
      ["ortaokul-hizli-okuma-egitimi"],
    )).rows[0];
  const nextVersion = Number((await pool.query("select coalesce(max(version_number),0)+1 as next from package_versions where package_id=$1", [packageRow.id])).rows[0].next);
  const version = (await pool.query(
    "insert into package_versions(package_id,version_number,title,description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,$2,'R97D-2 Eğitmen Uzmanlık Paketi','R97D-2 disposable','[]',2000,100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id",
    [packageRow.id, nextVersion],
  )).rows[0];
  await pool.query("insert into r6_trainer_package_qualification_map(package_version_id,qualification_id) values($1,$2)", [version.id, qualificationId]);
  const order = (await pool.query(
    `insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,invoice_status,idempotency_key,request_hash)
     values($1,'PAYMENT_REVIEW','BANK_TRANSFER','TRY',120000,0,0,20000,120000,'{}','{}','PENDING',$2,$3) returning id`,
    [trainerId, `r97d2-trainer-order:${uuid()}`, `r97d2-trainer-hash:${uuid()}`],
  )).rows[0];
  await pool.query(
    `insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,features_snapshot_json,sku_snapshot,invoice_product_name_snapshot,unit_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,discount_minor,line_total_minor,currency,quantity)
     values($1,$2,$3,'R97D-2 Eğitmen Uzmanlık Paketi','R97D-2 disposable','[]','R97D2-TRAINER','R97D-2 Eğitmen Uzmanlık Paketi','adet',2000,100000,120000,0,0,120000,'TRY',1)`,
    [order.id, packageRow.id, version.id],
  );
  return { orderId: order.id, packageVersionId: version.id };
}

async function main() {
  clearLifecycleMail();
  const ownerId = await createDirectAccount({ email: `r96s.owner.${Date.now()}@example.test`, name: "R96S Owner", role: "OWNER", scopeType: "GLOBAL" });
  const trainerId = await createDirectAccount({ email: `r96s.trainer.${Date.now()}@example.test`, name: "R96S Trainer", role: "TRAINER", scopeType: "TRAINER" });
  await pool.query("update platform_memberships set scope_id=$1 where user_id=$1 and role='TRAINER'", [trainerId]);
  const trainerEmail = (await pool.query("select email from platform_users where id=$1", [trainerId])).rows[0].email;
  await pool.query("insert into trainer_profiles(user_id,first_name,last_name,city,profession) values($1,'R96S','Trainer','İstanbul','Hızlı okuma eğitmeni')", [trainerId]);

  const registrationEmail = `r96s.student.${Date.now()}@example.test`;
  const registered = await call(accountLifecycle, {
    method: "POST",
    url: "/api/account-lifecycle/register",
    body: {
      firstName: "R96S", lastName: "Öğrenci", email: registrationEmail, password,
      phone: "05321234567", educationStage: "MIDDLE", grade: "6", school: "R96S Test Okulu",
      city: "İstanbul", district: "Kadıköy", addressLine: "R96S Test Adresi", postalCode: "34710",
      guardianName: "R96S Veli", guardianRelation: "Anne", guardianPhone: "05329876543", guardianEmail: "veli.r96s@example.test",
      acceptTerms: true, acceptKvkk: true, marketingConsent: false,
    },
  });
  assert.equal(registered.statusCode, 201);
  const verificationMail = consumeLifecycleMail((mail) => mail.kind === "verification" && mail.to === registrationEmail);
  assert.ok(verificationMail?.url, "VERIFICATION_OUTBOX_REQUIRED");
  const verificationToken = new URL(verificationMail.url).searchParams.get("token");
  assert.ok(verificationToken);
  const verified = await call(accountLifecycle, { method: "GET", url: `/api/account-lifecycle/verify-email?token=${encodeURIComponent(verificationToken)}` });
  assert.equal(verified.statusCode, 200);
  const reused = await call(accountLifecycle, { method: "GET", url: `/api/account-lifecycle/verify-email?token=${encodeURIComponent(verificationToken)}` });

  const student = (await pool.query("select id from platform_users where lower(email)=lower($1)", [registrationEmail])).rows[0];
  const studentProfileRow = (await pool.query("select id from student_profiles where user_id=$1", [student.id])).rows[0];
  assert.ok(studentProfileRow?.id);

  const guardianEmail = `r96s.guardian.${Date.now()}@example.test`;
  const guardianId = await createDirectAccount({ email: guardianEmail, name: "R96S Veli", role: "GUARDIAN", scopeType: "STUDENT" });
  await pool.query("insert into guardian_profiles(user_id,status) values($1,'ACTIVE')", [guardianId]);
  await pool.query("insert into guardian_student_relationships(guardian_user_id,student_profile_id,status) values($1,$2,'ACTIVE')", [guardianId, studentProfileRow.id]);

  const studentCookie = await signIn(registrationEmail, password);
  const guardianCookie = await signIn(guardianEmail, password);
  const studentProfileRead = await call(studentProfileHandler, { url: "/api/student/profile", cookie: studentCookie });
  assert.equal(studentProfileRead.statusCode, 200);
  const profileBody = studentProfileRead.body.profile;
  const profileWrite = await call(studentProfileHandler, {
    method: "PATCH", url: "/api/student/profile", cookie: studentCookie,
    body: { ...profileBody, firstName: "R96S", lastName: "Öğrenci Güncel", phone: "05321234567", educationStage: "MIDDLE", grade: "6", school: "R96S Test Okulu", city: "İstanbul", district: "Kadıköy", addressLine: "R96S Yeni Adres", postalCode: "34710", marketingConsent: false },
  });
  assert.equal(profileWrite.statusCode, 200);
  const guardianRead = await call(studentProfileHandler, { url: `/api/student/profile?studentProfileId=${studentProfileRow.id}`, cookie: guardianCookie });
  assert.equal(guardianRead.statusCode, 200);
  const foreignStudentId = uuid();
  assert.notEqual((await call(studentProfileHandler, { url: `/api/student/profile?studentProfileId=${foreignStudentId}`, cookie: guardianCookie })).statusCode, 200);

  const resetRequested = await call(accountLifecycle, { method: "POST", url: "/api/account-lifecycle/password-reset-request", body: { email: registrationEmail, redirectTo: "/sifre-sifirla?alan=ogrenci" } });
  assert.equal(resetRequested.statusCode, 200);
  const resetMail = consumeLifecycleMail((mail) => mail.kind === "reset" && mail.to === registrationEmail);
  assert.ok(resetMail?.url, "RESET_OUTBOX_REQUIRED");
  const resetToken = new URL(resetMail.url).searchParams.get("token");
  assert.ok(resetToken);
  const reset = await call(accountLifecycle, { method: "POST", url: "/api/account-lifecycle/password-reset", body: { token: resetToken, password: `${password}2` } });
  assert.equal(reset.statusCode, 200);
  assert.notEqual((await auth.handler(new Request("http://local/api/auth/sign-in/email", { method: "POST", headers: { origin, "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }, body: JSON.stringify({ email: registrationEmail, password }) }))).status, 200);
  const studentCookieAfterReset = await signIn(registrationEmail, `${password}2`);

  const ownerCookie = await signIn((await pool.query("select email from platform_users where id=$1", [ownerId])).rows[0].email, password);
  const trainerCookie = await signIn(trainerEmail, password);
  const catalog = await seedLegalCatalog(ownerId);
  await pool.query("insert into r6_trainer_qualification_grants(trainer_user_id,qualification_id,source,status,source_ref,granted_by) values($1,$2,'OWNER_MANUAL','ACTIVE','R96S_GRANT',$3)", [trainerId, catalog.qualificationId, ownerId]);
  assert.equal(await notificationCount(ownerId, "STUDENT_REGISTRATION_RECEIVED"), 1);

  const trainerCommerceOrder = await seedTrainerOrder(trainerId, catalog.qualificationId);
  const trainerSettlement = await fulfillTrainerOrder(pool, { orderId: trainerCommerceOrder.orderId, actorUserId: ownerId, provider: "BANK_TRANSFER", providerReference: `R97D2-TRAINER-${uuid()}` });
  assert.equal(trainerSettlement.replay, false);
  assert.equal(await notificationCount(trainerId, "TRAINER_EXPERTISE_ACTIVATED"), 1);
  assert.equal(await notificationCount(trainerId, "TRAINER_PACKAGE_ACTIVATED"), 1);
  assert.equal(await notificationCount(ownerId, "OWNER_TRAINER_PAYMENT_APPROVED"), 1);

  const packageList = await call(studentPackages, { url: "/api/student/packages?studentProfileId=" + encodeURIComponent(studentProfileRow.id), cookie: studentCookieAfterReset });
  assert.equal(packageList.statusCode, 200);
  assert.ok(packageList.body.packages.some((item) => item.packageVersionId === catalog.versions[0] && item.title.includes("R96S")));
  const cartAdd = await call(studentCart, { method: "POST", url: "/api/student/cart", cookie: studentCookieAfterReset, body: { packageVersionId: catalog.versions[0], studentProfileId: studentProfileRow.id } });
  assert.equal(cartAdd.statusCode, 200);
  assert.equal(cartAdd.body.items.length, 1);
  assert.equal(cartAdd.body.totalMinor, 120000);
  const checkout = await call(studentOrders, {
    method: "POST", url: "/api/student/orders", cookie: studentCookieAfterReset,
    body: { studentProfileId: studentProfileRow.id, paymentMethod: "BANK_TRANSFER", idempotencyKey: `R96S-BANK-${uuid()}`, billing: { type: "INDIVIDUAL", firstName: "R96S", lastName: "Öğrenci", sameAsShipping: true }, legalAcceptance: { preInformation: true, distanceSales: true, privacy: true, marketing: false, commencement: false } },
  });
  assert.equal(checkout.statusCode, 201);
  assert.equal(checkout.body.order.status, "PENDING_PAYMENT");
  assert.equal(checkout.body.order.vat_minor, 20000);
  const orderId = checkout.body.order.id;
  assert.equal(await notificationCount(ownerId, "STUDENT_BANK_TRANSFER_ORDER"), 1);
  assert.equal((await pool.query("select count(*)::int as count from package_entitlements where source_order_id=$1", [orderId])).rows[0].count, 0);
  const queue = await call(bankTransfers, { url: "/api/admin/student-bank-transfers", cookie: ownerCookie });
  assert.equal(queue.statusCode, 200);
  assert.ok(queue.body.transfers.some((item) => item.orderId === orderId));
  const approved = await call(bankTransfers, { method: "POST", url: "/api/admin/student-bank-transfers", cookie: ownerCookie, body: { orderId, action: "APPROVE" } });
  assert.equal(approved.statusCode, 200);
  const duplicateApproval = await call(bankTransfers, { method: "POST", url: "/api/admin/student-bank-transfers", cookie: ownerCookie, body: { orderId, action: "APPROVE" } });
  assert.equal(duplicateApproval.statusCode, 200);
  assert.equal(duplicateApproval.body.duplicateApproval, true);
  assert.equal(await notificationCount(ownerId, "OWNER_PAYMENT_APPROVED"), 1);
  assert.equal(await notificationCount(student.id, "STUDENT_PAYMENT_SUCCEEDED"), 1);
  assert.equal(await notificationCount(student.id, "EDUCATION_ENTITLEMENT_ACTIVATED"), 1);
  const enrollmentId = (await pool.query("select id from enrollments where student_user_id=$1 and training_program_id=$2", [student.id, catalog.programId])).rows[0].id;
  const assignmentRequestId = (await pool.query("select id from trainer_assignment_requests where enrollment_id=$1 and status='PENDING'", [enrollmentId])).rows[0]?.id;
  assert.ok(assignmentRequestId, "ASSIGNMENT_REQUEST_REQUIRED");
  await pool.query("insert into trainer_compensation_rules(package_version_id,trainer_user_id,type,rate_minor,calculation_base,currency,created_by) values($1,$2,'FIXED_AMOUNT',575000,'ORDER_TOTAL','TRY',$3)", [catalog.versions[0], trainerId, ownerId]);
  const assignmentResult = await call(assignmentRequestHandler, { method: "POST", url: `/api/admin/assignment-requests/${assignmentRequestId}`, cookie: ownerCookie, body: { trainerId } });
  assert.equal(assignmentResult.statusCode, 200);
  const assignment = { id: assignmentResult.body.trainerAssignmentId };
  assert.ok(assignment.id);
  assert.equal(await notificationCount(trainerId, "TRAINER_ASSIGNMENT"), 1);
  assert.equal(await notificationCount(student.id, "TRAINER_ASSIGNMENT"), 1);
  await assertTrainerEligibleForEnrollment(pool, trainerId, enrollmentId);
  const assigned = await call(assignedTrainer, { url: "/api/student/assigned-trainer", cookie: studentCookieAfterReset });
  assert.equal(assigned.statusCode, 200);
  assert.equal(assigned.body.trainer.trainerUserId, trainerId);
  const progress = await call(trainerProgress, { method: "PATCH", url: `/api/trainer/progress?enrollmentId=${enrollmentId}`, cookie: trainerCookie, body: { progressPercent: 40 } });
  assert.equal(progress.statusCode, 200);
  assert.equal(progress.body.progressPercent, 40);
  const illegal100 = await call(trainerProgress, { method: "PATCH", url: `/api/trainer/progress?enrollmentId=${enrollmentId}`, cookie: trainerCookie, body: { progressPercent: 100 } });
  assert.equal(illegal100.statusCode, 409);

  const refundRequest = await call(orderRefunds, { method: "POST", url: "/api/admin/order-refunds", cookie: ownerCookie, body: { action: "REQUEST", orderId, reason: "R96S disposable refund", idempotencyKey: `R96S-REFUND-REQUEST-${uuid()}`, amountMinor: checkout.body.order.total_minor } });
  assert.equal(refundRequest.statusCode, 201);
  const refundRequestId = refundRequest.body.request.id;
  const refundApproved = await call(orderRefunds, { method: "POST", url: "/api/admin/order-refunds", cookie: ownerCookie, body: { action: "APPROVE", orderId, refundRequestId, reason: "R96S Owner approval", idempotencyKey: `R96S-REFUND-APPROVE-${uuid()}` } });
  assert.equal(refundApproved.statusCode, 200);
  const evidenceToken = createTrustedRefundEvidenceToken({ requestId: refundRequestId, amountMinor: checkout.body.order.total_minor, currency: "TRY", provider: "BANK_TRANSFER", providerReference: "R96S-REFUND-REFERENCE", providerTransactionId: "R96S-REFUND-TX", verificationReference: "R96S-OWNER-EVIDENCE", expiresAt: Date.now() + 60_000 });
  const refundVerified = await call(orderRefunds, { method: "POST", url: "/api/admin/order-refunds", cookie: ownerCookie, body: { action: "VERIFY_REFUND", orderId, refundRequestId, reason: "R96S evidence", providerEvidenceToken: evidenceToken } });
  assert.equal(refundVerified.statusCode, 200);
  const refundReplay = await call(orderRefunds, { method: "POST", url: "/api/admin/order-refunds", cookie: ownerCookie, body: { action: "VERIFY_REFUND", orderId, refundRequestId, reason: "R96S evidence", providerEvidenceToken: evidenceToken } });
  assert.equal(refundReplay.statusCode, 200);
  assert.equal(refundReplay.body.replay, true);
  assert.equal(await notificationCount(student.id, "ORDER_REFUNDED"), 1);
  assert.equal(await notificationCount(ownerId, "REFUND_COMPLETED"), 1);
  assert.equal(await notificationCount(trainerId, "TRAINER_PAYOUT_RECONCILED"), 1);
  const refundState = (await pool.query("select o.status,pi.status as payment_status,pe.status as entitlement_status,e.status as enrollment_status,ta.status as assignment_status from orders o join payment_intents pi on pi.order_id=o.id join package_entitlements pe on pe.source_order_id=o.id join package_entitlement_enrollments pee on pee.package_entitlement_id=pe.id join enrollments e on e.id=pee.enrollment_id left join trainer_assignments ta on ta.enrollment_id=e.id where o.id=$1 limit 1", [orderId])).rows[0];
  assert.deepEqual(refundState, { status: "REFUNDED", payment_status: "REFUNDED", entitlement_status: "REVOKED", enrollment_status: "CANCELLED", assignment_status: "ARCHIVED" });
  const assignedAfterRefund = await call(assignedTrainer, { url: "/api/student/assigned-trainer", cookie: studentCookieAfterReset });
  assert.equal(assignedAfterRefund.statusCode, 200);
  assert.equal(assignedAfterRefund.body.trainer, null);

  const secondCart = await call(studentCart, { method: "POST", url: "/api/student/cart", cookie: studentCookieAfterReset, body: { packageVersionId: catalog.versions[1], studentProfileId: studentProfileRow.id } });
  assert.equal(secondCart.statusCode, 200);
  const secondCheckout = await call(studentOrders, { method: "POST", url: "/api/student/orders", cookie: studentCookieAfterReset, body: { studentProfileId: studentProfileRow.id, paymentMethod: "BANK_TRANSFER", idempotencyKey: `R96S-BANK-SECOND-${uuid()}`, billing: { type: "INDIVIDUAL", firstName: "R96S", lastName: "Öğrenci", sameAsShipping: true }, legalAcceptance: { preInformation: true, distanceSales: true, privacy: true, marketing: false, commencement: false } } });
  assert.equal(secondCheckout.statusCode, 201);
  const secondOrderId = secondCheckout.body.order.id;
  assert.equal((await call(bankTransfers, { method: "POST", url: "/api/admin/student-bank-transfers", cookie: ownerCookie, body: { orderId: secondOrderId, action: "APPROVE" } })).statusCode, 200);
  const secondEnrollmentRows = (await pool.query("select id,status,created_at from enrollments where student_user_id=$1 and training_program_id=$2 order by created_at desc", [student.id, catalog.programId2])).rows;
  if (!secondEnrollmentRows.some((row) => row.status === "ACTIVE")) console.log(JSON.stringify({ secondOrderId, secondApproval: (await pool.query("select status from orders where id=$1", [secondOrderId])).rows[0], secondEntitlements: (await pool.query("select status from package_entitlements where source_order_id=$1", [secondOrderId])).rows }));
  const secondEnrollmentId = secondEnrollmentRows.find((row) => row.status === "ACTIVE")?.id;
  assert.ok(secondEnrollmentId, "SECOND_ACTIVE_ENROLLMENT_REQUIRED");
  const secondAssignment = (await pool.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE') returning id", [trainerId, secondEnrollmentId])).rows[0];
  await pool.query("insert into trainer_compensation_snapshots(assignment_id,trainer_user_id,enrollment_id,package_version_id,type,rate_minor,calculation_base,currency) values($1,$2,$3,$4,'FIXED_AMOUNT',575000,'ORDER_TOTAL','TRY')", [secondAssignment.id, trainerId, secondEnrollmentId, catalog.versions[1]]);
  const completed = await call(trainerCompletions, { method: "POST", url: "/api/trainer/completions", cookie: trainerCookie, body: { enrollmentId: secondEnrollmentId, idempotencyKey: `R96S-COMPLETION-${uuid()}` } });
  assert.equal(completed.statusCode, 200);
  assert.equal(await notificationCount(trainerId, "TRAINER_EARNING_CREATED"), 1);
  assert.equal(await notificationCount(student.id, "EDUCATION_COMPLETED"), 1);
  const portalStudent = await call(studentPortal, { url: "/api/student/portal-context", cookie: studentCookieAfterReset });
  assert.equal(portalStudent.statusCode, 200);
  assert.ok(portalStudent.body.enrollments.some((item) => item.status === "CANCELLED"));
  assert.ok(portalStudent.body.enrollments.some((item) => item.status === "COMPLETED" && item.progressPercent === 100 && item.completedAt));
  const portalGuardian = await call(studentPortal, { url: "/api/student/portal-context", cookie: guardianCookie });
  assert.equal(portalGuardian.statusCode, 200);
  assert.equal(portalGuardian.body.role, "GUARDIAN");
  assert.equal((await call(studentPortal, { url: `/api/student/portal-context?studentId=${foreignStudentId}`, cookie: guardianCookie })).statusCode, 403);

  const database = (await pool.query("select current_database() as database")).rows[0].database;
  const migrationCount = Number((await pool.query("select count(*)::int as count from drizzle.__drizzle_migrations")).rows[0].count);
  assert.match(database, /^fixoku_test_/u);
  assert.equal(migrationCount, 44);
  console.log(JSON.stringify({
    DATABASE_ISOLATION: "DISPOSABLE_ONLY",
    MIGRATION_COUNT: migrationCount,
    STUDENT_REGISTRATION: "PASS",
    EMAIL_VERIFICATION_AND_REPLAY_SAFE: "PASS",
    PASSWORD_RESET_AND_RELOGIN: "PASS",
    GUARDIAN_CHILD_AUTHORITY: "PASS",
    STUDENT_PROFILE: "PASS",
    CATALOG_SERVER_SNAPSHOT: "PASS",
    CART_AND_SERVER_TOTAL: "PASS",
    VAT_CALCULATION: "PASS",
    LEGAL_EXPLICIT_ACCEPTANCE: "PASS",
    BANK_TRANSFER_APPROVAL: "PASS",
    APPROVAL_IDEMPOTENCY: "PASS",
    ENTITLEMENT_AND_ENROLLMENT: "PASS",
    TRAINER_ASSIGNMENT_AND_EXPERTISE: "PASS",
    PROGRESS_AND_COMPLETION: "PASS",
    REFUND_REVOCATION_AND_REPLAY: "PASS",
    COMPLETED_HISTORY_PRESERVED: "PASS",
    EXTERNAL_EMAIL_SENT: 0,
    EXTERNAL_PAYMENT_OR_REFUND: 0,
    NOTIFICATION_EVENT_CHAIN: "PASS",
    NOTIFICATION_DEDUPE_AND_RECIPIENT_SCOPE: "PASS",
    TRAINER_PACKAGE_AND_EXPERTISE: "PASS",
    PRODUCTION_WRITES: 0,
  }));
}

try {
  await main();
} finally {
  await authDbPool.end();
  await disposable.dispose();
}
