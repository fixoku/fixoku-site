/* global process */
import crypto from "node:crypto";
import { UUID_PATTERN, listBeneficiaries, normalizeCurrency, resolveBeneficiary, sha256 } from "./commerce.js";
import { validateEducationSegment } from "./student-segment.js";
import { countPhysicalBooks, shippingForBookCount } from "./book-shipping.js";

function error(code, status = 400) { return Object.assign(new Error(code), { code, status }); }
const parseJson = (value, yedek) => { try { return JSON.parse(value || ""); } catch { return yedek; } };

async function resolveAccountSegment(client, principal, input = {}) {
  let educationStage = input?.catalogEducationStage || input?.educationStage || null;
  let grade = input?.catalogGrade ?? input?.grade ?? null;
  if (!educationStage) {
    const beneficiaries = await listBeneficiaries(client, principal);
    const first = beneficiaries.find((row) => row.educationStage);
    educationStage = first?.educationStage || null;
    grade = first?.grade ?? null;
  }
  if (!educationStage) throw error("STUDENT_SEGMENT_REQUIRED", 409);
  const segment = validateEducationSegment(educationStage, grade);
  return {
    studentUserId: principal.user.id,
    studentProfileId: null,
    childProfileId: null,
    studentName: principal.user.displayName || principal.user.email || "",
    educationStage: segment.educationStage,
    grade: segment.grade,
    accountLevel: true,
  };
}

async function resolvePurchaseBeneficiary(client, principal, requestedProfileId = null, accountInput = null) {
  if (requestedProfileId) return resolveBeneficiary(client, principal, requestedProfileId);
  return resolveAccountSegment(client, principal, accountInput || {});
}

export async function readEligibleStudentCommerceVersion(client, principal, packageVersionId, requestedProfileId = null, accountInput = null) {
  if (!UUID_PATTERN.test(String(packageVersionId || ""))) throw error("INVALID_PACKAGE_VERSION_ID");
  const beneficiary = await resolvePurchaseBeneficiary(client, principal, requestedProfileId, accountInput);
  if (!beneficiary.educationStage) throw error("STUDENT_SEGMENT_REQUIRED", 409);
  const segment = validateEducationSegment(beneficiary.educationStage, beneficiary.grade);
  const rows = (await client.query(`select p.id as "packageId",p.slug,p.catalog_scope as "catalogScope",p.education_stage as "educationStage",p.shipping_price_minor as "shippingFeeMinor",p.physical_product as "requiresShipping",pv.id as "packageVersionId",pv.version_number as "versionNumber",pv.title,pv.short_description as subtitle,pv.description,pv.features_json as "featuresJson",pv.price_minor as "priceMinor",pv.price_gross_minor as "priceGrossMinor",pv.vat_rate_bps as "packageVatRateBps",pv.currency,pc.id as "packageComponentId",pc.reference_id as "productId",pc.quantity,pc.display_order as "displayOrder",prod.sku,prod.title as "productTitle",prod.product_type as "productType",prod.r6_product_type as "r6ProductType",prod.list_gross_minor as "productListGrossMinor",prod.vat_rate_bps as "productVatRateBps",r6p.list_gross_minor as "componentListGrossMinor",r6p.effective_sale_gross_minor as "componentSaleGrossMinor",r6p.vat_rate_bps as "componentVatRateBps",r6p.net_minor as "componentNetMinor",r6p.vat_minor as "componentVatMinor" from packages p join package_versions pv on pv.package_id=p.id left join package_components pc on pc.package_version_id=pv.id and pc.reference_id is not null and pc.is_active=true left join physical_products prod on prod.id=pc.reference_id left join r6_package_component_pricing r6p on r6p.package_component_id=pc.id where pv.id=$1 and p.catalog_scope='STUDENT_COMMERCE' and p.audience='STUDENT' and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true and p.education_stage=$2::education_stage and ($2::text='ADULT' or p.eligible_grades_json::jsonb @> to_jsonb($3::int)) order by pc.display_order,pc.id`, [packageVersionId, segment.educationStage, segment.grade])).rows;
  if (!rows.length) throw error("PACKAGE_VERSION_UNAVAILABLE", 409);
  const first = rows[0]; const currency = normalizeCurrency(first.currency);
  if (!Number.isSafeInteger(first.priceMinor) || first.priceMinor < 0 || !currency) throw error("PRICE_REQUIRED", 409);
  const components = rows.filter((row) => row.productId).map((row) => ({ productId: row.productId, packageComponentId: row.packageComponentId, sku: row.sku, title: row.productTitle, productType: row.productType, r6ProductType: row.r6ProductType, quantity: Number(row.quantity), displayOrder: Number(row.displayOrder), listGrossMinor: Number(row.componentListGrossMinor ?? row.productListGrossMinor ?? 0), saleGrossMinor: Number(row.componentSaleGrossMinor ?? row.componentListGrossMinor ?? row.productListGrossMinor ?? 0), vatRateBps: Number(row.componentVatRateBps ?? row.productVatRateBps ?? row.packageVatRateBps ?? 0), netMinor: Number(row.componentNetMinor ?? 0), vatMinor: Number(row.componentVatMinor ?? 0), educationStage: row.educationStage }));
  if (!components.length) throw error("PACKAGE_PRODUCTS_REQUIRED", 409);
  const requiresShipping = components.some((item) => item.productType === "PHYSICAL");
  // Shipping is a cart-level charge. Keep item cards free of per-package freight.
  return { ...first, currency, priceMinor: Number(first.priceMinor), shippingFeeMinor: 0, requiresShipping, features: parseJson(first.featuresJson, []), components, beneficiary };
}

