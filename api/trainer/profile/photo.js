import { eq } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../../src/server/auth/authorization.js";
import { createDb } from "../../../src/server/db/client.js";
import { trainerProfiles } from "../../../src/server/db/schema.js";
import { getProfileMediaConfig, readProfilePhoto } from "../../../src/server/domain/profile-media.js";

const headers = (request) => new Headers(Object.entries(request.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
export default async function handler(request, response) {
  if (request.method !== "GET") { response.statusCode = 405; response.end(); return; }
  try {
    const principal = await resolvePrincipal(headers(request));
    if (!principal) { response.statusCode = 401; response.end(); return; }
    const denied = requirePermission(principal, "trainer.profile.read", { role: "TRAINER" });
    if (denied) { response.statusCode = denied.status; response.end(JSON.stringify(denied.body)); return; }
    const { db, pool } = createDb();
    try {
      const row = (await db.select().from(trainerProfiles).where(eq(trainerProfiles.userId, principal.user.id)).limit(1))[0];
      const photo = await readProfilePhoto(getProfileMediaConfig(), row?.photoStorageKey);
      if (!photo) { response.statusCode = 404; response.end(); return; }
      response.statusCode = 200; response.setHeader("Content-Type", photo.mime); response.setHeader("Cache-Control", "private, no-store"); response.setHeader("X-Content-Type-Options", "nosniff"); response.end(photo.buffer);
    } finally { await pool.end(); }
  } catch { response.statusCode = 503; response.end(); }
}
