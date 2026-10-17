import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { loadLocalEnv } from "./local-env.mjs";
import { fulfillTrainerOrder } from "../src/server/domain/trainer-commerce.js";
import { fulfillSuccessfulPayment } from "../src/server/domain/commerce.js";

loadLocalEnv();

export const SOURCE_MARKER = "DEV036D_20261012";
const PRESENTATION_DATABASE = "fixoku_presentation_20261012";
const PROTECTED = new Set([
  "fixoku_phase2b_migration_shadow_trainer_commerce_20260917",
  "fixoku_e2e_20261011_234519",
  "fixoku_test_commerce_muejhtf3_2826a967",
]);
const SYNTHETIC_DOMAIN = "example.invalid";
const TRAINER_NAMES = ["Berkay Yıldırım", "Ceren Aksoy", "Doğan Kılıç", "Ece Karaca", "Fırat Demir", "Gizem Arslan"];
const STUDENT_NAMES = ["Ada Yılmaz", "Arda Kaya", "Aslı Şahin", "Bartu Çelik", "Begüm Aydın", "Berke Koç", "Buse Özdemir", "Can Eren", "Cansu Polat", "Deniz Güneş", "Derin Kurt", "Ege Erdem", "Elif Naz Çetin", "Emirhan Uslu", "Esra Tekin", "Furkan Doğan", "Hazal Sezer", "İpek Acar", "Kerem Bulut", "Lara Keskin", "Mertcan Sönmez", "Nazlı Duman", "Oğuzhan Işık", "Pelin Taş"];
const GUARDIAN_NAMES = ["Meral Yılmaz", "Selçuk Kaya", "Nermin Şahin"];
const HISTORICAL_NAMES = ["Hakan Geçmiş", "İrem Geçmiş", "Kaan Geçmiş", "Leyla Geçmiş", "Mete Geçmiş"];
const STAGES = ["PRIMARY", "MIDDLE", "HIGH", "ADULT"];
const TRAINER_CATALOG = [
  "ilkokul-akici-hizli-okuma-egitimi",
  "ortaokul-hizli-okuma-egitimi",
  "ortaokul-lise-yetiskin-hizli-okuma-egitimi",
  "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs",
  "yetiskin-hizli-okuma-egitimi",
];
const STUDENT_CATALOG = [
  { slug: "student-primary-platinum-egitim", stage: "PRIMARY" },
  { slug: "student-middle-premium-egitim", stage: "MIDDLE" },
  { slug: "student-high-paragraf-kitabi", stage: "HIGH" },
  { slug: "student-adult-dijital-yapay-zeka-sistemi", stage: "ADULT" },
];

function dbName(raw) { return decodeURIComponent(new URL(raw).pathname.slice(1)); }
function fail(code, extra = "") { throw new Error(`${code}${extra ? `:${extra}` : ""}`); }
function marker(kind, index) { return `${SOURCE_MARKER}:${kind}:${index}`; }
function email(kind, index) { return `${SOURCE_MARKER.toLowerCase()}-${kind.toLowerCase()}-${index}@${SYNTHETIC_DOMAIN}`; }
function splitName(full) { const bits = full.split(" "); return { first: bits.slice(0, -1).join(" "), last: bits.at(-1) }; }

function assertTarget(raw) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.VERCEL_ENV) fail("DEV036F_REMOTE_RUNTIME_FORBIDDEN");
  if (!raw) fail("DEV036F_DATABASE_URL_REQUIRED");
  const u = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(u.protocol)) fail("DEV036F_DATABASE_PROTOCOL_FORBIDDEN");
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(u.hostname.toLowerCase())) fail("DEV036F_DATABASE_HOST_FORBIDDEN");
  const name = dbName(raw);
  if (PROTECTED.has(name)) fail("DEV036F_PROTECTED_DATABASE");
  if (name !== PRESENTATION_DATABASE && !/^fixoku_test_dev036f_[a-z0-9_]+$/u.test(name)) fail("DEV036F_TARGET_MISMATCH", name);
  return name;
}

