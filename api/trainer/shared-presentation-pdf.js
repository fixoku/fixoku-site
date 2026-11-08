import fs from "node:fs";
import { Readable } from "node:stream";
import { fetchPrivateObject, getDigitalStorageConfig, inspectPrivateFile } from "../../src/server/domain/digital-delivery.js";
import { authorizeSharedPresentation, replyStop } from "../../src/server/domain/trainer-shared-presentations.js";
import { contentDisposition, getSharedPresentationPdfDefinition, parseByteRange } from "../../src/server/domain/trainer-shared-presentation-pdf.js";

function headerValue(value) { return Array.isArray(value) ? value[0] : String(value || ""); }
function sendJsonError(res, status, error) { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify({ error })); }
function requestUrl(req) { return new URL(req.url || "/", "http://local"); }

function applyPdfHeaders(res, definition, size, disposition) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", String(size));
  res.setHeader("Content-Disposition", contentDisposition(disposition, definition.fileName));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}

export async function serveAuthorizedPdf(req, res, auth) {
  if (req.method !== "GET" && req.method !== "HEAD") return replyStop(res, 405);
  if (auth?.status !== 200) return sendJsonError(res, auth?.status || 503, auth?.status === 403 ? "PRESENTATION_ACCESS_DENIED" : "PRESENTATION_PDF_UNAVAILABLE");
  const url = requestUrl(req);
  const id = String(url.searchParams.get("presentation") || "");
  const disposition = url.searchParams.get("disposition") === "download" ? "download" : "inline";
  const item = auth.presentations.find((entry) => entry.id === id);
  const definition = getSharedPresentationPdfDefinition(item);
  if (!definition || !definition.available) return sendJsonError(res, 404, "PRESENTATION_PDF_NOT_CONFIGURED");

  const storage = auth.storage || getDigitalStorageConfig();
  const rangeHeader = headerValue(req.headers?.range);
  if (storage.provider === "LOCAL") {
    const inspected = await inspectPrivateFile(storage, definition.key);
    if (!inspected) return sendJsonError(res, 404, "PRESENTATION_PDF_NOT_FOUND");
    const range = rangeHeader ? parseByteRange(rangeHeader, inspected.size) : null;
    if (rangeHeader && !range) { res.statusCode = 416; res.setHeader("Content-Range", `bytes */${inspected.size}`); return res.end(); }
    const selected = range || { start: 0, end: inspected.size - 1, length: inspected.size, total: inspected.size };
    applyPdfHeaders(res, definition, selected.length, disposition);
    if (range) { res.statusCode = 206; res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${range.total}`); }
    if (req.method === "HEAD") return res.end();
    return fs.createReadStream(inspected.filePath, { start: selected.start, end: selected.end }).pipe(res);
  }
  if (storage.provider !== "S3" && storage.provider !== "R2") return sendJsonError(res, 503, "PRIVATE_STORAGE_RUNTIME_NOT_CONFIGURED");
  const response = await fetchPrivateObject(storage, definition.key, { method: req.method, headers: rangeHeader ? { Range: rangeHeader } : undefined });
  if (!response.ok && response.status !== 206 && response.status !== 416) return sendJsonError(res, response.status === 404 ? 404 : 503, response.status === 404 ? "PRESENTATION_PDF_NOT_FOUND" : "PRESENTATION_PDF_STORAGE_UNAVAILABLE");
  if (response.status === 416) {
    res.statusCode = 416;
    const contentRange = response.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Cache-Control", "private, no-store");
    return res.end();
  }
  const contentLength = Number(response.headers.get("content-length") || definition.byteSize || 0);
  if (!Number.isSafeInteger(contentLength) || contentLength < 0) return sendJsonError(res, 503, "PRESENTATION_PDF_SIZE_UNAVAILABLE");
  applyPdfHeaders(res, definition, contentLength, disposition);
  if (response.status === 206) { res.statusCode = 206; const contentRange = response.headers.get("content-range"); if (contentRange) res.setHeader("Content-Range", contentRange); }
  if (req.method === "HEAD") return res.end();
  if (!response.body) return res.end();
  return Readable.fromWeb(response.body).pipe(res);
}

export default async function handler(req, res) {
  const auth = await authorizeSharedPresentation(req);
  return serveAuthorizedPdf(req, res, auth);
}
