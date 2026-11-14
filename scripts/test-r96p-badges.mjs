import assert from "node:assert/strict";
import {
  effectiveTrainerQualificationPredicate,
  projectTrainerQualificationBadges,
  TRAINER_BASE_QUALIFICATION_CODES,
  TRAINER_SENIOR_BADGE_CODE,
} from "../src/server/domain/trainer-expertise.js";

const rows = TRAINER_BASE_QUALIFICATION_CODES.map((code) => ({
  id: code,
  label: code,
}));

assert.equal(projectTrainerQualificationBadges(rows.slice(0, 5)).some((badge) => badge.id === TRAINER_SENIOR_BADGE_CODE), false);
const all = projectTrainerQualificationBadges([
  ...rows,
  rows[0],
  { id: "BOOK_ONLY", label: "Kitap" },
]);
assert.equal(all.filter((badge) => badge.id !== TRAINER_SENIOR_BADGE_CODE).length, 6);
assert.equal(all.at(-1)?.id, TRAINER_SENIOR_BADGE_CODE);
assert.equal(all.at(-1)?.label, "Usta Eğitmen");

const predicate = effectiveTrainerQualificationPredicate("g");
for (const fragment of [
  "g.status='ACTIVE'",
  "g.revoked_at is null",
  "g.valid_until is null or g.valid_until > now()",
  "g.source_ref like 'COMPLETION:%'",
  "vp.coverage_bps >= 9500",
  "cp.completed_items=cp.item_count",
  "cp.completed_at is not null",
  "g.source='OWNER_MANUAL'",
  "g.granted_by is not null",
]) assert.match(predicate, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

console.log(JSON.stringify({
  RESULT: "PASS",
  BASE_QUALIFICATIONS: TRAINER_BASE_QUALIFICATION_CODES.length,
  SENIOR_BADGE: TRAINER_SENIOR_BADGE_CODE,
}));


assert.equal(projectTrainerQualificationBadges([]).length,0);

for (let count=1;count<=6;count++) {
  const expected = count === 6 ? 7 : count;
  const result = projectTrainerQualificationBadges(
    rows.slice(0,count)
  );

  assert.equal(result.length,expected);

  assert.equal(
    result.some(b=>b.id===TRAINER_SENIOR_BADGE_CODE),
    count===6
  );
}

assert.ok(!predicate.includes("g.source='PURCHASE'"));
assert.ok(predicate.includes("g.granted_by is null"));
assert.ok(predicate.includes("g.granted_by is not null"));

console.log("BADGE_ZERO_TO_SIX=PASS");
console.log("SENIOR_REQUIRES_SIX=PASS");
console.log("PURCHASE_ALONE_NOT_EXPERTISE=PASS");
console.log("VIDEO_COVERAGE_PREDICATE=PASS");
console.log("CURRICULUM_COMPLETION_PREDICATE=PASS");
