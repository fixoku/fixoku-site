import { spawnSync } from "node:child_process";

const commands = [
  ["typecheck:platform", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.platform.json"]],
  ["test:visual:authority", ["scripts/test-visual-authority.mjs"]],
  ["Chromium smoke, visual harness and axe", ["node_modules/playwright/cli.js", "test"]],
];

for (const [name, args] of commands) {
  console.log(`[foundation] ${name}`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("FOUNDATION_TEST=PASS");
