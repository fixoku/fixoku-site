// FIXOKU R96D-1: independent trainer lessons are loaded from a private metadata manifest.
// The manifest contains only the four verified lesson sets; absent packages fail closed.
import fs from "node:fs";
import path from "node:path";

export const REAL_VIDEO_PROGRESS_BASE = 1000;
const storageRoot = () => process.env.DIGITAL_STORAGE_PROVIDER === "LOCAL" && process.env.DIGITAL_STORAGE_ROOT
  ? process.env.DIGITAL_STORAGE_ROOT
  : "private";
const manifestPath = () => path.resolve(storageRoot(), "trainer-independent-videos", "manifest.json");

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
  const entry = readIndependentVideoManifest()[slug];
  return Array.isArray(entry?.lessons) ? entry.lessons : [];
}
export function realVideoProgressIndex(videoIndex) { return REAL_VIDEO_PROGRESS_BASE + videoIndex; }
export function independentVideoManifestPath() { return manifestPath(); }
