import { toNodeHandler } from "better-auth/node";
import { auth } from "../../src/server/auth/auth.js";

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
  return authHandler(request, response);
}
