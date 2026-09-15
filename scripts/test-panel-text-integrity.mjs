import assert from "node:assert/strict";
import { chromium } from "playwright";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const origin = process.env.APP_ORIGIN;
assert.ok(origin, "APP_ORIGIN is required so text QA cannot target a stale server");

const suspiciousMojibake = /(?:�|Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|Ä[\u0080-\u00BF]|Å[\u0080-\u00BF]|â[\u0080-\u00BF])/u;
const rawTechnicalStatus = /\b(?:CONFIG_REQUIRED|DIGITAL_STORAGE_CONFIG_REQUIRED|DISABLED_CONFIG_REQUIRED|LOCAL_TEST|ADMIN_GRANT|PACKAGE_COMPLETION|LEGACY_IMPORT|SUSPENDED|REVOKED|COMPLETED|ASSIGNED|DRAFT|PUBLISHED|RETIRED|UNKNOWN|AVAILABLE|LOCKED|PAUSED|CANCELLED|EXPIRED|OWNED|PENDING_PAYMENT|PAYOUT|DEV ONLY)\b/iu;
const rawTextIcon = /[●▣▸▤▱▷]/u;
const publicRoutes = ["/", "/giris", "/yerel-inceleme"];
const panelRoutes = {
  owner: ["/panel/owner", "/panel/owner/saglayicilar", "/panel/owner/olcumleme", "/panel/owner/e-posta-sablonlari", "/panel/owner/yasal-hazirlik", "/panel/admin", "/panel/admin/egitmenler", "/panel/admin/paketler", "/panel/admin/atamalar", "/panel/admin/urunler", "/panel/admin/kargo", "/panel/bildirimler"],
  trainer: ["/panel/egitmen", "/panel/egitmen/profil", "/panel/egitmen/egitimlerim", "/panel/egitmen/sunumlarim", "/panel/egitmen/kaynaklarim", "/panel/egitmen/ogrencilerim", "/panel/egitmen/musaitlik", "/panel/egitmen/bakiyem", "/panel/egitmen/payout-hesabim", "/panel/bildirimler"],
  student: ["/panel/ogrenci", "/panel/ogrenci/profil", "/panel/ogrenci/paketler", "/panel/ogrenci/kargolar", "/panel/bildirimler"],
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "tr-TR", timezoneId: "Europe/Istanbul", viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const results = [];

async function inspect(path) {
  const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  assert.equal(response?.status(), 200, `${path} HTTP status`);
  if (path.startsWith("/panel/")) assert.equal(page.url().includes("/giris"), false, `${path} unexpectedly redirected to login`);
  const result = await page.evaluate(() => {
    const ignored = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
    const text = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || ignored.has(parent.tagName) || parent.closest("[data-text-integrity-technical],code,pre")) continue;
      const value = node.nodeValue?.replace(/\s+/gu, " ").trim();
      if (value && parent.getClientRects().length) text.push(value);
    }
    return { text: text.join(" "), charset: document.characterSet };
  });
  assert.equal(result.charset.toLowerCase(), "utf-8", `${path} document charset`);
  assert.equal(suspiciousMojibake.test(result.text), false, `${path} contains mojibake`);
  assert.equal(rawTechnicalStatus.test(result.text), false, `${path} exposes a raw technical status code`);
  assert.equal(rawTextIcon.test(result.text), false, `${path} exposes a decorative icon as text`);
  results.push({ path, charset: result.charset, visibleTextLength: result.text.length });
}

for (const path of publicRoutes) await inspect(path);

for (const [role, routes] of Object.entries(panelRoutes)) {
  await page.goto(`${origin}/yerel-inceleme`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const identityName = role === "owner" ? "Ersin" : role === "trainer" ? "Özlem KAPLAN" : "Hatice Kübra USTA";
  await page.getByRole("button", { name: identityName }).click();
  await page.waitForURL("**/panel/**", { timeout: 60000 });
  for (const path of routes) await inspect(path);
}

await context.close();
await browser.close();
console.log(JSON.stringify({ panelTextIntegrity: "PASS", userVisibleMojibakeCount: 0, unicodeReplacementCharacterCount: 0, rawTechnicalStatusCount: 0, routes: results }));
