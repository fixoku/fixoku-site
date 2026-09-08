import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const localSeed = process.env.TEST_SEED_PASSWORD || readFileSync(".env.local", "utf8").match(/^TEST_SEED_PASSWORD=(.*)$/m)?.[1];

async function loginTrainer(page: Page) {
  const password = localSeed;
  if (!password) throw new Error("TEST_SEED_PASSWORD_REQUIRED");
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("trainer.phase1c@example.test");
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await page.waitForURL("**/panel/egitmen");
}

test("trainer dashboard preview route is deterministic and isolated", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("401 (Unauthorized)")) errors.push(message.text()); });
  const response = await page.goto("/panel/egitmen");
  expect(response?.status()).toBe(200);
  await loginTrainer(page);
  await expect(page.getByRole("heading", { name: "Merhaba Özlem Hocam" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^noindex,\s*nofollow$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test("trainer dashboard preview remains usable across target viewports", async ({ page }) => {
  await loginTrainer(page);
  for (const viewport of [{ width: 1600, height: 900 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/panel/egitmen");
    await expect(page.getByRole("heading", { name: "Merhaba Özlem Hocam" })).toBeVisible();
    if (viewport.width <= 390) {
      const menu = page.getByRole("button", { name: "Menüyü aç" });
      await expect(menu).toBeVisible();
      await menu.click();
      await expect(page.getByRole("button", { name: "Menüyü kapat" })).toBeVisible();
      await expect(page.locator("#trainer-panel-navigation")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth)).toBe(false);
  }
});
