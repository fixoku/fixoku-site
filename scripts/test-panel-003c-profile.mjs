import assert from "node:assert/strict";
import { normalizeIban, validIban } from "../api/trainer/payout-account.js";
import { getProfileMediaConfig, parsePhotoDataUrl } from "../src/server/domain/profile-media.js";
import { resolvePrivateStoragePath } from "../src/server/domain/digital-delivery.js";

assert.equal(normalizeIban("tr33 0006 1005 1978 6457 8413 26"), "TR330006100519786457841326");
assert.equal(validIban("TR330006100519786457841326"), true);
assert.equal(validIban("TR000000000000000000000000"), false);
assert.equal(getProfileMediaConfig({ PROFILE_MEDIA_PROVIDER: "LOCAL", PROFILE_MEDIA_ROOT: "C:/fixoku-profile-media" }).enabled, true);
assert.equal(getProfileMediaConfig({ PROFILE_MEDIA_PROVIDER: "DISABLED" }).enabled, false);
assert.equal(parsePhotoDataUrl("data:image/png;base64,aGVsbG8=").mime, "image/png");
assert.equal(parsePhotoDataUrl("data:text/plain;base64,aGVsbG8="), null);
assert.equal(resolvePrivateStoragePath("C:/fixoku-profile-media", "../secret"), null);
console.log("Panel 003C profile contract tests passed: IBAN checksum, profile media gate, data URL validation, path containment.");
