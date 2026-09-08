import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
loadLocalEnv();
const url = assertSafeSeedDatabaseUrl(process.env.SEED_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString: url.toString(), max: 2 });
const catalog = [
  ["akici-okuma-egitmen-egitimi", "Akıcı Okuma Eğitmen Eğitimi", "Öğrencilerde akıcı okuma becerisini geliştirmek için gerekli uygulamaları öğrenin.", 1],
  ["ortaokul-hizli-okuma-egitmen-egitimi", "Ortaokul Hızlı Okuma Eğitmen Eğitimi", "Ortaokul seviyesindeki öğrenciler için etkili hızlı okuma yöntemlerini keşfedin.", 2],
  ["lise-hizli-okuma-egitmen-egitimi", "Lise Hızlı Okuma Eğitmen Eğitimi", "Lise öğrencilerinin akademik başarısını destekleyen ileri seviye teknikler.", 3],
  ["yetiskin-hizli-okuma-egitmen-egitimi", "Yetişkin Hızlı Okuma Eğitmen Eğitimi", "Yetişkinlere yönelik hızlı okuma stratejileri ve uygulama yöntemleri.", 4],
  ["paragraf-egitmen-egitimi", "Paragraf Eğitmen Eğitimi", "Paragraf okuma, anlama ve yorumlama yöntemlerini öğrenin.", 5],
];
const client = await pool.connect();
try { await client.query("begin"); const trainer = (await client.query("select id from platform_users where auth_user_id=$1", ["phase1c-trainer-test-user"])).rows[0]; assert.ok(trainer, "TRAINER_PRINCIPAL_REQUIRED"); const ids = []; for (const [slug, title, description, order] of catalog) { const row = (await client.query("insert into training_programs (slug,title,short_description,audience,status,display_order) values ($1,$2,$3,'TRAINER','PUBLISHED',$4) on conflict (slug) do update set title=excluded.title, short_description=excluded.short_description, status='PUBLISHED', display_order=excluded.display_order returning id", [slug, title, description, String(order)])).rows[0]; ids.push(row.id); } await client.query("delete from trainer_entitlements where trainer_user_id=$1", [trainer.id]); for (const id of ids.slice(0, 3)) await client.query("insert into trainer_entitlements (trainer_user_id,training_program_id,status,starts_at) values ($1,$2,'ACTIVE',now())", [trainer.id, id]); await client.query("commit"); console.log(JSON.stringify({ seed: "PASS", catalog: catalog.length, activeEntitlements: 3, environment: "LOCAL_TEST_ONLY" })); } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); await pool.end(); }
