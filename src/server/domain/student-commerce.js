/* global process */
import crypto from "node:crypto";
import { legalSnapshotRows, readPublishedLegalDocuments, studentLegalAcceptance } from "./trainer-legal-documents.js";
import { UUID_PATTERN, listBeneficiaries, normalizeCurrency, readEffectiveVatDecision, resolveBeneficiary, sha256 } from "./commerce.js";
import { validateEducationSegment } from "./student-segment.js";
import { countPhysicalBooks, shippingForBookCount } from "./book-shipping.js";

function error(code, status = 400) { return Object.assign(new Error(code), { code, status }); }
const parseJson = (value, yedek) => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || ""); } catch { return yedek; }
};

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
  // The optional r6_product_type subtype does not exist in some local schemas.
  // Resolve its presence using a read-only catalog lookup; never infer a sale type.
  const subtypeColumn = (await client.query("select exists (select 1 from information_schema.columns where table_name='physical_products' and column_name='r6_product_type' and table_schema = any(current_schemas(false))) as present")).rows[0]?.present === true;
  const subtypeSql = subtypeColumn ? 'prod.r6_product_type' : 'null::text';
  const rows = (await client.query(`select p.id as "packageId",p.slug,p.catalog_scope as "catalogScope",p.education_stage as "educationStage",p.shipping_price_minor as "shippingFeeMinor",p.physical_product as "requiresShipping",pv.id as "packageVersionId",pv.version_number as "versionNumber",pv.title,pv.short_description as subtitle,pv.description,pv.features_json as "featuresJson",pv.price_minor as "priceMinor",pv.price_gross_minor as "priceGrossMinor",pv.vat_rate_bps as "packageVatRateBps",pv.currency,(select coalesce(json_agg(json_build_object('id',ped.id,'trainingProgramId',ped.training_program_id,'deliveryMode',ped.delivery_mode) order by ped.training_program_id),'[]'::json) from package_entitlement_definitions ped where ped.package_version_id=pv.id) as "entitlementDefinitionsJson",pc.id as "packageComponentId",pc.reference_id as "productId",pc.quantity,pc.display_order as "displayOrder",prod.sku,prod.title as "productTitle",prod.product_type as "productType",${subtypeSql} as "r6ProductType",prod.list_gross_minor as "productListGrossMinor",prod.vat_rate_bps as "productVatRateBps",r6p.id as "componentPricingId",r6p.list_gross_minor as "componentListGrossMinor",r6p.effective_sale_gross_minor as "componentSaleGrossMinor",r6p.vat_rate_bps as "componentVatRateBps",r6p.net_minor as "componentNetMinor",r6p.vat_minor as "componentVatMinor" from packages p join package_versions pv on pv.package_id=p.id left join package_components pc on pc.package_version_id=pv.id and pc.reference_id is not null and pc.is_active=true left join physical_products prod on prod.id=pc.reference_id left join r6_package_component_pricing r6p on r6p.package_component_id=pc.id where pv.id=$1 and p.catalog_scope='STUDENT_COMMERCE' and p.audience='STUDENT' and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true and p.education_stage=$2::education_stage and ($2::text='ADULT' or p.eligible_grades_json::jsonb @> to_jsonb($3::int)) order by pc.display_order,pc.id`, [packageVersionId, segment.educationStage, segment.grade])).rows;
  if (!rows.length) throw error("PACKAGE_VERSION_UNAVAILABLE", 409);
  const first = rows[0]; const currency = normalizeCurrency(first.currency);
  if (!Number.isSafeInteger(first.priceMinor) || first.priceMinor < 0 || !currency) throw error("PRICE_REQUIRED", 409);
  const components = rows.filter((row) => row.productId).map((row) => ({ productId: row.productId, packageComponentId: row.packageComponentId, sku: row.sku, title: row.productTitle, productType: row.productType, r6ProductType: row.r6ProductType, quantity: Number(row.quantity), displayOrder: Number(row.displayOrder), pricingSnapshot: Boolean(row.componentPricingId), listGrossMinor: Number(row.componentListGrossMinor ?? row.productListGrossMinor ?? 0), saleGrossMinor: Number(row.componentSaleGrossMinor ?? row.componentListGrossMinor ?? row.productListGrossMinor ?? 0), vatRateBps: row.componentVatRateBps ?? row.productVatRateBps ?? row.packageVatRateBps ?? null, netMinor: row.componentNetMinor == null ? null : Number(row.componentNetMinor), vatMinor: row.componentVatMinor == null ? null : Number(row.componentVatMinor), educationStage: row.educationStage }));
  if (!components.length) throw error("PACKAGE_PRODUCTS_REQUIRED", 409);
  const requiresShipping = components.some((item) => item.productType === "PHYSICAL");
  // Shipping is a cart-level charge. Keep item cards free of per-package freight.
	  return { ...first, currency, priceMinor: Number(first.priceMinor), shippingFeeMinor: 0, requiresShipping, features: parseJson(first.featuresJson, []), entitlementDefinitions: parseJson(first.entitlementDefinitionsJson, []), components, beneficiary };
}

