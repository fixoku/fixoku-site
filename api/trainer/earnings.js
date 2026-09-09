import { and, desc, eq, ne } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { trainerEarningLedger } from "../../src/server/db/schema.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const asMinor = (value) => { const n = Number.parseInt(String(value), 10); return Number.isSafeInteger(n) ? n : 0; };

export default async function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(new Headers(Object.entries(request.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)])));
    if (!principal) return json(response, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "earnings.read", { role: "TRAINER" });
    if (denied) return json(response, denied.status, denied.body);
    const { db, pool } = createDb();
    try {
      const rows = await db.select().from(trainerEarningLedger)
        .where(and(eq(trainerEarningLedger.trainerUserId, principal.user.id), ne(trainerEarningLedger.status, "REVERSED")))
        .orderBy(desc(trainerEarningLedger.occurredAt));
      const entries = rows.map((row) => ({ id: row.id, type: row.entryType, status: row.status, amountMinor: asMinor(row.amountMinor), currency: row.currency, description: row.description, occurredAt: row.occurredAt, paidAt: row.paidAt, holdReason: row.holdReason, sourceType: row.sourceType, sourceId: row.sourceId, studentUserId: row.studentUserId, trainingProgramId: row.trainingProgramId }));
      const earnedMinor = entries.filter((e) => e.status !== "REVERSED").reduce((sum, e) => sum + e.amountMinor, 0);
      const paidMinor = entries.filter((e) => e.status === "PAID").reduce((sum, e) => sum + e.amountMinor, 0);
      const heldMinor = entries.filter((e) => e.status === "HELD").reduce((sum, e) => sum + e.amountMinor, 0);
      return json(response, 200, { currency: entries[0]?.currency || "TRY", summary: { earnedMinor, paidMinor, heldMinor, pendingMinor: earnedMinor - paidMinor }, entries, payout: "DEFERRED" });
    } finally { await pool.end(); }
  } catch { return json(response, 503, { error: "EARNINGS_UNAVAILABLE" }); }
}
