import assert from "node:assert/strict";
import fs from "node:fs";
import { createTrustedRefundEvidenceToken, verifyTrustedRefundEvidenceToken } from "../src/server/payments/refund-adapter.js";

process.env.REFUND_EVIDENCE_SECRET = "r96d6c-disposable-contract-secret";
const payload = {
  requestId: "3e8f1a8a-3a0c-4a78-8d8e-48bbf120c1d1",
  provider: "PAYTR",
  providerReference: "server-ref-1",
  providerTransactionId: "server-tx-1",
  verificationReference: "callback-1",
  amountMinor: 125000,
  currency: "TRY",
  expiresAt: Date.now() + 60_000,
};
const token = createTrustedRefundEvidenceToken(payload);
const expected = { requestId: payload.requestId, expectedAmountMinor: payload.amountMinor, currency: payload.currency, provider: payload.provider };
assert.deepEqual(verifyTrustedRefundEvidenceToken(token, expected), payload);
assert.throws(() => verifyTrustedRefundEvidenceToken(`${token}tampered`, expected), /REFUND_PROVIDER_EVIDENCE_INVALID/u);
assert.throws(() => verifyTrustedRefundEvidenceToken("plain-reference", expected), /REFUND_PROVIDER_EVIDENCE_REQUIRED/u);
const route = fs.readFileSync("api/admin/order-refunds.js", "utf8");
assert.match(route, /verifyTrustedRefundEvidenceToken/u);
assert.match(route, /OWNER_ONLY/u);
const ui = fs.readFileSync("src/platform/admin/OwnerRefundWorkspacePage.tsx", "utf8");
assert.match(ui, /providerEvidenceToken/u);
assert.match(ui, /REFUNDED|Provider kanıtı doğrulandı/u);
console.log(JSON.stringify({ OWNER_REFUND_PERMISSION: "PASS", TRUSTED_EVIDENCE_SIGNATURE: "PASS", UI_ROUTE_CONTRACT: "PASS" }));
