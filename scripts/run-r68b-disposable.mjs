import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import { readMigrationFiles } from "drizzle-orm/migrator";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRaw = process.env.R68B_SOURCE_DATABASE_URL || "";
const isolatedMode = process.env.R68B_ISOLATED_MODE === "1";
const expectedContainer = process.env.R68B_CONTAINER_NAME || "";
const expectedPort = String(process.env.R68B_EXPECTED_PORT || "");
const expectedContainerId = process.env.R68B_CONTAINER_ID || "";
const expectedLabelKey = process.env.R68B_RUN_LABEL_KEY || "";
const expectedLabelValue = process.env.R68B_RUN_LABEL_VALUE || "";
const expectedScopeLabel = process.env.R68B_SCOPE_LABEL_VALUE || "";
const results = [];

function result(name, status, detail = undefined) {
  results.push({ name, status, ...(detail === undefined ? {} : { detail }) });
}

function assertSourceUrl(raw) {
  assert.equal(isolatedMode, true, "R68B_ISOLATED_MODE_REQUIRED");
  assert.match(expectedContainer, /^fixoku-r68b-[0-9a-f]{24}$/u, "R68B_ISOLATED_CONTAINER_NAME");
  assert.match(expectedContainerId, /^[0-9a-f]{64}$/u, "R68B_ISOLATED_CONTAINER_ID");
  assert.equal(expectedLabelKey, "com.fixoku.r68b.run-id", "R68B_RUN_LABEL_KEY");
  assert.match(expectedLabelValue, /^[0-9a-f]{24}$/u, "R68B_RUN_LABEL_VALUE");
  assert.equal(expectedScopeLabel, "owner-approved-isolated", "R68B_SCOPE_LABEL_VALUE");
  assert.match(expectedPort, /^[1-9][0-9]{1,4}$/u, "R68B_ISOLATED_PORT");
  assert.notEqual(expectedPort, "5433", "R68B_OLD_PORT_FORBIDDEN");
  assert.notEqual(expectedContainer, "fixoku-platform-postgres", "R68B_EXISTING_CONTAINER_FORBIDDEN");
  const url = new URL(raw);
  assert.equal(url.protocol, "postgresql:", "R68B_SOURCE_PROTOCOL");
  assert.equal(url.hostname, "127.0.0.1", "R68B_SOURCE_HOST");
  assert.equal(url.port, expectedPort, "R68B_SOURCE_PORT");
  assert.equal(url.pathname, "/postgres", "R68B_SOURCE_DATABASE");
  assert.ok(url.username && url.password, "R68B_SOURCE_CREDENTIALS_REQUIRED");
  assert.equal(url.search, "", "R68B_SOURCE_QUERY_FORBIDDEN");
  assert.equal(url.hash, "", "R68B_SOURCE_FRAGMENT_FORBIDDEN");
  assert.equal(process.env.NODE_ENV, undefined, "R68B_NODE_ENV_MUST_BE_UNSET");
  assert.equal(process.env.VERCEL, undefined, "R68B_VERCEL_MUST_BE_UNSET");
  assert.equal(process.env.VERCEL_ENV, undefined, "R68B_VERCEL_ENV_MUST_BE_UNSET");
  return url;
}

async function query(pool, sql, values = []) {
  return (await pool.query(sql, values)).rows;
}

async function assertMigrationParity(pool, migrationsFolder) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const files = fs.readdirSync(migrationsFolder)
    .filter((name) => /^\d{4}_.+\.sql$/u.test(name))
    .sort();
  const tags = files.map((name) => name.slice(0, -4));
  assert.deepEqual(journal.entries.map((entry) => entry.tag), tags, "R68B_JOURNAL_SOURCE_TAGS");
  assert.deepEqual(journal.entries.map((entry) => Number(entry.idx)), journal.entries.map((_, index) => index), "R68B_JOURNAL_INDEXES");
  const source = readMigrationFiles({ migrationsFolder });
  const ledger = await query(pool, "select hash,created_at from drizzle.__drizzle_migrations order by created_at");
  assert.equal(ledger.length, files.length, "R68B_LEDGER_COUNT");
  assert.deepEqual(ledger.map((row) => row.hash), source.map((row) => row.hash), "R68B_LEDGER_HASHES");
  assert.deepEqual(ledger.map((row) => Number(row.created_at)), source.map((row) => row.folderMillis), "R68B_LEDGER_TIMESTAMPS");
  return { journalEntries: journal.entries.length, migrationFiles: files.length, ledgerRows: ledger.length };
}

