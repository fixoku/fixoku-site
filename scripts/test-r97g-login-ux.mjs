import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const lifecycle = read("src/pages/AuthLifecycle.jsx");
const resend = read("src/pages/TrainerVerificationResend.jsx");
const capability = read("api/auth/verification-resend-capability.js");
const auth = read("src/server/auth/auth.js");
const routes = read("src/AppRoutes.jsx");

assert.match(lifecycle, /role === "TRAINER" && verificationRequired && <TrainerVerificationResend/u);
assert.doesNotMatch(lifecycle, /role === "TRAINER" && <TrainerVerificationResend/u);
assert.match(resend, /verification-resend-capability/u);
assert.match(resend, /payload\?\.available === true/u);
assert.match(resend, /if \(availability !== "available"\) return null/u);
assert.match(capability, /Boolean\(getSmtpConfig\(\)\)/u);
assert.match(auth, /requireEmailVerification: true/u);
assert.match(auth, /candidateAuth/u);
for (const path of ["/ogrenci-girisi", "/ogretmen-girisi", "/admin-girisi", "/owner-girisi"]) {
  assert.match(routes, new RegExp(`path=\\\"${path}\\\"`));
}

console.log("R97G_LOGIN_UX=PASS");
console.log("TRAINER_RESEND_ONLY_AFTER_VERIFICATION=PASS");
console.log("RESEND_PROVIDER_CAPABILITY_FAIL_CLOSED=PASS");
console.log("AUTH_VERIFICATION_POLICY_PRESERVED=PASS");
console.log("ROLE_ROUTE_MATRIX=PASS");
