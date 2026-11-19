/* global process */
import crypto from "node:crypto";
import { preflightOrderShipment, shipmentReference } from "./order-preflight.js";

export const DISPATCH_STATUS = Object.freeze({
  NOT_READY: "NOT_READY", READY: "READY", CREATING: "CREATING", CREATED: "CREATED",
  HANDED_OVER: "HANDED_OVER", IN_TRANSIT: "IN_TRANSIT", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED", CANCELLED: "CANCELLED", RETURNING: "RETURNING", REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const json = (value, yedek = {}) => {
  if (value && typeof value === "object") return value;
  try { const parsed = JSON.parse(String(value || "")); return parsed && typeof parsed === "object" ? parsed : yedek; } catch { return yedek; }
};
const asStatus = (code) => {
  const n = Number(code);
  if (n === 111) return DISPATCH_STATUS.DELIVERED;
  if ([109, 140, 141, 142].includes(n)) return DISPATCH_STATUS.OUT_FOR_DELIVERY;
  if ([103,104,105,106,107,108,110,138].includes(n)) return DISPATCH_STATUS.IN_TRANSIT;
  if ([113,119,120,130,131,134,135,151].includes(n)) return DISPATCH_STATUS.RETURNING;
  if ([133,136,139,143].includes(n)) return DISPATCH_STATUS.CANCELLED;
  if ([101,102,132,137].includes(n)) return DISPATCH_STATUS.CREATED;
  if ([112,114,115,117,118,121,122,123,124,125,126,127,128,129].includes(n)) return DISPATCH_STATUS.REVIEW_REQUIRED;
  return null;
};

export function normalizeProviderTracking(value) {
  const row = json(value);
  const trackingNumber = text(row.TrackingNumber ?? row.TrackingNo ?? row.trackingNumber ?? row.trackingNo, 80) || null;
  const referenceNo = text(row.ReferenceNo ?? row.referenceNo, 50) || null;
  const state = row.State ?? row.StateId ?? row.state ?? row.statusId ?? null;
  const stateText = text(row.StateText ?? row.stateText ?? row.statusText, 160) || null;
  const updateDate = row.UpdateDate ?? row.updateDate ?? null;
  const trackingUrl = text(row.TrackingUrl ?? row.trackingUrl, 1024) || null;
  if (trackingUrl && (!trackingUrl.startsWith("https://") || !/^sube\.kolaygelsin\.com\//iu.test(new URL(trackingUrl).hostname + new URL(trackingUrl).pathname))) throw Object.assign(new Error("KG_TRACKING_URL_UNTRUSTED"), { code: "KG_TRACKING_URL_UNTRUSTED", status: 502 });
  const dispatchStatus = asStatus(state);
  if (!trackingNumber && !referenceNo && !dispatchStatus) throw Object.assign(new Error("KG_TRACKING_RESPONSE_INVALID"), { code: "KG_TRACKING_RESPONSE_INVALID", status: 502 });
  return { trackingNumber, referenceNo, providerStatusId: state == null ? null : String(state), providerStatusText: stateText, trackingUrl, updatedAt: updateDate, dispatchStatus, raw: row };
}

export function safeProviderResult(value) {
  const row = json(value);
  const allowed = {};
  for (const key of ["TrackingNumber", "TrackingNo", "TrackingUrl", "ReferenceNo", "ReferenceNo", "Barcode", "barcode", "ShipmentId", "IsSuccess", "State", "StateText", "UpdateDate", "ExceptionMessage", "RequestId"]) if (row[key] !== undefined && typeof row[key] !== "object") allowed[key] = String(row[key]).slice(0, 2000);
  return allowed;
}

function sourceConfig(kind, id) {
  const normalized = String(kind || "").toUpperCase();
  if (!['STUDENT', 'TRAINER'].includes(normalized) || !UUID.test(String(id || ""))) throw Object.assign(new Error("SHIPMENT_REFERENCE_INVALID"), { code: "SHIPMENT_REFERENCE_INVALID", status: 400 });
  return { kind: normalized, id: String(id) };
}

async function readSource(client, source) {
  if (source.kind === "STUDENT") {
    const shipment = (await client.query(`select s.id,s.order_id as "orderId",s.status,o.status as "orderStatus",s.address_snapshot_json as "addressSnapshotJson",s.shipping_charge_minor as "shippingChargeMinor" from shipments s join orders o on o.id=s.order_id where s.id=$1 for update`, [source.id])).rows[0];
    if (!shipment) throw Object.assign(new Error("SHIPMENT_NOT_FOUND"), { code: "SHIPMENT_NOT_FOUND", status: 404 });
    const items = (await client.query(`select si.id,si.physical_product_id as "productId",si.quantity,si.title_snapshot as title,'PHYSICAL' as "productType" from shipment_items si where si.shipment_id=$1 order by si.id`, [source.id])).rows;
    return { shipment, items, orderKind: "STUDENT_ORDER" };
  }
  const shipment = (await client.query(`select s.id,s.order_id as "orderId",s.status,o.status as "orderStatus",s.address_snapshot_json as "addressSnapshotJson",s.shipping_charge_minor as "shippingChargeMinor" from trainer_order_shipments s join trainer_package_orders o on o.id=s.order_id where s.id=$1 for update`, [source.id])).rows[0];
  if (!shipment) throw Object.assign(new Error("SHIPMENT_NOT_FOUND"), { code: "SHIPMENT_NOT_FOUND", status: 404 });
  const items = (await client.query(`select si.id,si.physical_product_id as "productId",si.quantity,si.title_snapshot as title,'PHYSICAL' as "productType" from trainer_order_shipment_items si where si.trainer_order_shipment_id=$1 order by si.id`, [source.id])).rows;
  return { shipment, items, orderKind: "TRAINER_PACKAGE_ORDER" };
}

function senderFromEnvironment(env = process.env) {
  const sender = { name: text(env.SHIPPING_SENDER_NAME, 200), address: text(env.SHIPPING_SENDER_ADDRESS, 225), phone: text(env.SHIPPING_SENDER_PHONE, 30), cityId: Number(env.SHIPPING_SENDER_CITY_ID), districtId: Number(env.SHIPPING_SENDER_DISTRICT_ID) };
  if (!sender.address || !sender.phone || !Number.isSafeInteger(sender.cityId) || !Number.isSafeInteger(sender.districtId)) return null;
  return sender;
}

function eventKey(operation, value) { return `${operation}:${crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex").slice(0, 32)}`; }

async function recordAttempt(client, dispatch, operation, resultStatus, details = {}) {
  const attemptNumber = Number((await client.query("select coalesce(max(attempt_number),0)+1 as n from shipment_dispatch_attempts where dispatch_id=$1", [dispatch.id])).rows[0]?.n || 1);
  await client.query(`insert into shipment_dispatch_attempts(dispatch_id,attempt_number,operation,result_status,provider_status_code,provider_result_json,error_code,idempotency_key,completed_at) values($1,$2,$3,$4,$5,$6,$7,$8,now()) on conflict(idempotency_key) do nothing`, [dispatch.id, attemptNumber, operation, resultStatus, details.providerStatusCode ?? null, JSON.stringify(details.providerResult || {}), details.errorCode || null, eventKey(operation, details.providerResult || details.errorCode || dispatch.reference_no)]);
}

async function appendEvent(client, dispatchId, status, details = {}) {
  await client.query(`insert into shipment_status_events(dispatch_id,event_key,dispatch_status,provider_status_id,provider_status_text,event_at,source,metadata_json) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(dispatch_id,event_key) do nothing`, [dispatchId, details.eventKey || `${status}:${details.providerStatusId || ""}:${details.eventAt || ""}`, status, details.providerStatusId || null, details.providerStatusText || null, details.eventAt ? new Date(details.eventAt) : null, details.source || "SYSTEM", JSON.stringify(details.metadata || {})]);
}

export async function dispatchShipment(client, { shipmentKind, shipmentId, provider, packageCount, sender = senderFromEnvironment(), actorUserId = null } = {}) {
  const source = sourceConfig(shipmentKind, shipmentId);
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_DISPATCH:${source.kind}:${source.id}`]);
    const { shipment, items, orderKind } = await readSource(client, source);
    const existing = (await client.query(`select * from shipment_dispatches where ${source.kind === "STUDENT" ? "shipment_id" : "trainer_order_shipment_id"}=$1 for update`, [source.id])).rows[0];
    if (existing?.dispatch_status === DISPATCH_STATUS.CREATED || existing?.dispatch_status === DISPATCH_STATUS.HANDED_OVER || existing?.dispatch_status === DISPATCH_STATUS.IN_TRANSIT || existing?.dispatch_status === DISPATCH_STATUS.OUT_FOR_DELIVERY || existing?.dispatch_status === DISPATCH_STATUS.DELIVERED) { await client.query("commit"); return { replay: true, dispatch: existing, providerCall: false }; }
    if (existing?.dispatch_status === DISPATCH_STATUS.REVIEW_REQUIRED) throw Object.assign(new Error("SHIPMENT_REVIEW_REQUIRED"), { code: "SHIPMENT_REVIEW_REQUIRED", status: 409 });
    if (shipment.orderStatus !== "PAID") throw Object.assign(new Error("PAYMENT_NOT_SETTLED"), { code: "PAYMENT_NOT_SETTLED", status: 409 });
    if (shipment.status !== "PACKED") throw Object.assign(new Error("SHIPMENT_NOT_PACKED"), { code: "SHIPMENT_NOT_PACKED", status: 409 });
    if (!sender) throw Object.assign(new Error("KG_SENDER_CONFIGURATION_REQUIRED"), { code: "KG_SENDER_CONFIGURATION_REQUIRED", status: 409 });
    const preflight = preflightOrderShipment({ audience: source.kind, shipment: { ...shipment, addressSnapshot: json(shipment.addressSnapshotJson) }, orderStatus: shipment.orderStatus, items, sender, packageCount });
    if (!preflight.eligible) throw Object.assign(new Error(preflight.blockers[0] || "SHIPMENT_PREFLIGHT_FAILED"), { code: preflight.blockers[0] || "SHIPMENT_PREFLIGHT_FAILED", status: 409, blockers: preflight.blockers });
    const referenceNo = preflight.referenceNo || shipmentReference(source.kind, source.id);
    const receiverSnapshot = json(shipment.addressSnapshotJson);
    const providerName = ["KOLAYGELSIN", "MOCK"].includes(String(provider?.runtime?.provider || "").toUpperCase()) ? String(provider.runtime.provider).toUpperCase() : "KOLAYGELSIN";
    const dispatch = existing || (await client.query(
      `insert into shipment_dispatches(shipment_kind,${source.kind === "STUDENT" ? "shipment_id" : "trainer_order_shipment_id"},order_kind,order_id,provider_name,reference_no,dispatch_status,package_count,physical_items_json,sender_address_snapshot_json,receiver_address_snapshot_json) values($1,$2,$3,$4,$5,$6,'CREATING',$7,$8,$9,$10) returning *`,
      [source.kind, source.id, orderKind, shipment.orderId, providerName, referenceNo, Number(packageCount), JSON.stringify(items), JSON.stringify(sender), JSON.stringify(receiverSnapshot)],
    )).rows[0];
    await client.query("update shipment_dispatches set dispatch_status='CREATING',attempt_count=attempt_count+1,last_attempt_at=now(),updated_at=now() where id=$1", [dispatch.id]);
    let result;
    try { result = await provider.createShipment({ referenceNo, packageCount: Number(packageCount), sender, receiver: { name: [receiverSnapshot.firstName, receiverSnapshot.lastName].filter(Boolean).join(" "), phone: receiverSnapshot.phone, address: receiverSnapshot.addressLine, cityId: Number(receiverSnapshot.cityId), districtId: Number(receiverSnapshot.districtId) }, description: "FIXOKU fiziksel ürün gönderisi" }); }
    catch (cause) {
      await client.query("update shipment_dispatches set dispatch_status='REVIEW_REQUIRED',review_reason=$1,last_error_code=$2,updated_at=now() where id=$3", ["Sağlayıcı sonucu kesinleşmedi; Owner reconciliation gerekli.", text(cause?.code || cause?.message, 120) || "PROVIDER_ERROR", dispatch.id]);
      await recordAttempt(client, dispatch, "CREATE", "REVIEW_REQUIRED", { errorCode: cause?.code || "PROVIDER_ERROR" });
      await appendEvent(client, dispatch.id, DISPATCH_STATUS.REVIEW_REQUIRED, { source: "SYSTEM", metadata: { errorCode: cause?.code || "PROVIDER_ERROR" } });
      await client.query("commit");
      return { replay: false, dispatch: { ...dispatch, dispatch_status: DISPATCH_STATUS.REVIEW_REQUIRED }, providerCall: true, reviewRequired: true };
    }
    const trackingNumber = text(result?.trackingNumber || result?.providerReference, 80);
    const trackingUrl = text(result?.trackingUrl, 1024) || null;
    if (!trackingNumber) throw Object.assign(new Error("KG_TRACKING_NUMBER_MISSING"), { code: "KG_TRACKING_NUMBER_MISSING", status: 502 });
    const updated = (await client.query(`update shipment_dispatches set dispatch_status='CREATED',provider_reference=$1,provider_tracking_number=$2,provider_tracking_url=$3,barcode_reference=coalesce(barcode_reference,$2),provider_result_json=$4,review_reason=null,last_error_code=null,updated_at=now() where id=$5 returning *`, [result.providerReference || trackingNumber, trackingNumber, trackingUrl, JSON.stringify(safeProviderResult(result)), dispatch.id])).rows[0];
    const sourceTable = source.kind === "STUDENT" ? "shipments" : "trainer_order_shipments";
    await client.query(`update ${sourceTable} set carrier=$1,tracking_number=$2,tracking_url=$3,label_reference=coalesce(label_reference,$4),provider_enabled=true,updated_at=now() where id=$5`, [providerName, trackingNumber, trackingUrl, result.providerReference || trackingNumber, source.id]);
    await recordAttempt(client, updated, "CREATE", "SUCCEEDED", { providerResult: result });
    await appendEvent(client, updated.id, DISPATCH_STATUS.CREATED, { source: "OWNER", metadata: { actorUserId, trackingNumber } });
    await client.query("commit");
    return { replay: false, dispatch: updated, providerCall: true };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

export async function trackShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_TRACK:${dispatchId}`]);
    const dispatch = (await client.query("select * from shipment_dispatches where id=$1 for update", [dispatchId])).rows[0];
    if (!dispatch) throw Object.assign(new Error("SHIPMENT_DISPATCH_NOT_FOUND"), { code: "SHIPMENT_DISPATCH_NOT_FOUND", status: 404 });
    if (dispatch.last_provider_query_at && Date.now() - new Date(dispatch.last_provider_query_at).getTime() < 30 * 60 * 1000) { await client.query("commit"); return { replay: true, dispatch, providerCall: false }; }
    const raw = await provider.getTracking(dispatch.provider_tracking_number || dispatch.reference_no);
    const tracking = normalizeProviderTracking(raw);
    const status = tracking.dispatchStatus || dispatch.dispatch_status;
    const updated = (await client.query(`update shipment_dispatches set dispatch_status=$1,provider_tracking_number=coalesce($2,provider_tracking_number),provider_tracking_url=coalesce($3,provider_tracking_url),provider_result_json=$4,last_provider_query_at=now(),updated_at=now(),review_reason=null where id=$5 returning *`, [status, tracking.trackingNumber, tracking.trackingUrl, JSON.stringify(safeProviderResult(raw)), dispatch.id])).rows[0];
    await recordAttempt(client, updated, "TRACK", "SUCCEEDED", { providerResult: raw });
    await appendEvent(client, updated.id, status, { source: "PROVIDER", providerStatusId: tracking.providerStatusId, providerStatusText: tracking.providerStatusText, eventAt: tracking.updatedAt, metadata: { trackingNumber: tracking.trackingNumber } });
    await client.query("commit");
    return { replay: false, dispatch: updated, tracking, providerCall: true };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

export async function cancelShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_CANCEL:${dispatchId}`]);
    const dispatch = (await client.query("select * from shipment_dispatches where id=$1 for update", [dispatchId])).rows[0];
    if (!dispatch) throw Object.assign(new Error("SHIPMENT_DISPATCH_NOT_FOUND"), { code: "SHIPMENT_DISPATCH_NOT_FOUND", status: 404 });
    if (dispatch.dispatch_status === DISPATCH_STATUS.CANCELLED) { await client.query("commit"); return { replay: true, dispatch, providerCall: false, refund: "SEPARATE_OPERATION" }; }
    if ([DISPATCH_STATUS.HANDED_OVER, DISPATCH_STATUS.IN_TRANSIT, DISPATCH_STATUS.OUT_FOR_DELIVERY, DISPATCH_STATUS.DELIVERED, DISPATCH_STATUS.RETURNING].includes(dispatch.dispatch_status)) throw Object.assign(new Error("SHIPMENT_CANCEL_NOT_ALLOWED"), { code: "SHIPMENT_CANCEL_NOT_ALLOWED", status: 409 });
    const result = await provider.cancelShipment(dispatch.provider_reference || dispatch.reference_no);
    if (result?.cancelled !== true) throw Object.assign(new Error("KG_CANCEL_NOT_CONFIRMED"), { code: "KG_CANCEL_NOT_CONFIRMED", status: 502 });
    const updated = (await client.query("update shipment_dispatches set dispatch_status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),cancellation_requested_at=coalesce(cancellation_requested_at,now()),updated_at=now() where id=$1 returning *", [dispatch.id])).rows[0];
    await recordAttempt(client, updated, "CANCEL", "SUCCEEDED", { providerResult: result });
    await appendEvent(client, updated.id, DISPATCH_STATUS.CANCELLED, { source: "OWNER" });
    await client.query("commit");
    return { replay: false, dispatch: updated, providerCall: true, refund: "SEPARATE_OPERATION" };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

export async function barcodeShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    const dispatch = (await client.query("select * from shipment_dispatches where id=$1 for update", [dispatchId])).rows[0];
    if (!dispatch) throw Object.assign(new Error("SHIPMENT_DISPATCH_NOT_FOUND"), { code: "SHIPMENT_DISPATCH_NOT_FOUND", status: 404 });
    if (dispatch.barcode_payload) { await client.query("commit"); return { replay: true, dispatch, providerCall: false }; }
    const result = await provider.createLabel(dispatch.reference_no);
    const barcode = text(result?.barcode || result?.Barcode || result?.barcodePayload, 200000);
    if (!barcode) throw Object.assign(new Error("KG_BARCODE_MISSING"), { code: "KG_BARCODE_MISSING", status: 502 });
    const updated = (await client.query("update shipment_dispatches set barcode_reference=coalesce(barcode_reference,reference_no),barcode_payload=$1,provider_result_json=$2,updated_at=now() where id=$3 returning *", [barcode, JSON.stringify(safeProviderResult(result)), dispatch.id])).rows[0];
    await recordAttempt(client, updated, "BARCODE", "SUCCEEDED", { providerResult: result });
    await client.query("commit");
    return { replay: false, dispatch: updated, providerCall: true };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

export async function reconcileShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    const dispatch = (await client.query("select * from shipment_dispatches where id=$1 for update", [dispatchId])).rows[0];
    if (!dispatch) throw Object.assign(new Error("SHIPMENT_DISPATCH_NOT_FOUND"), { code: "SHIPMENT_DISPATCH_NOT_FOUND", status: 404 });
    let raw;
    try { raw = await provider.getTracking(dispatch.provider_reference || dispatch.reference_no); }
    catch (cause) { await recordAttempt(client, dispatch, "RECONCILE", "REVIEW_REQUIRED", { errorCode: cause?.code || "PROVIDER_ERROR" }); await client.query("commit"); return { status: "REVIEW_REQUIRED", providerCall: true, dispatch }; }
    const tracking = normalizeProviderTracking(raw);
    const status = tracking.dispatchStatus || DISPATCH_STATUS.REVIEW_REQUIRED;
    const updated = (await client.query("update shipment_dispatches set dispatch_status=$1,provider_tracking_number=coalesce($2,provider_tracking_number),provider_tracking_url=coalesce($3,provider_tracking_url),provider_result_json=$4,last_provider_query_at=now(),review_reason=case when $1='REVIEW_REQUIRED' then coalesce(review_reason,'Provider status is not mapped.') else null end,updated_at=now() where id=$5 returning *", [status, tracking.trackingNumber, tracking.trackingUrl, JSON.stringify(safeProviderResult(raw)), dispatch.id])).rows[0];
    await recordAttempt(client, updated, "RECONCILE", status === DISPATCH_STATUS.REVIEW_REQUIRED ? "REVIEW_REQUIRED" : "SUCCEEDED", { providerResult: raw });
    await appendEvent(client, updated.id, status, { source: "RECONCILIATION", providerStatusId: tracking.providerStatusId, providerStatusText: tracking.providerStatusText });
    await client.query("commit");
    return { status, providerCall: true, dispatch: updated };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}