export async function studentCartSupportsFamilyOffers(client) {
  // The normal package cart must also work before the optional family-cart migration.
  const result = await client.query("select count(distinct column_name)::integer as found from information_schema.columns where table_schema = any(current_schemas(false)) and table_name='student_cart_items' and column_name in ('family_offer_id','family_offer_revision_number')");
  return Number(result.rows[0]?.found || 0) === 2;
}

export async function readStudentCart(client, principal, requestedProfileId = null, accountInput = null) {
  let beneficiary;
  let rows;
  let familyRows = [];
  if (requestedProfileId) {
    beneficiary = await resolveBeneficiary(client, principal, requestedProfileId);
    rows = (await client.query("select package_version_id as \"packageVersionId\", null::education_stage as \"catalogEducationStage\", null::text as \"catalogGrade\" from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id=$2 and (($3::uuid is null and beneficiary_child_profile_id is null) or beneficiary_child_profile_id=$3) order by created_at", [principal.user.id, beneficiary.studentProfileId, beneficiary.childProfileId || null])).rows;
  } else {
    const accountRows = (await client.query("select package_version_id as \"packageVersionId\", catalog_education_stage as \"catalogEducationStage\", catalog_grade as \"catalogGrade\" from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id is null and package_version_id is not null order by created_at", [principal.user.id])).rows;
    if (await studentCartSupportsFamilyOffers(client)) {
      familyRows = (await client.query("select family_offer_id as \"familyOfferId\", family_offer_revision_number as \"familyOfferRevisionNumber\" from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id is null and family_offer_id is not null order by created_at", [principal.user.id])).rows;
    }
    // A request without a selected profile is always account-level. Never
    // silently surface a legacy profile-scoped cart in this mode.
    if (!accountRows.length && !accountInput?.catalogEducationStage && !accountInput?.educationStage) {
      beneficiary = { studentUserId: principal.user.id, studentProfileId: null, childProfileId: null, studentName: principal.user.displayName || principal.user.email || "", educationStage: null, grade: null, accountLevel: true };
    } else beneficiary = await resolveAccountSegment(client, principal, {
      ...(accountInput || {}),
      catalogEducationStage: accountRows[0]?.catalogEducationStage || accountInput?.catalogEducationStage,
      catalogGrade: accountRows[0]?.catalogGrade ?? accountInput?.catalogGrade,
    });
    rows = accountRows;
  }
  const items = [];
  for (const row of rows) items.push(await readEligibleStudentCommerceVersion(client, principal, row.packageVersionId, beneficiary.accountLevel ? null : (beneficiary.childProfileId || beneficiary.studentProfileId), beneficiary.accountLevel ? { catalogEducationStage: row.catalogEducationStage || beneficiary.educationStage, catalogGrade: row.catalogGrade ?? beneficiary.grade } : null));
  for (const row of familyRows) {
    const family = await readFamilyOfferCartItem(client, principal.user.id, row.familyOfferId, row.familyOfferRevisionNumber);
    items.push(family);
  }
  const currencies = new Set(items.map((item) => item.currency)); if (currencies.size > 1) throw error("CART_CURRENCY_MISMATCH", 409);
  const subtotalMinor = items.reduce((sum, item) => sum + item.priceMinor, 0);
  const bookCount = items.reduce((sum, item) => sum + Number(item.bookCount || countPhysicalBooks(item.components || [])), 0);
  const shippingMinor = shippingForBookCount(bookCount);
  const catalogSegments = items.filter((item) => item.packageVersionId).map((item) => ({ packageVersionId: item.packageVersionId, educationStage: item.beneficiary?.educationStage, grade: item.beneficiary?.grade }));
  return { beneficiary, items, catalogSegments, subtotalMinor, shippingMinor, totalMinor: subtotalMinor + shippingMinor, currency: items[0]?.currency || "TRY", requiresShipping: items.some((item) => item.requiresShipping) };
}

