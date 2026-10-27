import assert from "node:assert/strict";
import fs from "node:fs";
import { PACKAGE_PERMISSIONS, packagePermissionFor, requirePackagePermission } from "../src/server/auth/authorization.js";

const auth = fs.readFileSync("src/server/auth/authorization.js", "utf8");
const migration = fs.readFileSync("drizzle/migrations/0035_owner_admin_package_permissions.sql", "utf8");
const endpoint = fs.readFileSync("api/admin/package-permissions.js", "utf8");
assert.deepEqual(Object.values(PACKAGE_PERMISSIONS), ["PACKAGE_READ", "PACKAGE_CREATE", "PACKAGE_EDIT", "PACKAGE_PRICE_EDIT", "PACKAGE_PUBLISH"]);
assert.equal(packagePermissionFor("GET", ""), "PACKAGE_READ");
assert.equal(packagePermissionFor("POST", "publish"), "PACKAGE_PUBLISH");
assert.equal(packagePermissionFor("PATCH", ""), "PACKAGE_EDIT");
assert.equal(packagePermissionFor("POST", "createDraft"), "PACKAGE_CREATE");
assert.match(auth, /owner_admin_package_permissions/u);
assert.match(auth, /PACKAGE_PERMISSION_REQUIRED/u);
assert.match(migration, /CREATE TABLE "public"\."owner_admin_package_permissions"/u);
assert.match(migration, /revoked_at/u);
assert.match(endpoint, /owner_admin\.package_permission\.granted/u);
assert.match(endpoint, /owner_admin\.package_permission\.revoked/u);
assert.match(endpoint, /OWNER_ONLY/u);
assert.match(endpoint, /resolvePrincipal\(headers\(req\)\)/u);
console.log(JSON.stringify({
  OWNER_STATIC_PERMISSIONS: "PASS",
  ADMIN_GRANT_REVOKE_SOURCE: "PASS",
  PACKAGE_GRANULAR_PERMISSIONS: "PASS",
  DATABASE_MUTATION: "NO",
  MIGRATION_APPLIED: "NO",
}));