async function readOnlyPreflight(pool) {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    const current = (await client.query("select current_database() as database")).rows[0]?.database;
    const relations = (await client.query(`
      select c.relname as "table", to_regclass('public.' || c.relname) is not null as present
        from (values ('enrollments'),('r6_training_group_participants'),('r6_student_child_profiles')) as c(relname)
    `)).rows;
    const duplicates = (await client.query(`
      select student_user_id,training_program_id,
             coalesce(beneficiary_child_profile_id,'00000000-0000-0000-0000-000000000000'::uuid) as target_key,
             count(*)::int as count
        from enrollments
       group by student_user_id,training_program_id,target_key
      having count(*) > 1
    `)).rows;
    const groupDuplicates = (await client.query(`
      select training_group_id,coalesce(child_profile_id,student_profile_id,student_user_id) as target_key,count(*)::int as count
        from r6_training_group_participants
       group by training_group_id,target_key
      having count(*) > 1
    `)).rows;
    const orphans = (await client.query(`
      select
        (select count(*)::int from r6_student_child_profiles c left join platform_users u on u.id=c.owner_user_id where u.id is null) as child_owner_orphans,
        (select count(*)::int from r6_training_group_participants p left join r6_student_child_profiles c on c.id=p.child_profile_id where p.child_profile_id is not null and c.id is null) as participant_child_orphans,
        (select count(*)::int from enrollments e left join r6_student_child_profiles c on c.id=e.beneficiary_child_profile_id where e.beneficiary_child_profile_id is not null and c.id is null) as enrollment_child_orphans
    `)).rows[0];
    assert.equal(duplicates.length, 0, "R68B_PRE_FLIGHT_ENROLLMENT_DUPLICATE");
    assert.equal(groupDuplicates.length, 0, "R68B_PRE_FLIGHT_GROUP_DUPLICATE");
    assert.equal(Number(orphans.child_owner_orphans), 0, "R68B_PRE_FLIGHT_CHILD_OWNER_ORPHAN");
    assert.equal(Number(orphans.participant_child_orphans), 0, "R68B_PRE_FLIGHT_PARTICIPANT_ORPHAN");
    assert.equal(Number(orphans.enrollment_child_orphans), 0, "R68B_PRE_FLIGHT_ENROLLMENT_ORPHAN");
    await client.query("rollback");
    return { database: current, relations, duplicates: 0, groupDuplicates: 0, orphans };
  } catch (error) {
    try { await client.query("rollback"); } catch { /* Preserve original preflight error. */ }
    throw error;
  } finally {
    client.release();
  }
}

async function makePre0040Migrations() {
  const source = path.join(root, "drizzle", "migrations");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fixoku-r68b-pre0040-"));
  fs.mkdirSync(path.join(temp, "meta"), { recursive: true });
  for (const entry of fs.readdirSync(source)) {
    if (entry.endsWith(".sql") && entry !== "0040_r64_child_identity_isolation.sql") {
      fs.copyFileSync(path.join(source, entry), path.join(temp, entry));
    }
  }
  const journal = JSON.parse(fs.readFileSync(path.join(source, "meta", "_journal.json"), "utf8"));
  journal.entries = journal.entries.filter((entry) => Number(entry.idx) < 40);
  fs.writeFileSync(path.join(temp, "meta", "_journal.json"), `${JSON.stringify(journal, null, 2)}\n`, "utf8");
  return temp;
}

