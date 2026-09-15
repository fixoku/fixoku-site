# Panel 003D acceptance evidence — 2026-09-13

## Database and migration authority

- `POSTGRES_RECOVERY_METHOD=existing docker-compose.platform.yml + installed Docker Desktop`
- `POSTGRES_LISTENER=PASS` (`fixoku-platform-postgres`, healthy, `127.0.0.1:5433`)
- `ACTIVE_DATABASE=fixoku_phase2b_migration_shadow_20260912`
- Historical `fixoku_platform_dev` was not modified.
- Source journal: `23` entries, `0000` through `0022`.
- New disposable replay database: `fixoku_phase2b_003d_replay_20260912`.
- Official `drizzle-kit migrate` replay: `PASS`.
- Replay ledger: `23` rows, source sequence `PASS`, exact SHA-256 matches `23/23`.
- Active shadow migration applied: `0020`, `0021`, `0022`.
- Active shadow ledger after apply: `23` rows, exact hashes `23/23`.

## Demo fixture evidence

The guarded `scripts/seed-panel-003d-demo.mjs` seed completed with `productionGuard=PASS` and `LOCAL_TEST_ONLY`. Exact users are stored with safe example addresses:

- Ersin — `ersin.owner@example.test` — OWNER
- Özlem KAPLAN — `ozlem.kaplan@example.test` — TRAINER
- Elif USTA — `elif.usta@example.test` — TRAINER
- Hatice Kübra USTA — `hatice.kubra.usta@example.test` — STUDENT
- Ali Asaf USTA — `ali.asaf.usta@example.test` — STUDENT

Read-only counts after seeding: 2 student profiles, 2 trainer profiles, 2 active qualifications, 2 assignments, 1 completion, 2 payout accounts, 1 paid earning, 1 pending earning, 2 orders, 1 shipment, 1 digital file and 5 panel notifications. Özlem’s scenario is completed/paid; Elif’s is active/in-progress/pending; Hatice uses trainer-led education; Ali uses physical plus digital delivery.

## Browser evidence

- Local Vite server: `http://127.0.0.1:5181`, Auth.js origin aligned, profile media adapter explicitly configured to a writable temporary local root.
- Desktop viewport `1440x900`: five demo quick-login routes completed with no page errors and no horizontal overflow.
- Mobile viewport `390x844`: Owner, Trainer profile, Trainer payout, Student profile and Student shipment routes completed with no page errors and `scrollWidth === innerWidth`.
- Save → reload persistence: trainer profile, trainer payout note, student class branch and Owner finance adjustment all passed.
- Owner finance currently provides a live currency filter, CSV export and append-only adjustment. Date/package/trainer filter controls are not claimed as implemented in this continuation.
- Trainer photo control: accepted local PNG through the configured safe local adapter; profile save and reload passed.
- Shipment lifecycle: `WAITING → PREPARING → PACKED → SHIPPED` passed; duplicate `SHIPPED` replay returned 200 and recorded exactly one shipment inventory movement (`on_hand` decremented once).
- Completion exactly-once: repeating the same completion returned 200 replay; a different idempotency key returned 409 conflict.
- Exact TR IBAN validation contract passed for valid and invalid values; full IBAN is masked in list output.

## Quality tests

PASS: bundled TypeScript, bundled ESLint, writable-temp Vite build, bundled `drizzle-kit check`, `test-db`, `test-platform-phase2b`, `test-panel-003b-security`, `test-package-immutability`, `test-package-visibility`, `test-panel-003c-profile`, `test-panel-003c-delivery`, `test-seed-guard`, and `git diff --check`.

The plain `npm.cmd run db:check` path still invokes the global Windows Node and can fail with the known Unicode-path `EPERM`; the bundled Codex Node invocation passes. The full project `npm.cmd run build` default output may hit the same workspace output permission boundary; the equivalent Vite build to a writable temporary output directory passes.

## Remaining provider boundaries

- `PAYTR_IMPLEMENTED=NO`
- `OTHER_PAYMENT_PROVIDER_IMPLEMENTED=NO`
- `PAYMENT_RUNTIME_EXTENDED=NO`
- `SHIPPING_PROVIDER_RUNTIME=DISABLED_CONFIG_REQUIRED`
- `EMAIL_RUNTIME=DISABLED_CONFIG_REQUIRED` when SMTP credentials are absent
- Digital S3 runtime remains configuration-required; no provider credentials or real customer email were used.
