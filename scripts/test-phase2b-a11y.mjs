import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
const origin = process.env.APP_ORIGIN;
assert.ok(origin, "APP_ORIGIN is required so browser QA cannot target a stale default server");
const browser = await chromium.launch({ headless: true });
const cases = [
  ["owner", /Ersin/, "/panel/admin"],
  ["trainer", /Özlem KAPLAN/, "/panel/egitmen/egitimlerim"],
  ["student", /Hatice Kübra USTA/, "/panel/ogrenci/paketler"],
];
const out = [];
async function rejectConsent(page) {
  const reject = page.getByRole("button", { name: "Tümünü Reddet" }).first();
  if (await reject.isVisible().catch(() => false)) await reject.click();
}
async function scan(page, screen) {
  const result = await new AxeBuilder({ page }).analyze();
  const critical = result.violations.filter((v) => v.impact === "critical").length;
  const serious = result.violations.filter((v) => v.impact === "serious").length;
  out.push({ screen, critical, serious });
  assert.equal(critical, 0, `${screen} critical violations`);
  assert.equal(serious, 0, `${screen} serious violations`);
}
const reviewContext = await browser.newContext({ locale: "tr-TR" });
const review = await reviewContext.newPage();
await review.goto(`${origin}/yerel-inceleme`, { waitUntil: "domcontentloaded" });
await rejectConsent(review);
await scan(review, "local-review-hub");
await reviewContext.close();
for (const [role, identity, path] of cases) {
  const ctx = await browser.newContext({ locale: "tr-TR" });
  const page = await ctx.newPage();
  await page.goto(`${origin}/yerel-inceleme`, { waitUntil: "domcontentloaded" });
  await rejectConsent(page);
  await page.getByRole("button", { name: identity }).click();
  await page.waitForURL("**/panel/**", { timeout: 60000 });
  await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(700);
  assert.ok(!page.url().includes("/giris"), `${role} redirected to login`);
  await scan(page, `${role}:${path}`);
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify({ a11y: "PASS", screens: out }));