async function createIdentity(client, { kind, index, fullName, role, scopeType, educationStage = null, grade = null }) {
  const authId = marker(kind, index);
  const existing = (await client.query("select id from platform_users where auth_user_id=$1", [authId])).rows[0];
  if (existing) return existing.id;
  const { first, last } = splitName(fullName);
  const userEmail = email(kind, index);
  const passwordHash = await hashPassword(process.env.DEV036F_SEED_PASSWORD || crypto.randomBytes(24).toString("base64url"));
  await client.query("insert into \"user\"(id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())", [authId, fullName, userEmail]);
  await client.query("insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now())", [`${authId}:credential`, authId, passwordHash]);
  const platform = (await client.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [authId, userEmail, fullName])).rows[0];
  const scopeId = ["OWNER", "SUPER_ADMIN"].includes(role) ? null : platform.id;
  await client.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [platform.id, scopeType, scopeId, role]);
  if (role === "TRAINER") await client.query("insert into trainer_profiles(user_id,first_name,last_name) values($1,$2,$3) on conflict(user_id) do nothing", [platform.id, first, last]);
  if (role === "STUDENT") await client.query("insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status,marketing_consent) values($1,$2,$3,$4,$5,'ACTIVE',false)", [platform.id, first, last, educationStage, grade]);
  if (role === "GUARDIAN") await client.query("insert into guardian_profiles(user_id,status) values($1,'ACTIVE') on conflict(user_id) do nothing", [platform.id]);
  return platform.id;
}

async function loadPackage(client, slug, audience) {
  const row = (await client.query(`
    select p.id as package_id,p.slug,pv.id as package_version_id,pv.version_number,pv.title,pv.description,
      coalesce(pv.price_gross_minor,pv.price_minor) as price_minor,pv.currency,
      p.education_stage,p.catalog_scope,p.physical_product,p.shipping_policy,p.shipping_price_minor
    from packages p join package_versions pv on pv.package_id=p.id
    where p.slug=$1 and p.audience=$2 and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true
    order by pv.version_number desc limit 1`, [slug, audience])).rows[0];
  if (!row) fail("DEV036F_REAL_CATALOG_PACKAGE_REQUIRED", slug);
  const components = (await client.query(`
    select pc.id as "packageComponentId",coalesce(pc.physical_product_id,pc.reference_id) as "productId",
      pc.component_type as "componentType",pc.quantity,pc.title_snapshot as title,pp.product_type as "productType",
      pp.sku,pp.vat_rate_bps as "vatRateBps",pp.list_gross_minor as "listGrossMinor"
    from package_components pc left join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id)
    where pc.package_version_id=$1 and pc.is_active=true order by pc.display_order,pc.id`, [row.package_version_id])).rows;
  return { ...row, price_minor: Number(row.price_minor), components };
}

function packageSnapshot(pkg) {
  return pkg.components.filter((component) => component.productId).map((component) => ({
    productId: component.productId,
    packageComponentId: component.packageComponentId,
    productType: component.productType || "UNKNOWN",
    quantity: Number(component.quantity || 1),
    title: component.title || component.sku || pkg.title,
    sku: component.sku || null,
    listGrossMinor: Number(component.listGrossMinor || 0),
    saleGrossMinor: Number(component.listGrossMinor || 0),
    vatRateBps: Number(component.vatRateBps || 0),
  }));
}

