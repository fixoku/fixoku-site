import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { paytrRuntime, paytrTestSettlementAllowed } from "../../src/server/payments/paytr.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "order.create");
  if (denied) return json(res, denied.status, denied.body);
  const runtime = paytrRuntime();
  const configured = runtime.configured && runtime.returnUrlsConfigured && (runtime.liveReady || paytrTestSettlementAllowed());
  const e = process.env;
  const diagnosticAllowed =
    e.VERCEL_ENV === "preview" &&
    e.VERCEL_GIT_COMMIT_REF === "codex/fixoku-r410-staging-prep-20261121";

  const readiness = diagnosticAllowed ? {
    enabled: e.PAYTR_ENABLED === "1",
    testMode: e.PAYTR_TEST_MODE === "1",
    testApproved: e.FIXOKU_PAYTR_STAGING_TEST_APPROVED === "1",
    credentialsPresent: Boolean(
      e.PAYTR_MERCHANT_ID && e.PAYTR_MERCHANT_KEY && e.PAYTR_MERCHANT_SALT
    ),
    returnUrlsConfigured: runtime.returnUrlsConfigured,
    originCorrect: e.APP_ORIGIN === "https://staging.fixoku.com",
    testSettlementAllowed: paytrTestSettlementAllowed()
  } : undefined;

  return json(res, 200, {
    configured,
    status: configured ? "CONFIGURED" : "CONFIG_REQUIRED",
    testMode: runtime.testMode,
    testOnly: runtime.testOnly,
    liveReady: runtime.liveReady === true,
    ...(readiness ? { readiness } : {})
  });
}
