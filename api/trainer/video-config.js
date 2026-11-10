// FIXOKU R96D-1: independent trainer lessons are loaded from a private metadata manifest.
// The manifest contains only the four verified lesson sets; absent packages fail closed.
import fs from "node:fs";
import path from "node:path";
import { fetchPrivateObject, getDigitalStorageConfig } from "../../src/server/domain/digital-delivery.js";

export const REAL_VIDEO_PROGRESS_BASE = 1000;
const storageRoot = () => process.env.DIGITAL_STORAGE_PROVIDER === "LOCAL" && process.env.DIGITAL_STORAGE_ROOT
  ? process.env.DIGITAL_STORAGE_ROOT
  : "private";
const manifestPath = () => path.resolve(storageRoot(), "trainer-independent-videos", "manifest.json");

const VIDEO_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.mp4$/u;
const POSTER_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jpe?g$/iu;

function safeSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(String(slug || "")) ? String(slug) : null;
}

function canonicalKey(prefix, slug, file, pattern) {
  const normalizedSlug = safeSlug(slug);
  const name = path.basename(String(file || ""));
  if (!normalizedSlug || !pattern.test(name) || name !== String(file || "")) return null;
  return `${prefix}/${normalizedSlug}/${name}`;
}

function normalizeLesson(raw, slug, fallbackIndex) {
  if (!raw || typeof raw !== "object") return null;
  const videoIndex = Number(raw.videoIndex ?? raw.index ?? fallbackIndex);
  const filename = String(raw.filename || raw.file || "");
  const poster = String(raw.poster || raw.posterFile || "");
  const videoKey = canonicalKey("trainer-curriculum-intake/release-015l-egitmen-dersleri", slug, filename, VIDEO_FILE);
  const posterKey = canonicalKey("trainer-video-posters", slug, poster, POSTER_FILE);
  if (!Number.isInteger(videoIndex) || videoIndex < 1 || !videoKey || !posterKey) return null;
  const title = String(raw.title || `Ders ${String(videoIndex).padStart(2, "0")}`).trim().slice(0, 240);
  return { videoIndex, title, filename: path.basename(filename), poster: path.basename(poster), videoKey, posterKey };
}

function normalizeManifest(parsed, slug) {
  const entry = parsed?.packages?.[slug];
  if (!Array.isArray(entry?.lessons)) return [];
  return entry.lessons
    .map((lesson, index) => normalizeLesson(lesson, slug, index + 1))
    .filter(Boolean)
    .sort((left, right) => left.videoIndex - right.videoIndex);
}

function readIndependentVideoManifest() {
  try {
    const file = manifestPath();
    if (!fs.existsSync(file)) return {};
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && parsed.packages && typeof parsed.packages === "object" ? parsed.packages : {};
  } catch {
    return {};
  }
}

export function getRealTrainerLessons(slug) {
  return normalizeManifest({ packages: readIndependentVideoManifest() }, slug);
}

/**
 * Read the canonical independent-video manifest from the configured private
 * storage. Remote deployments never consult a repo-local `private/` tree.
 * The returned state lets handlers distinguish a missing package from an
 * unavailable private-media provider without exposing object keys to callers.
 */
export async function loadRealTrainerLessons(slug) {
  const storage = getDigitalStorageConfig();
  if (storage.provider === "S3" || storage.provider === "R2") {
    try {
      const response = await fetchPrivateObject(storage, "trainer-independent-videos/manifest.json");
      if (response.status === 404) return { lessons: [], state: "NOT_FOUND" };
      if (!response.ok) return { lessons: [], state: "UNAVAILABLE" };
      const parsed = await response.json();
      const lessons = normalizeManifest(parsed, slug);
      return { lessons, state: lessons.length ? "READY" : "NOT_FOUND" };
    } catch {
      return { lessons: [], state: "UNAVAILABLE" };
    }
  }
  const lessons = getRealTrainerLessons(slug);
  return { lessons, state: lessons.length ? "READY" : "NOT_FOUND" };
}
export function realVideoProgressIndex(videoIndex) { return REAL_VIDEO_PROGRESS_BASE + videoIndex; }
export function independentVideoManifestPath() { return manifestPath(); }

export { normalizeLesson };
