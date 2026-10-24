import assert from "node:assert/strict";
import fs from "node:fs";
import { enrollmentChildColumnAvailable, resolveBeneficiary } from "../src/server/domain/commerce.js";

const childId = "00000000-0000-4000-8000-000000000001";
const legacyProfileId = childId;
const ownerId = "00000000-0000-4000-8000-000000000002";
const queries = [];
const client = {
  async query(sql) {
    queries.push(sql);
    if (sql.includes("information_schema.columns")) return { rows: [{ present: true }] };
    if (sql.includes("guardian_student_relationships")) return { rows: [] };
    if (sql.includes("r6_student_child_profiles")) return {
      rows: [{ childProfileId: childId, studentProfileId: legacyProfileId, studentUserId: ownerId, studentName: "Child Two", educationStage: "MIDDLE", grade: "6", isSelected: false }],
    };
    throw new Error(`unexpected query: ${sql}`);
  },
};

const beneficiary = await resolveBeneficiary(client, { user: { id: ownerId }, memberships: [{ role: "GUARDIAN" }] }, childId);
assert.equal(beneficiary.childProfileId, childId, "child target wins when child and legacy IDs collide");
assert.equal(await enrollmentChildColumnAvailable(client), true);

const migration = fs.readFileSync(new URL("../drizzle/migrations/0040_r64_child_identity_isolation.sql", import.meta.url), "utf8");
assert.match(migration, /pg_indexes/u);
assert.match(migration, /UNIQUE \(student_user_id, training_program_id\)/u);
assert.match(migration, /DROP CONSTRAINT/u);
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS enrollments_beneficiary_program_uq/u);
assert.match(migration, /COALESCE\(child_profile_id, student_profile_id, student_user_id\)/u);
const journal = JSON.parse(fs.readFileSync(new URL("../drizzle/migrations/meta/_journal.json", import.meta.url), "utf8"));
const childMigration = journal.entries.find((entry) => entry.tag === "0040_r64_child_identity_isolation");
assert.equal(childMigration?.tag, "0040_r64_child_identity_isolation");
assert.equal(childMigration?.idx, 40);
const snapshot = JSON.parse(fs.readFileSync(new URL("../drizzle/migrations/meta/0040_snapshot.json", import.meta.url), "utf8"));
const previousSnapshot = JSON.parse(fs.readFileSync(new URL("../drizzle/migrations/meta/0022_snapshot.json", import.meta.url), "utf8"));
assert.equal(snapshot.version, "7");
assert.equal(snapshot.dialect, "postgresql");
assert.equal(snapshot.prevId, previousSnapshot.id);
assert.ok(snapshot.tables["public.enrollments"]?.indexes?.enrollments_beneficiary_program_uq);
assert.ok(snapshot.tables["public.r6_training_group_participants"]?.indexes?.r6_training_group_participants_uq);
const commerce = fs.readFileSync(new URL("../src/server/domain/commerce.js", import.meta.url), "utf8");
assert.match(commerce, /CHILD_ENROLLMENT_MIGRATION_REQUIRED/u);
assert.match(commerce, /beneficiary_child_profile_id=\$3/u);
const portal = fs.readFileSync(new URL("../api/student/portal-context.js", import.meta.url), "utf8");
assert.match(portal, /childProfileId/u);
assert.match(portal, /package_entitlement_enrollments/u);
const assignedTrainer = fs.readFileSync(new URL("../api/student/assigned-trainer.js", import.meta.url), "utf8");
assert.match(assignedTrainer, /pe\.beneficiary_child_profile_id=\$2/u);
const groups = fs.readFileSync(new URL("../api/admin/r6-training-groups.js", import.meta.url), "utf8");
assert.match(groups, /R6_ENROLLMENT_SCOPE_DENIED/u);
assert.match(groups, /pe\.beneficiary_child_profile_id=\$3/u);
const trainerStudents = fs.readFileSync(new URL("../api/trainer/students.js", import.meta.url), "utf8");
assert.match(trainerStudents, /Keep this roster readable before 0040/u);
assert.match(trainerStudents, /id: enrollments\.id/u);

console.log(JSON.stringify({
  CHILD_TARGET_PRECEDENCE: "PASS",
  CHILD_ENROLLMENT_MIGRATION_GATE: "PASS",
  LEGACY_UNIQUE_INDEX_REMOVAL: "PASS",
  DATABASE_MUTATION: "NONE",
}));
