/* global process */
/* R410: fail-closed Preview-only external side-effect containment for PayTR TEST. */
import { r404ConnectionTargetsConfigured, PREVIEW_CONTRACTS, exactPreviewCommit, previewContractMetadataAttested } from "../auth/preview-contract.js";

export function paytrR410PreviewIsolation(env = process.env) {
  // Production is never authorized by this test-only gate. It has independent live gates.
  if (env.VERCEL_ENV !== "preview") return { applicable: false, approved: true };
  const approved = env.VERCEL === "1"
    && env.VERCEL_PROJECT_ID === "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR"
    && env.VERCEL_GIT_COMMIT_REF === "codex/fixoku-r410-staging-prep-20261121"
    && env.NODE_ENV === "production"
    && env.PAYTR_ENABLED === "1"
    && env.PAYTR_TEST_MODE === "1"
    && env.FIXOKU_PAYTR_STAGING_TEST_APPROVED === "1"
    && exactPreviewCommit(PREVIEW_CONTRACTS.r410Staging, env)
    && previewContractMetadataAttested(PREVIEW_CONTRACTS.r410Staging, env)
    && r404ConnectionTargetsConfigured(env)
    // No real SMTP sends or queued Owner management e-mails during payment tests.
    && env.EMAIL_PROVIDER === "DISABLED"
    && env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1"
    // Disable ALL external shipping providers; KG approval alone is insufficient.
    && (env.SHIPPING_PROVIDER || "DISABLED") === "DISABLED"
    && env.SHIPPING_KG_LIVE_DISPATCH_APPROVED !== "1";
  return { applicable: true, approved };
}
