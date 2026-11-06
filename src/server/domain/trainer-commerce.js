/* global process */
import { legalSnapshotRows, readPublishedLegalDocuments, trainerLegalAcceptance } from "./trainer-legal-documents.js";
import crypto from "node:crypto";
import { effectiveTrainerQualificationPredicate } from "./trainer-expertise.js";
// grantTrainerOrderExpertise remains a completion-only compatibility helper;
// payment settlement intentionally does not invoke it.
import { readEffectiveVatDecision } from "./commerce.js";
import { queuePanelNotification, queueRolePanelNotifications } from "./panel-notifications.js";

export const TRAINER_COMMERCE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PENDING_STATUSES = ["PENDING_PAYMENT", "PAYMENT_REVIEW"];
// H5CI: original Owner editor historical text. PREVIEW ONLY in isolated H5BU. Not persisted package content.
const H5CI_OWNER_HISTORICAL_PREVIEW = Object.freeze({"ilkokul-akici-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","İlkokul Akıcı ve Hızlı Okuma Kitabı","İlkokul Zihin Egzersizleri Kitabı.","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"ortaokul-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Ortaokul Hızlı Okuma Kitabı","Ortaokul Zihin Egzersizleri Kitabı.","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"lise-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Lise Hızlı Okuma Kitabı","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"yetiskin-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Yetişkin Hızlı Okuma Kitabı","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"ortaokul-lise-yetiskin-hizli-okuma-egitimi":["3 Eğitim İçin Canlı ve video ile Profesyonel Eğitmen Eğitimi","Ortaokul Hızlı Okuma Kitabı","Ortaokul Zihin Egzersizleri Kitabı.","Lise Hızlı Okuma Kitabı","Yetişkin Hızlı Okuma Kitabı","Ortaokul, Lise ve Yetişkin Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","3 Eğitim için Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Ortaokul paragraf kitabı","E Devlet kayıtlı Üniversite onaylı paragraf Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Lise paragraf kitabı","E Devlet kayıtlı Üniversite onaylı paragraf Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"]});

const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const text = (value, max = 500) => String(value || "").trim().slice(0, max);
const money = (value, code) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw fail(code);
  return number;
};
const json = (value, fallback) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
export const trainerCommerceHash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function assertTrainerPrincipal(principal) {
  if (!principal?.user || !principal.memberships?.some((membership) => membership.role === "TRAINER")) throw fail("FORBIDDEN", 403);
  return principal.user;
}

