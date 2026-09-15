/* global process */
import fs from "node:fs/promises";
import path from "node:path";

/** Storage is deliberately disabled until an operator configures a private root or S3 adapter. */
export function getDigitalStorageConfig(env = process.env) {
  const provider = String(env.DIGITAL_STORAGE_PROVIDER || "DISABLED").trim().toUpperCase();
  if (provider === "LOCAL") {
    if (String(env.NODE_ENV || "").toLowerCase() === "production") return { provider, enabled: false, reason: "LOCAL_STORAGE_FORBIDDEN_IN_PRODUCTION" };
    const root = String(env.DIGITAL_STORAGE_ROOT || "").trim();
    if (!root) return { provider, enabled: false, reason: "DIGITAL_STORAGE_ROOT_REQUIRED" };
    return { provider, enabled: true, root: path.resolve(root) };
  }
  if (provider === "S3") {
    const bucket = String(env.S3_BUCKET || "").trim(); const region = String(env.S3_REGION || "").trim(); const accessKey = String(env.S3_ACCESS_KEY_ID || "").trim(); const secretKey = String(env.S3_SECRET_ACCESS_KEY || "");
    if (!bucket || !region || !accessKey || !secretKey) return { provider, enabled: false, reason: "S3_RUNTIME_NOT_CONFIGURED" };
    // The official AWS SDK v3 is intentionally not bundled in this checkout;
    // fail closed until the approved SDK/runtime is installed and reviewed.
    return { provider, enabled: false, reason: "S3_SDK_RUNTIME_REQUIRED" };
  }
  return { provider: "DISABLED", enabled: false, reason: "DIGITAL_STORAGE_CONFIG_REQUIRED" };
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
