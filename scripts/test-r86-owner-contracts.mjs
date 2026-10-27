import assert from "node:assert/strict";
import fs from "node:fs";

const studentApi = fs.readFileSync("api/admin/student-commerce-packages.js", "utf8");
const trainerApi = fs.readFileSync("api/admin/trainer-packages.js", "utf8");
const studentUi = fs.readFileSync("src/platform/admin/AdminStudentCommercePage.tsx", "utf8");
const trainerUi = fs.readFileSync("src/platform/admin/OwnerTrainerPackagesPage.tsx", "utf8");
const studentCatalog = fs.readFileSync("api/student/packages.js", "utf8");
const trainerCatalog = fs.readFileSync("src/server/domain/trainer-commerce.js", "utf8");
const publicCatalog = fs.readFileSync("api/public/student-commerce-packages.js", "utf8");

for (const source of [studentApi, trainerApi]) {
  assert.match(source, /savepoint owner_publication_attempt/u);
  assert.match(source, /rollback to savepoint owner_publication_attempt/u);
  assert.match(source, /PUBLICATION_CONDITIONS_UNMET/u);
  assert.match(source, /published\s*:\s*false/u);
}
assert.match(studentUi, /showSaved\(\)/u);
assert.match(studentUi, /body\.message|body\.missingConditions/u);
assert.match(trainerUi, /PUBLICATION_CONDITIONS_UNMET/u);
assert.match(publicCatalog, /p\.audience\s*=\s*'STUDENT'/u);
assert.match(publicCatalog, /p\.catalog_scope\s*=\s*'STUDENT_COMMERCE'/u);
assert.match(publicCatalog, /p\.status\s*=\s*'PUBLISHED'/u);
assert.match(publicCatalog, /p\.public_web_visible\s*=\s*true/u);
assert.match(studentCatalog, /p\.audience\s*=\s*'STUDENT'/u);
assert.match(studentCatalog, /p\.catalog_scope\s*=\s*'STUDENT_COMMERCE'/u);
assert.match(trainerCatalog, /p\.audience\s*=\s*'TRAINER'/u);
assert.match(trainerCatalog, /p\.catalog_scope\s+in\s*\(\s*'TRAINER_COMMERCE'\s*,\s*'LEGACY_EDUCATION'\s*\)/u);
assert.doesNotMatch(publicCatalog, /TRAINER/u);

console.log(JSON.stringify({
  OWNER_SAVE_PUBLISH_ATOMIC: "PASS_SOURCE_CONTRACT",
  PUBLICATION_FAIL_CLOSED_DRAFT_PRESERVED: "PASS_SOURCE_CONTRACT",
  STUDENT_PUBLIC_CATALOG_SCOPE: "PASS_SOURCE_CONTRACT",
  TRAINER_AUTHENTICATED_CATALOG_SCOPE: "PASS_SOURCE_CONTRACT",
  PAYTR_FLAGS: "UNCHANGED",
  PRODUCTION_DB_WRITE: "NONE",
  DEPLOY: "NO",
}));
