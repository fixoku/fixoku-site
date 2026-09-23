export type EducationStage = "PRIMARY" | "MIDDLE" | "HIGH" | "ADULT";
export const EDUCATION_STAGES: readonly EducationStage[];
export const EDUCATION_STAGE_GRADES: Readonly<Record<EducationStage, readonly number[]>>;
export const EDUCATION_STAGE_LABELS: Readonly<Record<EducationStage, string>>;
export function normalizeEducationStage(value: unknown): EducationStage | null;
export function normalizeGrade(value: unknown): number | null;
export function validateEducationSegment(stageValue: unknown, gradeValue: unknown): { educationStage: EducationStage; grade: string | null };
export function isPackageEligibleForSegment(input: { packageStage: EducationStage; eligibleGrades: number[] }, segment: { educationStage: EducationStage; grade: string | null }): boolean;
