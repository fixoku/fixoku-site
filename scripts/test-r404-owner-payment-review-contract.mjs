import assert from "node:assert/strict";
import fs from "node:fs";

const finance = fs.readFileSync(new URL("../api/admin/finance.js", import.meta.url), "utf8");
const auth = fs.readFileSync(new URL("../src/server/auth/authorization.js", import.meta.url), "utf8");
const studentOrders = fs.readFileSync(new URL("../api/student/orders.js", import.meta.url), "utf8");
const trainerOrders = fs.readFileSync(new URL("../api/trainer/orders.js", import.meta.url), "utf8");
for (const token of ["paytrAttempts", "orderKind", "orderAmountMinor", "collectedAmountMinor", "installmentDifferenceMinor", "reviewRequired"]) assert.match(finance, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "u"));
assert.match(auth, /finance\.read/u);
assert.match(auth, /finance\.adjust/u);
assert.match(studentOrders, /buyer_user_id=\$2/u);
assert.match(trainerOrders, /trainer_user_id=\$1/u);
assert.doesNotMatch(finance, /token_ciphertext|token_iv|merchant_key|merchant_salt/u);
console.log(JSON.stringify({ OWNER_PAYMENT_REVIEW_FIELDS: "PASS", OWNER_FINANCE_PERMISSION: "PASS", STUDENT_ORDER_SCOPE_GUARD: "PASS", TRAINER_ORDER_SCOPE_GUARD: "PASS", SENSITIVE_PAYTR_DATA_HIDDEN: "PASS" }));
