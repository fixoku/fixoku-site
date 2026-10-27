import { getSmtpConfig } from "../../src/server/domain/email-outbox.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};

export default function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  // This exposes only whether the redacted resend action can work. It never
  // returns provider names, credentials, account existence, or mail status.
  return json(res, 200, { available: Boolean(getSmtpConfig()) });
}
