import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sourceRoot = path.resolve(process.env.R96B_MEDIA_SOURCE || "../curriculum-recovery-001/private");
const destinationRoot = path.resolve(process.env.R96B_MEDIA_DESTINATION || "private");
const packages = ["trainer-curriculum", "trainer-shared-presentations"];

async function filesUnder(root) {
  const result = [];
  async function visit(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) result.push(full);
    }
  }
  await visit(root);
  return result.sort();
}

function digest(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

const entries = [];
for (const area of packages) {
  const sourceArea = path.join(sourceRoot, area);
  const destinationArea = path.join(destinationRoot, area);
  const sourceFiles = await filesUnder(sourceArea);
  const destinationFiles = await filesUnder(destinationArea);
  const sourceRel = sourceFiles.map((file) => path.relative(sourceArea, file).replaceAll("\\", "/"));
  const destinationRel = destinationFiles.map((file) => path.relative(destinationArea, file).replaceAll("\\", "/"));
  if (sourceRel.join("\n") !== destinationRel.join("\n")) throw new Error(`R96B_FILE_SET_MISMATCH:${area}`);
  for (let index = 0; index < sourceFiles.length; index += 1) {
    const source = sourceFiles[index];
    const destination = destinationFiles[index];
    const [sourceStat, destinationStat, sourceHash, destinationHash] = await Promise.all([
      fs.stat(source), fs.stat(destination), digest(source), digest(destination),
    ]);
    if (sourceStat.size !== destinationStat.size || sourceHash !== destinationHash) throw new Error(`R96B_FILE_INTEGRITY_MISMATCH:${area}/${sourceRel[index]}`);
    entries.push({ area, file: sourceRel[index], bytes: sourceStat.size, sha256: sourceHash });
  }
}

const curriculum = entries.filter((entry) => entry.area === "trainer-curriculum");
const presentations = entries.filter((entry) => entry.area === "trainer-shared-presentations");
const packageSummaries = [];
for (const folder of await fs.readdir(path.join(destinationRoot, "trainer-curriculum"), { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const manifestPath = path.join(destinationRoot, "trainer-curriculum", folder.name, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const areaEntries = curriculum.filter((entry) => entry.file.startsWith(`${folder.name}/`));
  packageSummaries.push({ slug: folder.name, slideCount: Number(manifest.slideCount), videoCount: Number(manifest.videoCount), itemCount: manifest.items.length, fileCount: areaEntries.length, bytes: areaEntries.reduce((sum, entry) => sum + entry.bytes, 0) });
}
packageSummaries.sort((a, b) => a.slug.localeCompare(b.slug));
const receipt = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot,
  destinationRoot,
  originalSourceModified: false,
  curriculum: { fileCount: curriculum.length, bytes: curriculum.reduce((sum, entry) => sum + entry.bytes, 0), slideCount: packageSummaries.reduce((sum, row) => sum + row.slideCount, 0), videoCount: packageSummaries.reduce((sum, row) => sum + row.videoCount, 0), packages: packageSummaries },
  sharedPresentations: { fileCount: presentations.length, bytes: presentations.reduce((sum, entry) => sum + entry.bytes, 0) },
  files: entries,
};
await fs.writeFile(path.join(destinationRoot, "r96b-media-manifest.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ audit: "PASS", sourceUnchanged: true, curriculumFiles: curriculum.length, curriculumBytes: receipt.curriculum.bytes, slides: receipt.curriculum.slideCount, videos: receipt.curriculum.videoCount, presentationFiles: presentations.length, presentationBytes: receipt.sharedPresentations.bytes, manifest: "private/r96b-media-manifest.json" }));
