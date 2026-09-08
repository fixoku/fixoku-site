import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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

test("trainer dashboard accessibility scan", async ({ page }, info) => {
  await loginTrainer(page);
  await expect(page.getByRole("heading", { name: "Merhaba Özlem Hocam" })).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((violation) => violation.impact === "serious");
  const critical = result.violations.filter((violation) => violation.impact === "critical");
  await info.attach("trainer-dashboard-axe", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  console.log("TRAINER_DASHBOARD_A11Y=" + JSON.stringify({ critical: critical.length, serious: serious.length, violations: result.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })) }));
  expect(critical).toHaveLength(0);
  expect(serious).toHaveLength(0);
});
