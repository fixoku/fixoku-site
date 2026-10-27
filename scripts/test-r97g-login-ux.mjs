import assert from "node:assert/strict";
import fs from "node:fs";

const lifecycle = fs.readFileSync(new URL("../src/pages/AuthLifecycle.jsx", import.meta.url), "utf8");
const resend = fs.readFileSync(new URL("../src/pages/TrainerVerificationResend.jsx", import.meta.url), "utf8");
const owner = fs.readFileSync(new URL("../src/pages/OwnerPrivateLogin.jsx", import.meta.url), "utf8");
const routes = fs.readFileSync(new URL("../src/AppRoutes.jsx", import.meta.url), "utf8");
const auth = fs.readFileSync(new URL("../src/server/auth/auth.js", import.meta.url), "utf8");

assert.match(lifecycle, /verificationRequired && <TrainerVerificationResend[^>]+role=\{role\}/u);
assert.doesNotMatch(lifecycle, /role === "TRAINER" && <TrainerVerificationResend/u);
assert.match(lifecycle, /EMAIL_NOT_VERIFIED/u);
assert.match(lifecycle, /EMAIL_VERIFICATION_REQUIRED/u);
assert.match(lifecycle, /role === "ADMIN"/u);
assert.match(lifecycle, /role === "OWNER"/u);
assert.match(resend, /send-verification-email/u);
assert.match(resend, /role === "ADMIN"/u);
assert.match(resend, /role === "OWNER"/u);
assert.doesNotMatch(owner, /TrainerVerificationResend/u);
assert.match(owner, /api\/owner-sign-in/u);
assert.match(owner, /ersin@fixoku\.com/u);
assert.match(routes, /path="\/seniseviim"/u);
assert.match(routes, /OwnerPrivateLogin/u);
assert.match(auth, /requireEmailVerification: true/u);
assert.match(auth, /plugins: \[twoFactor\(/u);

console.log(JSON.stringify({
  LOGIN_UX_FIX: "PASS",
  NORMAL_LOGIN_VERIFICATION_BOX: "HIDDEN",
  ERROR_REDIRECT_RESEND: "CONDITIONAL",
  EMAIL_VERIFICATION_POLICY: "PRESERVED",
  TWO_FACTOR_POLICY: "PRESERVED",
  OWNER_AUTH_COMPONENT: "PRESERVED",
}));
