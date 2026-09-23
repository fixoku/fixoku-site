export const EDUCATION_STAGES = Object.freeze(["PRIMARY", "MIDDLE", "HIGH", "ADULT"]);

export const EDUCATION_STAGE_GRADES = Object.freeze({
  PRIMARY: Object.freeze([3, 4]),
  MIDDLE: Object.freeze([5, 6, 7, 8]),
  HIGH: Object.freeze([9, 10, 11, 12]),
  ADULT: Object.freeze([]),
});

export const EDUCATION_STAGE_LABELS = Object.freeze({
  PRIMARY: "İlkokul Öğrencisi",
  MIDDLE: "Ortaokul Öğrencisi",
  HIGH: "Lise Öğrencisi",
  ADULT: "Yetişkin",
});

function validationError(code) {
  return Object.assign(new Error(code), { code, status: 400 });
}

export function normalizeEducationStage(value) {
  const stage = String(value || "").trim().toUpperCase();
  return EDUCATION_STAGES.includes(stage) ? stage : null;
}

export function normalizeGrade(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).trim().replace(/\.?\s*sınıf$/iu, "").trim();
  if (!/^\d{1,2}$/u.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function validateEducationSegment(stageValue, gradeValue) {
  const educationStage = normalizeEducationStage(stageValue);
  if (!educationStage) throw validationError("EDUCATION_STAGE_INVALID");
  const grade = normalizeGrade(gradeValue);
  if (educationStage === "ADULT") {
    if (grade !== null) throw validationError("EDUCATION_STAGE_GRADE_INVALID");
    return { educationStage, grade: null };
  }
  if (!Number.isInteger(grade) || !EDUCATION_STAGE_GRADES[educationStage].includes(grade)) throw validationError("EDUCATION_STAGE_GRADE_INVALID");
  return { educationStage, grade: String(grade) };
}

export function isPackageEligibleForSegment({ packageStage, eligibleGrades }, { educationStage, grade }) {
  if (packageStage !== educationStage) return false;
  if (educationStage === "ADULT") return grade === null;
  return Array.isArray(eligibleGrades) && eligibleGrades.map(Number).includes(Number(grade));
}
