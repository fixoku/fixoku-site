import { boolean, pgEnum, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const membershipScopeType = pgEnum("membership_scope_type", ["GLOBAL", "INSTITUTION", "TRAINER", "STUDENT"]);
export const membershipRole = pgEnum("membership_role", ["SUPER_ADMIN", "TRAINER", "STUDENT", "GUARDIAN"]);
export const membershipStatus = pgEnum("membership_status", ["ACTIVE", "SUSPENDED", "REVOKED"]);
export const users = pgTable("platform_users", {
  id: uuid("id").defaultRandom().primaryKey(), authUserId: text("auth_user_id").notNull().unique(), email: text("email").notNull().unique(), displayName: text("display_name").notNull(), emailVerified: boolean("email_verified").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const memberships = pgTable("platform_memberships", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }), scopeType: membershipScopeType("scope_type").notNull(), scopeId: uuid("scope_id"), role: membershipRole("role").notNull(), status: membershipStatus("status").notNull().default("ACTIVE"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("platform_memberships_user_scope_role_uq").on(table.userId, table.scopeType, table.scopeId, table.role)]);
export const auditEvents = pgTable("platform_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(), actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }), action: text("action").notNull(), subjectType: text("subject_type").notNull(), subjectId: text("subject_id").notNull(), result: text("result").notNull(), correlationId: text("correlation_id").notNull(), metadataJson: text("metadata_json").notNull().default("{}"), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});
export const trainerProfiles = pgTable("trainer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "restrict" }),
  phone: text("phone"), city: text("city"), profession: text("profession"), institution: text("institution"), bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
