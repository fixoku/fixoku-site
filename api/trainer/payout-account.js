import { eq } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { auditEvents, trainerPayoutAccounts } from "../../src/server/db/schema.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const normalizeIban = (value) => String(value || "").replace(/[\s-]/gu, "").toUpperCase();
function validIban(value) { const iban = normalizeIban(value); if (!/^TR[0-9]{24}$/u.test(iban)) return false; const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`; let remainder = 0; for (const char of rearranged) { const digits = char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char; for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97; } return remainder === 1; }
async function readBody(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
const view = (row, full = true) => row ? { configured: true, accountHolderName: full ? row.accountHolderName : undefined, bankName: full ? row.bankName : undefined, iban: full ? row.iban : undefined, ibanMasked: row.iban ? `${row.iban.slice(0, 4)} **** **** **** ${row.iban.slice(-4)}` : null, note: full ? row.note : undefined, updatedAt: row.updatedAt } : { configured: false, ibanMasked: null };
export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, req.method === "GET" ? "trainer.payout.read" : "trainer.payout.update", { role: "TRAINER" }); if (denied) return json(res, denied.status, denied.body);
    const { db, pool } = createDb();
    try {
      const current = (await db.select().from(trainerPayoutAccounts).where(eq(trainerPayoutAccounts.trainerUserId, principal.user.id)).limit(1))[0];
      if (req.method === "GET") return json(res, 200, { payoutAccount: view(current, true) });
      const body = await readBody(req); const holder = String(body.accountHolderName || "").trim(); const bank = String(body.bankName || "").trim(); const iban = normalizeIban(body.iban); const note = body.note == null ? null : String(body.note).trim();
      if (holder.length < 2 || holder.length > 120 || bank.length < 2 || bank.length > 120 || !validIban(iban) || (note && note.length > 300)) return json(res, 400, { error: "PAYOUT_ACCOUNT_VALIDATION_ERROR", errors: { accountHolderName: holder.length < 2 ? "Hesap sahibi zorunludur." : undefined, bankName: bank.length < 2 ? "Banka adı zorunludur." : undefined, iban: "Geçerli bir TR IBAN girin." } });
      const values = { accountHolderName: holder, bankName: bank, iban, note, updatedAt: new Date() };
      const saved = current ? (await db.update(trainerPayoutAccounts).set(values).where(eq(trainerPayoutAccounts.trainerUserId, principal.user.id)).returning())[0] : (await db.insert(trainerPayoutAccounts).values({ trainerUserId: principal.user.id, ...values }).returning())[0];
      await db.insert(auditEvents).values({ actorUserId: principal.user.id, action: "trainer.payout_account.update", subjectType: "TrainerPayoutAccount", subjectId: saved.id, result: "SUCCESS", correlationId: crypto.randomUUID(), metadataJson: JSON.stringify({ fields: ["accountHolderName", "bankName", "iban", "note"], ibanLast4: iban.slice(-4) }) });
      return json(res, 200, { payoutAccount: view(saved, true) });
    } finally { await pool.end(); }
  } catch (error) { if (error instanceof SyntaxError) return json(res, 400, { error: "INVALID_JSON" }); return json(res, 503, { error: "PAYOUT_ACCOUNT_UNAVAILABLE" }); }
}

export { normalizeIban, validIban };
