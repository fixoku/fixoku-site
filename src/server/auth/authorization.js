import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { memberships, users } from "../db/schema.js";

export const ROLE_PANEL = Object.freeze({ SUPER_ADMIN: "/panel/admin", TRAINER: "/panel/egitmen", STUDENT: "/panel/ogrenci", GUARDIAN: "/panel/ogrenci" });
export const ROLE_PERMISSIONS = Object.freeze({ SUPER_ADMIN: ["user.manage", "membership.manage", "audit.read", "trainer.profile.read", "trainer.profile.update"], TRAINER: ["trainer.read", "trainer.profile.read", "trainer.profile.update", "student.read", "schedule.read", "earning.read", "content.read", "qualification.read"], STUDENT: ["student.read", "enrollment.read", "content.read", "schedule.read"], GUARDIAN: ["student.read", "enrollment.read", "content.read", "schedule.read"] });
const KNOWN_ROLES = new Set(Object.keys(ROLE_PANEL));
const KNOWN_PERMISSIONS = new Set(Object.values(ROLE_PERMISSIONS).flat());

export function validScopeType(membership, ownerId = undefined) {
  if (!membership || membership.status !== "ACTIVE" || !KNOWN_ROLES.has(membership.role)) return false;
  if (membership.role === "SUPER_ADMIN") return membership.scopeType === "GLOBAL" && membership.scopeId == null;
  if (membership.role === "TRAINER") return membership.scopeType === "TRAINER" && (ownerId === undefined || String(membership.scopeId) === String(ownerId));
  if (membership.role === "STUDENT") return membership.scopeType === "STUDENT" && (ownerId === undefined || String(membership.scopeId) === String(ownerId));
  return membership.role === "GUARDIAN" && membership.scopeType === "STUDENT";
}

/** No session returns null; authenticated principals with no valid membership are retained for 403. */
export async function resolvePrincipal(headers) {
  const { auth } = await import("./auth.js");
  const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
  if (!session) return null;
  const { db, pool } = createDb();
  try {
    const rows = await db.select({ user: users, membership: memberships }).from(users).leftJoin(memberships, eq(memberships.userId, users.id)).where(eq(users.authUserId, session.user.id));
    if (!rows.length) return { session, user: null, memberships: [] };
    const ownerId = rows[0].user.id;
    const candidates = rows.map((row) => row.membership).filter(Boolean).filter((m) => validScopeType(m, ownerId));
    const validMemberships = [];
    for (const membership of candidates) {
      if (membership.role !== "GUARDIAN") { validMemberships.push(membership); continue; }
      if (!membership.scopeId) continue;
      const linked = await db.select({ id: memberships.userId }).from(memberships).where(and(eq(memberships.userId, membership.scopeId), eq(memberships.role, "STUDENT"), eq(memberships.scopeType, "STUDENT"), eq(memberships.status, "ACTIVE"))).limit(1);
      if (linked.length) validMemberships.push(membership);
    }
    return { session, user: rows[0].user, memberships: validMemberships };
  } finally { await pool.end(); }
}

export async function requireSession(headers) {
  const principal = await resolvePrincipal(headers);
  return principal ? { principal } : { status: 401, body: { error: "UNAUTHENTICATED" } };
}

export function requireMembership(principal, role, options = {}) {
  if (!principal) return { status: 401, body: { error: "UNAUTHENTICATED" } };
  const matches = principal.memberships.filter((m) => m.role === role && validScopeType(m));
  if (!matches.length || (options.scopeId && !matches.some((m) => String(m.scopeId) === String(options.scopeId)))) return { status: 403, body: { error: "FORBIDDEN" } };
  return null;
}
export function requireRole(principal, role) { return requireMembership(principal, role); }

export function requirePermission(principal, permission, resource = undefined) {
  if (!principal) return { status: 401, body: { error: "UNAUTHENTICATED" } };
  if (!KNOWN_PERMISSIONS.has(permission) || !principal.memberships.some((m) => validScopeType(m) && ROLE_PERMISSIONS[m.role].includes(permission))) return { status: 403, body: { error: "FORBIDDEN" } };
  if (resource?.role && !principal.memberships.some((m) => m.role === resource.role)) return { status: 403, body: { error: "FORBIDDEN" } };
  return null;
}

/** A multi-role principal receives an explicit chooser; role precedence is never implicit. */
export function resolvePanelDestination(principal) {
  if (!principal?.memberships?.length) return null;
  const roles = [...new Set(principal.memberships.filter((m) => validScopeType(m)).map((m) => m.role))];
  if (!roles.length) return null;
  const destinations = roles.map((role) => ROLE_PANEL[role]);
  return destinations.length === 1 ? { kind: "single", destination: destinations[0], roles } : { kind: "chooser", destination: null, destinations, roles };
}
