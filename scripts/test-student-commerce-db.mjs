import assert from "node:assert/strict";
import path from "node:path";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { loadLocalEnv } from "./local-env.mjs";
import { createStudentCommerceOrder } from "../src/server/domain/student-commerce.js";

const TEST_FILE = "scripts/test-student-commerce-db.mjs";
const DOMAIN_FILE = "src/server/domain/student-commerce.js";

function safeErrorCode(error) {
  const raw = String(error?.code || "");
  if (/^[0-9A-Z]{5}$/u.test(raw)) return { errorCode: null, sqlState: raw };
  if (/^[A-Z][A-Z0-9_.:-]{0,80}$/u.test(raw)) return { errorCode: raw, sqlState: null };
  return { errorCode: "UNEXPECTED_ERROR", sqlState: null };
}

function sourceLocation(error, fallbackFile = TEST_FILE, fallbackLine = null) {
  const stack = String(error?.stack || "");
  const match = stack.match(/(?:file:\/\/\/)?([^\s()]+):(\d+):\d+/u);
  if (!match) return { file: fallbackFile, line: fallbackLine };
  let file = match[1].replaceAll("\\", "/");
  try {
    file = path.relative(process.cwd(), decodeURIComponent(file)).replaceAll("\\", "/");
  } catch {
    file = fallbackFile;
  }
  if (!/^(?:scripts|src|api)\//u.test(file)) file = fallbackFile;
  return { file, line: Number(match[2]) || fallbackLine };
}

function emitSafeDiagnostic({ stage, error, assertion = "UNEXPECTED_FAILURE", sourceFile = TEST_FILE, sourceLine = null, preferExplicitSource = false }) {
  const diagnostic = {
    stage,
    ...safeErrorCode(error),
    assertion,
    source: preferExplicitSource ? { file: sourceFile, line: sourceLine } : sourceLocation(error, sourceFile, sourceLine),
  };
  // The R68B runner accepts this prefix and discards every other child error
  // byte. Do not include error.message, stack, SQL, URLs, or fixture values.
  console.error("R68B_SAFE_DIAGNOSTIC=" + JSON.stringify(diagnostic));
  if (error && typeof error === "object") error.r68bSafeDiagnosticEmitted = true;
}

async function expectDomainFailure({ stage, run, expectedCode, assertion, sourceLine }) {
  let caught = null;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  try {
    assert.equal(caught?.code, expectedCode, assertion);
  } catch (error) {
    emitSafeDiagnostic({ stage, error, assertion, sourceFile: DOMAIN_FILE, sourceLine, preferExplicitSource: true });
    throw error;
  }
}

async function main() {
  loadLocalEnv();
  let disposable = null;
  let stage = "DISPOSABLE_DATABASE";
  try {
    disposable = await createDisposableDatabase(
      process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") },
    );
    const pool = disposable.pool;
    stage = "FIXTURE_USER";
    const authId = "student-commerce-test-auth";
    const user = (await pool.query(
      "insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,'commerce.student@test.local','Commerce Student',true) returning id",
      [authId],
    )).rows[0];
    await pool.query(
      "insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'STUDENT',$1,'STUDENT','ACTIVE')",
      [user.id],
    );
    const profile = (await pool.query(
      "insert into student_profiles(user_id,first_name,last_name,education_stage,grade,status) values($1,'Commerce','Student','MIDDLE','6','ACTIVE') returning id",
      [user.id],
    )).rows[0];

    stage = "FIXTURE_CATALOG";
    const physical = (await pool.query(
      "insert into physical_products(sku,title,description,product_type,is_active,r6_product_type,list_gross_minor,vat_rate_bps,stock_location,on_hand,reserved,low_stock_threshold,cost_minor,currency) values('TEST-BOOK','Test Kitap','', 'PHYSICAL',true,'BOOK',60000,0,'LOCAL',10,0,0,100,'TRY') returning id",
    )).rows[0];
    const software = (await pool.query(
      "insert into physical_products(sku,title,description,product_type,is_active,r6_product_type,list_gross_minor,vat_rate_bps,stock_location,on_hand,reserved,low_stock_threshold,cost_minor,currency) values('TEST-SOFT','Test Yazılım','', 'SOFTWARE',true,'SOFTWARE',40000,2000,null,0,0,0,0,'TRY') returning id",
    )).rows[0];
    const pkg = (await pool.query(
      "insert into packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,panel_visible,public_web_visible,shipping_policy,shipping_price_minor) values('test-middle-mixed','STUDENT','STUDENT_COMMERCE','MIDDLE','[5,6,7,8]',1,'PUBLISHED',true,true,false,'FIXED_PRICE',15000) returning id",
    )).rows[0];
    const version = (await pool.query(
      "insert into package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status,published_at) values($1,1,'AKILLI SİSTEM','Kitaplar + Yazılım','Kitaplar + Yazılım','[]',2000,93333,100000,100000,'TRY',true,'PUBLISHED',now()) returning id",
      [pkg.id],
    )).rows[0];
    const components = (await pool.query(
      "insert into package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,quantity,display_order,metadata_json) values($1,'PHYSICAL_PRODUCT',$2,$2,'Test Kitap',2,1,'{}'),($1,'DIGITAL_ACCESS',$3,null,'Test Yazılım',1,2,'{}') returning id,component_type",
      [version.id, physical.id, software.id],
    )).rows;
    const physicalComponent = components.find((row) => row.component_type === "PHYSICAL_PRODUCT");
    const softwareComponent = components.find((row) => row.component_type === "DIGITAL_ACCESS");
    await pool.query(
      "insert into r6_package_component_pricing(package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency) values($1,120000,60000,60000,5000,0,60000,0,'TRY'),($2,40000,40000,0,0,2000,33333,6667,'TRY')",
      [physicalComponent.id, softwareComponent.id],
    );
    await pool.query(
      "insert into student_cart_items(buyer_user_id,beneficiary_student_profile_id,package_version_id,quantity) values($1,$2,$3,1)",
      [user.id, profile.id, version.id],
    );
    const debug = (await pool.query(
      "select p.id,p.audience,p.catalog_scope,p.education_stage,p.eligible_grades_json,p.status,pv.id as version_id,pv.status as version_status,pv.purchase_enabled from packages p join package_versions pv on pv.package_id=p.id where pv.id=$1",
      [version.id],
    )).rows[0];
    assert.deepEqual(debug, {
      id: pkg.id,
      audience: "STUDENT",
      catalog_scope: "STUDENT_COMMERCE",
      education_stage: "MIDDLE",
      eligible_grades_json: "[5,6,7,8]",
      status: "PUBLISHED",
      version_id: version.id,
      version_status: "PUBLISHED",
      purchase_enabled: true,
    }, "R68B_CANONICAL_STUDENT_COMMERCE_FIXTURE");

    stage = "R63B_SHIPPING_VAT_GUARD";
    const principal = {
      user: { id: user.id, displayName: "Commerce Student", email: "commerce.student@test.local" },
      memberships: [{ role: "STUDENT", scopeType: "STUDENT", scopeId: user.id, status: "ACTIVE" }],
    };
    const client = await pool.connect();
    try {
      await expectDomainFailure({
        stage: "R63B_LEGAL_GUARD",
        expectedCode: "LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED",
        assertion: "R63B_STUDENT_SALE_REQUIRES_EXPLICIT_LEGAL_ACCEPTANCE",
        sourceLine: 178,
        run: () => createStudentCommerceOrder(client, principal, {
          studentProfileId: profile.id,
          idempotencyKey: "student-commerce-test",
          paymentMethod: "BANK_TRANSFER",
          shippingAddress: { firstName: "Commerce", lastName: "Student", phone: "555", city: "İstanbul", district: "Kadıköy", addressLine: "Test adres" },
          billing: { type: "INDIVIDUAL", sameAsShipping: true },
        }),
      });
      await expectDomainFailure({
        stage: "R63B_SHIPPING_VAT_GUARD",
        expectedCode: "SHIPPING_VAT_RATE_REQUIRED",
        assertion: "R63B_PHYSICAL_STUDENT_SALE_REQUIRES_CONFIRMED_SHIPPING_VAT",
        sourceLine: 180,
        run: () => createStudentCommerceOrder(client, principal, {
          studentProfileId: profile.id,
          idempotencyKey: "student-commerce-test",
          paymentMethod: "BANK_TRANSFER",
          shippingAddress: { firstName: "Commerce", lastName: "Student", phone: "555", city: "İstanbul", district: "Kadıköy", addressLine: "Test adres" },
          billing: { type: "INDIVIDUAL", sameAsShipping: true },
          legalAcceptance: { preInformation: true, distanceSales: true, privacy: true, marketing: false, commencement: false },
        }),
      });
    } finally {
      client.release();
    }

    stage = "R63B_NO_ORDER_SIDE_EFFECT";
    const orderCount = (await pool.query(
      "select count(*)::int as count from orders where buyer_user_id=$1 and idempotency_key='student-commerce-test'",
      [user.id],
    )).rows[0].count;
    assert.equal(orderCount, 0, "R63B_GUARD_MUST_PREVENT_ORDER_CREATION");
    const cartCount = (await pool.query(
      "select count(*)::int as count from student_cart_items where buyer_user_id=$1 and package_version_id=$2",
      [user.id, version.id],
    )).rows[0].count;
    assert.equal(cartCount, 1, "R63B_GUARD_MUST_PRESERVE_CART");
    const paymentCount = (await pool.query(
      "select count(*)::int as count from payment_intents pi join orders o on o.id=pi.order_id where o.buyer_user_id=$1 and o.idempotency_key='student-commerce-test'",
      [user.id],
    )).rows[0].count;
    assert.equal(paymentCount, 0, "R63B_GUARD_MUST_PREVENT_PAYMENT_INTENT");
    const shipmentCount = (await pool.query(
      "select count(*)::int as count from shipments s join orders o on o.id=s.order_id where o.buyer_user_id=$1 and o.idempotency_key='student-commerce-test'",
      [user.id],
    )).rows[0].count;
    assert.equal(shipmentCount, 0, "R63B_GUARD_MUST_PREVENT_SHIPMENT");
    const shipmentItemCount = (await pool.query(
      "select count(*)::int as count from shipment_items si join shipments s on s.id=si.shipment_id join orders o on o.id=s.order_id where o.buyer_user_id=$1 and o.idempotency_key='student-commerce-test'",
      [user.id],
    )).rows[0].count;
    assert.equal(shipmentItemCount, 0, "R63B_GUARD_MUST_PREVENT_SHIPMENT_ITEMS");
    const entitlementCount = (await pool.query(
      "select count(*)::int as count from package_entitlements pe join orders o on o.id=pe.source_order_id where o.buyer_user_id=$1 and o.idempotency_key='student-commerce-test'",
      [user.id],
    )).rows[0].count;
    assert.equal(entitlementCount, 0, "R63B_GUARD_MUST_PREVENT_PACKAGE_OWNERSHIP");
    const enrollmentCount = (await pool.query(
      "select count(*)::int as count from enrollments where student_user_id=$1",
      [user.id],
    )).rows[0].count;
    assert.equal(enrollmentCount, 0, "R63B_GUARD_MUST_PREVENT_ENROLLMENT");
    const entitlementEnrollmentCount = (await pool.query(
      "select count(*)::int as count from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id join orders o on o.id=pe.source_order_id where o.buyer_user_id=$1 and o.idempotency_key='student-commerce-test'",
      [user.id],
    )).rows[0].count;
    assert.equal(entitlementEnrollmentCount, 0, "R63B_GUARD_MUST_PREVENT_ENTITLEMENT_ENROLLMENT");

    console.log(JSON.stringify({
      STUDENT_COMMERCE_FAILURE_CAUSE: "STALE_FIXTURE_MISSED_R63B_LEGAL_ACCEPTANCE",
      FIRST_RUNTIME_GUARD: "LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED",
      NEXT_RUNTIME_GUARD: "SHIPPING_VAT_RATE_REQUIRED",
      MIXED_PACKAGE_FULFILLMENT: "NOT_REACHED_FAIL_CLOSED",
      SHIPPING_FEE_SERVER_DERIVED: "FIXTURE_READY",
      SHIPPING_SNAPSHOT: "NOT_CREATED",
      PHYSICAL_ONLY_SHIPMENT_ITEMS: "NOT_CREATED",
      PACKAGE_OWNERSHIP: "NOT_CREATED",
      VIDEO_ACTIVATION: "NO",
      CURRICULUM_ACTIVATION: "NO",
      ENROLLMENT_CREATED: "NO",
      TRAINING_PROGRAM_MATERIALIZATION: "NO",
      LEGAL_CONTROL: "PRESERVED",
      VAT_CONTROL: "PRESERVED",
    }));
  } catch (error) {
    if (!error?.r68bSafeDiagnosticEmitted) emitSafeDiagnostic({ stage, error });
    throw error;
  } finally {
    await disposable?.dispose();
  }
}

try {
  await main();
} catch {
  process.exitCode = 1;
}