export async function readStudentCart(client, principal, requestedProfileId = null, accountInput = null) {
  let beneficiary;
  let rows;
  if (requestedProfileId) {
    beneficiary = await resolveBeneficiary(client, principal, requestedProfileId);
    rows = (await client.query("select package_version_id as \"packageVersionId\", null::education_stage as \"catalogEducationStage\", null::text as \"catalogGrade\" from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id=$2 and ($3::uuid is null or beneficiary_child_profile_id=$3) order by created_at", [principal.user.id, beneficiary.studentProfileId, beneficiary.childProfileId || null])).rows;
  } else {
    const accountRows = (await client.query("select package_version_id as \"packageVersionId\", catalog_education_stage as \"catalogEducationStage\", catalog_grade as \"catalogGrade\" from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id is null order by created_at", [principal.user.id])).rows;
    // A request without a selected profile is always account-level. Never
    // silently surface a legacy profile-scoped cart in this mode.
    beneficiary = await resolveAccountSegment(client, principal, {
      ...(accountInput || {}),
      catalogEducationStage: accountRows[0]?.catalogEducationStage || accountInput?.catalogEducationStage,
      catalogGrade: accountRows[0]?.catalogGrade ?? accountInput?.catalogGrade,
    });
    rows = accountRows;
  }
  const items = [];
  for (const row of rows) items.push(await readEligibleStudentCommerceVersion(client, principal, row.packageVersionId, beneficiary.accountLevel ? null : (beneficiary.childProfileId || beneficiary.studentProfileId), beneficiary.accountLevel ? { catalogEducationStage: row.catalogEducationStage || beneficiary.educationStage, catalogGrade: row.catalogGrade ?? beneficiary.grade } : null));
  const currencies = new Set(items.map((item) => item.currency)); if (currencies.size > 1) throw error("CART_CURRENCY_MISMATCH", 409);
  const subtotalMinor = items.reduce((sum, item) => sum + item.priceMinor, 0);
  const bookCount = items.reduce((sum, item) => sum + countPhysicalBooks(item.components), 0);
  const shippingMinor = shippingForBookCount(bookCount);
  const catalogSegments = items.map((item) => ({ packageVersionId: item.packageVersionId, educationStage: item.beneficiary.educationStage, grade: item.beneficiary.grade }));
  return { beneficiary, items, catalogSegments, subtotalMinor, shippingMinor, totalMinor: subtotalMinor + shippingMinor, currency: items[0]?.currency || "TRY", requiresShipping: items.some((item) => item.requiresShipping) };
}

function addressSnapshot(input) {
  const address = input && typeof input === "object" ? input : {};
  const value = { firstName: String(address.firstName || "").trim(), lastName: String(address.lastName || "").trim(), phone: String(address.phone || "").trim(), city: String(address.city || "").trim(), district: String(address.district || "").trim(), neighborhood: String(address.neighborhood || "").trim(), addressLine: String(address.addressLine || "").trim(), postalCode: String(address.postalCode || "").trim() };
  if ([value.firstName, value.lastName, value.phone, value.city, value.district, value.addressLine].some((item) => !item)) throw error("SHIPPING_ADDRESS_REQUIRED");
  return value;
}

function billingSnapshot(input, shippingAddress, displayName = "") {
  const billing = input && typeof input === "object" ? input : {};
  const type = String(billing.type || "INDIVIDUAL").toUpperCase();
  if (!['INDIVIDUAL', 'CORPORATE'].includes(type)) throw error("BILLING_TYPE_INVALID");
  if (type === "CORPORATE") {
    const value = { type, companyName: String(billing.companyName || "").trim(), taxOffice: String(billing.taxOffice || "").trim(), taxNumber: String(billing.taxNumber || "").trim(), sameAsShipping: Boolean(billing.sameAsShipping) };
    if (!value.companyName || !value.taxOffice || !value.taxNumber) throw error("CORPORATE_BILLING_REQUIRED");
    return value;
  }
  const nameParts = String(displayName || "").trim().split(/\s+/u).filter(Boolean);
  const value = { type, firstName: String(billing.firstName || (billing.sameAsShipping ? shippingAddress?.firstName : "") || nameParts[0] || "").trim(), lastName: String(billing.lastName || (billing.sameAsShipping ? shippingAddress?.lastName : "") || nameParts.slice(1).join(" ") || "").trim(), identityNumber: String(billing.identityNumber || "").trim(), sameAsShipping: Boolean(billing.sameAsShipping) };
  if (!value.firstName || !value.lastName) throw error("INDIVIDUAL_BILLING_REQUIRED");
  return value;
}

