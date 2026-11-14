import { verifiedTrainerVideoDurations }
  from "./trainer-video-duration-catalog.js";

const fail = (code,status=409) =>
  Object.assign(new Error(code),{code,status});

export function resolveTrustedTrainerVideoDuration(
  slug,lesson,reportedDuration, exact = false
) {
  const index=Number(lesson?.videoIndex);

  if (!Number.isInteger(index) || index<1) {
    throw fail("VIDEO_INDEX_INVALID",400);
  }

  const key=`${slug}:${index}`;

  if (!Object.hasOwn(
    verifiedTrainerVideoDurations,key
  )) {
    throw fail("VIDEO_DURATION_NOT_VERIFIED",503);
  }

  const trusted=verifiedTrainerVideoDurations[key];

  const expectedVideoKey=
    `trainer-curriculum-intake/release-015l-egitmen-dersleri/${slug}/${lesson.filename}`;

  const expectedPosterKey=
    `trainer-video-posters/${slug}/${lesson.poster}`;

  if (
    trusted.videoKey!==expectedVideoKey ||
    trusted.posterKey!==expectedPosterKey ||
    (lesson.videoKey &&
      lesson.videoKey!==trusted.videoKey) ||
    (lesson.posterKey &&
      lesson.posterKey!==trusted.posterKey)
  ) {
    throw fail("VIDEO_MEDIA_IDENTITY_MISMATCH",503);
  }

  if (
    typeof reportedDuration!=="number" ||
    !Number.isFinite(reportedDuration) ||
    reportedDuration<1 ||
    Math.abs(
      reportedDuration-trusted.durationSeconds
    )>1
  ) {
    throw fail("VIDEO_DURATION_CONFLICT",400);
  }

  // The integer database column uses ceiling rather than
  // rounding down, so the completion threshold is not
  // reached earlier than the measured 95% duration.
  return exact ? trusted.durationSeconds : trusted.storageDurationSeconds;
}