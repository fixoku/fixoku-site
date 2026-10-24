import assert from "node:assert/strict";
import fs from "node:fs";

const topbar = fs.readFileSync("src/platform/panel/layout/PanelTopbar.tsx", "utf8");
const studentPackages = fs.readFileSync("src/platform/student/StudentPackagesPage.tsx", "utf8");
const trainerTrainings = fs.readFileSync("src/platform/trainer/trainings/TrainerTrainingsPage.tsx", "utf8");
const studentCart = fs.readFileSync("src/platform/student/StudentCartPage.tsx", "utf8");
const trainerCart = fs.readFileSync("src/platform/trainer/commerce/TrainerCartPage.tsx", "utf8");
const studentCheckout = fs.readFileSync("src/platform/student/StudentCheckoutPage.tsx", "utf8");
const trainerCheckout = fs.readFileSync("src/platform/trainer/commerce/TrainerCheckoutPage.tsx", "utf8");

assert.match(topbar, /`\/api\/student\/cart\$\{studentQuery\}`/u);
assert.match(topbar, /"\/api\/trainer\/cart"/u);
assert.match(topbar, /uniqueCount: Number\(data\.uniqueCount/u);
assert.match(topbar, /fixoku:student-cart-updated/u);
assert.match(topbar, /fixoku:trainer-cart-updated/u);
assert.match(studentPackages, /fetch\("\/api\/student\/cart"/u);
assert.match(studentPackages, /fixoku:student-cart-updated/u);
assert.match(studentPackages, /panel\/ogrenci\/sepet/u);
assert.match(trainerTrainings, /fetch\("\/api\/trainer\/cart"/u);
assert.match(trainerTrainings, /fixoku:trainer-cart-updated/u);
assert.match(trainerTrainings, /panel\/egitmen\/sepet/u);
assert.match(studentCart, /api\/student\/cart/u);
assert.match(trainerCart, /api\/trainer\/cart/u);
assert.match(studentCheckout, /Havale|EFT/u);
assert.match(trainerCheckout, /Havale|EFT/u);

console.log(JSON.stringify({
  STUDENT_CART_REQUEST_AND_ROUTE: "PASS_SOURCE_CONTRACT",
  TRAINER_CART_REQUEST_AND_ROUTE: "PASS_SOURCE_CONTRACT",
  HEADER_BADGE_REAL_CART_API: "PASS_SOURCE_CONTRACT",
  CHECKOUT_BANK_TRANSFER_LINK: "PASS_SOURCE_CONTRACT",
  DATABASE_WRITE: "NO",
}));
