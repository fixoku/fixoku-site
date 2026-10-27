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
  "g.source='PURCHASE'",
  "g.source='OWNER_MANUAL'",
  "g.granted_by is not null",
]) assert.match(predicate, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

console.log(JSON.stringify({
  RESULT: "PASS",
  BASE_QUALIFICATIONS: TRAINER_BASE_QUALIFICATION_CODES.length,
  SENIOR_BADGE: TRAINER_SENIOR_BADGE_CODE,
}));
