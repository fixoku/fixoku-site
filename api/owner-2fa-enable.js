import authHandler from "./auth/[...all].js";

// Existing Better Auth handler and its session checks remain authoritative.
export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }));
    return;
  }
  request.url = "/api/auth/two-factor/enable";
  return authHandler(request, response);
}
