/** Offline, dependency-free, tabular A3 PDF export for authorized Fixoku audit records.
 * Text is rasterized through the browser canvas to preserve Turkish glyphs on all clients.
 * No metadata_json or private image URLs are included.
 */
export type AuditPdfRow = {
  when: string;
  person: string;
  role: string;
  action: string;
  target: string;
  result: string;
};

export type AuditPdfOptions = {
  title: string;
  scope: string;
  generatedAt: string;
};

type PdfJpeg = { bytes: Uint8Array; width: number; height: number };

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number): string[] {
  const normalized = String(value || "-").replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";
  const shorten = (part: string) => {
    let result = part;
    while (result && ctx.measureText(result + "…").width > maxWidth) result = result.slice(0, -1);
    return result + (result === part ? "" : "…");
  };
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = shorten(word);
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.length && lines.join(" ").length < normalized.length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = last.replace(/…$/, "") + "…";
  }
  return lines.length ? lines : ["-"];
}

function renderPage(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, rows: AuditPdfRow[], page: number, pages: number, options: AuditPdfOptions): PdfJpeg {
  const w = 1190.55; const h = 841.89;
  const scale = 1.6;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#112842";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillText("FIXOKU  |  DENETİM MERKEZİ", 34, 43);
  ctx.fillStyle = "#4d6379";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(options.title, 34, 68);
  ctx.fillStyle = "#687b8e";
  ctx.font = "11px Arial, sans-serif";
  const scopeText = wrap(ctx, options.scope, 1110, 2);
  scopeText.forEach((line, index) => ctx.fillText(line, 34, 91 + index * 15));
  ctx.fillText("Oluşturulma: " + options.generatedAt, 34, 132);
  ctx.fillText("Toplam " + pages + " sayfa | Sayfa " + page, 950, 132);

  const x = [34, 170, 367, 478, 845, 1088];
  const widths = [136, 197, 111, 367, 243, 69];
  const cols = ["TARİH / SAAT", "İŞLEMİ YAPAN", "GÜNCEL ROL", "YAPILAN İŞLEM", "İLGİLİ KAYIT", "SONUÇ"];
  const top = 153, rowHeight = 35;
  ctx.fillStyle = "#eef3f8";
  ctx.fillRect(34, top, 1123, 31);
  ctx.font = "bold 10.5px Arial, sans-serif";
  ctx.fillStyle = "#344e68";
  for (let col = 0; col < cols.length; col++) ctx.fillText(cols[col], x[col] + 6, top + 20);

  rows.forEach((row, index) => {
    const y = top + 31 + index * rowHeight;
    ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f7f9fb";
    ctx.fillRect(34, y, 1123, rowHeight);
    ctx.strokeStyle = "#e4eaf1";
    ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(34, y + rowHeight); ctx.lineTo(1157, y + rowHeight); ctx.stroke();
    const values = [row.when, row.person, row.role, row.action, row.target, row.result];
    for (let col = 0; col < values.length; col++) {
      ctx.fillStyle = col === 3 ? "#143653" : "#304b66";
      ctx.font = col === 3 ? "bold 11px Arial, sans-serif" : "11px Arial, sans-serif";
      wrap(ctx, values[col], widths[col] - 13, 2).forEach((line, lineNo) => ctx.fillText(line, x[col] + 6, y + 14 + lineNo * 13));
    }
  });
  ctx.fillStyle = "#60778d";
  ctx.font = "10.5px Arial, sans-serif";
  ctx.fillText("Yalnızca kayıtlı denetim olayları • Ham metaveriler yer almaz • Türkiye saati", 34, 822);
  ctx.fillText(page + " / " + pages, 1098, 822);
  const base64 = canvas.toDataURL("image/jpeg", .79).split(",")[1];
  return { bytes: fromBase64(base64), width: canvas.width, height: canvas.height };
}

/** Produces a valid multi-page PDF with repeating column headers. Every row is included. */
export async function createAuditPdf(rows: AuditPdfRow[], options: AuditPdfOptions, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  if (!rows.length) throw new Error("PDF için kayıt yok.");
  if (rows.length > 5000) throw new Error("PDF en fazla 5.000 kayıt içerebilir. Tarih filtresi kullanın veya tüm kayıtları CSV olarak indirin.");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tarayıcınız PDF oluşturma işlemini desteklemiyor.");
  const rowsPerPage = 17;
  const count = Math.ceil(rows.length / rowsPerPage);
  const images: PdfJpeg[] = [];
  for (let p = 0; p < count; p++) {
    images.push(renderPage(canvas, ctx, rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage), p + 1, count, options));
    onProgress?.(p + 1, count);
    if (p % 6 === 5) await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  canvas.width = 0; canvas.height = 0;
  const pagesIds = images.map((_, i) => 5 + 3 * i);
  const objects = new Map<number, Uint8Array>();
  objects.set(1, encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, encode(`<< /Type /Pages /Kids [${pagesIds.map(n => n + " 0 R").join(" ")}] /Count ${images.length} >>`));
  images.forEach((image, index) => {
    const imageId = 3 + 3 * index;
    const contentId = imageId + 1;
    const pageId = imageId + 2;
    const imageHead = encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    const imageTail = encode("\nendstream");
    const imageObject = new Uint8Array(imageHead.length + image.bytes.length + imageTail.length);
    imageObject.set(imageHead, 0);
    imageObject.set(image.bytes, imageHead.length);
    imageObject.set(imageTail, imageHead.length + image.bytes.length);
    objects.set(imageId, imageObject);
    const commands = `q\n1190.55 0 0 841.89 0 0 cm\n/Im0 Do\nQ`;
    objects.set(contentId, encode(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`));
    objects.set(pageId, encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1190.55 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  const chunks: Uint8Array[] = [];
  const offsets = [0];
  let length = 0;
  const append = (chunk: Uint8Array) => { chunks.push(chunk); length += chunk.length; };
  append(encode("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n"));
  const maxObject = images.length * 3 + 2;
  for (let id = 1; id <= maxObject; id++) {
    const data = objects.get(id);
    if (!data) throw new Error("PDF içeriği oluşturulamadı.");
    offsets[id] = length;
    append(encode(`${id} 0 obj\n`));
    append(data);
    append(encode("\nendobj\n"));
  }
  const xrefAt = length;
  append(encode(`xref\n0 ${maxObject + 1}\n0000000000 65535 f \n`));
  for (let id = 1; id <= maxObject; id++) append(encode(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`));
  append(encode(`trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`));
  const result = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length; }
  return new Blob([result], { type: "application/pdf" });
}
