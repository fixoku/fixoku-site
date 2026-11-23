import { timingSafeEqual } from "node:crypto";
import pg from "../../src/server/db/guarded-pg.js";
import { R18_STAGING_METADATA, PREVIEW_CONTRACTS, exactPreviewContractEnvironment, previewContractMetadataAttested, r404ConnectionTargetsConfigured } from "../../src/server/auth/preview-contract.js";
import { paytrRuntime, paytrTestSettlementAllowed } from "../../src/server/payments/paytr.js";

const PATH = "/api/internal/fixoku-r410-safe-readiness";
const BRANCH = "codex/fixoku-r410-staging-prep-20261121";
const PROJECT = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";
function reply(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(JSON.stringify(body));
}
function tokenOK(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (provided.length < 32 || expected.length < 32 || provided.length > 256 || expected.length > 256) return false;
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export default async function handler(req, res) {
  const e = process.env;
  const c = PREVIEW_CONTRACTS.r410Staging;
  const runtimeAllowed = e.VERCEL === "1" && e.VERCEL_ENV === "preview" &&
    e.VERCEL_PROJECT_ID === PROJECT && e.VERCEL_GIT_COMMIT_REF === BRANCH &&
    exactPreviewContractEnvironment(c, e) &&
    previewContractMetadataAttested(c, e) && e.FIXOKU_R410_RUNTIME_PROBE_ENABLED === "1";
  if (!runtimeAllowed || req.method !== "POST" || req.url !== PATH) return reply(res, 404, {error:"NOT_FOUND"});
  if (!tokenOK(req.headers?.["x-fixoku-r410-runtime-token"], e.FIXOKU_R410_RUNTIME_PROBE_TOKEN)) return reply(res,404,{error:"NOT_FOUND"});
  if (req.body && (typeof req.body !== "object" || Object.keys(req.body).length > 0) ||
      Number(req.headers?.["content-length"] || 0) > 0 || req.headers?.["transfer-encoding"]) return reply(res,400,{error:"BODY_NOT_ALLOWED"});
  const dbUrlsPinned = r404ConnectionTargetsConfigured(e);
  const payment = paytrRuntime(e);
  const paymentGate = payment.configured && payment.returnUrlsConfigured && paytrTestSettlementAllowed(e);
  // This read-only probe NEVER asserts external email/shipping isolation from metadata alone.
  const result = {
    ok:false,
    previewContract:true,
    dbUrlsPinned,
    dbBranchMatchesPinnedTarget:false,
    dbReadOnlyTransaction:false,
    paytrTestRuntimeReady:paymentGate,
    externalEmailIsolation:"NOT_VERIFIED",
    externalShippingIsolation:"NOT_VERIFIED",
    testPaymentAuthorized:false,
    paymentAttempted:false,
    emailSent:false,
    shipmentCreated:false
  };
  if (!dbUrlsPinned) return reply(res, 503, result);
  const pool = new pg.Pool({ connectionString:e.DATABASE_URL, max:1, connectionTimeoutMillis:5000, statement_timeout:5000 });
  let client;
  let tx=false;
  try {
    client=await pool.connect();
    await client.query("BEGIN READ ONLY"); tx=true;
    const {rows}=await client.query("select current_setting('neon.branch_id', true) as branch_id, current_setting('transaction_read_only') as read_only");
    result.dbReadOnlyTransaction=rows[0]?.read_only === "on";
    result.dbBranchMatchesPinnedTarget=rows[0]?.branch_id === R18_STAGING_METADATA.branch;
    await client.query("ROLLBACK"); tx=false;
    result.ok=result.dbUrlsPinned && result.dbReadOnlyTransaction && result.dbBranchMatchesPinnedTarget;
    return reply(res, result.ok?200:503, result);
  } catch {
    return reply(res,503,{...result,error:"READ_ONLY_DB_FINGERPRINT_UNAVAILABLE"});
  } finally {
    if (tx && client) try { await client.query("ROLLBACK"); } catch {}
    if (client) client.release();
    await pool.end().catch(()=>{});
  }
}