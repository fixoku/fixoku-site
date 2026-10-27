import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { requirePackagePermission } from "../src/server/auth/authorization.js";

loadLocalEnv();
const disposable = await createDisposableDatabase(process.env.DATABASE_URL, { migrationsFolder: "drizzle/migrations" });
try {
  const pool = disposable.pool;
  const ledger = Number((await pool.query("select count(*)::int count from drizzle.__drizzle_migrations")).rows[0].count);
  const schema = Number((await pool.query("select count(*)::int count from information_schema.tables where table_schema='public' and table_name='owner_admin_package_permissions'")).rows[0].count);
  const owner = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('rbac-owner','owner@test','Owner',true) returning id")).rows[0];
  const admin = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('rbac-admin','admin@test','Admin',true) returning id")).rows[0];
  const student = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('rbac-student','student@test','Student',true) returning id")).rows[0];
  const trainer = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('rbac-trainer','trainer@test','Trainer',true) returning id")).rows[0];
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'GLOBAL',null,'OWNER','ACTIVE'),($2,'GLOBAL',null,'SUPER_ADMIN','ACTIVE'),($3,'STUDENT',$3,'STUDENT','ACTIVE'),($4,'TRAINER',$4,'TRAINER','ACTIVE')", [owner.id, admin.id, student.id, trainer.id]);
  const client = await pool.connect();
  try {
    const principal = (id, authId, role) => ({ user: { id }, session: { user: { id: authId } }, memberships: [{ userId: id, role, status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }] });
    const adminPrincipal = principal(admin.id, "rbac-admin", "SUPER_ADMIN");
    const ownerPrincipal = principal(owner.id, "rbac-owner", "OWNER");
    const studentDenied = await requirePackagePermission(client, principal(student.id, "rbac-student", "STUDENT"), "PACKAGE_PUBLISH");
    const trainerDenied = await requirePackagePermission(client, principal(trainer.id, "rbac-trainer", "TRAINER"), "PACKAGE_PUBLISH");
    if (!studentDenied || !trainerDenied) throw new Error("STUDENT_TRAINER_MUST_BE_DENIED");
    const without = await requirePackagePermission(client, adminPrincipal, "PACKAGE_PUBLISH");
    if (!without || without.body.error !== "PACKAGE_PERMISSION_REQUIRED") throw new Error("ADMIN_WITHOUT_GRANT_FAILED");
    await pool.query("insert into owner_admin_package_permissions(admin_user_id,permission,granted_by) values($1,'PACKAGE_PUBLISH',$2)", [admin.id, owner.id]);
    if (await requirePackagePermission(client, adminPrincipal, "PACKAGE_PUBLISH")) throw new Error("ADMIN_WITH_GRANT_FAILED");
    await pool.query("update owner_admin_package_permissions set revoked_at=now(),revoked_by=$1 where admin_user_id=$2 and permission='PACKAGE_PUBLISH' and revoked_at is null", [owner.id, admin.id]);
    const afterRevoke = await requirePackagePermission(client, adminPrincipal, "PACKAGE_PUBLISH");
    if (!afterRevoke || afterRevoke.body.error !== "PACKAGE_PERMISSION_REQUIRED") throw new Error("ADMIN_AFTER_REVOKE_FAILED");
    if (await requirePackagePermission(client, ownerPrincipal, "PACKAGE_PUBLISH")) throw new Error("OWNER_FAILED");
    console.log(JSON.stringify({ MIGRATION_COUNT: ledger, SCHEMA: schema === 1 ? "PASS" : "FAIL", STUDENT: "REJECTED", TRAINER: "REJECTED", ADMIN_WITHOUT_GRANT: "REJECTED", ADMIN_WITH_GRANT: "ALLOWED", ADMIN_AFTER_REVOKE: "REJECTED", OWNER: "ALLOWED", DATABASE_MUTATION: "DISPOSABLE_ONLY" }));
  } finally { client.release(); }
} finally { await disposable.dispose(); }
