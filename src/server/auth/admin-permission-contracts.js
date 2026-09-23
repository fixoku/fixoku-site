export function accountLifecyclePermission(method, path) {
  return method === "GET" || !path.endsWith("/admin-invitations") ? "user.manage" : "membership.manage";
}

export function shipmentPermission(method) {
  return method === "GET" ? "shipment.read" : "shipment.manage";
}
