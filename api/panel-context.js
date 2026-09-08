import { resolvePrincipal, ROLE_PERMISSIONS, requirePermission, resolvePanelDestination } from "../src/server/auth/authorization.js";

function requestHeaders(request) {
  return new Headers(Object.entries(request.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
}

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  if (request.method !== "GET") { response.statusCode = 405; response.end(); return; }
  try {
    const principal = await resolvePrincipal(requestHeaders(request));
    if (!principal) { response.statusCode = 401; response.end(JSON.stringify({ error: "UNAUTHENTICATED" })); return; }
    if (!principal.memberships.length || !principal.user) { response.statusCode = 403; response.end(JSON.stringify({ error: "FORBIDDEN" })); return; }
    const context = resolvePanelDestination(principal);
    const requestedPanel = new URL(request.url, "http://local").searchParams.get("panel");
    if (!context || (requestedPanel && !context.destinations?.includes(requestedPanel) && context.destination !== requestedPanel)) { response.statusCode = 403; response.end(JSON.stringify({ error: "FORBIDDEN" })); return; }
    const role = context.roles[0];
    const requiredPermission = role === "SUPER_ADMIN" ? "user.manage" : role === "TRAINER" ? "trainer.read" : "student.read";
    const permissionError = requirePermission(principal, requiredPermission);
    if (permissionError) { response.statusCode = permissionError.status; response.end(JSON.stringify(permissionError.body)); return; }
    const permissions = [...new Set(context.roles.flatMap((candidate) => ROLE_PERMISSIONS[candidate] || []))];
    response.statusCode = 200;
    response.end(JSON.stringify({ user: { id: principal.user.id, name: principal.user.displayName, email: principal.user.email }, roles: context.roles, permissions, destination: context.destination, destinations: context.destinations || [context.destination], selectionRequired: context.kind === "chooser" }));
  } catch { response.statusCode = 503; response.end(JSON.stringify({ error: "AUTHORITY_UNAVAILABLE" })); }
}