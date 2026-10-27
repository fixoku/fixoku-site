import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteUrl } from "../src/config/site.js";
import { indexableRoutePaths } from "../src/data/contentRoutes.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const publicDirectory = path.join(projectRoot, "public");

const sitemapEntries = indexableRoutePaths
  .map((routePath) => `  <url>\n    <loc>${buildSiteUrl(routePath)}</loc>\n  </url>`)
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${buildSiteUrl("/sitemap.xml")}
`;

await mkdir(publicDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(publicDirectory, "sitemap.xml"), sitemap, "utf8"),
  writeFile(path.join(publicDirectory, "robots.txt"), robots, "utf8"),
]);

console.log(`SEO dosyaları üretildi: ${indexableRoutePaths.length} indexlenebilir route.`);