export async function readTrainerCatalog(client, trainerUserId) {
  const rows = (await client.query(`
    select p.id as "packageId",p.slug,p.status as "packageStatus",p.panel_visible as "panelVisible",p.public_web_visible as "publicWebVisible",p.icon_reference as "iconReference",p.physical_product as "physicalProduct",p.shipping_policy as "shippingPolicy",p.shipping_price_minor as "shippingPriceMinor",
      pv.id as "packageVersionId",pv.version_number as "versionNumber",pv.title,pv.description,pv.short_description as "shortDescription",pv.features_json as "featuresJson",pv.sku,pv.invoice_product_code as "invoiceProductCode",pv.invoice_product_name as "invoiceProductName",pv.invoice_description as "invoiceDescription",pv.unit,pv.vat_rate_bps as "vatRateBps",coalesce(pv.price_gross_minor,pv.price_minor) as "priceGrossMinor",pv.price_net_minor as "priceNetMinor",pv.currency,pv.purchase_enabled as "purchaseEnabled",
      e.id as "entitlementId",e.status as "entitlementStatus",e.source as "entitlementSource",o.id as "pendingOrderId",o.status as "pendingOrderStatus",c.id as "cartItemId",
       (exists(select 1 from r6_trainer_package_qualification_map m where m.package_version_id=pv.id)
       and not exists(select 1 from r6_trainer_package_qualification_map m where m.package_version_id=pv.id
         and not exists(select 1 from r6_trainer_qualification_grants g where g.trainer_user_id=$1 and g.qualification_id=m.qualification_id and ${effectiveTrainerQualificationPredicate("g")}))) as "expertiseActive",
      coalesce((select json_agg(json_build_object('componentType',pc.component_type,'title',coalesce(nullif(pc.display_label,''),nullif(prod.title,''),nullif(pc.title_snapshot,''),'Paket bileşeni'),'quantity',pc.quantity,'displayOrder',pc.display_order,'imageReference',prod.image_reference,'sku',prod.sku,'productType',prod.product_type,'physicalProductId',coalesce(pc.physical_product_id,pc.reference_id),'listGrossMinor',prod.list_gross_minor) order by pc.display_order,pc.id) from package_components pc left join physical_products prod on prod.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active), '[]') as components
    from packages p join package_versions pv on pv.package_id=p.id
    left join lateral (select e1.id,e1.status,e1.source from trainer_package_entitlements e1 where e1.trainer_user_id=$1 and e1.package_id=p.id order by case when e1.status='ACTIVE' then 0 else 1 end,e1.effective_at desc limit 1) e on true
    left join lateral (select o1.id,o1.status from trainer_package_orders o1 join trainer_package_order_items oi on oi.order_id=o1.id where o1.trainer_user_id=$1 and oi.package_id=p.id and o1.status=any($2::trainer_order_status[]) order by o1.created_at desc limit 1) o on true
    left join trainer_cart_items c on c.trainer_user_id=$1 and c.package_version_id=pv.id
    where p.audience='TRAINER' and p.catalog_scope in ('TRAINER_COMMERCE','LEGACY_EDUCATION') and p.panel_visible=true and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true
    order by pv.version_number desc,p.slug
  `, [trainerUserId, PENDING_STATUSES])).rows;
  // H5CG: Only the explicitly isolated local review clone may inspect draft text
  // as a preview fallback. Never surface unpublished draft text on Owner/production.
  const dbName = (await client.query("select current_database() as name")).rows[0]?.name;
  const previewDraftContent = dbName === "fixoku_h5bu_tmp_20261103_034651" &&
    process.env.NODE_ENV !== "production";
  const packages = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.packageId)) continue;
    seen.add(row.packageId);
    const owned = row.entitlementStatus === "ACTIVE";
    const activeComponents = Array.isArray(row.components) ? row.components : json(row.components, []);
    const textItems = activeComponents.filter((part) => part.componentType === "TEXT_ITEM" && String(part.title || "").trim()).map((part) => String(part.title).trim());
    const legacyFeatures = Array.isArray(row.featuresJson) ? row.featuresJson : json(row.featuresJson, []);
    let contentItems = textItems;
    let contentSource = textItems.length ? "PUBLISHED_TEXT_ITEMS" : "MISSING";
    if (!contentItems.length && previewDraftContent) {
      // Read-only preview of original Owner-authored TEXT_ITEMs in a different
      // version of the same package. Do not copy/mutate draft records.
      const source = (await client.query(`
        select pv2.id from package_versions pv2
        where pv2.package_id=$1 and pv2.id<>$2
          and exists (select 1 from package_components c
                      where c.package_version_id=pv2.id and c.is_active=true
                        and c.component_type='TEXT_ITEM' and trim(coalesce(c.title_snapshot,c.display_label,''))<>'')
        order by pv2.version_number desc limit 1`, [row.packageId, row.packageVersionId])).rows[0];
      if (source) {
        const records = (await client.query(`
          select coalesce(nullif(pc.display_label,''),nullif(pc.title_snapshot,''),'') as title
          from package_components pc where pc.package_version_id=$1 and pc.is_active=true
            and pc.component_type='TEXT_ITEM'
          order by pc.display_order,pc.id`,[source.id])).rows;
        contentItems = records.map(item=>String(item.title||'').trim()).filter(Boolean);
        if (contentItems.length) contentSource="ISOLATED_OWNER_VERSION_PREVIEW";
      }
    }
    if (!contentItems.length && Array.isArray(legacyFeatures)) {
      contentItems = legacyFeatures.filter(item=>typeof item === 'string' && item.trim());
      if (contentItems.length) contentSource="LEGACY_FEATURES";
    }
    // This legacy fallback is visible only in the explicitly isolated local test DB.
    // Owner currently stages these historical items in browser memory, not in package_components.
    // Never represent this as saved/published content and never expose it in production.
    if (!contentItems.length && previewDraftContent) {
      const previewItems = H5CI_OWNER_HISTORICAL_PREVIEW[row.slug];
      if (Array.isArray(previewItems) && previewItems.length) {
        contentItems = [...previewItems];
        contentSource = "HISTORICAL_OWNER_EDITOR_PREVIEW_NOT_SAVED";
      }
    }
    // H5CI: server-calculated gross catalogue total, using the very same
    // linked physical_products prices as the read-only H5CH SQL check.
    // The UI cannot silently hide both discounts due to missing client-side metadata.
    const priced = activeComponents.filter((part) => part.componentType !== "TEXT_ITEM");
    const grossValues = priced.map((part) => {
      const unit = Number(part.listGrossMinor);
      const quantity = Number(part.quantity);
      return Number.isSafeInteger(unit) && unit > 0 && Number.isSafeInteger(quantity) && quantity > 0
        ? unit * quantity : null;
    });
    const catalogGrossMinor = priced.length && grossValues.every((value) => value !== null && Number.isSafeInteger(value))
      ? grossValues.reduce((total, value) => total + value, 0) : null;
    // Read the linked educational program's persisted presentation video metadata.
    // No unverifiable default, no video count guessed from package title.
    const videoRows = (await client.query(`
      select distinct pres.id, pres.video_count
      from package_entitlement_definitions def
      join presentations pres on pres.training_program_id=def.training_program_id
      where def.package_version_id=$1 and pres.status='PUBLISHED'
        and pres.video_count ~ '^[0-9]+$'`, [row.packageVersionId])).rows;
    const videoValues = videoRows.map(x=>Number(x.video_count));
    const verifiedVideoCount = videoValues.length && videoValues.every(Number.isSafeInteger)
      ? videoValues.reduce((sum,n)=>sum+n,0) : null;
    packages.push({ ...row, contentSource, catalogGrossMinor, verifiedVideoCount, priceGrossMinor: Number(row.priceGrossMinor || 0), priceNetMinor: row.priceNetMinor == null ? null : Number(row.priceNetMinor), shippingPriceMinor: Number(row.shippingPriceMinor || 0), features: legacyFeatures, contentItems, components: activeComponents.filter((part) => part.componentType !== "TEXT_ITEM"), accessState: owned ? "OWNED" : row.pendingOrderId ? "PENDING_PAYMENT" : "AVAILABLE", inCart: Boolean(row.cartItemId) });
  }
  return packages;
}

