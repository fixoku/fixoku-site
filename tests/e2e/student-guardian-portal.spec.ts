import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const password = process.env.TEST_SEED_PASSWORD || readFileSync(".env.local", "utf8").match(/^TEST_SEED_PASSWORD=(.*)$/m)?.[1] || "";
async function signIn(page: any, email: string) { await page.goto("/giris"); await page.locator("#login-email").fill(email); await page.locator("#login-password").fill(password); await page.locator("form button[type=submit]").click(); await page.waitForURL("**/panel/ogrenci"); }

test("student and guardian portals render server-owned context", async ({ page }) => {
  await signIn(page, "student.phase1c@example.test");
  await expect(page.locator(".student-portal__hero h2")).toBeVisible();
  await expect(page.locator(".student-portal__card[aria-labelledby=student-access-title]")).toContainText("Eğitmenim");
  await expect(page.locator(".student-portal__card[aria-labelledby=student-access-title]")).toContainText("Özlem KAPLAN");
  await expect(page.locator(".student-portal__enrollments")).toContainText("Hızlı Okuma");
  await expect(page.locator(".student-portal__sidebar")).not.toContainText("Eğitimlerim");
  await page.locator(".student-portal__topbar button").click();
  await page.waitForURL("**/giris");
  await signIn(page, "guardian.phase1c@example.test");
  await expect(page.locator(".student-portal__hero h2")).toBeVisible();
  await expect(page.locator(".student-portal__account")).toContainText("Ersin Velisi");
  await expect(page.locator(".student-portal__banner")).toContainText("Ersin");
  await expect(page.locator(".student-portal__card[aria-labelledby=student-access-title]")).toContainText("Eğitmeni");
  await expect(page.locator("#student-context-select")).toHaveCount(1);
  const initialName = await page.locator(".student-portal__identity strong").innerText();
  await page.locator("#student-context-select").selectOption({ index: 1 });
  await expect(page.locator(".student-portal__identity strong")).not.toHaveText(initialName);
  await expect(page.locator(".student-portal__card[aria-labelledby=student-access-title]")).toContainText("Eğitmeni");
  await expect(page.locator(".student-portal__card[aria-labelledby=student-access-title]")).toContainText("Özlem KAPLAN");
  await expect(page.locator(".student-portal__enrollments")).toContainText("Hızlı Okuma");
  await expect(page.locator(".student-portal__sidebar")).not.toContainText("Eğitimlerim");
});

test("anonymous student panel redirects to login", async ({ page }) => {
  await page.goto("/panel/ogrenci");
  await expect(page).toHaveURL(/\/giris\?returnTo=/);
});

test("student portal remains usable across approved viewports", async ({ page }) => {
  await signIn(page, "student.phase1c@example.test");
  for (const viewport of [{ width: 1600, height: 900 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/panel/ogrenci");
    await expect(page.locator(".student-portal__hero h2")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
