import { test, expect } from "@playwright/test";

test("trainer dashboard preview route is deterministic and isolated", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto("/panel/egitmen");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Merhaba Özlem Hocam" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^noindex,\s*nofollow$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test("trainer dashboard preview remains usable across target viewports", async ({ page }) => {
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
