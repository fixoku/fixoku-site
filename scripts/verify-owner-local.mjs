import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";

loadLocalEnv();

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const origin = process.env.FIXOKU_LOCAL_ORIGIN || "http://127.0.0.1:5173";
const credentialPath = process.env.FIXOKU_OWNER_CREDENTIAL_FILE || path.join(process.env.LOCALAPPDATA || os.homedir(), "Fixoku", "owner-local", "credentials.env");
assert.equal(origin, "http://127.0.0.1:5173", "OWNER_LOCAL_ORIGIN_INVALID");

function readValues(filePath) {
  if (!fs.existsSync(filePath)) throw new Error("OWNER_LOCAL_CREDENTIAL_FILE_MISSING");
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(trimmed);
    if (!match) throw new Error("OWNER_LOCAL_CREDENTIAL_FILE_INVALID");
    values[match[1]] = match[2];
  }
  return values;
}

function writeValues(filePath, values) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const text = Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
  fs.writeFileSync(filePath, text, { encoding: "utf8", mode: 0o600 });
}

function splitSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie().flatMap((value) => value.split(/,\s*(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u));
  }
  const raw = response.headers.get("set-cookie");
  if (!raw) return [];
  // Some local HTTP adapters collapse repeated Set-Cookie headers into one
  // comma-delimited value. Split only at the next cookie name so Expires
  // dates containing commas remain intact.
  return raw.split(/,\s*(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u);
}

function rawSecretFromUri(uri) {
  const encoded = new URL(uri).searchParams.get("secret");
  assert.ok(encoded, "OWNER_LOCAL_TOTP_SECRET_MISSING");
  return new TextDecoder().decode(base32.decode(encoded));
}

async function totpCode(uri) {
  return createOTP(rawSecretFromUri(uri), { digits: 6, period: 30 }).totp();
}

const credentials = readValues(credentialPath);
const email = credentials.FIXOKU_OWNER_TEST_EMAIL;
const password = credentials.FIXOKU_OWNER_TEST_PASSWORD;
assert.match(email || "", /@example\.test$/u, "OWNER_LOCAL_TEST_EMAIL_REQUIRED");
assert.ok(password && password.length >= 12, "OWNER_LOCAL_TEST_PASSWORD_REQUIRED");

const jar = new Map();
async function request(route, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  if (jar.size) headers.set("cookie", [...jar.entries()].map(([name, value]) => name + "=" + value).join("; "));
  const response = await fetch(origin + route, { ...options, headers });
  const setCookies = splitSetCookieHeaders(response);
  for (const setCookie of setCookies) {
    const pair = setCookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
  return { response, body: await response.json().catch(() => ({})) };
}

async function clearLocalRateLimit() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query("delete from rate_limit");
  } finally {
    await pool.end();
  }
}

async function verifyTotp(uri) {
  const response = await request("/api/owner-2fa-verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: await totpCode(uri), trustDevice: false }),
  });
  assert.equal(response.response.status, 200, JSON.stringify({ status: response.response.status, body: response.body }));
  return response;
}

const publicResponse = await fetch(origin + "/seniseviim");
assert.equal(publicResponse.status, 200, "OWNER_LOCAL_LOGIN_PAGE_HTTP");

const unauthenticated = await fetch(origin + "/api/panel-context?panel=%2Fpanel%2Fowner", { headers: { origin } });
const unauthenticatedBody = await unauthenticated.json().catch(() => ({}));
assert.equal(unauthenticated.status, 401, JSON.stringify({ status: unauthenticated.status, body: unauthenticatedBody }));