export async function createStudentCommerceOrder(client, principal, input) {
  const paymentMethod = String(input?.paymentMethod || "").toUpperCase();
  if (!["PAYTR", "BANK_TRANSFER"].includes(paymentMethod)) throw error("PAYMENT_METHOD_INVALID");
  const idempotencyKey = String(input?.idempotencyKey || "").trim();
  if (!idempotencyKey || idempotencyKey.length > 160) throw error("IDEMPOTENCY_KEY_REQUIRED");
  const requestedProfileId = input?.childProfileId || input?.studentProfileId || null;
  const accountMode = !requestedProfileId;
  const existingBeforeCart = (await client.query("select * from orders where buyer_user_id=$1 and idempotency_key=$2", [principal.user.id, idempotencyKey])).rows[0];
  if (existingBeforeCart) {
    if (existingBeforeCart.payment_method != null && existingBeforeCart.payment_method !== paymentMethod) throw error("IDEMPOTENCY_KEY_CONFLICT", 409);
    if (!accountMode) {
      const beneficiary = await resolveBeneficiary(client, principal, requestedProfileId);
      if (String(existingBeforeCart.beneficiary_student_profile_id) !== String(beneficiary.studentProfileId || "") || String(existingBeforeCart.beneficiary_child_profile_id || "") !== String(beneficiary.childProfileId || "")) throw error("IDEMPOTENCY_KEY_CONFLICT", 409);
    }
    if (accountMode && String(existingBeforeCart.beneficiary_student_user_id) !== String(principal.user.id)) throw error("IDEMPOTENCY_KEY_CONFLICT", 409);
    // Idempotency is authoritative for an already-created legacy order. A
    // retry may arrive without the old profile selector; replay the immutable
    // order instead of treating it as a new account-level purchase.
    return { order: existingBeforeCart, paymentIntent: (await client.query("select * from payment_intents where order_id=$1", [existingBeforeCart.id])).rows[0], replay: true, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) };
  }
  const cart = await readStudentCart(client, principal, requestedProfileId, accountMode ? input : null);
  if (!cart.items.length) throw error("CART_EMPTY", 409);
  const owned = (await client.query(`select package_version_id from package_entitlements where beneficiary_student_user_id=$1 and ${accountMode ? "beneficiary_student_profile_id is null and beneficiary_child_profile_id is null" : "($3::uuid is null or beneficiary_child_profile_id=$3)"} and status='ACTIVE' and package_version_id=any($2::uuid[])`, accountMode ? [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId)] : [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId), cart.beneficiary.childProfileId || null])).rows;
  if (owned.length) throw error("PACKAGE_ALREADY_OWNED", 409);
  const pending = (await client.query(`select distinct oi.package_version_id from orders o join order_items oi on oi.order_id=o.id where o.beneficiary_student_user_id=$1 and ${accountMode ? "o.beneficiary_student_profile_id is null and o.beneficiary_child_profile_id is null" : "($3::uuid is null or o.beneficiary_child_profile_id=$3)"} and o.status='PENDING_PAYMENT' and oi.package_version_id=any($2::uuid[])`, accountMode ? [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId)] : [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId), cart.beneficiary.childProfileId || null])).rows;
  if (pending.length) throw error("ORDER_ALREADY_EXISTS", 409);
  const shippingAddress = cart.requiresShipping ? addressSnapshot(input.shippingAddress) : null;
  const billing = billingSnapshot(input.billing, shippingAddress, principal.user?.displayName);
  const requestHash = accountMode
    ? sha256({ paymentMethod, accountUserId: principal.user.id, catalogSegments: cart.catalogSegments, packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingAddress, billing })
    : sha256({ paymentMethod, studentProfileId: cart.beneficiary.studentProfileId, packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingAddress, billing });
  await client.query("begin");
  try {
    const existing = (await client.query("select * from orders where buyer_user_id=$1 and idempotency_key=$2 for update", [principal.user.id, idempotencyKey])).rows[0];
    if (existing) { const legacyHash = sha256({ studentProfileId: cart.beneficiary.studentProfileId, packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingAddress, billing }); const hashMatches = existing.request_hash === requestHash || (!accountMode && existing.payment_method == null && existing.request_hash === legacyHash); if (!hashMatches) throw error("IDEMPOTENCY_KEY_CONFLICT", 409); await client.query("commit"); return { order: existing, replay: true, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) }; }
    const order = (await client.query(`insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,beneficiary_child_profile_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,$2,$3,$4,'PENDING_PAYMENT',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`, [principal.user.id, cart.beneficiary.studentUserId, cart.beneficiary.studentProfileId || null, cart.beneficiary.childProfileId || null, paymentMethod, cart.currency, cart.subtotalMinor, cart.shippingMinor, cart.totalMinor, "STUDENT_COMMERCE", shippingAddress ? JSON.stringify(shippingAddress) : null, JSON.stringify(billing), idempotencyKey, requestHash])).rows[0];
    for (const item of cart.items) {
      const listGrossMinor = item.components.reduce((sum, component) => sum + Number(component.listGrossMinor || 0) * Number(component.quantity || 1), 0) || item.priceMinor;
      const saleGrossMinor = item.priceMinor;
      const discountMinor = Math.max(0, listGrossMinor - saleGrossMinor);
      const vatRateBps = Number(item.components.find((component) => component.productType !== "PHYSICAL")?.vatRateBps || item.components[0]?.vatRateBps || 0);
      const vatMinor = Math.round(saleGrossMinor * vatRateBps / (10000 + vatRateBps));
      const netMinor = saleGrossMinor - vatMinor;
      const itemRow = (await client.query(`insert into order_items(order_id,package_id,package_version_id,beneficiary_child_profile_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,list_gross_minor,sale_gross_minor,discount_minor,discount_percent_bps,vat_net_minor,vat_minor,vat_rate_bps,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json) values($1,$2,$3,$4,$5,$6,$7,'SELF_PACED',$8,$8,$9,$10,$11,$12,$13,$14,$15,$16,1,'[]',$17) returning id`, [order.id, item.packageId, item.packageVersionId, item.beneficiary.childProfileId || null, item.title, item.description, item.versionNumber, saleGrossMinor, listGrossMinor, saleGrossMinor, discountMinor, listGrossMinor ? Math.round(discountMinor * 10000 / listGrossMinor) : 0, netMinor, vatMinor, vatRateBps, item.currency, JSON.stringify(item.components)])).rows[0];
      for (const [lineOrder, component] of item.components.entries()) {
        const gross = Number(component.saleGrossMinor || component.listGrossMinor || 0) * Number(component.quantity || 1);
        const lineVatRate = Number(component.vatRateBps || 0); const lineVat = Number(component.vatMinor || Math.round(gross * lineVatRate / (10000 + lineVatRate))); const lineNet = Number(component.netMinor || (gross - lineVat));
        await client.query(`insert into r6_order_component_snapshots(order_item_id,package_component_id,physical_product_id,product_type,education_stage,sku_snapshot,title_snapshot,quantity,list_gross_minor,sale_gross_minor,discount_minor,vat_rate_bps,net_minor,vat_minor,gross_minor,beneficiary_child_profile_id,line_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$10,$15,$16) on conflict(order_item_id,line_order) do nothing`, [itemRow.id, item.packageComponentId || null, component.productId || null, component.productType || "UNKNOWN", component.educationStage || null, component.sku || null, component.title || item.title, Number(component.quantity || 1), Number(component.listGrossMinor || gross), gross, Math.max(0, Number(component.listGrossMinor || gross) - gross), lineVatRate, lineNet, lineVat, item.beneficiary.childProfileId || null, lineOrder]);
      }
    }
    const paymentIntent = (await client.query("insert into payment_intents(order_id,status,provider,amount_minor,currency,idempotency_key) values($1,'CREATED',null,$2,$3,$4) returning *", [order.id, order.total_minor, order.currency, `PAYMENT_INTENT:${order.id}`])).rows[0];
    if (accountMode) {
      await client.query("delete from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id is null and beneficiary_child_profile_id is null", [principal.user.id]);
    } else {
      await client.query("delete from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id=$2 and ($3::uuid is null or beneficiary_child_profile_id=$3)", [principal.user.id, cart.beneficiary.studentProfileId, cart.beneficiary.childProfileId || null]);
    }
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'student_commerce.order.created','order',$2,'SUCCESS',$3,$4)", [principal.user.id, order.id, crypto.randomUUID(), JSON.stringify({ packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingMinor: cart.shippingMinor, requiresShipping: cart.requiresShipping, paymentMethod })]);
    await client.query("commit"); return { order, paymentIntent, replay: false, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) };
  } catch (cause) { try { await client.query("rollback"); } catch { /* preserve */ } throw cause; }
}
