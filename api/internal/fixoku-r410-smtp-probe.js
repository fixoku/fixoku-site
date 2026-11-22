import { timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "../../src/server/domain/email-outbox.js";

const PATH = "/api/internal/fixoku-r410-smtp-probe";
const BRANCH = "codex/fixoku-r410-staging-prep-20261121";
const PROJECT = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";

function reply(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(data));
}

function matches(a,b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length < 32 || b.length < 32 || a.length > 256 || b.length > 256) return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}

export function createHandler({
  env = process.env,
  transportFactory = config => nodemailer.createTransport(config)
} = {}) {
  return async function handler(req,res) {
    const sha=String(env.FIXOKU_R410_RUNTIME_EXPECTED_COMMIT_SHA||"");

    const allowed =
      env.VERCEL==="1" &&
      env.VERCEL_ENV==="preview" &&
      env.VERCEL_PROJECT_ID===PROJECT &&
      env.VERCEL_GIT_COMMIT_REF===BRANCH &&
      /^[0-9a-f]{40}$/.test(sha) &&
      sha===env.VERCEL_GIT_COMMIT_SHA &&
      env.FIXOKU_R410_RUNTIME_PROBE_ENABLED==="1";

    if (!allowed || req.method!=="POST" || req.url!==PATH)
      return reply(res,404,{error:"NOT_FOUND"});

    if (!matches(
      req.headers?.["x-fixoku-r410-runtime-token"],
      env.FIXOKU_R410_RUNTIME_PROBE_TOKEN
    )) return reply(res,404,{error:"NOT_FOUND"});

    if (
      (req.body && Object.keys(req.body).length>0) ||
      Number(req.headers?.["content-length"]||0)>0 ||
      req.headers?.["transfer-encoding"]
    ) return reply(res,400,{error:"BODY_NOT_ALLOWED"});

    const config=getSmtpConfig(env);
    const valid =
      config?.provider==="SMTP" &&
      config.from==="bildirim@fixoku.com" &&
      config.transport.host==="mail.fixoku.com" &&
      config.transport.port===465 &&
      config.transport.secure===true &&
      config.transport.auth.user==="bildirim@fixoku.com";

    if (!valid)
      return reply(res,503,{
        ok:false,
        status:"SMTP_CONFIG_NOT_VERIFIED"
      });

    let transport;
    try {
      transport=transportFactory({
        ...config.transport,
        logger:false,
        debug:false,
        connectionTimeout:10000,
        greetingTimeout:10000,
        socketTimeout:15000
      });

      await transport.verify();

      return reply(res,200,{
        ok:true,
        authenticated:true,
        emailSent:false,
        status:"SMTP_AUTH_VERIFIED"
      });
    } catch {
      return reply(res,503,{
        ok:false,
        status:"SMTP_AUTH_NOT_VERIFIED",
        emailSent:false
      });
    } finally {
      try { transport?.close(); } catch {}
    }
  };
}

export default createHandler();