import assert from "node:assert/strict";
import fs from "node:fs";
import { packageFields, optionalBoolean as optionalStudentBoolean } from "../api/admin/student-commerce-packages.js";
import { inputFields, optionalBoolean as optionalTrainerBoolean } from "../api/admin/trainer-packages.js";

const studentSource = fs.readFileSync("api/admin/student-commerce-packages.js", "utf8");
const trainerSource = fs.readFileSync("api/admin/trainer-packages.js", "utf8");

for (const parseBoolean of [optionalStudentBoolean, optionalTrainerBoolean]) {
  assert.equal(parseBoolean(undefined), undefined);
  assert.equal(parseBoolean(true), true);
  assert.equal(parseBoolean(false), false);
  assert.equal(parseBoolean("true"), true);
  assert.equal(parseBoolean(" FALSE "), false);
  assert.throws(() => parseBoolean("yes"), /INVALID|BOOLEAN/iu);
}

const student = packageFields({
  title: "R89 öğrenci paket",
  subtitle: "R89 kısa açıklama",
  description: "R89 açıklama",
  slug: "r89-ogrenci-paket",
  educationStage: "PRIMARY",
  eligibleGrades: [3],
});
assert.equal(student.publicWebVisible, undefined);
const studentInput = {
  title: "R89 öğrenci paket",
  subtitle: "R89 kısa açıklama",
  description: "R89 açıklama",
  slug: "r89-ogrenci-paket",
  educationStage: "PRIMARY",
  eligibleGrades: [3],
};
assert.equal(packageFields({ ...studentInput, publicWebVisible: "true" }).publicWebVisible, true);
assert.equal(packageFields({ ...studentInput, publicWebVisible: "false" }).publicWebVisible, false);

const trainer = inputFields({
  title: "R89 eğitmen paket",
  slug: "r89-egitmen-paket",
  description: "R89 açıklama",
  priceGrossMinor: 10000,
  currency: "TRY",
});
assert.equal(trainer.publicWebVisible, undefined);
const trainerInput = {
  title: "R89 eğitmen paket",
  slug: "r89-egitmen-paket",
  description: "R89 açıklama",
  priceGrossMinor: 10000,
  currency: "TRY",
};
assert.equal(inputFields({ ...trainerInput, publicWebVisible: "true" }).publicWebVisible, true);
assert.equal(inputFields({ ...trainerInput, publicWebVisible: "false" }).publicWebVisible, false);

assert.match(studentSource, /public_web_visible=coalesce\(\$7,public_web_visible\)/u);
assert.match(trainerSource, /public_web_visible=coalesce\(\$6,public_web_visible\)/u);
assert.match(trainerSource, /physical_product=\$8/u);
assert.match(trainerSource, /component_type='PHYSICAL_PRODUCT' and is_active=true/u);
assert.doesNotMatch(studentSource, /Boolean\(input\.publicWebVisible\)/u);
assert.doesNotMatch(trainerSource, /Boolean\(input\.publicWebVisible\)/u);
assert.doesNotMatch(trainerSource, /physical_product=true/u);

console.log(JSON.stringify({
  STUDENT_OMITTED_VISIBILITY: "PASS_PRESERVE",
  TRAINER_OMITTED_VISIBILITY: "PASS_PRESERVE",
  BOOLEAN_STRING_PARSING: "PASS",
  TRAINER_PHYSICAL_PRODUCT_DERIVATION: "PASS_SOURCE_CONTRACT",
  DATABASE_WRITE: "NO",
}));
