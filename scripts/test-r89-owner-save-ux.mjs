import assert from "node:assert/strict";
import fs from "node:fs";

const student = fs.readFileSync("src/platform/admin/AdminStudentCommercePage.tsx", "utf8");
const trainer = fs.readFileSync("src/platform/admin/OwnerTrainerPackagesPage.tsx", "utf8");
const css = fs.readFileSync("src/platform/admin/admin-panel.css", "utf8");

assert.match(student, /setSaveStatus\("saving"\); setMessage\("Kaydediliyor\.\.\."\)/u);
assert.match(student, /const refreshed = await load\(\);/u);
assert.match(student, /if \(!refreshed || !refreshed\.packages\.some/u);
assert.match(student, /Paket Bilgileri Kaydedildi/u);
assert.match(student, /admin-feedback-\$\{saveStatus\}/u);
assert.match(student, /updateForm\(\{ title:/u);

assert.match(trainer, /typed\.status === 409 && typeof response\?\.packageVersionId === "string"/u);
assert.match(trainer, /await refreshSelected\(selected\.id\)/u);
assert.match(trainer, /ensureDraftVersion\(selected\)/u);

assert.match(css, /\.admin-feedback-success\{/u);
assert.match(css, /\.admin-feedback-error\{/u);

console.log(JSON.stringify({
  STUDENT_PATCH_GET_CONFIRMATION: "PASS_SOURCE_CONTRACT",
  OWNER_SAVE_STATUS_MESSAGES: "PASS_SOURCE_CONTRACT",
  TRAINER_PUBLICATION_409_DRAFT_REFRESH: "PASS_SOURCE_CONTRACT",
  DATABASE_WRITE: "NO",
}));
