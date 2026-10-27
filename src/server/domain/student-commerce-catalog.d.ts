import type { EducationStage } from "./student-segment.js";
export type StudentCommercePackageSeed = { stage: EducationStage; grades: number[]; slug: string; title: string; subtitle: string; displayOrder: number };
export const STUDENT_COMMERCE_PACKAGE_MATRIX: readonly StudentCommercePackageSeed[];
export function packageFamiliesForStage(stage: EducationStage): StudentCommercePackageSeed[];
