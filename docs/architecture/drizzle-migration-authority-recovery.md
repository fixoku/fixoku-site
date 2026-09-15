# Fixoku Drizzle migration authority recovery

**Task:** `FIXOKU_PANEL_003A_RECOVER_AFTER_CONTEXT_EXHAUSTION_AND_CLOSE` (migration-authority recovery phase)
**Date:** 2026-09-12
**Scope:** local migration authority only. No feature, payment, PayTR, public-site, Education Models, commit, push, or deploy work was performed.

## Installed versions and official source review

| Source | URL | Version | Finding | Application to Fixoku |
| --- | --- | --- | --- | --- |
| Drizzle ORM package | local `package.json`, `node_modules/drizzle-orm/package.json` | `0.45.2` | `readMigrationFiles` reads `meta/_journal.json`, resolves each journal `tag` to a SQL file, splits at `--> statement-breakpoint`, sets `folderMillis` from `journalEntry.when`, and computes SHA-256 over the complete raw SQL file. | The forensic manifest uses this exact SHA-256 behavior; it does not guess a hash algorithm. |
| Drizzle Kit package | local `package.json`, `node_modules/drizzle-kit/package.json` | `0.31.10` | CLI passes the configured migration folder/table/schema to the ORM migrator. | `drizzle.config.ts` uses `out: ./drizzle/migrations`, PostgreSQL, and no custom migration table/schema. |
| Drizzle migration configuration | [official config reference](https://orm.drizzle.team/kit-docs/config-reference#migrations) | current | Without overrides, PostgreSQL uses schema `drizzle` and table `__drizzle_migrations`. | The inspected ledger is `drizzle.__drizzle_migrations`. |
| Drizzle migrations guide | [official migrations guide](https://orm.drizzle.team/docs/migrations) | current | Migration files and the migration history are applied by the official migration machinery. | Shadow replay used `npx drizzle-kit migrate`; no selected SQL was manually replayed. |
| Drizzle ORM source | [upstream repository](https://github.com/drizzle-team/drizzle-orm) and installed `node_modules/drizzle-orm/migrator.js` | `0.45.2` | PostgreSQL migrator creates `(id serial, hash text, created_at bigint)`, reads only the latest row by `created_at desc`, applies a migration when the latest timestamp is older than `journalEntry.when`, then inserts the computed hash/timestamp. Stored hashes are not compared for drift. | A high latest timestamp can mask missing earlier ledger rows. A clean authority check must compare every journal SQL hash and timestamp independently. |
| Drizzle Kit `check` | installed `node_modules/drizzle-kit/bin.cjs` | `0.31.10` | `drizzle-kit check` validates snapshots and journal folder shape; it does not inspect the database ledger, replay an empty database, or compare SQL hashes. | A `check` PASS is insufficient evidence of migration authority. |

The exact installed source evidence is preserved in the machine-readable manifest and schema diff beside this document:

- [drizzle-migration-authority-manifest.json](<C:/Users/Seslendirme Ajansı/Desktop/fixoku-site/phase2b-worktrees/integration/docs/architecture/drizzle-migration-authority-manifest.json:1>)
- [drizzle-migration-schema-diff.json](<C:/Users/Seslendirme Ajansı/Desktop/fixoku-site/phase2b-worktrees/integration/docs/architecture/drizzle-migration-schema-diff.json:1>)

## Forensic manifest

The source journal contains 18 entries (`idx=0..17`) and 18 matching SQL files (`0000` through `0017`). The manifest records, for every entry:

- journal index, tag, and timestamp;
- SQL filename;
- SHA-256 of the complete raw SQL file using Drizzle ORM `0.45.2` behavior;
- major table/type/index/constraint objects parsed from that SQL;
- current database object presence;
- current database ledger row presence and hash match;
- shadow database ledger row presence and hash match.

Current database findings:

- Ledger rows: `9`.
- Timestamp-matched ledger rows exist for `0000`–`0008`, but all nine stored hashes differ from the current source SQL hashes.
- No timestamp-matched ledger rows exist for `0009`–`0017`.
- The current schema nevertheless contains the later migration-owned tables, including the Phase 2B commerce tables.

Shadow findings:

- Ledger rows: `18`.
- Every journal entry has one timestamp-matched ledger row.
- Every shadow ledger hash matches the exact source SQL SHA-256.
- Sequence and timestamps match `idx=0..17` in journal order.

## Current database backup

The current development database was backed up before the shadow experiment:

```text
BACKUP_CREATED=YES
BACKUP_PATH=C:\Users\Seslendirme Ajansı\AppData\Local\Temp\fixoku-panel-003a-current-20260912.dump
BACKUP_FORMAT=PostgreSQL custom archive
BACKUP_RESTORE_CHECK=PASS
RESTORED_PUBLIC_TABLE_COUNT=33
```

Restore validation used a separate temporary database and then removed only that temporary restore database. The current development database was preserved.

## Empty shadow replay

The disposable shadow database is:

```text
fixoku_phase2b_migration_shadow_20260912
```

It was created as a new empty loopback PostgreSQL database. The official command was run against it:

```text
npx drizzle-kit migrate
```

Result:

```text
OFFICIAL_FULL_REPLAY=PASS
FIRST_FAILED_MIGRATION=NONE
SOURCE_JOURNAL_COUNT=18
SHADOW_LEDGER_COUNT=18
SOURCE_TO_SHADOW_SEQUENCE_MATCH=PASS
ALL_SHADOW_HASHES_MATCH=PASS
```

The normal migration command was then run again against the same shadow authority. It completed successfully with no duplicate-table error and no pending historical migration.

## Deterministic shadow data reconstruction

Existing guarded seed mechanisms were reused with an explicit `FIXOKU_SHADOW_REPLAY=1` scope that accepts only a loopback database named `fixoku_phase2b_migration_shadow_*`:

- `scripts/seed-auth-test.mjs` — Super Admin, Trainer, Student, Guardian
- `scripts/seed-students-test.mjs` — student profiles and enrollments
- `scripts/seed-trainings-test.mjs` — trainer education catalog/entitlements
- `scripts/seed-presentations-test.mjs` — presentation metadata
- `scripts/seed-resources-test.mjs` — resource metadata
- `scripts/seed-student-guardian-test.mjs` — guardian relationships
- `scripts/phase2b-fixtures.mjs` — qualification, availability, and pending assignment fixture
- `scripts/seed-package-catalog-shadow.mjs` — one neutral `TRAINER_LED` student package for local acceptance

All seed outputs reported `productionGuard=PASS` or `LOCAL_TEST_ONLY`. No credentials were printed and no production database was eligible.

## Current versus shadow schema comparison

The schema comparison ignores ordinary row-data differences and transient PostgreSQL temporary schemas. It compares migration-owned schemas, tables, columns, types, nullability, defaults, constraints, indexes, and enums.

```text
SCHEMA_EQUIVALENT=NO
schemas:    current=3   shadow=3   differences=0
tables:     current=34  shadow=34  differences=0
columns:    current=296 shadow=296 differences=0
enums:      current=89  shadow=89  differences=0
constraints current=370 shadow=370 differences=2 current-only / 2 shadow-only
indexes:    current=76  shadow=77  differences=1 current-only / 2 shadow-only
```

The only structural differences are the historical `resources` naming/index differences:

- current unique constraint/index: `resources_slug_key` / `resources_slug_key`
- shadow canonical replay constraint/index: `resources_slug_unique` / `resources_slug_unique`
- shadow also has `resources_training_program_order_uq`
- current foreign-key constraint name: `resources_training_program_id_fkey`
- shadow canonical foreign-key constraint name: `resources_training_program_id_training_programs_id_fk`

No table, column, type, nullability, default, enum, or primary-key difference was found. The exact structured diff is in [drizzle-migration-schema-diff.json](<C:/Users/Seslendirme Ajansı/Desktop/fixoku-site/phase2b-worktrees/integration/docs/architecture/drizzle-migration-schema-diff.json:1>).

`SCHEMA_EQUIVALENT=NO` is material: the clean replay is reproducible, but the old database is not structurally identical to the canonical replay in the historical `resources` constraints/indexes. The old database must remain a preserved reference until an explicit reconciliation decision is accepted.

## Recovery decision

The safe recovery decision is to treat the new shadow database as the canonical local Phase 2B authority candidate and leave the old development database untouched as a backup/reference. No ledger rows were fabricated, no historical SQL was edited, and no schema reset was performed.

The shadow database passed:

- official full replay;
- 18/18 ledger entries;
- 18/18 exact source hash matches;
- normal migration recheck with no pending migration;
- schema/table/foreign-key test;
- deterministic auth/student/guardian/trainer/assignment/package fixture reconstruction.

The old database remains non-authoritative because its ledger has missing rows and hash mismatches, and its `resources` constraints/indexes differ from a clean replay. Switching the application’s default local environment to the shadow DB should be a deliberate next local configuration action after review; this task did not overwrite the old database or production configuration.

## Continuation close status

The interrupted work and its live local database state were recovered on 2026-09-12. The source journal, shadow ledger, exact source hashes, deterministic fixture counts, backup file, restore evidence, and structured schema diff remain consistent with the evidence above. The package-catalog shadow seed now also refuses to start unless both `FIXOKU_SHADOW_REPLAY=1` and the safe shadow database name are present.

The integration worktree has no ignored `.env.local`, and the saved local checkout still points `DATABASE_URL` to `fixoku_platform_dev`; therefore `LOCAL_AUTHORITY_SWITCHED=NO`. The reproducible database and safe authority plan are precise: retain `fixoku_phase2b_migration_shadow_20260912` as the clean Phase 2B authority candidate and retain the old database plus its validated custom-format backup as the restorable historical reference. No production or Vercel configuration was changed.

General close checks were rerun from the recovered tree in an approved local process. `npm.cmd run typecheck:platform`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:seed-guard`, `npm.cmd run test:db` (with the clean shadow URL), `npm.cmd run db:check`, the normal `npm.cmd run db:migrate` recheck against the clean shadow, and `git diff --check` all passed. The build completed all 43 prerendered routes and 605 rendered SEO checks. The first DB invocation intentionally targeted the old `fixoku_platform_test` URL and failed because that historical database lacks the Phase 2B commerce tables; the explicit clean-shadow invocation passed with all 34 tables, 46 foreign keys, and transaction probes. The earlier restricted-process `EPERM` was a host limitation and was cleared by the approved local run; no source or database reset was needed.

Accordingly, the clean migration authority is reproducible and the continuation is closed as `PASS`. The local default remains intentionally unswitched (`LOCAL_AUTHORITY_SWITCHED=NO`), while the clean shadow database and validated old-database backup provide the precise safe authority plan required for the next local configuration decision.
## Recovery continuation — 2026-09-12 23:00 Europe/Istanbul

The source migration authority now contains 23 journal entries (`0000` through `0022`), including `0022_panel_profile_payout_parity.sql` and its snapshot. The expected active database remains `fixoku_phase2b_migration_shadow_20260912`; a read-only connection attempt to `127.0.0.1:5433` returned `ECONNREFUSED`, so the applied ledger, replay result, and hash match are UNKNOWN until PostgreSQL is started. The historical `fixoku_platform_dev` database was not contacted or modified. No source journal was manually edited; the 0022 entry was generated with its snapshot.
