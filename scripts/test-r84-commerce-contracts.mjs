import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const studentAdmin = read("api/admin/student-commerce-packages.js");
const auth = read("src/server/auth/authorization.js");
const paytrToken = read("api/paytr/token.js");
const paytrCallback = read("api/paytr/callback.js");
const commerce = read("src/server/domain/commerce.js");
const trainerCommerce = read("src/server/domain/trainer-commerce.js");
const trainerBankAdmin = read("api/admin/trainer-bank-transfers.js");
const studentAdminUi = read("src/platform/admin/AdminStudentCommercePage.tsx");

assert.doesNotMatch(auth, /action === "create"/u);
assert.match(studentAdmin, /PACKAGE_CREATION_FORBIDDEN/u);
assert.doesNotMatch(studentAdmin, /student_commerce\.package\.created/u);
assert.match(studentAdmin, /version\.status !== "DRAFT"/u);
assert.match(studentAdmin, /PUBLISHED_VERSION_IMMUTABLE/u);
assert.match(studentAdminUi, /Yeni paket oluşturma yetkisi kapalıdır/u);

assert.match(paytrToken, /o\.payment_method='PAYTR'/u);
assert.match(paytrCallback, /payment_method='PAYTR'/u);
assert.match(commerce, /provider === "PAYTR" && order\.payment_method !== "PAYTR"/u);
assert.match(trainerCommerce, /provider === "PAYTR" && order\.payment_method !== "PAYTR"/u);
assert.match(trainerBankAdmin, /BANK_TRANSFER_ALREADY_APPROVED/u);
assert.match(trainerBankAdmin, /duplicateApproval: true/u);
assert.match(trainerBankAdmin, /row\.currency/u);

console.log(JSON.stringify({
  OWNER_STUDENT_PACKAGE_CREATE_DRAFT: "PASS_EXISTING_CATALOG_VERSION_FLOW",
  PUBLISHED_VERSION_IMMUTABLE: "PRESERVED",
  PAYTR_ORDER_METHOD_GATE: "PASS",
  PAYTR_CALLBACK_METHOD_GATE: "PASS",
  TRAINER_BANK_APPROVAL_IDEMPOTENCY: "PASS",
  TRAINER_BANK_REJECT_AFTER_APPROVAL: "BLOCKED",
  DATABASE_MUTATION: "NO",
  EXTERNAL_PROVIDER_IO: "NOT_USED",
}));
