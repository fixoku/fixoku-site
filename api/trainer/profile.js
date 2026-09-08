import { eq } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { trainerProfiles, users, auditEvents } from "../../src/server/db/schema.js";

const editable = ["firstName", "lastName", "phone", "city", "profession", "institution", "bio"];
const json = (response, status, body) => { response.statusCode = status; response.setHeader("Content-Type", "application/json"); response.setHeader("Cache-Control", "no-store"); response.setHeader("X-Content-Type-Options", "nosniff"); response.end(JSON.stringify(body)); };
const view = (row, user) => { const parts = String(user.displayName || "").trim().split(/\s+/); return { firstName: row?.firstName ?? parts[0] ?? "", lastName: row?.lastName ?? parts.slice(1).join(" "), phone: row?.phone ?? "", city: row?.city ?? "", profession: row?.profession ?? "", institution: row?.institution ?? "", bio: row?.bio ?? "", email: user.email }; };
const validate = (body) => { const errors = {}; for (const key of Object.keys(body)) if (!editable.includes(key)) errors[key] = "Bu alan güncellenemez."; for (const key of ["firstName", "lastName", "phone", "city", "profession", "institution", "bio"]) if (body[key] !== undefined && typeof body[key] !== "string") errors[key] = "Metin değeri bekleniyor."; if (body.firstName !== undefined && (!body.firstName.trim() || body.firstName.length > 80)) errors.firstName = "Ad alanı geçersiz."; if (body.lastName !== undefined && (!body.lastName.trim() || body.lastName.length > 80)) errors.lastName = "Soyad alanı geçersiz."; if (body.phone !== undefined && body.phone && !/^\+?[0-9 ()-]{7,20}$/.test(body.phone)) errors.phone = "Telefon alanı geçersiz."; if (body.bio !== undefined && body.bio.length > 500) errors.bio = "Kısa özgeçmiş 500 karakteri geçemez."; return errors; };
async function readBody(request) { if (request.body && typeof request.body === "object") return request.body; if (typeof request.body === "string") return JSON.parse(request.body); let raw = ""; for await (const chunk of request) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(request, response) {
  if (!["GET", "PATCH"].includes(request.method)) return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(request.headers);
    if (!principal) return json(response, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, request.method === "GET" ? "trainer.profile.read" : "trainer.profile.update", { role: "TRAINER" });
    if (denied) return json(response, denied.status, denied.body);
    const { db, pool } = createDb();
    try {
      const user = principal.user;
      const existing = await db.select().from(trainerProfiles).where(eq(trainerProfiles.userId, user.id)).limit(1);
      if (request.method === "GET") return json(response, 200, { profile: view(existing[0], user) });
      const body = await readBody(request);
      const errors = validate(body);
      if (Object.keys(errors).length) return json(response, 400, { error: "VALIDATION_ERROR", errors });
      const current = existing[0];
      const values = { phone: body.phone ?? current?.phone ?? null, city: body.city ?? current?.city ?? null, profession: body.profession ?? current?.profession ?? null, institution: body.institution ?? current?.institution ?? null, bio: body.bio ?? current?.bio ?? null, updatedAt: new Date() };
      const firstName = body.firstName ?? String(user.displayName).split(/\s+/)[0] ?? "";
      const lastName = body.lastName ?? String(user.displayName).split(/\s+/).slice(1).join(" ");
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const saved = current ? (await db.update(trainerProfiles).set(values).where(eq(trainerProfiles.userId, user.id)).returning())[0] : (await db.insert(trainerProfiles).values({ userId: user.id, ...values }).returning())[0];
      await db.update(users).set({ displayName, updatedAt: new Date() }).where(eq(users.id, user.id));
      await pool.query('update "user" set name=$1, updated_at=now() where id=$2', [displayName, user.authUserId]);
      await db.insert(auditEvents).values({ actorUserId: user.id, action: "trainer.profile.update", subjectType: "TrainerProfile", subjectId: saved.id, result: "SUCCESS", correlationId: crypto.randomUUID(), metadataJson: JSON.stringify({ fields: Object.keys(body).filter((field) => editable.includes(field)) }) });
      return json(response, 200, { profile: view({ ...saved, firstName, lastName }, { ...user, displayName }) });
    } finally { await pool.end(); }
  } catch (error) { if (error instanceof SyntaxError) return json(response, 400, { error: "INVALID_JSON" }); return json(response, 500, { error: "PROFILE_UNAVAILABLE" }); }
}
