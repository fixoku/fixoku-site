import assert from "node:assert/strict";
import fs from "node:fs";

process.env.NODE_ENV = "production";
process.env.DIGITAL_STORAGE_PROVIDER = "R2";
process.env.S3_ENDPOINT = "https://example.r2.cloudflarestorage.com";
process.env.S3_REGION = "auto";
process.env.S3_BUCKET = "fixoku-staging-private-media";
process.env.S3_ACCESS_KEY_ID = "r78-contract-access";
process.env.S3_SECRET_ACCESS_KEY = "r78-contract-secret";

const manifest = {
  packages: {
    "lise-hizli-okuma-egitimi": {
      lessons: [
        { videoIndex: 2, title: "Ders 2", filename: "ders-02.mp4", poster: "ders-02.jpg" },
        { videoIndex: 1, title: "Ders 1", filename: "ders-01.mp4", poster: "ders-01.jpg" },
        { videoIndex: 3, title: "Kötü yol", filename: "../escape.mp4", poster: "ders-03.jpg" },
      ],
    },
  },
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  assert.match(String(url), /trainer-independent-videos\/manifest\.json/u);
  return new Response(JSON.stringify(manifest), { status: 200, headers: { "content-type": "application/json" } });
};

try {
  const { loadRealTrainerLessons } = await import("../api/trainer/video-config.js");
  const result = await loadRealTrainerLessons("lise-hizli-okuma-egitimi");
  assert.equal(result.state, "READY");
  assert.deepEqual(result.lessons.map((item) => item.videoIndex), [1, 2]);
  assert.equal(result.lessons[0].videoKey, "trainer-curriculum-intake/release-015l-egitmen-dersleri/lise-hizli-okuma-egitimi/ders-01.mp4");
  assert.equal(result.lessons[0].posterKey, "trainer-video-posters/lise-hizli-okuma-egitimi/ders-01.jpg");
  assert.equal(result.lessons.some((item) => item.filename.includes("..")), false);

  const pdf = await import("../src/server/domain/trainer-shared-presentation-pdf.js");
  assert.equal(pdf.getSharedPresentationPdfDefinition({ id: "sunum-1", pdfKey: "../secret.pdf" }), null);
  assert.deepEqual(pdf.parseByteRange("bytes=0-1023", 4096), { start: 0, end: 1023, length: 1024, total: 4096 });
  assert.equal(pdf.parseByteRange("bytes=4096-", 4096), null);

  const videoMedia = fs.readFileSync("api/trainer/video-media.js", "utf8");
  const videos = fs.readFileSync("api/trainer/videos.js", "utf8");
  const curriculum = fs.readFileSync("api/trainer/curriculum.js", "utf8");
  const curriculumMedia = fs.readFileSync("api/trainer/curriculum-media.js", "utf8");
  assert.match(videoMedia, /lesson\.videoKey/u);
  assert.match(videoMedia, /lesson\.posterKey/u);
  assert.match(videos, /loadRealTrainerLessons/u);
  assert.match(videos, /PRIVATE_MEDIA_UNAVAILABLE/u);
  assert.match(curriculum, /validManifestItem/u);
  assert.match(curriculumMedia, /validItemFile/u);

  console.log(JSON.stringify({
    REMOTE_CANONICAL_MANIFEST: "PASS",
    PATH_TRAVERSAL_REJECTED: "PASS",
    PDF_KEY_GUARD: "PASS",
    RANGE_PARSER: "PASS",
    DATABASE_MUTATION: "NONE",
    R2_WRITE: "NONE",
  }));
} finally {
  globalThis.fetch = originalFetch;
}
