import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "api");
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
}
walk(apiRoot);

const source = new Map(files.map((file) => [path.relative(root, file).replaceAll("\\", "/"), fs.readFileSync(file, "utf8")]));

const directMutationRoutes = [
  "api/account-lifecycle.js",
  "api/auth/[...all].js",
  "api/commerce/webhooks.js",
  "api/commerce/dev-settle.js",
  "api/institution-application.js",
  "api/invitation-accept.js",
  "api/owner-2fa-enable.js",
  "api/owner-2fa-verify.js",
  "api/owner-sign-in.js",
  "api/paytr/callback.js",
  "api/platform-sign-in.js",
  "api/public/contact-message.js",
  "api/trainer-candidate.js",
];

for (const file of directMutationRoutes) {
  assert.ok(source.has(file), `route exists: ${file}`);
  assert.match(source.get(file), /cleanPreviewGateResponse/u, `direct mutation route gated: ${file}`);
}

const principalRoutes = [...source.entries()]
  .filter(([file, text]) => file !== "api/internal/r97g-runtime-fingerprint.js" && /resolvePrincipal\(/u.test(text))
  .map(([file]) => file);
assert.ok(principalRoutes.length > 20, "principal route inventory is non-trivial");

const fingerprint = source.get("api/internal/r97g-runtime-fingerprint.js");
assert.doesNotMatch(fingerprint, /cleanPreviewGateResponse/u, "fingerprint remains available while business gate is blocked");
assert.match(fingerprint, /RUNTIME_METADATA_UNAVAILABLE/u, "fingerprint reports missing attestation separately");

assert.ok(fs.existsSync(path.join(root, "api/internal/r97g-runtime-fingerprint.js")), "runtime fingerprint route remains separately available");

console.log(JSON.stringify({
  DIRECT_MUTATION_ROUTES_GATED: directMutationRoutes.length,
  PRINCIPAL_ROUTES_INVENTORIED: principalRoutes.length,
  FINGERPRINT_ROUTE_SEPARATE: "PASS",
}));