export async function addTrainerCartItem(client, trainerUserId, packageVersionId) {
  if (!TRAINER_COMMERCE_UUID.test(String(packageVersionId || ""))) throw fail("INVALID_PACKAGE_VERSION_ID");
  await client.query("begin");
  try {
    const row = (await client.query(`select p.id as package_id,p.audience,p.catalog_scope,p.status,pv.status as version_status,pv.purchase_enabled from packages p join package_versions pv on pv.package_id=p.id where pv.id=$1 for update`, [packageVersionId])).rows[0];
    if (!row || row.audience !== "TRAINER" || !["TRAINER_COMMERCE", "LEGACY_EDUCATION"].includes(row.catalog_scope) || row.status !== "PUBLISHED" || row.version_status !== "PUBLISHED" || !row.purchase_enabled) throw fail("PACKAGE_UNAVAILABLE", 409);
    if ((await client.query("select 1 from trainer_package_entitlements where trainer_user_id=$1 and package_id=$2 and status='ACTIVE'", [trainerUserId, row.package_id])).rowCount) throw fail("PACKAGE_ALREADY_OWNED", 409);
    if ((await client.query("select 1 from trainer_package_orders o join trainer_package_order_items oi on oi.order_id=o.id where o.trainer_user_id=$1 and oi.package_id=$2 and o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW')", [trainerUserId, row.package_id])).rowCount) throw fail("ORDER_ALREADY_EXISTS", 409);
    const inserted = (await client.query("insert into trainer_cart_items(trainer_user_id,package_version_id,quantity) values($1,$2,1) on conflict(trainer_user_id,package_version_id) do nothing returning id", [trainerUserId, packageVersionId])).rows[0];
    if (!inserted) throw fail("PACKAGE_ALREADY_IN_CART", 409);
    await client.query("commit"); return inserted;
  } catch (error) { await client.query("rollback"); throw error; }
}