function familySnapshot(value) { return typeof value === "string" ? JSON.parse(value) : (value || {}); }

export async function readFamilyOfferCartItem(client, customerUserId, offerId, revisionNumber) {
  const offer = (await client.query("select id,title,customer_user_id,status,current_revision_number from family_offers where id=$1 and customer_user_id=$2", [offerId, customerUserId])).rows[0];
  if (!offer) throw error("FAMILY_OFFER_NOT_FOUND", 404);
  if (offer.status !== "SENT") throw error("FAMILY_OFFER_NOT_AVAILABLE", 409);
  if (Number(offer.current_revision_number) !== Number(revisionNumber)) throw error("FAMILY_REVISION_STALE", 409);
  const revision = (await client.query("select id,revision_number,status,pricing_snapshot from family_offer_revisions where offer_id=$1 and revision_number=$2", [offer.id, revisionNumber])).rows[0];
  if (!revision || revision.status !== "SENT") throw error("FAMILY_REVISION_NOT_AVAILABLE", 409);
  const pricing = familySnapshot(revision.pricing_snapshot);
  const children = (await client.query("select id,local_key,first_name,last_name,grade,education_stage,existing_child_profile_id,existing_student_profile_id from family_offer_draft_children where revision_id=$1 order by created_at,id", [revision.id])).rows;
  const selections = (await client.query("select draft_child_id,title_snapshot,product_type,service_mode,sale_gross_minor,currency from family_offer_child_selections where revision_id=$1 order by created_at,id", [revision.id])).rows;
  const byChild = new Map(children.map((child) => [child.id, { childProfileId: child.existing_child_profile_id || child.existing_student_profile_id || null, firstName: child.first_name, lastName: child.last_name, grade: child.grade, educationStage: child.education_stage, products: [] }]));
  for (const selection of selections) byChild.get(selection.draft_child_id)?.products.push({ title: selection.title_snapshot, productType: selection.product_type, serviceMode: selection.service_mode, quantity: 1, saleGrossMinor: Number(selection.sale_gross_minor), currency: selection.currency });
  return { kind: "FAMILY_OFFER", familyOfferId: offer.id, familyOfferRevisionNumber: Number(revision.revision_number), packageId: null, packageVersionId: null, title: offer.title, subtitle: "Aile teklifi", priceMinor: Number(pricing.finalFamilyPriceMinor || 0), currency: pricing.currency || "TRY", shippingFeeMinor: 0, requiresShipping: Number(pricing.shippingMinor || 0) > 0, bookCount: Number(pricing.bookCount || 0), components: [...byChild.values()].flatMap((child) => child.products.map((product) => ({ ...product, childProfileId: child.childProfileId, childName: `${child.firstName} ${child.lastName}` }))), familyChildren: [...byChild.values()], normalTotalMinor: Number(pricing.normalTotalMinor || 0), finalFamilyPriceMinor: Number(pricing.finalFamilyPriceMinor || 0), shippingMinor: Number(pricing.shippingMinor || 0), totalMinor: Number(pricing.payablePreviewMinor ?? Number(pricing.finalFamilyPriceMinor || 0) + Number(pricing.shippingMinor || 0)) };
}

function addressSnapshot(input) {
  const address = input && typeof input === "object" ? input : {};
  const value = { firstName: String(address.firstName || "").trim(), lastName: String(address.lastName || "").trim(), phone: String(address.phone || "").trim(), city: String(address.city || "").trim(), district: String(address.district || "").trim(), neighborhood: String(address.neighborhood || "").trim(), addressLine: String(address.addressLine || "").trim(), postalCode: String(address.postalCode || "").trim() };
  if ([value.firstName, value.lastName, value.phone, value.city, value.district, value.addressLine].some((item) => !item)) throw error("SHIPPING_ADDRESS_REQUIRED");
  return value;
}

