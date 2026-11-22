import { timingSafeEqual } from "node:crypto";
import { paytrRuntime } from "../../src/server/payments/paytr.js";

const PATH = "/api/internal/fixoku-r410-paytr-config-probe";
const BRANCH = "codex/fixoku-r410-staging-prep-20261121";
const PROJECT = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";
const ORIGIN = "https://staging.fixoku.com";

function reply(res,status,data) {
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.end(JSON.stringify(data));
}

function tokenMatches(a,b) {
  if(typeof a!=="string" || typeof b!=="string") return false;
  if(a.length<32 || b.length<32 || a.length>256 || b.length>256) return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}

export function createHandler() {
  return async function handler(req,res) {
    const e=process.env;
    const sha=String(e.FIXOKU_R410_RUNTIME_EXPECTED_COMMIT_SHA||"");

    const allowed =
      e.VERCEL==="1" &&
      e.VERCEL_ENV==="preview" &&
      e.VERCEL_PROJECT_ID===PROJECT &&
      e.VERCEL_GIT_COMMIT_REF===BRANCH &&
      /^[0-9a-f]{40}$/.test(sha) &&
      sha===e.VERCEL_GIT_COMMIT_SHA &&
      e.FIXOKU_R410_RUNTIME_PROBE_ENABLED==="1";

    if(!allowed || req?.method!=="POST" || req?.url!==PATH)
      return reply(res,404,{error:"NOT_FOUND"});

    if(!tokenMatches(
      req.headers?.["x-fixoku-r410-runtime-token"],
      e.FIXOKU_R410_RUNTIME_PROBE_TOKEN
    )) return reply(res,404,{error:"NOT_FOUND"});

    if(req.body && Object.keys(req.body).length>0 ||
       Number(req.headers?.["content-length"]||0)>0 ||
       req.headers?.["transfer-encoding"])
      return reply(res,400,{error:"BODY_NOT_ALLOWED"});

    const paths={
      PAYTR_OK_URL:"/api/paytr/return-success",
      PAYTR_FAIL_URL:"/api/paytr/return-failure",
      PAYTR_CALLBACK_URL:"/api/paytr/callback"
    };

    function exactUrl(value,path) {
      try {
        const u=new URL(String(value||""));
        return u.origin===ORIGIN && u.pathname===path &&
          !u.search && !u.hash && !u.username && !u.password;
      } catch { return false; }
    }

    const urlsCorrect=Object.entries(paths).every(
      ([key,path])=>exactUrl(e[key],path)
    );

    const credentialsPresent=Boolean(
      e.PAYTR_MERCHANT_ID &&
      e.PAYTR_MERCHANT_KEY &&
      e.PAYTR_MERCHANT_SALT
    );

    const runtime=paytrRuntime(e);
    const safelyDisabled=
      e.PAYTR_ENABLED==="0" &&
      e.PAYTR_TEST_MODE==="1" &&
      e.FIXOKU_PAYTR_STAGING_TEST_APPROVED==="0" &&
      e.PAYTR_LIVE_APPROVED!=="1" &&
      e.PAYTR_LIVE_RUNTIME_VERIFIED!=="1" &&
      !runtime.liveReady;

    const originCorrect=e.APP_ORIGIN===ORIGIN;
    const ok=safelyDisabled && originCorrect &&
      urlsCorrect && credentialsPresent;

    return reply(res,ok?200:503,{
      ok,
      credentialsPresent,
      originCorrect,
      urlsCorrect,
      safelyDisabled,
      testMode:e.PAYTR_TEST_MODE==="1",
      networkUsed:false
    });
  };
}

export default createHandler();