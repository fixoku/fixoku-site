import type { Page } from "@playwright/test";

/** Choose the deterministic denied-consent path before tests interact with authenticated UI. */
export async function handleConsent(page: Page) {
  const banner = page.locator(".fixoku-consent-banner");
  if (await banner.isVisible({ timeout: 3000 }).catch(() => false)) {
    const reject = banner.getByRole("button", { name: "Tümünü Reddet", exact: true });
    if (await reject.isVisible().catch(() => false)) await reject.click();
    return;
  }
  const dialog = page.locator(".fixoku-consent-dialog");
  const reject = dialog.getByRole("button", { name: "Tümünü Reddet", exact: true });
  if (await reject.isVisible({ timeout: 1000 }).catch(() => false)) await reject.click();
}

/** Authenticate through the existing local review switch so the matrix can run
 * repeatedly without consuming the public sign-in rate-limit budget. */
export async function switchReviewUser(page: Page, identity: "owner" | "trainer" | "trainerWithStudents" | "student" | "guardian") {
  await page.goto("/yerel-inceleme");
  await handleConsent(page);
  const labels = { owner: /Ersin/, trainer: /Özlem KAPLAN/, trainerWithStudents: /Özlem KAPLAN/, student: /Hatice Kübra USTA/, guardian: /Ali Asaf USTA/ };
  await page.getByRole("button", { name: labels[identity] }).click();
  await page.waitForURL("**/panel/**");
}
