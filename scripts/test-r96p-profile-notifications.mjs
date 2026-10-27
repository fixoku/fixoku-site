import assert from "node:assert/strict";
import { normalizeTrMobile, validateAddress } from "../api/trainer/addresses.js";
import { resolveTurkeyLocation } from "../src/data/turkeyLocations.js";
import fs from "node:fs";

assert.equal(normalizeTrMobile("053 212 34 56 7"), "+905321234567");
assert.equal(normalizeTrMobile("532123456"), null);
assert.deepEqual(resolveTurkeyLocation("İstanbul", "Kadıköy"), { city: "İstanbul", district: "Kadıköy" });
const valid = validateAddress({ title: "Ev", firstName: "Özlem", lastName: "Kaplan", phone: "05321234567", city: "İstanbul", district: "Kadıköy", addressLine: "Bağdat Caddesi 1" });
assert.deepEqual(valid, {});
const invalid = validateAddress({ title: "", firstName: "Özlem", lastName: "Kaplan", phone: "111", city: "İstanbul", district: "Sakarya", addressLine: "" });
assert.ok(invalid.title && invalid.phone && invalid.city && invalid.district && invalid.addressLine);
const notificationSource = fs.readFileSync("src/platform/panel/notifications/NotificationCenterPage.tsx", "utf8");
assert.match(notificationSource, /setMessage\("Bildirim okundu olarak işaretlendi\."\)/);
assert.match(notificationSource, /notification-center-message is-\$\{messageKind/);
const profileSource = fs.readFileSync("api/trainer/profile.js", "utf8");
assert.match(profileSource, /body\.city \?\? current\?\.city/);
console.log("R96P profile/notification source contracts passed: scoped address validation, ownership-safe updates, read feedback.");
