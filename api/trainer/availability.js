import { and, eq, gt, lt, ne } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { availabilitySlots, auditEvents } from "../../src/server/db/schema.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const parseDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
async function readBody(request) { if (request.body && typeof request.body === "object") return request.body; if (typeof request.body === "string") return JSON.parse(request.body); let raw = ""; for await (const chunk of request) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(request, response) {
  if (!["GET", "PATCH"].includes(request.method)) return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(request.headers);
    if (!principal) return json(response, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, request.method === "GET" ? "schedule.read" : "availability.manage", { role: "TRAINER" });
    if (denied) return json(response, denied.status, denied.body);
    const { db, pool } = createDb();
    try {
      const trainerUserId = principal.user.id;
      if (request.method === "GET") {
        const rows = await db.select().from(availabilitySlots).where(eq(availabilitySlots.trainerUserId, trainerUserId));
        return json(response, 200, { slots: rows.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).map((slot) => ({ ...slot, startsAt: new Date(slot.startsAt).toISOString(), endsAt: new Date(slot.endsAt).toISOString() })) });
      }
      const body = await readBody(request);
      const startsAt = parseDate(body.startsAt), endsAt = parseDate(body.endsAt);
      if (!startsAt || !endsAt || startsAt <= new Date() || endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 8 * 60 * 60 * 1000) return json(response, 400, { error: "VALIDATION_ERROR", message: "Gelecekte, en fazla 8 saatlik geçerli bir aralık seçin." });
      const capacity = Number(body.capacity ?? 1);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return json(response, 400, { error: "VALIDATION_ERROR", message: "Kapasite 1 ile 20 arasında olmalıdır." });
      const status = body.status === "CANCELLED" ? "CANCELLED" : "OPEN";
      const overlap = await db.select({ id: availabilitySlots.id }).from(availabilitySlots).where(and(eq(availabilitySlots.trainerUserId, trainerUserId), ne(availabilitySlots.status, "CANCELLED"), lt(availabilitySlots.startsAt, endsAt), gt(availabilitySlots.endsAt, startsAt), body.id ? ne(availabilitySlots.id, body.id) : undefined)).limit(1);
      if (overlap.length) return json(response, 409, { error: "AVAILABILITY_OVERLAP", message: "Bu saat başka bir müsaitlik aralığıyla çakışıyor." });
      let saved;
      if (body.id) {
        saved = (await db.update(availabilitySlots).set({ startsAt, endsAt, capacity, status, updatedAt: new Date() }).where(and(eq(availabilitySlots.id, body.id), eq(availabilitySlots.trainerUserId, trainerUserId))).returning())[0];
        if (!saved) return json(response, 404, { error: "NOT_FOUND" });
      } else saved = (await db.insert(availabilitySlots).values({ trainerUserId, startsAt, endsAt, capacity, status }).returning())[0];
      await db.insert(auditEvents).values({ actorUserId: trainerUserId, action: "trainer.availability.update", subjectType: "AvailabilitySlot", subjectId: saved.id, result: "SUCCESS", correlationId: crypto.randomUUID(), metadataJson: JSON.stringify({ status, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), capacity }) });
      return json(response, 200, { slot: { ...saved, startsAt: new Date(saved.startsAt).toISOString(), endsAt: new Date(saved.endsAt).toISOString() } });
    } finally { await pool.end(); }
  } catch (error) { if (error instanceof SyntaxError) return json(response, 400, { error: "INVALID_JSON" }); return json(response, 503, { error: "AVAILABILITY_UNAVAILABLE" }); }
}
