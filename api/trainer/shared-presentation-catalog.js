import { authorizeSharedPresentation, replyJson } from "../../src/server/domain/trainer-shared-presentations.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return replyJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const auth = await authorizeSharedPresentation(req);
  if (auth.status !== 200) return replyJson(res, auth.status, { error: auth.status === 403 ? "ENTITLEMENT_REQUIRED" : "PRESENTATIONS_UNAVAILABLE" });
  const presentations = auth.presentations.map((item) => ({
    id: item.id,
    title: item.title,
    pageCount: item.pageCount,
    coverSrc: `/api/trainer/shared-presentation-media?packageId=${encodeURIComponent(auth.packageId)}&presentation=${encodeURIComponent(item.id)}&page=1&mode=thumb`,
  }));
  return replyJson(res, 200, { presentations });
}
