/* global process */
import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(process.cwd(), "src/platform/admin/legal-owner-documents-v3.json");

export function readOwnerLegalReviewSource() {
  const documents = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!Array.isArray(documents) || documents.length !== 21) throw new Error("OWNER_LEGAL_REVIEW_PACKAGE_DOCUMENT_COUNT_INVALID");
  if (documents.some((document) => !/TASLAK|BEKLENİYOR/iu.test(String(document.markdown || "")))) throw new Error("OWNER_LEGAL_REVIEW_PACKAGE_NON_DRAFT_DOCUMENT");
  if (documents.some((document) => document.sourceVersion !== "0.2" || document.sourceDate !== "2026-10-19")) throw new Error("OWNER_LEGAL_REVIEW_PACKAGE_SOURCE_VERSION_INVALID");
  return documents;
}

export function buildOwnerLegalReviewPackage() {
  const documents = readOwnerLegalReviewSource();
  const lines = [
    "# FIXOKU Owner Hukuki İnceleme Paketi",
    "",
    "**Durum:** TASLAK / HUKUKİ İNCELEME BEKLENİYOR / OWNER ONAYI YOK",
    "**Kapsam:** 21 belge · 16 müşteri belgesi · 5 iç yönetim belgesi",
    "**Kaynak:** `docs/legal/FIXOKU_21_Hukuki_Belge_Revize_Inceleme_Taslagi_20261019.md` → `src/platform/admin/legal-owner-documents-v3.json`",
    "**Kaynak SHA-256:** `684836d43069004bd6a621e07ca6700983b6a2d064f8e3fd161a733d502f976b`",
    "",
    "> Bu dosya yerel Owner incelemesi içindir. Hiçbir belge yayımlanmış, onaylanmış veya hukuken tamamlanmış kabul edilmez. Metinler kaynak taslaklardan eksiksiz olarak eklenmiştir.",
    "",
    "## Belge listesi",
    "",
    ...documents.map((document) => `${String(document.id).padStart(2, "0")}. ${document.title} — ${document.internal ? "İç yönetim" : "Müşteri"} — TASLAK`),
    "",
    "---",
    "",
  ];
  for (const document of documents) {
    lines.push(`## ${String(document.id).padStart(2, "0")} — ${document.title}`);
    lines.push("");
    lines.push(`- **Kapsam:** ${document.internal ? "İç yönetim" : "Müşteri"}`);
    lines.push(`- **Kategori:** ${document.category}`);
    lines.push(`- **Kullanım alanı:** ${document.placement}`);
    lines.push("- **Durum:** TASLAK / HUKUKİ İNCELEME BEKLENİYOR / OWNER ONAYI YOK");
    lines.push("");
    lines.push(document.markdown.trimEnd());
    lines.push("", "---", "");
  }
  return lines.join("\n");
}
