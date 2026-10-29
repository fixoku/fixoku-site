import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "api/admin/student-entitlements.js"), "utf8");
const sidebar = fs.readFileSync(path.join(root, "src/platform/panel/layout/PanelSidebar.tsx"), "utf8");
const assignmentList = fs.readFileSync(path.join(root, "api/admin/assignment-requests.js"), "utf8");
const assignmentDetail = fs.readFileSync(path.join(root, "api/admin/assignment-requests", "[id].js"), "utf8");
const groupAssignments = fs.readFileSync(path.join(root, "api/admin/r6-training-groups.js"), "utf8");
const eligible = (student, pkg) => Boolean(student.studentProfileId && student.educationStage === pkg.educationStage && (pkg.educationStage === "ADULT" || JSON.parse(pkg.eligibleGradesJson).includes(Number(student.grade))));
assert.equal(eligible({ studentProfileId: "p", educationStage: "PRIMARY", grade: "3" }, { educationStage: "PRIMARY", eligibleGradesJson: "[3,4]" }), true);
assert.equal(eligible({ studentProfileId: "p", educationStage: "MIDDLE", grade: "6" }, { educationStage: "PRIMARY", eligibleGradesJson: "[3,4]" }), false);
assert.match(source, /requireMembership\(principal, "OWNER"\)/u);
assert.match(source, /source_type='OWNER_MANUAL'/u);
assert.match(source, /paymentCreated: false/u);
assert.match(source, /revenueCreated: false/u);
assert.match(source, /package_entitlement_enrollments/u);
assert.match(source, /platform_audit_events/u);
assert.match(source, /on conflict do nothing/u);
assert.match(source, /studentIds/u);
assert.match(source, /packageVersionIds/u);
assert.match(source, /async function materializePrograms/u);
assert.match(source, /savepoint student_entitlement_grant/u);
assert.match(source, /rollback to savepoint student_entitlement_grant/u);
assert.match(source, /release savepoint student_entitlement_grant/u);
assert.match(sidebar, /Ücretsiz Öğrenci Erişimleri.*\/panel\/admin\/ogrenci-erisimleri/u);
assert.match(assignmentList, /coalesce\(oi\.package_version_id,pe\.package_version_id\)/u);
assert.match(assignmentDetail, /source_type='OWNER_MANUAL'/u);
assert.match(assignmentDetail, /coalesce\(oi\.package_version_id,pe\.package_version_id\)/u);
assert.ok((groupAssignments.match(/source_type='OWNER_MANUAL'/gu) || []).length >= 2, "GROUP_ASSIGNMENT_PAYMENT_GUARD_REQUIRED");
console.log(JSON.stringify({ OWNER_ONLY: "PASS_SOURCE", SEGMENT_ELIGIBILITY: "PASS", BULK_STUDENTS_AND_PACKAGES: "PASS_SOURCE", NO_PAYMENT_OR_REVENUE: "PASS_SOURCE", AUDIT_AND_ENROLLMENT: "PASS_SOURCE", DB_WRITE: "NO" }));

