import assert from "node:assert/strict";
import {
  allocatePackageDiscount,
  calculateDiscount,
  calculatePayableAt,
  calculatePayableAtIso,
  calculateTeacherPayout,
  calculateVatIncluded,
} from "../src/server/domain/commercial-calculations.js";

const vat0 = calculateVatIncluded(125_000, 0);
assert.deepEqual(vat0, { grossMinor: 125_000, netMinor: 125_000, vatMinor: 0, vatRateBps: 0 });
const vat20 = calculateVatIncluded(4_500_00, 2_000);
assert.equal(vat20.netMinor + vat20.vatMinor, 4_500_00);
assert.equal(vat20.netMinor, 3_750_00);
assert.equal(vat20.vatMinor, 750_00);

const discount = calculateDiscount(1_000_00, 875_00);
assert.equal(discount.discountMinor, 125_00);
assert.equal(discount.discountPercentBps, 1_250);
assert.equal(discount.discountPercentage, "12.50");

const allocation = allocatePackageDiscount({
  packageGrossMinor: 1_700_000,
  lines: [
    { id: "book", productType: "BOOK", listGrossMinor: 125_000, vatRateBps: 0 },
    { id: "software", productType: "SOFTWARE", listGrossMinor: 450_000, vatRateBps: 2_000 },
    { id: "training", productType: "TRAINING_SERVICE", listGrossMinor: 1_200_000, vatRateBps: 2_000 },
  ],
});
assert.equal(allocation.listGrossMinor, 1_775_000);
assert.equal(allocation.discountMinor, 75_000);
assert.equal(allocation.lines.reduce((sum, line) => sum + line.saleGrossMinor, 0), 1_700_000);
assert.equal(allocation.lines.find((line) => line.id === "book").discountMinor, 0);
assert.equal(allocation.lines.reduce((sum, line) => sum + line.netMinor + line.vatMinor, 0), 1_700_000);

const forcedBookDiscount = allocatePackageDiscount([
  { id: "book", productType: "BOOK", listGrossMinor: 125_000, vatRateBps: 0 },
  { id: "software", productType: "SOFTWARE", listGrossMinor: 50_000, vatRateBps: 2_000 },
], 100_000);
assert.equal(forcedBookDiscount.lines.reduce((sum, line) => sum + line.saleGrossMinor, 0), 100_000);
assert.ok(forcedBookDiscount.lines.find((line) => line.id === "book").discountMinor > 0);

const fast = [500_000, 575_000, 675_000, 775_000, 875_000];
const paragraph = [450_000, 525_000, 625_000, 725_000, 825_000];
for (let count = 1; count <= 5; count += 1) {
  assert.equal(calculateTeacherPayout("FAST_READING", count), fast[count - 1]);
  assert.equal(calculateTeacherPayout("PARAGRAPH", count), paragraph[count - 1]);
}

assert.equal(calculatePayableAtIso("2024-02-10T12:00:00.000Z"), "2024-02-29T23:59:59.999Z");
assert.equal(calculatePayableAt("2026-04-01T00:00:00.000Z").toISOString(), "2026-04-30T23:59:59.999Z");

console.log(JSON.stringify({
  VAT_INCLUDED_CALCULATION: "PASS",
  PACKAGE_DISCOUNT_SUM_EXACT: "PASS",
  PACKAGE_LINE_SUM_EQUALS_PACKAGE_TOTAL: "PASS",
  PAYOUT_MATRIX_FAST_1_TO_5: "PASS",
  PAYOUT_MATRIX_PARAGRAPH_1_TO_5: "PASS",
  MONTH_END_PAYABLE: "PASS",
  DATABASE_MUTATION: "NO",
  WRITES: "NONE",
}));

