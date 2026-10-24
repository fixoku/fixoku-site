/* global process */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const S3_SERVICE = "s3";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;
const MAX_SIGNED_URL_TTL_SECONDS = 900;

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function rfc3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/gu, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKey(key) {
  return key.split("/").map((part) => rfc3986(part)).join("/");
}

function parseEndpoint(value, { production = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const endpoint = new URL(raw);
    if (endpoint.protocol !== "https:" && (production || !["localhost", "127.0.0.1"].includes(endpoint.hostname))) return null;
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;
    return endpoint;
  } catch {
    return null;
  }
}

function remoteStoragePath(config, storageKey) {
  const key = String(storageKey || "").trim();
  if (!config?.endpoint || !config.bucket || !key || key.includes("\\") || key.includes("\0") || key.startsWith("/") || key.split("/").some((part) => part === "." || part === "..")) return null;
  const prefix = config.endpoint.pathname.replace(/\/+$/u, "");
  const objectPath = `${prefix}/${rfc3986(config.bucket)}/${encodeObjectKey(key)}`;
  return objectPath || "/";
}

function signedUrlTtl(value) {
  const parsed = Number(value || DEFAULT_SIGNED_URL_TTL_SECONDS);
  if (!Number.isInteger(parsed)) return DEFAULT_SIGNED_URL_TTL_SECONDS;
  return Math.max(60, Math.min(MAX_SIGNED_URL_TTL_SECONDS, parsed));
}

function signedQuery(config, storageKey, expiresIn, now, method = "GET") {
  const canonicalUri = remoteStoragePath(config, storageKey);
  if (!canonicalUri) throw new Error("PRIVATE_STORAGE_KEY_INVALID");
  const requestDate = now.toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
  const dateStamp = requestDate.slice(0, 8);
  const credential = `${config.accessKeyId}/${dateStamp}/${config.region}/${S3_SERVICE}/aws4_request`;
  const values = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": requestDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${rfc3986(key)}=${rfc3986(value)}`)
    .join("&");
  const canonicalRequest = [method, canonicalUri, canonicalQuery, `host:${config.endpoint.host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const scope = `${dateStamp}/${config.region}/${S3_SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", requestDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), S3_SERVICE), "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");
  return `${config.endpoint.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Private media configuration. S3 is intentionally S3-compatible so the same
 * adapter works with Cloudflare R2 (`region=auto`, R2 endpoint) without a
 * second storage system or a public bucket.
 */
export function getDigitalStorageConfig(env = process.env) {
  const provider = String(env.DIGITAL_STORAGE_PROVIDER || "DISABLED").trim().toUpperCase();
  if (provider === "LOCAL") {
    if (String(env.NODE_ENV || "").toLowerCase() === "production") return { provider, enabled: false, reason: "LOCAL_STORAGE_FORBIDDEN_IN_PRODUCTION" };
    const root = String(env.DIGITAL_STORAGE_ROOT || "").trim();
    if (!root) return { provider, enabled: false, reason: "DIGITAL_STORAGE_ROOT_REQUIRED" };
    return { provider, enabled: true, root: path.resolve(root) };
  }
  if (provider === "S3" || provider === "R2") {
    const production = String(env.NODE_ENV || "").toLowerCase() === "production";
    const bucket = String(env.S3_BUCKET || "").trim();
    const region = String(env.S3_REGION || (provider === "R2" ? "auto" : "")).trim();
    const accessKeyId = String(env.S3_ACCESS_KEY_ID || "").trim();
    const secretAccessKey = String(env.S3_SECRET_ACCESS_KEY || "");
    const endpoint = parseEndpoint(env.S3_ENDPOINT, { production });
    if (!bucket || !region || !accessKeyId || !secretAccessKey || !endpoint) return { provider, enabled: false, reason: "S3_RUNTIME_NOT_CONFIGURED" };
    return {
      provider,
      enabled: true,
      endpoint,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      signedUrlTtlSeconds: signedUrlTtl(env.DIGITAL_STORAGE_SIGNED_URL_TTL_SECONDS),
    };
  }
  return { provider: "DISABLED", enabled: false, reason: "DIGITAL_STORAGE_CONFIG_REQUIRED" };
}

/** Repo-local curriculum/media files are a development adapter only. */
export function productionPrivateMediaAvailable(env = process.env) {
  if (String(env.NODE_ENV || "").toLowerCase() !== "production") return true;
  const config = getDigitalStorageConfig(env);
  return config.enabled && ["S3", "R2"].includes(config.provider);
}

/** Return a short-lived, private S3-compatible GET URL. */
export function createSignedReadUrl(config, storageKey, { expiresIn = config?.signedUrlTtlSeconds, now = new Date(), method = "GET" } = {}) {
  if (!config?.enabled || !["S3", "R2"].includes(config.provider)) throw new Error(config?.reason || "S3_RUNTIME_NOT_CONFIGURED");
  if (!["GET", "HEAD"].includes(method)) throw new Error("PRIVATE_STORAGE_METHOD_INVALID");
  return signedQuery(config, storageKey, signedUrlTtl(expiresIn), now, method);
}

/** Fetch a private object without exposing a permanent URL or credentials. */
export async function fetchPrivateObject(config, storageKey, options = {}) {
  const method = options.method || "GET";
  const response = await fetch(createSignedReadUrl(config, storageKey, options), { method, redirect: "error" });
  return response;
}

export function resolvePrivateStoragePath(root, storageKey) {
  const key = String(storageKey || "").trim();
  if (!root || !key || key.includes("\\") || key.startsWith("/") || key.includes("\0")) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, key);
  const prefix = `${resolvedRoot}${path.sep}`;
  return resolved === resolvedRoot || !resolved.startsWith(prefix) ? null : resolved;
}

export async function inspectPrivateFile(config, storageKey) {
  if (!config?.enabled || config.provider !== "LOCAL") return null;
  const filePath = resolvePrivateStoragePath(config.root, storageKey);
  if (!filePath) return null;
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;
    return { filePath, size: stat.size };
  } catch {
    return null;
  }
}
