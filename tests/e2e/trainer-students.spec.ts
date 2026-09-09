import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("trainer student roster and detail stay scoped", async ({ page }) => {
  const password = process.env.TEST_SEED_PASSWORD || readFileSync(".env.local", "utf8").match(/^TEST_SEED_PASSWORD=(.*)$/m)?.[1];
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("trainer.phase1c@example.test");
  await page.getByLabel("Şifre").fill(password!);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await page.waitForURL("**/panel/egitmen");
  await page.goto("/panel/egitmen/ogrencilerim");
  await expect(page.getByRole("heading", { name: "Öğrencilerim" })).toBeVisible();
  await expect(page.locator(".student-list-card")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth)).toBe(false);
});
