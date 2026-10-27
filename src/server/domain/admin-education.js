import { z } from "zod";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export const EDUCATION_STATUSES = Object.freeze(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const RESOURCE_TYPES = Object.freeze(["CERTIFICATE", "CATALOG", "PROMOTIONAL"]);

const textField = (min, max) => z.string().trim().min(min).max(max);
const displayOrderField = z.union([z.string(), z.number()]).transform((value) => String(value).trim()).refine((value) => /^\d{1,6}$/u.test(value), "displayOrder");
const slugField = z.string().trim().transform((value) => value.toLowerCase()).pipe(z.string().regex(SLUG_PATTERN));

export const programSchema = z.object({
  title: textField(2, 180),
  slug: slugField,
  shortDescription: textField(1, 2000),
  audience: z.enum(["STUDENT", "TRAINER"]),
  displayOrder: displayOrderField,
});
export const programPatchSchema = programSchema.partial().refine((value) => Object.keys(value).length > 0, "fields");

const contentSchema = z.object({
  title: textField(2, 180),
  slug: slugField,
  shortDescription: textField(1, 2000),
  trainingProgramId: z.string().trim().regex(UUID_PATTERN),
  displayOrder: displayOrderField,
});
export const presentationSchema = contentSchema.extend({
  slideCount: z.union([z.string(), z.number()]).optional().nullable().transform((value) => value == null || String(value).trim() === "" ? null : String(value).trim()).refine((value) => value == null || /^\d{1,6}$/u.test(value), "slideCount"),
  videoCount: z.union([z.string(), z.number()]).optional().nullable().transform((value) => value == null || String(value).trim() === "" ? null : String(value).trim()).refine((value) => value == null || /^\d{1,6}$/u.test(value), "videoCount"),
});
export const presentationPatchSchema = presentationSchema.partial().refine((value) => Object.keys(value).length > 0, "fields");
export const resourceSchema = contentSchema.extend({ resourceType: z.enum(RESOURCE_TYPES) });
export const resourcePatchSchema = resourceSchema.partial().refine((value) => Object.keys(value).length > 0, "fields");

export function parseInput(schema, value) {
  const parsed = schema.safeParse(value && typeof value === "object" ? value : {});
  if (!parsed.success) throw Object.assign(new Error("INVALID_INPUT"), { status: 400, code: "INVALID_INPUT" });
  return parsed.data;
}

export function safeMutationError(error, yedek = "EDUCATION_MUTATION_FAILED") {
  if (error?.code === "23505") return { status: 409, error: String(error.constraint || "").includes("slug") ? "SLUG_ALREADY_EXISTS" : "INVALID_INPUT" };
  if (error?.status && [400, 404, 409].includes(error.status)) return { status: error.status, error: error.code || error.message || yedek };
  return { status: 400, error: yedek };
}

export function assertTransition(current, action) {
  if (action === "publish" && current === "DRAFT") return "PUBLISHED";
  if (action === "archive" && ["DRAFT", "PUBLISHED"].includes(current)) return "ARCHIVED";
  throw Object.assign(new Error("INVALID_STATUS_TRANSITION"), { status: 409, code: "INVALID_STATUS_TRANSITION" });
}

export function actionName(kind, action) {
  return `education.${kind}.${action === "publish" ? "published" : action === "archive" ? "archived" : action === "update" ? "updated" : "created"}`;
}