async function testLegacyTo0040(sourceUrl) {
  const { createDisposableDatabase } = await import("./disposable-test-db.mjs");
  const migrationsFolder = await makePre0040Migrations();
  let fixture;
  try {
    fixture = await createDisposableDatabase(sourceUrl.toString(), { migrationsFolder });
    const pool = fixture.pool;
    const owner = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('r68b-legacy-owner','r68b-legacy-owner@example.test','R68B Legacy Owner',true) returning id")).rows[0].id;
    const profile = (await pool.query("insert into student_profiles(user_id,first_name,last_name,status) values($1,'Legacy','Profile','ACTIVE') returning id", [owner])).rows[0].id;
    const program = (await pool.query("insert into training_programs(slug,title,short_description,audience,status) values('r68b-legacy-program','R68B Legacy Program','Disposable legacy fixture','STUDENT','PUBLISHED') returning id")).rows[0].id;
    const group = (await pool.query("insert into r6_training_groups(education_stage,training_type,mode,min_students,max_students,status,created_by) values('MIDDLE','FAST_READING','GROUP',1,5,'DRAFT',$1) returning id", [owner])).rows[0].id;
    await pool.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE')", [owner, program]);
    await pool.query("insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,status) values($1,$2,$3,'ACTIVE')", [group, profile, owner]);
    const legacyConstraint = await query(pool, "select count(*)::int as count from pg_constraint where conrelid='public.r6_training_group_participants'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (training_group_id, student_user_id)'");
    assert.equal(legacyConstraint[0].count, 1, "R68B_LEGACY_PARTICIPANT_CONSTRAINT");
    const sql = fs.readFileSync(path.join(root, "drizzle", "migrations", "0040_r64_child_identity_isolation.sql"), "utf8");
    await pool.query(sql);
    const column = await query(pool, "select data_type from information_schema.columns where table_schema='public' and table_name='enrollments' and column_name='beneficiary_child_profile_id'");
    assert.equal(column[0]?.data_type, "uuid", "R68B_0040_CHILD_COLUMN");
    const index = await query(pool, "select indexdef from pg_indexes where schemaname='public' and indexname in ('enrollments_beneficiary_program_uq','r6_training_group_participants_uq')");
    assert.equal(index.length, 2, "R68B_0040_INDEXES");
    const foreignKey = await query(pool, "select count(*)::int as count from pg_constraint where conrelid='public.enrollments'::regclass and contype='f' and confrelid='public.r6_student_child_profiles'::regclass");
    assert.equal(foreignKey[0].count, 1, "R68B_0040_CHILD_FK");
    return { legacyConstraint: "PASS", apply: "PASS", childColumn: "PASS", indexes: "PASS", foreignKey: "PASS" };
  } finally {
    await fixture?.dispose();
    fs.rmSync(migrationsFolder, { recursive: true, force: true });
  }
}

