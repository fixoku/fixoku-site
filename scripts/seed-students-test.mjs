import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const url = assertSafeSeedDatabaseUrl(process.env.SEED_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
const password = process.env.TEST_SEED_PASSWORD; assert.ok(password && password.length >= 12, "TEST_SEED_PASSWORD_REQUIRED");
const principals = [
  ["phase1c-trainer-test-user", "trainer.phase1c@example.test", "Özlem Yılmaz", "TRAINER"],
  ["phase1h-trainer-b-test-user", "trainer.b.phase1h@example.test", "Phase 1H Trainer B", "TRAINER"],
  ["phase1c-student-test-user", "student.phase1c@example.test", "Fixoku Test Student A", "STUDENT"],
  ["phase1h-student-b-test-user", "student.b.phase1h@example.test", "Phase 1H Student B", "STUDENT"],
  ["phase1h-student-c-test-user", "student.c.phase1h@example.test", "Phase 1H Student C", "STUDENT"],
  ["phase1h-student-d-test-user", "student.d.phase1h@example.test", "Phase 1H Student D", "STUDENT"],
];
const pool = new pg.Pool({ connectionString: url.toString(), max: 2 }); const c = await pool.connect();
try { await c.query("begin"); const program = (await c.query("select id from training_programs where audience='TRAINER' and status='PUBLISHED' order by display_order limit 1")).rows[0]?.id; assert.ok(program, "TRAINING_PROGRAM_REQUIRED"); const ids = {};
 for (const [id,email,name,role] of principals) { const ph = await hashPassword(password); await c.query("insert into \"user\"(id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now()) on conflict(id) do update set name=excluded.name,email=excluded.email,email_verified=true,updated_at=now()",[id,name,email]); await c.query("insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now()) on conflict(id) do update set password=excluded.password,updated_at=now()",[id+"-credential",id,ph]); const u=(await c.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) on conflict(email) do update set auth_user_id=excluded.auth_user_id,display_name=excluded.display_name,email_verified=true,updated_at=now() returning id",[id,email,name])).rows[0].id; ids[id]=u; const scope=role==="TRAINER"?"TRAINER":"STUDENT"; await c.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$1,$3,'ACTIVE') on conflict do nothing",[u,scope,role]); if(role==="STUDENT") { await c.query("insert into student_profiles(user_id,grade,school,status) values($1,'8. sınıf','Fixoku Test Okulu','ACTIVE') on conflict(user_id) do update set status='ACTIVE'",[u]); await c.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') on conflict(student_user_id,training_program_id) do update set status='ACTIVE',updated_at=now()",[u,program]); } }
 const studentIds=[ids["phase1c-student-test-user"],ids["phase1h-student-b-test-user"],ids["phase1h-student-c-test-user"],ids["phase1h-student-d-test-user"]]; const ens=await c.query("select id,student_user_id from enrollments where student_user_id = any($1::uuid[])",[studentIds]); for(const row of ens.rows){const trainer=row.student_user_id===ids["phase1h-student-c-test-user"]?ids["phase1h-trainer-b-test-user"]:(row.student_user_id===ids["phase1h-student-d-test-user"]?null:ids["phase1c-trainer-test-user"]); if(trainer) await c.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE') on conflict(trainer_user_id,enrollment_id) do update set status='ACTIVE',updated_at=now()",[trainer,row.id]); }
 await c.query("insert into trainer_student_links(trainer_user_id,student_user_id,status) values($1,$2,'ACTIVE') on conflict(trainer_user_id,student_user_id) do update set status='ACTIVE'",[ids["phase1c-trainer-test-user"],ids["phase1h-student-c-test-user"]]); await c.query("commit"); console.log(JSON.stringify({studentsSeed:"PASS",canonicalAssignments:"A:A,B:A,C:B,D:none",legacyDirectLink:"A->C",productionGuard:"PASS"})); } catch(e){await c.query("rollback");throw e} finally{c.release();await pool.end()}
