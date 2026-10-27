/* global process, Buffer */
import crypto from "node:crypto";

const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });

/**
 * Provider-neutral verification boundary for refunds.
 *
 * This adapter deliberately performs no network call. A provider adapter may
 * be wired later, but the order state can only become REFUNDED after a
 * provider reference, provider transaction id, verification reference, and
 * exact amount are supplied by an authorized Owner workflow.
 */
export function verifyRefundEvidence(input = {}, { expectedAmountMinor, currency, provider } = {}) {
  const normalizedProvider = String(provider || input.provider || "").trim().toUpperCase();
  const providerReference = String(input.providerReference || "").trim().slice(0, 200);
  const providerTransactionId = String(input.providerTransactionId || "").trim().slice(0, 200);
  const verificationReference = String(input.verificationReference || input.providerVerificationReference || "").trim().slice(0, 200);
  const confirmedAmountMinor = Number(input.confirmedAmountMinor);
  if (!["PAYTR", "BANK_TRANSFER"].includes(normalizedProvider)) throw fail("REFUND_PROVIDER_UNSUPPORTED", 409);
  if (!providerReference || !providerTransactionId || !verificationReference) throw fail("REFUND_PROVIDER_EVIDENCE_REQUIRED", 400);
  if (!Number.isSafeInteger(confirmedAmountMinor) || confirmedAmountMinor !== Number(expectedAmountMinor)) throw fail("REFUND_AMOUNT_MISMATCH", 409);
  return {
    provider: normalizedProvider,
    providerReference,
    providerTransactionId,
    verificationReference,
    confirmedAmountMinor,
    currency: String(currency || "").toUpperCase(),
    externalCallPerformed: false,
    verifiedAt: new Date(),
  };
}

/** HTTP callers need a server-signed provider assertion; UI references alone are insufficient. */
export function verifyTrustedRefundEvidenceToken(token, { requestId, expectedAmountMinor, currency, provider } = {}) {
  const secret = String(process.env.REFUND_EVIDENCE_SECRET || "");
  if (!secret) throw fail("REFUND_PROVIDER_EVIDENCE_UNAVAILABLE", 503);
  const raw = String(token || "");
  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature) throw fail("REFUND_PROVIDER_EVIDENCE_REQUIRED", 400);
  let payload;
  try { payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")); } catch { throw fail("REFUND_PROVIDER_EVIDENCE_INVALID", 409); }
  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const sameSignature = signature.length === expectedSignature.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!sameSignature) throw fail("REFUND_PROVIDER_EVIDENCE_INVALID", 409);
  if (String(payload.requestId) !== String(requestId) || String(payload.provider).toUpperCase() !== String(provider).toUpperCase() || String(payload.currency).toUpperCase() !== String(currency).toUpperCase() || Number(payload.amountMinor) !== Number(expectedAmountMinor) || !payload.providerReference || !payload.providerTransactionId || !payload.verificationReference) throw fail("REFUND_PROVIDER_EVIDENCE_MISMATCH", 409);
  if (!Number.isFinite(Number(payload.expiresAt)) || Number(payload.expiresAt) < Date.now()) throw fail("REFUND_PROVIDER_EVIDENCE_EXPIRED", 409);
  return payload;
}

export function createTrustedRefundEvidenceToken(payload, secret = process.env.REFUND_EVIDENCE_SECRET) {
  if (!secret) throw fail("REFUND_PROVIDER_EVIDENCE_UNAVAILABLE", 503);
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url")}`;
}
