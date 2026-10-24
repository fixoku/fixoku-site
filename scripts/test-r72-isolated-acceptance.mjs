import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { createStudentCommerceOrder } from "../src/server/domain/student-commerce.js";
import { createTrainerOrder, fulfillTrainerOrder } from "../src/server/domain/trainer-commerce.js";
import { fulfillSuccessfulPayment } from "../src/server/domain/commerce.js";
import { buildLegalSnapshots } from "../src/server/domain/commerce.js";

const sourceUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
assert.ok(sourceUrl, "R72_DISPOSABLE_SOURCE_URL_REQUIRED");
const migrationsFolder = path.join(process.cwd(), "drizzle", "migrations");
const fixture = await createDisposableDatabase(sourceUrl, { migrationsFolder });
const pool = fixture.pool;
const q = (sql, values = []) => pool.query(sql, values);
const uuid = () => crypto.randomUUID();
const results = {};

function syntheticPrincipal(userId, role, email) {
  return { user: { id: userId, displayName: `R72 Synthetic ${role}`, email }, memberships: [{ role, scopeType: role === "GUARDIAN" ? "STUDENT" : "GLOBAL", scopeId: role === "TRAINER" ? userId : null, status: "ACTIVE" }] };
}

async function migrationChecks() {
  const database = (await q("select current_database() as database")).rows[0].database;
  assert.match(database, /^fixoku_test_/u);
  const ledger = (await q("select count(*)::int as count from drizzle.__drizzle_migrations")).rows[0].count;
  const files = fs.readdirSync(migrationsFolder).filter((name) => /^\d{4}_.+\.sql$/u.test(name));
  assert.equal(ledger, files.length);
  assert.equal(files.length, 42);
  const childColumn = (await q("select data_type from information_schema.columns where table_schema='public' and table_name='enrollments' and column_name='beneficiary_child_profile_id'")).rows[0];
  assert.equal(childColumn?.data_type, "uuid");
  const indexes = (await q("select indexname,indexdef from pg_indexes where schemaname='public' and indexname in ('enrollments_beneficiary_program_uq','r6_training_group_participants_uq') order by indexname")).rows;
  assert.equal(indexes.length, 2);
  assert.match(indexes.find((row) => row.indexname === "enrollments_beneficiary_program_uq").indexdef, /coalesce\(beneficiary_child_profile_id/iu);
  assert.match(indexes.find((row) => row.indexname === "r6_training_group_participants_uq").indexdef, /coalesce\(child_profile_id, student_profile_id, student_user_id\)/iu);
  const tables = (await q("select to_regclass('public.owner_legal_document_versions') as documents,to_regclass('public.owner_vat_decisions') as vat,to_regclass('public.order_legal_snapshots') as orders,to_regclass('public.trainer_order_legal_snapshots') as trainer_orders")).rows[0];
  assert.ok(Object.values(tables).every(Boolean));
  const enumRows = (await q("select t.typname, array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname in ('owner_legal_document_status','owner_vat_decision_status') group by t.typname order by t.typname")).rows;
  assert.deepEqual(enumRows, [
    { typname: "owner_legal_document_status", labels: "{DRAFT,REVIEW,APPROVED,PUBLISHED,ARCHIVED}" },
    { typname: "owner_vat_decision_status", labels: "{DRAFT,REVIEW,APPROVED,EFFECTIVE,ARCHIVED,REJECTED}" },
  ]);
  const triggers = (await q("select tgname from pg_trigger where not tgisinternal and tgname in ('order_legal_snapshots_immutable','trainer_order_legal_snapshots_immutable') order by tgname")).rows;
  assert.equal(triggers.length, 2);
  const duplicates = (await q("select count(*)::int as count from (select student_user_id,training_program_id,coalesce(beneficiary_child_profile_id,'00000000-0000-0000-0000-000000000000'::uuid) key,count(*) from enrollments group by 1,2,3 having count(*)>1) d")).rows[0].count;
  const orphans = (await q("select (select count(*) from enrollments e left join r6_student_child_profiles c on c.id=e.beneficiary_child_profile_id where e.beneficiary_child_profile_id is not null and c.id is null)+(select count(*) from r6_training_group_participants p left join r6_student_child_profiles c on c.id=p.child_profile_id where p.child_profile_id is not null and c.id is null) as count")).rows[0].count;
  assert.equal(Number(duplicates), 0);
  assert.equal(Number(orphans), 0);
  return { database, migrationFiles: files.length, ledgerRows: Number(ledger), childColumn: "uuid", indexes: indexes.map((row) => row.indexname), duplicateCount: Number(duplicates), orphanCount: Number(orphans), triggers: triggers.map((row) => row.tgname) };
}

async function legalAndVatFixtures() {
  const owner = (await q("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'R72 Synthetic Owner',true) returning id", [`r72-owner-${uuid()}`, `r72-owner-${uuid()}@example.test`])).rows[0].id;
  const reviewer = (await q("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'R72 Synthetic Legal Reviewer',true) returning id", [`r72-reviewer-${uuid()}`, `r72-reviewer-${uuid()}@example.test`])).rows[0].id;
  const accountant = (await q("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'R72 Synthetic Accountant',true) returning id", [`r72-accountant-${uuid()}`, `r72-accountant-${uuid()}@example.test`])).rows[0].id;
  const docs = {};
  for (const [sourceId, code, title] of [[3, "PRE_INFO", "Synthetic Ön Bilgilendirme"], [4, "DISTANCE", "Synthetic Mesafeli Satış"], [8, "KVKK", "Synthetic KVKK"], [7, "DIGITAL", "Synthetic Dijital"]]) {
    const markdown = `# ${title}\n\nR72 SYNTHETIC FIXTURE ONLY: ${code}`;
    const hash = crypto.createHash("sha256").update(markdown).digest("hex");
    const row = (await q("insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values($1,$2,2,'DRAFT',$3,'CUSTOMER',$4,$5,$6) returning id", [`R72-${code}`, sourceId, title, markdown, hash, owner])).rows[0];
    await q("update owner_legal_document_versions set status='REVIEW' where id=$1", [row.id]);
    await q("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'LEGAL_REVIEW',$2,'R72 synthetic legal review','r72-synthetic-legal-evidence')", [row.id, reviewer]);
    await q("update owner_legal_document_versions set status='APPROVED' where id=$1", [row.id]);
    await q("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'OWNER_APPROVAL',$2,'R72 synthetic Owner approval','r72-synthetic-owner-evidence')", [row.id, owner]);
    await q("update owner_legal_document_versions set status='PUBLISHED' where id=$1", [row.id]);
    docs[code] = row.id;
  }
  const internalText = "# R72 SYNTHETIC INTERNAL ONLY";
  const internalHash = crypto.createHash("sha256").update(internalText).digest("hex");
  const internal = (await q("insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values('R72-INTERNAL',17,2,'APPROVED','R72 Internal','INTERNAL',$1,$2,$3) returning id", [internalText, internalHash, owner])).rows[0].id;
  await assert.rejects(q("update owner_legal_document_versions set status='PUBLISHED' where id=$1", [internal]), /owner_legal_document_versions_scope_check|violates check constraint/iu);
  const vatBook = (await q("insert into owner_vat_decisions(subject_kind,status,vat_rate_bps,component_rates_json,currency,created_by) values('BOOK','DRAFT',0,'{}','TRY',$1) returning id", [owner])).rows[0].id;
  const vatMixed = (await q("insert into owner_vat_decisions(subject_kind,status,vat_rate_bps,component_rates_json,currency,created_by) values('MIXED_PACKAGE','DRAFT',null,$1,'TRY',$2) returning id", [JSON.stringify({ BOOK: 0, DIGITAL_SOFTWARE: 2000 }), owner])).rows[0].id;
  await q("update owner_vat_decisions set status='REVIEW',accountant_name='R72 Synthetic Accountant',accountant_reviewed_at=now(),evidence_reference='r72-synthetic-accountant-evidence' where id in ($1,$2)", [vatBook, vatMixed]);
  await q("update owner_vat_decisions set status='APPROVED',owner_user_id=$1,owner_decided_at=now() where id in ($2,$3)", [owner, vatBook, vatMixed]);
  await q("update owner_vat_decisions set status='EFFECTIVE',effective_from=now() where id in ($1,$2)", [vatBook, vatMixed]);
  const vat = (await q("select subject_kind,status,vat_rate_bps,component_rates_json from owner_vat_decisions where id in ($1,$2) order by subject_kind", [vatBook, vatMixed])).rows;
  assert.equal(vat[0].status, "EFFECTIVE");
  assert.equal(vat.find((row) => row.subject_kind === "BOOK").vat_rate_bps, 0);
  assert.deepEqual(vat.find((row) => row.subject_kind === "MIXED_PACKAGE").component_rates_json, { BOOK: 0, DIGITAL_SOFTWARE: 2000 });
  return { owner, reviewer, accountant, docs, internal, vatBook, vatMixed, statuses: { document: "DRAFT_REVIEW_APPROVED_PUBLISHED", internalPublication: "REJECTED", vat: "EFFECTIVE" } };
}

async function seedStudentCatalog(owner, docs) {
  const profile = (await q("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'R72','Guardian','MIDDLE','6','ACTIVE') returning id", [owner])).rows[0].id;
  const child1 = (await q("insert into r6_student_child_profiles(owner_user_id,legacy_student_profile_id,first_name,last_name,education_stage,grade,status) values($1,$2,'R72','Child One','MIDDLE','6','ACTIVE') returning id", [owner, profile])).rows[0].id;
  const child2 = (await q("insert into r6_student_child_profiles(owner_user_id,first_name,last_name,education_stage,grade,status) values($1,'R72','Child Two','MIDDLE','6','ACTIVE') returning id", [owner])).rows[0].id;
  const program = (await q("insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,'R72 Synthetic Student Program','R72 synthetic','STUDENT','PUBLISHED','1') returning id", [`r72-student-program-${uuid()}`])).rows[0].id;
  const product = (await q("insert into physical_products(sku,title,description,product_type,is_active,r6_product_type,list_gross_minor,vat_rate_bps,stock_location,on_hand,reserved,low_stock_threshold,cost_minor,currency) values($1,'R72 Synthetic Service','R72 synthetic','SERVICE',true,'TRAINING_SERVICE',120000,2000,null,0,0,0,0,'TRY') returning id", [`R72-SERVICE-${uuid()}`])).rows[0].id;
  const pkg = (await q("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','MIDDLE','[6]',1,'PUBLISHED',false,true,false,'FREE',0) returning id", [`r72-student-package-${uuid()}`])).rows[0].id;
  const version = (await q("insert into package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'R72 Student Package','R72 synthetic package','R72 synthetic','[]',2000,100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id", [pkg])).rows[0].id;
  await q("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,null,'R72 Synthetic Service',1,0,'{}')", [version, product]);
  await q("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [version, program]);
  const principal = syntheticPrincipal(owner, "GUARDIAN", `r72-owner@example.test`);
  return { profile, child1, child2, program, product, pkg, version, principal };
}

async function studentFlows(actor, legal) {
  const makeOrder = async (childId, paymentMethod, key) => {
    await q("insert into student_cart_items(buyer_user_id,beneficiary_student_profile_id,beneficiary_child_profile_id,package_version_id,quantity) values($1,$2,$3,$4,1)", [actor.owner, actor.profile, childId, actor.version]);
    return createStudentCommerceOrder(pool, actor.principal, { childProfileId: childId, paymentMethod, idempotencyKey: key, billing: { type: "INDIVIDUAL", firstName: "R72", lastName: "Buyer", phone: "5555555555", addressLine: "R72 synthetic" }, legalAcceptance: { preInformation: true, distanceSales: true, privacy: true } });
  };
  const paytr = await makeOrder(actor.child1, "PAYTR", "r72-paytr-child-one");
  assert.equal(paytr.order.status, "PENDING_PAYMENT");
  const settled = await fulfillSuccessfulPayment(pool, { orderId: paytr.order.id, actorUserId: legal.owner, provider: "PAYTR_TEST", providerEventId: `r72-paytr-${uuid()}`, amountMinor: 120000, currency: "TRY" });
  assert.equal(settled.orderStatus, "PAID");
  const replay = await fulfillSuccessfulPayment(pool, { orderId: paytr.order.id, actorUserId: legal.owner, provider: "PAYTR_TEST", providerEventId: settled.webhookEventId || "r72-paytr-replay", amountMinor: 120000, currency: "TRY" });
  assert.equal(replay.replay, true);
  const bank = await makeOrder(actor.child2, "BANK_TRANSFER", "r72-bank-child-two");
  const bankSettled = await fulfillSuccessfulPayment(pool, { orderId: bank.order.id, actorUserId: legal.owner, provider: "BANK_TRANSFER", providerEventId: `r72-bank-${uuid()}`, amountMinor: 120000, currency: "TRY" });
  assert.equal(bankSettled.orderStatus, "PAID");
  const snapshots = (await q("select count(*)::int as count from order_legal_snapshots where order_id=any($1::uuid[])", [[paytr.order.id, bank.order.id]])).rows[0].count;
  assert.equal(Number(snapshots), 6);
  const orderEvidence = await buildLegalSnapshots(pool, { orderId: paytr.order.id, buyerUserId: actor.owner });
  assert.equal(orderEvidence.snapshots.length, 3);
  await assert.rejects(q("update order_legal_snapshots set markdown='tampered' where order_id=$1", [paytr.order.id]), /LEGAL_HISTORY_IMMUTABLE/u);
  await assert.rejects(q("delete from order_legal_snapshots where order_id=$1", [paytr.order.id]), /LEGAL_HISTORY_IMMUTABLE/u);
  const childRows = (await q("select beneficiary_child_profile_id as child,status from enrollments where student_user_id=$1 order by beneficiary_child_profile_id", [actor.owner])).rows;
  assert.equal(childRows.length, 2);
  assert.notEqual(childRows[0].child, childRows[1].child);
  const entitlements = (await q("select beneficiary_child_profile_id as child,status from package_entitlements where beneficiary_student_user_id=$1 order by beneficiary_child_profile_id", [actor.owner])).rows;
  assert.equal(entitlements.length, 2);
  return { paytr: "PASS", bank: "PASS", replay: "PASS", snapshots: Number(snapshots), childEnrollments: childRows.length, childEntitlements: entitlements.length, orderEvidence: "PASS" };
}

async function trainerFlow(legal) {
  const trainer = (await q("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'R72 Synthetic Trainer',true) returning id", [`r72-trainer-${uuid()}`, `r72-trainer-${uuid()}@example.test`])).rows[0].id;
  const qualification = (await q("insert into r6_qualification_definitions(code,title,service_type,education_stage) values('MIDDLE_FAST','R72 Synthetic Qualification','TRAINER_LED','MIDDLE') on conflict(code) do update set title=excluded.title returning id")).rows[0].id;
  const pkg = (await q("insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values('ortaokul-hizli-okuma-egitimi','TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) on conflict(slug) do update set status='PUBLISHED',catalog_scope='TRAINER_COMMERCE' returning id")).rows[0].id;
  const version = (await q("insert into package_versions(package_id,version_number,title,description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,99,'R72 Trainer Package','R72 synthetic','[]',2000,100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id", [pkg])).rows[0].id;
  await q("insert into r6_trainer_package_qualification_map(package_version_id,qualification_id) values($1,$2)", [version, qualification]);
  await q("insert into trainer_cart_items(trainer_user_id,package_version_id,quantity) values($1,$2,1)", [trainer, version]);
  const principal = syntheticPrincipal(trainer, "TRAINER", `r72-trainer@example.test`);
  const trainerShipping = { firstName: "R72", lastName: "Trainer", phone: "5555555555", title: "R72 Synthetic Delivery", city: "Izmir", district: "Konak", neighborhood: "Alsancak", addressLine: "R72 synthetic", postalCode: "35000" };
  const publishedHashes = (await q("select source_document_id,content_sha256 from owner_legal_document_versions where id=any($1::uuid[])", [[legal.docs.PRE_INFO, legal.docs.DISTANCE]])).rows;
  const documentHashes = Object.fromEntries(publishedHashes.map((row) => [Number(row.source_document_id) === 3 ? "PRE_INFO" : "DISTANCE", row.content_sha256]));
  const order = await createTrainerOrder(pool, principal, { paymentMethod: "PAYTR", idempotencyKey: "r72-trainer-paytr", shippingAddress: trainerShipping, shipping: trainerShipping, billing: { type: "INDIVIDUAL", sameAsShipping: true, firstName: "R72", lastName: "Trainer" }, legalAcceptance: { preInformation: true, distanceSales: true, documentHashes } });
  const settled = await fulfillTrainerOrder(pool, { orderId: order.order.id, actorUserId: legal.owner, provider: "PAYTR_TEST", providerReference: `r72-trainer-${uuid()}` });
  assert.equal(settled.orderStatus, "PAID");
  const expertise = (await q("select count(*)::int as count from r6_trainer_qualification_grants where trainer_user_id=$1 and status='ACTIVE'", [trainer])).rows[0].count;
  assert.equal(Number(expertise), 1);
  const snapshots = (await q("select count(*)::int as count from trainer_order_legal_snapshots where trainer_order_id=$1", [order.order.id])).rows[0].count;
  assert.equal(Number(snapshots), 2);
  await assert.rejects(q("update trainer_order_legal_snapshots set markdown='tampered' where trainer_order_id=$1", [order.order.id]), /LEGAL_HISTORY_IMMUTABLE/u);
  return { status: "PASS", expertise: Number(expertise), snapshots: Number(snapshots) };
}

async function blockedCheckoutCheck(actor, legal) {
  const version = (await q("insert into package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,2,'R72 Draft Guard Package','R72 synthetic','R72','[]',2000,100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id", [actor.pkg])).rows[0].id;
  await q("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,null,'R72 Synthetic Service',1,0,'{}')", [version, actor.product]);
  await q("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [version, actor.program]);
  await q("insert into student_cart_items(buyer_user_id,beneficiary_student_profile_id,beneficiary_child_profile_id,package_version_id,quantity) values($1,$2,$3,$4,1)", [actor.owner, actor.profile, actor.child1, version]);
  const doc = (await q("select id from owner_legal_document_versions where source_document_id=3 and status='PUBLISHED' order by version_number desc limit 1")).rows[0];
  await q("update owner_legal_document_versions set status='DRAFT' where id=$1", [doc.id]);
  await assert.rejects(createStudentCommerceOrder(pool, actor.principal, { childProfileId: actor.child1, paymentMethod: "PAYTR", idempotencyKey: "r72-draft-block", billing: { type: "INDIVIDUAL", firstName: "R72", lastName: "Blocked", phone: "5555555555", addressLine: "R72" }, legalAcceptance: { preInformation: true, distanceSales: true, privacy: true } }), /LEGAL_DOCUMENT_NOT_PUBLISHED/u);
  await q("update owner_legal_document_versions set status='PUBLISHED' where id=$1", [doc.id]);
  const sideEffects = (await q("select count(*)::int as count from orders where idempotency_key='r72-draft-block'", [])).rows[0].count;
  assert.equal(Number(sideEffects), 0);
  return { missingDocument: "BLOCKED", sideEffects: Number(sideEffects) };
}

try {
  results.MIGRATION_0040 = await migrationChecks();
  results.MIGRATION_0041 = { tablesAndTriggers: "PASS", ledger: "PASS" };
  results.OWNER_LEGAL_APPROVAL = await legalAndVatFixtures();
  const studentActor = await seedStudentCatalog(results.OWNER_LEGAL_APPROVAL.owner, results.OWNER_LEGAL_APPROVAL.docs);
  studentActor.owner = results.OWNER_LEGAL_APPROVAL.owner;
  results.STUDENT_CHECKOUT = await studentFlows(studentActor, results.OWNER_LEGAL_APPROVAL);
  results.TRAINER_CHECKOUT = await trainerFlow(results.OWNER_LEGAL_APPROVAL);
  results.BANK_TRANSFER = { status: results.STUDENT_CHECKOUT.bank, provider: "BANK_TRANSFER", ownerActor: "SYNTHETIC_OWNER" };
  results.PAYTR_CALLBACK = { status: results.STUDENT_CHECKOUT.replay, provider: "PAYTR_TEST", duplicateEntitlement: "PASS" };
  results.CHILD_ISOLATION = { status: "PASS", childEnrollments: results.STUDENT_CHECKOUT.childEnrollments, childEntitlements: results.STUDENT_CHECKOUT.childEntitlements };
  results.ORDER_LEGAL_SNAPSHOT = { student: results.STUDENT_CHECKOUT.orderEvidence, trainer: results.TRAINER_CHECKOUT.snapshots === 2 ? "PASS" : "FAIL", immutable: "PASS" };
  results.BLOCKED_CHECKOUT = await blockedCheckoutCheck(studentActor, results.OWNER_LEGAL_APPROVAL);
  results.VAT_EFFECTIVE_FIXTURE = { status: results.OWNER_LEGAL_APPROVAL.statuses.vat, bookBps: 0, digitalBps: 2000, mixedComponents: { BOOK: 0, DIGITAL_SOFTWARE: 2000 } };
  console.log(JSON.stringify({ ...results, DATABASE_MUTATION: "DISPOSABLE_ONLY", REAL_PROVIDERS: "NONE", PRODUCTION_READY: "NO" }, null, 2));
} catch (error) {
  const safeAssertion = String(error?.message || error).replace(/[\r\n]+/gu, " ").replace(/\s+/gu, " ").slice(0, 160);
  console.error(`R68B_SAFE_DIAGNOSTIC=${JSON.stringify({ stage: "R72_ISOLATED_ACCEPTANCE", errorCode: error?.code == null ? null : String(error.code), sqlState: error?.code && /^\d{5}$/u.test(String(error.code)) ? String(error.code) : null, assertion: safeAssertion, source: { file: "scripts/test-r72-isolated-acceptance.mjs", line: null } })}`);
  process.exitCode = 1;
} finally {
  await fixture.dispose();
}
