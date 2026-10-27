import assert from "node:assert/strict";
import fs from "node:fs";
import { canCreateChildProfile, canDisableMultipleStudents } from "../src/server/domain/student-account-capability.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

{
  assert.equal(canCreateChildProfile({ activeChildCount: 0, allowMultipleStudents: false }), true);
  assert.equal(canCreateChildProfile({ activeChildCount: 1, allowMultipleStudents: false }), false);
}

{
  assert.equal(canCreateChildProfile({ activeChildCount: 1, allowMultipleStudents: true }), true);
  assert.equal(canCreateChildProfile({ activeChildCount: 3, allowMultipleStudents: true }), true);
  const schema = read("src/server/db/schema.js");
  assert.match(schema, /allowMultipleStudents: boolean\("allow_multiple_students"\)/u);
  assert.match(schema, /r6StudentChildProfiles = pgTable\("r6_student_child_profiles"[\s\S]*ownerUserId: uuid\("owner_user_id"\)/u);
  assert.match(schema, /studentProfiles = pgTable\("student_profiles"[\s\S]*userId: uuid\("user_id"\)\.notNull\(\)\.unique\(\)/u);
}

{
  assert.equal(canDisableMultipleStudents({ activeChildCount: 0 }), true);
  assert.equal(canDisableMultipleStudents({ activeChildCount: 1 }), true);
  assert.equal(canDisableMultipleStudents({ activeChildCount: 2 }), false);
}

{
  const childApi = read("api/student/children.js");
  const ownerApi = read("api/admin/student-account-capability.js");
  const migration = read("drizzle/migrations/0033_core_multi_student_capability.sql");
  const vite = read("vite.config.js");
  assert.match(childApi, /select allow_multiple_students from platform_users where id=\$1 for update/u);
  assert.match(childApi, /MULTIPLE_STUDENTS_NOT_ALLOWED/u);
  assert.match(ownerApi, /requireMembership\(principal, "OWNER"\)/u);
  assert.match(ownerApi, /MULTIPLE_STUDENTS_ACTIVE/u);
  assert.match(ownerApi, /STUDENT_ACCOUNT_CAPABILITY_SET/u);
  assert.doesNotMatch(ownerApi, /SUPER_ADMIN/u);
  assert.match(migration, /ADD COLUMN allow_multiple_students boolean NOT NULL DEFAULT false/u);
  assert.match(vite, /api\/admin\/student-account-capability/u);
}

console.log(JSON.stringify({ MULTI_STUDENT_FOUNDATION: "PASS", ACCOUNT_STUDENT_SEPARATION: "PASS", OWNER_CAPABILITY_GUARD: "PASS" }));
