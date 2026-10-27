import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { createStudentCommerceOrder } from "../src/server/domain/student-commerce.js";
import { fulfillSuccessfulPayment } from "../src/server/domain/commerce.js";
import { calculateR6PayoutFromMatrix, normalizeR6GroupInput } from "../src/server/domain/r6-training.js";
import { assertTrainerEligibleForEnrollment } from "../api/admin/assignment-requests/[id].js";
import { markPaid } from "../api/admin/payouts.js";
import { processOrderRefund } from "../src/server/domain/order-refunds.js";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL, {
  migrationsFolder: path.join(process.cwd(), "drizzle", "migrations"),
});
const pool = disposable.pool;
const uuid = () => crypto.randomUUID();
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;
const previousMonth = new Date(Date.UTC(new Date(`${monthStart}T00:00:00Z`).getUTCFullYear(), new Date(`${monthStart}T00:00:00Z`).getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
const previousMonthEnd = new Date(Date.UTC(new Date(`${monthStart}T00:00:00Z`).getUTCFullYear(), new Date(`${monthStart}T00:00:00Z`).getUTCMonth(), 0)).toISOString().slice(0, 10);

async function user(client, email, displayName, role, scopeType, scopeId = null) {
  const row = (await client.query(
    "insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id",
    [`r96d6-${email}`, email, displayName],
  )).rows[0];
  await client.query(
    "insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')",
    [row.id, scopeType, scopeId || (scopeType === "STUDENT" || scopeType === "TRAINER" ? row.id : null), role],
  );
  return row.id;
}

try {
  const client = await pool.connect();
  try {
    const ownerId = await user(client, "owner.r96d6@example.test", "R96D6 Owner", "OWNER", "GLOBAL");
    const studentId = await user(client, "student.r96d6@example.test", "R96D6 Student", "STUDENT", "STUDENT");
    const trainerId = await user(client, "trainer.r96d6@example.test", "R96D6 Trainer", "TRAINER", "TRAINER");
    for (const [documentKey, sourceDocumentId] of [["PRE_INFO", 3], ["DISTANCE", 4], ["KVKK", 8]]) {
      const markdown = `PUBLISHED R96D6 ${documentKey}`;
      const contentSha = crypto.createHash("sha256").update(markdown, "utf8").digest("hex");
      await client.query("insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values($1,$2,1,'PUBLISHED',$3,'CUSTOMER',$4,$5,$6)", [documentKey, sourceDocumentId, documentKey, markdown, contentSha, ownerId]);
    }
    const profileId = (await client.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'R96D6','Student','MIDDLE','6','ACTIVE') returning id", [studentId])).rows[0].id;
    const programId = (await client.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values('r96d6-fast-reading','R96D6 Hızlı Okuma','R96D6','STUDENT','PUBLISHED',1) returning id")).rows[0].id;
    const qualificationId = (await client.query("select id from r6_qualification_definitions where code='MIDDLE_FAST'")).rows[0].id;
    await client.query("insert into r6_trainer_qualification_grants(trainer_user_id,qualification_id,source,status,source_ref,granted_by) values($1,$2,'OWNER_MANUAL','ACTIVE','R96D6_MANUAL_GRANT',$3)", [trainerId, qualificationId, ownerId]);

    const individualProductId = (await client.query("insert into physical_products(sku,title,description,product_type,is_active,r6_product_type,list_gross_minor,vat_rate_bps,service_type,service_mode,min_students,max_students,currency) values('R96D6-IND','R96D6 Birebir','', 'SERVICE',true,'TRAINING_SERVICE',100000,0,'FAST_READING','INDIVIDUAL',1,1,'TRY') returning id")).rows[0].id;
    const groupProductId = (await client.query("insert into physical_products(sku,title,description,product_type,is_active,r6_product_type,list_gross_minor,vat_rate_bps,service_type,service_mode,min_students,max_students,currency) values('R96D6-GRP','R96D6 Grup','', 'SERVICE',true,'TRAINING_SERVICE',100000,0,'FAST_READING','GROUP',2,5,'TRY') returning id")).rows[0].id;
    for (const productId of [individualProductId, groupProductId]) await client.query("insert into r6_product_stage_scopes(physical_product_id,education_stage) values($1,'MIDDLE')", [productId]);
    const packageId = (await client.query("insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values('r96d6-student-package','STUDENT','STUDENT_COMMERCE','MIDDLE','[5,6,7,8]',1,'PUBLISHED',false,true,true,'FREE',0) returning id")).rows[0].id;
    const versionId = (await client.query("insert into package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'R96D6 Öğrenci Paketi','R96D6','R96D6','[]',0,200000,200000,200000,'TRY',true,'PUBLISHED',now()) returning id", [packageId])).rows[0].id;
    const componentRows = (await client.query("insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json) values($1,'TRAINER_SERVICE',$2,null,'R96D6 Birebir','R96D6 Birebir',true,1,1,'{}'),($1,'TRAINER_SERVICE',$3,null,'R96D6 Grup','R96D6 Grup',true,1,2,'{}') returning id,reference_id", [versionId, individualProductId, groupProductId])).rows;
    for (const row of componentRows) await client.query("insert into r6_package_component_pricing(package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency) values($1,100000,100000,0,0,0,100000,0,'TRY')", [row.id]);
    await client.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED')", [versionId, programId]);
    await client.query("insert into trainer_compensation_rules(package_version_id,type,rate_minor,calculation_base,currency,created_by) values($1,'FIXED_AMOUNT',575000,'ORDER_TOTAL','TRY',$2)", [versionId, ownerId]);
    await client.query("insert into student_cart_items(buyer_user_id,beneficiary_student_profile_id,package_version_id,catalog_education_stage,catalog_grade,quantity) values($1,$2,$3,'MIDDLE','6',1)", [studentId, profileId, versionId]);

    const principal = { user: { id: studentId, displayName: "R96D6 Student", email: "student.r96d6@example.test" }, memberships: [{ userId: studentId, role: "STUDENT", scopeType: "STUDENT", scopeId: studentId, status: "ACTIVE" }] };
    const orderResult = await createStudentCommerceOrder(client, principal, {
      idempotencyKey: "R96D6-BANK-ORDER",
      paymentMethod: "BANK_TRANSFER",
      studentProfileId: profileId,
      billing: { type: "INDIVIDUAL", firstName: "R96D6", lastName: "Student", sameAsShipping: true },
      legalAcceptance: { preInformation: true, distanceSales: true, privacy: true, marketing: false, commencement: false },
    });
    assert.equal((await client.query("select count(*)::int as count from package_entitlements")).rows[0].count, 0, "entitlement must remain closed before approval");
    const approved = await fulfillSuccessfulPayment(pool, { orderId: orderResult.order.id, actorUserId: ownerId, provider: "BANK_TRANSFER", providerEventId: `r96d6-bank:${orderResult.order.id}`, amountMinor: orderResult.order.total_minor, currency: orderResult.order.currency });
    const replay = await fulfillSuccessfulPayment(pool, { orderId: orderResult.order.id, actorUserId: ownerId, provider: "BANK_TRANSFER", providerEventId: `r96d6-bank:${orderResult.order.id}`, amountMinor: orderResult.order.total_minor, currency: orderResult.order.currency });
    assert.equal(approved.replay, false);
    assert.equal(replay.replay, true);
    assert.equal((await client.query("select count(*)::int as count from package_entitlements where source_order_id=$1 and status='ACTIVE'", [orderResult.order.id])).rows[0].count, 1);
    const enrollmentId = (await client.query("select id from enrollments where student_user_id=$1 and training_program_id=$2", [studentId, programId])).rows[0].id;
    assert.equal((await client.query("select count(*)::int as count from trainer_assignment_requests where enrollment_id=$1 and status='PENDING'", [enrollmentId])).rows[0].count, 1);
    await assertTrainerEligibleForEnrollment(client, trainerId, enrollmentId);
    await client.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE')", [trainerId, enrollmentId]);
    assert.equal(calculateR6PayoutFromMatrix([{ training_type: "FAST_READING", student_count: 5, amount_minor: 875000 }], "FAST_READING", 5), 875000);

    const groupInput = normalizeR6GroupInput({ educationStage: "MIDDLE", trainingType: "FAST_READING", mode: "GROUP", packageVersionId: versionId, trainingProductId: groupProductId, trainerUserId: trainerId, participants: [{ studentUserId: studentId, studentProfileId: profileId }] });
    assert.equal(groupInput.maxStudents, 5);
    const groupId = (await client.query("insert into r6_training_groups(package_version_id,training_product_id,required_qualification_id,trainer_user_id,education_stage,training_type,mode,min_students,max_students,status,created_by) values($1,$2,$3,$4,'MIDDLE','FAST_READING','GROUP',2,5,'ASSIGNED',$5) returning id", [versionId, groupProductId, qualificationId, trainerId, ownerId])).rows[0].id;
    await client.query("insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,enrollment_id,status,billable) values($1,$2,$3,$4,'ACTIVE',true)", [groupId, profileId, studentId, enrollmentId]);
    for (let index = 1; index < 5; index += 1) {
      const extraStudentId = await user(client, `student.r96d6.${index}@example.test`, `R96D6 Student ${index}`, "STUDENT", "STUDENT");
      const extraProfileId = (await client.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,$2,'Student','MIDDLE','6','ACTIVE') returning id", [extraStudentId, `R96D6-${index}`])).rows[0].id;
      const extraOrderItem = (await client.query("select id from order_items where order_id=$1 limit 1", [orderResult.order.id])).rows[0].id;
      await client.query("insert into package_entitlements(beneficiary_student_user_id,beneficiary_student_profile_id,package_id,package_version_id,source_order_id,source_order_item_id,status,issuance_key) values($1,$2,$3,$4,$5,$6,'ACTIVE',$7)", [extraStudentId, extraProfileId, packageId, versionId, orderResult.order.id, extraOrderItem, `R96D6-EXTRA-${index}`]);
      const extraEnrollmentId = (await client.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') returning id", [extraStudentId, programId])).rows[0].id;
      await client.query("insert into package_entitlement_enrollments(package_entitlement_id,enrollment_id,training_program_id,source_order_item_id) select pe.id,$1,$2,$3 from package_entitlements pe where pe.issuance_key=$4", [extraEnrollmentId, programId, extraOrderItem, `R96D6-EXTRA-${index}`]);
      await client.query("insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,enrollment_id,status,billable) values($1,$2,$3,$4,'ACTIVE',true)", [groupId, extraProfileId, extraStudentId, extraEnrollmentId]);
    }
    assert.equal(Number((await client.query("select count(*)::int as count from r6_training_group_participants where training_group_id=$1 and status='ACTIVE'", [groupId])).rows[0].count), 5);
    assert.throws(() => normalizeR6GroupInput({ educationStage: "MIDDLE", trainingType: "FAST_READING", mode: "GROUP", participants: new Array(6).fill({ studentUserId: uuid(), studentProfileId: uuid() }) }), /R6_PARTICIPANT_LIMIT_EXCEEDED/);

    const assignmentId = (await client.query("select id from trainer_assignments where enrollment_id=$1 and status='ACTIVE' limit 1", [enrollmentId])).rows[0].id;
    const earning = (await client.query("insert into trainer_earning_ledger(trainer_user_id,student_user_id,training_program_id,assignment_id,enrollment_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at,payable_at,payable_period_start,payable_period_end,billable_student_count) values($1,$2,$3,$4,$5,'SESSION','EARNED',575000,'TRY','R96D6','R96D6_TEST',$6,$7,now()-interval '2 days',now()-interval '1 day',$8,$9,1) returning id", [trainerId, studentId, programId, assignmentId, enrollmentId, uuid(), `R96D6-EARNING-${uuid()}`, previousMonth, previousMonthEnd])).rows[0];
    const payout = await markPaid(client, { user: { id: ownerId } }, { trainerUserId: trainerId, amountMinor: 575000, currency: "TRY", periodStart: previousMonth, periodEnd: today, paymentDate: today, bankReference: "R96D6-TEST" });
    assert.equal(payout.status, "PAID");
    assert.equal((await client.query("select status from trainer_earning_ledger where id=$1", [earning.id])).rows[0].status, "PAID");
    let duplicate = null;
    try { await markPaid(client, { user: { id: ownerId } }, { trainerUserId: trainerId, amountMinor: 575000, currency: "TRY", periodStart: previousMonth, periodEnd: today, paymentDate: today, bankReference: "R96D6-TEST" }); } catch (error) { duplicate = error; }
    assert.equal(duplicate?.message, "PAYOUT_ALREADY_RECORDED");

    const otherOrder = (await client.query("insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,billing_snapshot_json,idempotency_key,request_hash) values($1,$2,$3,'PAID','BANK_TRANSFER','TRY',200000,0,200000,'STUDENT_COMMERCE','{}','R96D6-OTHER-ORDER',$4) returning id", [studentId, studentId, profileId, uuid()])).rows[0];
    await client.query("insert into payment_intents(order_id,status,provider,provider_reference,amount_minor,currency,idempotency_key,succeeded_at) values($1,'SUCCEEDED','BANK_TRANSFER','R96D6-OTHER-PAYMENT',200000,'TRY',$2,now())", [otherOrder.id, `R96D6-OTHER-PAYMENT-${uuid()}`]);
    const otherItem = (await client.query("insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json) values($1,$2,$3,'Other order package','Other order package',1,'TRAINER_LED',200000,200000,'TRY',1,'[]','[]') returning id", [otherOrder.id, packageId, versionId])).rows[0];
    await client.query("insert into package_entitlements(beneficiary_student_user_id,beneficiary_student_profile_id,package_id,package_version_id,source_order_id,source_order_item_id,status,issuance_key) values($1,$2,$3,$4,$5,$6,'ACTIVE',$7)", [studentId, profileId, packageId, versionId, otherOrder.id, otherItem.id, `R96D6-OTHER-ENTITLEMENT-${uuid()}`]);

    const concurrentRefunds = await Promise.allSettled([
      processOrderRefund(pool, { orderId: orderResult.order.id, actorUserId: ownerId, action: "REQUEST", reason: "R96D6 concurrent request A", idempotencyKey: "R96D6-REFUND-A", evidence: { amountMinor: orderResult.order.total_minor } }),
      processOrderRefund(pool, { orderId: orderResult.order.id, actorUserId: ownerId, action: "REQUEST", reason: "R96D6 concurrent request B", idempotencyKey: "R96D6-REFUND-B", evidence: { amountMinor: orderResult.order.total_minor } }),
    ]);
    assert.equal(concurrentRefunds.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal((await client.query("select count(*)::int as count from order_refund_requests where order_id=$1", [orderResult.order.id])).rows[0].count, 1);
    const refundRequestId = (await client.query("select id from order_refund_requests where order_id=$1", [orderResult.order.id])).rows[0].id;
    const beforeApproval = (await client.query("select o.status,pi.status as payment_status,pe.status as entitlement_status from orders o join payment_intents pi on pi.order_id=o.id join package_entitlements pe on pe.source_order_id=o.id where o.id=$1", [orderResult.order.id])).rows[0];
    assert.equal(beforeApproval.status, "PAID");
    assert.equal(beforeApproval.payment_status, "SUCCEEDED");
    assert.equal(beforeApproval.entitlement_status, "ACTIVE");
    const approvedRefund = await processOrderRefund(pool, { orderId: orderResult.order.id, actorUserId: ownerId, action: "APPROVE", reason: "R96D6 Owner approved full reversal", idempotencyKey: "R96D6-REFUND-APPROVE", evidence: { requestId: refundRequestId } });
    assert.equal(approvedRefund.request.status, "OWNER_APPROVED");
    const afterApproval = (await client.query("select o.status,pi.status as payment_status,pe.status as entitlement_status from orders o join payment_intents pi on pi.order_id=o.id join package_entitlements pe on pe.source_order_id=o.id where o.id=$1", [orderResult.order.id])).rows[0];
    assert.equal(afterApproval.status, "PAID");
    assert.equal(afterApproval.payment_status, "SUCCEEDED");
    assert.equal(afterApproval.entitlement_status, "ACTIVE");
    const verifiedRefund = await processOrderRefund(pool, { orderId: orderResult.order.id, actorUserId: ownerId, action: "VERIFY_REFUND", reason: "R96D6 provider evidence verified", idempotencyKey: "R96D6-REFUND-VERIFY", evidence: { requestId: refundRequestId, providerReference: "R96D6-BANK-REFUND", providerTransactionId: "R96D6-REFUND-TX", verificationReference: "R96D6-OWNER-EVIDENCE", confirmedAmountMinor: orderResult.order.total_minor } });
    assert.equal(verifiedRefund.request.status, "REFUNDED");
    const refundState = (await client.query("select o.status,pi.status as payment_status,pe.status as entitlement_status,e.status as enrollment_status,ta.status as assignment_status,rgp.status as participant_status,el.status as earning_status,adj.amount_minor as adjustment_minor from orders o join payment_intents pi on pi.order_id=o.id join package_entitlements pe on pe.source_order_id=o.id join package_entitlement_enrollments pee on pee.package_entitlement_id=pe.id join enrollments e on e.id=pee.enrollment_id left join trainer_assignments ta on ta.enrollment_id=e.id left join r6_training_group_participants rgp on rgp.enrollment_id=e.id left join trainer_earning_ledger el on el.id=$2 left join trainer_earning_ledger adj on adj.adjustment_of_id=el.id and adj.source_type='ORDER_REFUND_RECONCILIATION' where o.id=$1 limit 1", [orderResult.order.id, earning.id])).rows[0];
    assert.equal(refundState.status, "REFUNDED");
    assert.equal(refundState.payment_status, "REFUNDED");
    assert.equal(refundState.entitlement_status, "REVOKED");
    assert.equal(refundState.enrollment_status, "CANCELLED");
    assert.equal(refundState.assignment_status, "ARCHIVED");
    assert.equal(refundState.participant_status, "REFUNDED");
    assert.equal(refundState.earning_status, "PAID");
    assert.equal(Number(refundState.adjustment_minor), -575000);
    const otherState = (await client.query("select o.status,pi.status as payment_status,pe.status as entitlement_status from orders o join payment_intents pi on pi.order_id=o.id join package_entitlements pe on pe.source_order_id=o.id where o.id=$1", [otherOrder.id])).rows[0];
    assert.equal(otherState.status, "PAID");
    assert.equal(otherState.payment_status, "SUCCEEDED");
    assert.equal(otherState.entitlement_status, "ACTIVE");
    const refundReplay = await processOrderRefund(pool, { orderId: orderResult.order.id, actorUserId: ownerId, action: "VERIFY_REFUND", reason: "R96D6 provider evidence verified", idempotencyKey: "R96D6-REFUND-VERIFY", evidence: { requestId: refundRequestId, providerReference: "R96D6-BANK-REFUND", providerTransactionId: "R96D6-REFUND-TX", verificationReference: "R96D6-OWNER-EVIDENCE", confirmedAmountMinor: orderResult.order.total_minor } });
    assert.equal(refundReplay.replay, true);
    assert.equal((await client.query("select count(*)::int as count from payment_transactions where payment_intent_id=$1 and transaction_type='REFUND'", [orderResult.paymentIntent.id])).rows[0].count, 1);

    console.log(JSON.stringify({
      STUDENT_CHECKOUT: "PASS",
      BANK_TRANSFER_APPROVAL: "PASS",
      ENTITLEMENT_IDEMPOTENCY: "PASS",
      ASSIGNMENT_ENTITLEMENT_AND_EXPERTISE: "PASS",
      GROUP_CAPACITY_5: "PASS",
      GROUP_PAYOUT_MATRIX: "PASS",
      PAYOUT_ALLOCATION_AND_IDEMPOTENCY: "PASS",
      REFUND_REQUEST_APPROVAL_VERIFICATION: "PASS",
      ENTITLEMENT_ENROLLMENT_ASSIGNMENT_REVOCATION: "PASS",
      PAID_EARNING_APPEND_ONLY_RECONCILIATION: "PASS",
      REFUND_CONCURRENCY_AND_REPLAY: "PASS",
      DATABASE_ISOLATION: "DISPOSABLE_ONLY",
    }));
  } finally {
    client.release();
  }
} finally {
  await disposable.dispose();
}
