import { timingSafeEqual } from "node:crypto";
import { createKolayGelsinAdapter } from "../../src/server/shipping/kolaygelsin.js";

const PATH = "/api/internal/fixoku-r410-kg-probe";
const BRANCH = "codex/fixoku-r410-staging-prep-20261121";
const PROJECT = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";

function reply(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(data));
}

function safeTokenMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length < 32 || b.length < 32 || a.length > 256 || b.length > 256) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createHandler(adapterFactory = createKolayGelsinAdapter) {
  return async function handler(req, res) {
    const env = process.env;
    const expected = String(env.FIXOKU_R410_RUNTIME_EXPECTED_COMMIT_SHA || "");

    const runtimeOK =
      env.VERCEL === "1" &&
      env.VERCEL_ENV === "preview" &&
      env.VERCEL_PROJECT_ID === PROJECT &&
      env.VERCEL_GIT_COMMIT_REF === BRANCH &&
      /^[0-9a-f]{40}$/.test(expected) &&
      expected === env.VERCEL_GIT_COMMIT_SHA &&
      env.FIXOKU_R410_RUNTIME_PROBE_ENABLED === "1";

    if (!runtimeOK || req?.method !== "POST" || req?.url !== PATH) {
      return reply(res, 404, {error:"NOT_FOUND"});
    }

    const supplied = req.headers?.["x-fixoku-r410-runtime-token"];
    if (!safeTokenMatch(supplied, env.FIXOKU_R410_RUNTIME_PROBE_TOKEN)) {
      return reply(res, 404, {error:"NOT_FOUND"});
    }

    if (
      (req.body && Object.keys(req.body).length > 0) ||
      Number(req.headers?.["content-length"] || 0) > 0 ||
      req.headers?.["transfer-encoding"]
    ) {
      return reply(res, 400, {error:"BODY_NOT_ALLOWED"});
    }

    try {
      const adapter = adapterFactory({allowDispatch:false});
      const result = await adapter.verifyConnection();

      if (result?.verified !== true || result?.readOnly !== true) {
        throw new Error("KG_PROBE_UNVERIFIED");
      }

      return reply(res, 200, {
        ok:true,
        provider:"KOLAYGELSIN",
        readOnly:true
      });
    } catch {
      return reply(res, 503, {
        ok:false,
        error:"KG_CONNECTION_NOT_VERIFIED"
      });
    }
  };
}

export default createHandler();