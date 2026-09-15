import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const secretNames = ["PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT", "SMTP_PASS", "SMTP_PASSWORD", "S3_SECRET_ACCESS_KEY", "META_CAPI_ACCESS_TOKEN", "TIKTOK_EVENTS_ACCESS_TOKEN", "SHIPPING_TOKEN"];
const assignment = new RegExp(`(?:${secretNames.join("|")})(?![A-Z0-9_])[ \\t]*[:=][ \\t]*(?:("[^"]*")|('[^']*')|([^\\s,;#]+))`, "gi");
const urlPassword = /postgres(?:ql)?:\/\/[^\s:@/]+:([^\s@]+)@/gi;
// These are non-secret placeholders used by local contract tests and examples.
const safeValue = /^(?:$|CHANGE_ME(?:_[A-Z0-9_]+)?|<[^>]+>|placeholder|example|redacted|current\.token|env\.token|p|u|key|salt|mid|contract-password|smtp\.test|no-reply@test|bad)$/i;
const violations = [];

const files = new Set();
const tracked = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
if (tracked.status === 0) tracked.stdout.split("\0").filter(Boolean).forEach((file) => files.add(file));
const workingTree = spawnSync("rg", ["--files", "-g", "!node_modules/**", "-g", "!.git/**", "-g", "!dist/**", "-g", "!.prerender-server/**", "-g", "!.env", "-g", "!.env.local"], { encoding: "utf8" });
if (workingTree.status === 0) workingTree.stdout.split(/\r?\n/u).filter(Boolean).forEach((file) => files.add(file));
files.add(".env.example");
for (const file of files) {
  if (/^(?:node_modules|dist|\.git|\.env\.local|\.env$)/u.test(file)) continue;
  let text;
  try { text = await readFile(path.join(root, file), "utf8"); } catch { continue; }
  if (/\.(?:md|mdx)$/iu.test(file)) continue;
  for (const match of text.matchAll(assignment)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").replace(/["']/g, "");
    if (!safeValue.test(value)) violations.push({ file, type: match[0].split(/\s*[:=]/u)[0] });
  }
  for (const match of text.matchAll(urlPassword)) {
    if (!safeValue.test(match[1])) violations.push({ file, type: "DATABASE_URL_PASSWORD" });
  }
  if (/import\.meta\.env\.VITE_(?:PAYTR|SMTP|S3|META_CAPI|TIKTOK_EVENTS|SHIPPING|DATABASE)/iu.test(text)) violations.push({ file, type: "BROWSER_EXPOSED_SERVER_SECRET" });
}
const ignore = spawnSync("git", ["check-ignore", ".env", ".env.local"], { encoding: "utf8" });
const envIgnored = ignore.status === 0;
if (!envIgnored) violations.push({ file: ".env/.env.local", type: "ENV_NOT_IGNORED" });
if (violations.length) {
  console.log(JSON.stringify({ secretScan: "FAIL", count: violations.length, findings: violations }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ secretScan: "PASS", envFilesIgnored: envIgnored, secretValuesPrinted: "NO", browserServerSecrets: "NONE" }));
}