function billingSnapshot(input, shippingAddress, displayName = "", requireDigitalPaytrContact = false) {
  const billing = input && typeof input === "object" ? input : {};
  const type = String(billing.type || "INDIVIDUAL").toUpperCase();
  if (!['INDIVIDUAL', 'CORPORATE'].includes(type)) throw error("BILLING_TYPE_INVALID");
  // Digital-only PayTR orders have no shipping address, but PayTR requires a
  // persisted name, phone and address. Do not fabricate a physical delivery.
  const paytrContact = requireDigitalPaytrContact ? {
    firstName: String(billing.firstName || "").trim(),
    lastName: String(billing.lastName || "").trim(),
    phone: String(billing.phone || "").trim(),
    addressLine: String(billing.addressLine || "").trim(),
  } : null;
  if (paytrContact) {
    const phoneDigits = paytrContact.phone.replace(/\D/gu, "");
    if (!paytrContact.firstName || !paytrContact.lastName || phoneDigits.length < 10 || phoneDigits.length > 15 || paytrContact.phone.length > 20 || !paytrContact.addressLine || paytrContact.addressLine.length > 400 || (paytrContact.firstName + " " + paytrContact.lastName).length > 60) throw error("PAYTR_CUSTOMER_INFO_REQUIRED", 422);
  }
  if (type === "CORPORATE") {
    const value = { type, companyName: String(billing.companyName || "").trim(), taxOffice: String(billing.taxOffice || "").trim(), taxNumber: String(billing.taxNumber || "").trim(), sameAsShipping: Boolean(billing.sameAsShipping) };
    if (!value.companyName || !value.taxOffice || !value.taxNumber) throw error("CORPORATE_BILLING_REQUIRED");
    return paytrContact ? { ...value, ...paytrContact } : value;
  }
  const nameParts = String(displayName || "").trim().split(/\s+/u).filter(Boolean);
  const value = { type, firstName: String(billing.firstName || (billing.sameAsShipping ? shippingAddress?.firstName : "") || nameParts[0] || "").trim(), lastName: String(billing.lastName || (billing.sameAsShipping ? shippingAddress?.lastName : "") || nameParts.slice(1).join(" ") || "").trim(), identityNumber: String(billing.identityNumber || "").trim(), sameAsShipping: Boolean(billing.sameAsShipping) };
  if (!value.firstName || !value.lastName) throw error("INDIVIDUAL_BILLING_REQUIRED");
  return paytrContact ? { ...value, ...paytrContact } : value;
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
  if (cart.items.some((item) => item.kind === "FAMILY_OFFER")) throw error("FAMILY_OFFER_CHECKOUT_UNAVAILABLE", 409);
  if (input?.legalAcceptance?.preInformation !== true || input?.legalAcceptance?.distanceSales !== true || input?.legalAcceptance?.privacy !== true) throw error("LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED", 400);
  // Shipping VAT is never inferred from a package/product rate. A current
  // Owner-approved SHIPPING decision is required before a physical sale.
  const shippingVatDecision = cart.requiresShipping ? await readEffectiveVatDecision(client, "SHIPPING") : null;
  if (cart.requiresShipping && (!shippingVatDecision || shippingVatDecision.vatRateBps == null)) throw error("SHIPPING_VAT_RATE_REQUIRED", 409);
  const shippingVatRateBps = shippingVatDecision?.vatRateBps == null ? 0 : Number(shippingVatDecision.vatRateBps);
  const shippingVatMinor = cart.requiresShipping ? Math.round(Number(cart.shippingMinor || 0) * shippingVatRateBps / (10000 + shippingVatRateBps)) : 0;
  const shippingNetMinor = Number(cart.shippingMinor || 0) - shippingVatMinor;
  if (cart.items.some((item) => item.components.some((component) => component.vatRateBps == null))) throw error("PACKAGE_VAT_RATE_REQUIRED", 409);
  const legalCodes = ["PRE_INFO", "DISTANCE", "KVKK", ...(cart.requiresShipping ? ["DELIVERY"] : []), ...(input?.legalAcceptance?.commencement === true ? ["DIGITAL"] : [])];
  const publishedLegalDocuments = await readPublishedLegalDocuments(client, legalCodes);
  const owned = (await client.query(`select package_version_id from package_entitlements where beneficiary_student_user_id=$1 and ${accountMode ? "beneficiary_student_profile_id is null and beneficiary_child_profile_id is null" : "(($3::uuid is null and beneficiary_child_profile_id is null) or beneficiary_child_profile_id=$3)"} and status='ACTIVE' and package_version_id=any($2::uuid[])`, accountMode ? [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId)] : [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId), cart.beneficiary.childProfileId || null])).rows;
  if (owned.length) throw error("PACKAGE_ALREADY_OWNED", 409);
  const pending = (await client.query(`select distinct oi.package_version_id from orders o join order_items oi on oi.order_id=o.id where o.beneficiary_student_user_id=$1 and ${accountMode ? "o.beneficiary_student_profile_id is null and o.beneficiary_child_profile_id is null" : "(($3::uuid is null and o.beneficiary_child_profile_id is null) or o.beneficiary_child_profile_id=$3)"} and o.status='PENDING_PAYMENT' and oi.package_version_id=any($2::uuid[])`, accountMode ? [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId)] : [cart.beneficiary.studentUserId, cart.items.map((item) => item.packageVersionId), cart.beneficiary.childProfileId || null])).rows;
  if (pending.length) throw error("ORDER_ALREADY_EXISTS", 409);
  const shippingAddress = cart.requiresShipping ? addressSnapshot(input.shippingAddress) : null;
  const billing = billingSnapshot(input.billing, shippingAddress, principal.user?.displayName, paymentMethod === "PAYTR" && !cart.requiresShipping);
  const legalInput = {
    preInformation: input?.legalAcceptance?.preInformation === true,
    distanceSales: input?.legalAcceptance?.distanceSales === true,
    privacy: input?.legalAcceptance?.privacy === true,
    marketing: input?.legalAcceptance?.marketing === true,
    commencement: input?.legalAcceptance?.commencement === true,
  };
  const requestHash = accountMode
    ? sha256({ paymentMethod, accountUserId: principal.user.id, catalogSegments: cart.catalogSegments, packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingAddress, billing, legalInput })
    : sha256({ paymentMethod, studentProfileId: cart.beneficiary.studentProfileId, packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingAddress, billing, legalInput });
  await client.query("begin");
  try {
    const existing = (await client.query("select * from orders where buyer_user_id=$1 and idempotency_key=$2 for update", [principal.user.id, idempotencyKey])).rows[0];
    if (existing) { const legacyHash = sha256({ studentProfileId: cart.beneficiary.studentProfileId, packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingAddress, billing }); const hashMatches = existing.request_hash === requestHash || (!accountMode && existing.payment_method == null && existing.request_hash === legacyHash); if (!hashMatches) throw error("IDEMPOTENCY_KEY_CONFLICT", 409); await client.query("commit"); return { order: existing, replay: true, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) }; }
    const order = (await client.query(`insert into orders(buyer_user_id,beneficiary_student_user_id,beneficiary_student_profile_id,beneficiary_child_profile_id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,catalog_scope_snapshot,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,$2,$3,$4,'PENDING_PAYMENT',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`, [principal.user.id, cart.beneficiary.studentUserId, cart.beneficiary.studentProfileId || null, cart.beneficiary.childProfileId || null, paymentMethod, cart.currency, cart.subtotalMinor, cart.shippingMinor, cart.totalMinor, "STUDENT_COMMERCE", shippingAddress ? JSON.stringify(shippingAddress) : null, JSON.stringify(billing), idempotencyKey, requestHash])).rows[0];
    let listGrossTotal = 0; let saleGrossTotal = 0; let discountTotal = 0; let vatNetTotal = shippingNetMinor; let vatTotal = shippingVatMinor; const itemVatRates = new Set();
    for (const item of cart.items) {
      const listGrossMinor = item.components.reduce((sum, component) => sum + Number(component.listGrossMinor || 0) * (component.pricingSnapshot ? 1 : Number(component.quantity || 1)), 0) || item.priceMinor;
      const saleGrossMinor = item.priceMinor;
      const discountMinor = Math.max(0, listGrossMinor - saleGrossMinor);
      const lineBreakdown = item.components.map((component) => {
        const amountFactor = component.pricingSnapshot ? 1 : Number(component.quantity || 1);
        const gross = Number(component.saleGrossMinor ?? component.listGrossMinor ?? 0) * amountFactor;
        const lineVatRate = Number(component.vatRateBps);
        const lineVat = component.vatMinor == null ? Math.round(gross * lineVatRate / (10000 + lineVatRate)) : Number(component.vatMinor) * amountFactor;
        const lineNet = component.netMinor == null ? gross - lineVat : Number(component.netMinor) * amountFactor;
        return { component, gross, lineVatRate, lineVat, lineNet };
      });
      const componentGrossTotal = lineBreakdown.reduce((sum, line) => sum + line.gross, 0);
      if (componentGrossTotal !== saleGrossMinor) throw error("PACKAGE_COMPONENT_TOTAL_MISMATCH", 409);
      const vatMinor = lineBreakdown.reduce((sum, line) => sum + line.lineVat, 0);
      const netMinor = saleGrossMinor - vatMinor;
      const rates = new Set(lineBreakdown.map((line) => line.lineVatRate));
      const vatRateBps = rates.size === 1 ? [...rates][0] : null;
      if (vatRateBps != null) itemVatRates.add(vatRateBps);
      listGrossTotal += listGrossMinor; saleGrossTotal += saleGrossMinor; discountTotal += discountMinor; vatNetTotal += netMinor; vatTotal += vatMinor;
	      const definitions = Array.isArray(item.entitlementDefinitions) ? item.entitlementDefinitions : [];
	      const deliveryModes = [...new Set(definitions.map((definition) => String(definition.deliveryMode || "").toUpperCase()).filter(Boolean))];
	      const deliveryMode = deliveryModes.length === 1 ? deliveryModes[0] : definitions.length ? "HYBRID" : "SELF_PACED";
	      const itemRow = (await client.query(`insert into order_items(order_id,package_id,package_version_id,beneficiary_child_profile_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,list_gross_minor,sale_gross_minor,discount_minor,discount_percent_bps,vat_net_minor,vat_minor,vat_rate_bps,currency,quantity,entitlement_definitions_snapshot,components_snapshot_json) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16,$17,1,$18,$19) returning id`, [order.id, item.packageId, item.packageVersionId, item.beneficiary.childProfileId || null, item.title, item.description, item.versionNumber, deliveryMode, saleGrossMinor, listGrossMinor, saleGrossMinor, discountMinor, listGrossMinor ? Math.round(discountMinor * 10000 / listGrossMinor) : 0, netMinor, vatMinor, vatRateBps, item.currency, JSON.stringify(definitions), JSON.stringify(item.components)])).rows[0];
      for (const [lineOrder, line] of lineBreakdown.entries()) {
        const { component, gross, lineVatRate, lineVat, lineNet } = line;
        const amountFactor = component.pricingSnapshot ? 1 : Number(component.quantity || 1);
        const lineListGross = Number(component.listGrossMinor ?? gross) * amountFactor;
        await client.query(`insert into r6_order_component_snapshots(order_item_id,package_component_id,physical_product_id,product_type,education_stage,sku_snapshot,title_snapshot,quantity,list_gross_minor,sale_gross_minor,discount_minor,vat_rate_bps,net_minor,vat_minor,gross_minor,beneficiary_child_profile_id,line_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$10,$15,$16) on conflict(order_item_id,line_order) do nothing`, [itemRow.id, component.packageComponentId || null, component.productId || null, component.productType || "UNKNOWN", component.educationStage || null, component.sku || null, component.title || item.title, Number(component.quantity || 1), lineListGross, gross, Math.max(0, lineListGross - gross), lineVatRate, lineNet, lineVat, item.beneficiary.childProfileId || null, lineOrder]);
      }
    }
    const orderVatRateBps = itemVatRates.size === 1 ? [...itemVatRates][0] : null;
    await client.query("update orders set list_gross_minor=$1,sale_gross_minor=$2,discount_minor=$3,discount_percent_bps=$4,vat_net_minor=$5,vat_minor=$6,vat_rate_bps=$7,updated_at=now() where id=$8", [listGrossTotal, saleGrossTotal, discountTotal, listGrossTotal ? Math.round(discountTotal * 10000 / listGrossTotal) : 0, vatNetTotal, vatTotal, orderVatRateBps, order.id]);
    Object.assign(order, { list_gross_minor: listGrossTotal, sale_gross_minor: saleGrossTotal, discount_minor: discountTotal, discount_percent_bps: listGrossTotal ? Math.round(discountTotal * 10000 / listGrossTotal) : 0, vat_net_minor: vatNetTotal, vat_minor: vatTotal, vat_rate_bps: orderVatRateBps });
    const legalEvidence = studentLegalAcceptance(input.legalAcceptance, {
      order,
      buyer: { userId: principal.user.id, name: principal.user.displayName || "", email: principal.user.email || "", beneficiaryStudentUserId: cart.beneficiary.studentUserId, beneficiaryStudentProfileId: cart.beneficiary.studentProfileId || null, beneficiaryChildProfileId: cart.beneficiary.childProfileId || null },
      items: cart.items.map((item) => ({ packageVersionId: item.packageVersionId, title: item.title, totalMinor: item.priceMinor, currency: item.currency })),
      requiresShipping: cart.requiresShipping,
      documents: publishedLegalDocuments || undefined,
    });
    if (publishedLegalDocuments) {
      const acceptanceByCode = { PRE_INFO: "PRE_INFORMATION", DISTANCE: "DISTANCE_SALES", KVKK: "PRIVACY", DELIVERY: "PRE_INFORMATION", DIGITAL: "DIGITAL_COMMENCEMENT" };
      for (const snapshot of legalSnapshotRows(publishedLegalDocuments, acceptanceByCode)) {
        await client.query("insert into order_legal_snapshots(order_id,document_key,document_version_id,document_version_number,document_status,content_sha256,markdown,acceptance_type,accepted_by,metadata_json) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [order.id, snapshot.documentKey, snapshot.documentVersionId, snapshot.documentVersionNumber, snapshot.documentStatus, snapshot.contentSha256, snapshot.markdown, snapshot.acceptanceType, principal.user.id, JSON.stringify({ source: "DB_PUBLISHED_LEGAL_DOCUMENT", legalAcceptance: legalInput, orderId: order.id, acceptedAt: legalEvidence.acceptedAt, snapshotSha256: legalEvidence.snapshotSha256, buyer: legalEvidence.buyer, order: legalEvidence.order })]);
      }
    }
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'student.commerce.legal.accepted','order',$2,'SUCCESS',$3,$4)", [principal.user.id, order.id, crypto.randomUUID(), JSON.stringify(legalEvidence)]);
    const paymentIntent = (await client.query("insert into payment_intents(order_id,status,provider,amount_minor,currency,idempotency_key) values($1,'CREATED',null,$2,$3,$4) returning *", [order.id, order.total_minor, order.currency, `PAYMENT_INTENT:${order.id}`])).rows[0];
    if (accountMode) {
      await client.query("delete from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id is null and beneficiary_child_profile_id is null", [principal.user.id]);
    } else {
      await client.query("delete from student_cart_items where buyer_user_id=$1 and beneficiary_student_profile_id=$2 and (($3::uuid is null and beneficiary_child_profile_id is null) or beneficiary_child_profile_id=$3)", [principal.user.id, cart.beneficiary.studentProfileId, cart.beneficiary.childProfileId || null]);
    }
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'student_commerce.order.created','order',$2,'SUCCESS',$3,$4)", [principal.user.id, order.id, crypto.randomUUID(), JSON.stringify({ packageVersionIds: cart.items.map((item) => item.packageVersionId), shippingMinor: cart.shippingMinor, shippingVatRateBps, shippingVatMinor, shippingNetMinor, requiresShipping: cart.requiresShipping, paymentMethod })]);
    await client.query("commit"); return { order, paymentIntent, replay: false, providerConfigured: Boolean(process.env.PAYMENT_PROVIDER) };
  } catch (cause) { try { await client.query("rollback"); } catch { /* preserve */ } throw cause; }
}
