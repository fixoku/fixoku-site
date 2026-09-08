import { expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { VisualScreenContract } from "../../src/platform/core/screenContracts";
import { readLockedReference, resolveReference } from "./referenceAuthority";

export const STRICT_VISUAL_POLICY = { threshold: 0, maxDiffPixels: 0 } as const;

// Playwright owns pixel comparison and diff PNG generation. References are never updated here.
export async function compareScreenshot(actual: Buffer, referenceFile: string, info: TestInfo) {
  if (info.config.updateSnapshots !== "none") throw new Error("REFERENCE_UPDATE_FORBIDDEN");
  const actualPath = info.outputPath("actual", referenceFile);
  await mkdir(path.dirname(actualPath), { recursive: true });
  await writeFile(actualPath, actual);
  let error: unknown;
  try {
    expect(actual).toMatchSnapshot(referenceFile, STRICT_VISUAL_POLICY);
  } catch (caught) {
    error = caught;
  }
  const emittedDiff = error
    ? (await readdir(info.outputDir)).find((name) => name.endsWith("-diff.png"))
    : undefined;
  const diff = emittedDiff ? path.join(info.outputDir, emittedDiff) : null;
  const result = { result: error ? "FAIL" : "PASS", reference: info.snapshotPath(referenceFile),
    actual: actualPath, diff, thresholdStatus: "ESTIMATED", ...STRICT_VISUAL_POLICY };
  await writeFile(info.outputPath("comparison-result.json"), JSON.stringify(result, null, 2) + "\n");
  if (error) throw error;
  return result;
}

// Phase 1B callers must supply a contract with an authorized route mapping.
// There is deliberately no trainer parity spec or new production route in Phase 1A.
export async function compareTrainerScreen(page: Page, screen: VisualScreenContract, info: TestInfo) {
  const reference = await readLockedReference(screen.referenceFile);
  if (path.resolve(info.snapshotPath(screen.referenceFile)) !== resolveReference(screen.referenceFile)) {
    throw new Error("VISUAL_SNAPSHOT_ROOT_MISMATCH");
  }
  await page.setViewportSize(screen.viewport);
  await page.evaluate(() => document.fonts.ready);
  const actual = await page.screenshot({ animations: "disabled", caret: "hide", scale: "css" });
  try {
    return await compareScreenshot(actual, screen.referenceFile, info);
  } finally {
    if (!(await readFile(resolveReference(screen.referenceFile))).equals(reference)) {
      throw new Error("REFERENCE_MUTATED");
    }
  }
}
