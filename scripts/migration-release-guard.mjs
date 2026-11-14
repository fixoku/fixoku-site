// FIXOKU migration release safety guard.
//
// Existing staging migration history requires
// explicit reconciliation. Never replay the
// historical chain through the generic command.
//
// Dedicated isolated test runners are separate.

console.error("FIXOKU_MIGRATION_RELEASE_GUARD=BLOCKED");
console.error("DIRECT_HISTORICAL_MIGRATION_REPLAY=FORBIDDEN");
console.error("USE_REVIEWED_TARGET_SPECIFIC_MIGRATION_PROCEDURE");
console.error("DATABASE_CONNECTION=NO");
console.error("DATABASE_WRITE=NO");

process.exitCode = 1;