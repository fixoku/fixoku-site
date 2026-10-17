// FIXOKU 018A: pure, testable rules for local trainer follow-up.
export const MIN_DAYS = 21;
export const MIN_MS = MIN_DAYS * 24 * 60 * 60 * 1000;
export const validUuid = (id) => /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(String(id || ''));
export const trackingKey = (kind, id) => `${kind}-${id}`;
export function eligibleToComplete(members, marks, now = Date.now()) {
  if (!Array.isArray(members) || members.length === 0) return { ready: false, reason: 'NO_STUDENTS', daysLeft: null };
  const dates = members.map(id => marks?.[id]?.plannedAt).map(v => v && Date.parse(v));
  if (dates.some(v => !Number.isFinite(v) || v <= 0 || v > now)) return { ready: false, reason: 'STUDENTS_NOT_ALL_PLANNED', daysLeft: null };
  const last = Math.max(...dates);
  const left = Math.ceil(Math.max(0, last + MIN_MS - now) / 86400000);
  return { ready: left === 0, reason: left === 0 ? 'READY' : 'WAIT_21_DAYS', daysLeft: left, lastPlannedAt: new Date(last).toISOString() };
}