export async function readTrainerCart(client, trainerUserId) {
  const rows = (await client.query(`select c.id,p.id as "packageId",pv.id as "packageVersionId",pv.title,pv.short_description as "shortDescription",pv.features_json as "featuresJson",pv.sku,coalesce(pv.price_gross_minor,pv.price_minor) as "priceGrossMinor",pv.price_net_minor as "priceNetMinor",pv.vat_rate_bps as "vatRateBps",pv.currency,p.shipping_policy as "shippingPolicy",p.shipping_price_minor as "shippingPriceMinor",p.icon_reference as "iconReference",coalesce((select sum(pc.quantity)::int from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active=true and pc.component_type='PHYSICAL_PRODUCT' and pp.r6_product_type='BOOK'),0) as "bookCount",coalesce((select json_agg(json_build_object('componentId',pc.id,'sku',pp.sku,'title',pp.title,'quantity',pc.quantity,'imageReference',pp.image_reference) order by pc.display_order,pc.id) from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active=true and pc.component_type='PHYSICAL_PRODUCT' and pp.product_type='PHYSICAL'),'[]') as "physicalItems",coalesce((select json_agg(json_build_object('componentId',pc.id,'componentType',pc.component_type,'sku',pp.sku,'title',coalesce(nullif(pc.display_label,''),nullif(pp.title,''),nullif(pc.title_snapshot,''),'Paket bileşeni'),'quantity',pc.quantity,'imageReference',pp.image_reference,'productType',pp.product_type) order by pc.display_order,pc.id) from package_components pc left join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active=true),'[]') as "includedItems" from trainer_cart_items c join package_versions pv on pv.id=c.package_version_id join packages p on p.id=pv.package_id where c.trainer_user_id=$1 and p.audience='TRAINER' and p.catalog_scope in ('TRAINER_COMMERCE','LEGACY_EDUCATION') and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true order by c.created_at`, [trainerUserId])).rows.map((row) => ({ ...row, priceGrossMinor: Number(row.priceGrossMinor || 0), priceNetMinor: row.priceNetMinor == null ? null : Number(row.priceNetMinor), shippingPriceMinor: Number(row.shippingPriceMinor || 0), bookCount: Number(row.bookCount || 0), physicalItems: typeof row.physicalItems === "string" ? json(row.physicalItems, []) : (row.physicalItems || []), contentItems: [], includedItems: typeof row.includedItems === "string" ? json(row.includedItems, []) : (row.includedItems || []), quantity: 1 }));
  for (const item of rows) {
    const componentTexts = item.includedItems.filter((part) => part.componentType === "TEXT_ITEM" && String(part.title || "").trim()).map((part) => String(part.title).trim());
    const fallback = Array.isArray(item.featuresJson) ? item.featuresJson : json(item.featuresJson, []);
    item.contentItems = componentTexts.length ? componentTexts : fallback;
    item.includedItems = item.includedItems.filter((part) => part.componentType !== "TEXT_ITEM");
    delete item.featuresJson;
  }
  const subtotalMinor = rows.reduce((sum, row) => sum + row.priceGrossMinor, 0);
  const shippingMinor = 0; // Trainer packages: FIXOKU covers shipping for included books.
  return { items: rows, subtotalMinor, shippingMinor, totalMinor: subtotalMinor + shippingMinor, uniqueCount: rows.length };
}

function addressSnapshot(input) {
  const required = ["firstName", "lastName", "phone", "title", "city", "district", "addressLine"];
  const next = Object.fromEntries(required.map((key) => [key, text(input?.[key], 300)]));
  if (required.some((key) => !next[key])) throw fail("SHIPPING_ADDRESS_REQUIRED");
  next.neighborhood = text(input?.neighborhood, 180) || null; next.postalCode = text(input?.postalCode, 32) || null;
  return next;
}

function billingSnapshot(input, shipping) {
  const type = String(input?.type || "INDIVIDUAL").toUpperCase();
  if (!['INDIVIDUAL', 'CORPORATE'].includes(type)) throw fail("BILLING_TYPE_INVALID");
  if (input?.sameAsShipping) {
    const identity = type === "CORPORATE" ? { companyName: text(input.companyName, 300), taxOffice: text(input.taxOffice, 180), taxNumber: text(input.taxNumber, 32) } : { firstName: shipping.firstName, lastName: shipping.lastName, identityNumber: text(input.identityNumber, 32) || null };
    if (type === "CORPORATE" && (!identity.companyName || !identity.taxOffice || !identity.taxNumber)) throw fail("CORPORATE_BILLING_REQUIRED");
    return { type, sameAsShipping: true, address: shipping, identity };
  }
  const address = addressSnapshot(input?.address || {});
  const identity = type === "CORPORATE" ? { companyName: text(input.companyName, 300), taxOffice: text(input.taxOffice, 180), taxNumber: text(input.taxNumber, 32) } : { firstName: text(input.firstName, 180), lastName: text(input.lastName, 180), identityNumber: text(input.identityNumber, 32) || null };
  if (type === "CORPORATE" && (!identity.companyName || !identity.taxOffice || !identity.taxNumber)) throw fail("CORPORATE_BILLING_REQUIRED");
  if (type === "INDIVIDUAL" && (!identity.firstName || !identity.lastName)) throw fail("INDIVIDUAL_BILLING_REQUIRED");
  return { type, sameAsShipping: false, address, identity };
}

