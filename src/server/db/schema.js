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
export const trainingProgramAudience = pgEnum("training_program_audience", ["TRAINER", "STUDENT"]);
export const trainingProgramStatus = pgEnum("training_program_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const entitlementStatus = pgEnum("trainer_entitlement_status", ["ACTIVE", "REVOKED"]);
export const trainingPrograms = pgTable("training_programs", {
  id: uuid("id").defaultRandom().primaryKey(), slug: text("slug").notNull().unique(), title: text("title").notNull(), shortDescription: text("short_description").notNull(), audience: trainingProgramAudience("audience").notNull(), status: trainingProgramStatus("status").notNull().default("DRAFT"), displayOrder: text("display_order").notNull().default("0"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const trainerEntitlements = pgTable("trainer_entitlements", {
  id: uuid("id").defaultRandom().primaryKey(), trainerUserId: uuid("trainer_user_id").notNull().references(() => users.id, { onDelete: "restrict" }), trainingProgramId: uuid("training_program_id").notNull().references(() => trainingPrograms.id, { onDelete: "restrict" }), status: entitlementStatus("status").notNull().default("ACTIVE"), startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(), expiresAt: timestamp("expires_at", { withTimezone: true }), revokedAt: timestamp("revoked_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("trainer_entitlements_trainer_program_start_uq").on(table.trainerUserId, table.trainingProgramId, table.startsAt)]);
export const presentationStatus = pgEnum("presentation_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const presentations = pgTable("presentations", {
  id: uuid("id").defaultRandom().primaryKey(), slug: text("slug").notNull().unique(), title: text("title").notNull(), shortDescription: text("short_description").notNull(), trainingProgramId: uuid("training_program_id").references(() => trainingPrograms.id, { onDelete: "restrict" }), status: presentationStatus("status").notNull().default("DRAFT"), displayOrder: text("display_order").notNull().default("0"), slideCount: text("slide_count"), videoCount: text("video_count"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("presentations_training_program_order_uq").on(table.trainingProgramId, table.displayOrder)]);
