import assert from "node:assert/strict";
import fs from "node:fs";
import { inputFields } from "../api/admin/trainer-packages.js";
import { TRAINER_PACKAGE_QUALIFICATIONS } from "../src/server/domain/trainer-expertise.js";

const ui = fs.readFileSync("src/platform/admin/OwnerTrainerPackagesPage.tsx", "utf8");
const api = fs.readFileSync("api/admin/trainer-packages.js", "utf8");
const packageVersion = fs.readFileSync("src/server/domain/package-version.js", "utf8");

const expectedSlugs = [
  "ilkokul-akici-hizli-okuma-egitimi",
  "ortaokul-hizli-okuma-egitimi",
  "lise-hizli-okuma-egitimi",
  "yetiskin-hizli-okuma-egitimi",
  "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs",
  "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt",
  "ortaokul-lise-yetiskin-hizli-okuma-egitimi",
  "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set",
];

assert.deepEqual(Object.keys(TRAINER_PACKAGE_QUALIFICATIONS).sort(), [...expectedSlugs].sort());
assert.match(packageVersion, /TRAINER_CORE001_PRICES = Object\.freeze\(/u);
assert.match(packageVersion, /"ortaokul-lise-yetiskin-hizli-okuma-egitimi": 1750000/u);
assert.match(packageVersion, /"ortaokul-lise-paragraf-egitmen-egitimi-ikili-set": 1250000/u);

const valid = inputFields({
  title: "R96P eğitmen paketi",
  slug: "r96p-egitmen-paketi",
  description: "Kaydedilen gerçek paket açıklaması.",
  shortDescription: "Kısa açıklama",
  priceGrossMinor: 1199000,
  currency: "TRY",
});
assert.equal(valid.description, "Kaydedilen gerçek paket açıklaması.");
assert.throws(
  () => inputFields({ title: "Eksik", slug: "eksik", description: "", priceGrossMinor: 100, currency: "TRY" }),
  /PACKAGE_FIELDS_REQUIRED/u,
);

assert.match(ui, /Paket açıklaması<textarea required/u);
assert.match(ui, /!form\.description\.trim\(\)/u);
assert.match(ui, /description: form\.description\.trim\(\)/u);
assert.doesNotMatch(ui, /description: form\.description\.trim\(\) \|\| selected\.description/u);
assert.match(api, /componentsSave/u);
assert.match(api, /savepoint owner_publication_attempt/u);
assert.match(api, /PUBLICATION_CONDITIONS_UNMET/u);

console.log(JSON.stringify({
  CANONICAL_TRAINER_PACKAGES: "PASS_8_SLUGS",
  OWNER_DESCRIPTION_EDIT_AND_PERSISTENCE: "PASS_SOURCE_CONTRACT",
  OWNER_COMPONENT_SAVE: "PASS_SOURCE_CONTRACT",
  PUBLICATION_GATE_PRESERVED: "PASS_SOURCE_CONTRACT",
  DATABASE_WRITE: "NONE",
  PRODUCTION_DEPLOY: "NO",
}));
