import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { runStagingSmtpDiagnostic } from "../../src/server/domain/staging-smtp-diagnostic.js";

export default async function handler(req, res) {
  const { status, body } = await runStagingSmtpDiagnostic({ req, resolvePrincipal });
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.end(JSON.stringify(body));
}