async function seedTrainerOrder(client, trainerId, pkg, index) {
  const key = marker("TRAINER_ORDER", index);
  const existing = (await client.query("select id from trainer_package_orders where trainer_user_id=$1 and idempotency_key=$2", [trainerId, key])).rows[0];
  if (existing) return existing.id;
  const shipping = { title: "DEV036F sentetik adres", firstName: "Synthetic", lastName: "Trainer", phone: "+900000000000", city: "Test", district: "Test", addressLine: "DEV036F", neighborhood: null, postalCode: "00000" };
  const billing = { type: "INDIVIDUAL", sameAsShipping: true, address: shipping, identity: { firstName: "Synthetic", lastName: "Trainer", identityNumber: null } };
  const order = (await client.query(`insert into trainer_package_orders
    (trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,
     shipping_address_snapshot_json,billing_snapshot_json,invoice_status,idempotency_key,request_hash)
    values($1,'PENDING_PAYMENT','PAYTR','TRY',$2,0,0,0,$2,$3,$4,'PENDING',$5,$6) returning id`,
  [trainerId, pkg.price_minor, JSON.stringify(shipping), JSON.stringify(billing), key, `DEV036F:${key}`])).rows[0];
  await client.query(`insert into trainer_package_order_items
    (order_id,package_id,package_version_id,title_snapshot,description_snapshot,features_snapshot_json,sku_snapshot,
     invoice_product_name_snapshot,unit_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,
     discount_minor,line_total_minor,currency,quantity)
    values($1,$2,$3,$4,$5,'[]',$6,$4,'adet',0,$7,$7,0,0,$7,'TRY',1)`,
  [order.id, pkg.package_id, pkg.package_version_id, pkg.title, pkg.description, pkg.slug, pkg.price_minor]);
  return order.id;
}

async function seedStudentOrder(client, { buyerId, student, pkg, index, state }) {
  const key = marker("STUDENT_ORDER", index);
  const existing = (await client.query("select id from orders where buyer_user_id=$1 and idempotency_key=$2", [buyerId, key])).rows[0];
  if (existing) return { orderId: existing.id, state };
  const components = packageSnapshot(pkg);
  // Student Commerce grants ownership; Owner assigns training separately.
  const definitions = [];
  const deliveryMode = "SELF_PACED";
  const shipping = { firstName: "Synthetic", lastName: "Student", phone: "+900000000001", title: "DEV036F", city: "Test", district: "Test", addressLine: "DEV036F", neighborhood: null, postalCode: "00000" };
  const billing = { type: "INDIVIDUAL", sameAsShipping: true, address: shipping, identity: { firstName: "Synthetic", lastName: "Student", identityNumber: null } };
  const initialStatus = state === "FAILED" ? "CANCELLED" : "PENDING_PAYMENT";
  const order = (await client.query(`insert into orders
    (buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,status,payment_method,currency,subtotal_minor,
     shipping_minor,total_minor,catalog_scope_snapshot,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash)
    values($1,$2,$3,$4,'PAYTR','TRY',$5,0,$5,'STUDENT_COMMERCE',$6,$7,$8,$9) returning id`,
  [buyerId, student.id, student.profileId, initialStatus, pkg.price_minor, JSON.stringify(shipping), JSON.stringify(billing), key, `DEV036F:${key}`])).rows[0];
  const item = (await client.query(`insert into order_items
    (order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,
     unit_price_minor,total_minor,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json,
     beneficiary_child_profile_id,list_gross_minor,sale_gross_minor,discount_minor,discount_percent_bps,vat_net_minor,vat_minor,vat_rate_bps)
    values($1,$2,$3,$4,$5,$6,$7,$8,$8,'TRY',1,$9,$10,null,$8,$8,0,0,$8,0,0) returning id`,
  [order.id, pkg.package_id, pkg.package_version_id, pkg.title, pkg.description, pkg.version_number, deliveryMode, pkg.price_minor, JSON.stringify(definitions), JSON.stringify(components)])).rows[0];
  const intentStatus = state === "FAILED" ? "FAILED" : state === "PENDING" ? "PENDING" : "CREATED";
  await client.query("insert into payment_intents(order_id,status,provider,amount_minor,currency,idempotency_key) values($1,$2,'DEV_ONLY_LOCAL',$3,'TRY',$4)", [order.id, intentStatus, pkg.price_minor, marker("PAYMENT", index)]);
  return { orderId: order.id, itemId: item.id, state };
}

