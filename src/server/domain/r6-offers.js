/*
 * R6 custom-offer authority.
 *
 * This module deliberately contains no database access.  API handlers use it
 * to normalise owner input, calculate VAT/discount snapshots and authenticate
 * the one-time link without ever persisting the raw token.
 */
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { calculateDiscount, calculateVatIncluded } from "./commercial-calculations.js";

export const R6_OFFER_STATUSES = Object.freeze(["DRAFT", "SENT", "ACCEPTED", "CANCELLED", "EXPIRED"]);
export const R6_OFFER_LINE_KINDS = Object.freeze(["PACKAGE", "PRODUCT"]);
export const R6_OFFER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const EDUCATION_STAGES = new Set(["PRIMARY", "MIDDLE", "HIGH", "ADULT"]);

function fail(code, status = 400) {
  throw Object.assign(new Error(code), { code, status });
}

function integer(value, code, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) fail(code);
  return number;
}

export function isR6OfferUuid(value) {
  return R6_OFFER_UUID.test(String(value || ""));
}

export function normalizeOfferEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) fail("OFFER_EMAIL_INVALID");
  return email;
}

export function normalizeOfferStatus(value, yedek = "DRAFT") {
  const status = String(value || yedek).trim().toUpperCase();
  if (!R6_OFFER_STATUSES.includes(status)) fail("OFFER_STATUS_INVALID");
  return status;
}

