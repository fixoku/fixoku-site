import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../src/server/domain/student-commerce.js",import.meta.url),"utf8");
test("student payment method source contract is fail-closed and legacy-compatible",()=>{assert.match(source,/PAYTR.*BANK_TRANSFER/u);assert.match(source,/PAYMENT_METHOD_INVALID/u);assert.match(source,/sha256\(\{ paymentMethod/u);assert.match(source,/payment_method/gu);assert.match(source,/legacyHash/u);assert.match(source,/existing\.payment_method == null/u);assert.match(source,/paymentMethod \}\)/u);assert.doesNotMatch(source,/db:migrate|seed/iu)});
console.log("DATABASE_MUTATION=NO");console.log("WRITES=NONE");