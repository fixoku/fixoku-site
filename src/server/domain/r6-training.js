const STAGES = new Set(["PRIMARY", "MIDDLE", "HIGH", "ADULT"]);
const TYPES = new Set(["FAST_READING", "PARAGRAPH"]);
const MODES = new Set(["INDIVIDUAL", "GROUP"]);

export const R6_TRAINING_STAGES = Object.freeze([...STAGES]);
export const R6_TRAINING_TYPES = Object.freeze([...TYPES]);
export const R6_TRAINING_MODES = Object.freeze([...MODES]);

const fail = (code) => Object.assign(new Error(code), { code, status: 400 });

export function normalizeR6GroupInput(input = {}) {
  const educationStage = String(input.educationStage || "").trim().toUpperCase();
  const rawTrainingType = String(input.trainingType || "").trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  const trainingType = rawTrainingType === "FAST_READING" || rawTrainingType === "FASTREADING" ? "FAST_READING" : rawTrainingType;
  const mode = String(input.mode || "").trim().toUpperCase();
  if (!STAGES.has(educationStage)) throw fail("R6_EDUCATION_STAGE_INVALID");
  if (!TYPES.has(trainingType)) throw fail("R6_TRAINING_TYPE_INVALID");
  if (!MODES.has(mode)) throw fail("R6_TRAINING_MODE_INVALID");

  const expectedMin = mode === "GROUP" ? 2 : 1;
  const expectedMax = mode === "GROUP" ? 5 : 1;
  const minStudents = input.minStudents == null || input.minStudents === "" ? expectedMin : Number(input.minStudents);
  const maxStudents = input.maxStudents == null || input.maxStudents === "" ? expectedMax : Number(input.maxStudents);
  if (!Number.isSafeInteger(minStudents) || !Number.isSafeInteger(maxStudents) || minStudents !== expectedMin || maxStudents !== expectedMax) {
    throw fail("R6_CAPACITY_INVALID");
  }

  const participantInput = Array.isArray(input.participants) ? input.participants : [];
  if (participantInput.length > maxStudents) throw fail("R6_PARTICIPANT_LIMIT_EXCEEDED");
  const seen = new Set();
  const participants = participantInput.map((participant) => {
    const studentUserId = String(participant?.studentUserId || "").trim();
    const childProfileId = participant?.childProfileId ? String(participant.childProfileId).trim() : null;
    const studentProfileId = participant?.studentProfileId ? String(participant.studentProfileId).trim() : null;
    const enrollmentId = participant?.enrollmentId ? String(participant.enrollmentId).trim() : null;
    if (!studentUserId || (!childProfileId && !studentProfileId)) throw fail("R6_PARTICIPANT_TARGET_REQUIRED");
    if (childProfileId && studentProfileId) throw fail("R6_PARTICIPANT_TARGET_AMBIGUOUS");
    if (seen.has(studentUserId)) throw fail("R6_DUPLICATE_PARTICIPANT");
    seen.add(studentUserId);
    return { studentUserId, childProfileId, studentProfileId, enrollmentId };
  });

  return {
    educationStage,
    trainingType,
    mode,
    minStudents,
    maxStudents,
    packageVersionId: input.packageVersionId ? String(input.packageVersionId).trim() : null,
    trainingProductId: input.trainingProductId ? String(input.trainingProductId).trim() : null,
    requiredQualificationId: input.requiredQualificationId ? String(input.requiredQualificationId).trim() : null,
    trainerUserId: input.trainerUserId ? String(input.trainerUserId).trim() : null,
    participants,
  };
}

export function r6GroupStatus({ trainerUserId, participantCount, minStudents }) {
  return trainerUserId && participantCount >= minStudents ? "ASSIGNED" : "DRAFT";
}

export function calculateR6PayoutFromMatrix(rows, trainingType, billableStudentCount) {
  const count = Number(billableStudentCount);
  if (!Number.isSafeInteger(count) || count < 1 || count > 5) return 0;
  const row = (rows || []).find((candidate) => String(candidate.training_type || candidate.trainingType).toUpperCase() === trainingType && Number(candidate.student_count ?? candidate.studentCount) === count);
  if (!row || !Number.isSafeInteger(Number(row.amount_minor ?? row.amountMinor))) throw Object.assign(new Error("R6_PAYOUT_MATRIX_MISSING"), { code: "R6_PAYOUT_MATRIX_MISSING", status: 409 });
  return Number(row.amount_minor ?? row.amountMinor);
}

export function completionMonthBounds(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw fail("R6_COMPLETION_DATE_INVALID");

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));

  // Tamamlanan egitim, izleyen ayin ilk is gununde odenebilir.
  // Bu fazda "is gunu" hafta sonu disi olarak tanimlidir.
  const payableAt = new Date(Date.UTC(year, month + 1, 1, 12, 0, 0, 0));
  const weekday = payableAt.getUTCDay();
  if (weekday === 6) payableAt.setUTCDate(payableAt.getUTCDate() + 2);
  else if (weekday === 0) payableAt.setUTCDate(payableAt.getUTCDate() + 1);

  return {
    payablePeriodStart: start.toISOString().slice(0, 10),
    payablePeriodEnd: end.toISOString().slice(0, 10),
    payableAt,
  };
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(String(value || ""));
}
