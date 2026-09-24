import { resolvePrincipal, ROLE_PERMISSIONS, requirePermission, resolvePanelDestination } from "../src/server/auth/authorization.js";

const trainerPanelPaths = new Set(["/panel/egitmen/profil", "/panel/egitmen/egitimlerim", "/panel/egitmen/sunumlarim", "/panel/egitmen/kaynaklarim", "/panel/egitmen/musaitlik", "/panel/egitmen/bakiyem", "/panel/egitmen/payout-hesabim", "/panel/egitmen/ogrencilerim", "/panel/egitmen/atamalarim", "/panel/egitmen/sepet", "/panel/egitmen/checkout"]);
const isTrainerPanelPath = (path) => trainerPanelPaths.has(path) || path?.startsWith("/panel/egitmen/ogrencilerim/") || path?.startsWith("/panel/egitmen/egitimlerim/");
const isAdminPanelPath = (path) => ["/panel/admin", "/panel/admin/atamalar", "/panel/admin/paketler", "/panel/admin/egitmenler", "/panel/admin/kargo", "/panel/admin/urunler", "/panel/admin/saglayicilar", "/panel/admin/egitmen-ticaret", "/panel/admin/ogrenci-ticaret", "/panel/admin/siparisler", "/panel/admin/odemeler", "/panel/admin/ogrenciler", "/panel/admin/denetim-gecmisi", "/panel/admin/kullanici-islemleri"].includes(path) || path?.startsWith("/panel/admin/paketler/") || path?.startsWith("/panel/admin/egitmenler/") || path?.startsWith("/panel/admin/urunler/");
const isOwnerPanelPath = (path) => path?.startsWith("/panel/owner");

function panelNamespace(path) {
  if (isOwnerPanelPath(path)) return "owner";
  if (isAdminPanelPath(path)) return "admin";
  if (isTrainerPanelPath(path)) return "trainer";
  if (["/panel/ogrenci", "/panel/ogrenci/profil", "/panel/ogrenci/profiller", "/panel/ogrenci/paketler", "/panel/ogrenci/sepet", "/panel/ogrenci/checkout", "/panel/ogrenci/kargolar"].includes(path)) return "student";
  return null;
}

function effectiveUiRole(roles, requestedPanel) {
  const namespace = panelNamespace(requestedPanel);
  if (namespace === "owner") return "OWNER";
  if (namespace === "admin") return roles.includes("OWNER") ? "OWNER" : "ADMIN";
  if (namespace === "trainer") return "TRAINER";
  if (namespace === "student") return "STUDENT";
  if (roles.includes("OWNER")) return "OWNER";
  if (roles.includes("SUPER_ADMIN")) return "ADMIN";
  if (roles.includes("TRAINER")) return "TRAINER";
  return "STUDENT";
}

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
    const namespace = panelNamespace(requestedPanel);
    const requestedAllowed = namespace === "trainer" ? context.roles.includes("TRAINER") : namespace === "admin" ? context.roles.some((role) => ["OWNER", "SUPER_ADMIN"].includes(role)) : namespace === "owner" ? context.roles.includes("OWNER") : namespace === "student" ? context.roles.some((role) => ["STUDENT", "GUARDIAN"].includes(role)) : ["/panel/bildirimler", "/panel/notifications"].includes(requestedPanel) ? Boolean(context.roles.length) : (context.destinations?.includes(requestedPanel) || context.destination === requestedPanel);
    if (!context || (requestedPanel && !requestedAllowed)) { response.statusCode = 403; response.end(JSON.stringify({ error: "FORBIDDEN" })); return; }
    const requiredPermission = namespace === "trainer" ? "trainer.read" : namespace === "student" ? "student.read" : namespace === "owner" || namespace === "admin" ? "user.manage" : context.roles.some((role) => ["OWNER", "SUPER_ADMIN"].includes(role)) ? "user.manage" : context.roles.includes("TRAINER") ? "trainer.read" : "student.read";
    const permissionError = requirePermission(principal, requiredPermission);
    if (permissionError) { response.statusCode = permissionError.status; response.end(JSON.stringify(permissionError.body)); return; }
    const permissions = [...new Set(context.roles.flatMap((candidate) => ROLE_PERMISSIONS[candidate] || []))];
    const uiRole = effectiveUiRole(context.roles, requestedPanel);
    response.statusCode = 200;
    response.end(JSON.stringify({ authenticated: true, user: { id: principal.user.id, name: principal.user.displayName, email: principal.user.email }, roles: context.roles, uiRole, permissions, destination: context.destination, destinations: context.destinations || [context.destination], selectionRequired: context.kind === "chooser" }));
  } catch { response.statusCode = 503; response.end(JSON.stringify({ error: "AUTHORITY_UNAVAILABLE" })); }
}
