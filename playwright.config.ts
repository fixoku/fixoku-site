import { defineConfig } from "@playwright/test";
import path from "node:path";

const referenceRoot = process.env.FIXOKU_VISUAL_AUTHORITY_ROOT;
const viteCli = path.resolve("node_modules/vite/bin/vite.js");

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  updateSnapshots: "none",
  forbidOnly: true,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results/artifacts",
  snapshotPathTemplate: "{testDir}/../test-results/harness-input/{arg}{ext}",
  expect: { toMatchSnapshot: { threshold: 0, maxDiffPixels: 0 } },
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    channel: "chromium",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    colorScheme: "light",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: false,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{
    name: "chromium",
    testIgnore: ["**/visual/authority.test.ts", "**/visual/trainer-dashboard.spec.ts"],
    use: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
  }, {
    name: "chromium-harness",
    testMatch: "**/visual/authority.test.ts",
    snapshotPathTemplate: "{testDir}/../test-results/harness-input/{arg}{ext}",
    use: { viewport: { width: 1600, height: 900 } },
  }, {
    name: "chromium-trainer-dashboard",
    testMatch: "**/visual/trainer-dashboard.spec.ts",
    snapshotPathTemplate: referenceRoot
      ? path.resolve(referenceRoot, "{arg}{ext}")
      : "{testDir}/../test-results/unconfigured/{arg}{ext}",
    use: { viewport: { width: 1600, height: 900 } },
  }],
  webServer: {
    command: `"${process.execPath}" "${viteCli}" --host 127.0.0.1 --port 5173 --strictPort`,
    url: "http://127.0.0.1:5173/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
