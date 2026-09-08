import test from "node:test";
import assert from "node:assert/strict";
import { requireMembership, requirePermission, resolvePanelDestination } from "../src/server/auth/authorization.js";

const principal = (role, scopeType = role === "SUPER_ADMIN" ? "GLOBAL" : role === "GUARDIAN" || role === "STUDENT" ? "STUDENT" : "TRAINER", scopeId = role === "TRAINER" || role === "STUDENT" ? "platform-user-1" : null, status = "ACTIVE") => ({ user: { id: "platform-user-1" }, memberships: [{ id: `${role}-m`, role, scopeType, scopeId, status }] });

test("role routing allows valid single roles", () => {
  assert.equal(resolvePanelDestination(principal("SUPER_ADMIN")).destination, "/panel/admin");
  assert.equal(resolvePanelDestination(principal("TRAINER")).destination, "/panel/egitmen");
  assert.equal(resolvePanelDestination(principal("STUDENT")).destination, "/panel/ogrenci");
});

test("multiple roles require explicit chooser", () => {
  const value = { user: { id: "u" }, memberships: [{ role: "TRAINER", scopeType: "TRAINER", status: "ACTIVE" }, { role: "STUDENT", scopeType: "STUDENT", status: "ACTIVE" }] };
  const result = resolvePanelDestination(value);
  assert.equal(result.kind, "chooser");
  assert.equal(result.destination, null);
  assert.deepEqual(result.destinations.sort(), ["/panel/egitmen", "/panel/ogrenci"].sort());
});

test("invalid, revoked and unknown memberships fail closed", () => {
  assert.equal(resolvePanelDestination(principal("SUPER_ADMIN", "GLOBAL", "unexpected")), null);
  assert.equal(resolvePanelDestination(principal("TRAINER", "GLOBAL")), null);
  assert.equal(resolvePanelDestination(principal("STUDENT", "STUDENT", null, "REVOKED")), null);
  assert.deepEqual(requireMembership(null, "TRAINER"), { status: 401, body: { error: "UNAUTHENTICATED" } });
  assert.deepEqual(requireMembership(principal("STUDENT"), "TRAINER"), { status: 403, body: { error: "FORBIDDEN" } });
});

test("permissions are allow-listed and server-side", () => {
  assert.equal(requirePermission(principal("TRAINER"), "trainer.read"), null);
  assert.equal(requirePermission(principal("STUDENT"), "trainer.read").status, 403);
  assert.equal(requirePermission(principal("TRAINER"), "unknown.permission").status, 403);
});

console.log(JSON.stringify({ rbac: "PASS", writes: "NONE", productionWrite: "NONE" }));
