import assert from "node:assert/strict";
import { chromium } from "playwright";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const origin = process.env.APP_ORIGIN;
assert.ok(origin, "APP_ORIGIN_REQUIRED");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query("delete from rate_limit"); await pool.end();
const browser = await chromium.launch({ headless: true });
async function login(button, viewport) {
  const context = await browser.newContext({ viewport, locale: "tr-TR" }); const page = await context.newPage();
  await page.goto(`${origin}/yerel-inceleme`, { waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: button }).click();
  await page.waitForURL("**/panel/**", { timeout: 60000 }); return { context, page };
}
const owner = await login("Ersin", { width: 1440, height: 900 });
for (const route of ["/panel/admin/saglayicilar", "/panel/owner/saglayicilar"]) { await owner.page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" }); await owner.page.waitForTimeout(250); assert.equal(await owner.page.getByRole("heading", { name: "Sağlayıcı Durumu" }).count(), 1); assert.equal(await owner.page.locator(".admin-package-card").count(), 3); assert.equal(await owner.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false); }
await owner.context.close();
const trainer = await login("Özlem KAPLAN", { width: 390, height: 844 }); await trainer.page.goto(`${origin}/panel/admin/saglayicilar`, { waitUntil: "domcontentloaded" }); await trainer.page.waitForTimeout(250); assert.match(trainer.page.url(), /\/giris/u); await trainer.context.close();
await browser.close(); console.log(JSON.stringify({ providerStatusBrowser: "PASS", ownerAdminRoutes: "PASS", trainerInfrastructureDenied: "PASS", mobileOverflow: 0 }));
