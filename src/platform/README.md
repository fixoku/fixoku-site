# Fixoku platform foundation

This directory is the controlled TypeScript boundary for the new platform work.

- `src/panel` is a legacy/demo UI and is not authentication authority.
- New platform contracts and test support live under `src/platform` until a controlled migration is authorized.
- Phase 1A does not replace a user-facing route and does not implement a PanelShell, trainer dashboard, admin panel, student panel, authentication, database, payment, or storage runtime.
- Phase 1B will introduce the PanelShell and trainer visual implementation against the locked reference inputs.
- Phase 1C will introduce real server-authoritative authentication and database foundations after its provider and security gates pass.

## Local foundation checks

Set `FIXOKU_VISUAL_AUTHORITY_ROOT` to the external folder containing the nine trainer PNGs, then run `npm run test:platform:foundation`. A missing root produces `VISUAL_AUTHORITY_ROOT_MISSING`. The immutable hash lock lives in `tests/support/trainer-reference-lock.json`; the external Phase 1A manifest carries the same values. No PNG is copied into app assets.

`typecheck:platform` checks TS/TSX under this boundary plus Playwright tests/config using strict/noEmit. Existing JS ESLint coverage stays unchanged; TS is governed by the separate compiler gate. No legacy JS migration is required.

Playwright 1.63.0 pins Chromium build 1243. Tests use Chromium only, DPR 1, tr-TR, Europe/Istanbul, light colors and reduced motion. Outputs are ignored under `test-results/artifacts` and `playwright-report`; parallel independent runner invocations sharing those folders are not supported. The aggregate command uses one runner/one worker and a single reused local server.

The harness tests generate their own synthetic inputs under ignored `test-results/harness-input`. They verify repeat captures and deliberate mismatch/diff PNG output at 1600x900 and 1448x1086; they do not compare the legacy panel to trainer designs. `compareTrainerScreen` is the Phase 1B adapter for immutable external snapshots, with snapshot updates forbidden. Caller must first navigate to the future authorized screen and provide fixed fixtures. No route is activated here.

Starting comparison policy is threshold=0/maxDiffPixels=0, ESTIMATED, not user locked. Upgrades of Playwright/Chromium or threshold changes require a decision entry and visual review. Typography, shell geometry, content and navigation must not be masked.

Axe smoke is observation-only per Phase 1A scope: passing means the scanner executed and attached results, not zero violations or WCAG compliance. Homepage serious ARIA/contrast findings are retained; no unrelated public UI fixes are included.
