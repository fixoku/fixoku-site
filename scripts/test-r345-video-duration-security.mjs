import assert from "node:assert/strict";

import { verifiedTrainerVideoDurations }
  from "../src/server/domain/trainer-video-duration-catalog.js";

import { resolveTrustedTrainerVideoDuration }
  from "../src/server/domain/trainer-video-duration.js";

const entries=Object.entries(
  verifiedTrainerVideoDurations
);

assert.equal(entries.length,26);

let valid=0;
let rejected=0;

for(const [key,record] of entries) {
  const [slug,rawIndex]=key.split(":");

  const lesson={
    videoIndex:Number(rawIndex),
    filename:record.videoKey.split("/").at(-1),
    poster:record.posterKey.split("/").at(-1),
    videoKey:record.videoKey,
    posterKey:record.posterKey
  };

  assert.equal(
    resolveTrustedTrainerVideoDuration(
      slug,lesson,
      Math.floor(record.durationSeconds)
    ),
    Math.ceil(record.durationSeconds)
  );

  valid++;

  for(const fake of [
    1,0,-1,NaN,Infinity,
    "1",null,undefined,
    record.durationSeconds/2,
    record.durationSeconds*2
  ]) {
    assert.throws(
      ()=>resolveTrustedTrainerVideoDuration(
        slug,lesson,fake
      ),
      {code:"VIDEO_DURATION_CONFLICT"}
    );

    rejected++;
  }

  assert.throws(
    ()=>resolveTrustedTrainerVideoDuration(
      slug,
      {...lesson,filename:"altered.mp4"},
      record.durationSeconds
    ),
    {code:"VIDEO_MEDIA_IDENTITY_MISMATCH"}
  );

  assert.throws(
    ()=>resolveTrustedTrainerVideoDuration(
      slug,
      {...lesson,posterKey:"wrong-poster.jpg"},
      record.durationSeconds
    ),
    {code:"VIDEO_MEDIA_IDENTITY_MISMATCH"}
  );

  assert.ok(
    record.storageDurationSeconds>=
    record.durationSeconds
  );
}

assert.throws(
  ()=>resolveTrustedTrainerVideoDuration(
    "unknown-course",
    {videoIndex:1},
    1
  ),
  {code:"VIDEO_DURATION_NOT_VERIFIED"}
);

console.log("TRUSTED_VIDEO_CATALOG=PASS_26_OF_26");
console.log("VALID_BROWSER_DURATIONS="+valid);
console.log("FAKE_DURATION_REJECTIONS="+rejected);
console.log("VIDEO_MEDIA_KEY_GUARD=PASS");
console.log("POSTER_MEDIA_KEY_GUARD=PASS");
console.log("UNKNOWN_VIDEO_FAIL_CLOSED=PASS");
console.log("CONSERVATIVE_DURATION_ROUNDING=PASS");
console.log("R345_DURATION_SECURITY_UNIT_TESTS=PASS");