async function testMultiChild(sourceUrl) {
  const { createDisposableDatabase } = await import("./disposable-test-db.mjs");
  const fixture = await createDisposableDatabase(sourceUrl.toString(), { migrationsFolder: path.join(root, "drizzle", "migrations") });
  try {
    const pool = fixture.pool;
    const owner = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('r68b-owner','r68b-owner@example.test','R68B Owner',true) returning id")).rows[0].id;
    const child1 = (await pool.query("insert into r6_student_child_profiles(owner_user_id,first_name,last_name,education_stage,grade,status) values($1,'Child','One','MIDDLE','6','ACTIVE') returning id", [owner])).rows[0].id;
    const child2 = (await pool.query("insert into r6_student_child_profiles(owner_user_id,first_name,last_name,education_stage,grade,status) values($1,'Child','Two','MIDDLE','6','ACTIVE') returning id", [owner])).rows[0].id;
    const program = (await pool.query("insert into training_programs(slug,title,short_description,audience,status) values('r68b-child-program','R68B Child Program','Disposable child fixture','STUDENT','PUBLISHED') returning id")).rows[0].id;
    const packageRow = (await pool.query("insert into packages(slug,audience,catalog_scope,status) values('r68b-child-package','STUDENT','STUDENT_COMMERCE','PUBLISHED') returning id")).rows[0].id;
    const version = (await pool.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status,published_at) values($1,1,'R68B Child Package','Disposable child package',100000,'TRY','PUBLISHED',now()) returning id", [packageRow])).rows[0].id;
    const order1 = (await pool.query("insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_child_profile_id,status,currency,subtotal_minor,total_minor,idempotency_key,request_hash) values($1,$1,$2,'PAID','TRY',100000,100000,'r68b-order-one','r68b-hash-one') returning id", [owner, child1])).rows[0].id;
    const order2 = (await pool.query("insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_child_profile_id,status,currency,subtotal_minor,total_minor,idempotency_key,request_hash) values($1,$1,$2,'PAID','TRY',100000,100000,'r68b-order-two','r68b-hash-two') returning id", [owner, child2])).rows[0].id;
    const item1 = (await pool.query("insert into order_items(order_id,package_id,package_version_id,beneficiary_child_profile_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency) values($1,$2,$3,$4,'R68B Child Package','Disposable',1,'SELF_PACED',100000,100000,'TRY') returning id", [order1, packageRow, version, child1])).rows[0].id;
    const item2 = (await pool.query("insert into order_items(order_id,package_id,package_version_id,beneficiary_child_profile_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency) values($1,$2,$3,$4,'R68B Child Package','Disposable',1,'SELF_PACED',100000,100000,'TRY') returning id", [order2, packageRow, version, child2])).rows[0].id;
    const ent1 = (await pool.query("insert into package_entitlements(beneficiary_student_user_id,beneficiary_child_profile_id,package_id,package_version_id,source_order_id,source_order_item_id,issuance_key) values($1,$2,$3,$4,$5,$6,'r68b-ent-one') returning id", [owner, child1, packageRow, version, order1, item1])).rows[0].id;
    const ent2 = (await pool.query("insert into package_entitlements(beneficiary_student_user_id,beneficiary_child_profile_id,package_id,package_version_id,source_order_id,source_order_item_id,issuance_key) values($1,$2,$3,$4,$5,$6,'r68b-ent-two') returning id", [owner, child2, packageRow, version, order2, item2])).rows[0].id;
    const enrollment1 = (await pool.query("insert into enrollments(student_user_id,beneficiary_child_profile_id,training_program_id,progress_percent,status) values($1,$2,$3,70,'ACTIVE') returning id", [owner, child1, program])).rows[0].id;
    const enrollment2 = (await pool.query("insert into enrollments(student_user_id,beneficiary_child_profile_id,training_program_id,progress_percent,status) values($1,$2,$3,20,'ACTIVE') returning id", [owner, child2, program])).rows[0].id;
    await assert.rejects(pool.query("insert into enrollments(student_user_id,beneficiary_child_profile_id,training_program_id) values($1,$2,$3)", [owner, child1, program]), /duplicate key/iu);
    await pool.query("insert into package_entitlement_enrollments(package_entitlement_id,enrollment_id,training_program_id,source_order_item_id) values($1,$2,$3,$4),($5,$6,$3,$7)", [ent1, enrollment1, program, item1, ent2, enrollment2, item2]);
    const trainer1 = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('r68b-trainer-one','r68b-trainer-one@example.test','R68B Trainer One',true) returning id")).rows[0].id;
    const trainer2 = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('r68b-trainer-two','r68b-trainer-two@example.test','R68B Trainer Two',true) returning id")).rows[0].id;
    const assignment1 = (await pool.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE') returning id", [trainer1, enrollment1])).rows[0].id;
    const assignment2 = (await pool.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE') returning id", [trainer2, enrollment2])).rows[0].id;
    await pool.query("insert into enrollment_sessions(enrollment_id,assignment_id,trainer_user_id,progress_percent,status) values($1,$2,$3,70,'SCHEDULED'),($4,$5,$6,20,'SCHEDULED')", [enrollment1, assignment1, trainer1, enrollment2, assignment2, trainer2]);
    await pool.query("insert into enrollment_completions(enrollment_id,assignment_id,completed_by,idempotency_key) values($1,$2,$3,'r68b-completion-one'),($4,$5,$6,'r68b-completion-two')", [enrollment1, assignment1, trainer1, enrollment2, assignment2, trainer2]);
    await pool.query("insert into trainer_earning_ledger(trainer_user_id,student_user_id,training_program_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,enrollment_id,assignment_id,occurred_at,payable_at) values($1,$2,$3,'SESSION','EARNED',100000,'TRY','R68B child one completion','R68B_TEST',$4,'r68b-earning-one',$5,$6,now(),date_trunc('month',now()+interval '1 month') + interval '0 day'),($7,$2,$3,'SESSION','EARNED',100000,'TRY','R68B child two completion','R68B_TEST',$8,'r68b-earning-two',$9,$10,now(),date_trunc('month',now()+interval '1 month') + interval '0 day')", [trainer1, owner, program, enrollment1, enrollment1, assignment1, trainer2, enrollment2, enrollment2, assignment2]);
    const counts = (await pool.query("select count(*) filter(where beneficiary_child_profile_id=$2)::int as child_one,count(*) filter(where beneficiary_child_profile_id=$3)::int as child_two from package_entitlements where beneficiary_student_user_id=$1", [owner, child1, child2])).rows[0];
    assert.equal(Number(counts.child_one), 1); assert.equal(Number(counts.child_two), 1);
    const enrollments = (await pool.query("select beneficiary_child_profile_id,progress_percent from enrollments where student_user_id=$1 and training_program_id=$2 order by beneficiary_child_profile_id", [owner, program])).rows;
    assert.equal(enrollments.length, 2); assert.deepEqual(enrollments.map((row) => Number(row.progress_percent)).sort((a, b) => a - b), [20, 70]);
    const assignments = await query(pool, "select count(*)::int as count from trainer_assignments where enrollment_id in ($1,$2)", [enrollment1, enrollment2]);
    assert.equal(Number(assignments[0].count), 2);
    const completionRows = await query(pool, "select count(*)::int as count from enrollment_completions where enrollment_id in ($1,$2)", [enrollment1, enrollment2]);
    assert.equal(Number(completionRows[0].count), 2);
    return { coverage: "DB_SCHEMA_FIXTURE_PASS", childProfiles: 2, entitlements: 2, enrollments: 2, progress: [70, 20], assignments: 2, completionRows: 2, earnings: 2, duplicateSameChildRejected: true, domainWorkflow: "NOT_RUN" };
  } finally {
    await fixture.dispose();
  }
}

const CHILD_INHERITED_ENV_KEYS = [
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LOCALAPPDATA",
  "APPDATA",
  "COMSPEC",
  "OS",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
  "NUMBER_OF_PROCESSORS",
];

function memberProperty(node) {
  if (node?.type !== "MemberExpression") return null;
  if (!node.computed && node.property?.type === "Identifier") return node.property.name;
  if (node.computed && node.property?.type === "Literal" && typeof node.property.value === "string") return node.property.value;
  return null;
}

function isProcessEnvMember(node, expectedName = null) {
  if (node?.type !== "MemberExpression") return false;
  if (node.object?.type !== "MemberExpression" || node.object.computed) return false;
  if (node.object.object?.type !== "Identifier" || node.object.object.name !== "process") return false;
  if (memberProperty(node.object) !== "env") return false;
  const name = memberProperty(node);
  return expectedName === null ? Boolean(name) : name === expectedName;
}

function collectTopLevelBindings(ast) {
  const bindings = new Map();
  for (const statement of ast.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (declaration.id.type === "Identifier" && declaration.init) bindings.set(declaration.id.name, declaration.init);
    }
  }
  return bindings;
}

function isAllowedDatabaseExpression(node, bindings, seen = new Set()) {
  if (!node) return false;
  if (node.type === "LogicalExpression" && node.operator === "||") {
    return isAllowedDatabaseExpression(node.left, bindings, seen) && isAllowedDatabaseExpression(node.right, bindings, seen);
  }
  if (isProcessEnvMember(node, "TEST_DATABASE_URL") || isProcessEnvMember(node, "DATABASE_URL")) return true;
  if (node.type === "Identifier" && bindings.has(node.name) && !seen.has(node.name)) {
    const nextSeen = new Set(seen);
    nextSeen.add(node.name);
    return isAllowedDatabaseExpression(bindings.get(node.name), bindings, nextSeen);
  }
  return false;
}

function isLoopbackOriginExpression(node, bindings, seen = new Set()) {
  if (!node) return false;
  if (node.type === "Identifier" && bindings.has(node.name) && !seen.has(node.name)) {
    const nextSeen = new Set(seen);
    nextSeen.add(node.name);
    return isLoopbackOriginExpression(bindings.get(node.name), bindings, nextSeen);
  }
  if (node.type !== "TemplateLiteral") return false;
  return node.quasis.some((quasi) => /https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/iu.test(quasi.value.raw))
    || node.expressions.some((expression) => isLoopbackOriginExpression(expression, bindings, seen));
}

function assertChildScriptSourceSafe(script) {
  const source = fs.readFileSync(path.join(root, "scripts", script), "utf8");
  let ast;
  try {
    ast = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  } catch (error) {
    throw new Error(`R68B_CHILD_SOURCE_PARSE_FAILED:${script}:${error.message}`);
  }
  const bindings = collectTopLevelBindings(ast);
  let disposableImport = false;
  let disposableCall = false;
  let safeDisposableArgument = false;
  const unsafeProviderEnv = [];
  const externalUrls = [];
  const fetchCalls = [];
  const spawnFlagSets = [];
  walk(ast, (node) => {
    if (node.type === "ImportDeclaration" && node.source.value === "./disposable-test-db.mjs") {
      disposableImport ||= node.specifiers.some((specifier) => specifier.type === "ImportSpecifier" && specifier.imported.name === "createDisposableDatabase");
    }
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "createDisposableDatabase") {
      disposableCall = true;
      safeDisposableArgument ||= isAllowedDatabaseExpression(node.arguments[0], bindings);
    }
    if (node.type === "MemberExpression" && isProcessEnvMember(node)) {
      const name = memberProperty(node);
      if (/^(?:PAYTR|SMTP|SHIPPING|S3|NEON|VERCEL)(?:_|$)/iu.test(name)) unsafeProviderEnv.push(name);
    }
    if (node.type === "Literal" && typeof node.value === "string" && /^https?:\/\//iu.test(node.value) && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/iu.test(node.value)) externalUrls.push(node.value);
    if (node.type === "TemplateElement" && /^https?:\/\//iu.test(node.value.raw) && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/iu.test(node.value.raw)) externalUrls.push(node.value.raw);
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "fetch") fetchCalls.push(node);
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "spawn" && node.arguments[1]?.type === "ArrayExpression") {
      spawnFlagSets.push(node.arguments[1].elements.filter((element) => element?.type === "Literal" && typeof element.value === "string").map((element) => element.value));
    }
    if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && !node.callee.computed && ["request", "get", "post", "put", "delete"].includes(node.callee.property.name)) {
      const objectName = node.callee.object.type === "Identifier" ? node.callee.object.name : "";
      if (["http", "https", "axios"].includes(objectName)) throw new Error(`R68B_CHILD_PROVIDER_HTTP_FORBIDDEN:${script}`);
    }
  });
  assert.equal(disposableImport, true, `R68B_CHILD_DISPOSABLE_IMPORT_REQUIRED:${script}`);
  assert.equal(disposableCall, true, `R68B_CHILD_DISPOSABLE_CALL_REQUIRED:${script}`);
  assert.equal(safeDisposableArgument, true, `R68B_CHILD_DATABASE_ENV_UNPROVEN:${script}`);
  assert.deepEqual(unsafeProviderEnv, [], `R68B_CHILD_PROVIDER_ENV_FORBIDDEN:${script}`);
  assert.doesNotMatch(source, /R68B_SOURCE_DATABASE_URL/u, `R68B_CHILD_SOURCE_ENV_FORBIDDEN:${script}`);
  assert.doesNotMatch(source, /\.\.\.\s*process\.env/u, `R68B_CHILD_ENV_SPREAD_FORBIDDEN:${script}`);
  assert.doesNotMatch(source, /integration[\\/]\.env\.local/u, `R68B_CHILD_REMOTE_ENV_FORBIDDEN:${script}`);
  assert.doesNotMatch(source, /\.env\.local/u, `R68B_CHILD_LOCAL_ENV_READ_FORBIDDEN:${script}`);
  assert.deepEqual(externalUrls, [], `R68B_CHILD_EXTERNAL_URL_FORBIDDEN:${script}`);
  for (const fetchCall of fetchCalls) {
    assert.equal(isLoopbackOriginExpression(fetchCall.arguments[0], bindings), true, `R68B_CHILD_FETCH_ORIGIN_UNPROVEN:${script}`);
  }
  if (["test-release011f-student-bank-transfer.mjs", "test-dev035-http.mjs"].includes(script)) {
    assert.match(source, /net\.createServer\(\)/u, `R68B_CHILD_LOOPBACK_PORT_PROBE_REQUIRED:${script}`);
    assert.match(source, /port:\s*0/u, `R68B_CHILD_OS_PORT_SELECTION_REQUIRED:${script}`);
    assert.ok(spawnFlagSets.some((flags) => flags.includes("--strictPort") && flags.includes("--mode") && flags.includes("test") && flags.includes("--host") && flags.includes("127.0.0.1")), `R68B_CHILD_STRICT_LOOPBACK_VITE_REQUIRED:${script}`);
    assert.match(source, /redirect:\s*["']manual["']/u, `R68B_CHILD_REDIRECT_GUARD_REQUIRED:${script}`);
    assert.match(source, /server(?:\.output|Output)\.includes\(/u, `R68B_CHILD_PROCESS_ADDRESS_PROOF_REQUIRED:${script}`);
  }
}

function assertViteLocalEnvOptOut() {
  const viteConfig = fs.readFileSync(path.join(root, "vite.config.js"), "utf8");
  assert.match(viteConfig, /const\s+testEnvIsolation\s*=\s*mode\s*===\s*["']test["']/u, "R68B_VITE_TEST_MODE_REQUIRED");
  assert.match(viteConfig, /if\s*\(!testEnvIsolation\s*&&\s*fs\.existsSync\(['"]\.env\.local['"]\)/u, "R68B_VITE_LOCAL_ENV_OPT_OUT_REQUIRED");
  assert.match(viteConfig, /envDir:\s*testEnvIsolation\s*\?\s*false\s*:/u, "R68B_VITE_BUILTIN_ENV_OPT_OUT_REQUIRED");
  assert.match(viteConfig, /JSON\.stringify\(testEnvIsolation\s*\?\s*['"]{2}/u, "R68B_GTM_TEST_ID_EMPTY_REQUIRED");
}

function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visitor);
    return;
  }
  if (typeof node.type === "string") visitor(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "raw"].includes(key)) continue;
    walk(value, visitor);
  }
}

function buildChildEnvironment(childDatabaseUrl) {
  const environment = {};
  for (const key of CHILD_INHERITED_ENV_KEYS) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  Object.assign(environment, {
    NODE_ENV: "test",
    DATABASE_URL: childDatabaseUrl,
    TEST_DATABASE_URL: childDatabaseUrl,
    TEST_SEED_PASSWORD: "R68B-Disposable-Password-Only",
    BETTER_AUTH_SECRET: "R68B-DISPOSABLE-SYNTHETIC-SECRET-ONLY",
    EMAIL_PROVIDER: "DISABLED",
    PAYTR_ENABLED: "0",
    SHIPPING_PROVIDER: "DISABLED",
    DIGITAL_STORAGE_PROVIDER: "LOCAL",
    PROFILE_MEDIA_PROVIDER: "LOCAL",
    FIXOKU_SKIP_LOCAL_ENV: "1",
    FIXOKU_DEV_LOGIN_ENABLED: "0",
  });
  return environment;
}

async function runChildScript(script, sourceUrl, migrationsFolder) {
  assertChildScriptSourceSafe(script);
  const { createDisposableDatabase } = await import("./disposable-test-db.mjs");
  let childFixture;
  try {
    childFixture = await createDisposableDatabase(sourceUrl.toString(), { migrationsFolder });
    const childDatabaseUrl = childFixture.databaseUrl.toString();
    const childEnv = buildChildEnvironment(childDatabaseUrl);
    return await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(root, "scripts", script)], {
        cwd: root,
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let spawnError = null;
      let safeDiagnosticBuffer = "";
      let safeDiagnosticText = "";
      const collectSafeDiagnostic = (chunk) => {
        // Child stderr is intentionally not forwarded. Keep only the bounded,
        // machine-readable diagnostic emitted by the student commerce test.
        safeDiagnosticBuffer = (safeDiagnosticBuffer + String(chunk || "")).slice(-8192);
        const match = safeDiagnosticBuffer.match(/R68B_SAFE_DIAGNOSTIC=(\{[^\r\n]{1,4096}\})/u);
        if (match) safeDiagnosticText = match[1];
      };
      child.stdout.on("data", collectSafeDiagnostic);
      child.stderr.on("data", collectSafeDiagnostic);
      child.once("error", (error) => { spawnError = error; });
      child.on("close", (code) => {
        let diagnostic = null;
        if (safeDiagnosticText) {
          try {
            const parsed = JSON.parse(safeDiagnosticText);
            const source = parsed?.source;
            if (
              typeof parsed?.stage === "string" && /^[A-Z0-9_.:-]{1,120}$/u.test(parsed.stage)
              && (parsed.errorCode === null || (typeof parsed.errorCode === "string" && /^[A-Z0-9_.:-]{1,120}$/u.test(parsed.errorCode)))
              && (parsed.sqlState === null || (typeof parsed.sqlState === "string" && /^[A-Z0-9_.:-]{1,32}$/u.test(parsed.sqlState)))
              && typeof parsed?.assertion === "string" && /^[A-Z0-9_.:-]{1,160}$/u.test(parsed.assertion)
              && typeof source?.file === "string" && /^(?:scripts|src|api)\/[A-Za-z0-9._/-]{1,240}$/u.test(source.file)
              && (source.line === null || (Number.isInteger(source.line) && source.line >= 1 && source.line <= 100000))
            ) diagnostic = { stage: parsed.stage, errorCode: parsed.errorCode, sqlState: parsed.sqlState, assertion: parsed.assertion, source: { file: source.file, line: source.line } };
          } catch {
            diagnostic = null;
          }
        }
        resolve({ script, code, spawnError, diagnostic, rawTail: safeDiagnosticBuffer.slice(-2000) });
      });
    });
  } finally {
    await childFixture?.dispose();
  }
}

assertSourceUrl(sourceRaw);
assertViteLocalEnvOptOut();
const sourceUrl = new URL(sourceRaw);
const { createDisposableDatabase } = await import("./disposable-test-db.mjs");
const migrationsFolder = path.join(root, "drizzle", "migrations");
let primary;
let cleanup = "NOT_RUN";
let prerequisiteFailure = null;
try {
  result("LEGACY_MIGRATION_0040", "PASS", await testLegacyTo0040(sourceUrl));
} catch (error) {
  prerequisiteFailure = error;
  result("LEGACY_MIGRATION_0040", "FAIL", error instanceof Error ? error.message : String(error));
}
try {
  if (!prerequisiteFailure) {
    primary = await createDisposableDatabase(sourceUrl.toString(), { migrationsFolder });
    assert.match(primary.databaseName, /^fixoku_test_/u);
    const currentDatabase = (await primary.pool.query("select current_database() as database")).rows[0]?.database;
    assert.equal(currentDatabase, primary.databaseName);
    result("DISPOSABLE_DB", "PASS", { database: primary.databaseName });
    result("MIGRATION_0040", "PASS", await assertMigrationParity(primary.pool, migrationsFolder));
    result("PREFLIGHT", "PASS", await readOnlyPreflight(primary.pool));
    const childCoverage = await testMultiChild(sourceUrl);
    result("MULTI_CHILD_RUNTIME", childCoverage.coverage === "DB_SCHEMA_FIXTURE_PASS" ? "PARTIAL" : "PASS", childCoverage);
  }
} catch (error) {
  prerequisiteFailure ||= error;
  result("DISPOSABLE_DB_OR_MIGRATION", "FAIL", error instanceof Error ? error.message : String(error));
} finally {
  if (primary) {
    try {
      await primary.dispose();
      cleanup = "PASS";
      result("TEST_DB_CLEANUP", "PASS");
    } catch (error) {
      cleanup = error instanceof Error ? error.message : String(error);
      prerequisiteFailure ||= error;
      result("TEST_DB_CLEANUP", "FAIL", cleanup);
    }
  }
}

const childScripts = [
  "test-migration-from-zero.mjs",
  "test-student-commerce-db.mjs",
  "test-group-capacity-concurrency.mjs",
  "test-r5b-trainer-fulfillment.mjs",
  "test-r72-isolated-acceptance.mjs",
  "test-release011f-student-bank-transfer.mjs",
  "test-dev035-http.mjs",
];
if (!prerequisiteFailure) {
  for (const script of childScripts) {
    let run;
    try {
      run = await runChildScript(script, sourceUrl, migrationsFolder);
    } catch (error) {
      prerequisiteFailure = error;
      if (script === "test-student-commerce-db.mjs") result(script, "FAIL", { diagnostic: { stage: "CHILD_SETUP", errorCode: "CHILD_SETUP_FAILED", sqlState: null, assertion: "CHILD_SETUP", source: { file: script, line: null } } });
      else result(script, "FAIL", error instanceof Error ? error.message : String(error));
      break;
    }
    if (run.spawnError) result(script, "BLOCKED", { reason: "CHILD_PROCESS_SPAWN_BLOCKED" });
    else if (run.code === 0 && script === "test-r72-isolated-acceptance.mjs") result(script, "PASS", { rawTail: run.rawTail });
    else if (run.code === 0) result(script, "PASS");
    else if (script === "test-r72-isolated-acceptance.mjs") result(script, "FAIL", { exitCode: run.code, diagnostic: run.diagnostic || { stage: "UNKNOWN", errorCode: "CHILD_PROCESS_EXIT", sqlState: null, assertion: "DIAGNOSTIC_UNAVAILABLE", source: { file: script, line: null } }, rawTail: run.rawTail });
    else if (script === "test-student-commerce-db.mjs") result(script, "FAIL", { exitCode: run.code, diagnostic: run.diagnostic || { stage: "UNKNOWN", errorCode: "CHILD_PROCESS_EXIT", sqlState: null, assertion: "DIAGNOSTIC_UNAVAILABLE", source: { file: script, line: null } } });
    else result(script, "FAIL", { exitCode: run.code });
    if (run.spawnError || run.code !== 0) {
      prerequisiteFailure = run.spawnError || new Error(`${script}:exit:${run.code}`);
      break;
    }
  }
} else {
  result("CHILD_SUITE", "BLOCKED", "R68B_FAIL_FAST_PREREQUISITE_FAILED");
}

if (cleanup === "NOT_RUN") result("TEST_DB_CLEANUP", "NOT_RUN");
if (prerequisiteFailure) process.exitCode = 1;

console.log(JSON.stringify({
  isolatedMode,
  container: expectedContainer,
  sourceHost: sourceUrl.hostname,
  sourcePort: sourceUrl.port,
  results,
  testDatabaseCleanup: cleanup,
  realProviders: "NONE",
  productionReady: "NO",
}, null, 2));
