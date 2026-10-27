/* global process */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../auth/authorization.js";
import { fetchPrivateObject, getDigitalStorageConfig, productionPrivateMediaAvailable } from "./digital-delivery.js";

const ROOT = path.resolve(process.cwd(), "private", "trainer-shared-presentations");

/**
 * Shared presentations are a free, authenticated Trainer resource. They do
 * not inherit the paid package entitlement gate used by curriculum/video
 * media. A verified candidate may see this resource before Owner review; an
 * ordinary student, guardian or anonymous principal may not.
 */
export async function resolveTrainerPresentationViewer(pool, principal) {
  if (!principal?.user?.id || principal.user.emailVerified !== true) return null;
  const activeTrainer = principal.memberships?.some((membership) =>
    membership.role === "TRAINER" && membership.status === "ACTIVE" && membership.scopeType === "TRAINER"
  );
  if (activeTrainer) return { kind: "TRAINER", userId: principal.user.id };

  const candidate = (await pool.query(`
    select 1
      from trainer_applications a
      join platform_users u on u.id=a.candidate_user_id
     where a.candidate_user_id=$1
       and a.status in ('RECEIVED','REVIEWING','PROFILE_READY')
       and u.email_verified=true
     limit 1
  `, [principal.user.id])).rowCount;
  return candidate ? { kind: "VERIFIED_CANDIDATE", userId: principal.user.id } : null;
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
  return { status: 200, presentations: data.presentations, root: localRoot, storage, url };
}
