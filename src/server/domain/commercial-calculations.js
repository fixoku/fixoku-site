/*
 * R6 commercial calculation authority.
 *
 * This module is intentionally DB-free.  Callers provide canonical product
 * data (including VAT) and persist the returned integer-minor-unit snapshots
 * alongside their order/package records.  No floating-point arithmetic is
 * used for money or rates.
 */

const BASIS_POINTS = 10_000n;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function assertSafeInteger(value, name, { min = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < min) throw new RangeError(`${name}_INVALID`);
  return value;
}

function assertBasisPoints(value, name = "VAT_RATE_BPS") {
  return assertSafeInteger(value, name, { min: 0 }) <= 10_000 ? value : (() => { throw new RangeError(`${name}_INVALID`); })();
}

function toBigInt(value, name, options) {
  return BigInt(assertSafeInteger(value, name, options));
}

function fromBigInt(value, name) {
  if (value < 0n || value > MAX_SAFE) throw new RangeError(`${name}_OVERFLOW`);
  return Number(value);
}

function formatPercentBps(percentBps) {
  const whole = Math.floor(percentBps / 100);
  const fraction = String(percentBps % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/**
 * Splits a VAT-included gross amount into VAT-exclusive net and VAT.
 * Rounding is deterministic: net is floored and VAT is the exact remainder,
 * so net + VAT always equals the supplied gross amount.
 */
export function calculateVatIncluded(grossMinor, vatBps) {
  const gross = toBigInt(grossMinor, "GROSS_MINOR");
  const rate = BigInt(assertBasisPoints(vatBps));
  const net = (gross * BASIS_POINTS) / (BASIS_POINTS + rate);
  const vat = gross - net;
  return {
    grossMinor: fromBigInt(gross, "GROSS_MINOR"),
    netMinor: fromBigInt(net, "NET_MINOR"),
    vatMinor: fromBigInt(vat, "VAT_MINOR"),
    vatRateBps: Number(rate),
  };
}

export const calculateVatIncludedBreakdown = calculateVatIncluded;

/** Returns an integer discount plus a presentation-safe percentage string. */
export function calculateDiscount(listGrossMinor, saleGrossMinor) {
  const list = toBigInt(listGrossMinor, "LIST_GROSS_MINOR");
  const sale = toBigInt(saleGrossMinor, "SALE_GROSS_MINOR");
  if (sale > list) throw new RangeError("SALE_GROSS_EXCEEDS_LIST_GROSS");
  const discount = list - sale;
  const percentBps = list === 0n ? 0n : (discount * BASIS_POINTS + list / 2n) / list;
  const discountPercentBps = fromBigInt(percentBps, "DISCOUNT_PERCENT_BPS");
  return {
    listGrossMinor: fromBigInt(list, "LIST_GROSS_MINOR"),
    saleGrossMinor: fromBigInt(sale, "SALE_GROSS_MINOR"),
    discountMinor: fromBigInt(discount, "DISCOUNT_MINOR"),
    discountPercentBps,
    discountPercentageBps: discountPercentBps,
    discountPercentage: formatPercentBps(discountPercentBps),
  };
}

export const calculateDiscountSnapshot = calculateDiscount;

function normalizeAllocationInput(input, packageGrossMinor) {
  if (Array.isArray(input)) return { lines: input, packageGrossMinor };
  return { lines: input?.lines, packageGrossMinor: input?.packageGrossMinor ?? packageGrossMinor };
}

function normalizeLine(line, index) {
  if (!line || typeof line !== "object") throw new TypeError(`PACKAGE_LINE_${index}_INVALID`);
  const quantity = assertSafeInteger(line.quantity ?? 1, `PACKAGE_LINE_${index}_QUANTITY`, { min: 1 });
  const unitList = line.unitListGrossMinor ?? line.unitGrossMinor;
  let listGrossMinor = line.listGrossMinor ?? line.lineListGrossMinor;
  if (listGrossMinor === undefined && unitList !== undefined) {
    listGrossMinor = fromBigInt(toBigInt(unitList, `PACKAGE_LINE_${index}_UNIT_LIST_GROSS_MINOR`) * BigInt(quantity), `PACKAGE_LINE_${index}_LIST_GROSS_MINOR`);
  }
  listGrossMinor = assertSafeInteger(listGrossMinor, `PACKAGE_LINE_${index}_LIST_GROSS_MINOR`, { min: 0 });
  const productType = String(line.productType ?? line.type ?? line.componentType ?? "").trim().toUpperCase();
  const vatRateBps = line.vatRateBps === undefined || line.vatRateBps === null ? 0 : assertBasisPoints(Number(line.vatRateBps), `PACKAGE_LINE_${index}_VAT_RATE_BPS`);
  return { ...line, _index: index, quantity, listGrossMinor, productType, vatRateBps };
}

function allocateTier(lines, discounts, eligible, requested) {
  if (requested <= 0 || !eligible.length) return 0;
  const capacities = eligible.map((index) => lines[index].listGrossMinor - discounts[index]);
  const capacityTotal = capacities.reduce((sum, value) => sum + value, 0);
  const target = Math.min(requested, capacityTotal);
  if (!target) return 0;

  const targetBig = BigInt(target);
  const capacityBig = BigInt(capacityTotal);
  const parts = capacities.map((capacity, offset) => {
    const numerator = targetBig * BigInt(capacity);
    return { index: eligible[offset], base: numerator / capacityBig, remainder: numerator % capacityBig };
  });
  let allocated = parts.reduce((sum, part) => sum + Number(part.base), 0);
  let remainder = target - allocated;
  // Largest remainder, then source order: deterministic and exact.
  parts.sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const part of parts) {
    const add = remainder > 0 ? 1 : 0;
    discounts[part.index] += Number(part.base) + add;
    if (add) remainder -= 1;
  }
  allocated = target;
  return allocated;
}

/**
 * Allocates a package discount over component lines.  SOFTWARE and
 * TRAINING_SERVICE/SERVICE lines receive the discount first; BOOK/PHYSICAL
 * lines are touched only when the requested package gross requires it.
 */
export function allocatePackageDiscount(input, packageGrossMinor) {
  const normalized = normalizeAllocationInput(input, packageGrossMinor);
  if (!Array.isArray(normalized.lines) || normalized.lines.length === 0) throw new RangeError("PACKAGE_LINES_REQUIRED");
  const lines = normalized.lines.map(normalizeLine);
  const listGross = lines.reduce((sum, line) => sum + line.listGrossMinor, 0);
  assertSafeInteger(listGross, "PACKAGE_LIST_GROSS_MINOR", { min: 0 });
  const packageGross = assertSafeInteger(normalized.packageGrossMinor, "PACKAGE_GROSS_MINOR", { min: 0 });
  if (packageGross > listGross) throw new RangeError("PACKAGE_GROSS_EXCEEDS_LIST_GROSS");

  const discounts = lines.map(() => 0);
  let remaining = listGross - packageGross;
  const priority = lines.map((line, index) => (['SOFTWARE', 'TRAINING_SERVICE', 'SERVICE'].includes(line.productType) ? index : -1)).filter((index) => index >= 0);
  remaining -= allocateTier(lines, discounts, priority, remaining);
  if (remaining > 0) remaining -= allocateTier(lines, discounts, lines.map((_, index) => index), remaining);
  if (remaining !== 0) throw new Error("PACKAGE_DISCOUNT_ALLOCATION_FAILED");

  const allocatedLines = lines.map((line, index) => {
    const saleGross = line.listGrossMinor - discounts[index];
    const vat = calculateVatIncluded(saleGross, line.vatRateBps);
    return {
      ...line,
      id: line.id ?? line.lineId ?? null,
      listGrossMinor: line.listGrossMinor,
      saleGrossMinor: saleGross,
      effectiveSaleGrossMinor: saleGross,
      discountMinor: discounts[index],
      vatRateBps: line.vatRateBps,
      netMinor: vat.netMinor,
      vatMinor: vat.vatMinor,
    };
  });
  const saleSum = allocatedLines.reduce((sum, line) => sum + line.saleGrossMinor, 0);
  if (saleSum !== packageGross) throw new Error("PACKAGE_LINE_SUM_MISMATCH");
  return {
    lines: allocatedLines,
    listGrossMinor: listGross,
    packageGrossMinor: packageGross,
    discountMinor: listGross - packageGross,
    discount: calculateDiscount(listGross, packageGross),
  };
}

const PAYOUT_MATRIX = Object.freeze({
  FAST_READING: Object.freeze([500_000, 575_000, 675_000, 775_000, 875_000]),
  PARAGRAPH: Object.freeze([450_000, 525_000, 625_000, 725_000, 825_000]),
});

function normalizeTrainingType(value) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/[\s-]+/gu, "_");
  if (normalized === "FAST" || normalized === "FASTREADING" || normalized === "FAST_READING") return "FAST_READING";
  if (normalized === "PARAGRAPH") return "PARAGRAPH";
  throw new RangeError("TRAINING_TYPE_INVALID");
}

export function calculateTeacherPayout(trainingType, studentCount) {
  const type = normalizeTrainingType(trainingType);
  const count = assertSafeInteger(Number(studentCount), "STUDENT_COUNT", { min: 1 });
  const amount = PAYOUT_MATRIX[type][count - 1];
  if (amount === undefined) throw new RangeError("STUDENT_COUNT_OUT_OF_RANGE");
  return amount;
}

export const calculateTeacherPayoutMinor = calculateTeacherPayout;
export const TEACHER_PAYOUT_MATRIX = PAYOUT_MATRIX;

/** Returns a UTC Date at 23:59:59.999 on the completion monthâ€™s final day. */
export function calculatePayableAt(completedAt) {
  const date = completedAt instanceof Date ? new Date(completedAt.getTime()) : new Date(completedAt);
  if (Number.isNaN(date.getTime())) throw new RangeError("COMPLETED_AT_INVALID");
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function calculatePayableAtIso(completedAt) {
  return calculatePayableAt(completedAt).toISOString();
}
