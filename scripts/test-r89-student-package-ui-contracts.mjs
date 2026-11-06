import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/platform/student/StudentPackagesPage.tsx", "utf8");

// The authenticated entitlements response is already filtered by audience,
// stage, grade, panel visibility, publication, and purchase eligibility. The
// UI must not hide a valid Owner row because a static media slug is missing.
assert.match(source, /const visiblePackages = body\.packages;/u);
assert.doesNotMatch(source, /const visiblePackages = body\.packages\.filter\(/u);

// Owner/DB media remains authoritative. A matching static catalog slug is a
// narrow visual yedek, and package rows without that exact slug remain
// neutral instead of borrowing another package's art.
assert.match(source, /const matchingCatalog =\s*FIXOKU_PACKAGE_MEDIA\.find\(/u);
assert.match(source, /const catalogCover =\s*matchingCatalog\s*\?/u);
assert.match(source, /const image =\s*item\.coverImage \|\|\s*catalogCover \|\|\s*item\.products\.find\(\(product\) => product\.imageReference\)/u);
assert.match(source, /item\.description \|\|\s*item\.subtitle \|\|\s*exact\?\.subtitle/u);
assert.match(source, /const databaseContent = unique\(\[/u);
assert.match(source, /const contentItems = databaseContent\.length\s*\?\s*databaseContent\s*:\s*unique\(exact\?\.features \|\| \[\]\)/u);

// Missing or broken media renders a neutral placeholder instead of a broken
// image, while preserving the existing stage/access/purchase controls.
assert.match(source, /student-package-card__visual-placeholder/u);
assert.match(source, /if \(catalogCover && !img\.src\.endsWith\(catalogCover\)\)/u);
assert.match(source, /img\.hidden = true/u);
assert.match(source, /item\.accessState ===\s*"AVAILABLE"/u);
assert.match(source, /!item\.priceRequired/u);

console.log(JSON.stringify({
  STUDENT_OWNER_ROWS_NOT_MEDIA_FILTERED: "PASS_SOURCE_CONTRACT",
  DATABASE_MEDIA_AND_COPY_PRIORITY: "PASS_SOURCE_CONTRACT",
  SAFE_IMAGE_PLACEHOLDER: "PASS_SOURCE_CONTRACT",
  SEGMENT_ACCESS_PURCHASE_GATES_PRESERVED: "PASS_SOURCE_CONTRACT",
  DATABASE_WRITE: "NO",
}));
