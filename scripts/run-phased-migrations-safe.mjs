import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),".."
);

const folder = path.join(root,"drizzle/migrations");
const journal = JSON.parse(
  fs.readFileSync(
    path.join(folder,"meta/_journal.json"),"utf8"
  )
);

const entries = journal.entries;
const args = process.argv.slice(2);

const apply = args.includes("--apply-local-disposable");
const plan = args.includes("--plan");

const throughArg = args.find(x=>x.startsWith("--through="));
const through = throughArg
  ? Number(throughArg.split("=")[1])
  : 50;

if (
  plan === apply ||
  !Number.isInteger(through) ||
  through < 0 ||
  through > 50 ||
  args.some(x =>
    !["--plan","--apply-local-disposable"].includes(x) &&
    !/^--through=\d{1,2}$/.test(x)
  )
) {
  throw Error("R189_ARGUMENTS_INVALID");
}

assert.equal(entries.length,51,"R189_JOURNAL_COUNT");

for(let i=0;i<entries.length;i++) {
  assert.equal(entries[i].idx,i,"R189_INDEX_SEQUENCE");

  assert.ok(
    fs.existsSync(
      path.join(folder,entries[i].tag+".sql")
    ),
    "R189_MISSING_MIGRATION"
  );
}

assert.equal(
  entries[49].tag,
  "0049_student_commerce_order_reconciliation"
);
assert.equal(
  entries[50].tag,
  "0050_student_training_program_seed"
);

const manifest=JSON.parse(
  fs.readFileSync(
    path.join(
      root,"scripts/sql/FIXOKU_R175_TRAINING_PROGRAMS.json"
    ),"utf8"
  )
);

assert.equal(manifest.programs.length,4);
assert.equal(manifest.links.length,6);

console.log("MIGRATION_FILES=51_PASS");
console.log("PHASED_EXECUTION=ONE_MIGRATION_PER_COMMIT");
console.log("THROUGH="+String(through).padStart(4,"0"));
console.log("TRAINING_DEPENDENCY=4_PROGRAMS_6_LINKS");

if(plan) {
  console.log("DATABASE_CONNECTION=NO");
  console.log("DATABASE_WRITE=NO");
  console.log("R189=PLAN_PASS");
  process.exit(0);
}

// This first approved executor is deliberately LIMITED
// to local, separately created disposable test databases.
// It must never run against staging or Production.
if (
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV==="production" ||
  process.env.FIXOKU_ALLOW_DISPOSABLE_APPLY!=="YES"
) {
  throw Error("R189_APPLY_FORBIDDEN");
}

const raw=process.env.FIXOKU_DISPOSABLE_DATABASE_URL;
if(!raw) throw Error("R189_DATABASE_URL_MISSING");

const parsed=new URL(raw);

if (
  !["postgres:","postgresql:"].includes(parsed.protocol) ||
  !["127.0.0.1","localhost","[::1]"].includes(
    parsed.hostname.toLowerCase()
  ) ||
  !/^fixoku_test_commerce_[a-z0-9_]+$/u.test(
    decodeURIComponent(parsed.pathname.slice(1))
  )
) {
  throw Error("R189_NON_DISPOSABLE_DATABASE_FORBIDDEN");
}

const {createRequire}=await import("node:module");
const require=createRequire(
  path.join(root,"package.json")
);

const {Pool}=require("pg");
const {drizzle}=require("drizzle-orm/node-postgres");
const {migrate}=require("drizzle-orm/node-postgres/migrator");

const pool=new Pool({
  connectionString:raw,
  max:2,
  connectionTimeoutMillis:10000
});

const temp=fs.mkdtempSync(
  path.join(os.tmpdir(),"fixoku-r189-")
);

let stage="IDENTITY";

try {
  const identity=await pool.query(
    "select current_database() as name"
  );

  if(
    identity.rows[0]?.name !==
    decodeURIComponent(parsed.pathname.slice(1))
  ) {
    throw Error("R189_DATABASE_IDENTITY_MISMATCH");
  }

  const copy=path.join(temp,"migrations");
  fs.cpSync(folder,copy,{recursive:true});

  const journalFile=path.join(copy,"meta/_journal.json");

  for(let index=0;index<=through;index++) {
    stage=entries[index].tag;

    // The 0050 migration depends on real catalog versions.
    // Never fabricate versions in the release runner.
    if(index===50) {
      const missing=[];

      for(const link of manifest.links) {
        const found=await pool.query(`
          select pv.id
          from packages p
          join package_versions pv
            on pv.package_id=p.id
          where p.slug=$1
            and pv.version_number=$2
        `,[
          link.package_slug,
          link.version_number
        ]);

        if(found.rowCount!==1) missing.push(link);
      }

      if(missing.length) {
        console.log(
          "CATALOG_VERSIONS_MISSING="+missing.length
        );
        throw Error("R189_CATALOG_PREREQUISITES_MISSING");
      }
    }

    fs.writeFileSync(
      journalFile,
      JSON.stringify({
        ...journal,
        entries:entries.slice(0,index+1)
      },null,2)+"\n"
    );

    await migrate(drizzle(pool),{
      migrationsFolder:copy
    });

    console.log("MIGRATION_PASS="+stage);
  }

  console.log("R189=DISPOSABLE_APPLY_PASS");
} catch(error) {
  console.log("R189=STOP");
  console.log("FAILED_STAGE="+stage);
  console.log(
    "ERROR_CODE="+
    String(error.cause?.code||error.code||"NONE").slice(0,30)
  );

  const message=String(
    error.cause?.message||error.message||""
  );

  console.log(
    "ERROR_CATEGORY="+
    (message.includes("R189_CATALOG_PREREQUISITES_MISSING")
      ? "CATALOG_PREREQUISITES_MISSING"
      : message.includes("unsafe use of new value")
      ? "ENUM_TRANSACTION"
      : "REQUIRES_REVIEW")
  );

  process.exitCode=1;
} finally {
  await pool.end();
  fs.rmSync(temp,{recursive:true,force:true});
  console.log("TEMP_MIGRATIONS_REMOVED=YES");
}
