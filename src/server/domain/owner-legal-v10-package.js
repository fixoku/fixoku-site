/* global process */
import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(process.cwd(), "src/platform/admin/legal-owner-documents-v10.json");

export function readOwnerLegalV10Source() {
  const documents = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!Array.isArray(documents) || documents.length !== 21) throw new Error("OWNER_LEGAL_V10_DOCUMENT_COUNT_INVALID");
  if (documents.filter((document) => !document.internal).length !== 16) throw new Error("OWNER_LEGAL_V10_CUSTOMER_COUNT_INVALID");
  if (documents.filter((document) => document.internal).length !== 5) throw new Error("OWNER_LEGAL_V10_INTERNAL_COUNT_INVALID");
  if (documents.some((document) => !document.internal && (document.sourceVersion !== "1.0" || document.publicationStatus !== "BLOCKED_P0"))) throw new Error("OWNER_LEGAL_V10_PUBLICATION_GATE_INVALID");
  if (documents.some((document) => document.internal && document.publicationStatus !== "INTERNAL_ONLY")) throw new Error("OWNER_LEGAL_V10_INTERNAL_GATE_INVALID");
  return documents;
}

export function buildOwnerLegalV10Package() {
  const documents = readOwnerLegalV10Source();
  const lines = [
    "# FIXOKU R73 — V1.0 Owner Önizleme Paketi",
    "",
    "**Durum:** READY_FOR_OWNER_REVIEW / BLOCKED_P0",
    "**Kapsam:** 21 belge · 16 müşteri v1.0 hazırlık metni · 5 iç yönetim belgesi",
    "**Onay:** Gerçek Owner oturumundan alınmalıdır; bu paket onay kaydı üretmez.",
    "",
    "> V1.0 metinleri temiz müşteri dili için hazırlanmıştır. Zorunlu teyitsiz alanlar P0 raporunda listelenir ve yayın kapısı kapalıdır.",
    "",
    "## Belge listesi",
    "",
    ...documents.map((document) => `${String(document.id).padStart(2, "0")}. ${document.title} — ${document.internal ? "İç yönetim / INTERNAL_ONLY" : `Müşteri / ${document.publicationStatus}`}`),
    "",
    "---",
    ""
  ];
  for (const document of documents) {
    lines.push(`## ${String(document.id).padStart(2, "0")} — ${document.title}`);
    lines.push("");
    lines.push(`- **Kapsam:** ${document.internal ? "İç yönetim" : "Müşteri"}`);
    lines.push(`- **Sürüm:** ${document.sourceVersion}`);
    lines.push(`- **Durum:** ${document.publicationStatus}`);
    lines.push(`- **Gerekli kanıtlar:** ${(document.requiredEvidence || []).join("; ")}`);
    lines.push("");
    lines.push(document.markdown.trimEnd());
    lines.push("", "---", "");
  }
  lines.push("## P0 ve onay kapısı", "", "Güncel vergi levhası/resmî vergi kimliği, sicil teyidi, hukukçu kanıtı, mali müşavir KDV kanıtı ve 0041 migration tamamlanmadan hiçbir müşteri belgesi PUBLISHED durumuna geçirilemez. approved_by, approved_at veya hukuk kanıtı bu yerel paketten üretilmez.");
  return lines.join("\n");
}

export function buildOwnerLegalV10Diff() {
  const documents = readOwnerLegalV10Source();
  return documents.filter((document) => !document.internal).map((document) => ({
    id: document.id,
    title: document.title,
    from: document.derivedFromVersion,
    to: document.sourceVersion,
    status: document.publicationStatus,
    summary: document.changeSummary,
    requiredEvidence: document.requiredEvidence
  }));
}
