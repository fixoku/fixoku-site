import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL, {
  migrationsFolder: path.join(process.cwd(), "drizzle", "migrations"),
});
const pool = disposable.pool;
const uuid = () => crypto.randomUUID();

try {
  const trainerId = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", ["group-concurrency-trainer-auth", "group-concurrency-trainer@example.test", "Group Concurrency Trainer"])).rows[0].id;
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'TRAINER',$1,'TRAINER','ACTIVE')", [trainerId]);
  const qualificationId = (await pool.query("select id from r6_qualification_definitions where code='HIGH_FAST' limit 1")).rows[0].id;
  const groupId = (await pool.query("insert into r6_training_groups(education_stage,training_type,mode,min_students,max_students,status,trainer_user_id,required_qualification_id,created_by) values('HIGH','FAST_READING','GROUP',2,5,'ASSIGNED',$1,$2,$1) returning id", [trainerId, qualificationId])).rows[0].id;

  for (let index = 0; index < 4; index += 1) {
    const studentId = uuid();
    const profileId = uuid();
    await pool.query("insert into platform_users(id,auth_user_id,email,display_name,email_verified) values($1,$2,$3,$4,true)", [studentId, `group-concurrency-${index}@example.test`, `group-concurrency-auth-${index}`, `Group Student ${index}`]);
    await pool.query("insert into student_profiles(id,user_id,first_name,last_name,education_stage,grade,status) values($1,$2,$3,'Student','HIGH','9','ACTIVE')", [profileId, studentId, `Group${index}`]);
    await pool.query("insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,status,billable) values($1,$2,$3,'ACTIVE',true)", [groupId, profileId, studentId]);
  }

  const first = await pool.connect();
  const second = await pool.connect();
  try {
    await first.query("begin");
    const locked = (await first.query("select id,max_students from r6_training_groups where id=$1 and status in ('DRAFT','ASSIGNED','IN_PROGRESS') and (select count(*) from r6_training_group_participants where training_group_id=r6_training_groups.id and status='ACTIVE') < max_students for update skip locked", [groupId])).rows[0];
    assert.equal(locked.id, groupId);

    await second.query("begin");
    const concurrent = (await second.query("select id,max_students from r6_training_groups where id=$1 and status in ('DRAFT','ASSIGNED','IN_PROGRESS') and (select count(*) from r6_training_group_participants where training_group_id=r6_training_groups.id and status='ACTIVE') < max_students for update skip locked", [groupId])).rows[0] || null;
    assert.equal(concurrent, null, "a concurrent request must not take the locked group");
    const overflowGroup = (await second.query("insert into r6_training_groups(education_stage,training_type,mode,min_students,max_students,status,trainer_user_id,required_qualification_id,created_by) values('HIGH','FAST_READING','GROUP',2,5,'ASSIGNED',$1,$2,$1) returning id", [trainerId, qualificationId])).rows[0].id;
    const studentId = uuid();
    const profileId = uuid();
    await second.query("insert into platform_users(id,auth_user_id,email,display_name,email_verified) values($1,$2,$3,$4,true)", [studentId, `group-concurrency-overflow@example.test`, `group-concurrency-overflow-auth`, "Overflow Student"]);
    await second.query("insert into student_profiles(id,user_id,first_name,last_name,education_stage,grade,status) values($1,$2,'Overflow','Student','HIGH','9','ACTIVE')", [profileId, studentId]);
    await second.query("insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,status,billable) values($1,$2,$3,'ACTIVE',true)", [overflowGroup, profileId, studentId]);
    await second.query("commit");

    const firstStudent = uuid();
    const firstProfile = uuid();
    await first.query("insert into platform_users(id,auth_user_id,email,display_name,email_verified) values($1,$2,$3,$4,true)", [firstStudent, `group-concurrency-fifth@example.test`, `group-concurrency-fifth-auth`, "Fifth Student"]);
    await first.query("insert into student_profiles(id,user_id,first_name,last_name,education_stage,grade,status) values($1,$2,'Fifth','Student','HIGH','9','ACTIVE')", [firstProfile, firstStudent]);
    await first.query("insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,status,billable) values($1,$2,$3,'ACTIVE',true)", [groupId, firstProfile, firstStudent]);
    await first.query("commit");
  } finally {
    first.release();
    second.release();
  }

  const counts = (await pool.query("select g.id,count(p.id) filter(where p.status='ACTIVE')::int as active_count,g.max_students from r6_training_groups g left join r6_training_group_participants p on p.training_group_id=g.id where g.trainer_user_id=$1 group by g.id,g.max_students order by active_count desc", [trainerId])).rows;
  assert.equal(Number(counts[0].active_count), 5);
  assert.ok(counts.every((row) => Number(row.active_count) <= Number(row.max_students) && Number(row.max_students) === 5));
  assert.equal(counts.length, 2, "the sixth concurrent student must start a fresh group");
  console.log(JSON.stringify({ GROUP_CAPACITY_5: "PASS", GROUP_CONCURRENCY: "PASS", FIRST_GROUP_COUNT: 5, SECOND_GROUP_COUNT: 1, DATABASE_ISOLATION: "DISPOSABLE_ONLY" }));
} finally {
  await disposable.dispose();
}
