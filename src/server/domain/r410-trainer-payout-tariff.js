import crypto from 'node:crypto';

const MAX_GROUP_SEATS = 5;
const isMinor = (n) => Number.isSafeInteger(n) && n > 0;
const validId = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const fail = (code) => { throw Object.assign(new Error(code), {code}); };

// Owner-entered amounts, stored as whole kurus. No example amount becomes a production default.
export function validateOwnerPayoutTariff(tariff) {
  if (!tariff || !isMinor(tariff.individualMinor) || !Array.isArray(tariff.groupMinor) || tariff.groupMinor.length !== MAX_GROUP_SEATS || !tariff.groupMinor.every(isMinor)) fail('R410_TARIFF_MISSING_OR_INVALID');
  if (!Number.isSafeInteger(tariff.version) || tariff.version < 1) fail('R410_TARIFF_VERSION_INVALID');
  return Object.freeze({version: tariff.version, individualMinor: tariff.individualMinor, groupMinor: Object.freeze([...tariff.groupMinor])});
}

export function quoteOwnerPayout({tariff,mode,activeStudentCount,trainerId,studentId,classId,assignmentId}) {
  const t = validateOwnerPayoutTariff(tariff);
  if (!validId(trainerId) || !validId(studentId) || !validId(assignmentId)) fail('R410_PAYOUT_ID_INVALID');
  if (!['INDIVIDUAL','GROUP'].includes(mode)) fail('R410_PAYOUT_MODE_INVALID');
  if (mode === 'GROUP' && !validId(classId)) fail('R410_CLASS_ID_INVALID');
  if (mode === 'INDIVIDUAL' && classId != null) fail('R410_INDIVIDUAL_CLASS_UNEXPECTED');
  if (!Number.isInteger(activeStudentCount) || activeStudentCount < 0 || activeStudentCount >= MAX_GROUP_SEATS) fail('R410_CLASS_CAPACITY_INVALID');
  if (mode === 'INDIVIDUAL' && activeStudentCount !== 0) fail('R410_INDIVIDUAL_OCCUPANCY_INVALID');
  const studentOrder = mode === 'GROUP' ? activeStudentCount + 1 : 1;
  const amountMinor = mode === 'GROUP' ? t.groupMinor[studentOrder - 1] : t.individualMinor;
  const facts = {trainerId,studentId,assignmentId,classId:classId ?? null,mode,studentOrder,activeStudentCount,tariffVersion:t.version,amountMinor,currency:'TRY'};
  const approvalFingerprint = crypto.createHash('sha256').update(JSON.stringify(facts)).digest('hex');
  return Object.freeze({...facts,approvalFingerprint,displayText:mode === 'GROUP' ? `${studentOrder}. öğrenci için tanımlanan hakediş` : 'Birebir eğitim için tanımlanan hakediş'});
}

// This must be called WITHIN the class-row-locked transaction by the assignment API.
// It confirms the Owner-approved quote matches current occupancy and current tariff.
export function confirmOwnerPayout({approvedQuote,currentQuote,ownerApproved,ownerId}) {
  if (ownerApproved !== true || !validId(ownerId)) fail('R410_OWNER_APPROVAL_REQUIRED');
  if (!approvedQuote || !currentQuote || !/^[a-f0-9]{64}$/.test(String(approvedQuote.approvalFingerprint ?? '')) || approvedQuote.approvalFingerprint !== currentQuote.approvalFingerprint) fail('R410_PAYOUT_STALE_QUOTE');
  return Object.freeze({ownerId,trainerId:currentQuote.trainerId,studentId:currentQuote.studentId,assignmentId:currentQuote.assignmentId,classId:currentQuote.classId,seat:currentQuote.studentOrder,amountMinor:currentQuote.amountMinor,currency:'TRY',tariffVersion:currentQuote.tariffVersion,approvalFingerprint:currentQuote.approvalFingerprint});
}