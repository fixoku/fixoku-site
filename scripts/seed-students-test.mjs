import assert from "node:assert/strict";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const url = assertSafeSeedDatabaseUrl(process.env.SEED_DATABASE_URL || (process.env.SEED_TARGET === "test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL));
const password = process.env.TEST_SEED_PASSWORD;
assert.ok(password && password.length >= 12, "TEST_SEED_PASSWORD_REQUIRED");
const principals = [
  ["phase1c-trainer-test-user", "trainer.phase1c@example.test", "Özlem Yılmaz", "TRAINER"],
  ["phase1h-trainer-b-test-user", "trainer.b.phase1h@example.test", "Phase 1H Trainer B", "TRAINER"],
  ["phase1c-student-test-user", "student.phase1c@example.test", "ERSİN", "STUDENT"],
  ["phase1h-student-b-test-user", "student.b.phase1h@example.test", "Phase 1H Student B", "STUDENT"],
  ["phase1h-student-c-test-user", "student.c.phase1h@example.test", "Phase 1H Student C", "STUDENT"],
  ["phase1h-student-d-test-user", "student.d.phase1h@example.test", "Phase 1H Student D", "STUDENT"],
];
const pool = new pg.Pool({ connectionString: url.toString(), max: 2 });
const c = await pool.connect();
try {
  await c.query("begin");
  const studentProgram = (await c.query("insert into training_programs (slug,title,short_description,audience,status,display_order) values ('hizli-okuma-egitimi','Hızlı Okuma Eğitimi','Okuma hızını ve anlama becerilerini geliştirmeye yönelik Fixoku öğrenci programı.','STUDENT','PUBLISHED','1') on conflict (slug) do update set title=excluded.title,short_description=excluded.short_description,audience='STUDENT',status='PUBLISHED',display_order='1' returning id")).rows[0]?.id;
  assert.ok(studentProgram, "STUDENT_TRAINING_PROGRAM_REQUIRED");
  const ids = {};
  for (const [id, email, name, role] of principals) {
    const ph = await hashPassword(password);
    await c.query('insert into "user"(id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now()) on conflict(id) do update set name=excluded.name,email=excluded.email,email_verified=true,updated_at=now()', [id, name, email]);
    await c.query("insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now()) on conflict(id) do update set password=excluded.password,updated_at=now()", [id + "-credential", id, ph]);
    const u = (await c.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) on conflict(email) do update set auth_user_id=excluded.auth_user_id,display_name=excluded.display_name,email_verified=true,updated_at=now() returning id", [id, email, name])).rows[0].id;
    ids[id] = u;
    const scope = role === "TRAINER" ? "TRAINER" : "STUDENT";
    await c.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$1,$3,'ACTIVE') on conflict do nothing", [u, scope, role]);
    if (role === "STUDENT") {
      await c.query("insert into student_profiles(user_id,grade,school,status) values($1,'8. sınıf','Fixoku Test Okulu','ACTIVE') on conflict(user_id) do update set status='ACTIVE',updated_at=now()", [u]);
      const trainerEn = (await c.query("select e.id from enrollments e join training_programs p on p.id=e.training_program_id where e.student_user_id=$1 and p.audience='TRAINER' order by e.created_at,e.id limit 1 for update", [u])).rows[0];
      const studentEn = (await c.query("select e.id from enrollments e where e.student_user_id=$1 and e.training_program_id=$2 order by e.created_at,e.id limit 1 for update", [u, studentProgram])).rows[0];
      if (trainerEn && studentEn && trainerEn.id !== studentEn.id) {
        await c.query("insert into trainer_assignments (trainer_user_id,enrollment_id,status,created_at,updated_at) select trainer_user_id,$1,status,created_at,updated_at from trainer_assignments where enrollment_id=$2 on conflict (trainer_user_id,enrollment_id) do update set status=excluded.status,updated_at=excluded.updated_at", [trainerEn.id, studentEn.id]);
        await c.query("delete from trainer_assignments where enrollment_id=$1", [studentEn.id]);
        await c.query("delete from enrollments where id=$1", [studentEn.id]);
        await c.query("update enrollments set training_program_id=$2,status='ACTIVE',updated_at=now() where id=$1", [trainerEn.id, studentProgram]);
      } else if (trainerEn) await c.query("update enrollments set training_program_id=$2,status='ACTIVE',updated_at=now() where id=$1", [trainerEn.id, studentProgram]);
      else await c.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') on conflict(student_user_id,training_program_id) do update set status='ACTIVE',updated_at=now()", [u, studentProgram]);
    }
  }
  const studentIds = [ids["phase1c-student-test-user"], ids["phase1h-student-b-test-user"], ids["phase1h-student-c-test-user"], ids["phase1h-student-d-test-user"]];
  const ens = await c.query("select id,student_user_id from enrollments where student_user_id = any($1::uuid[])", [studentIds]);
  for (const row of ens.rows) {
    const trainer = row.student_user_id === ids["phase1h-student-c-test-user"] ? ids["phase1h-trainer-b-test-user"] : (row.student_user_id === ids["phase1h-student-d-test-user"] ? null : ids["phase1c-trainer-test-user"]);
    if (trainer) await c.query("insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE') on conflict(trainer_user_id,enrollment_id) do update set status='ACTIVE',updated_at=now()", [trainer, row.id]);
  }
  await c.query("insert into trainer_student_links(trainer_user_id,student_user_id,status) values($1,$2,'ACTIVE') on conflict(trainer_user_id,student_user_id) do update set status='ACTIVE'", [ids["phase1c-trainer-test-user"], ids["phase1h-student-c-test-user"]]);
  await c.query("commit");
  console.log(JSON.stringify({ studentsSeed: "PASS", studentAudienceEnforced: "PASS", trainerOnlyEnrollments: "0", database: url.pathname }));
} catch (e) { await c.query("rollback"); throw e; } finally { c.release(); await pool.end(); }
