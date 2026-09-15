import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = process.cwd();
const migrationDir = path.join(root, "drizzle", "migrations");
const journal = JSON.parse(fs.readFileSync(path.join(migrationDir, "meta", "_journal.json"), "utf8"));
const currentUrl = process.env.FIXOKU_CURRENT_DATABASE_URL || process.env.DATABASE_URL;
const shadowUrl = process.env.FIXOKU_SHADOW_DATABASE_URL;
if (!currentUrl || !shadowUrl) throw new Error("FIXOKU_CURRENT_DATABASE_URL and FIXOKU_SHADOW_DATABASE_URL are required");

const majorObjects = (sql) => {
  const objects = [];
  for (const match of sql.matchAll(/CREATE\s+(?:TABLE|TYPE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]([^"`]+)["`]|([^\s(]+))(?:\.(?:["`]([^"`]+)["`]|([^\s(]+)))?/giu)) {
    const first = match[1] || match[2]; const second = match[3] || match[4]; objects.push(second ? `${first}.${second}` : first);
  }
  for (const match of sql.matchAll(/ALTER\s+TABLE\s+(?:(?:["`]([^"`]+)["`]|([^\s]+))\.)?(?:["`]([^"`]+)["`]|([^\s]+))\s+ADD\s+CONSTRAINT\s+(?:["`]([^"`]+)["`]|([^\s]+))/giu)) objects.push(`${match[3] || match[4]}.${match[5] || match[6]}`);
  return [...new Set(objects)];
};
const migrations = journal.entries.map((entry) => {
  const filename = `${entry.tag}.sql`;
  const sql = fs.readFileSync(path.join(migrationDir, filename), "utf8");
  return { index: entry.idx, tag: entry.tag, journalTimestamp: entry.when, sqlFile: filename, sourceHash: crypto.createHash("sha256").update(sql).digest("hex"), expectedMajorObjects: majorObjects(sql) };
});

async function snapshot(url) {
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  try {
    const [tables, columns, constraints, indexes, enums, schemas, ledger] = await Promise.all([
      pool.query("select table_schema,table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by table_schema,table_name"),
      pool.query("select table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default from information_schema.columns where table_schema not in ('pg_catalog','information_schema') order by table_schema,table_name,ordinal_position"),
      pool.query("select tc.table_schema,tc.table_name,tc.constraint_name,tc.constraint_type,coalesce(string_agg(kcu.column_name,',' order by kcu.ordinal_position),'') as columns from information_schema.table_constraints tc left join information_schema.key_column_usage kcu on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema and kcu.table_name=tc.table_name where tc.table_schema not in ('pg_catalog','information_schema') group by tc.table_schema,tc.table_name,tc.constraint_name,tc.constraint_type order by tc.table_schema,tc.table_name,tc.constraint_name"),
      pool.query("select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname not in ('pg_catalog','information_schema') order by schemaname,tablename,indexname"),
      pool.query("select n.nspname as schema_name,t.typname as type_name,e.enumlabel as enum_label from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname not in ('pg_catalog','information_schema') order by n.nspname,t.typname,e.enumsortorder"),
      pool.query("select schema_name from information_schema.schemata where schema_name not in ('pg_catalog','information_schema') and schema_name not like 'pg_temp%' and schema_name not like 'pg_toast_temp%' order by schema_name"),
      pool.query("select id,hash,created_at from drizzle.__drizzle_migrations order by created_at"),
    ]);
    return { tables: tables.rows, columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows, enums: enums.rows, schemas: schemas.rows, ledger: ledger.rows };
  } finally { await pool.end(); }
}

const current = await snapshot(currentUrl);
const shadow = await snapshot(shadowUrl);
const tableSet = (value) => new Set(value.tables.map((row) => `${row.table_schema}.${row.table_name}`));
const typeSet = (value) => new Set(value.enums.map((row) => `${row.schema_name}.${row.type_name}`));
const indexSet = (value) => new Set(value.indexes.map((row) => `${row.schemaname}.${row.indexname}`));
const constraintSet = (value) => new Set(value.constraints.map((row) => `${row.table_schema}.${row.table_name}.${row.constraint_name}`));
const presence = (value, objects) => Object.fromEntries(objects.map((object) => {
  const parts = object.split("."); const [schemaObject, name] = parts.length === 2 ? parts : ["public", parts[0]];
  const constraint = parts.length === 2 && constraintSet(value).has(`public.${schemaObject}.${name}`);
  return [object, tableSet(value).has(`${schemaObject}.${name}`) || typeSet(value).has(`${schemaObject}.${name}`) || indexSet(value).has(`${schemaObject}.${name}`) || constraint];
}));
const ledgerRow = (value, migration) => value.ledger.find((row) => Number(row.created_at) === migration.journalTimestamp);
const manifest = migrations.map((migration) => ({ ...migration, currentDbObjectPresence: presence(current, migration.expectedMajorObjects), currentDbLedgerPresence: Boolean(ledgerRow(current, migration)), currentDbLedgerHashMatch: ledgerRow(current, migration)?.hash === migration.sourceHash, shadowDbLedgerPresence: Boolean(ledgerRow(shadow, migration)), shadowDbLedgerHashMatch: ledgerRow(shadow, migration)?.hash === migration.sourceHash }));
const canonical = (value) => JSON.stringify(value);
const schemaSections = ["schemas", "tables", "columns", "constraints", "indexes", "enums"];
const schemaDiff = Object.fromEntries(schemaSections.map((section) => { const left = current[section].map((row) => canonical(row)); const right = shadow[section].map((row) => canonical(row)); return [section, { currentCount: left.length, shadowCount: right.length, onlyCurrent: left.filter((row) => !right.includes(row)).map((row) => JSON.parse(row)), onlyShadow: right.filter((row) => !left.includes(row)).map((row) => JSON.parse(row)) }]; }));
const currentLedgerMissing = manifest.filter((row) => !row.currentDbLedgerPresence).map((row) => row.tag);
const currentHashMismatches = manifest.filter((row) => row.currentDbLedgerPresence && !row.currentDbLedgerHashMatch).map((row) => row.tag);
const shadowLedgerMissing = manifest.filter((row) => !row.shadowDbLedgerPresence).map((row) => row.tag);
const outputDir = path.join(root, "docs", "architecture");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "drizzle-migration-authority-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), drizzleOrmVersion: "0.45.2", drizzleKitVersion: "0.31.10", sourceJournalCount: migrations.length, currentLedgerCount: current.ledger.length, shadowLedgerCount: shadow.ledger.length, currentLedgerMissing, currentHashMismatches, shadowLedgerMissing, manifest }, null, 2));
fs.writeFileSync(path.join(outputDir, "drizzle-migration-schema-diff.json"), JSON.stringify({ schemaEquivalent: schemaSections.every((section) => schemaDiff[section].onlyCurrent.length === 0 && schemaDiff[section].onlyShadow.length === 0), schemaDiff }, null, 2));
console.log(JSON.stringify({ sourceJournalCount: migrations.length, currentLedgerCount: current.ledger.length, shadowLedgerCount: shadow.ledger.length, currentLedgerMissing, currentHashMismatches, shadowLedgerMissing, schemaEquivalent: schemaSections.every((section) => schemaDiff[section].onlyCurrent.length === 0 && schemaDiff[section].onlyShadow.length === 0), manifestPath: "docs/architecture/drizzle-migration-authority-manifest.json", schemaDiffPath: "docs/architecture/drizzle-migration-schema-diff.json" }, null, 2));
