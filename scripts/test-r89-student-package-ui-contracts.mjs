import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/platform/student/StudentPackagesPage.tsx", "utf8");

// The authenticated entitlements response is already filtered by audience,
// stage, grade, panel visibility, publication, and purchase eligibility. The
// UI must not hide a valid Owner row because a static media slug is missing.
assert.match(source, /const visiblePackages = body\.packages;/u);
assert.doesNotMatch(source, /const visiblePackages = body\.packages\.filter\(/u);

// DB/Owner media and descriptive fields take precedence; static media/copy is
// a legacy visual/content yedek only.
assert.match(source, /const databaseImage =\s*item\.coverImage \|\|\s*item\.products\.find\(\(product\) => product\.imageReference\)/u);
assert.match(source, /const image = databaseImage \|\| media\?\.image \|\| null;/u);
assert.match(source, /item\.description \|\|\s*item\.subtitle \|\|\s*exact\?\.subtitle/u);
assert.match(source, /const databaseContent = unique\(\[/u);
assert.match(source, /const contentItems = databaseContent\.length\s*\?\s*databaseContent\s*:\s*unique\(exact\?\.features \|\| \[\]\)/u);

// Missing or broken media renders a neutral placeholder instead of a broken
// image, while preserving the existing stage/access/purchase controls.
assert.match(source, /student-package-card__visual-placeholder/u);
assert.match(source, /event\.currentTarget\.hidden = true/u);
assert.match(source, /item\.accessState ===\s*"AVAILABLE"/u);
assert.match(source, /!item\.priceRequired/u);

console.log(JSON.stringify({
  STUDENT_OWNER_ROWS_NOT_MEDIA_FILTERED: "PASS_SOURCE_CONTRACT",
  DATABASE_MEDIA_AND_COPY_PRIORITY: "PASS_SOURCE_CONTRACT",
  SAFE_IMAGE_PLACEHOLDER: "PASS_SOURCE_CONTRACT",
  SEGMENT_ACCESS_PURCHASE_GATES_PRESERVED: "PASS_SOURCE_CONTRACT",
  DATABASE_WRITE: "NO",
}));
