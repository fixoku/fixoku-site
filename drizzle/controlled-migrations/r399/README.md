# FIXOKU R399 Controlled Database Migration

Execution is disabled by default.

Required order:
1. R399_01_CLASS_SCHEMA.sql
2. R399_02_INDIVIDUAL_HISTORY.sql
3. R399_03_PARTICIPANT_HISTORY.sql

Do not run the legacy migration chain.
Do not use drizzle push.
Do not execute against Production.

Before execution:
- Verify both SQL SHA256 hashes.
- Verify database identity and environment.
- Verify current schema and migration state.
- Create and verify a recoverable backup.
- Complete isolated integration tests.
- Obtain explicit environment approval.

The SQL files contain their own transactions.
Do not replay partially applied migrations blindly.
