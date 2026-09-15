import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const temporaryServerDirectory = path.join(projectRoot, ".prerender-server");
const viteCli = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
// Avoid Vite's Windows-sensitive temporary config bundle under node_modules/.vite-temp.
// The supported runner loader evaluates the existing config in place.
const viteConfigLoaderArgs = ["--configLoader", "runner"];

function run(label, command, args) {
  console.log(`\n[build] ${label}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} başarısız oldu (exit ${code}).`));
      }
    });
  });
}

await rm(temporaryServerDirectory, { recursive: true, force: true });

try {
  await run("SEO dosyalarını üret", process.execPath, [
    path.join(scriptDirectory, "generate-seo-files.mjs"),
  ]);
  await run("Vite client build", process.execPath, [viteCli, "build", ...viteConfigLoaderArgs]);
  await run("Vite server build", process.execPath, [
    viteCli,
    "build",
    ...viteConfigLoaderArgs,
    "--ssr",
    "src/entry-server.jsx",
    "--outDir",
    ".prerender-server",
    "--emptyOutDir",
  ]);
  await run("Route HTML prerender", process.execPath, [
    path.join(scriptDirectory, "prerender.mjs"),
  ]);
  await run("Rendered SEO doğrulaması", process.execPath, [
    path.join(scriptDirectory, "validate-rendered-seo.mjs"),
  ]);
} finally {
  await rm(temporaryServerDirectory, { recursive: true, force: true });
}
