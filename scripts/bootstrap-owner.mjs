import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const { bootstrapOwner } = await import("../src/server/auth/owner-bootstrap.js");
const email = String(process.env.FIXOKU_OWNER_BOOTSTRAP_EMAIL || "").trim();
const password = String(process.env.FIXOKU_OWNER_BOOTSTRAP_PASSWORD || "");
const name = String(process.env.FIXOKU_OWNER_BOOTSTRAP_NAME || "Fixoku Owner").trim();
if (!email || !password) throw new Error("FIXOKU_OWNER_BOOTSTRAP_EMAIL_AND_PASSWORD_REQUIRED");
const result = await bootstrapOwner({ email, name, password });
console.log(JSON.stringify({ ownerBootstrap: "PASS", userId: result.userId, email: result.email, role: result.role }));