export async function createTrainerOrder(client, principal, input) {
  const trainerUserId = (await assertTrainerPrincipal(principal)).id;
  const paymentMethod = String(input?.paymentMethod || "").toUpperCase();
  if (!['PAYTR', 'BANK_TRANSFER'].includes(paymentMethod)) throw fail("PAYMENT_METHOD_INVALID");
  const idempotencyKey = text(input?.idempotencyKey, 160); if (!idempotencyKey) throw fail("IDEMPOTENCY_KEY_REQUIRED");
  const customOfferId = input?.customOfferId ? String(input.customOfferId) : null;
  const shipping = addressSnapshot(input?.shippingAddress || {}); const billing = billingSnapshot(input?.billing || {}, shipping);
  await client.query("begin");
  try {
    const existing = (await client.query("select * from trainer_package_orders where trainer_user_id=$1 and idempotency_key=$2 for update", [trainerUserId, idempotencyKey])).rows[0];
    const requestHash = trainerCommerceHash({ paymentMethod, shipping, billing, customOfferId });
    if (existing) { if (existing.request_hash !== requestHash) throw fail("IDEMPOTENCY_KEY_CONFLICT", 409); await client.query("commit"); return { order: existing, replay: true }; }
    const offer = customOfferId ? (await client.query(`select o.id,o.status,o.expires_at,o.customer_user_id,l.id as line_id,l.line_kind,l.package_version_id,l.gross_minor,l.net_minor,l.vat_minor,l.vat_rate_bps,l.discount_minor,l.title_snapshot from r6_custom_offers o join r6_custom_offer_lines l on l.offer_id=o.id where o.id=$1 and o.customer_user_id=$2 and o.status='SENT' and (o.expires_at is null or o.expires_at>now()) order by l.line_order,l.id`, [customOfferId, trainerUserId])).rows : [];
    if (customOfferId && (offer.length !== 1 || offer[0].line_kind !== "PACKAGE")) throw fail("TRAINER_OFFER_NOT_AVAILABLE", 409);
    const cart = (await client.query(`select c.id,p.id as package_id,p.slug,p.audience,p.catalog_scope,p.status as package_status,p.physical_product,p.shipping_policy,p.shipping_price_minor,pv.*,coalesce((select json_agg(json_build_object('productType',pp.r6_product_type,'quantity',pc.quantity)) from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active=true and pc.component_type='PHYSICAL_PRODUCT'),'[]') as shipping_components from trainer_cart_items c join package_versions pv on pv.id=c.package_version_id join packages p on p.id=pv.package_id where c.trainer_user_id=$1 for update`, [trainerUserId])).rows;
    if (!cart.length) throw fail("CART_EMPTY", 409);
    if (offer.length && !cart.some((row) => String(row.id) === String(offer[0].package_version_id))) throw fail("TRAINER_OFFER_PACKAGE_REQUIRED", 409);
    // Use the same audience/scope and publication rules as addTrainerCartItem and readTrainerCatalog.
    // isTrainerPackageDomain is a classifier, not an additional sale authorization gate.
    const invalidCartRows = cart.filter(row => row.audience !== "TRAINER" || !["TRAINER_COMMERCE", "LEGACY_EDUCATION"].includes(row.catalog_scope) || row.package_status !== "PUBLISHED" || row.status !== "PUBLISHED" || row.purchase_enabled !== true);
    if (invalidCartRows.length) throw fail("PACKAGE_UNAVAILABLE", 409);
    const packageIds = cart.map((row) => row.package_id);
    if ((await client.query("select 1 from trainer_package_entitlements where trainer_user_id=$1 and package_id=any($2::uuid[]) and status='ACTIVE' limit 1", [trainerUserId, packageIds])).rowCount) throw fail("PACKAGE_ALREADY_OWNED", 409);
    if ((await client.query("select 1 from trainer_package_orders o join trainer_package_order_items oi on oi.order_id=o.id where o.trainer_user_id=$1 and oi.package_id=any($2::uuid[]) and o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW') limit 1", [trainerUserId, packageIds])).rowCount) throw fail("ORDER_ALREADY_EXISTS", 409);
    const cartShippingMinor = 0; // Trainer package books ship free; standalone book shipping is separate.
    // Shipping VAT is never inferred from a package/product rate. A current
    // Owner-approved SHIPPING decision is required before a physical sale.
    const shippingVatDecision = cartShippingMinor > 0 ? await readEffectiveVatDecision(client, "SHIPPING") : null;
    if (cartShippingMinor > 0 && (!shippingVatDecision || shippingVatDecision.vatRateBps == null)) throw fail("SHIPPING_VAT_RATE_REQUIRED", 409);
    const shippingVatRateBps = shippingVatDecision?.vatRateBps == null ? 0 : Number(shippingVatDecision.vatRateBps);
    const shippingVatMinor = cartShippingMinor > 0 ? Math.round(cartShippingMinor * shippingVatRateBps / (10000 + shippingVatRateBps)) : 0;
    const shippingNetMinor = cartShippingMinor - shippingVatMinor;
    const publishedLegalDocuments = await readPublishedLegalDocuments(client, ["PRE_INFO", "DISTANCE"]);
    const snapshots = cart.map((row, index) => {
      if (row.vat_rate_bps == null) throw fail("PACKAGE_VAT_RATE_REQUIRED", 409);
      const vat = Number(row.vat_rate_bps);
      if (!Number.isSafeInteger(vat) || vat < 0 || vat > 10000) throw fail("PACKAGE_VAT_RATE_REQUIRED", 409);
      const offerLine = offer.find((line) => String(line.package_version_id) === String(row.id));
      const gross = offerLine ? money(offerLine.gross_minor, "OFFER_PRICE_INVALID") : money(row.price_gross_minor ?? row.price_minor, "PACKAGE_PRICE_INVALID");
      const net = offerLine ? money(offerLine.net_minor, "OFFER_PRICE_INVALID") : (row.price_net_minor == null ? Math.floor(gross * 10000 / (10000 + vat)) : money(row.price_net_minor, "PACKAGE_PRICE_INVALID"));
      const lineVat = offerLine ? money(offerLine.vat_minor, "OFFER_PRICE_INVALID") : gross - net;
      const discountMinor = offerLine ? money(offerLine.discount_minor, "OFFER_DISCOUNT_INVALID") : 0;
      const shippingMinor = index === 0 ? cartShippingMinor : 0;
      return { row, gross, net, vat: offerLine ? Number(offerLine.vat_rate_bps) : vat, lineVat, discountMinor, shippingMinor, total: gross + shippingMinor, offerLine };
    });
    const subtotalMinor = snapshots.reduce((sum, item) => sum + item.gross, 0); const discountMinor = snapshots.reduce((sum, item) => sum + item.discountMinor, 0); const shippingMinor = cartShippingMinor; const taxMinor = snapshots.reduce((sum, item) => sum + item.lineVat, 0) + shippingVatMinor; const totalMinor = subtotalMinor + shippingMinor;
    const order = (await client.query(`insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,invoice_status,idempotency_key,request_hash) values($1,$2,$3,'TRY',$4,$5,$6,$7,$8,$9,$10,'PENDING',$11,$12) returning *`, [trainerUserId, paymentMethod === "BANK_TRANSFER" ? "PAYMENT_REVIEW" : "PENDING_PAYMENT", paymentMethod, subtotalMinor, shippingMinor, discountMinor, taxMinor, totalMinor, JSON.stringify(shipping), JSON.stringify(billing), idempotencyKey, requestHash])).rows[0];
    for (const item of snapshots) {
      const invoiceDescription = item.offerLine ? `${item.row.invoice_description || item.row.description || item.row.title}
[R6_CUSTOM_OFFER_ID:${customOfferId}]` : item.row.invoice_description;
      await client.query(`insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,features_snapshot_json,sku_snapshot,invoice_product_code_snapshot,invoice_product_name_snapshot,invoice_description_snapshot,unit_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,discount_minor,line_total_minor,currency,quantity) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,1)`, [order.id, item.row.package_id, item.row.id, item.row.title, item.row.description, item.row.features_json || "[]", item.row.sku || item.row.slug || `TRAINER-${item.row.package_id}`, item.row.invoice_product_code, item.row.invoice_product_name || item.row.title, invoiceDescription, item.row.unit || "adet", item.vat, item.net, item.gross, item.shippingMinor, item.discountMinor, item.total, item.row.currency || "TRY"]);
    }
    const legalEvidence = trainerLegalAcceptance(input?.legalAcceptance, { order, trainerUserId, email: principal.user.email, shipping, items: snapshots, documents: publishedLegalDocuments || undefined });
    if (publishedLegalDocuments) {
      const acceptanceByCode = { PRE_INFO: "PRE_INFORMATION", DISTANCE: "DISTANCE_SALES" };
      for (const snapshot of legalSnapshotRows(publishedLegalDocuments, acceptanceByCode)) {
        await client.query("insert into trainer_order_legal_snapshots(trainer_order_id,document_key,document_version_id,document_version_number,document_status,content_sha256,markdown,acceptance_type,accepted_by,metadata_json) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [order.id, snapshot.documentKey, snapshot.documentVersionId, snapshot.documentVersionNumber, snapshot.documentStatus, snapshot.contentSha256, snapshot.markdown, snapshot.acceptanceType, trainerUserId, JSON.stringify({ source: "DB_PUBLISHED_LEGAL_DOCUMENT", orderId: order.id, acceptedAt: legalEvidence.acceptedAt, snapshotSha256: legalEvidence.snapshotSha256, buyer: legalEvidence.buyer, purchase: legalEvidence.purchase })]);
      }
    }
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.commerce.legal.accepted','trainer_package_order',$2,'SUCCESS',$3,$4)", [trainerUserId, order.id, crypto.randomUUID(), JSON.stringify(legalEvidence)]);
    await client.query("delete from trainer_cart_items where trainer_user_id=$1", [trainerUserId]);
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.commerce.order.created','trainer_package_order',$2,'SUCCESS',$3,$4)", [trainerUserId, order.id, crypto.randomUUID(), JSON.stringify({ paymentMethod, packageIds, totalMinor, shippingVatRateBps, shippingVatMinor, shippingNetMinor })]);
    await client.query("commit"); return { order, replay: false };
  } catch (error) { await client.query("rollback"); throw error; }
}

export async function fulfillTrainerOrder(client, { orderId, actorUserId, provider, providerReference, amountMinor = undefined, currency = undefined, manageTransaction = true }) {
  if (!TRAINER_COMMERCE_UUID.test(String(orderId || ""))) throw fail("INVALID_ORDER_ID");
  if (manageTransaction) await client.query("begin");
  try {
    const order = (await client.query("select * from trainer_package_orders where id=$1 for update", [orderId])).rows[0]; if (!order) throw fail("ORDER_NOT_FOUND", 404);
    // A PayTR callback must carry the same immutable amount and currency that
    // were captured at checkout.  The callback handler performs the first
    // check, while this domain boundary repeats it so other callers cannot
    // settle a trainer order by providing only an order id.
    if (provider === "PAYTR" && (amountMinor === undefined || currency === undefined)) throw fail("PAYMENT_SETTLEMENT_FACTS_REQUIRED", 409);
    if (amountMinor !== undefined && Number(amountMinor) !== Number(order.total_minor)) throw fail("PAYMENT_AMOUNT_MISMATCH", 409);
    if (currency !== undefined && String(currency).toUpperCase() !== String(order.currency || "").toUpperCase()) throw fail("PAYMENT_CURRENCY_MISMATCH", 409);
    if (provider === "PAYTR" && order.payment_method !== "PAYTR") throw fail("PAYTR_METHOD_REQUIRED", 409);
    if (provider === "BANK_TRANSFER" && order.payment_method !== "BANK_TRANSFER") throw fail("BANK_TRANSFER_METHOD_REQUIRED", 409);
    if (order.status === "PAID") { const materialized = (await client.query("select count(*)::int as count from trainer_order_physical_items poi join trainer_package_order_items oi on oi.id=poi.trainer_package_order_item_id where oi.order_id=$1", [orderId])).rows[0]; if (manageTransaction) await client.query("commit"); return { replay: true, orderStatus: "PAID", physicalItemCount: Number(materialized?.count || 0) }; }
    if (!PENDING_STATUSES.includes(order.status)) throw fail("ORDER_NOT_SETTLEABLE", 409);
    const items = (await client.query("select * from trainer_package_order_items where order_id=$1 order by id", [orderId])).rows;
    const components = [];
    for (const item of items) {
      const rows = (await client.query(`select pc.id as component_id,pc.physical_product_id,pc.quantity,pc.display_label,pc.title_snapshot,pp.sku,pp.title from package_components pc join physical_products pp on pp.id=pc.physical_product_id where pc.package_version_id=$1 and pc.component_type='PHYSICAL_PRODUCT' and pc.is_active=true order by pc.physical_product_id,pc.display_order,pc.id`, [item.package_version_id])).rows;
      for (const row of rows) components.push({ item, ...row, requiredQuantity: Number(row.quantity || 1) * Number(item.quantity || 1) });
      await client.query(`insert into trainer_package_entitlements(trainer_user_id,package_id,package_version_id,status,source,source_order_id,assigned_by) values($1,$2,$3,'ACTIVE','PAYMENT',$4,$5) on conflict(trainer_user_id,package_id) where status='ACTIVE' do nothing`, [order.trainer_user_id, item.package_id, item.package_version_id, order.id, actorUserId]);
    }
    const trainerUser = (await client.query("select id,email from platform_users where id=$1", [order.trainer_user_id])).rows[0];
    const grouped = new Map();
    for (const component of components) grouped.set(component.physical_product_id, (grouped.get(component.physical_product_id) || 0) + component.requiredQuantity);
    for (const [productId, quantity] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const product = (await client.query("select id,on_hand,reserved from physical_products where id=$1 for update", [productId])).rows[0];
      if (!product || Number(product.on_hand) - Number(product.reserved) < quantity) throw fail("INSUFFICIENT_STOCK", 409);
      const movementKey = `TRAINER_ORDER:${order.id}:RESERVATION:${productId}`;
      const movement = (await client.query("insert into inventory_movements(physical_product_id,movement_type,quantity,source_type,source_id,idempotency_key) values($1,'RESERVATION',$2,'TRAINER_ORDER',$3,$4) on conflict(idempotency_key) do nothing returning id", [productId, quantity, order.id, movementKey])).rows[0];
      if (movement) await client.query("update physical_products set reserved=reserved+$1,updated_at=now() where id=$2", [quantity, productId]);
    }
    for (const component of components) await client.query(`insert into trainer_order_physical_items(trainer_package_order_item_id,package_component_id,physical_product_id,quantity,title_snapshot,sku_snapshot,display_label_snapshot) values($1,$2,$3,$4,$5,$6,$7) on conflict(trainer_package_order_item_id,package_component_id) do nothing`, [component.item.id, component.component_id, component.physical_product_id, component.requiredQuantity, component.title, component.sku, component.display_label || component.title_snapshot]);
    await client.query("update trainer_package_orders set status='PAID',completed_at=coalesce(completed_at,now()),invoice_status='PENDING',updated_at=now() where id=$1", [order.id]);
    await client.query("update r6_custom_offers set status='ACCEPTED',accepted_at=coalesce(accepted_at,now()),updated_at=now() where status='SENT' and customer_user_id=$1 and id=(select substring(invoice_description_snapshot from '\\[R6_CUSTOM_OFFER_ID:([0-9a-f-]{36})\\]')::uuid from trainer_package_order_items where order_id=$2 and invoice_description_snapshot like '%[R6_CUSTOM_OFFER_ID:%' limit 1)", [order.trainer_user_id, order.id]);
    const shipment = (await client.query(`insert into trainer_order_shipments(order_id,trainer_user_id,address_snapshot_json,shipping_charge_minor,status,provider_enabled) values($1,$2,$3,$4,'PREPARING',false) on conflict(order_id) do update set updated_at=now() returning id`, [order.id, order.trainer_user_id, order.shipping_address_snapshot_json, order.shipping_minor])).rows[0];
    const physicalItems = (await client.query("select poi.id as physical_item_id,poi.physical_product_id,poi.quantity,poi.title_snapshot,poi.sku_snapshot,poi.display_label_snapshot from trainer_order_physical_items poi join trainer_package_order_items oi on oi.id=poi.trainer_package_order_item_id where oi.order_id=$1 order by poi.id", [order.id])).rows;
    for (const item of physicalItems) await client.query(`insert into trainer_order_shipment_items(trainer_order_shipment_id,trainer_order_physical_item_id,physical_product_id,quantity,title_snapshot,sku_snapshot,display_label_snapshot) values($1,$2,$3,$4,$5,$6,$7) on conflict(trainer_order_shipment_id,trainer_order_physical_item_id) do nothing`, [shipment.id, item.physical_item_id, item.physical_product_id, item.quantity, item.title_snapshot, item.sku_snapshot, item.display_label_snapshot]);
    await queuePanelNotification(client, {
      recipientUserId: order.trainer_user_id,
      recipientEmail: trainerUser?.email,
      eventType: "TRAINER_PACKAGE_ACTIVATED",
      title: "Eğitim paketiniz aktif",
      body: "Ödemeniz onaylandı. Eğitim paketiniz kullanıma açıldı.",
      metadata: { path: "/panel/egitmen/egitimlerim", orderId: order.id },
      dedupeKey: `trainer-package-activated:${order.id}`,
    });
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.commerce.payment.settled','trainer_package_order',$2,'SUCCESS',$3,$4)", [actorUserId, order.id, crypto.randomUUID(), JSON.stringify({ provider, providerReference })]);
    await queueRolePanelNotifications(client, {
      role: "OWNER",
      scopeType: "GLOBAL",
      eventType: "OWNER_TRAINER_PAYMENT_APPROVED",
      title: "Eğitmen ödemesi onaylandı",
      body: "Eğitmen paket siparişi onaylandı; paket erişimi aktifleştirildi. Eğitim verme uzmanlığı ayrı bir yetkilendirmedir.",
      metadata: { path: "/panel/admin/egitmen-ticaret", orderId: order.id, provider },
      dedupeKey: `owner-trainer-payment-approved:${order.id}`,
      emailSubject: "Eğitmen ödemesi onaylandı",
    });
    if (manageTransaction) await client.query("commit"); return { replay: false, orderStatus: "PAID" };
  } catch (error) { if (manageTransaction) await client.query("rollback"); throw error; }
}

export function mergeWatchedRanges(ranges) {
  const normalized = ranges.map(([start, end]) => [Math.max(0, Number(start) || 0), Math.max(0, Number(end) || 0)]).filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  const merged = []; for (const range of normalized) { const last = merged.at(-1); if (!last || range[0] > last[1] + 1) merged.push(range); else last[1] = Math.max(last[1], range[1]); } return merged;
}

export function watchedCoverageBps(ranges, duration) {
  const seconds = mergeWatchedRanges(ranges).reduce((sum, [start, end]) => sum + Math.max(0, Math.min(duration, end) - Math.min(duration, start)), 0);
  return Math.min(10000, Math.floor(seconds * 10000 / Math.max(1, duration)));
}
