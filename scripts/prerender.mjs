import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { buildSiteUrl } from "../src/config/site.js";
import {
  getPrerenderOutputPath,
  notFoundSeo,
  panelSeo,
  publicRouteRegistry,
} from "../src/data/contentRoutes.js";
import { buildContentSchemas } from "../src/utils/seoSchemas.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectRoot, "dist");
const serverDirectory = path.join(projectRoot, ".prerender-server");
const headStartMarker = "<!-- fixoku-head-start -->";
const headEndMarker = "<!-- fixoku-head-end -->";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function serializeJsonLd(schema) {
  return JSON.stringify(schema).replaceAll("<", "\\u003c");
}

function createPublicHead(route) {
  const canonical = buildSiteUrl(route.path);
  const schemas = buildContentSchemas(route);

  return [
    `<title data-fixoku-seo="true">${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" data-fixoku-seo="true">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" data-fixoku-seo="true">`,
    `<meta name="robots" content="${escapeHtml(route.robots)}" data-fixoku-seo="true">`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" data-fixoku-seo="true">`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" data-fixoku-seo="true">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" data-fixoku-seo="true">`,
    `<meta property="og:type" content="${escapeHtml(route.openGraphType)}" data-fixoku-seo="true">`,
    '<meta property="og:locale" content="tr_TR" data-fixoku-seo="true">',
    '<meta name="twitter:card" content="summary" data-fixoku-seo="true">',
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" data-fixoku-seo="true">`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" data-fixoku-seo="true">`,
    ...schemas.map(
      (schema) =>
        `<script type="application/ld+json" data-fixoku-seo="true">${serializeJsonLd(schema)}</script>`,
    ),
  ].join("\n    ");
}

function createNonIndexableHead(seo) {
  return [
    `<title data-fixoku-seo="true">${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" data-fixoku-seo="true">`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" data-fixoku-seo="true">`,
  ].join("\n    ");
}

function applyTemplate(template, { head, markup, renderMode }) {
  const headPattern = new RegExp(`${headStartMarker}[\\s\\S]*?${headEndMarker}`);
  if (!headPattern.test(template)) {
    throw new Error("Vite HTML şablonunda SEO head marker'ları bulunamadı.");
  }

  const rootPattern = /<div\s+id="root"\s+data-render-mode="client"\s*>\s*<\/div>/;
  if (!rootPattern.test(template)) {
    throw new Error("Vite HTML şablonunda client root marker'ı bulunamadı.");
  }

  return template
    .replace(headPattern, `${headStartMarker}\n    ${head}\n    ${headEndMarker}`)
    .replace(
      rootPattern,
      `<div id="root" data-render-mode="${renderMode}">${markup}</div>`,
    );
}

async function writeRouteHtml(relativePath, html) {
  const outputPath = path.join(distDirectory, ...relativePath.split("/"));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  return outputPath;
}

const serverFiles = await readdir(serverDirectory);
const serverEntryName = serverFiles.find((file) => /^entry-server\.(?:mjs|js)$/.test(file));
if (!serverEntryName) {
  throw new Error("Geçici server build içinde entry-server çıktısı bulunamadı.");
}

const serverEntryUrl = `${pathToFileURL(path.join(serverDirectory, serverEntryName)).href}?v=${Date.now()}`;
const { renderRoute } = await import(serverEntryUrl);
const template = await readFile(path.join(distDirectory, "index.html"), "utf8");

for (const route of publicRouteRegistry) {
  const markup = renderRoute(route.path);
  if (!markup.trim()) {
    throw new Error(`${route.path} için server render boş çıktı üretti.`);
  }

  const html = applyTemplate(template, {
    head: createPublicHead(route),
    markup,
    renderMode: "prerendered",
  });
  const outputPath = await writeRouteHtml(getPrerenderOutputPath(route.path), html);
  console.log(`[prerender] ${route.path} -> ${path.relative(projectRoot, outputPath)}`);
}

const panelHtml = applyTemplate(template, {
  head: createNonIndexableHead(panelSeo),
  markup: "",
  renderMode: "client",
});
await writeRouteHtml("panel.html", panelHtml);
await writeRouteHtml("seniseviim.html", panelHtml);
console.log("[prerender] /seniseviim -> dist/seniseviim.html");
console.log("[prerender] /panel/* -> dist/panel.html");

const notFoundMarkup = renderRoute("/__fixoku-static-404__");
const notFoundHtml = applyTemplate(template, {
  head: createNonIndexableHead(notFoundSeo),
  markup: notFoundMarkup,
  renderMode: "prerendered",
});
await writeRouteHtml("404.html", notFoundHtml);
console.log("[prerender] 404 -> dist/404.html");
