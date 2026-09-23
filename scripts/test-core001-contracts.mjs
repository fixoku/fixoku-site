import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const migration = read("drizzle/migrations/0034_student_account_level_purchase.sql");
const schemaJs = read("src/server/db/schema.js");
const studentCommerce = read("src/server/domain/student-commerce.js");
const cartApi = read("api/student/cart.js");
const prices = read("drizzle/migrations/0031_core001_price_catalog_shipping.sql");
const catalog = read("src/server/domain/student-commerce-catalog.js");
const expertise = read("src/server/domain/trainer-expertise.js");
const trainerCommerce = read("src/server/domain/trainer-commerce.js");
const sidebar = read("src/platform/panel/layout/PanelSidebar.tsx");
const shipping = read("src/server/domain/book-shipping.js");

assert.doesNotMatch(migration, /DROP INDEX\s+IF EXISTS\s+student_cart_items_buyer_profile_version_uq/u);
assert.match(migration, /ALTER COLUMN beneficiary_student_profile_id DROP NOT NULL/u);
assert.match(migration, /student_cart_items_buyer_account_version_uq/u);
assert.match(schemaJs, /beneficiaryStudentProfileId: uuid\("beneficiary_student_profile_id"\)\.references/u);
assert.match(schemaJs, /catalogEducationStage: educationStage\("catalog_education_stage"\)/u);
assert.match(studentCommerce, /accountMode = !requestedProfileId/u);
assert.match(studentCommerce, /beneficiary_student_profile_id is null/u);
assert.match(cartApi, /catalogEducationStage/u);
assert.match(cartApi, /beneficiary_student_profile_id is null/u);

for (const gross of [55000, 50000, 350000, 450000, 1199000, 1599000, 895000, 995000, 1750000, 899000, 999000, 1250000]) {
  assert.match(prices, new RegExp(String(gross), "u"));
}
assert.doesNotMatch(prices, /545000|54500/u);
assert.match(catalog, /Birebir Eğitim/u);
assert.match(expertise, /ortaokul-lise-yetiskin-hizli-okuma-egitimi.*MIDDLE_FAST.*HIGH_FAST.*ADULT_FAST/su);
assert.match(expertise, /ortaokul-lise-paragraf-egitmen-egitimi-ikili-set.*MIDDLE_PARAGRAPH.*HIGH_PARAGRAPH/su);
assert.match(trainerCommerce, /grantTrainerOrderExpertise/u);
assert.match(trainerCommerce, /on conflict\(trainer_user_id,package_id\) where status='ACTIVE' do nothing/u);
assert.match(sidebar, /Eğitimlerim.*\/panel\/egitmen\/egitimlerim/u);
assert.match(sidebar, /Atamalarım.*\/panel\/egitmen\/atamalarim/u);
assert.match(shipping, /bookCount === 1.*bookCount === 2/su);

console.log(JSON.stringify({
  ACCOUNT_LEVEL_SOURCE_CONTRACT: "PASS",
  LEGACY_CART_UNIQUE_PRESERVED: "PASS",
  CORE001_PRICE_CATALOG_SOURCE: "PASS",
  TRAINER_EXPERTISE_MAPPING_SOURCE: "PASS",
  TRAINER_MENU_SOURCE: "PASS",
  DATABASE_MUTATION: "NO",
}));