export function createR6OfferToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashR6OfferToken(token) {
  const value = String(token || "");
  if (value.length < 24 || value.length > 256) fail("OFFER_TOKEN_INVALID", 401);
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time comparison for callers that already loaded a token hash. */
export function verifyR6OfferToken(token, expectedHash) {
  try {
    const actual = Buffer.from(hashR6OfferToken(token), "hex");
    const expected = Buffer.from(String(expectedHash || ""), "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function normalizeSnapshotText(value, code, max = 500) {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) fail(code);
  return text;
}

/**
 * Calculate one VAT-included line snapshot.  `listGrossMinor` and
 * `specialGrossMinor` are line totals (not floating-point TL values); callers
 * may pass unit*quantity themselves when they want unit pricing.
 */
export function normalizeR6OfferLine(input, index = 0, canonical = {}) {
  if (!input || typeof input !== "object") fail(`OFFER_LINE_${index}_INVALID`);
  const lineKind = String(input.lineKind || input.kind || "").trim().toUpperCase();
  if (!R6_OFFER_LINE_KINDS.includes(lineKind)) fail(`OFFER_LINE_${index}_KIND_INVALID`);
  const packageVersionId = input.packageVersionId ? String(input.packageVersionId) : null;
  const physicalProductId = input.physicalProductId ? String(input.physicalProductId) : null;
  if ((packageVersionId && physicalProductId) || (!packageVersionId && !physicalProductId)) fail(`OFFER_LINE_${index}_REFERENCE_INVALID`);
  if (lineKind === "PACKAGE" && !packageVersionId) fail(`OFFER_LINE_${index}_PACKAGE_REQUIRED`);
  if (lineKind === "PRODUCT" && !physicalProductId) fail(`OFFER_LINE_${index}_PRODUCT_REQUIRED`);
  if ((packageVersionId && !isR6OfferUuid(packageVersionId)) || (physicalProductId && !isR6OfferUuid(physicalProductId))) fail(`OFFER_LINE_${index}_REFERENCE_INVALID`);

  const quantity = integer(input.quantity ?? 1, `OFFER_LINE_${index}_QUANTITY`, { min: 1, max: 99 });
  const listGrossMinor = integer(input.listGrossMinor ?? canonical.listGrossMinor, `OFFER_LINE_${index}_LIST_GROSS_INVALID`);
  const specialGrossMinor = integer(input.specialGrossMinor, `OFFER_LINE_${index}_SPECIAL_GROSS_INVALID`);
  if (specialGrossMinor > listGrossMinor) fail(`OFFER_LINE_${index}_SPECIAL_EXCEEDS_LIST`);
  const vatRateBps = integer(input.vatRateBps ?? canonical.vatRateBps ?? 0, `OFFER_LINE_${index}_VAT_INVALID`, { max: 10_000 });
  const discount = calculateDiscount(listGrossMinor, specialGrossMinor);
  const vat = calculateVatIncluded(specialGrossMinor, vatRateBps);
  const productTypeSnapshot = normalizeSnapshotText(input.productTypeSnapshot ?? canonical.productTypeSnapshot ?? (lineKind === "PACKAGE" ? "PACKAGE" : "PRODUCT"), `OFFER_LINE_${index}_PRODUCT_TYPE_INVALID`, 120);
  const titleSnapshot = normalizeSnapshotText(input.titleSnapshot ?? canonical.titleSnapshot, `OFFER_LINE_${index}_TITLE_INVALID`);
  const skuSnapshot = input.skuSnapshot ?? canonical.skuSnapshot ?? null;
  const educationStage = input.educationStage ?? canonical.educationStage ?? null;
  if (educationStage !== null && (!EDUCATION_STAGES.has(String(educationStage).trim().toUpperCase()))) fail(`OFFER_LINE_${index}_STAGE_INVALID`);

  return {
    lineKind,
    packageVersionId,
    physicalProductId,
    titleSnapshot,
    skuSnapshot: skuSnapshot == null ? null : String(skuSnapshot).trim().slice(0, 160),
    productTypeSnapshot,
    educationStage: educationStage == null ? null : String(educationStage).trim().toUpperCase(),
    quantity,
    listGrossMinor,
    specialGrossMinor,
    discountMinor: discount.discountMinor,
    discountPercentBps: discount.discountPercentBps,
    vatRateBps,
    netMinor: vat.netMinor,
    vatMinor: vat.vatMinor,
    grossMinor: vat.grossMinor,
    lineOrder: integer(input.lineOrder ?? index, `OFFER_LINE_${index}_ORDER_INVALID`, { min: 0, max: 100_000 }),
    beneficiaries: normalizeR6OfferBeneficiaries(input.beneficiaries || input.targets || [], quantity, index),
  };
}

export function normalizeR6OfferBeneficiaries(input, quantity, lineIndex = 0) {
  if (input == null) return [];
  if (!Array.isArray(input)) fail(`OFFER_LINE_${lineIndex}_BENEFICIARIES_INVALID`);
  const seenTargets = new Set();
  const result = input.map((target, targetIndex) => {
    if (!target || typeof target !== "object") fail(`OFFER_LINE_${lineIndex}_BENEFICIARY_${targetIndex}_INVALID`);
    const childProfileId = target.childProfileId ? String(target.childProfileId) : null;
    const studentProfileId = target.studentProfileId ? String(target.studentProfileId) : null;
    if ((childProfileId && studentProfileId) || (!childProfileId && !studentProfileId)) fail(`OFFER_LINE_${lineIndex}_BENEFICIARY_${targetIndex}_TARGET_INVALID`);
    if ((childProfileId && !isR6OfferUuid(childProfileId)) || (studentProfileId && !isR6OfferUuid(studentProfileId))) fail(`OFFER_LINE_${lineIndex}_BENEFICIARY_${targetIndex}_TARGET_INVALID`);
    const targetKey = childProfileId ? `child:${childProfileId}` : `student:${studentProfileId}`;
    if (seenTargets.has(targetKey)) fail(`OFFER_LINE_${lineIndex}_BENEFICIARY_${targetIndex}_DUPLICATE`);
    seenTargets.add(targetKey);
    return { childProfileId, studentProfileId, quantity: integer(target.quantity ?? 1, `OFFER_LINE_${lineIndex}_BENEFICIARY_${targetIndex}_QUANTITY_INVALID`, { min: 1, max: 99 }) };
  });
  const total = result.reduce((sum, item) => sum + item.quantity, 0);
  if (result.length && total > quantity) fail(`OFFER_LINE_${lineIndex}_BENEFICIARY_QUANTITY_EXCEEDS_LINE`);
  return result;
}

export function summarizeR6OfferLines(lines) {
  if (!Array.isArray(lines) || !lines.length) fail("OFFER_LINES_REQUIRED");
  const listGrossMinor = lines.reduce((sum, line) => sum + integer(line.listGrossMinor, "OFFER_LIST_GROSS_INVALID"), 0);
  const specialGrossMinor = lines.reduce((sum, line) => sum + integer(line.specialGrossMinor, "OFFER_SPECIAL_GROSS_INVALID"), 0);
  const discount = calculateDiscount(listGrossMinor, specialGrossMinor);
  const vatMinor = lines.reduce((sum, line) => sum + integer(line.vatMinor, "OFFER_VAT_INVALID"), 0);
  const netMinor = lines.reduce((sum, line) => sum + integer(line.netMinor, "OFFER_NET_INVALID"), 0);
  if (netMinor + vatMinor !== specialGrossMinor) fail("OFFER_VAT_TOTAL_MISMATCH");
  return { listGrossMinor, specialGrossMinor, discountMinor: discount.discountMinor, discountPercentBps: discount.discountPercentBps, netMinor, vatMinor };
}

export function assertR6OfferStatusTransition(current, next) {
  const from = normalizeOfferStatus(current);
  const to = normalizeOfferStatus(next);
  if (from === to) return to;
  const allowed = {
    DRAFT: new Set(["SENT", "CANCELLED"]),
    SENT: new Set(["ACCEPTED", "CANCELLED", "EXPIRED"]),
    ACCEPTED: new Set(),
    CANCELLED: new Set(),
    EXPIRED: new Set(),
  };
  if (!allowed[from].has(to)) fail("OFFER_STATUS_TRANSITION_INVALID", 409);
  return to;
}

export function assertR6OfferExpiry(expiresAt, now = new Date()) {
  if (expiresAt == null || expiresAt === "") return null;
  const date = expiresAt instanceof Date ? new Date(expiresAt.getTime()) : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) fail("OFFER_EXPIRY_INVALID");
  if (date.getTime() <= new Date(now).getTime()) fail("OFFER_EXPIRED", 409);
  return date;
}

export function normalizeR6OfferTokenForLookup(token) {
  const value = String(token || "").trim();
  if (value.length < 24 || value.length > 256) fail("OFFER_TOKEN_INVALID", 401);
  return value;
}

export const R6_OFFER_MAX_SAFE = MAX_SAFE;
