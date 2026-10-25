import { runPreviewDbIdentityDiagnostic } from "../../src/server/domain/preview-db-identity.js";

export default async function handler(req, res) {
  const { status, body } = await runPreviewDbIdentityDiagnostic({ req });
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.end(JSON.stringify(body));
}