async function seedHistorical(client, { trainers, program }) {
  const history = [];
  for (let i = 0; i < HISTORICAL_NAMES.length; i += 1) {
    const id = await createIdentity(client, { kind: "HISTORY", index: i + 1, fullName: HISTORICAL_NAMES[i], role: "STUDENT", scopeType: "STUDENT", educationStage: "HIGH", grade: "9" });
    const profile = (await client.query("select id from student_profiles where user_id=$1", [id])).rows[0];
    history.push({ id, profileId: profile.id });
  }
  const trainerId = trainers[2];
  const rows = [];
  for (const student of history) {
    const enrollment = (await client.query(`insert into enrollments(student_user_id,training_program_id,status) values($1,$2,'COMPLETED')
      on conflict(student_user_id,training_program_id) do nothing returning id`, [student.id, program.id])).rows[0]
      || (await client.query("select id from enrollments where student_user_id=$1 and training_program_id=$2", [student.id, program.id])).rows[0];
    const assignment = (await client.query(`insert into trainer_assignments(trainer_user_id,enrollment_id,status) values($1,$2,'ACTIVE')
      on conflict(trainer_user_id,enrollment_id) do nothing returning id`, [trainerId, enrollment.id])).rows[0]
      || (await client.query("select id from trainer_assignments where trainer_user_id=$1 and enrollment_id=$2", [trainerId, enrollment.id])).rows[0];
    await client.query(`insert into enrollment_completions(enrollment_id,assignment_id,completed_by,idempotency_key,metadata_json)
      values($1,$2,$3,$4,$5) on conflict(idempotency_key) do nothing`, [enrollment.id, assignment.id, trainerId, marker("COMPLETION", student.id), JSON.stringify({ sourceMarker: SOURCE_MARKER })]);
    rows.push({ ...student, enrollmentId: enrollment.id, assignmentId: assignment.id });
  }
  const group = (await client.query(`select g.id from r6_training_groups g join r6_training_group_participants p on p.training_group_id=g.id
    where g.trainer_user_id=$1 and g.status='COMPLETED' and p.student_user_id=any($2::uuid[]) group by g.id having count(*)=5 limit 1`, [trainerId, history.map((row) => row.id)])).rows[0]
    || (await client.query(`insert into r6_training_groups(education_stage,training_type,mode,min_students,max_students,status,projected_payout_minor,trainer_user_id,created_by,completed_at)
      values('HIGH','FAST_READING','GROUP',2,5,'COMPLETED',875000,$1,$1,now()) returning id`, [trainerId])).rows[0];
  const groupId = group.id;
  for (const row of rows) await client.query(`insert into r6_training_group_participants(training_group_id,student_profile_id,student_user_id,enrollment_id,status,billable)
    values($1,$2,$3,$4,'COMPLETED',true) on conflict(training_group_id,student_user_id) do nothing`, [groupId, row.profileId, row.id, row.enrollmentId]);
  const matrix = (await client.query("select amount_minor from r6_training_payout_matrix where training_type='FAST_READING' and student_count=$1", [5])).rows[0];
  if (!matrix) fail("DEV036F_PAYOUT_MATRIX_REQUIRED");
  const individualAmount = Number((await client.query("select amount_minor from r6_training_payout_matrix where training_type='FAST_READING' and student_count=1")).rows[0].amount_minor);
  const earningRows = [];
  for (const [kind, status, amount] of [["EARNED", "EARNED", individualAmount], ["HELD", "HELD", Number(matrix.amount_minor)]]) {
    const key = marker("EARNING", kind);
    const earning = (await client.query(`insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at,payable_at,payable_period_start,payable_period_end,billable_student_count)
      values($1,'SESSION',$2::trainer_earning_status,$3,'TRY',$4,'DEV036F_HISTORICAL',$5,$6,now(),case when $2::trainer_earning_status='HELD' then null else now() end,current_date,current_date,$7)
      on conflict(idempotency_key) do nothing returning id`, [trainerId, status, amount, `DEV036F ${kind} historical training`, marker("HISTORICAL", kind), key, status === "HELD" ? 5 : 1])).rows[0]
      || (await client.query("select id from trainer_earning_ledger where idempotency_key=$1", [key])).rows[0];
    earningRows.push({ id: earning.id, status });
  }
  const paid = (await client.query(`insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,paid_at,occurred_at,payable_at,payable_period_start,payable_period_end,billable_student_count)
    values($1,'SESSION','PAID',$2,'TRY','DEV036F paid historical group','R6_TRAINING_GROUP_COMPLETION',$3,$4,now(),now(),now(),current_date,current_date,5)
    on conflict(idempotency_key) do nothing returning id`, [trainerId, Number(matrix.amount_minor), groupId, marker("EARNING", "PAID")])).rows[0]
    || (await client.query("select id from trainer_earning_ledger where idempotency_key=$1", [marker("EARNING", "PAID")])).rows[0];
  const payout = (await client.query(`select id from trainer_payout_register where bank_reference=$1`, [marker("PAYOUT", 1)])).rows[0]
    || (await client.query(`insert into trainer_payout_register(trainer_user_id,amount_minor,currency,period_start,period_end,payment_date,bank_reference,created_by,approved_by,note)
      values($1,$2,'TRY',current_date,current_date,current_date,$3,$1,$1,$4) returning id`, [trainerId, Number(matrix.amount_minor), marker("PAYOUT", 1), SOURCE_MARKER])).rows[0];
  await client.query("insert into r6_trainer_payout_allocations(payout_id,earning_id,amount_minor) values($1,$2,$3) on conflict(payout_id,earning_id) do nothing", [payout.id, paid.id, Number(matrix.amount_minor)]);
  return { history, groupId, earnings: earningRows.length + 1, payoutId: payout.id };
}

