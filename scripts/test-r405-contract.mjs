import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { paytrRuntime } from "../src/server/payments/paytr.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const studentEndpoint = read("api/student/bank-transfer.js");
const trainerEndpoint = read("api/trainer/bank-transfer.js");
const studentOrders = read("api/student/orders.js");
const studentCheckout = read("src/platform/student/StudentCheckoutPage.tsx");
const trainerCheckout = read("src/platform/trainer/commerce/TrainerCheckoutPage.tsx");
const bankPayment = read("src/platform/commerce/BankTransferPayment.tsx");
const trainerShipments = read("src/platform/trainer/commerce/TrainerShipmentsPage.tsx");
const migration = read("drizzle/controlled-migrations/r405/R405_01_BANK_TRANSFER_NOTIFICATIONS.sql");

assert.match(studentOrders, /BANK_TRANSFER_NOTIFICATION_REQUIRED/u);
assert.match(studentEndpoint, /createStudentCommerceOrder\([^\n]+manageTransaction:\s*false/u);
assert.match(studentEndpoint, /student_bank_transfer_notifications/u);
assert.match(studentEndpoint, /on conflict\(order_id\)/u);
assert.match(trainerEndpoint, /createTrainerOrder\([^\n]+manageTransaction:false/u);
assert.match(trainerEndpoint, /trainer_bank_transfer_notifications/u);
assert.match(studentCheckout, /Bildirim gönderilmeden sipariş ve muhasebe kaydı oluşturulmaz/u);
assert.match(trainerCheckout, /Bildirim gönderilmeden sipariş kaydı oluşturulmaz/u);
assert.doesNotMatch(studentCheckout, /Makbuz referansı/u);
assert.doesNotMatch(trainerCheckout, /Makbuz referansı/u);
assert.match(bankPayment, /detailsVisible/u);
assert.match(trainerShipments, /Henüz kargonuz bulunmuyor/u);
assert.match(trainerShipments, /gönderi ve takip bilgilerinizi/u);
assert.match(migration, /student_bank_transfer_notifications/u);
assert.match(migration, /status public\.bank_transfer_status/u);
assert.match(migration, /reported_amount_minor/u);

const testEnv = { PAYTR_ENABLED: "1", PAYTR_MERCHANT_ID: "mid", PAYTR_MERCHANT_KEY: "key", PAYTR_MERCHANT_SALT: "salt", PAYTR_TEST_MODE: "1" };
assert.equal(paytrRuntime(testEnv).configured, true);
assert.equal(paytrRuntime({ ...testEnv, PAYTR_TEST_MODE: "0" }).configured, false);
const liveEnv = {
  ...testEnv,
  PAYTR_TEST_MODE: "0",
  PAYTR_LIVE_APPROVED: "1",
  PAYTR_LIVE_RUNTIME_VERIFIED: "1",
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  APP_ORIGIN: "https://fixoku.com",
  BETTER_AUTH_URL: "https://fixoku.com",
  PAYTR_OK_URL: "https://fixoku.com/api/paytr/return-success",
  PAYTR_FAIL_URL: "https://fixoku.com/api/paytr/return-failure",
  PAYTR_CALLBACK_URL: "https://fixoku.com/api/paytr/callback"
};

assert.equal(paytrRuntime(liveEnv).liveReady, true);
assert.equal(paytrRuntime({ ...liveEnv, VERCEL_ENV: "preview" }).liveReady, false);
assert.equal(paytrRuntime({ ...liveEnv, PAYTR_CALLBACK_URL: "" }).liveReady, false);
assert.equal(paytrRuntime({ ...liveEnv, PAYTR_LIVE_APPROVED: "0" }).liveReady, false);
assert.equal(paytrRuntime({ ...liveEnv, PAYTR_LIVE_RUNTIME_VERIFIED: "0" }).liveReady, false);
assert.equal(paytrRuntime({ ...liveEnv, PAYTR_TEST_MODE: "2" }).liveReady, false);

console.log(JSON.stringify({
  R405_BANK_ORDER_DEFERRED: "PASS",
  R405_STUDENT_NOTIFICATION_ATOMIC: "PASS",
  R405_TRAINER_NOTIFICATION_ATOMIC: "PASS",
  R405_RECEIPT_FIELD_REMOVED_FROM_USER_FORMS: "PASS",
  R405_TRAINER_SHIPPING_EMPTY_STATE: "PASS",
  R405_PAYTR_TEST_LIVE_SEPARATION: "PASS",
  DATABASE_RUNTIME: "NOT_RUN",
  BROWSER_RUNTIME: "NOT_RUN",
}));
