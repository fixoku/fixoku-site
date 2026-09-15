import { spawn } from "node:child_process";
import path from "node:path";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const projectRoot = process.cwd();
const node = process.execPath;
const npmBin = (name) => path.join(projectRoot, "node_modules", name);
if (!process.env.FIXOKU_CURRENT_DATABASE_URL && process.env.DATABASE_URL) process.env.FIXOKU_CURRENT_DATABASE_URL = process.env.DATABASE_URL;
if (!process.env.FIXOKU_SHADOW_DATABASE_URL && process.env.DATABASE_URL) process.env.FIXOKU_SHADOW_DATABASE_URL = process.env.DATABASE_URL;
if (!process.env.APP_ORIGIN) process.env.APP_ORIGIN = "http://127.0.0.1:5173";

const gates = [
  ["TypeScript typecheck", node, [path.join(npmBin("typescript"), "bin", "tsc"), "-p", "tsconfig.platform.json", "--noEmit"]],
  ["ESLint", node, [path.join(npmBin("eslint"), "bin", "eslint.js"), "."]],
  ["Build, SSR, prerender and rendered SEO", node, ["scripts/build.mjs"]],
  ["Migration authority", node, ["scripts/diagnose-migration-authority.mjs"]],
  ["Drizzle migration shape check", node, ["node_modules/drizzle-kit/bin.cjs", "check"]],
  ["Database contract", node, ["scripts/test-db.mjs"]],
  ["Panel security", node, ["scripts/test-panel-003b-security.mjs"]],
  ["Provider runtime contract", node, ["scripts/test-provider-runtime.mjs"]],
  ["Email renderer contract", node, ["scripts/test-email-renderer.mjs"]],
  ["RBAC unit contract", node, ["scripts/test-rbac.mjs"]],
  ["Seed guard unit contract", node, ["scripts/test-seed-guard.mjs"]],
  ["Secret and environment safety audit", node, ["scripts/secret-safety-audit.mjs"]],
  ["Consent, martech privacy and PayTR contracts", node, ["scripts/test-platform-contracts.mjs"]],
];

function run(label, file, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n[verify:platform] ${label}`);
    const child = spawn(file, args, { cwd: projectRoot, env: process.env, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${label} failed (exit ${code})`)));
  });
}

for (const [label, file, args] of gates) await run(label, file, args);
console.log("\n[verify:platform] PASS");
console.log("[verify:platform] Data-mutating browser/commerce fixtures are intentionally separate and require a disposable DB.");
