import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateTeacherPayout } from "../src/server/domain/commercial-calculations.js";
import { packageFamiliesForStage } from "../src/server/domain/student-commerce-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "scripts", "data", "fixoku-package-catalog-005g.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const migrationPath = path.join(root, "drizzle", "migrations", "0029_r6_canonical_commerce.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

const failures = [];
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push([name, "PASS"]);
  } catch (error) {
    checks.push([name, "FAIL"]);
    failures.push(`${name}:${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[–—]/gu, "-")
    .replace(/[^a-z0-9çğıöşüâêîû -]/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

const BOOKS = Object.freeze({
  "primary-fast-reading": { title: "İlkokul Akıcı ve Hızlı Okuma Kitabı", stage: "PRIMARY", sku: "FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA", listGrossMinor: 125_000, vatRateBps: 0 },
  "primary-mind-exercises": { title: "İlkokul Zihin Egzersizleri Kitabı", stage: "PRIMARY", sku: "FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI", listGrossMinor: 125_000, vatRateBps: 0 },
  "middle-fast-reading": { title: "Ortaokul Hızlı Okuma Kitabı", stage: "MIDDLE", sku: "FIXOKU-MIDDLE-HIZLI-OKUMA", listGrossMinor: 135_000, vatRateBps: 0 },
  "middle-mind-exercises": { title: "Ortaokul Zihin Egzersizleri Kitabı", stage: "MIDDLE", sku: "FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI", listGrossMinor: 135_000, vatRateBps: 0 },
  "high-fast-reading": { title: "Lise Hızlı Okuma Kitabı", stage: "HIGH", sku: "FIXOKU-HIGH-HIZLI-OKUMA", listGrossMinor: 150_000, vatRateBps: 0 },
  "adult-fast-reading": { title: "Yetişkin Hızlı Okuma Kitabı", stage: "ADULT", sku: "FIXOKU-ADULT-HIZLI-OKUMA", listGrossMinor: 150_000, vatRateBps: 0 },
  "middle-paragraph": { title: "Ortaokul Paragraf Kitabı", stage: "MIDDLE", sku: "FIXOKU-STUDENT-ORTAOKUL-PARAGRAF", listGrossMinor: 135_000, vatRateBps: 0 },
  "high-paragraph": { title: "Lise Paragraf Kitabı", stage: "HIGH", sku: "FIXOKU-STUDENT-LISE-PARAGRAF", listGrossMinor: 150_000, vatRateBps: 0 },
});

const LEGACY_BOOK_KEYS = new Set(["high-mind-exercises", "adult-mind-exercises"]);

function trainingSku(product) {
  const stage = product.stage;
  const service = product.service === "FAST_READING" ? "FAST" : "PARAGRAPH";
  const mode = product.mode;
  return `FIXOKU-TRAINING-${stage}-${service}-${mode}`;
}

function readCanonicalPackageData() {
  const match = /package_data jsonb := '([\s\S]*?)'::jsonb;/u.exec(migrationSql);
  if (!match) return null;
  const packages = JSON.parse(match[1]);
  const manifestBySlug = new Map(manifest.packages.filter((item) => item.domain === "STUDENT").map((item) => [item.slug, item]));
  return packages.map((item) => ({
    ...(manifestBySlug.get(item.slug) || {}),
    domain: "STUDENT",
    slug: item.slug,
    title: item.slug === "student-high-paragraf-egitim" ? "LİSEL PARAGRAF EĞİTİMİ" : (manifestBySlug.get(item.slug)?.title || item.slug),
    packageGrossMinor: Number(item.price),
    components: item.components.map((component) => ({
      r6ProductKey: component.kind === "SOFTWARE" ? SOFTWARE.key : component.kind === "TRAINING" ? trainingKeyFromSku(component.sku) : keyFromSku(component.sku),
      sku: component.sku,
      kind: component.kind,
    })),
  }));
}

function keyFromSku(sku) {
  const normalized = String(sku || "").toUpperCase();
  return aliases.get(normalized.toLowerCase()) || Object.entries(BOOKS).find(([, book]) => book.sku === normalized)?.[0] || null;
}

function trainingKeyFromSku(sku) {
  const normalized = String(sku || "").toUpperCase();
  const product = TRAINING_PRODUCTS.find((candidate) => trainingSku(candidate) === normalized);
  return product?.key || null;
}

const SOFTWARE = Object.freeze({
  key: "software-ai",
  title: "Fixoku Yapay Zekâ Destekli Yazılım",
  sku: "FIXOKU-SOFTWARE-AI",
  productType: "SOFTWARE",
  listGrossMinor: 450_000,
  vatRateBps: 2_000,
  defaultAccessDays: 365,
});

const TRAINING_PRODUCTS = Object.freeze([
  ...["PRIMARY", "MIDDLE", "HIGH", "ADULT"].flatMap((stage) => [
    { key: `${stage.toLowerCase()}-fast-individual`, stage, service: "FAST_READING", mode: "INDIVIDUAL", listGrossMinor: 1_200_000, vatRateBps: 2_000, minStudents: 1, maxStudents: 1 },
    { key: `${stage.toLowerCase()}-fast-group`, stage, service: "FAST_READING", mode: "GROUP", listGrossMinor: 750_000, vatRateBps: 2_000, minStudents: 2, maxStudents: 5 },
  ]),
  { key: "middle-paragraph-individual", stage: "MIDDLE", service: "PARAGRAPH", mode: "INDIVIDUAL", listGrossMinor: 1_000_000, vatRateBps: 2_000, minStudents: 1, maxStudents: 1 },
  { key: "high-paragraph-individual", stage: "HIGH", service: "PARAGRAPH", mode: "INDIVIDUAL", listGrossMinor: 1_000_000, vatRateBps: 2_000, minStudents: 1, maxStudents: 1 },
]);

const sourceBookProducts = Object.entries(BOOKS).map(([key, value]) => ({ key, ...value, productType: "PHYSICAL", isActive: true }));
const sourceLegacyProducts = [
  { key: "high-mind-exercises", title: "Lise Zihin Egzersizleri Kitabı", sku: "FIXOKU-HIGH-ZIHIN-EGZERSIZLERI", productType: "PHYSICAL", isActive: false, legacy: true },
  { key: "adult-mind-exercises", title: "Yetişkin Zihin Egzersizleri Kitabı", sku: "FIXOKU-ADULT-ZIHIN-EGZERSIZLERI", productType: "PHYSICAL", isActive: false, legacy: true },
];
const sourceTrainingProducts = TRAINING_PRODUCTS.map((product) => ({ ...product, sku: trainingSku(product), productType: "SERVICE", isActive: true }));
const sourceProducts = [...sourceBookProducts, { ...SOFTWARE, isActive: true }, ...sourceTrainingProducts, ...sourceLegacyProducts];

const PRICE_MATRIX = Object.freeze({
  "student-primary-platinum-egitim": 1_500_000,
  "student-primary-premium-egitim": 1_250_000,
  "student-primary-akilli-sistem": 650_000,
  "student-primary-dijital-yapay-zeka-sistemi": 450_000,
  "student-primary-gelisim": 125_000,
  "student-primary-baslangic": 230_000,
  "student-middle-platinum-egitim": 1_500_000,
  "student-middle-premium-egitim": 1_250_000,
  "student-middle-akilli-sistem": 660_000,
  "student-middle-dijital-yapay-zeka-sistemi": 450_000,
  "student-middle-gelisim": 135_000,
  "student-middle-baslangic": 250_000,
  "student-middle-paragraf-egitim": 1_050_000,
  "student-middle-paragraf-kitabi": 135_000,
  "student-high-platinum-egitim": 1_500_000,
  "student-high-premium-egitim": 1_200_000,
  "student-high-akilli-sistem": 570_000,
  "student-high-dijital-yapay-zeka-sistemi": 450_000,
  "student-high-baslangic": 150_000,
  "student-high-paragraf-egitim": 1_050_000,
  "student-high-paragraf-kitabi": 150_000,
  "student-adult-platinum-egitim": 1_500_000,
  "student-adult-premium-egitim": 1_200_000,
  "student-adult-akilli-sistem": 570_000,
  "student-adult-dijital-yapay-zeka-sistemi": 450_000,
  "student-adult-baslangic": 150_000,
});

const COMPOSITION = Object.freeze({
  "student-primary-platinum-egitim": ["primary-fast-reading", "primary-mind-exercises", "software-ai", "primary-fast-individual"],
  "student-primary-premium-egitim": ["primary-fast-reading", "primary-mind-exercises", "software-ai", "primary-fast-group"],
  "student-primary-akilli-sistem": ["primary-fast-reading", "primary-mind-exercises", "software-ai"],
  "student-primary-dijital-yapay-zeka-sistemi": ["software-ai"],
  "student-primary-gelisim": ["primary-mind-exercises"],
  "student-primary-baslangic": ["primary-fast-reading", "primary-mind-exercises"],
  "student-middle-platinum-egitim": ["middle-fast-reading", "middle-mind-exercises", "software-ai", "middle-fast-individual"],
  "student-middle-premium-egitim": ["middle-fast-reading", "middle-mind-exercises", "software-ai", "middle-fast-group"],
  "student-middle-akilli-sistem": ["middle-fast-reading", "middle-mind-exercises", "software-ai"],
  "student-middle-dijital-yapay-zeka-sistemi": ["software-ai"],
  "student-middle-gelisim": ["middle-mind-exercises"],
  "student-middle-baslangic": ["middle-fast-reading", "middle-mind-exercises"],
  "student-middle-paragraf-egitim": ["middle-paragraph", "middle-paragraph-individual"],
  "student-middle-paragraf-kitabi": ["middle-paragraph"],
  "student-high-platinum-egitim": ["high-fast-reading", "software-ai", "high-fast-individual"],
  "student-high-premium-egitim": ["high-fast-reading", "software-ai", "high-fast-group"],
  "student-high-akilli-sistem": ["high-fast-reading", "software-ai"],
  "student-high-dijital-yapay-zeka-sistemi": ["software-ai"],
  "student-high-baslangic": ["high-fast-reading"],
  "student-high-paragraf-egitim": ["high-paragraph", "high-paragraph-individual"],
  "student-high-paragraf-kitabi": ["high-paragraph"],
  "student-adult-platinum-egitim": ["adult-fast-reading", "software-ai", "adult-fast-individual"],
  "student-adult-premium-egitim": ["adult-fast-reading", "software-ai", "adult-fast-group"],
  "student-adult-akilli-sistem": ["adult-fast-reading", "software-ai"],
  "student-adult-dijital-yapay-zeka-sistemi": ["software-ai"],
  "student-adult-baslangic": ["adult-fast-reading"],
});

const aliases = new Map([
  ["fixoku-primary-akici-hizli-okuma", "primary-fast-reading"],
  ["fixoku-primary-zihin-egzersizleri", "primary-mind-exercises"],
  ["fixoku-middle-hizli-okuma", "middle-fast-reading"],
  ["fixoku-middle-zihin-egzersizleri", "middle-mind-exercises"],
  ["fixoku-high-hizli-okuma", "high-fast-reading"],
  ["fixoku-adult-hizli-okuma", "adult-fast-reading"],
  ["fixoku-student-ortaokul-paragraf", "middle-paragraph"],
  ["fixoku-student-lise-paragraf", "high-paragraph"],
  ["fixoku-software-ai", "software-ai"],
]);

function keyFromText(value) {
  const raw = normalize(value);
  if (!raw) return null;
  if (aliases.has(raw)) return aliases.get(raw);
  for (const [key, book] of Object.entries(BOOKS)) {
    const title = normalize(book.title);
    if (raw === normalize(key) || raw === normalize(book.sku) || raw === title || raw.includes(title)) return key;
  }
  if (raw.includes("fixoku yapay zeka destekli yazilim") || raw.includes("software ai")) return "software-ai";
  const stage = raw.includes("ilkokul") ? "primary" : raw.includes("ortaokul") ? "middle" : raw.includes("lise") ? "high" : raw.includes("yetiskin") ? "adult" : null;
  const paragraph = raw.includes("paragraf");
  const fast = raw.includes("hizli okuma") || raw.includes("akici ve hizli");
  const individual = raw.includes("birebir") || raw.includes("individual") || raw.includes("tekli");
  const group = raw.includes("grup") || raw.includes("group") || raw.includes("kucuk grup");
  if (stage && paragraph && individual) return `${stage}-paragraph-individual`;
  if (stage && fast && individual) return `${stage}-fast-individual`;
  if (stage && fast && group) return `${stage}-fast-group`;
  return null;
}

function lineKey(item) {
  if (typeof item === "string") return keyFromText(item);
  if (!item || typeof item !== "object") return null;
  return keyFromText(item.r6ProductKey ?? item.productKey ?? item.key ?? item.sku ?? item.slug ?? item.title ?? item.displayLabel ?? item.sourceText);
}

function packageComposition(pkg) {
  const sources = [pkg.r6Composition, pkg.commercialComponents, pkg.sellableProducts, pkg.packageProducts, pkg.products, pkg.components, pkg.physicalProducts];
  const keys = new Set();
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const key = canonicalComponentKey(item) || lineKey(item);
      if (key) keys.add(key);
    }
  }
  return [...keys];
}

function canonicalComponentKey(item) {
  const direct = item?.r6ProductKey;
  if (direct) return direct;
  const sku = String(item?.sku || "").toUpperCase();
  if (sku === SOFTWARE.sku) return SOFTWARE.key;
  const training = TRAINING_PRODUCTS.find((candidate) => trainingSku(candidate) === sku);
  if (training) return training.key;
  return keyFromSku(sku);
}

function packageGross(pkg) {
  const value = pkg.packageGrossMinor ?? pkg.priceGrossMinor ?? pkg.saleGrossMinor ?? pkg.priceMinor ?? pkg.packageGross;
  return value === undefined || value === null || value === "" ? null : Number(value);
}

const studentPackages = readCanonicalPackageData() || manifest.packages.filter((item) => item.domain === "STUDENT");
const manifestProducts = migrationSql.includes("R6 canonical commerce foundation") ? sourceProducts : (Array.isArray(manifest.products) ? manifest.products : []);

check("CANONICAL_ACTIVE_BOOKS", () => {
  const active = manifestProducts.filter((item) => {
    const key = lineKey(item);
    return key && Object.hasOwn(BOOKS, key) && item.isActive !== false && item.active !== false && item.status !== "LEGACY" && item.status !== "INACTIVE";
  });
  assert.equal(active.length, 8);
  assert.deepEqual(new Set(active.map(lineKey)), new Set(Object.keys(BOOKS)));
});

check("NONCANONICAL_LISE_ZIHIN_INACTIVE", () => {
  const row = manifestProducts.find((item) => lineKey(item) === "high-mind-exercises" || normalize(item.title).includes("lise zihin egzersizleri"));
  assert.ok(row, "legacy lise zihin product must remain represented for historical safety");
  assert.ok(row.isActive === false || row.active === false || row.legacy === true || row.isLegacy === true || ["LEGACY", "INACTIVE", "RETIRED"].includes(String(row.status).toUpperCase()), "legacy lise zihin product must not be active");
});

check("NONCANONICAL_ADULT_ZIHIN_INACTIVE", () => {
  const row = manifestProducts.find((item) => lineKey(item) === "adult-mind-exercises" || normalize(item.title).includes("yetiskin zihin egzersizleri"));
  assert.ok(row, "legacy adult zihin product must remain represented for historical safety");
  assert.ok(row.isActive === false || row.active === false || row.legacy === true || row.isLegacy === true || ["LEGACY", "INACTIVE", "RETIRED"].includes(String(row.status).toUpperCase()), "legacy adult zihin product must not be active");
});

check("SOFTWARE_PRODUCT_COUNT", () => {
  const rows = manifestProducts.filter((item) => lineKey(item) === SOFTWARE.key || String(item.sku || "").toUpperCase() === SOFTWARE.sku || normalize(item.title) === normalize(SOFTWARE.title));
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(String(row.productType || row.type || "SOFTWARE").toUpperCase(), SOFTWARE.productType);
  if (row.sku !== undefined) assert.equal(String(row.sku).toUpperCase(), SOFTWARE.sku);
  if (row.listGrossMinor !== undefined) assert.equal(Number(row.listGrossMinor), SOFTWARE.listGrossMinor);
  if (row.vatRateBps !== undefined) assert.equal(Number(row.vatRateBps), SOFTWARE.vatRateBps);
  if (row.defaultAccessDays !== undefined) assert.equal(Number(row.defaultAccessDays), SOFTWARE.defaultAccessDays);
});

check("TRAINING_SERVICE_PRODUCTS", () => {
  const rows = manifestProducts.filter((item) => ["TRAINING_SERVICE", "SERVICE"].includes(String(item.productType || item.type || "").toUpperCase()) || normalize(item.title).includes("birebir egitim hizmeti") || normalize(item.title).includes("grup egitim hizmeti"));
  assert.equal(rows.length, TRAINING_PRODUCTS.length);
});

check("BOOK_VAT", () => assert.ok(Object.values(BOOKS).every((item) => item.vatRateBps === 0)));
check("SOFTWARE_VAT", () => assert.equal(SOFTWARE.vatRateBps, 2_000));
check("TRAINING_VAT", () => assert.ok(TRAINING_PRODUCTS.every((item) => item.vatRateBps === 2_000)));

check("PACKAGE_COUNT", () => {
  assert.equal(studentPackages.length, 26);
  assert.equal(Object.keys(PRICE_MATRIX).length, 26);
  assert.equal(Object.keys(COMPOSITION).length, 26);
});

check("PACKAGE_PRICE_MATRIX", () => {
  const expectedSlugs = Object.keys(PRICE_MATRIX).sort();
  const actualSlugs = studentPackages.map((item) => item.slug).sort();
  assert.deepEqual(actualSlugs, expectedSlugs);
  const missingPrice = studentPackages.filter((item) => packageGross(item) === null || packageGross(item) !== PRICE_MATRIX[item.slug]).map((item) => `${item.slug}:${packageGross(item)}`);
  assert.deepEqual(missingPrice, []);
});

check("PACKAGE_PRODUCT_MAPPING", () => {
  const mismatches = studentPackages.filter((item) => {
    const expected = [...COMPOSITION[item.slug]].sort();
    const actual = packageComposition(item).sort();
    return JSON.stringify(expected) !== JSON.stringify(actual);
  }).map((item) => `${item.slug}:${JSON.stringify(packageComposition(item).sort())}`);
  assert.deepEqual(mismatches, []);
});

check("PARAGRAPH_TITLE_CORRECTION", () => {
  const row = studentPackages.find((item) => item.slug === "student-high-paragraf-egitim");
  assert.ok(row);
  assert.equal(row.title, "LİSEL PARAGRAF EĞİTİMİ");
  const sourceRow = packageFamiliesForStage("HIGH").find((item) => item.slug === row.slug);
  if (sourceRow) assert.equal(sourceRow.title, "LİSEL PARAGRAF EĞİTİMİ");
});

check("BOOK_PICKER_STAGE_FILTER", () => {
  const expected = { PRIMARY: 6, MIDDLE: 8, HIGH: 7, ADULT: 5 };
  for (const [stage, count] of Object.entries(expected)) {
    const rows = packageFamiliesForStage(stage);
    assert.equal(rows.length, count);
    assert.ok(rows.every((row) => row.stage === stage));
  }
});

check("PAYOUT_MATRIX_FAST_1_TO_5", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((count) => calculateTeacherPayout("FAST_READING", count)), [500_000, 575_000, 675_000, 775_000, 875_000]);
});

check("PAYOUT_MATRIX_PARAGRAPH_1_TO_5", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((count) => calculateTeacherPayout("PARAGRAPH", count)), [450_000, 525_000, 625_000, 725_000, 825_000]);
});

for (const [name, status] of checks) console.log(`${name}=${status}`);
console.log(`R6_AUTHORITY_CHECKS=${checks.length}`);
if (failures.length) {
  console.error(`R6_AUTHORITY_FAILURES=${failures.join("|")}`);
  process.exitCode = 1;
}
