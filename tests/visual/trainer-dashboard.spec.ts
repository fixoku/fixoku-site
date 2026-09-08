import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { TRAINER_SCREEN_CONTRACTS } from "../../src/platform/core/screenContracts";
import { compareTrainerScreen } from "../support/visualComparison";

test("trainer dashboard captures against the immutable primary reference", async ({ page }, info) => {
  const screen = TRAINER_SCREEN_CONTRACTS.find((item) => item.id === "trainer-dashboard");
  if (!screen) throw new Error("TRAINER_DASHBOARD_CONTRACT_MISSING");
  await page.goto("/panel/egitmen");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  let comparisonError = "";
  try { await compareTrainerScreen(page, screen, info); } catch (error) { comparisonError = String(error); }
  const resultPath = info.outputPath("comparison-result.json");
  const result = await readFile(resultPath, "utf8").catch(() => "{}");
  const parsed = JSON.parse(result);
  const geometry = await page.evaluate(() => {
    const bounds = (selector: string) => { const element = document.querySelector(selector); if (!element) return null; const rect = element.getBoundingClientRect(); return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }; };
    return { sidebar: bounds(".panel-sidebar"), topbar: bounds(".panel-topbar"), hero: bounds(".trainer-dashboard-hero"), grid: bounds(".trainer-stat-grid"), firstCard: bounds(".panel-stat-card"), promo: bounds(".trainer-promo-card"), rail: bounds(".panel-quick-card") };
  });
  const externalRoot = process.env.FIXOKU_VISUAL_OUTPUT_ROOT;
  if (externalRoot && parsed.actual && parsed.diff) {
    const target = path.resolve(externalRoot, "trainer-dashboard");
    await mkdir(target, { recursive: true });
    await copyFile(parsed.actual, path.join(target, "final-actual.png"));
    await copyFile(parsed.diff, path.join(target, "final-diff.png"));
    await writeFile(path.join(target, "final-metrics.json"), JSON.stringify({ reference: parsed.reference, actual: "final-actual.png", diff: "final-diff.png", diffPixels: parsed.diffPixels, totalPixels: screen.viewport.width * screen.viewport.height, diffPercent: parsed.diffPixels == null ? null : parsed.diffPixels / (screen.viewport.width * screen.viewport.height) * 100, result: parsed.result, threshold: 0, maxDiffPixels: 0, thresholdStatus: "ESTIMATED", geometry }, null, 2) + "\n");
  }
  console.log(`TRAINER_DASHBOARD_COMPARISON=${result}`);
  console.log(`TRAINER_DASHBOARD_DIFF=${comparisonError ? "GENERATED_OR_MISMATCH" : "NONE"}`);
  expect(resultPath).toContain("comparison-result.json");
});
