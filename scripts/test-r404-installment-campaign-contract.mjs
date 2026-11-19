import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const migration = read("drizzle/controlled-migrations/r404/R404_04_INSTALLMENT_CAMPAIGN_SETTINGS.sql");
const manifest = JSON.parse(read("drizzle/controlled-migrations/r404/manifest.json"));
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.installment_campaign_settings/);
assert.match(migration, /DEFAULT 'Tüm Kredi Kartlarınıza Vade Farksız 2 Taksit'/);
assert.match(migration, /DEFAULT false/);
assert.match(migration, /color IN \('green','blue','peach','purple'\)/);
assert.match(migration, /ON CONFLICT \(id\) DO NOTHING/);
assert.deepEqual(manifest.executionOrder, [
  "R404_01_PAYTR_PAYMENT_ATTEMPTS.sql",
  "R404_02_PAYTR_TOKEN_LEASES_AND_INTEGRITY.sql",
  "R404_03_SHIPMENT_DISPATCH_IDEMPOTENCY.sql",
  "R404_04_INSTALLMENT_CAMPAIGN_SETTINGS.sql",
]);
assert.equal(manifest.automaticExecution, false);
assert.equal(manifest.productionApproved, false);

const ownerApi = read("api/owner/installment-campaign.js");
const publicApi = read("api/public/installment-campaign.js");
assert.match(ownerApi, /requireMembership\(principal,"OWNER"\)/);
assert.match(ownerApi, /insert into installment_campaign_settings/);
assert.ok(ownerApi.includes('campaign_text as \\"text\\"'));
assert.match(ownerApi, /CAMPAIGN_COLOR_INVALID/);
assert.match(publicApi, /where id=1/);
assert.match(publicApi, /row\?\.active\?\{text:row\.text/);

const sourceFiles = [
  "src/pages/EducationPackagesPage.jsx",
  "src/platform/student/StudentPackagesPage.tsx",
  "src/platform/student/StudentCartPage.tsx",
  "src/platform/trainer/trainings/TrainerTrainingsPage.tsx",
  "src/platform/trainer/commerce/TrainerCartPage.tsx",
  "src/platform/commerce/PaytrCheckout.jsx",
];
for (const file of sourceFiles) assert.match(read(file), /InstallmentCampaignBanner/);
assert.match(read("src/platform/admin/OwnerInstallmentCampaignPage.tsx"), /campaign=\{form\}/);
assert.match(read("src/AppRoutes.jsx"), /\/panel\/owner\/taksit-kampanyasi/);
assert.match(read("src/platform/panel/layout/PanelSidebar.tsx"), /Taksit Kampanyası/);
assert.doesNotMatch(read("src/platform/commerce/PaytrCheckout.jsx"), /amountMinor.*campaign/);

const hashes = {};
for (const file of [
  "drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql",
  "drizzle/controlled-migrations/r404/R404_02_PAYTR_TOKEN_LEASES_AND_INTEGRITY.sql",
  "drizzle/controlled-migrations/r404/R404_03_SHIPMENT_DISPATCH_IDEMPOTENCY.sql",
]) hashes[file] = crypto.createHash("sha256").update(read(file)).digest("hex");
fs.writeFileSync(new URL("../R404_CAMPAIGN_CHAIN_SHA256.json", import.meta.url), JSON.stringify(hashes, null, 2) + "\n");
console.log(JSON.stringify({ result: "PASS", files: sourceFiles.length, chain: hashes }, null, 2));

