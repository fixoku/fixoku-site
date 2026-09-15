/* global process */
import { eq } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { memberships, users } from "../db/schema.js";

export const ROLE_PANEL = Object.freeze({ OWNER: "/panel/owner", SUPER_ADMIN: "/panel/admin", TRAINER: "/panel/egitmen", STUDENT: "/panel/ogrenci", GUARDIAN: "/panel/ogrenci" });
const OPERATIONAL_ADMIN_PERMISSIONS = ["user.manage", "membership.manage", "audit.read", "package.manage", "order.read", "trainer.profile.read", "trainer.profile.update", "trainer.training.read", "trainer.presentation.read", "trainer.resource.read", "schedule.read", "availability.manage", "qualification.manage", "assignment.manage", "student.profile.read"];
const OWNER_FINANCE_PERMISSIONS = ["finance.read", "finance.export", "finance.adjust", "payout.manage", "profitability.read"];
export const ROLE_PERMISSIONS = Object.freeze({ OWNER: [...OPERATIONAL_ADMIN_PERMISSIONS, ...OWNER_FINANCE_PERMISSIONS, "student.profile.update", "trainer.payout.read"], SUPER_ADMIN: OPERATIONAL_ADMIN_PERMISSIONS, TRAINER: ["trainer.read", "trainer.profile.read", "trainer.profile.update", "trainer.training.read", "trainer.presentation.read", "trainer.resource.read", "trainer.payout.read", "trainer.payout.update", "student.read", "schedule.read", "availability.manage", "earnings.read", "content.read", "qualification.read"], STUDENT: ["student.read", "student.profile.read", "student.profile.update", "enrollment.read", "package.read", "order.create", "content.read", "schedule.read"], GUARDIAN: ["student.read", "student.profile.read", "enrollment.read", "package.read", "order.create", "content.read", "schedule.read"] });
const KNOWN_ROLES = new Set(Object.keys(ROLE_PANEL));
const KNOWN_PERMISSIONS = new Set(Object.values(ROLE_PERMISSIONS).flat());

export function privilegedTwoFactorRequired(principal) {
  if (process.env.LOCAL_REVIEW_MODE === "1") return false;
  const enforced = process.env.NODE_ENV === "production" || process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA === "1";
  return Boolean(enforced && principal?.memberships?.some((m) => ["OWNER", "SUPER_ADMIN"].includes(m.role)) && principal?.session?.user?.twoFactorEnabled !== true);
}


export function validScopeType(membership, ownerId = undefined) {
  if (!membership || membership.status !== "ACTIVE" || !KNOWN_ROLES.has(membership.role)) return false;
  if (["OWNER", "SUPER_ADMIN"].includes(membership.role)) return membership.scopeType === "GLOBAL" && membership.scopeId == null;
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
    // Guardian membership grants portal entry, including its truthful empty
    // state. scopeId is never child authority: resource reads must validate
    // guardian_student_relationships against the requested StudentProfile.
    return { session, user: rows[0].user, memberships: candidates };
  } finally { await pool.end(); }
}

export async function requireSession(headers) {
  const principal = await resolvePrincipal(headers);
  return principal ? { principal } : { status: 401, body: { error: "UNAUTHENTICATED" } };
}

export function requireMembership(principal, role, options = {}) {
  if (["OWNER", "SUPER_ADMIN"].includes(role) && privilegedTwoFactorRequired(principal)) return { status: 403, body: { error: "TWO_FACTOR_REQUIRED" } };
  if (!principal) return { status: 401, body: { error: "UNAUTHENTICATED" } };
  const matches = principal.memberships.filter((m) => m.role === role && validScopeType(m));
  if (!matches.length || (options.scopeId && !matches.some((m) => String(m.scopeId) === String(options.scopeId)))) return { status: 403, body: { error: "FORBIDDEN" } };
  return null;
}
export function requireRole(principal, role) { return requireMembership(principal, role); }

export function requirePermission(principal, permission, resource = undefined) {
  if (privilegedTwoFactorRequired(principal)) return { status: 403, body: { error: "TWO_FACTOR_REQUIRED" } };
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
