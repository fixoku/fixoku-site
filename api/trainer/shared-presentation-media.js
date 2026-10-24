import fs from "node:fs";
import path from "node:path";
import { createSignedReadUrl } from "../../src/server/domain/digital-delivery.js";
import { authorizeSharedPresentation, replyStop } from "../../src/server/domain/trainer-shared-presentations.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return replyStop(res, 405);
  const auth = await authorizeSharedPresentation(req);
  if (auth.status !== 200) return replyStop(res, auth.status);

  const id = String(auth.url.searchParams.get("presentation") || "");
  const page = Number(auth.url.searchParams.get("page"));
  const mode = String(auth.url.searchParams.get("mode") || "page");
  if (!/^[a-z0-9-]+$/u.test(id) || !Number.isSafeInteger(page) || page < 1 || !["page", "thumb"].includes(mode)) {
    return replyStop(res, 400);
  }

  const definition = auth.presentations.find((item) => item.id === id);
  if (!definition || !Number.isSafeInteger(definition.pageCount) || page > definition.pageCount) return replyStop(res, 404);
  if (auth.storage?.provider === "S3" || auth.storage?.provider === "R2") {
    const prefix = mode === "thumb" ? "thumbs" : "pages";
    const key = `trainer-shared-presentations/${id}/${prefix}/page-${String(page).padStart(3, "0")}.jpg`;
    res.statusCode = 302;
    res.setHeader("Location", createSignedReadUrl(auth.storage, key));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    return res.end();
  }
  const file = path.join(auth.root, id, mode === "thumb" ? "thumbs" : "pages", `page-${String(page).padStart(3, "0")}.jpg`);
  if (!fs.existsSync(file)) return replyStop(res, 404);

  const stat = fs.statSync(file);
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Content-Length", String(stat.size));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  fs.createReadStream(file).pipe(res);
}
