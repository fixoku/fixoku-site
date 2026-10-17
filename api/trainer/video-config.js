// FIXOKU RELEASE-017R: verified real trainer lessons; preview has NO progress writes.
// Keep numerical mapping reserved for a future reviewed 0038 migration.
export const REAL_VIDEO_PROGRESS_BASE = 1000;
export const REAL_TRAINER_VIDEO_LESSONS = Object.freeze({
  "ilkokul-akici-hizli-okuma-egitimi": Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
    videoIndex: index + 1,
    title: `Ders ${index + 1}`,
    filename: `ders-${String(index + 1).padStart(2, "0")}.mp4`,
    poster: `ders-${String(index + 1).padStart(2, "0")}.jpg`,
  }))),
  "ortaokul-hizli-okuma-egitimi": Object.freeze(Array.from({ length: 7 }, (_, index) => Object.freeze({
    videoIndex: index + 1,
    title: `Ders ${index + 1}`,
    filename: `ders-${String(index + 1).padStart(2, "0")}.mp4`,
    poster: `ders-${String(index + 1).padStart(2, "0")}.jpg`,
  }))),
  "lise-hizli-okuma-egitimi": Object.freeze(Array.from({ length: 7 }, (_, index) => Object.freeze({
    videoIndex: index + 1,
    title: `Ders ${index + 1}`,
    filename: `ders-${String(index + 1).padStart(2, "0")}.mp4`,
    poster: `ders-${String(index + 1).padStart(2, "0")}.jpg`,
  }))),
  "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt": Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
    videoIndex: index + 1,
    title: `Ders ${index + 1}`,
    filename: `ders-${String(index + 1).padStart(2, "0")}.mp4`,
    poster: `ders-${String(index + 1).padStart(2, "0")}.jpg`,
  }))),
});
export const getRealTrainerLessons = (slug) => REAL_TRAINER_VIDEO_LESSONS[slug] || [];
export const realVideoProgressIndex = (videoIndex) => REAL_VIDEO_PROGRESS_BASE + videoIndex;
