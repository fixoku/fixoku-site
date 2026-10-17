// FIXOKU V41B - approved STUDENT catalog projection, NO DB changes.
// SKUs are mapped to the real IDs from the 2026-10-09 read-only V41A report.
// Existing records remain intact. Historical package/sale relationships remain intact.
export type CatalogV41Target = { name: string; stage: string; kind: string; approvedGrossMinor: number; priceRole: "RETAIL" | "PACKAGE_ALLOCATION"; vatRateBps: number };
export const approvedStudentCatalogV41: Record<string,CatalogV41Target> = {
  "FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA": {name: "İlkokul Akıcı ve Hızlı Okuma Kitabı", stage: "PRIMARY", kind: "BOOK", approvedGrossMinor: 55000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI": {name: "İlkokul Zihin Egzersizleri Kitabı", stage: "PRIMARY", kind: "BOOK", approvedGrossMinor: 50000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-MIDDLE-HIZLI-OKUMA": {name: "Ortaokul Hızlı Okuma Kitabı", stage: "MIDDLE", kind: "BOOK", approvedGrossMinor: 55000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI": {name: "Ortaokul Zihin Egzersizleri Kitabı", stage: "MIDDLE", kind: "BOOK", approvedGrossMinor: 50000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-HIGH-HIZLI-OKUMA": {name: "Lise Hızlı Okuma Kitabı", stage: "HIGH", kind: "BOOK", approvedGrossMinor: 55000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-ADULT-HIZLI-OKUMA": {name: "Yetişkin Hızlı Okuma Kitabı", stage: "ADULT", kind: "BOOK", approvedGrossMinor: 55000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-STUDENT-ORTAOKUL-PARAGRAF": {name: "Ortaokul Paragraf Kitabı", stage: "MIDDLE", kind: "BOOK", approvedGrossMinor: 55000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-STUDENT-LISE-PARAGRAF": {name: "Lise Paragraf Kitabı", stage: "HIGH", kind: "BOOK", approvedGrossMinor: 55000, priceRole: "RETAIL", vatRateBps: 0},
  "FIXOKU-STUDENT-YAPAY-ZEKA": {name: "Fixoku Yapay Zekâ Destekli Yazılım", stage: "ALL", kind: "SOFTWARE", approvedGrossMinor: 350000, priceRole: "RETAIL", vatRateBps: 2000},
  "FIXOKU-TRAINING-PRIMARY-FAST-GROUP": {name: "İlkokul Küçük Grup Eğitimi", stage: "PRIMARY", kind: "SERVICE", approvedGrossMinor: 744000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-PRIMARY-FAST-INDIVIDUAL": {name: "İlkokul Birebir Eğitimi", stage: "PRIMARY", kind: "SERVICE", approvedGrossMinor: 1144000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-MIDDLE-FAST-GROUP": {name: "Ortaokul Küçük Grup Eğitimi", stage: "MIDDLE", kind: "SERVICE", approvedGrossMinor: 744000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-MIDDLE-FAST-INDIVIDUAL": {name: "Ortaokul Birebir Eğitimi", stage: "MIDDLE", kind: "SERVICE", approvedGrossMinor: 1144000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-HIGH-FAST-GROUP": {name: "Lise Küçük Grup Eğitimi", stage: "HIGH", kind: "SERVICE", approvedGrossMinor: 794000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-HIGH-FAST-INDIVIDUAL": {name: "Lise Birebir Eğitimi", stage: "HIGH", kind: "SERVICE", approvedGrossMinor: 1194000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-ADULT-FAST-GROUP": {name: "Yetişkin Küçük Grup Eğitimi", stage: "ADULT", kind: "SERVICE", approvedGrossMinor: 794000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-ADULT-FAST-INDIVIDUAL": {name: "Yetişkin Birebir Eğitimi", stage: "ADULT", kind: "SERVICE", approvedGrossMinor: 1194000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-MIDDLE-PARAGRAPH-INDIVIDUAL": {name: "Ortaokul Paragraf Birebir Eğitimi", stage: "MIDDLE", kind: "SERVICE", approvedGrossMinor: 840000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
  "FIXOKU-TRAINING-HIGH-PARAGRAPH-INDIVIDUAL": {name: "Lise Paragraf Birebir Eğitimi", stage: "HIGH", kind: "SERVICE", approvedGrossMinor: 940000, priceRole: "PACKAGE_ALLOCATION", vatRateBps: 2000},
};
export const isApprovedStudentSkuV41 = (sku: string): boolean => Object.prototype.hasOwnProperty.call(approvedStudentCatalogV41, sku);
export const approvedCatalogCountV41 = Object.keys(approvedStudentCatalogV41).length;
