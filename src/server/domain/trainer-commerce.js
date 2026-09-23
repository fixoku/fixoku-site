import crypto from "node:crypto";
import { isTrainerPackageDomain } from "./package-domain.js";
import { countPhysicalBooks, shippingForBookCount } from "./book-shipping.js";
import { grantTrainerOrderExpertise } from "./trainer-expertise.js";

export const TRAINER_COMMERCE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PENDING_STATUSES = ["PENDING_PAYMENT", "PAYMENT_REVIEW"];

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
         and not exists(select 1 from r6_trainer_qualification_grants g where g.trainer_user_id=$1 and g.qualification_id=m.qualification_id and g.status='ACTIVE' and (g.valid_until is null or g.valid_until>now())))) as "expertiseActive",
      coalesce((select json_agg(json_build_object('componentType',pc.component_type,'title',coalesce(pc.display_label,pc.title_snapshot),'quantity',pc.quantity,'displayOrder',pc.display_order,'imageReference',prod.image_reference) order by pc.display_order,pc.id) from package_components pc left join physical_products prod on prod.id=pc.physical_product_id where pc.package_version_id=pv.id and pc.is_active), '[]') as components
    from packages p join package_versions pv on pv.package_id=p.id
    left join lateral (select e1.id,e1.status,e1.source from trainer_package_entitlements e1 where e1.trainer_user_id=$1 and e1.package_id=p.id order by case when e1.status='ACTIVE' then 0 else 1 end,e1.effective_at desc limit 1) e on true
    left join lateral (select o1.id,o1.status from trainer_package_orders o1 join trainer_package_order_items oi on oi.order_id=o1.id where o1.trainer_user_id=$1 and oi.package_id=p.id and o1.status=any($2::trainer_order_status[]) order by o1.created_at desc limit 1) o on true
    left join trainer_cart_items c on c.trainer_user_id=$1 and c.package_version_id=pv.id
    where p.audience='TRAINER' and p.catalog_scope in ('TRAINER_COMMERCE','LEGACY_EDUCATION') and p.panel_visible=true and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true
    order by pv.version_number desc,p.slug
  `, [trainerUserId, PENDING_STATUSES])).rows;
  const packages = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.packageId)) continue;
    seen.add(row.packageId);
    const owned = row.entitlementStatus === "ACTIVE";
    packages.push({ ...row, priceGrossMinor: Number(row.priceGrossMinor || 0), priceNetMinor: row.priceNetMinor == null ? null : Number(row.priceNetMinor), shippingPriceMinor: Number(row.shippingPriceMinor || 0), features: json(row.featuresJson, []), components: row.components || [], accessState: owned ? "OWNED" : row.pendingOrderId ? "PENDING_PAYMENT" : "AVAILABLE", inCart: Boolean(row.cartItemId) });
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
  const rows = (await client.query(`select c.id,p.id as "packageId",pv.id as "packageVersionId",pv.title,pv.short_description as "shortDescription",pv.sku,coalesce(pv.price_gross_minor,pv.price_minor) as "priceGrossMinor",pv.price_net_minor as "priceNetMinor",pv.vat_rate_bps as "vatRateBps",pv.currency,p.shipping_policy as "shippingPolicy",p.shipping_price_minor as "shippingPriceMinor",p.icon_reference as "iconReference",coalesce((select sum(pc.quantity)::int from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active=true and pc.component_type='PHYSICAL_PRODUCT' and pp.r6_product_type='BOOK'),0) as "bookCount" from trainer_cart_items c join package_versions pv on pv.id=c.package_version_id join packages p on p.id=pv.package_id where c.trainer_user_id=$1 and p.audience='TRAINER' and p.catalog_scope in ('TRAINER_COMMERCE','LEGACY_EDUCATION') and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true order by c.created_at`, [trainerUserId])).rows.map((row) => ({ ...row, priceGrossMinor: Number(row.priceGrossMinor || 0), priceNetMinor: row.priceNetMinor == null ? null : Number(row.priceNetMinor), shippingPriceMinor: Number(row.shippingPriceMinor || 0), bookCount: Number(row.bookCount || 0), quantity: 1 }));
  const subtotalMinor = rows.reduce((sum, row) => sum + row.priceGrossMinor, 0);
  const shippingMinor = shippingForBookCount(rows.reduce((sum, row) => sum + row.bookCount, 0));
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
  const shipping = addressSnapshot(input?.shippingAddress || {}); const billing = billingSnapshot(input?.billing || {}, shipping);
  await client.query("begin");
  try {
    const existing = (await client.query("select * from trainer_package_orders where trainer_user_id=$1 and idempotency_key=$2 for update", [trainerUserId, idempotencyKey])).rows[0];
    const requestHash = trainerCommerceHash({ paymentMethod, shipping, billing });
    if (existing) { if (existing.request_hash !== requestHash) throw fail("IDEMPOTENCY_KEY_CONFLICT", 409); await client.query("commit"); return { order: existing, replay: true }; }
    const cart = (await client.query(`select c.id,p.id as package_id,p.slug,p.audience,p.catalog_scope,p.status as package_status,p.physical_product,p.shipping_policy,p.shipping_price_minor,pv.*,coalesce((select json_agg(json_build_object('productType',pp.r6_product_type,'quantity',pc.quantity)) from package_components pc join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pc.package_version_id=pv.id and pc.is_active=true and pc.component_type='PHYSICAL_PRODUCT'),'[]') as shipping_components from trainer_cart_items c join package_versions pv on pv.id=c.package_version_id join packages p on p.id=pv.package_id where c.trainer_user_id=$1 for update`, [trainerUserId])).rows;
    if (!cart.length) throw fail("CART_EMPTY", 409);
    if (cart.some((row) => !isTrainerPackageDomain(row) || row.package_status !== "PUBLISHED" || row.status !== "PUBLISHED" || !row.purchase_enabled)) throw fail("PACKAGE_UNAVAILABLE", 409);
    const packageIds = cart.map((row) => row.package_id);
    if ((await client.query("select 1 from trainer_package_entitlements where trainer_user_id=$1 and package_id=any($2::uuid[]) and status='ACTIVE' limit 1", [trainerUserId, packageIds])).rowCount) throw fail("PACKAGE_ALREADY_OWNED", 409);
    if ((await client.query("select 1 from trainer_package_orders o join trainer_package_order_items oi on oi.order_id=o.id where o.trainer_user_id=$1 and oi.package_id=any($2::uuid[]) and o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW') limit 1", [trainerUserId, packageIds])).rowCount) throw fail("ORDER_ALREADY_EXISTS", 409);
    const bookCount = cart.reduce((sum, row) => sum + countPhysicalBooks(Array.isArray(row.shipping_components) ? row.shipping_components : json(row.shipping_components, [])), 0);
    const cartShippingMinor = shippingForBookCount(bookCount);
    const snapshots = cart.map((row, index) => { const gross = money(row.price_gross_minor ?? row.price_minor, "PACKAGE_PRICE_INVALID"); const vat = Number(row.vat_rate_bps || 0); const net = row.price_net_minor == null ? Math.floor(gross * 10000 / (10000 + vat)) : money(row.price_net_minor, "PACKAGE_PRICE_INVALID"); const shippingMinor = index === 0 ? cartShippingMinor : 0; return { row, gross, net, vat, shippingMinor, total: gross + shippingMinor }; });
    const subtotalMinor = snapshots.reduce((sum, item) => sum + item.gross, 0); const shippingMinor = cartShippingMinor; const taxMinor = snapshots.reduce((sum, item) => sum + item.gross - item.net, 0) + (shippingMinor - Math.floor(shippingMinor * 10000 / 12000)); const totalMinor = subtotalMinor + shippingMinor;
    const order = (await client.query(`insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,discount_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,invoice_status,idempotency_key,request_hash) values($1,$2,$3,'TRY',$4,$5,0,$6,$7,$8,$9,'PENDING',$10,$11) returning *`, [trainerUserId, paymentMethod === "BANK_TRANSFER" ? "PAYMENT_REVIEW" : "PENDING_PAYMENT", paymentMethod, subtotalMinor, shippingMinor, taxMinor, totalMinor, JSON.stringify(shipping), JSON.stringify(billing), idempotencyKey, requestHash])).rows[0];
    for (const item of snapshots) await client.query(`insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,features_snapshot_json,sku_snapshot,invoice_product_code_snapshot,invoice_product_name_snapshot,invoice_description_snapshot,unit_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,discount_minor,line_total_minor,currency,quantity) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,$16,$17,1)`, [order.id, item.row.package_id, item.row.id, item.row.title, item.row.description, item.row.features_json || "[]", item.row.sku || item.row.slug || `TRAINER-${item.row.package_id}`, item.row.invoice_product_code, item.row.invoice_product_name || item.row.title, item.row.invoice_description, item.row.unit || "adet", item.vat, item.net, item.gross, item.shippingMinor, item.total, item.row.currency || "TRY"]);
    await client.query("delete from trainer_cart_items where trainer_user_id=$1", [trainerUserId]);
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.commerce.order.created','trainer_package_order',$2,'SUCCESS',$3,$4)", [trainerUserId, order.id, crypto.randomUUID(), JSON.stringify({ paymentMethod, packageIds, totalMinor })]);
    await client.query("commit"); return { order, replay: false };
  } catch (error) { await client.query("rollback"); throw error; }
}

export async function fulfillTrainerOrder(client, { orderId, actorUserId, provider, providerReference, manageTransaction = true }) {
  if (!TRAINER_COMMERCE_UUID.test(String(orderId || ""))) throw fail("INVALID_ORDER_ID");
  if (manageTransaction) await client.query("begin");
  try {
    const order = (await client.query("select * from trainer_package_orders where id=$1 for update", [orderId])).rows[0]; if (!order) throw fail("ORDER_NOT_FOUND", 404);
    if (order.status === "PAID") { const materialized = (await client.query("select count(*)::int as count from trainer_order_physical_items poi join trainer_package_order_items oi on oi.id=poi.trainer_package_order_item_id where oi.order_id=$1", [orderId])).rows[0]; if (manageTransaction) await client.query("commit"); return { replay: true, orderStatus: "PAID", physicalItemCount: Number(materialized?.count || 0) }; }
    if (!PENDING_STATUSES.includes(order.status)) throw fail("ORDER_NOT_SETTLEABLE", 409);
    const items = (await client.query("select * from trainer_package_order_items where order_id=$1 order by id", [orderId])).rows;
    const components = [];
    for (const item of items) {
      const rows = (await client.query(`select pc.id as component_id,pc.physical_product_id,pc.quantity,pc.display_label,pc.title_snapshot,pp.sku,pp.title from package_components pc join physical_products pp on pp.id=pc.physical_product_id where pc.package_version_id=$1 and pc.component_type='PHYSICAL_PRODUCT' and pc.is_active=true order by pc.physical_product_id,pc.display_order,pc.id`, [item.package_version_id])).rows;
      for (const row of rows) components.push({ item, ...row, requiredQuantity: Number(row.quantity || 1) * Number(item.quantity || 1) });
      await client.query(`insert into trainer_package_entitlements(trainer_user_id,package_id,package_version_id,status,source,source_order_id,assigned_by) values($1,$2,$3,'ACTIVE','PAYMENT',$4,$5) on conflict(trainer_user_id,package_id) where status='ACTIVE' do nothing`, [order.trainer_user_id, item.package_id, item.package_version_id, order.id, actorUserId]);
    }
    await grantTrainerOrderExpertise(client, { trainerUserId: order.trainer_user_id, orderId: order.id, orderItems: items });
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
    const shipment = (await client.query(`insert into trainer_order_shipments(order_id,trainer_user_id,address_snapshot_json,shipping_charge_minor,status,provider_enabled) values($1,$2,$3,$4,'PREPARING',false) on conflict(order_id) do update set updated_at=now() returning id`, [order.id, order.trainer_user_id, order.shipping_address_snapshot_json, order.shipping_minor])).rows[0];
    const physicalItems = (await client.query("select poi.id as physical_item_id,poi.physical_product_id,poi.quantity,poi.title_snapshot,poi.sku_snapshot,poi.display_label_snapshot from trainer_order_physical_items poi join trainer_package_order_items oi on oi.id=poi.trainer_package_order_item_id where oi.order_id=$1 order by poi.id", [order.id])).rows;
    for (const item of physicalItems) await client.query(`insert into trainer_order_shipment_items(trainer_order_shipment_id,trainer_order_physical_item_id,physical_product_id,quantity,title_snapshot,sku_snapshot,display_label_snapshot) values($1,$2,$3,$4,$5,$6,$7) on conflict(trainer_order_shipment_id,trainer_order_physical_item_id) do nothing`, [shipment.id, item.physical_item_id, item.physical_product_id, item.quantity, item.title_snapshot, item.sku_snapshot, item.display_label_snapshot]);
    const user = (await client.query("select email,display_name from platform_users where id=$1", [order.trainer_user_id])).rows[0];
    await client.query("insert into panel_notifications(recipient_user_id,event_type,title,body,metadata_json,dedupe_key) values($1,'TRAINER_PACKAGE_ACTIVATED','Eğitim paketiniz aktif','Ödemeniz onaylandı. Eğitim paketiniz kullanıma açıldı.',$2,$3) on conflict(dedupe_key) do nothing", [order.trainer_user_id, JSON.stringify({ orderId: order.id }), `trainer-package-activated:${order.id}`]);
    if (user?.email) await client.query("insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key) values($1,'TRAINER_PACKAGE_ACTIVATED',$2,'Eğitim paketiniz aktif','Ödemeniz onaylandı. Eğitim paketiniz kullanıma açıldı.',$3) on conflict(dedupe_key) do nothing", [order.trainer_user_id, user.email, `trainer-package-activated-email:${order.id}`]);
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.commerce.payment.settled','trainer_package_order',$2,'SUCCESS',$3,$4)", [actorUserId, order.id, crypto.randomUUID(), JSON.stringify({ provider, providerReference })]);
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
