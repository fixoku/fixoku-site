import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createSignedReadUrl, getDigitalStorageConfig, resolvePrivateStoragePath } from "./digital-delivery.js";

const MIME_EXTENSIONS = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });
const MAX_BYTES = 2 * 1024 * 1024;

/** Profile media is private by default. A local root is an explicit test/dev adapter. */
export function getProfileMediaConfig(env = globalThis.process?.env || {}) {
  // FIXOKU_R23_PHOTO_SAVE: guarded, local-only fallback without Vite restart.
  // Never enable local storage outside an explicitly enabled local review runtime.
  const localReview = env.LOCAL_REVIEW_MODE === "1" &&
    env.NODE_ENV !== "production" &&
    String(env.FIXOKU_LOCAL_ORIGIN || "") === "http://127.0.0.1:5173" &&
    /^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):55432\/fixoku_four_user_review(?:[?#]|$)/u.test(String(env.DATABASE_URL || ""));
  const fallbackRoot = path.join(os.homedir(), "Documents", "FIXOKU_LOCAL_PROFILE_MEDIA");
  const provider = String(env.PROFILE_MEDIA_PROVIDER || (localReview ? "LOCAL" : env.DIGITAL_STORAGE_PROVIDER || "DISABLED")).trim().toUpperCase();
  if (provider === "S3" || provider === "R2") {
    const storage = getDigitalStorageConfig({ ...env, DIGITAL_STORAGE_PROVIDER: provider });
    return storage.enabled ? { ...storage, mediaPrefix: "" } : { provider, enabled: false, reason: storage.reason || "PROFILE_MEDIA_CONFIG_REQUIRED" };
  }
  if (provider !== "LOCAL") return { provider: "DISABLED", enabled: false, reason: "PROFILE_MEDIA_CONFIG_REQUIRED" };
  if (String(env.NODE_ENV || "").toLowerCase() === "production") return { provider, enabled: false, reason: "LOCAL_PROFILE_MEDIA_FORBIDDEN_IN_PRODUCTION" };
  const root = String(env.PROFILE_MEDIA_ROOT || (localReview ? fallbackRoot : "")).trim();
  if (!root) return { provider, enabled: false, reason: "PROFILE_MEDIA_ROOT_REQUIRED" };
  return { provider, enabled: true, root: path.resolve(root) };
}

export function parsePhotoDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/u.exec(String(value || ""));
  if (!match) return null;
  const buffer = globalThis.Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_BYTES) return null;
  return { mime: match[1], buffer };
}

export async function saveProfilePhoto(config, ownerId, dataUrl) {
  if (!config?.enabled || config.provider !== "LOCAL") throw new Error("PROFILE_MEDIA_NOT_CONFIGURED");
  const parsed = parsePhotoDataUrl(dataUrl);
  if (!parsed) throw new Error("PROFILE_PHOTO_INVALID");
  const key = `profiles/${String(ownerId).replace(/[^a-zA-Z0-9_-]/gu, "")}/${crypto.randomUUID()}.${MIME_EXTENSIONS[parsed.mime]}`;
  const target = resolvePrivateStoragePath(config.root, key);
  if (!target) throw new Error("PROFILE_MEDIA_PATH_INVALID");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, parsed.buffer, { flag: "wx", mode: 0o600 });
  return { key, mime: parsed.mime, size: parsed.buffer.length };
}

export async function readProfilePhoto(config, key) {
  if (!config?.enabled || config.provider !== "LOCAL") return null;
  const target = resolvePrivateStoragePath(config.root, key);
  if (!target) return null;
  try {
    const buffer = await fs.readFile(target);
    const extension = path.extname(target).slice(1).toLowerCase();
    const mime = Object.entries(MIME_EXTENSIONS).find(([, ext]) => ext === extension)?.[0] || "application/octet-stream";
    return { buffer, mime };
  } catch { return null; }
}

export function createProfilePhotoUrl(config, key) {
  if (!config?.enabled || !["S3", "R2"].includes(config.provider)) return null;
  return createSignedReadUrl(config, key);
}

export async function removeProfilePhoto(config, key) {
  if (!config?.enabled || config.provider !== "LOCAL") return;
  const target = resolvePrivateStoragePath(config.root, key);
  if (!target) return;
  try { await fs.rm(target, { force: true }); } catch { /* cleanup is best effort */ }
}