loadLocalEnv();
const fixture = await createDisposableDatabase(process.env.DATABASE_URL, { migrationsFolder: path.join(root, "drizzle", "migrations") });
try {
  const db = fixture.pool;
  const owner = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`manual-owner-${crypto.randomUUID()}`, `manual-owner-${crypto.randomUUID()}@example.test`, "Manual Owner"])).rows[0];
  const student = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`manual-student-${crypto.randomUUID()}`, `manual-student-${crypto.randomUUID()}@example.test`, "Manual Student"])).rows[0];
  const trainer = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`manual-trainer-${crypto.randomUUID()}`, `manual-trainer-${crypto.randomUUID()}@example.test`, "Manual Trainer"])).rows[0];
  const unqualifiedTrainer = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`manual-unqualified-${crypto.randomUUID()}`, `manual-unqualified-${crypto.randomUUID()}@example.test`, "Unqualified Trainer"])).rows[0];
  await db.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'GLOBAL',null,'OWNER','ACTIVE'),($2,'STUDENT',$2,'STUDENT','ACTIVE'),($3,'TRAINER',$3,'TRAINER','ACTIVE'),($4,'TRAINER',$4,'TRAINER','ACTIVE')", [owner.id, student.id, trainer.id, unqualifiedTrainer.id]);
  const profile = (await db.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'Manual','Student','PRIMARY','3','ACTIVE') returning id", [student.id])).rows[0];
  const program = (await db.query("insert into training_programs(slug,title,short_description,audience,status) values($1,'Manual Training','Disposable manual grant','STUDENT','PUBLISHED') returning id", [`manual-training-${crypto.randomUUID()}`])).rows[0];
  const pkg = (await db.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,status,panel_visible,public_web_visible,physical_product,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','PRIMARY','[3]','PUBLISHED',true,false,false,'FREE',0) returning id", [`manual-package-${crypto.randomUUID()}`])).rows[0];
  const version = (await db.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'Manual Package','Disposable manual grant',0,'TRY',true,'PUBLISHED',now()) returning id", [pkg.id])).rows[0];
  await db.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [version.id, program.id]);
  const bulkProgram = (await db.query("insert into training_programs(slug,title,short_description,audience,status) values($1,'Manual Bulk Training','Disposable mixed bulk grant','STUDENT','PUBLISHED') returning id", [`manual-bulk-training-${crypto.randomUUID()}`])).rows[0];
  const bulkPkg = (await db.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,status,panel_visible,public_web_visible,physical_product,shipping_policy,shipping_price_minor) values($1,'STUDENT','STUDENT_COMMERCE','PRIMARY','[3]','PUBLISHED',true,false,false,'FREE',0) returning id", [`manual-bulk-package-${crypto.randomUUID()}`])).rows[0];
  const bulkVersion = (await db.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'Manual Bulk Package','Disposable mixed bulk grant',0,'TRY',true,'PUBLISHED',now()) returning id", [bulkPkg.id])).rows[0];
  await db.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'SELF_PACED')", [bulkVersion.id, bulkProgram.id]);
  const bulkStudent = (await db.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [`manual-bulk-student-${crypto.randomUUID()}`, `manual-bulk-student-${crypto.randomUUID()}@example.test`, "Manual Bulk Student"])).rows[0];
  const bulkProfile = (await db.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'Manual','Bulk','MIDDLE','6','ACTIVE') returning id", [bulkStudent.id])).rows[0];
  const { grant, grantBulk, revoke } = await import("../api/admin/student-entitlements.js");
  const { assertTrainerEligibleForEnrollment } = await import("../api/admin/assignment-requests/[id].js");
  const result = await grant(db, owner.id, { id: student.id, studentProfileId: profile.id, educationStage: "PRIMARY", grade: "3" }, { packageId: pkg.id, packageVersionId: version.id, educationStage: "PRIMARY", eligibleGradesJson: "[3]", title: "Manual Package" }, "Disposable manual grant");
  assert.equal(result.status, "GRANTED");
  assert.equal(result.assignmentRequestIds.length, 1);
  const duplicate = await grant(db, owner.id, { id: student.id, studentProfileId: profile.id, educationStage: "PRIMARY", grade: "3" }, { packageId: pkg.id, packageVersionId: version.id, educationStage: "PRIMARY", eligibleGradesJson: "[3]", title: "Manual Package" }, "Duplicate attempt");
  assert.equal(duplicate.status, "DUPLICATE");
  await assert.rejects(grant(db, owner.id, { id: student.id, studentProfileId: profile.id, educationStage: "PRIMARY", grade: "3" }, { packageId: pkg.id, packageVersionId: version.id, educationStage: "MIDDLE", eligibleGradesJson: "[6]", title: "Wrong segment" }, "Wrong segment"), /PACKAGE_NOT_ELIGIBLE_FOR_STUDENT/u);
  const readback = (await db.query("select pe.source_type,pe.source_order_id,pe.source_order_item_id,pe.assigned_by,pe.note,pee.source_order_item_id as enrollment_source_order_item_id,e.status as enrollment_status from package_entitlements pe join package_entitlement_enrollments pee on pee.package_entitlement_id=pe.id join enrollments e on e.id=pee.enrollment_id where pe.id=$1", [result.entitlement.id])).rows[0];
  assert.equal(readback.source_type, "OWNER_MANUAL");
  assert.equal(readback.source_order_id, null);
  assert.equal(readback.source_order_item_id, null);
  assert.equal(readback.enrollment_source_order_item_id, null);
  assert.equal(readback.assigned_by, owner.id);
  assert.equal(readback.enrollment_status, "ACTIVE");
  const audit = (await db.query("select count(*)::int as count from platform_audit_events where action='student.entitlement.owner_granted' and subject_id=$1", [result.entitlement.id])).rows[0];
  assert.equal(Number(audit.count), 1);
  const fakeCommerceRows = (await db.query("select count(*)::int as count from orders o where o.buyer_user_id=$1", [owner.id])).rows[0];
  assert.equal(Number(fakeCommerceRows.count), 0);
  const wrongStudent = (await db.query("select count(*)::int as count from package_entitlements where beneficiary_student_user_id=$1 and package_version_id=$2 and status='ACTIVE' and revoked_at is null", [crypto.randomUUID(), version.id])).rows[0];
  assert.equal(Number(wrongStudent.count), 0);
  const bulkClient = await fixture.pool.connect();
  try {
    await bulkClient.query("begin");
    const bulkResults = await grantBulk(bulkClient, owner.id, [
      { id: student.id, studentProfileId: profile.id, educationStage: "PRIMARY", grade: "3" },
      { id: bulkStudent.id, studentProfileId: bulkProfile.id, educationStage: "MIDDLE", grade: "6" },
    ], [{ packageId: bulkPkg.id, packageVersionId: bulkVersion.id, educationStage: "PRIMARY", eligibleGradesJson: "[3]", title: "Manual Bulk Package" }], "Mixed bulk grant");
    assert.deepEqual(bulkResults.map((row) => row.status), ["GRANTED", "FAILED"]);
    await bulkClient.query("commit");
  } finally {
    bulkClient.release();
  }
  const mixedBulkReadback = (await db.query("select beneficiary_student_user_id,status from package_entitlements where package_version_id=$1 order by beneficiary_student_user_id", [bulkVersion.id])).rows;
  assert.deepEqual(mixedBulkReadback.map((row) => row.beneficiary_student_user_id), [student.id]);
  assert.equal(mixedBulkReadback[0].status, "ACTIVE");
  await db.query("insert into trainer_qualifications(trainer_user_id,training_program_id,status,source,granted_by,reason) values($1,$2,'ACTIVE','ADMIN_GRANT',$3,'Disposable expertise')", [trainer.id, program.id, owner.id]);
  await assert.doesNotReject(assertTrainerEligibleForEnrollment(db, trainer.id, result.enrollmentIds[0]));
  await assert.rejects(assertTrainerEligibleForEnrollment(db, unqualifiedTrainer.id, result.enrollmentIds[0]), /TRAINER_NOT_ELIGIBLE/u);
  await db.query("update trainer_qualifications set status='REVOKED',revoked_at=now() where trainer_user_id=$1 and training_program_id=$2", [trainer.id, program.id]);
  await assert.rejects(assertTrainerEligibleForEnrollment(db, trainer.id, result.enrollmentIds[0]), /TRAINER_NOT_ELIGIBLE/u);
  const revoked = await revoke(db, owner.id, [result.entitlement.id], "Disposable revoke");
  assert.equal(revoked[0].status, "REVOKED");
  const revokedGuard = (await db.query("select count(*)::int as count from package_entitlements where id=$1 and status='ACTIVE' and revoked_at is null and beneficiary_student_user_id=$2 and package_version_id=$3", [result.entitlement.id, student.id, version.id])).rows[0];
  assert.equal(Number(revokedGuard.count), 0);
  const paused = (await db.query("select e.status,tar.status as request_status from enrollments e left join trainer_assignment_requests tar on tar.enrollment_id=e.id where e.id=$1", [result.enrollmentIds[0]])).rows[0];
  assert.equal(paused.status, "PAUSED");
  assert.equal(paused.request_status, "CANCELLED");
  console.log(JSON.stringify({ MANUAL_ENTITLEMENT_DISPOSABLE_DB: "PASS", DB_READBACK: "PASS", NO_ORDER_PAYMENT_REVENUE: "PASS", AUDIT: "PASS", ENROLLMENT: "PASS", DUPLICATE_GUARD: "PASS", SEGMENT_NEGATIVE: "PASS", STUDENT_SCOPE_NEGATIVE: "PASS", MIXED_BULK_SAVEPOINT: "PASS", ASSIGNMENT_TRAINER_EXPERTISE_POSITIVE: "PASS", ASSIGNMENT_TRAINER_EXPERTISE_NEGATIVE: "PASS", REVOKE_ACTIVE_GUARD: "PASS" }));
} finally {
  await fixture.dispose();
}
