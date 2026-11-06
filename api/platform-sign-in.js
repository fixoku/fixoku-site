import { auth } from "../src/server/auth/auth.js";
import { cleanPreviewGateResponse } from "../src/server/auth/preview-contract.js";

async function readPayload(request) {
  if (request.body && typeof request.body === "object") return { value: request.body, raw: JSON.stringify(request.body) };
  if (typeof request.body === "string") {
    try { return { value: JSON.parse(request.body), raw: request.body }; } catch { return { value: null, raw: request.body }; }
  }
  if (request.readableEnded || !request.readable) return { value: null, raw: "" };
  let raw = "";
  for await (const chunk of request) raw += chunk;
  try { return { value: JSON.parse(raw || "{}"), raw }; } catch { return { value: null, raw }; }
}

function requestHeaders(request) {
  return new Headers(Object.entries(request.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
}

async function forwardAuthResponse(response, authResponse) {
  response.statusCode = authResponse.status;
  const setCookies = typeof authResponse.headers.getSetCookie === "function"
    ? authResponse.headers.getSetCookie()
    : authResponse.headers.get("set-cookie");
  authResponse.headers.forEach((value, key) => {
    if (key !== "set-cookie") response.setHeader(key, value);
  });
  if (setCookies && (Array.isArray(setCookies) ? setCookies.length : true)) response.setHeader("set-cookie", setCookies);
  response.end(Buffer.from(await authResponse.arrayBuffer()));
}

// Same Better Auth login, explicit Vercel endpoint for trainer/student access.
export default async function handler(request, response) {
  if (!cleanPreviewGateResponse(response)) return;
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }));
    return;
  }
  const payload = await readPayload(request);
  const headers = requestHeaders(request);
  headers.set("content-type", "application/json");
  const authResponse = await auth.handler(new Request("http://local/api/auth/sign-in/email", {
    method: "POST",
    headers,
    body: payload.raw || JSON.stringify(payload.value || {}),
  }));
  return forwardAuthResponse(response, authResponse);
}
