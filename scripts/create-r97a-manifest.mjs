import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scopeDirectories = ["api", "drizzle", "scripts", "src", "tests", "public"];
const scopeFiles = [
  ".gitignore",
  ".vercelignore",
  "README.md",
  "drizzle.config.ts",
  "eslint.config.js",
  "index.html",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "tsconfig.platform.json",
  "vercel.json",
  "vite.config.js",
];
const excludedDirectoryNames = new Set([
  ".git",
  ".codex",
  ".vercel",
  "node_modules",
  "dist",
  "playwright-report",
  "test-results",
  "private",
]);
const excludedNamePatterns = [
  /^\.env(?:\.|$)/u,
  /\.bak(?:\.|$)/u,
  /\.log$/u,
  /^FIXOKU_.*\.md$/u,
  /^R\d.*$/u,
];

function isExcluded(relativePath) {
  const parts = relativePath.split(path.sep);
  if (parts.some((part) => excludedDirectoryNames.has(part))) return true;
  return excludedNamePatterns.some((pattern) => pattern.test(path.basename(relativePath)));
}

function collect(current, files) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute);
    if (isExcluded(relative)) continue;
    if (entry.isDirectory()) collect(absolute, files);
    else if (entry.isFile()) files.push(relative.replaceAll(path.sep, "/"));
  }
}

const files = [];
for (const directory of scopeDirectories) {
  const absolute = path.join(root, directory);
  if (fs.existsSync(absolute)) collect(absolute, files);
}
for (const file of scopeFiles) {
  const absolute = path.join(root, file);
  if (fs.existsSync(absolute) && !isExcluded(file)) files.push(file.replaceAll(path.sep, "/"));
}

const entries = [...new Set(files)].sort().map((relativePath) => {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
});

const gitHead = String(process.env.R97A_GIT_HEAD || "unknown");
const manifest = {
  format: "FIXOKU_R97A_SOURCE_MANIFEST_SHA256_V1",
  generatedAt: new Date().toISOString(),
  worktree: root,
  gitHeadAtGeneration: gitHead,
  scope: [...scopeDirectories, ...scopeFiles],
  exclusions: ["private/**", ".env*", ".vercel/**", ".codex/**", "node_modules/**", "dist/**", "*.bak", "*.log", "FIXOKU_*.md", "R* snapshots"],
  files: entries,
};

const output = path.join(root, "FIXOKU_R97A_SOURCE_MANIFEST_SHA256.json");
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ manifest: path.relative(root, output), fileCount: entries.length, excludedPrivateMedia: true, gitHeadAtGeneration: gitHead }));
