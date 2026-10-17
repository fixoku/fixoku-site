import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../auth/authorization.js";
import { assertTrainerPrincipal } from "./trainer-commerce.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ROOT = path.resolve(process.cwd(), "private", "trainer-shared-presentations");

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

  const url = new URL(req.url, "http://local");
  const packageId = String(url.searchParams.get("packageId") || "");
  if (!UUID.test(packageId)) return { status: 400 };

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const trainer = await assertTrainerPrincipal(principal);
    const result = await pool.query(`
      select 1 from trainer_package_entitlements e
      join packages p on p.id=e.package_id
      where e.trainer_user_id=$1 and e.package_id=$2
        and e.status='ACTIVE' and e.revoked_at is null
        and p.audience='TRAINER'
      limit 1
    `, [trainer.id, packageId]);
    if (!result.rowCount) return { status: 403 };
  } catch (error) {
    return { status: error.status === 403 ? 403 : 503 };
  } finally {
    await pool.end();
  }

  const manifestPath = path.join(ROOT, "manifest.json");
  if (!fs.existsSync(manifestPath)) return { status: 404 };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(data.presentations)) return { status: 503 };
  } catch {
    return { status: 503 };
  }
  return { status: 200, packageId, presentations: data.presentations, root: ROOT, url };
}
