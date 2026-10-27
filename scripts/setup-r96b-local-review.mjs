import assert from "node:assert/strict";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { hashPassword } from "better-auth/crypto";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const sourceUrl = process.env.R96B_SOURCE_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const password = process.env.R96B_TEST_SEED_PASSWORD || process.env.TEST_SEED_PASSWORD;
assert.ok(sourceUrl, "R96B_SOURCE_DATABASE_URL_OR_LOCAL_DATABASE_REQUIRED");
assert.ok(password && password.length >= 12, "R96B_TEST_SEED_PASSWORD_REQUIRED");
const source = new URL(sourceUrl);
assert.ok(["127.0.0.1", "localhost", "::1"].includes(source.hostname), "R96B_LOOPBACK_DATABASE_REQUIRED");
const databaseName = "fixoku_test_commerce_r96b_local_review";
assert.match(databaseName, /^fixoku_test_commerce_[a-z0-9_]+$/u);
const adminUrl = new URL(source.toString());
adminUrl.pathname = "/postgres";
const adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
const databaseUrl = new URL(source.toString());
databaseUrl.pathname = `/${databaseName}`;
let pool;
try {
  const exists = (await adminPool.query("select 1 from pg_database where datname=$1", [databaseName])).rowCount > 0;
  if (!exists) await adminPool.query(`create database "${databaseName}"`);
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "drizzle/migrations" });

  const ownerAuthId = "r96b-local-owner-auth";
  const trainerAuthId = "r96b-ozlem-kaplan-auth";
  const ownerHash = await hashPassword(password);
  const trainerHash = await hashPassword(password);
  const owner = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values($1,'ersin@fixoku.com.tr','Ersin R96B Local Owner',true)
     on conflict(email) do update set email_verified=true,updated_at=now()
     returning id`, [ownerAuthId],
  )).rows[0];
  const trainer = (await pool.query(
    `insert into platform_users(auth_user_id,email,display_name,email_verified)
     values($1,'ozlem.kaplan@fixoku.com.tr','Özlem KAPLAN',true)
     on conflict(email) do update set auth_user_id=excluded.auth_user_id,display_name=excluded.display_name,email_verified=true,updated_at=now()
     returning id`, [trainerAuthId],
  )).rows[0];
  for (const [id, name, email, verified, hash] of [[ownerAuthId, "Ersin R96B Local Owner", "ersin@fixoku.com.tr", true, ownerHash], [trainerAuthId, "Özlem KAPLAN", "ozlem.kaplan@fixoku.com.tr", true, trainerHash]]) {
    await pool.query(
      `insert into "user"(id,name,email,email_verified,created_at,updated_at)
       values($1,$2,$3,$4,now(),now())
       on conflict(id) do update set name=excluded.name,email=excluded.email,email_verified=excluded.email_verified,updated_at=now()`, [id, name, email, verified],
    );
    await pool.query(
      `insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at)
       values($1,$2,'credential',$2,$3,now(),now())
       on conflict(id) do update set password=excluded.password,updated_at=now()`, [`${id}-credential`, id, hash],
    );
  }
  await pool.query(
    `insert into platform_memberships(user_id,scope_type,scope_id,role,status)
     values($1,'GLOBAL',null,'OWNER','ACTIVE')
     on conflict do nothing`, [owner.id],
  );
  await pool.query(
    `insert into platform_memberships(user_id,scope_type,scope_id,role,status)
     values($1,'TRAINER',$1,'TRAINER','ACTIVE')
     on conflict do nothing`, [trainer.id],
  );
  await pool.query(
    `insert into trainer_profiles(user_id,first_name,last_name)
     values($1,'Özlem','KAPLAN') on conflict(user_id) do update set first_name='Özlem',last_name='KAPLAN',updated_at=now()`, [trainer.id],
  );

  const slugs = [
    "ilkokul-akici-hizli-okuma-egitimi",
    "lise-hizli-okuma-egitimi",
    "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt",
    "ortaokul-hizli-okuma-egitimi",
    "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs",
  ];
  const packageQualificationCodes = {
    "ilkokul-akici-hizli-okuma-egitimi": ["PRIMARY_FAST"],
    "lise-hizli-okuma-egitimi": ["HIGH_FAST"],
    "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt": ["HIGH_PARAGRAPH"],
    "ortaokul-hizli-okuma-egitimi": ["MIDDLE_FAST"],
    "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs": ["MIDDLE_PARAGRAPH"],
  };
  for (const slug of slugs) {
    let row = (await pool.query(
      `select p.id as package_id,pv.id as package_version_id
         from packages p join lateral (
           select id from package_versions where package_id=p.id and status='PUBLISHED' order by version_number desc limit 1
         ) pv on true
        where p.slug=$1 and p.audience='TRAINER' limit 1`, [slug],
    )).rows[0];
    if (!row) {
      const packageRow = (await pool.query("select id from packages where slug=$1", [slug])).rows[0]
        || (await pool.query(
          `insert into packages(slug,audience,catalog_scope,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor)
           values($1,'TRAINER','TRAINER_COMMERCE','PUBLISHED',false,true,false,'FREE',0) returning id`, [slug],
        )).rows[0];
      const versionRow = (await pool.query("select id from package_versions where package_id=$1 and version_number=1", [packageRow.id])).rows[0]
        || (await pool.query(
          `insert into package_versions(package_id,version_number,title,description,features_json,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at)
           values($1,1,$2,$2,'[]',100000,120000,120000,'TRY',true,'PUBLISHED',now()) returning id`, [packageRow.id, `R96B ${slug}`],
        )).rows[0];
      await pool.query("update package_versions set status='PUBLISHED',purchase_enabled=true,published_at=coalesce(published_at,now()),updated_at=now() where id=$1", [versionRow.id]);
      row = { package_id: packageRow.id, package_version_id: versionRow.id };
    }
    for (const code of packageQualificationCodes[slug] || []) {
      const qualification = (await pool.query("select id from r6_qualification_definitions where code=$1", [code])).rows[0];
      if (qualification) await pool.query(
        `insert into r6_trainer_package_qualification_map(package_version_id,qualification_id)
         values($1,$2) on conflict(package_version_id,qualification_id) do nothing`, [row.package_version_id, qualification.id],
      );
    }
    await pool.query(
      `insert into trainer_package_entitlements(trainer_user_id,package_id,package_version_id,status,source,assigned_by,note)
       values($1,$2,$3,'ACTIVE','MANUAL_GIFT',$4,'LOCAL_REVIEW_FULL_ACCESS')
       on conflict (trainer_user_id,package_id) where status='ACTIVE'
       do update set package_version_id=excluded.package_version_id,source=excluded.source,assigned_by=excluded.assigned_by,note=excluded.note,revoked_at=null,updated_at=now()`, [trainer.id, row.package_id, row.package_version_id, owner.id],
    );
  }
  const qualificationCodes = ["PRIMARY_FAST", "MIDDLE_FAST", "HIGH_FAST", "ADULT_FAST", "MIDDLE_PARAGRAPH", "HIGH_PARAGRAPH"];
  for (const code of qualificationCodes) {
    const qualification = (await pool.query("select id from r6_qualification_definitions where code=$1", [code])).rows[0];
    assert.ok(qualification, `QUALIFICATION_REQUIRED:${code}`);
    await pool.query(
      `insert into r6_trainer_qualification_grants(trainer_user_id,qualification_id,source,status,source_ref,granted_by)
       values($1,$2,'OWNER_MANUAL','ACTIVE','LOCAL_REVIEW_FULL_ACCESS',$3)
       on conflict(trainer_user_id,qualification_id,source,source_ref)
       do update set status='ACTIVE',revoked_at=null,revoked_by=null,granted_by=excluded.granted_by,revoke_reason=null`, [trainer.id, qualification.id, owner.id],
    );
  }
  console.log(JSON.stringify({
    databaseName,
    databaseHost: source.hostname,
    databasePort: source.port,
    trainerEmail: "ozlem.kaplan@fixoku.com.tr",
    marker: "LOCAL_REVIEW_FULL_ACCESS",
    activePackageEntitlements: 5,
    activeQualificationGrants: 6,
    createdOrReused: exists ? "REUSED_LOCAL_DISPOSABLE" : "CREATED_LOCAL_DISPOSABLE",
    password: "REDACTED",
  }));
} finally {
  if (pool) await pool.end();
  await adminPool.end();
}
