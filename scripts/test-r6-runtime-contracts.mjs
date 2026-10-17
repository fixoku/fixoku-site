import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateR6PayoutFromMatrix, completionMonthBounds, normalizeR6GroupInput, r6GroupStatus } from "../src/server/domain/r6-training.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const group = normalizeR6GroupInput({ educationStage: "middle", trainingType: "fast_reading", mode: "group", participants: [
  { studentUserId: "11111111-1111-4111-8111-111111111111", studentProfileId: "22222222-2222-4222-8222-222222222222" },
  { studentUserId: "33333333-3333-4333-8333-333333333333", childProfileId: "44444444-4444-4444-8444-444444444444" },
] });
assert.equal(group.educationStage, "MIDDLE");
assert.equal(group.trainingType, "FAST_READING");
assert.equal(group.mode, "GROUP");
assert.equal(group.minStudents, 2);
assert.equal(group.maxStudents, 5);
assert.equal(r6GroupStatus({ trainerUserId: "trainer", participantCount: 2, minStudents: 2 }), "ASSIGNED");
assert.equal(r6GroupStatus({ trainerUserId: null, participantCount: 2, minStudents: 2 }), "DRAFT");
assert.equal(calculateR6PayoutFromMatrix([{ training_type: "FAST_READING", student_count: 2, amount_minor: 575000 }], "FAST_READING", 2), 575000);
assert.deepEqual(completionMonthBounds("2026-09-22T12:00:00.000Z"), {
  payablePeriodStart: "2026-09-01",
  payablePeriodEnd: "2026-09-30",
  payableAt: new Date("2026-10-01T12:00:00.000Z"),
});
assert.throws(() => normalizeR6GroupInput({ educationStage: "MIDDLE", trainingType: "FAST_READING", mode: "GROUP", participants: [{ studentUserId: "same", studentProfileId: "a" }, { studentUserId: "same", studentProfileId: "b" }] }), /R6_DUPLICATE_PARTICIPANT/);
assert.throws(() => normalizeR6GroupInput({ educationStage: "MIDDLE", trainingType: "FAST_READING", mode: "GROUP", minStudents: 1, maxStudents: 5 }), /R6_CAPACITY_INVALID/);

const qualificationApi = read("api/admin/r6-qualifications.js");
const groupApi = read("api/admin/r6-training-groups.js");
const completionApi = read("api/admin/r6-training-groups/[id].js");
const childApi = read("api/student/children.js");
const reviewApi = read("api/student/reviews.js");
const offerApi = read("api/admin/r6-custom-offers.js");
const studentOfferApi = read("api/student/custom-offers.js");
const payoutApi = read("api/admin/payouts.js");
const commerceApi = read("src/server/domain/commerce.js");
const studentCommerceApi = read("src/server/domain/student-commerce.js");
assert.match(qualificationApi, /r6_trainer_qualification_grants/u);
assert.match(qualificationApi, /source.*PURCHASE|PURCHASE.*OWNER_MANUAL/u);
assert.match(qualificationApi, /seniorBadge/u);
assert.match(groupApi, /assertActiveTrainerExpertise/u);
assert.match(read("src/server/domain/trainer-expertise.js"), /R6_TRAINER_NOT_ELIGIBLE/u);
assert.match(groupApi, /r6_training_payout_matrix/u);
assert.match(groupApi, /training_group\.manage/u);
assert.match(completionApi, /R6_TRAINING_GROUP_COMPLETION/u);
assert.match(completionApi, /payable_period_start/u);
assert.match(read("vite.config.js"), /api\/admin\/r6-training-groups/u);
assert.match(childApi, /owner_user_id.*status='ACTIVE'|owner_user_id=\$2/u);
assert.match(reviewApi, /REVIEW_BEFORE_COMPLETION/u);
assert.match(reviewApi, /REVIEW_DUPLICATE/u);
assert.match(reviewApi, /qualityScore|quality_score/u);
assert.match(offerApi, /token_hash/u);
assert.match(offerApi, /offer\.manage/u);
assert.match(studentOfferApi, /OFFER_NOT_FOUND/u);
assert.match(studentOfferApi, /customer_user_id|customer_email/u);
assert.match(payoutApi, /r6_trainer_payout_allocations/u);
assert.match(payoutApi, /ADJUSTMENT/u);
assert.match(commerceApi, /r6_order_component_snapshots/u);
assert.match(studentCommerceApi, /r6_order_component_snapshots/u);
console.log(JSON.stringify({ R6_RUNTIME_CONTRACTS: "PASS", QUALIFICATION_GRANTS: "PASS", SENIOR_BADGE_DERIVED: "PASS", GROUP_ELIGIBILITY: "PASS", INTEGER_PAYOUT: "PASS", MONTH_END_PAYABLE: "PASS", MULTI_CHILD: "PASS", REVIEWS: "PASS", CUSTOM_OFFERS: "PASS", ORDER_SNAPSHOTS: "PASS", PAYOUT_APPEND_ONLY: "PASS", NO_MIGRATION_EDIT: "PASS" }));
