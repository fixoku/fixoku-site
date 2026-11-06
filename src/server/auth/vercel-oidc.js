/* global Buffer, process */

/*
 * Deployment-scoped Vercel OIDC authorization for private Preview probes.
 * Keep this helper outside api/internal/r97g-runtime-fingerprint.js because
 * the historical R97G endpoint is intentionally excluded from Vercel
 * deployment packages.
 */

const VERCEL_OIDC_HEADER = "x-fixoku-vercel-oidc-token";
const VERCEL_OIDC_ISSUER = "https://oidc.vercel.com/fixoku";
const VERCEL_OIDC_AUDIENCE = "https://vercel.com/fixoku";
const VERCEL_OIDC_JWKS_URL = `${VERCEL_OIDC_ISSUER}/.well-known/jwks.json`;
const TARGET_PROJECT_ID = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";
let oidcJwksPromise;

function getHeader(req, name) {
  const headers = req?.headers;
  if (headers && typeof headers.get === "function") return headers.get(name) || "";
  if (!headers || typeof headers !== "object") return "";
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? "" : String(value || "");
}

function normalizeHost(value) {
  const host = String(value ?? "").trim().toLowerCase();
  if (!host || host.length > 253 || host.includes("..") || host.includes("/") || host.includes(":")) return "";
  return host;
}

function deploymentHost(env) {
  const raw = String(env?.VERCEL_URL || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//u.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      ? normalizeHost(url.hostname)
      : "";
  } catch {
    return "";
  }
}

function decodeJwtPart(part) {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function verifyVercelOidcSignature(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (!header || !payload || header.alg !== "RS256" || typeof header.kid !== "string") return null;
  try {
    oidcJwksPromise ||= fetch(VERCEL_OIDC_JWKS_URL, { headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("OIDC_JWKS_UNAVAILABLE")));
    const jwks = await oidcJwksPromise;
    const jwk = Array.isArray(jwks?.keys) ? jwks.keys.find((candidate) => candidate?.kid === header.kid) : null;
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      Buffer.from(parts[2], "base64url"),
      Buffer.from(`${parts[0]}.${parts[1]}`),
    );
    return valid ? payload : null;
  } catch {
    oidcJwksPromise = undefined;
    return null;
  }
}

export async function hasVercelOidcAuthorization(req, env = process.env) {
  if (env.VERCEL !== "1") return false;
  const provided = getHeader(req, VERCEL_OIDC_HEADER).trim();
  if (!provided) return false;
  const payload = await verifyVercelOidcSignature(provided);
  const now = Math.floor(Date.now() / 1000);
  const scope = String(payload?.scope || "");
  const audience = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  const projectScope = `owner:fixoku:project:fixoku-site:environment:${String(payload?.environment || "")}`;
  if (!payload
    || payload.iss !== VERCEL_OIDC_ISSUER
    || !audience.includes(VERCEL_OIDC_AUDIENCE)
    || payload.project !== "fixoku-site"
    || payload.project_id !== TARGET_PROJECT_ID
    || !["development", "preview"].includes(String(payload.environment || ""))
    || scope !== projectScope
    || !Number.isFinite(Number(payload.exp))
    || Number(payload.exp) <= now
    || (payload.nbf != null && Number(payload.nbf) > now)) return false;
  const requestHost = normalizeHost(getHeader(req, "host").split(":")[0]);
  const expectedHost = deploymentHost(env);
  return Boolean(requestHost && expectedHost && requestHost === expectedHost);
}
