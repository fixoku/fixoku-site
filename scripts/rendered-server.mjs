import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getPrerenderOutputPath,
  indexableRoutePaths,
} from "../src/data/contentRoutes.js";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectRoot, "dist");
const publicRouteFiles = new Map(
  indexableRoutePaths.map((routePath) => [routePath, getPrerenderOutputPath(routePath)]),
);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

function resolveDistPath(relativePath) {
  const resolvedPath = path.resolve(distDirectory, ...relativePath.split("/"));
  const relative = path.relative(distDirectory, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolvedPath;
}

async function fileExists(filePath) {
  if (!filePath) return false;
  return stat(filePath).then((value) => value.isFile()).catch(() => false);
}

async function sendFile(response, relativePath, statusCode) {
  const filePath = resolveDistPath(relativePath);
  if (!(await fileExists(filePath))) return false;

  const body = await readFile(filePath);
  response.writeHead(statusCode, {
    "Cache-Control": "no-cache",
    "Content-Length": body.length,
    "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
  });
  response.end(body);
  return true;
}

export function createRenderedServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(url.pathname);

      if (pathname.length > 1 && pathname.endsWith("/")) {
        response.writeHead(308, { Location: pathname.replace(/\/+$/, "") || "/" });
        response.end();
        return;
      }

      if (publicRouteFiles.has(pathname)) {
        await sendFile(response, publicRouteFiles.get(pathname), 200);
        return;
      }

      if (pathname === "/panel" || pathname.startsWith("/panel/")) {
        await sendFile(response, "panel.html", 200);
        return;
      }

      const staticRelativePath = pathname.replace(/^\/+/, "");
      if (staticRelativePath && path.extname(staticRelativePath)) {
        if (await sendFile(response, staticRelativePath, 200)) return;
      }

      await sendFile(response, "404.html", 404);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
}

export async function startRenderedServer({ port = 0, host = "127.0.0.1" } = {}) {
  const server = createRenderedServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : port;

  return {
    origin: `http://127.0.0.1:${activePort}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const port = Number(process.argv[2] ?? 4173);
  const host = process.argv[3] ?? "127.0.0.1";
  const runningServer = await startRenderedServer({ port, host });
  console.log(`Rendered preview: ${runningServer.origin}`);

  const shutdown = async () => {
    await runningServer.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
