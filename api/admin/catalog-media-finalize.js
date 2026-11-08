import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { getPublicMediaConfig, inspectRemoteObject } from "../../src/server/domain/digital-delivery.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]));
const KEY = /^images\/(?:fixoku-katalog\/(?:urunler|paketler)|teacher-panel\/courses)\/[a-z0-9][a-z0-9-]{2,79}-[0-9a-f-]{36}\.(?:webp|png|jpg)$/u;
const MIME = /^(?:image\/webp|image\/png|image\/jpeg)$/u;
const MAX_BYTES = 2 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, "package.manage");
  if (denied) return json(res, denied.status, denied.body);
  let input = req.body;
  if (!input || typeof input !== "object") { let raw = ""; for await (const chunk of req) raw += chunk; try { input = JSON.parse(raw || "{}"); } catch { return json(res, 400, { error: "INVALID_JSON" }); } }
  const storageKey = String(input.storageKey || "");
  if (!KEY.test(storageKey)) return json(res, 400, { error: "MEDIA_KEY_INVALID" });
  const config = getPublicMediaConfig();
  if (!config.enabled) return json(res, 503, { error: config.reason });
  try {
    const object = await inspectRemoteObject(config, storageKey);
    if (!object.ok) return json(res, object.status === 404 ? 404 : 503, { error: object.status === 404 ? "MEDIA_NOT_FOUND" : "MEDIA_HEAD_FAILED" });
    if (!MIME.test(object.contentType) || object.contentLength < 1 || object.contentLength > MAX_BYTES) return json(res, 422, { error: "MEDIA_OBJECT_INVALID" });
    return json(res, 200, { verified: true, storageKey, mediaReference: `${config.publicOrigin}/${storageKey}`, contentType: object.contentType, size: object.contentLength });
  } catch (error) { return json(res, 503, { error: error.code || error.message || "PUBLIC_MEDIA_UNAVAILABLE" }); }
}
