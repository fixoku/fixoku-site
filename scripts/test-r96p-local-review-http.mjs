const origin = String(process.env.APP_ORIGIN || "").replace(/\/$/u, "");
const proof = String(process.env.BETTER_AUTH_SECRET || "");
if (origin !== "http://127.0.0.1:5276") throw new Error("R96P_APP_ORIGIN_INVALID");
if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production") throw new Error("R96P_PRODUCTION_LOCAL_REVIEW_BLOCKED");
if (process.env.LOCAL_REVIEW_MODE !== "1" || process.env.VITE_LOCAL_REVIEW_MODE !== "1") throw new Error("R96P_LOCAL_REVIEW_FLAGS_INVALID");
if (!proof || !process.env.TEST_SEED_PASSWORD) throw new Error("R96P_TEST_AUTH_ENV_MISSING");

const cases = Object.freeze([
  ["ozlem-kaplan", "TRAINER", "/panel/egitmen"],
  ["elif-usta", "TRAINER", "/panel/egitmen"],
  ["ersin", "OWNER", "/panel/owner"],
  ["fixoku-super-admin", "SUPER_ADMIN", "/panel/admin"],
  ["hatice-kubra-usta", "STUDENT", "/panel/ogrenci"],
  ["ali-asaf-usta", "STUDENT", "/panel/ogrenci"],
]);

function cookieHeader(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
  return values.map((value) => String(value).split(";", 1)[0]).join("; ");
}

async function switchUser(slug) {
  const response = await fetch(`${origin}/api/local-review/switch-user`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-fixoku-local-review-proof": proof,
    },
    body: JSON.stringify({ slug }),
  });
  if (response.status !== 200) throw new Error(`R96P_LOCAL_REVIEW_LOGIN_${slug.toUpperCase()}_${response.status}`);
  return cookieHeader(response);
}

for (const [slug, expectedRole, panel] of cases) {
  const cookie = await switchUser(slug);
  if (!cookie) throw new Error(`R96P_LOCAL_REVIEW_COOKIE_${slug.toUpperCase()}`);
  const response = await fetch(`${origin}/api/panel-context?panel=${encodeURIComponent(panel)}`, { headers: { origin, cookie } });
  if (response.status !== 200) throw new Error(`R96P_PANEL_CONTEXT_${slug.toUpperCase()}_${response.status}`);
  const body = await response.json().catch(() => ({}));
  if (!Array.isArray(body.roles) || !body.roles.includes(expectedRole)) throw new Error(`R96P_PANEL_ROLE_${slug.toUpperCase()}`);
}

console.log(JSON.stringify({ localReviewHttp: "PASS", identities: cases.length, owner: "PASS", ozlem: "PASS", productionLocalReview: "DISABLED" }));
