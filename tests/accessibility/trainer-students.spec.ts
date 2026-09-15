import { handleConsent, switchReviewUser } from "../support/consent";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

test("trainer student roster has no serious accessibility violations", async ({ page }) => {
  const password = process.env.TEST_SEED_PASSWORD || readFileSync(".env.local", "utf8").match(/^TEST_SEED_PASSWORD=(.*)$/m)?.[1];
  await switchReviewUser(page, "trainer"); await page.goto("/panel/egitmen/ogrencilerim");
  await expect(page.getByRole("heading", { name: "Öğrencilerim" })).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toHaveLength(0);
});
