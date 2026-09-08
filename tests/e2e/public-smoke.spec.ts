import { test, expect } from "@playwright/test";

for (const route of ["/", "/hakkimizda", "/giris", "/panel"]) {
  test(`public/legacy smoke ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("401 (Unauthorized)")) errors.push(message.text()); });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    if (route === "/panel") await page.waitForURL("**/giris?returnTo=%2Fpanel");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",
      route === "/" || route === "/hakkimizda" ? /^index,\s*follow$/ : /^noindex,\s*nofollow$/);
    if (route === "/panel") {
      await expect(page.getByRole("heading", { name: "Panele giriş yap" })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      // Keyboard/focus plumbing only; this demo is not authentication authority.
      await page.getByLabel("E-posta", { exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Şifre", { exact: true })).toBeFocused();
    } else if (route !== "/giris") {
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical?.startsWith("https://")).toBe(true);
      expect(canonical?.endsWith(route)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth ||
      document.body.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}
