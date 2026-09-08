import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { TRAINER_SCREEN_CONTRACTS } from "../../src/platform/core/screenContracts";
import { TRAINER_VISUAL_FIXTURE } from "../../src/platform/test-support/deterministicFixtures";
import { readLockedReference } from "../support/referenceAuthority";
import { compareScreenshot } from "../support/visualComparison";

test("external reference lock is readable with no route activation", async () => {
  for (const screen of TRAINER_SCREEN_CONTRACTS) {
    await readLockedReference(screen.referenceFile);
    expect(screen.route).toBeNull();
  }
});

for (const viewport of [{ width: 1600, height: 900 }, { width: 1448, height: 1086 }]) {
  test(`deterministic capture and strict diff ${viewport.width}x${viewport.height}`, async ({ page, browser }, info) => {
    await page.setViewportSize(viewport);
    // Isolated harness surface. It is not a trainer design or application route.
    await page.setContent('<html lang="tr"><head><title>Harness readiness</title></head><body style="margin:0;background:white"><main><h1>Test yüzeyi</h1><button id="change">Renk değiştir</button><div id="sample" style="width:80px;height:80px;background:#000"></div></main></body></html>');
    await page.clock.setFixedTime(new Date("2026-09-08T09:00:00+03:00"));
    await page.locator("h1").evaluate((element, fixture) => { element.textContent = fixture.role; }, TRAINER_VISUAL_FIXTURE);
    await page.locator("#change").evaluate((element) => {
      element.addEventListener("click", () => { document.querySelector<HTMLElement>("#sample")!.style.background = "#ff0000"; });
    });
    const runtime = await page.evaluate(() => ({ width: innerWidth, height: innerHeight,
      deviceScaleFactor: devicePixelRatio, locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      light: matchMedia("(prefers-color-scheme: light)").matches }));
    expect(runtime).toEqual({ ...viewport, deviceScaleFactor: 1, locale: "tr-TR",
      timezone: "Europe/Istanbul", reducedMotion: true, light: true });
    await page.evaluate(() => document.fonts.ready);
    const first = await page.screenshot({ animations: "disabled", scale: "css" });
    const second = await page.screenshot({ animations: "disabled", scale: "css" });
    expect(first.equals(second)).toBe(true);
    const name = `harness-${viewport.width}.png`;
    const baseline = info.snapshotPath(name);
    // Only ignored, generated harness input is writable. External trainer references never enter the browser.
    expect(path.resolve(baseline).startsWith(path.resolve("test-results/harness-input") + path.sep)).toBe(true);
    await mkdir(path.dirname(baseline), { recursive: true });
    await writeFile(baseline, first);
    await compareScreenshot(second, name, info);
    await page.getByRole("button", { name: "Renk değiştir" }).click();
    const changed = await page.screenshot({ animations: "disabled", scale: "css" });
    await expect(compareScreenshot(changed, name, info)).rejects.toThrow();
    const comparison = JSON.parse(await readFile(info.outputPath("comparison-result.json"), "utf8"));
    expect(comparison.result).toBe("FAIL");
    expect(comparison.diff).toBeTruthy();
    expect((await readFile(comparison.diff)).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect((await readFile(baseline)).equals(first)).toBe(true);
    const receipt = { harnessResult: "PASS", deliberateMismatch: "DETECTED_WITH_DIFF_PNG", trainerParity: "NOT_RUN",
      browserVersion: browser.version(), os: os.platform(), release: os.release(), arch: os.arch(),
      ...runtime, actual: info.outputPath("actual", name), diff: comparison.diff, fixture: TRAINER_VISUAL_FIXTURE };
    await info.attach("browser-authority", { body: JSON.stringify(receipt, null, 2), contentType: "application/json" });
    console.log("VISUAL_HARNESS=" + JSON.stringify(receipt));
  });
}
