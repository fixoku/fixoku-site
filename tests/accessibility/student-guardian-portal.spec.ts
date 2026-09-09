import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const password = process.env.TEST_SEED_PASSWORD || readFileSync(".env.local", "utf8").match(/^TEST_SEED_PASSWORD=(.*)$/m)?.[1] || "";
async function signIn(page: any, email: string) { await page.goto("/giris"); await page.locator("#login-email").fill(email); await page.locator("#login-password").fill(password); await page.locator("form button[type=submit]").click(); await page.waitForURL("**/panel/ogrenci"); }
import AxeBuilder from "@axe-core/playwright";

test("student portal has no serious accessibility violations", async ({ page }) => {
  await signIn(page, "student.phase1c@example.test");
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toHaveLength(0);
});

test("guardian portal exposes labelled context selector when linked", async ({ page }) => {
  await signIn(page, "guardian.phase1c@example.test");
  await expect(page.locator("#student-context-select")).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toHaveLength(0);
});
