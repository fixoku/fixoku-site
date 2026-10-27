import fs from "node:fs";
import pg from "pg";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const DISPOSABLE_DATABASE = /^(?:fixoku_test_|fixoku_phase2b_migration_shadow_)[a-z0-9_]+$/u;
const rawUrl = String(process.env.R64_PREFLIGHT_DATABASE_URL || "");

function stop(code, error) {
  console.error(JSON.stringify({ preflight: "BLOCKED", error }));
  process.exitCode = code;
}

if (!rawUrl) {
  stop(2, "R64_PREFLIGHT_DATABASE_URL_REQUIRED");
} else {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    stop(2, "R64_PREFLIGHT_DATABASE_URL_INVALID");
  }

  if (parsed) {
    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (!(["postgres:", "postgresql:"].includes(parsed.protocol))) {
      stop(2, "R64_PREFLIGHT_DATABASE_PROTOCOL_FORBIDDEN");
    } else if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
      stop(2, "R64_PREFLIGHT_DATABASE_HOST_FORBIDDEN");
    } else if (!DISPOSABLE_DATABASE.test(database)) {
      stop(2, "R64_PREFLIGHT_DATABASE_NAME_FORBIDDEN");
    } else {
      const pool = new pg.Pool({ connectionString: parsed.toString(), max: 1, options: "-c statement_timeout=5000" });
      let client;
      try {
        client = await pool.connect();
        await client.query("BEGIN READ ONLY");
        const current = (await client.query("select current_database() as database")).rows[0]?.database;
        if (current !== database) throw new Error("R64_PREFLIGHT_DATABASE_TARGET_MISMATCH");

        const relationRows = (await client.query(`
          select c.relname as "table", to_regclass('public.' || c.relname) is not null as present
            from (values
              ('enrollments'),
              ('r6_training_group_participants'),
              ('r6_student_child_profiles'),
              ('student_profiles'),
              ('platform_users')
            ) as c(relname)
        `)).rows;
        const relationPresent = new Set(relationRows.filter((row) => row.present).map((row) => row.table));
        const childColumnInfo = (await client.query(`
          select exists(
            select 1 from information_schema.columns
             where table_schema='public' and table_name='enrollments'
               and column_name='beneficiary_child_profile_id'
          ) as present,
          (select data_type from information_schema.columns
            where table_schema='public' and table_name='enrollments'
              and column_name='beneficiary_child_profile_id') as data_type
        `)).rows[0] || {};
        const childColumn = childColumnInfo.present === true;
        const childColumnType = childColumnInfo.data_type || null;

        const constraints = (await client.query(`
          select n.nspname as schema_name, c.relname as table_name, con.conname,
                 con.contype, pg_get_constraintdef(con.oid) as definition
            from pg_constraint con
            join pg_class c on c.oid=con.conrelid
            join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public'
             and c.relname in ('enrollments','r6_training_group_participants')
           order by c.relname, con.conname
        `)).rows;
        const indexes = (await client.query(`
          select schemaname, tablename, indexname, indexdef
            from pg_indexes
           where schemaname='public'
             and tablename in ('enrollments','r6_training_group_participants')
           order by tablename, indexname
        `)).rows;

        const duplicateEnrollments = relationPresent.has("enrollments") && childColumn
          ? (await client.query(`
              select student_user_id, training_program_id,
                     coalesce(beneficiary_child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid) as target_key,
                     count(*)::int as count
                from enrollments
               group by student_user_id, training_program_id, target_key
              having count(*) > 1
              order by count(*) desc
          `)).rows
          : relationPresent.has("enrollments")
          ? (await client.query(`
              select student_user_id, training_program_id, count(*)::int as count
                from enrollments
               group by student_user_id, training_program_id
              having count(*) > 1
              order by count(*) desc
          `)).rows
          : [];

        const duplicateParticipants = relationPresent.has("r6_training_group_participants")
          ? (await client.query(`
              select training_group_id,
                     coalesce(child_profile_id, student_profile_id, student_user_id) as target_key,
                     count(*)::int as count
                from r6_training_group_participants
               group by training_group_id, target_key
              having count(*) > 1
              order by count(*) desc
          `)).rows
          : [];

        const orphanChildProfiles = relationPresent.has("r6_student_child_profiles")
          && relationPresent.has("platform_users")
          && relationPresent.has("student_profiles")
          ? (await client.query(`
              select count(*)::int as count
                from r6_student_child_profiles c
                left join platform_users u on u.id=c.owner_user_id
                left join student_profiles sp on sp.id=c.legacy_student_profile_id
               where u.id is null or (c.legacy_student_profile_id is not null and sp.id is null)
          `)).rows[0]?.count || 0
          : null;

        const orphanParticipants = relationPresent.has("r6_training_group_participants")
          && relationPresent.has("r6_student_child_profiles")
          && relationPresent.has("student_profiles")
          && relationPresent.has("platform_users")
          ? (await client.query(`
              select count(*)::int as count
                from r6_training_group_participants p
                left join r6_student_child_profiles c on c.id=p.child_profile_id
                left join student_profiles sp on sp.id=p.student_profile_id
                left join platform_users u on u.id=p.student_user_id
               where (p.child_profile_id is not null and c.id is null)
                  or (p.student_profile_id is not null and sp.id is null)
                  or (p.student_user_id is not null and u.id is null)
          `)).rows[0]?.count || 0
          : null;

        const orphanEnrollments = relationPresent.has("enrollments") && childColumn
          ? (await client.query(`
              select count(*)::int as count
                from enrollments e
                left join r6_student_child_profiles c on c.id=e.beneficiary_child_profile_id
               where e.beneficiary_child_profile_id is not null and c.id is null
          `)).rows[0]?.count || 0
          : null;

        const journal = JSON.parse(fs.readFileSync(new URL("../drizzle/migrations/meta/_journal.json", import.meta.url), "utf8"));
        const journalHas0040 = journal.entries.some((entry) => entry.tag === "0040_r64_child_identity_isolation");
        const snapshotPresent = fs.existsSync(new URL("../drizzle/migrations/meta/0040_snapshot.json", import.meta.url));
        const issues = [];
        if (duplicateEnrollments.length) issues.push("DUPLICATE_ENROLLMENT");
        if (duplicateParticipants.length) issues.push("DUPLICATE_GROUP_PARTICIPANT");
        if (orphanChildProfiles) issues.push("ORPHAN_CHILD_PROFILE");
        if (orphanParticipants) issues.push("ORPHAN_GROUP_PARTICIPANT");
        if (orphanEnrollments) issues.push("ORPHAN_ENROLLMENT_CHILD");
        if (!relationPresent.has("enrollments")) issues.push("ENROLLMENTS_TABLE_MISSING");
        if (!relationPresent.has("r6_training_group_participants")) issues.push("PARTICIPANT_TABLE_MISSING");
        if (childColumn && childColumnType !== "uuid") issues.push("CHILD_COLUMN_TYPE_INVALID");
        if (!journalHas0040 || !snapshotPresent) issues.push("SOURCE_JOURNAL_OR_SNAPSHOT_MISSING");

        console.log(JSON.stringify({
          preflight: issues.length ? "FAIL" : "PASS",
          readOnly: true,
          database: current,
          writes: 0,
          source: { journalEntries: journal.entries.length, journalHas0040, snapshotPresent },
          relations: relationRows,
          childColumn,
          childColumnType,
          constraints,
          indexes,
          duplicateEnrollments,
          duplicateParticipants,
          orphanChildProfiles,
          orphanParticipants,
          orphanEnrollments,
          issues,
        }, null, 2));
        await client.query("ROLLBACK");
      } catch (error) {
        try { await client?.query("ROLLBACK"); } catch { /* Preserve the original preflight failure. */ }
        stop(1, error instanceof Error ? error.message : String(error));
      } finally {
        client?.release();
        await pool.end();
      }
    }
  }
}
