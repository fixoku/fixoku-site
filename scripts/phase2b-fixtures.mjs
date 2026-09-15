import assert from "node:assert/strict";
import pg from "pg";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";

// Creates only a deterministic, disposable Phase 2B acceptance fixture in the
// loopback dev/test database. It intentionally leaves one PENDING request so
// the browser can review the admin assignment screen after the checks finish.
loadLocalEnv();
const database = assertSafeSeedDatabaseUrl(process.env.SEED_DATABASE_URL || (process.env.SEED_TARGET === "test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL));
const pool = new pg.Pool({ connectionString: database.toString() });
const marker = "phase2b-acceptance";
const studentProgramSlug = `${marker}-student-program`;
const wrongProgramSlug = `${marker}-wrong-program`;
const trainerSeeds = [
  { auth: "phase2b-trainer-a", email: "phase2b.trainer.a@example.test", name: "Phase 2B Trainer A", city: "İstanbul", qualification: "ACTIVE", availability: true },
  { auth: "phase2b-trainer-b", email: "phase2b.trainer.b@example.test", name: "Phase 2B Trainer B", city: "Ankara", qualification: "SUSPENDED", availability: false },
  { auth: "phase2b-trainer-c", email: "phase2b.trainer.c@example.test", name: "Phase 2B Trainer C", city: "İzmir", qualification: "REVOKED", availability: true },
  { auth: "phase2b-trainer-d", email: "phase2b.trainer.d@example.test", name: "Phase 2B Trainer D", city: "Bursa", qualification: null, availability: false },
  { auth: "phase2b-trainer-e", email: "phase2b.trainer.e@example.test", name: "Phase 2B Trainer E", city: "İstanbul", qualification: "WRONG_PROGRAM", availability: true },
];

const client = await pool.connect();
try {
  await client.query("begin");
  const student = (await client.query("select id from platform_users where auth_user_id='phase1c-student-test-user' limit 1")).rows[0];
  assert.ok(student, "PHASE2B_STUDENT_PRINCIPAL_REQUIRED");
  const program = (await client.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,$2,$3,'STUDENT','PUBLISHED','900') on conflict(slug) do update set title=excluded.title,audience='TRAINER',status='PUBLISHED',updated_at=now() returning id", [studentProgramSlug, "Phase 2B Kabul Programı", "Local acceptance fixture"])).rows[0];
  const wrong = (await client.query("insert into training_programs(slug,title,short_description,audience,status,display_order) values($1,$2,$3,'STUDENT','PUBLISHED','901') on conflict(slug) do update set title=excluded.title,audience='STUDENT',status='PUBLISHED',updated_at=now() returning id", [wrongProgramSlug, "Phase 2B Wrong Program", "Local acceptance fixture"])).rows[0];
  assert.ok(program?.id && wrong?.id, "PHASE2B_PROGRAMS_REQUIRED");
  const oldEnrollment = (await client.query("select id from enrollments where student_user_id=$1 and training_program_id=$2", [student.id, program.id])).rows[0];
  if (oldEnrollment) {
    await client.query("delete from trainer_assignment_requests where enrollment_id=$1", [oldEnrollment.id]);
    await client.query("delete from trainer_assignment_history where enrollment_id=$1", [oldEnrollment.id]);
    await client.query("delete from trainer_compensation_snapshots where enrollment_id=$1", [oldEnrollment.id]);
    await client.query("delete from trainer_assignments where enrollment_id=$1", [oldEnrollment.id]);
    await client.query("delete from enrollments where id=$1", [oldEnrollment.id]);
  }
  const enrollment = (await client.query("insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'ACTIVE') returning id", [student.id, program.id])).rows[0];
  assert.ok(enrollment?.id, "PHASE2B_ENROLLMENT_REQUIRED");
  const trainers = {};
  for (const seed of trainerSeeds) {
    const user = (await client.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) on conflict(auth_user_id) do update set email=excluded.email,display_name=excluded.display_name,email_verified=true,updated_at=now() returning id", [seed.auth, seed.email, seed.name])).rows[0];
    trainers[seed.auth] = user.id;
    await client.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'TRAINER',$1,'TRAINER','ACTIVE') on conflict(user_id,scope_type,scope_id,role) do update set status='ACTIVE',updated_at=now()", [user.id]);
    await client.query("insert into trainer_profiles(user_id,city,profession) values($1,$2,'Phase 2B acceptance') on conflict(user_id) do update set city=excluded.city,updated_at=now()", [user.id, seed.city]);
    await client.query("delete from trainer_qualification_history where trainer_user_id=$1", [user.id]);
    await client.query("delete from trainer_qualifications where trainer_user_id=$1", [user.id]);
    if (seed.qualification === "ACTIVE" || seed.qualification === "SUSPENDED" || seed.qualification === "REVOKED") {
      await client.query("insert into trainer_qualifications(trainer_user_id,training_program_id,status) values($1,$2,$3)", [user.id, program.id, seed.qualification]);
    } else if (seed.qualification === "WRONG_PROGRAM") {
      await client.query("insert into trainer_qualifications(trainer_user_id,training_program_id,status) values($1,$2,'ACTIVE')", [user.id, wrong.id]);
    }
    await client.query("delete from availability_slots where trainer_user_id=$1", [user.id]);
    if (seed.availability) await client.query("insert into availability_slots(trainer_user_id,starts_at,ends_at,status,timezone) values($1,now()+interval '7 days',now()+interval '7 days 1 hour','OPEN','Europe/Istanbul')", [user.id]);
  }
  const request = (await client.query("insert into trainer_assignment_requests(enrollment_id,status) values($1,'PENDING') returning id", [enrollment.id])).rows[0];
  await client.query("commit");
  console.log(JSON.stringify({ fixture: "PASS", productionGuard: "PASS", marker, enrollmentId: enrollment.id, requestId: request.id, trainerIds: trainers, pendingBrowserRequest: request.id }));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