async function apply(pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const program = (await client.query(`insert into training_programs(slug,title,short_description,audience,status,display_order)
      values('dev036f-individual-program','DEV036F Birebir Program','Synthetic presentation program','STUDENT','PUBLISHED','999')
      on conflict(slug) do update set status='PUBLISHED' returning id`)).rows[0];
    const trainers = [];
    for (let i = 0; i < TRAINER_NAMES.length; i += 1) trainers.push(await createIdentity(client, { kind: "TRAINER", index: i + 1, fullName: TRAINER_NAMES[i], role: "TRAINER", scopeType: "TRAINER" }));
    const students = [];
    for (let i = 0; i < STUDENT_NAMES.length; i += 1) {
      const stage = STAGES[i % STAGES.length];
      const grade = stage === "PRIMARY" ? String(3 + (i % 2)) : stage === "MIDDLE" ? String(5 + (i % 4)) : stage === "HIGH" ? String(9 + (i % 4)) : null;
      const id = await createIdentity(client, { kind: "STUDENT", index: i + 1, fullName: STUDENT_NAMES[i], role: "STUDENT", scopeType: "STUDENT", educationStage: stage, grade });
      const profile = (await client.query("select id from student_profiles where user_id=$1", [id])).rows[0];
      students.push({ id, profileId: profile.id, stage, grade });
    }
    const guardians = [];
    for (let i = 0; i < GUARDIAN_NAMES.length; i += 1) guardians.push(await createIdentity(client, { kind: "GUARDIAN", index: i + 1, fullName: GUARDIAN_NAMES[i], role: "GUARDIAN", scopeType: "STUDENT" }));
    const trainerPackages = [];
    for (const slug of TRAINER_CATALOG) trainerPackages.push(await loadPackage(client, slug, "TRAINER"));
    const trainerPlan = [[0, 0, 1], [1, 1, 2], [2, 2, 3], [3, 3, 4], [3, 4, 5], [4, null, null]];
    for (const [trainerIndex, packageIndex, orderIndex] of trainerPlan) if (packageIndex !== null) await seedTrainerOrder(client, trainers[trainerIndex], trainerPackages[packageIndex], orderIndex);
    const studentPackages = [];
    for (const entry of STUDENT_CATALOG) studentPackages.push(await loadPackage(client, entry.slug, "STUDENT"));
    const packageByStage = new Map(STUDENT_CATALOG.map((entry, index) => [entry.stage, studentPackages[index]]));
    for (let i = 0; i < students.length; i += 1) {
      const buyerId = i < 2 ? guardians[0] : students[i].id;
      const state = i === 6 ? "PENDING" : i === 10 ? "FAILED" : "PAID";
      await seedStudentOrder(client, { buyerId, student: students[i], pkg: packageByStage.get(students[i].stage), index: i + 1, state });
    }
    for (let i = 0; i < guardians.length; i += 1) for (const child of students.slice(i * 2, i * 2 + 2)) await client.query("insert into guardian_student_relationships(guardian_user_id,student_profile_id) values($1,$2) on conflict do nothing", [guardians[i], child.profileId]);
    const historical = await seedHistorical(client, { trainers, program });
    await client.query("commit");
    return { trainers, students, guardians, historical };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
  finally { client.release(); }
}

