import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const productApi = read("api/admin/products/[id].js");
const studentAdmin = read("api/admin/student-commerce-packages.js");
const trainerAdmin = read("api/admin/trainer-packages.js");
const publicStudent = read("api/public/student-commerce-packages.js");
const studentOwnerUi = read("src/platform/admin/AdminStudentCommercePage.tsx");
const trainerOwnerUi = read("src/platform/admin/OwnerTrainerPackagesPage.tsx");
const productEditorUi = read("src/platform/admin/StudentProductCatalogV39C.tsx");
const productDetailUi = read("src/platform/admin/AdminProductDetailPage.tsx");

// Existing product edits must preserve canonical identity and serialize
// concurrent writes.  Descriptive fields may still be edited in place; no
// package_versions row is updated by this endpoint.
assert.match(productApi, /PRODUCT_IDENTITY_IMMUTABLE/u);
assert.match(productApi, /select \* from physical_products where id=\$1 for update/u);
assert.match(productApi, /update physical_products set/u);
assert.doesNotMatch(productApi, /update package_versions set/u);

// Owner package saves carry visibility on the package record while version
// edits stay in the DRAFT row.  Both catalog domains retain the same guard.
assert.match(studentAdmin, /public_web_visible=coalesce\(\$7,public_web_visible\)/u);
assert.match(studentAdmin, /resolveEditableStudentVersion/u);
assert.match(trainerAdmin, /public_web_visible=coalesce\(\$6,public_web_visible\)/u);
assert.ok(trainerAdmin.includes('String(input.action)==="createDraft"'), "trainer draft action is present");
assert.match(studentOwnerUi, /publicWebVisible/u);
assert.match(trainerOwnerUi, /publicWebVisible/u);
assert.match(productEditorUi, /PRODUCT_IDENTITY_IMMUTABLE/u);
assert.match(productEditorUi, /SKU ve ürün türü geçmiş paket bağlantıları/u);
assert.match(productDetailUi, /readOnly value=\{form\.sku/u);
assert.match(productDetailUi, /PRODUCT_IDENTITY_IMMUTABLE/u);

// Anonymous web projection is read-only, selects the latest PUBLISHED version,
// and requires both package publication and the explicit visibility switch.
assert.match(publicStudent, /join lateral \(\s*select pv\.\* from package_versions pv/u);
assert.match(publicStudent, /pv\.status = 'PUBLISHED'/u);
assert.match(publicStudent, /p\.status = 'PUBLISHED'/u);
assert.match(publicStudent, /p\.public_web_visible = true/u);
assert.doesNotMatch(publicStudent, /purchase_enabled = true/u);

console.log(JSON.stringify({
  PRODUCT_IDENTITY_GUARD: "PASS",
  PRODUCT_ROW_LOCK: "PASS",
  PUBLISHED_PACKAGE_VERSION_WRITE: "NOT_USED",
  STUDENT_VISIBILITY_PROJECTION: "PASS_SOURCE_GUARD",
  TRAINER_VISIBILITY_PERSISTENCE: "PASS_SOURCE_GUARD",
  PRODUCTION_WRITE: "NONE",
}));
