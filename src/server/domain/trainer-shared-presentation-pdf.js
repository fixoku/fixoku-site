const PDF_KEY_PREFIX = "trainer-shared-presentations/";

function normalizePdfKey(value, id) {
  const candidate = String(value || "").trim();
  if (!candidate) return `${PDF_KEY_PREFIX}${id}/source.pdf`;
  if (!candidate.startsWith(PDF_KEY_PREFIX) || candidate.includes("\\") || candidate.includes("\0") || candidate.split("/").some((part) => part === "." || part === "..")) return null;
  return candidate;
}

function cleanFileName(value, yedek) {
  const source = String(value || yedek || "sunum.pdf").replace(/[\\/\r\n\0]/gu, " ").replace(/\s+/gu, " ").trim();
  const withExtension = source.toLowerCase().endsWith(".pdf") ? source : `${source}.pdf`;
  return withExtension.slice(0, 180) || "sunum.pdf";
}

export function getSharedPresentationPdfDefinition(item) {
  if (!item || !/^[a-z0-9-]+$/u.test(String(item.id || ""))) return null;
  const id = String(item.id);
  const key = normalizePdfKey(item.pdfKey || item.pdfObjectKey || item.sourcePdfKey, id);
  if (!key) return null;
  const fileName = cleanFileName(item.pdfFileName || item.fileName || item.filename, item.title);
  const byteSize = Number(item.pdfBytes || item.pdfSize || 0);
  const sha256 = String(item.pdfSha256 || item.sha256 || "").trim().toUpperCase();
  return {
    id,
    key,
    fileName,
    byteSize: Number.isSafeInteger(byteSize) && byteSize > 0 ? byteSize : null,
    sha256: /^[A-F0-9]{64}$/u.test(sha256) ? sha256 : null,
    available: Boolean(item.pdfKey || item.pdfObjectKey || item.sourcePdfKey),
  };
}

export function contentDisposition(disposition, fileName) {
  const mode = disposition === "download" ? "attachment" : "inline";
  const ascii = fileName.replace(/[^\x20-\x7E]/gu, "_").replace(/["\\]/gu, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function parseByteRange(value, size) {
  const raw = String(value || "").trim();
  const total = Number(size);
  if (!raw || !Number.isSafeInteger(total) || total <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(raw);
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : total - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= total) return null;
    end = Math.min(end, total - 1);
  }
  return { start, end, length: end - start + 1, total };
}
