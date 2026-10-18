import handler from "../invitation-accept.js";

// Dedicated Vercel function entry point. Business validation and permission checks
// are delegated unchanged to the existing authoritative handler.
export default function route(request, response) {
  response.setHeader("Cache-Control", "no-store");
  return handler(request, response);
}
