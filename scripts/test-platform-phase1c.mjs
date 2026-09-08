import { spawnSync } from "node:child_process";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
for (const script of ["scripts/test-db.mjs", "scripts/test-auth.mjs", "scripts/test-rbac.mjs", "scripts/test-rbac-runtime.mjs", "scripts/test-rate-limit.mjs"]) {
  const result = spawnSync(process.execPath, [script], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("PHASE_1C_TESTS=PASS");
