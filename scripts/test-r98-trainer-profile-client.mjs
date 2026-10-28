import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../src/platform/trainer/profile/TrainerProfilePage.tsx", import.meta.url),
  "utf8",
);

assert.match(source, /<form className="profile-grid" onSubmit=\{submitProfileForm\}>/u);
assert.match(source, /function submitProfileForm\(event: FormEvent<HTMLFormElement>\)/u);
assert.match(source, /event\.preventDefault\(\);\s*void save\(\);/u);
assert.match(source, /specialties: profile\.specialties/u);
assert.match(source, /name="specialties"/u);
assert.match(source, /<button\s+type="submit"/u);

console.log(JSON.stringify({
  PROFESSIONAL_FORM_SUBMIT_HANDLER: "PASS",
  SPECIALTIES_PAYLOAD: "PASS",
  SAVE_BUTTON_SUBMIT: "PASS",
  DATABASE_MUTATION: "NONE",
}));
