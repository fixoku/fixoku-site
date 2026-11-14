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
const parseWatchedRanges = (value) => {
  let ranges;
  try {
    ranges = JSON.parse(value || "[]");
  } catch {
    throw fail("VIDEO_PROGRESS_CORRUPTED");
  }

  if (!Array.isArray(ranges) || ranges.some(
    range => !Array.isArray(range) ||
      range.length !== 2 ||
      !range.every(Number.isFinite) ||
      range[0] < 0 ||
      range[1] < range[0]
  )) {
    throw fail("VIDEO_PROGRESS_CORRUPTED");
  }

  return ranges;
};

const watchedFrontier = (ranges, duration) => {
  let frontier = 0;

  for (const [start, end] of mergeRanges(ranges)) {
    if (start > frontier + 0.05) break;
    frontier = Math.max(frontier, end);
  }

  return Math.min(duration, frontier);
};

const rowResult = (row, videoIndex) => row ? {
  videoIndex,
  durationSeconds: Number(row.duration_seconds),
  coverageBps: Number(row.coverage_bps),
  lastPositionSeconds: Number(row.last_position_seconds),
  maxWatchedSeconds: watchedFrontier(
    parseWatchedRanges(row.watched_ranges_json),
    Number(row.duration_seconds)
  ),
  endedSeen: Boolean(row.ended_seen),
  completedAt: row.completed_at,
} : null;

export async function readTrainerVideoProgress(client, trainerUserId, packageId, videoIndex) {
  const row = (await client.query("select duration_seconds,coverage_bps,last_position_seconds,watched_ranges_json,ended_seen,completed_at from trainer_video_progress where trainer_user_id=$1 and package_id=$2 and video_index=$3", [trainerUserId, packageId, progressIndex(videoIndex)])).rows[0];
  return rowResult(row, videoIndex);
}

export async function recordTrainerVideoProgress(client, { trainerUserId, packageId, videoIndex, durationSeconds, startSeconds, endSeconds, ended, lessonsCount, resumeOnly = false, resumePositionSeconds }) {
  if (!Number.isInteger(videoIndex) || videoIndex < 1 || videoIndex > lessonsCount || !Number.isFinite(durationSeconds) || durationSeconds < 1 || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0 || (!resumeOnly && endSeconds <= startSeconds) || endSeconds > durationSeconds + 1 || endSeconds - startSeconds > 20) throw fail("VIDEO_HEARTBEAT_INVALID", 400);
  if (videoIndex > 1) {
    const previous = await readTrainerVideoProgress(client, trainerUserId, packageId, videoIndex - 1);
    if (!previous?.completedAt) throw fail("VIDEO_LOCKED", 403);
  }
  const dbIndex = progressIndex(videoIndex);
  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1,0))",
    [`${trainerUserId}:${packageId}:${dbIndex}`]
  );
  const row = (await client.query("select * from trainer_video_progress where trainer_user_id=$1 and package_id=$2 and video_index=$3 for update", [trainerUserId, packageId, dbIndex])).rows[0];
  const now = Date.now();
  let previousRanges = [];
  try { previousRanges = row ? JSON.parse(row.watched_ranges_json || "[]") : []; } catch { throw fail("VIDEO_PROGRESS_CORRUPTED", 409); }
  if (!Array.isArray(previousRanges) || previousRanges.some((range) => !Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite))) throw fail("VIDEO_PROGRESS_CORRUPTED", 409);
  const duration = Number(durationSeconds);
  if (row && Math.abs(Number(row.duration_seconds) - duration) > 1) {
    throw fail("VIDEO_LEGACY_DURATION_REVIEW_REQUIRED");
  }
  if (!Number.isInteger(duration)) throw fail("VIDEO_DURATION_CONFLICT", 400);
  const position = watchedFrontier(previousRanges, duration);

  if (resumeOnly === true) {
    const requested = Number(resumePositionSeconds);

    if (!row || !Number.isFinite(requested) ||
        requested < 0 || requested > position + 0.05) {
      throw fail("VIDEO_RESUME_POSITION_REJECTED");
    }

    const resume = Math.floor(
      Math.min(position, requested)
    );

    await client.query(
      "update trainer_video_progress set last_position_seconds=$4 where trainer_user_id=$1 and package_id=$2 and video_index=$3",
      [trainerUserId, packageId, dbIndex, resume]
    );

    return {
      progress: rowResult(
        { ...row, last_position_seconds: resume },
        videoIndex
      ),
      nextUnlocked: Boolean(
        row.completed_at && videoIndex < lessonsCount
      ),
      expertiseActivated: false
    };
  }
  const startedAt = row ? new Date(row.created_at).getTime() : now - 2500;
  const updatedAt = row ? new Date(row.updated_at).getTime() : now - 2500;
  if (startSeconds > position + 0.05) throw fail("VIDEO_FORWARD_SEEK_REJECTED");
  const elapsedSeconds = Math.max(0, (now - updatedAt) / 1000);
  if (endSeconds > position + elapsedSeconds + 4 || endSeconds > (now - startedAt) / 1000 + 4) throw fail("VIDEO_FORWARD_SEEK_REJECTED");
  const ranges = mergeRanges([...previousRanges, [Math.max(0, startSeconds), Math.min(duration, endSeconds)]]);
  const watched = ranges.reduce((total, [a, b]) => total + Math.max(0, b - a), 0);
  const coverageBps = Math.min(10000, Math.floor((watched / duration) * 10000));
  const resume = Math.floor(
    Math.max(0, Math.min(duration, endSeconds))
  );
  const endedSeen = Boolean(row?.ended_seen || (ended === true && endSeconds >= duration - 2));
  const completedAt = row?.completed_at || (coverageBps >= 9500 ? new Date(now) : null);
  await client.query(`insert into trainer_video_progress(trainer_user_id,package_id,video_index,duration_seconds,watched_ranges_json,coverage_bps,last_position_seconds,ended_seen,completed_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9)
    on conflict(trainer_user_id,package_id,video_index) do update set duration_seconds=excluded.duration_seconds,watched_ranges_json=excluded.watched_ranges_json,coverage_bps=excluded.coverage_bps,last_position_seconds=excluded.last_position_seconds,ended_seen=excluded.ended_seen,completed_at=coalesce(trainer_video_progress.completed_at,excluded.completed_at),updated_at=now()`, [trainerUserId, packageId, dbIndex, duration, JSON.stringify(ranges), coverageBps, resume, endedSeen, completedAt]);
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
  return { progress: rowResult({ duration_seconds: duration, coverage_bps: coverageBps, watched_ranges_json: JSON.stringify(ranges), last_position_seconds: resume, ended_seen: endedSeen, completed_at: completedAt }, videoIndex), nextUnlocked: Boolean(completedAt && videoIndex < lessonsCount), expertiseActivated };
}
