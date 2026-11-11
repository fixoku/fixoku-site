/* global process */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../auth/authorization.js";
import { fetchPrivateObject, getDigitalStorageConfig, inspectPrivateFile, inspectRemoteObject, productionPrivateMediaAvailable, resolvePrivateStoragePath } from "./digital-delivery.js";
import { getSharedPresentationPdfDefinition } from "./trainer-shared-presentation-pdf.js";

const ROOT = path.resolve(process.cwd(), "private", "trainer-shared-presentations");

/**
 * Shared presentations require an active trainer package entitlement.
 * Paid purchases and Owner-granted active packages both qualify.
 */
export async function resolveTrainerPresentationViewer(pool, principal) {
  if (!principal?.user?.id || principal.user.emailVerified !== true) return null;

  const activeTrainer = principal.memberships?.some((membership) =>
    membership.role === "TRAINER" &&
    membership.status === "ACTIVE" &&
    membership.scopeType === "TRAINER"
  );

  if (!activeTrainer) return null;

  const entitlement = await pool.query(`
    select 1
    from trainer_package_entitlements e
    join packages p on p.id = e.package_id
    where e.trainer_user_id = $1
      and e.status = 'ACTIVE'
      and e.revoked_at is null
      and e.effective_at <= now()
      and p.audience = 'TRAINER'
    limit 1
  `, [principal.user.id]);

  return entitlement.rowCount > 0
    ? { kind: "TRAINER_WITH_PACKAGE", userId: principal.user.id }
    : null;
}

export function replyJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

export function replyStop(res, status) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end();
}

export async function authorizeSharedPresentation(req) {
  const headers = new Headers(Object.entries(req.headers || {}).map(([key, value]) =>
    [key, Array.isArray(value) ? value.join(", ") : String(value)]));
  const principal = await resolvePrincipal(headers);
  if (!principal) return { status: 401 };
  if (!productionPrivateMediaAvailable()) return { status: 503 };

  const url = new URL(req.url, "http://local");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const viewer = await resolveTrainerPresentationViewer(pool, principal);
    if (!viewer) return { status: 403 };
  } catch (error) {
    return { status: error.status === 403 ? 403 : 503 };
  } finally {
    await pool.end();
  }

  const storage = getDigitalStorageConfig();
  const remote = storage.provider === "S3" || storage.provider === "R2";
  let data;
  if (remote) {
    const response = await fetchPrivateObject(storage, "trainer-shared-presentations/manifest.json");
    if (!response.ok) return { status: response.status === 404 ? 404 : 503 };
    try { data = await response.json(); } catch { return { status: 503 }; }
  } else {
    const localRoot = storage.provider === "LOCAL" && storage.root
      ? path.resolve(storage.root, "trainer-shared-presentations")
      : ROOT;
    const manifestPath = path.join(localRoot, "manifest.json");
    if (!fs.existsSync(manifestPath)) return { status: 404 };
    try { data = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch { return { status: 503 }; }
  }
  if (!Array.isArray(data.presentations)) return { status: 503 };
  const localRoot = storage.provider === "LOCAL" && storage.root
    ? path.resolve(storage.root, "trainer-shared-presentations")
    : ROOT;
  return { status: 200, presentations: data.presentations, root: localRoot, storage, url, manifest: data };
}

export async function inspectSharedPresentationPdf(auth, definition) {
  if (!auth?.status || auth.status !== 200 || !definition?.available) return { state: "CONFIG_MISSING", available: false };
  const storage = auth.storage;
  if (storage?.provider === "LOCAL") {
    const inspected = await inspectPrivateFile(storage, definition.key);
    return inspected ? { state: "READY", available: true, ...inspected } : { state: "OBJECT_MISSING", available: false };
  }
  if (storage?.provider === "S3" || storage?.provider === "R2") {
    try {
      const inspected = await inspectRemoteObject(storage, definition.key);
      if (!inspected.ok) return { state: inspected.status === 404 ? "OBJECT_MISSING" : "STORAGE_UNAVAILABLE", available: false, ...inspected };
      return { state: "READY", available: true, ...inspected };
    } catch {
      return { state: "STORAGE_UNAVAILABLE", available: false };
    }
  }
  const filePath = resolvePrivateStoragePath(auth.root, definition.key);
  if (!filePath) return { state: "OBJECT_MISSING", available: false };
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? { state: "READY", available: true, filePath, size: stat.size } : { state: "OBJECT_MISSING", available: false };
  } catch {
    return { state: "OBJECT_MISSING", available: false };
  }
}

export { getSharedPresentationPdfDefinition };
