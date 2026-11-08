import { authorizeSharedPresentation, getSharedPresentationPdfDefinition, inspectSharedPresentationPdf, replyJson } from "../../src/server/domain/trainer-shared-presentations.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return replyJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const auth = await authorizeSharedPresentation(req);
  if (auth.status !== 200) return replyJson(res, auth.status, { error: auth.status === 403 ? "PRESENTATION_ACCESS_DENIED" : "PRESENTATIONS_UNAVAILABLE" });
  const presentations = await Promise.all(auth.presentations.map(async (item) => {
    const pdf = getSharedPresentationPdfDefinition(item);
    const probe = await inspectSharedPresentationPdf(auth, pdf);
    const pdfAvailable = probe.available === true;
    return {
      id: item.id,
      title: item.title,
      pageCount: item.pageCount,
      coverSrc: `/api/trainer/shared-presentation-media?presentation=${encodeURIComponent(item.id)}&page=1&mode=thumb`,
      pdfAvailable,
      pdfState: probe.state,
      pdfViewSrc: pdfAvailable ? `/api/trainer/shared-presentation-pdf?presentation=${encodeURIComponent(item.id)}&disposition=inline` : null,
      pdfDownloadSrc: pdfAvailable ? `/api/trainer/shared-presentation-pdf?presentation=${encodeURIComponent(item.id)}&disposition=download` : null,
      pdfFileName: pdfAvailable ? pdf.fileName : null,
    };
  }));
  return replyJson(res, 200, { presentations });
}
