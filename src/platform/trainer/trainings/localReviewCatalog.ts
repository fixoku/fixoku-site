import { localReviewEnabled } from "../../../pages/local-review-data.js";

// Exact seed identities from phase2b-fixtures.mjs and seed-panel-003d-demo.mjs.
// This projection never changes production catalog data or entitlement resolution.
const acceptanceProgramSlugs = new Set([
  "phase2b-acceptance-student-program",
  "phase2b-acceptance-wrong-program",
  "demo-003d-trainer-qualification",
]);

export function trainerCatalogForReview<T extends { slug?: string }>(programs: T[]): T[] {
  return localReviewEnabled()
    ? programs.filter((program) => !acceptanceProgramSlugs.has(program.slug || ""))
    : programs;
}
