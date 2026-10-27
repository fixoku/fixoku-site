// RELEASE-017T LOCAL REVIEW ONLY: ephemeral in-process trainer video progress.
// No database reads/writes here, no cross-process persistence, resets on server restart.
const storeKey = Symbol.for("fixoku.release017t.videoPreviewProgress");
const store = globalThis[storeKey] || new Map();
if (!globalThis[storeKey]) globalThis[storeKey] = store;
const TTL_MS = 12 * 60 * 60 * 1000;
const keyOf = (userId, packageId) => `${userId}:${packageId}`;

function prune(now) {
  for (const [key, course] of store) if (now - course.touchedAt > TTL_MS) store.delete(key);
  // Local dev memory cap. Do not evict active records under normal usage.
  if (store.size > 2000) for (const key of store.keys()) { store.delete(key); if (store.size <= 1500) break; }
}
function courseFor(userId, packageId, create = false) {
  const now = Date.now();
  prune(now);
  const key = keyOf(userId, packageId);
  let course = store.get(key);
  if (!course && create) { course = { touchedAt: now, lessons: new Map() }; store.set(key, course); }
  if (course) course.touchedAt = now;
  return course;
}
export function previewProgress(userId, packageId, videoIndex) {
  const row = courseFor(userId, packageId)?.lessons.get(videoIndex);
  if (!row) return null;
  return { videoIndex, durationSeconds: row.duration, coverageBps: row.coverageBps, lastPositionSeconds: row.position, endedSeen: row.endedSeen, completedAt: row.completedAt };
}
export function previewUnlocked(userId, packageId, videoIndex) {
  if (videoIndex === 1) return true;
  return Boolean(previewProgress(userId, packageId, videoIndex - 1)?.completedAt);
}
function mergeRanges(ranges) {
  const result = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = result[result.length - 1];
    if (last && start <= last[1] + 0.05) last[1] = Math.max(last[1], end);
    else result.push([start, end]);
  }
  return result;
}
const reject = (code) => Object.assign(new Error(code), { code, status: 409 });
export function previewRecord(userId, packageId, input, lessonsCount) {
  const videoIndex = Number(input.videoIndex);
  const duration = Number(input.durationSeconds);
  const start = Number(input.startSeconds);
  const end = Number(input.endSeconds);
  if (!Number.isInteger(videoIndex) || videoIndex < 1 || videoIndex > lessonsCount || !Number.isFinite(duration) || duration < 1 || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration + 1 || end - start > 20) throw Object.assign(new Error("VIDEO_HEARTBEAT_INVALID"), { status: 400 });
  if (!previewUnlocked(userId, packageId, videoIndex)) throw Object.assign(new Error("VIDEO_LOCKED"), { status: 403 });
  const now = Date.now();
  const course = courseFor(userId, packageId, true);
  let row = course.lessons.get(videoIndex);
  if (!row) {
    if (start > 1) throw reject("VIDEO_FORWARD_SEEK_REJECTED");
    row = { duration, ranges: [], coverageBps: 0, position: 0, endedSeen: false, completedAt: null, startedAt: now - 2500, lastAt: now - 2500 };
    course.lessons.set(videoIndex, row);
  }
  if (Math.abs(row.duration - duration) > 3) throw reject("VIDEO_DURATION_CONFLICT");
  if (start > row.position + 2) throw reject("VIDEO_FORWARD_SEEK_REJECTED");
  const elapsedSeconds = Math.max(0, (now - row.lastAt) / 1000);
  if (end > row.position + elapsedSeconds + 4) throw reject("VIDEO_FORWARD_SEEK_REJECTED");
  if (end > (now - row.startedAt) / 1000 + 4) throw reject("VIDEO_HEARTBEAT_TOO_FAST");
  row.ranges = mergeRanges([...row.ranges, [Math.max(0, start), Math.min(duration, end)]]);
  const watched = row.ranges.reduce((total, [a, b]) => total + Math.max(0, b - a), 0);
  row.coverageBps = Math.min(10000, Math.floor((watched / duration) * 10000));
  row.position = Math.max(row.position, Math.min(duration, end));
  row.lastAt = now;
  if (input.ended === true && end >= duration - 2) row.endedSeen = true;
  if (!row.completedAt && row.coverageBps >= 9500 && row.endedSeen) row.completedAt = new Date(now).toISOString();
  return { progress: previewProgress(userId, packageId, videoIndex), nextUnlocked: Boolean(row.completedAt && videoIndex < lessonsCount) };
}
