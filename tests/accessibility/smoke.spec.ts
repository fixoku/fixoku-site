import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const route of ["/", "/giris"]) {
  test(`axe observation ${route}`, async ({ page }, info) => {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    if (route === "/giris") await expect(page.getByRole("heading", { name: "Panele giriş yap" })).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    const summary = {
      route, scanStatus: "COMPLETED", complianceStatus: result.violations.length ? "BASELINE_ISSUES" : "NO_AUTOMATED_FINDINGS",
      critical: result.violations.filter((v) => v.impact === "critical").length,
      serious: result.violations.filter((v) => v.impact === "serious").length,
      violations: result.violations.map((v) => ({ id: v.id, impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, html: n.html, summary: n.failureSummary })) })),
    };
    await info.attach("axe-results", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
    await info.attach("axe-summary", { body: JSON.stringify(summary, null, 2), contentType: "application/json" });
    console.log("A11Y_BASELINE=" + JSON.stringify({ route, critical: summary.critical, serious: summary.serious,
      violations: summary.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) }));
    // User requested an observation-only baseline in this tooling phase.
    // A passing scanner test is never a WCAG compliance or zero-violations claim.
    expect(result.url).toBe(page.url());
    expect(result.passes.length).toBeGreaterThan(0);
    expect(result.testEngine.name).toBe("axe-core");
  });
}
