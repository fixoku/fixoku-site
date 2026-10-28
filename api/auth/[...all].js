import { toNodeHandler } from "better-auth/node";
import { auth } from "../../src/server/auth/auth.js";
import { getEmailTransportStatus } from "../../src/server/domain/email-outbox.js";

const authHandler = toNodeHandler(auth);

export default function handler(request, response) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://local").pathname).replace(/\/+$/u, ""); }
  catch { response.statusCode = 400; response.end(); return; }
  if (pathname === "/api/auth/sign-up/email") {
    response.statusCode = 403;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify({ error: "SIGNUP_DISABLED" }));
    return;
  }
  if (pathname === "/api/auth/send-verification-email") {
    const transport = getEmailTransportStatus(process.env);
    if (!transport.available) {
      response.statusCode = 503;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.end(JSON.stringify({ error: "EMAIL_VERIFICATION_TRANSPORT_UNAVAILABLE" }));
      return;
    }
  }
  return authHandler(request, response);
}