await clearLocalRateLimit();
const shortcutEnabled = process.env.FIXOKU_LOCAL_OWNER_REVIEW === "1";
let signIn;
let enrollmentStatus = null;
let verificationStatus = null;
if (shortcutEnabled) {
  signIn = await request("/api/local-review/switch-user", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "owner-local" }),
  });
  assert.equal(signIn.response.status, 200, JSON.stringify({ status: signIn.response.status, body: signIn.body }));
  assert.equal(signIn.body.role, "OWNER");
} else {
  signIn = await request("/api/owner-sign-in", {
    method: "POST",
    headers: { "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET || "" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(signIn.response.status, 200, JSON.stringify({ status: signIn.response.status, body: signIn.body }));
  let totpUri = credentials.FIXOKU_OWNER_TEST_TOTP_URI || "";
  if (signIn.body.twoFactorRedirect === true) {
    assert.ok(totpUri.startsWith("otpauth://"), "OWNER_LOCAL_TOTP_URI_REQUIRED");
    verificationStatus = (await verifyTotp(totpUri)).response.status;
  } else {
    const beforeTwoFactor = await request("/api/panel-context?panel=%2Fpanel%2Fowner");
    assert.equal(beforeTwoFactor.response.status, 403, JSON.stringify({ status: beforeTwoFactor.response.status, body: beforeTwoFactor.body }));
    assert.equal(beforeTwoFactor.body.error, "TWO_FACTOR_REQUIRED");
    const enrollment = await request("/api/owner-2fa-enable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, method: "totp" }),
    });
    enrollmentStatus = enrollment.response.status;
    assert.equal(enrollment.response.status, 200, JSON.stringify({ status: enrollment.response.status, body: enrollment.body }));
    totpUri = enrollment.body.totpURI;
    assert.ok(typeof totpUri === "string" && totpUri.startsWith("otpauth://"), "OWNER_LOCAL_TOTP_URI_INVALID");
    const verified = await verifyTotp(totpUri);
    verificationStatus = verified.response.status;
    credentials.FIXOKU_OWNER_TEST_TOTP_URI = totpUri;
    if (Array.isArray(enrollment.body.backupCodes)) credentials.FIXOKU_OWNER_TEST_BACKUP_CODES = enrollment.body.backupCodes.join(",");
    writeValues(credentialPath, credentials);
  }
}


const context = await request("/api/panel-context?panel=%2Fpanel%2Fowner");
assert.equal(context.response.status, 200, JSON.stringify({ status: context.response.status, body: context.body }));
assert.ok(context.body.roles?.includes("OWNER"), "OWNER_LOCAL_OWNER_ROLE_REQUIRED");

const legalHttp = await request("/panel/owner/yasal-hazirlik");
assert.equal(legalHttp.response.status, 200, "OWNER_LOCAL_LEGAL_ROUTE_HTTP");

await clearLocalRateLimit();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const apiStatuses = {};
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (["/api/owner-sign-in", "/api/local-review/switch-user", "/api/owner-2fa-verify", "/api/panel-context", "/api/admin/owner-legal-editor"].includes(pathname)) apiStatuses[pathname] = response.status();
  });
  if (shortcutEnabled) {
    await page.goto(origin + "/yerel-inceleme", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: new RegExp(credentials.FIXOKU_OWNER_TEST_NAME, "u") }).click();
    await page.waitForURL("**/panel/owner");
  } else {
    await page.goto(origin + "/seniseviim", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Yönetici Girişi" }).waitFor();
    await page.context().addCookies([...jar.entries()].map(([name, value]) => ({ name, value, url: origin })));
    await page.goto(origin + "/panel/owner", { waitUntil: "networkidle" });
  }
  assert.match(page.url(), /\/panel\/owner$/u, "OWNER_LOCAL_BROWSER_PANEL_NAVIGATION");
  await page.goto(origin + "/panel/owner/yasal-hazirlik", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Yasal ve Uyumluluk" }).waitFor();
  const customerDocuments = await page.locator(".legal-v3-doclist button").count();
  await page.getByLabel("İç yönetim belgelerini de göster").check();
  const allDocuments = await page.locator(".legal-v3-doclist button").count();
  await page.getByRole("tab", { name: /Onay ve KDV hazırlığı/u }).click();
  const serverSideApprovalState = await page.getByText(/SERVER-SIDE ONAY (KAPALI|HAZIRLIĞI|KAYDI ETKİN)/u).count();
  assert.equal(customerDocuments, 16);
  assert.equal(allDocuments, 21);
  assert.equal(serverSideApprovalState, 1);
  console.log(JSON.stringify({
    origin,
    ownerLoginApi: signIn.response.status,
    oneClickOwnerReview: shortcutEnabled,
    unauthenticatedPanelContext: unauthenticated.status,
    twoFactorEnrollment: enrollmentStatus,
    twoFactorVerification: verificationStatus,
    panelContext: context.response.status,
    ownerRole: context.body.roles,
    legalRoute: legalHttp.response.status,
    browserApiStatuses: apiStatuses,
    customerDocuments,
    allDocuments,
    serverSideApproval: "DB_BACKED_WITH_P0_PUBLICATION_BLOCK",
    vatDecision: "BLOCKED",
    productionProviders: "DISABLED",
    credentialsWrittenToGit: false,
  }));
} finally {
  await browser.close();
}
