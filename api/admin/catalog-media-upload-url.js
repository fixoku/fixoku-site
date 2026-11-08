import crypto from "node:crypto";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createSignedUploadUrl, getPublicMediaConfig } from "../../src/server/domain/digital-delivery.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]));
const ID = /^[a-z0-9][a-z0-9-]{2,79}$/u;
const MIME = Object.freeze({ "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" });
const MAX_BYTES = 2 * 1024 * 1024;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 16_384) throw new Error("BODY_TOO_LARGE"); }
  return JSON.parse(raw || "{}");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage");
  if (denied) return json(res, denied.status, denied.body);
  let input;
  try { input = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
  const kind = String(input.kind || "");
  const id = String(input.id || "").toLowerCase();
  const contentType = String(input.contentType || "").toLowerCase();
  const size = Number(input.size);
  if (!["product", "package", "trainer-package"].includes(kind) || !ID.test(id)) return json(res, 400, { error: "MEDIA_ID_INVALID" });
  if (!MIME[contentType] || !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) return json(res, 400, { error: "MEDIA_METADATA_INVALID" });
  const config = getPublicMediaConfig();
  if (!config.enabled) return json(res, 503, { error: config.reason });
  const folder = kind === "product" ? "images/fixoku-katalog/urunler" : kind === "package" ? "images/fixoku-katalog/paketler" : "images/teacher-panel/courses";
  const key = `${folder}/${id}-${crypto.randomUUID()}.${MIME[contentType]}`;
  try {
    const uploadUrl = createSignedUploadUrl(config, key, { expiresIn: 300 });
    return json(res, 200, { uploadUrl, mediaReference: `${config.publicOrigin}/${key}`, storageKey: key, contentType, maxBytes: MAX_BYTES, expiresIn: 300, overwrite: false });
  } catch (error) { return json(res, 503, { error: error.code || error.message || "PUBLIC_MEDIA_UNAVAILABLE" }); }
}
