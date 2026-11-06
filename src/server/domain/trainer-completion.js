import { grantTrainerPackageCompletionExpertise } from "./trainer-expertise.js";

const fail = (code, status = 409) => Object.assign(new Error(code), { code, status });
const progressIndex = (videoIndex) => 1000 + videoIndex;
const mergeRanges = (ranges) => {
  const output = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = output.at(-1);
    if (last && start <= last[1] + 0.05) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
};
const rowResult = (row, videoIndex) => row ? {
  videoIndex,
  durationSeconds: Number(row.duration_seconds),
  coverageBps: Number(row.coverage_bps),
  lastPositionSeconds: Number(row.last_position_seconds),
  endedSeen: Boolean(row.ended_seen),
  completedAt: row.completed_at,
} : null;

export async function readTrainerVideoProgress(client, trainerUserId, packageId, videoIndex) {
  const row = (await client.query("select duration_seconds,coverage_bps,last_position_seconds,ended_seen,completed_at from trainer_video_progress where trainer_user_id=$1 and package_id=$2 and video_index=$3", [trainerUserId, packageId, progressIndex(videoIndex)])).rows[0];
  return rowResult(row, videoIndex);
}

export async function recordTrainerVideoProgress(client, { trainerUserId, packageId, videoIndex, durationSeconds, startSeconds, endSeconds, ended, lessonsCount }) {
  if (!Number.isInteger(videoIndex) || videoIndex < 1 || videoIndex > lessonsCount || !Number.isFinite(durationSeconds) || durationSeconds < 1 || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0 || endSeconds <= startSeconds || endSeconds > durationSeconds + 1 || endSeconds - startSeconds > 20) throw fail("VIDEO_HEARTBEAT_INVALID", 400);
  if (videoIndex > 1) {
    const previous = await readTrainerVideoProgress(client, trainerUserId, packageId, videoIndex - 1);
    if (!previous?.completedAt) throw fail("VIDEO_LOCKED", 403);
  }
  const dbIndex = progressIndex(videoIndex);
  const row = (await client.query("select * from trainer_video_progress where trainer_user_id=$1 and package_id=$2 and video_index=$3 for update", [trainerUserId, packageId, dbIndex])).rows[0];
  const now = Date.now();
  let previousRanges = [];
  try { previousRanges = row ? JSON.parse(row.watched_ranges_json || "[]") : []; } catch { throw fail("VIDEO_PROGRESS_CORRUPTED", 409); }
  if (!Array.isArray(previousRanges) || previousRanges.some((range) => !Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite))) throw fail("VIDEO_PROGRESS_CORRUPTED", 409);
  const duration = row ? Number(row.duration_seconds) : Number(durationSeconds);
  if (Math.abs(duration - durationSeconds) > 3) throw fail("VIDEO_DURATION_CONFLICT");
  const position = row ? Number(row.last_position_seconds) : 0;
  const startedAt = row ? new Date(row.created_at).getTime() : now - 2500;
  const updatedAt = row ? new Date(row.updated_at).getTime() : now - 2500;
  if (startSeconds > position + 2) throw fail("VIDEO_FORWARD_SEEK_REJECTED");
  const elapsedSeconds = Math.max(0, (now - updatedAt) / 1000);
  if (endSeconds > position + elapsedSeconds + 4 || endSeconds > (now - startedAt) / 1000 + 4) throw fail("VIDEO_FORWARD_SEEK_REJECTED");
  const ranges = mergeRanges([...previousRanges, [Math.max(0, startSeconds), Math.min(duration, endSeconds)]]);
  const watched = ranges.reduce((total, [a, b]) => total + Math.max(0, b - a), 0);
  const coverageBps = Math.min(10000, Math.floor((watched / duration) * 10000));
  const endedSeen = Boolean(row?.ended_seen || (ended === true && endSeconds >= duration - 2));
  const completedAt = row?.completed_at || (coverageBps >= 9500 && endedSeen ? new Date(now) : null);
  await client.query(`insert into trainer_video_progress(trainer_user_id,package_id,video_index,duration_seconds,watched_ranges_json,coverage_bps,last_position_seconds,ended_seen,completed_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9)
    on conflict(trainer_user_id,package_id,video_index) do update set duration_seconds=excluded.duration_seconds,watched_ranges_json=excluded.watched_ranges_json,coverage_bps=excluded.coverage_bps,last_position_seconds=excluded.last_position_seconds,ended_seen=excluded.ended_seen,completed_at=coalesce(trainer_video_progress.completed_at,excluded.completed_at),updated_at=now()`, [trainerUserId, packageId, dbIndex, duration, JSON.stringify(ranges), coverageBps, Math.max(position, Math.min(duration, endSeconds)), endedSeen, completedAt]);
  let expertiseActivated = false;
  if (completedAt) {
    const completed = Number((await client.query("select count(*)::int as count from trainer_video_progress where trainer_user_id=$1 and package_id=$2 and video_index between $3 and $4 and completed_at is not null", [trainerUserId, packageId, 1001, 1000 + lessonsCount])).rows[0]?.count || 0);
    if (completed >= lessonsCount) {
      const packageRow = (await client.query("select id from packages where id=$1 and audience='TRAINER'", [packageId])).rows[0];
      if (packageRow) {
        const grant = await grantTrainerPackageCompletionExpertise(client, { trainerUserId, packageId, packageVersionId: (await client.query("select id from package_versions where package_id=$1 and status='PUBLISHED' order by version_number desc limit 1", [packageId])).rows[0]?.id, lessonsCount });
        expertiseActivated = Number(grant.created || 0) > 0;
      }
    }
  }
  return { progress: rowResult({ duration_seconds: duration, coverage_bps: coverageBps, last_position_seconds: Math.max(position, Math.min(duration, endSeconds)), ended_seen: endedSeen, completed_at: completedAt }, videoIndex), nextUnlocked: Boolean(completedAt && videoIndex < lessonsCount), expertiseActivated };
}