async function settle(pool) {
  const client = await pool.connect();
  try {
    const orders = (await client.query("select id,trainer_user_id from trainer_package_orders where idempotency_key like $1 order by idempotency_key", [`${SOURCE_MARKER}:TRAINER_ORDER:%`])).rows;
    for (const order of orders) await fulfillTrainerOrder(client, { orderId: order.id, actorUserId: order.trainer_user_id, provider: "DEV_ONLY_LOCAL", providerReference: marker("TRAINER_SETTLEMENT", order.id), manageTransaction: true });
  } finally { client.release(); }
  const paid = (await pool.query("select id,total_minor,currency from orders where idempotency_key like $1 and status='PENDING_PAYMENT' and exists(select 1 from payment_intents pi where pi.order_id=orders.id and pi.status='CREATED') order by idempotency_key", [`${SOURCE_MARKER}:STUDENT_ORDER:%`])).rows;
  for (const order of paid) await fulfillSuccessfulPayment(pool, { orderId: order.id, actorUserId: null, provider: "DEV_ONLY_LOCAL", providerEventId: marker("STUDENT_SETTLEMENT", order.id), amountMinor: order.total_minor, currency: order.currency });
}

async function verify(client) {
  const q = async (sql, params = []) => Number((await client.query(sql, params)).rows[0].count);
  const counts = {
    trainers: await q("select count(*) from platform_users where auth_user_id like $1", [`${SOURCE_MARKER}:TRAINER:%`]),
    students: await q("select count(*) from platform_users where auth_user_id like $1", [`${SOURCE_MARKER}:STUDENT:%`]),
    guardians: await q("select count(*) from platform_users where auth_user_id like $1", [`${SOURCE_MARKER}:GUARDIAN:%`]),
    historicalStudents: await q("select count(*) from platform_users where auth_user_id like $1", [`${SOURCE_MARKER}:HISTORY:%`]),
    trainerOrders: await q("select count(*) from trainer_package_orders where idempotency_key like $1", [`${SOURCE_MARKER}:TRAINER_ORDER:%`]),
    trainerEntitlements: await q("select count(*) from trainer_package_entitlements e join platform_users u on u.id=e.trainer_user_id where u.auth_user_id like $1 and e.status='ACTIVE'", [`${SOURCE_MARKER}:TRAINER:%`]),
    studentOrders: await q("select count(*) from orders where idempotency_key like $1", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    studentPaid: await q("select count(*) from orders where idempotency_key like $1 and status='PAID'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    studentPending: await q("select count(*) from orders where idempotency_key like $1 and status='PENDING_PAYMENT'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    studentFailed: await q("select count(*) from orders where idempotency_key like $1 and status='CANCELLED'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    individualReadyStudents: await q("select count(distinct o.beneficiary_student_user_id) from orders o join order_items oi on oi.order_id=o.id join packages p on p.id=oi.package_id where o.idempotency_key like $1 and p.slug='student-primary-platinum-egitim'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    groupReadyStudents: await q("select count(distinct o.beneficiary_student_user_id) from orders o join order_items oi on oi.order_id=o.id join packages p on p.id=oi.package_id where o.idempotency_key like $1 and p.slug='student-middle-premium-egitim'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    bookPurchases: await q("select count(distinct o.beneficiary_student_user_id) from orders o join order_items oi on oi.order_id=o.id join packages p on p.id=oi.package_id where o.idempotency_key like $1 and p.slug='student-high-paragraf-kitabi'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    digitalPurchases: await q("select count(distinct o.beneficiary_student_user_id) from orders o join order_items oi on oi.order_id=o.id join packages p on p.id=oi.package_id where o.idempotency_key like $1 and p.slug='student-adult-dijital-yapay-zeka-sistemi'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    guardianTwoChildOrders: await q("select count(*) from orders o join platform_users g on g.id=o.buyer_user_id where g.auth_user_id=$1", [marker("GUARDIAN", 1)]),
    grants: await q("select count(*) from r6_trainer_qualification_grants g join platform_users u on u.id=g.trainer_user_id where u.auth_user_id like $1 and g.status='ACTIVE'", [`${SOURCE_MARKER}:TRAINER:%`]),
    assignments: await q("select count(*) from trainer_assignments a join enrollments e on e.id=a.enrollment_id join platform_users u on u.id=e.student_user_id where u.auth_user_id like $1", [`${SOURCE_MARKER}:STUDENT:%`]),
    pendingAssignmentRequests: await q("select count(*) from trainer_assignment_requests r join enrollments e on e.id=r.enrollment_id join platform_users u on u.id=e.student_user_id where u.auth_user_id like $1 and r.status='PENDING'", [`${SOURCE_MARKER}:STUDENT:%`]),
    groupAssignments: await q("select count(*) from r6_training_group_participants p join platform_users u on u.id=p.student_user_id where u.auth_user_id like $1 and p.training_group_id in (select id from r6_training_groups where created_by in (select id from platform_users where auth_user_id like $2))", [`${SOURCE_MARKER}:STUDENT:%`, `${SOURCE_MARKER}:TRAINER:%`]),
    historicalCompletions: await q("select count(*) from enrollment_completions c join platform_users u on u.id=(select student_user_id from enrollments where id=c.enrollment_id) where u.auth_user_id like $1", [`${SOURCE_MARKER}:HISTORY:%`]),
    groups: await q("select count(*) from r6_training_groups where created_by in (select id from platform_users where auth_user_id like $1) and status='COMPLETED'", [`${SOURCE_MARKER}:TRAINER:%`]),
    earnings: await q("select count(*) from trainer_earning_ledger where idempotency_key like $1", [`${SOURCE_MARKER}:EARNING:%`]),
    payouts: await q("select count(*) from trainer_payout_register where bank_reference like $1", [`${SOURCE_MARKER}:PAYOUT:%`]),
    payoutAllocations: await q("select count(*) from r6_trainer_payout_allocations a join trainer_payout_register p on p.id=a.payout_id where p.bank_reference like $1", [`${SOURCE_MARKER}:PAYOUT:%`]),
    paidEntitlements: await q("select count(*) from package_entitlements pe join orders o on o.id=pe.source_order_id where o.idempotency_key like $1 and pe.status='ACTIVE'", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
    stageMismatches: await q("select count(*) from orders o join order_items oi on oi.order_id=o.id join packages p on p.id=oi.package_id join student_profiles sp on sp.id=o.beneficiary_student_profile_id where o.idempotency_key like $1 and sp.education_stage is distinct from p.education_stage", [`${SOURCE_MARKER}:STUDENT_ORDER:%`]),
  };
  const requiredCounts = { trainerOrders: 5, trainerEntitlements: 5, studentOrders: 24, studentPaid: 22, studentPending: 1, studentFailed: 1, grants: 7, historicalCompletions: 5, groups: 1, earnings: 3, payouts: 1, payoutAllocations: 1, paidEntitlements: 22, stageMismatches: 0 };
  for (const [key, expected] of Object.entries(requiredCounts)) if (counts[key] !== expected) fail("DEV036F_VERIFY_RELATIONSHIPS", JSON.stringify(counts));
  if (counts.trainers !== 6 || counts.students !== 24 || counts.guardians !== 3 || counts.historicalStudents !== 5 || counts.assignments !== 0 || counts.pendingAssignmentRequests !== 0 || counts.groupAssignments !== 0 || counts.individualReadyStudents !== 6 || counts.groupReadyStudents !== 6 || counts.bookPurchases !== 6 || counts.digitalPurchases !== 6 || counts.guardianTwoChildOrders !== 2) fail("DEV036F_VERIFY_COUNTS", JSON.stringify(counts));
  return counts;
}

async function writeManifest(filePath, name, counts, pool) {
  if (!filePath) return null;
  const manifest = { taskId: "FIXOKU_DEV_036F", sourceMarker: SOURCE_MARKER, database: name, generatedAt: new Date().toISOString(), ownership: { authUserMarkers: [`${SOURCE_MARKER}:TRAINER:*`, `${SOURCE_MARKER}:STUDENT:*`, `${SOURCE_MARKER}:GUARDIAN:*`, `${SOURCE_MARKER}:HISTORY:*`], orderIdempotencyMarkers: [`${SOURCE_MARKER}:TRAINER_ORDER:*`, `${SOURCE_MARKER}:STUDENT_ORDER:*`], earningIdempotencyMarkers: [`${SOURCE_MARKER}:EARNING:*`], payoutBankReferenceMarkers: [`${SOURCE_MARKER}:PAYOUT:*`] }, counts };
  manifest.recordIds = {};
  const queries = {
    platform_users: "select id,auth_user_id from platform_users where auth_user_id like $1 order by id",
    orders: "select id from orders where idempotency_key like $1 order by id",
    trainer_package_orders: "select id from trainer_package_orders where idempotency_key like $1 order by id",
    trainer_earning_ledger: "select id from trainer_earning_ledger where idempotency_key like $1 order by id",
    trainer_payout_register: "select id from trainer_payout_register where bank_reference like $1 order by id",
    student_profiles: "select sp.id from student_profiles sp join platform_users u on u.id=sp.user_id where u.auth_user_id like $1 order by sp.id",
    r6_training_groups: "select id from r6_training_groups where created_by in (select id from platform_users where auth_user_id like $1) order by id",
  };
  for (const [table, sql] of Object.entries(queries)) manifest.recordIds[table] = (await pool.query(sql, [`${SOURCE_MARKER}:%`])).rows;
  manifest.cleanupExecuted = false;
  await fs.mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

const mode = process.argv.includes("--verify") ? "verify" : process.argv.includes("--apply") ? "apply" : "dry-run";
const rawUrl = process.env.DEV036F_DATABASE_URL || process.env.PRESENTATION_DATABASE_URL;
if (mode === "dry-run") { console.log(JSON.stringify({ TASK_ID: "FIXOKU_DEV_036F", SOURCE_MARKER, mode, trainers: 6, students: 24, guardians: 3, historicalStudents: 5, write: false })); process.exit(0); }
const name = assertTarget(rawUrl);
if (mode === "apply" && name === PRESENTATION_DATABASE) fail("DEV036F_PRESENTATION_WRITE_FORBIDDEN_IN_THIS_TASK");
if (mode === "apply" && !process.argv.includes("--confirm-write")) fail("DEV036F_CONFIRM_WRITE_REQUIRED");

const pool = new pg.Pool({ connectionString: rawUrl, max: 4 });
try {
  const currentDatabase = (await pool.query("select current_database() as name")).rows[0].name;
  if (currentDatabase !== name) fail("DEV036F_CURRENT_DATABASE_MISMATCH");
  if (mode === "apply") { await apply(pool); await settle(pool); }
  const client = await pool.connect();
  let counts;
  try { counts = await verify(client); } finally { client.release(); }
  const manifest = mode === "apply" ? await writeManifest(process.env.DEV036F_MANIFEST_PATH, name, counts, pool) : null;
  console.log(JSON.stringify({ TASK_ID: "FIXOKU_DEV_036F", SOURCE_MARKER, mode, counts, IDENTITY_AND_RELATIONSHIPS: "PASS", REAL_DOMAIN_FULFILLMENT: mode === "apply" ? "PASS" : "NOT_RUN", UNASSIGNED_NEW_STUDENTS: "PASS", IDEMPOTENCY_KEYED: "PASS", MANIFEST: manifest ? "PASS" : "NOT_REQUESTED" }));
} finally { await pool.end(); }
