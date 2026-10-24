import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeR6GroupInput } from "../src/server/domain/r6-training.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const siblingGroup = normalizeR6GroupInput({
  educationStage: "MIDDLE",
  trainingType: "FAST_READING",
  mode: "GROUP",
  participants: [
    { studentUserId: "owner-1", childProfileId: "child-a" },
    { studentUserId: "owner-1", childProfileId: "child-b" },
  ],
});
assert.equal(siblingGroup.participants.length, 2);
assert.throws(() => normalizeR6GroupInput({
  educationStage: "MIDDLE",
  trainingType: "FAST_READING",
  mode: "GROUP",
  participants: [
    { studentUserId: "owner-1", childProfileId: "child-a" },
    { studentUserId: "owner-1", childProfileId: "child-a" },
  ],
}), /R6_DUPLICATE_PARTICIPANT/u);

const trainingGroups = read("api/admin/r6-training-groups.js");
assert.match(trainingGroups, /rgp\.child_profile_id=\$5/u);
assert.match(trainingGroups, /rgp\.student_profile_id=\$6/u);
assert.match(trainingGroups, /pe\.beneficiary_child_profile_id as "childProfileId"/u);
assert.match(trainingGroups, /rgp\.child_profile_id=pe\.beneficiary_child_profile_id/u);
assert.match(read("api/admin/r6-group-assignment-candidates.js"), /pe\.beneficiary_child_profile_id as "childProfileId"/u);
const groupSchema = read("src/server/db/schema.ts");
assert.match(groupSchema, /coalesce\(\$\{table\.childProfileId\}, \$\{table\.studentProfileId\}, \$\{table\.studentUserId\}\)/u);
const migration = read("drizzle/migrations/0040_r64_child_identity_isolation.sql");
assert.match(migration, /COALESCE\(child_profile_id, student_profile_id, student_user_id\)/u);
assert.match(migration, /beneficiary_child_profile_id/u);
const commerce = read("src/server/domain/commerce.js");
assert.match(commerce, /beneficiary_child_profile_id,training_program_id,status/u);
assert.match(commerce, /CHILD_ENROLLMENT_MIGRATION_REQUIRED/u);
assert.match(commerce, /on conflict do nothing returning id/u);
assert.match(commerce, /enrollmentChildColumnAvailable/u);
const entitlements = read("api/student/entitlements.js");
assert.match(entitlements, /beneficiary_child_profile_id \$\{beneficiaryTargetClause\}/u);
assert.match(commerce, /\$3::uuid is null and beneficiary_child_profile_id is null/u);
assert.match(read("src/server/domain/student-commerce.js"), /\$3::uuid is null and beneficiary_child_profile_id is null/u);

console.log(JSON.stringify({
  SIBLING_GROUP_TARGETS: "PASS",
  SAME_CHILD_DUPLICATE: "PASS",
  GROUP_DB_IDENTITY_DESIGN: "PASS",
  CHILD_ENROLLMENT_ISOLATION: "BLOCKED_MIGRATION_NOT_APPLIED",
  DATABASE_MUTATION: "NO",
  WRITES: "NONE",
}));
