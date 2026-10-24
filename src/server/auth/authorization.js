/* global process */
import { eq } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { memberships, users } from "../db/schema.js";
import { localReviewRuntimeAllowed } from "./local-review-runtime.js";

export const ROLE_PANEL = Object.freeze({ OWNER: "/panel/owner", SUPER_ADMIN: "/panel/admin", TRAINER: "/panel/egitmen", STUDENT: "/panel/ogrenci", GUARDIAN: "/panel/ogrenci" });
export const PACKAGE_PERMISSIONS = Object.freeze({ READ: "PACKAGE_READ", CREATE: "PACKAGE_CREATE", EDIT: "PACKAGE_EDIT", PRICE_EDIT: "PACKAGE_PRICE_EDIT", PUBLISH: "PACKAGE_PUBLISH" });
export function packagePermissionFor(method, action = "") {
  if (method === "GET") return PACKAGE_PERMISSIONS.READ;
  if (action === "publish") return PACKAGE_PERMISSIONS.PUBLISH;
  if (action === "createDraft" || method === "POST" && !action) return PACKAGE_PERMISSIONS.CREATE;
  if (action === "componentsSave") return PACKAGE_PERMISSIONS.EDIT;
  if (action === "retire") return PACKAGE_PERMISSIONS.PUBLISH;
  return PACKAGE_PERMISSIONS.EDIT;
}
const OPERATIONAL_ADMIN_PERMISSIONS = ["user.manage", "membership.manage", "audit.read", "package.manage", "product.manage", "shipment.read", "shipment.manage", "provider.read", "trainer_package.read", "trainer_package.create", "trainer_package.update", "trainer_package.archive", "trainer_package.assign", "bank_transfer.review", "bank_transfer.approve", "order.read", "trainer.profile.read", "trainer.profile.update", "trainer.training.read", "trainer.presentation.read", "trainer.resource.read", "education.program.manage", "education.presentation.manage", "education.resource.manage", "schedule.read", "availability.manage", "qualification.manage", "assignment.manage", "student.profile.read", "offer.manage", "training_group.manage", "training_group.read", "review.read", "child_profile.manage", "payout_rule.manage"];
const OWNER_FINANCE_PERMISSIONS = ["finance.read", "finance.export", "finance.adjust", "payout.manage", "profitability.read"];
export const ROLE_PERMISSIONS = Object.freeze({ OWNER: [...OPERATIONAL_ADMIN_PERMISSIONS, ...OWNER_FINANCE_PERMISSIONS, "student.profile.update", "trainer.payout.read"], SUPER_ADMIN: OPERATIONAL_ADMIN_PERMISSIONS, TRAINER: ["trainer.read", "trainer.profile.read", "trainer.profile.update", "trainer.training.read", "trainer.presentation.read", "trainer.resource.read", "trainer.payout.read", "trainer.payout.update", "student.read", "schedule.read", "availability.manage", "earnings.read", "content.read", "qualification.read", "training_group.read", "review.read", "order.create"], STUDENT: ["student.read", "student.profile.read", "student.profile.update", "child_profile.manage", "enrollment.read", "package.read", "order.create", "content.read", "schedule.read", "review.submit"], GUARDIAN: ["student.read", "student.profile.read", "child_profile.manage", "enrollment.read", "package.read", "order.create", "content.read", "schedule.read", "review.submit"] });
const KNOWN_ROLES = new Set(Object.keys(ROLE_PANEL));
const KNOWN_PERMISSIONS = new Set(Object.values(ROLE_PERMISSIONS).flat());

export function privilegedTwoFactorRequired(principal) {
  const productionLike = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || String(process.env.VERCEL_ENV || "").toLowerCase() === "production";
  if (!productionLike && (localReviewRuntimeAllowed(process.env) || process.env.LOCAL_REVIEW_MODE === "1")) return false;
  const productionEnforced = productionLike || process.env.FIXOKU_REQUIRE_PRIVILEGED_2FA === "1";
  const roles = new Set(principal?.memberships?.map((membership) => membership.role) || []);
  // Production can temporarily permit the explicitly configured first Owner
  // to enter with email + password while keeping SUPER_ADMIN 2FA enforced.
  // The global switch is never allowed to weaken SUPER_ADMIN in production.
  const ownerEnforced = roles.has("OWNER") && process.env.FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA !== "0" && productionEnforced;
  const superAdminEnforced = roles.has("SUPER_ADMIN") && productionEnforced;
  return Boolean((ownerEnforced || superAdminEnforced) && principal?.session?.user?.twoFactorEnabled !== true);
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

export async function requirePackagePermission(client, principal, permission) {
  if (!Object.values(PACKAGE_PERMISSIONS).includes(permission)) return { status: 403, body: { error: "FORBIDDEN" } };
  if (!principal) return { status: 401, body: { error: "UNAUTHENTICATED" } };
  if (privilegedTwoFactorRequired(principal)) return { status: 403, body: { error: "TWO_FACTOR_REQUIRED" } };
  const membership = principal.memberships?.find((candidate) => candidate.status === "ACTIVE" && validScopeType(candidate) && ["OWNER", "SUPER_ADMIN"].includes(candidate.role) && candidate.scopeType === "GLOBAL" && candidate.scopeId == null && String(candidate.userId || "") === String(principal.user?.id || ""));
  if (!membership) return { status: 403, body: { error: "FORBIDDEN" } };
  if (membership.role === "OWNER") return null;
  try {
    const row = (await client.query("select 1 from owner_admin_package_permissions where admin_user_id=$1 and permission=$2::package_permission_code and revoked_at is null limit 1", [principal.user.id, permission])).rows[0];
    return row ? null : { status: 403, body: { error: "PACKAGE_PERMISSION_REQUIRED" } };
  } catch {
    return { status: 403, body: { error: "PACKAGE_PERMISSION_REQUIRED" } };
  }
}

/** A multi-role principal receives an explicit chooser; role precedence is never implicit. */
export function resolvePanelDestination(principal) {
  if (!principal?.memberships?.length) return null;
  const roles = [...new Set(principal.memberships.filter((m) => validScopeType(m)).map((m) => m.role))];
  if (!roles.length) return null;
  const destinations = roles.map((role) => ROLE_PANEL[role]);
  return destinations.length === 1 ? { kind: "single", destination: destinations[0], roles } : { kind: "chooser", destination: null, destinations, roles };
}
