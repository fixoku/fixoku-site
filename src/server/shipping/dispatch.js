import { resolveKgReceiverR411, readKgSenderR411 } from "./kolaygelsin-location-r411.js";
/* global Buffer */
/* global process */
import crypto from "node:crypto";
import { buildKgMeasurementPayload } from "./kolaygelsin-measurements-r408.js";

// A committed IN_PROGRESS reservation is never automatically retried.
export async function submitShipmentMeasurements(client, dispatch, provider) {
  if (dispatch.measurement_status_r408 !== "PENDING") return dispatch;
  await client.query("begin");
  let reserved;
  try {
    reserved = (await client.query(`update shipment_dispatches
      set measurement_status_r408='IN_PROGRESS', measurement_started_at_r408=now(), updated_at=now()
      where id=$1 and measurement_status_r408='PENDING' and dispatch_status='CREATED'
      and provider_name=$2 returning *`, [dispatch.id, provider.runtime?.provider])).rows[0];
    await client.query("commit");
  } catch (error) { await client.query("rollback").catch(()=>{}); throw error; }
  if (!reserved) return (await client.query("select * from shipment_dispatches where id=$1", [dispatch.id])).rows[0] || dispatch;
  let confirmed = false;
  try {
    const result = await provider.updateMeasurements(reserved.reference_no, reserved.parcel_plan_r408_json);
    confirmed = result?.confirmed === true && result.referenceNo === reserved.reference_no && result.packageCount === reserved.package_count;
  } catch { /* A timeout or rejection cannot authorize another submission. */ }
  return (await client.query(`update shipment_dispatches
    set measurement_status_r408=$2, measurement_finished_at_r408=now(), updated_at=now()
    where id=$1 and measurement_status_r408='IN_PROGRESS' returning *`,
    [reserved.id, confirmed ? "CONFIRMED" : "REVIEW_REQUIRED"])).rows[0] || reserved;
}

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
  if ([133,139].includes(n)) return DISPATCH_STATUS.CANCELLED;
  if ([101,102,132,137].includes(n)) return DISPATCH_STATUS.CREATED;
  if ([112,114,115,117,118,121,122,123,124,125,126,127,128,129,136,143].includes(n)) return DISPATCH_STATUS.REVIEW_REQUIRED;
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

export async function dispatchShipment(client, { shipmentKind, shipmentId, provider, packageCount, sender, actorUserId = null } = {}) {
  const source = sourceConfig(shipmentKind, shipmentId);
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_DISPATCH:${source.kind}:${source.id}`]);
    const { shipment, items, orderKind } = await readSource(client, source);
    const existing = (await client.query(`select * from shipment_dispatches where ${source.kind === "STUDENT" ? "shipment_id" : "trainer_order_shipment_id"}=$1 for update`, [source.id])).rows[0];
    if (existing?.dispatch_status === DISPATCH_STATUS.CREATED || existing?.dispatch_status === DISPATCH_STATUS.HANDED_OVER || existing?.dispatch_status === DISPATCH_STATUS.IN_TRANSIT || existing?.dispatch_status === DISPATCH_STATUS.OUT_FOR_DELIVERY || existing?.dispatch_status === DISPATCH_STATUS.DELIVERED) { await client.query("commit"); const measured = await submitShipmentMeasurements(client, existing, provider); return { replay: true, dispatch: measured, providerCall: false, measurementReviewRequired: ["PENDING","IN_PROGRESS","REVIEW_REQUIRED"].includes(measured.measurement_status_r408) }; }
    if (existing?.dispatch_status === DISPATCH_STATUS.CREATING) {
      await client.query("commit");

      return {
        replay:true,
        dispatch:existing,
        providerCall:false,
        reviewRequired:true
      };
    }

    if (existing?.dispatch_status === DISPATCH_STATUS.REVIEW_REQUIRED) throw Object.assign(new Error("SHIPMENT_REVIEW_REQUIRED"), { code: "SHIPMENT_REVIEW_REQUIRED", status: 409 });
    if (shipment.orderStatus !== "PAID") throw Object.assign(new Error("PAYMENT_NOT_SETTLED"), { code: "PAYMENT_NOT_SETTLED", status: 409 });
    if (shipment.status !== "PACKED") throw Object.assign(new Error("SHIPMENT_NOT_PACKED"), { code: "SHIPMENT_NOT_PACKED", status: 409 });
    if (provider?.runtime?.provider === "KOLAYGELSIN") {
      if (provider.runtime.enabled !== true)
        throw Object.assign(
          new Error("KG_DISPATCH_NOT_APPROVED"),
          {code:"KG_DISPATCH_NOT_APPROVED",status:409}
        );
      sender = sender ?? readKgSenderR411();
    } else {
      sender = sender ?? senderFromEnvironment();
    }
    if (!sender)
      throw Object.assign(
        new Error("KG_SENDER_CONFIGURATION_REQUIRED"),
        {code:"KG_SENDER_CONFIGURATION_REQUIRED",status:409}
      );
    const parcelPlan = existing?.parcel_plan_r408_json;

    if (String(provider?.runtime?.provider || "").toUpperCase() ===
        "KOLAYGELSIN") {
      if (!parcelPlan ||
          parcelPlan.shipmentId !== source.id ||
          parcelPlan.shipmentKind !== source.kind ||
          parcelPlan.orderId !== shipment.orderId ||
          Number(parcelPlan.packageCount) !== Number(packageCount) ||
          !Array.isArray(parcelPlan.parcels) ||
          parcelPlan.parcels.length !== Number(packageCount))
        throw Object.assign(
          new Error("AUTOMATIC_PARCEL_PLAN_REQUIRED"),
          {code:"AUTOMATIC_PARCEL_PLAN_REQUIRED",status:409}
        );
    }

    if (existing &&
        !["NOT_READY","READY"].includes(existing.dispatch_status))
      throw Object.assign(
        new Error("SHIPMENT_DISPATCH_STATE_INVALID"),
        {code:"SHIPMENT_DISPATCH_STATE_INVALID",status:409}
      );

    if (provider?.runtime?.provider !== "KOLAYGELSIN" && provider?.runtime?.provider !== "MOCK") throw Object.assign(new Error("SHIPMENT_PROVIDER_INVALID"), {code:"SHIPMENT_PROVIDER_INVALID",status:409});
    if (parcelPlan) buildKgMeasurementPayload(existing.reference_no, parcelPlan);
    if (parcelPlan && typeof provider.updateMeasurements !== "function") throw Object.assign(new Error("MEASUREMENT_ADAPTER_REQUIRED"), {code:"MEASUREMENT_ADAPTER_REQUIRED",status:409});
    const originalReceiverSnapshot = json(shipment.addressSnapshotJson);
    const receiverSnapshot =
      provider?.runtime?.provider === "KOLAYGELSIN"
        ? await resolveKgReceiverR411(originalReceiverSnapshot,provider)
        : originalReceiverSnapshot;

    const preflight = preflightOrderShipment({
      audience:source.kind,
      shipment:{...shipment,addressSnapshot:receiverSnapshot},
      orderStatus:shipment.orderStatus,
      items,sender,packageCount
    });
    if (!preflight.eligible) throw Object.assign(new Error(preflight.blockers[0] || "SHIPMENT_PREFLIGHT_FAILED"), { code: preflight.blockers[0] || "SHIPMENT_PREFLIGHT_FAILED", status: 409, blockers: preflight.blockers });
    const referenceNo = preflight.referenceNo || shipmentReference(source.kind, source.id);
    // Receiver snapshot was resolved before reservation.
    const providerName = ["KOLAYGELSIN", "MOCK"].includes(String(provider?.runtime?.provider || "").toUpperCase()) ? String(provider.runtime.provider).toUpperCase() : "KOLAYGELSIN";
    const dispatch = existing || (await client.query(
      `insert into shipment_dispatches(shipment_kind,${source.kind === "STUDENT" ? "shipment_id" : "trainer_order_shipment_id"},order_kind,order_id,provider_name,reference_no,dispatch_status,package_count,physical_items_json,sender_address_snapshot_json,receiver_address_snapshot_json) values($1,$2,$3,$4,$5,$6,'CREATING',$7,$8,$9,$10) returning *`,
      [source.kind, source.id, orderKind, shipment.orderId, providerName, referenceNo, Number(packageCount), JSON.stringify(items), JSON.stringify(sender), JSON.stringify(receiverSnapshot)],
    )).rows[0];
    await client.query(
      "update shipment_dispatches set dispatch_status='CREATING',provider_name=$2,attempt_count=attempt_count+1,last_attempt_at=now(),sender_address_snapshot_json=$3::jsonb,receiver_address_snapshot_json=$4::jsonb,physical_items_json=$5::jsonb,updated_at=now() where id=$1",
      [
        dispatch.id,providerName,
        JSON.stringify(sender),
        JSON.stringify(receiverSnapshot),
        JSON.stringify(items)
      ]
    );
    // Persist the creation reservation before any provider request.
    await client.query("commit");

    await client.query("begin");

    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      [`FIXOKU_SHIPMENT_DISPATCH:${source.kind}:${source.id}`]
    );

    const reserved = (await client.query(`
      select *
      from shipment_dispatches
      where id=$1
      for update
    `,[dispatch.id])).rows[0];

    if (!reserved ||
        reserved.dispatch_status !== DISPATCH_STATUS.CREATING)
      throw Object.assign(
        new Error("SHIPMENT_CREATION_RESERVATION_LOST"),
        {
          code:"SHIPMENT_CREATION_RESERVATION_LOST",
          status:409
        }
      );

    let result;
    try { result = await provider.createShipment({ referenceNo, packageCount: Number(packageCount), parcelPlan, sender, receiver: { name: [receiverSnapshot.firstName, receiverSnapshot.lastName].filter(Boolean).join(" "), phone: receiverSnapshot.phone, address: receiverSnapshot.addressLine, cityId: Number(receiverSnapshot.cityId), districtId: Number(receiverSnapshot.districtId) }, description: "FIXOKU fiziksel ürün gönderisi" }); }
    catch (cause) {
      await client.query("update shipment_dispatches set dispatch_status='REVIEW_REQUIRED',review_reason=$1,last_error_code=$2,updated_at=now() where id=$3", ["Sağlayıcı sonucu kesinleşmedi; Owner reconciliation gerekli.", text(cause?.code || cause?.message, 120) || "PROVIDER_ERROR", dispatch.id]);
      await recordAttempt(client, dispatch, "CREATE", "REVIEW_REQUIRED", { errorCode: cause?.code || "PROVIDER_ERROR" });
      await appendEvent(client, dispatch.id, DISPATCH_STATUS.REVIEW_REQUIRED, { source: "SYSTEM", metadata: { errorCode: cause?.code || "PROVIDER_ERROR" } });
      await client.query("commit");
      return { replay: false, dispatch: { ...dispatch, dispatch_status: DISPATCH_STATUS.REVIEW_REQUIRED }, providerCall: true, reviewRequired: true };
    }
    const trackingNumber = text(result?.trackingNumber || result?.providerReference, 80);
    const trackingUrl = text(result?.trackingUrl, 1024) || null;
    if (!trackingNumber) {
      const unresolved = (await client.query(`
        update shipment_dispatches
        set dispatch_status='REVIEW_REQUIRED',
            review_reason=$1,
            last_error_code='KG_TRACKING_NUMBER_MISSING',
            updated_at=now()
        where id=$2
        returning *
      `,[
        "Gönderi sonucu kesinleşmedi. Referans ile doğrulama gerekli.",
        dispatch.id
      ])).rows[0];

      await recordAttempt(
        client,unresolved,"CREATE","REVIEW_REQUIRED",
        {errorCode:"KG_TRACKING_NUMBER_MISSING"}
      );

      await appendEvent(
        client,dispatch.id,DISPATCH_STATUS.REVIEW_REQUIRED,
        {source:"SYSTEM"}
      );

      await client.query("commit");

      return {
        replay:false,
        dispatch:unresolved,
        providerCall:true,
        reviewRequired:true
      };
    }
    const updated = (await client.query(`update shipment_dispatches set dispatch_status='CREATED',measurement_status_r408=case when parcel_plan_r408_json is null then 'NOT_REQUIRED' else 'PENDING' end,provider_reference=$1,provider_tracking_number=$2,provider_tracking_url=$3,barcode_reference=coalesce(barcode_reference,$2),provider_result_json=$4,review_reason=null,last_error_code=null,updated_at=now() where id=$5 returning *`, [result.providerReference || trackingNumber, trackingNumber, trackingUrl, JSON.stringify(safeProviderResult(result)), dispatch.id])).rows[0];
    const sourceTable = source.kind === "STUDENT" ? "shipments" : "trainer_order_shipments";
    await client.query(`update ${sourceTable} set carrier=$1,tracking_number=$2,tracking_url=$3,label_reference=coalesce(label_reference,$4),provider_enabled=true,updated_at=now() where id=$5`, [providerName, trackingNumber, trackingUrl, result.providerReference || trackingNumber, source.id]);
    await recordAttempt(client, updated, "CREATE", "SUCCEEDED", { providerResult: result });
    await appendEvent(client, updated.id, DISPATCH_STATUS.CREATED, { source: "OWNER", metadata: { actorUserId, trackingNumber } });
    await client.query("commit");
    const measured = await submitShipmentMeasurements(client, updated, provider);
    return { replay: false, dispatch: measured, providerCall: true, measurementReviewRequired: ["PENDING","IN_PROGRESS","REVIEW_REQUIRED"].includes(measured.measurement_status_r408) };
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

// Called only while the caller owns the dispatch row lock and transaction.
async function reconcilePendingCancellationR408(client, dispatch, provider) {
  const reply=(d,providerCall,replay,reviewRequired)=>({status:d.dispatch_status,dispatch:d,providerCall,replay,reviewRequired,refund:"SEPARATE_OPERATION"});
  if(dispatch.dispatch_status==="CANCELLED" && dispatch.cancelled_at){await client.query("commit");return reply(dispatch,false,true,false);}
  if(Date.now()-new Date(dispatch.cancellation_requested_at).getTime()<120000 || (dispatch.last_provider_query_at && Date.now()-new Date(dispatch.last_provider_query_at).getTime()<1800000)){
    await client.query("commit");return reply(dispatch,false,true,true);
  }
  const review=async code=>{
    const d=(await client.query("update shipment_dispatches set last_provider_query_at=now(),last_error_code=$2,review_reason='Cancellation confirmation required.',updated_at=now() where id=$1 returning *",[dispatch.id,code])).rows[0];
    await recordAttempt(client,d,"RECONCILE","REVIEW_REQUIRED",{errorCode:code,providerResult:{referenceNo:dispatch.reference_no,errorCode:code}});
    await client.query("commit");return reply(d,true,false,true);
  };
  let raw,tracking;
  try{raw=await provider.getTracking(dispatch.reference_no);}catch{return await review("KG_CANCEL_QUERY_FAILED");}
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||raw.IsSuccess===false||raw.isSuccess===false||raw.IsSuccessful===false||raw.isSuccessful===false||raw.ExceptionMessage||raw.exceptionMessage||(raw.ReferenceNo??raw.referenceNo)!==dispatch.reference_no||(raw.ReferenceNo!=null&&raw.referenceNo!=null&&raw.ReferenceNo!==raw.referenceNo))return await review("KG_CANCEL_REFERENCE_UNCONFIRMED");
  try{tracking=normalizeProviderTracking(raw);}catch{return await review("KG_CANCEL_RESPONSE_INVALID");}
  if(!dispatch.provider_tracking_number||tracking.trackingNumber!==dispatch.provider_tracking_number)return await review("KG_CANCEL_TRACKING_MISMATCH");
  const states=[raw.State,raw.StateId,raw.state,raw.statusId].filter(x=>x!=null).map(String);
  const numbers=[raw.TrackingNumber,raw.TrackingNo,raw.trackingNumber,raw.trackingNo].filter(x=>x!=null).map(String);
  if(!states.length||states.some(x=>x!==states[0])||numbers.some(x=>x!==dispatch.provider_tracking_number)||!["133","139"].includes(states[0])||tracking.dispatchStatus!=="CANCELLED")return await review("KG_CANCEL_NOT_CONFIRMED");
  const eventTime=tracking.updatedAt?new Date(tracking.updatedAt):null;
  const prior=(await client.query("select max(event_at) as latest from shipment_status_events where dispatch_id=$1 and source in ('PROVIDER','RECONCILIATION')",[dispatch.id])).rows[0]?.latest;
  if(eventTime&&(!Number.isFinite(eventTime.getTime())||eventTime<new Date(dispatch.cancellation_requested_at)||eventTime.getTime()>Date.now()+300000))return await review("KG_CANCEL_DATE_INVALID");
  if(prior&&(!eventTime||eventTime<new Date(prior)))return await review("KG_CANCEL_STALE_RESPONSE");
  const table=dispatch.shipment_kind==="STUDENT"?"shipments":"trainer_order_shipments";
  const sourceId=dispatch.shipment_kind==="STUDENT"?dispatch.shipment_id:dispatch.trainer_order_shipment_id;
  const sync=await client.query(`update ${table} set status='CANCELLED',updated_at=now() where id=$1 and status in ('PACKED','CANCELLED') returning id`,[sourceId]);
  if(sync.rowCount!==1)return await review("SHIPMENT_CANCEL_SOURCE_CONFLICT");
  const d=(await client.query("update shipment_dispatches set dispatch_status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),last_provider_query_at=now(),review_reason=null,last_error_code=null,updated_at=now() where id=$1 returning *",[dispatch.id])).rows[0];
  await recordAttempt(client,d,"RECONCILE","SUCCEEDED",{providerResult:{referenceNo:dispatch.reference_no,trackingNumber:tracking.trackingNumber,cancelled:true}});
  await appendEvent(client,d.id,"CANCELLED",{source:"RECONCILIATION",providerStatusId:tracking.providerStatusId,eventAt:tracking.updatedAt});
  await client.query("commit");return reply(d,true,false,false);
}

// Provider-reported gross TRY is evidence, not the settled invoice cost.
export function kgReportedCostMinorR408(raw) {
  const v=raw?.CargoAmount;
  if(typeof v!=="number" || !Number.isFinite(v) || v<=0) return null;
  const minor=Math.round(v*100);
  if(minor<1 || minor>2147483647 || Math.abs(v*100-minor)>0.000001) return null;
  return minor;
}

export async function trackShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_TRACK:${dispatchId}`]);
    const dispatch=(await client.query("select * from shipment_dispatches where id=$1 for update",[dispatchId])).rows[0];
    const fail=code=>{throw Object.assign(new Error(code),{code,status:409});};
    if(!dispatch) fail("SHIPMENT_DISPATCH_NOT_FOUND");
    if(!["KOLAYGELSIN","MOCK"].includes(dispatch.provider_name)||provider?.runtime?.provider!==dispatch.provider_name) fail("SHIPMENT_PROVIDER_MISMATCH");
    if(dispatch.cancellation_requested_at && !dispatch.cancelled_at) return await reconcilePendingCancellationR408(client,dispatch,provider);
    if(["DELIVERED","CANCELLED"].includes(dispatch.dispatch_status)){await client.query("commit");return {replay:true,dispatch,providerCall:false};}
    const transitions={CREATED:["CREATED","HANDED_OVER","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","RETURNING","CANCELLED"],HANDED_OVER:["HANDED_OVER","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","RETURNING","CANCELLED"],IN_TRANSIT:["IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","RETURNING","CANCELLED"],OUT_FOR_DELIVERY:["OUT_FOR_DELIVERY","DELIVERED","RETURNING","CANCELLED"],RETURNING:["RETURNING","CANCELLED"]};
    if(!transitions[dispatch.dispatch_status]) fail("SHIPMENT_RECONCILIATION_REQUIRED");
    if(dispatch.last_provider_query_at && Date.now()-new Date(dispatch.last_provider_query_at).getTime()<30*60*1000){await client.query("commit");return {replay:true,dispatch,providerCall:false};}
    const review=async code=>{
      const updated=(await client.query("update shipment_dispatches set last_provider_query_at=now(),last_error_code=$2,review_reason='Tracking response requires review.',updated_at=now() where id=$1 returning *",[dispatch.id,code])).rows[0];
      await recordAttempt(client,updated,"TRACK","REVIEW_REQUIRED",{errorCode:code});
      await client.query("commit");
      return {replay:false,dispatch:updated,providerCall:true,reviewRequired:true};
    };
    let raw,tracking;
    try{raw=await provider.getTracking(dispatch.reference_no);}catch{return await review("KG_TRACK_REQUEST_FAILED");}
    if(!raw||typeof raw!=="object"||Array.isArray(raw)||raw.IsSuccess===false||raw.isSuccess===false||raw.ExceptionMessage||(raw.ReferenceNo??raw.referenceNo)!==dispatch.reference_no||(raw.ReferenceNo!=null&&raw.referenceNo!=null&&raw.ReferenceNo!==raw.referenceNo)) return await review("KG_TRACK_REFERENCE_UNCONFIRMED");
    try{tracking=normalizeProviderTracking(raw);}catch{return await review("KG_TRACK_RESPONSE_INVALID");}
    if(!tracking.trackingNumber||tracking.trackingNumber!==dispatch.provider_tracking_number) return await review("KG_TRACK_NUMBER_MISMATCH");
    if(!transitions[dispatch.dispatch_status].includes(tracking.dispatchStatus)) return await review("KG_TRACK_STATE_UNCONFIRMED");
    const eventTime=tracking.updatedAt?new Date(tracking.updatedAt):null;
    if(eventTime&&!Number.isFinite(eventTime.getTime())) return await review("KG_TRACK_DATE_INVALID");
    const prior=(await client.query("select max(event_at) as latest from shipment_status_events where dispatch_id=$1 and source='PROVIDER'",[dispatch.id])).rows[0]?.latest;
    if(prior&&(!eventTime||eventTime<new Date(prior))) return await review("KG_TRACK_STALE_RESPONSE");
    const status=tracking.dispatchStatus;
    const updated=(await client.query(`update shipment_dispatches set dispatch_status=$1,provider_tracking_url=coalesce($2,provider_tracking_url),provider_result_json=$3,last_provider_query_at=now(),updated_at=now(),review_reason=null,last_error_code=null where id=$4 returning *`,[status,tracking.trackingUrl,JSON.stringify(safeProviderResult(raw)),dispatch.id])).rows[0];
    const table=dispatch.shipment_kind==="STUDENT"?"shipments":"trainer_order_shipments";
    const sourceId=dispatch.shipment_kind==="STUDENT"?dispatch.shipment_id:dispatch.trainer_order_shipment_id;
    const sourceStatus=({HANDED_OVER:"SHIPPED",IN_TRANSIT:"SHIPPED",OUT_FOR_DELIVERY:"SHIPPED",DELIVERED:"DELIVERED",CANCELLED:"CANCELLED"})[status] || null;
    const sync=await client.query(`update ${table} set carrier=$1,tracking_number=$2,tracking_url=coalesce($3,tracking_url),
      status=coalesce($5::shipment_status,status),
      shipped_at=case when $5::text in ('SHIPPED','DELIVERED') then coalesce(shipped_at,now()) else shipped_at end,
      delivered_at=case when $5::text='DELIVERED' then coalesce(delivered_at,now()) else delivered_at end,
      updated_at=now() where id=$4 and ($5::text is null or status::text=$5::text or
      ($5::text='SHIPPED' and status::text='PACKED') or
      ($5::text='DELIVERED' and status::text in ('PACKED','SHIPPED')) or
      ($5::text='CANCELLED' and status::text in ('PACKED','SHIPPED')))`,[dispatch.provider_name,tracking.trackingNumber,tracking.trackingUrl,sourceId,sourceStatus]);
    if(sync.rowCount!==1) fail("SHIPMENT_SOURCE_MISSING");
    const reported=dispatch.provider_name==="KOLAYGELSIN"?kgReportedCostMinorR408(raw):null;
    const costEvidence=reported==null?{}:{reportedCargoCostMinorR408:reported,reportedCargoCurrencyR408:"TRY",reportedCargoObservedAtR408:new Date().toISOString()};
    await recordAttempt(client,updated,"TRACK","SUCCEEDED",{providerResult:{...safeProviderResult(raw),referenceNo:dispatch.reference_no,...costEvidence}});
    await appendEvent(client,updated.id,status,{source:"PROVIDER",providerStatusId:tracking.providerStatusId,providerStatusText:tracking.providerStatusText,eventAt:tracking.updatedAt,metadata:{trackingNumber:tracking.trackingNumber}});
    await client.query("commit");
    return {replay:false,dispatch:updated,tracking,providerCall:true};
  } catch(error){await client.query("rollback").catch(()=>{});throw error;}
}

// Bounded batch; caller must explicitly schedule and authorize it.
export async function runShipmentTrackingBatchR408(client,{provider,limit=5}={}){
  if(provider?.runtime?.provider!=="KOLAYGELSIN"||provider.runtime.enabled!==true) throw new Error("TRACKING_PROVIDER_DISABLED");
  if(!Number.isInteger(limit)||limit<1||limit>5) throw new Error("TRACKING_BATCH_LIMIT_INVALID");
  const lock=(await client.query("select pg_try_advisory_lock(hashtext('fixoku-r408-tracking-batch')) as locked")).rows[0]?.locked;
  if(!lock)return {status:"ALREADY_RUNNING",processed:0};
  try{
    const rows=(await client.query(`select id from shipment_dispatches where provider_name='KOLAYGELSIN' and dispatch_status in ('CREATED','HANDED_OVER','IN_TRANSIT','OUT_FOR_DELIVERY','RETURNING') and (last_provider_query_at is null or last_provider_query_at<=now()-interval '30 minutes') order by last_provider_query_at nulls first,id limit $1`,[limit])).rows;
    let processed=0,reviewRequired=0,errors=0;
    for(const row of rows){try{const r=await trackShipment(client,{dispatchId:row.id,provider});if(r.providerCall)processed++;if(r.reviewRequired)reviewRequired++;}catch{errors++;}}
    return {status:errors||reviewRequired?"REVIEW_REQUIRED":"COMPLETED",processed,reviewRequired,errors};
  }finally{await client.query("select pg_advisory_unlock(hashtext('fixoku-r408-tracking-batch'))");}
}

export async function cancelShipment(client, { dispatchId, provider } = {}) {
  const fail=(code,status=409)=>Object.assign(new Error(code),{code,status});
  const read=async()=> (await client.query("select * from shipment_dispatches where id=$1 for update",[dispatchId])).rows[0];
  const check=d=>{
    if(!d)throw fail("SHIPMENT_DISPATCH_NOT_FOUND",404);
    if(!["KOLAYGELSIN","MOCK"].includes(d.provider_name)||provider?.runtime?.provider!==d.provider_name)throw fail("SHIPMENT_PROVIDER_MISMATCH");
  };
  const reply=(dispatch,providerCall,replay,reviewRequired=false)=>({dispatch,providerCall,replay,reviewRequired,refund:"SEPARATE_OPERATION"});
  await client.query("begin");
  try {
    const d=await read();check(d);
    if(d.dispatch_status==="CANCELLED"){await client.query("commit");return reply(d,false,true);}
    if(d.cancellation_requested_at){await client.query("commit");return reply(d,false,true,true);}
    if(d.dispatch_status!=="CREATED")throw fail("SHIPMENT_CANCEL_NOT_ALLOWED");
    if(["PENDING","IN_PROGRESS"].includes(d.measurement_status_r408))throw fail("SHIPMENT_MEASUREMENT_UNRESOLVED");
    if(!/^[A-Za-z0-9._-]{1,50}$/.test(d.reference_no||"")||!d.provider_tracking_number)throw fail("SHIPMENT_CANCEL_REFERENCE_UNVERIFIED");
    await client.query("update shipment_dispatches set cancellation_requested_at=now(),review_reason='Cancellation confirmation pending.',updated_at=now() where id=$1",[d.id]);
    await client.query("commit");
    await client.query("begin");
    const reserved=await read();check(reserved);
    if(reserved.dispatch_status!=="CREATED"){await client.query("commit");return reply(reserved,false,false,reserved.dispatch_status!=="CANCELLED");}
    let confirmed=false;
    try { confirmed=(await provider.cancelShipment(reserved.reference_no))?.cancelled===true; } catch { /* No automatic retry after ambiguous response. */ }
    if(!confirmed){
      const pending=(await client.query("update shipment_dispatches set review_reason='Cancellation confirmation required.',last_error_code='KG_CANCEL_NOT_CONFIRMED',updated_at=now() where id=$1 returning *",[reserved.id])).rows[0];
      await recordAttempt(client,pending,"CANCEL","REVIEW_REQUIRED",{errorCode:"KG_CANCEL_NOT_CONFIRMED"});
      await client.query("commit");return reply(pending,true,false,true);
    }
    const updated=(await client.query("update shipment_dispatches set dispatch_status='CANCELLED',cancelled_at=coalesce(cancelled_at,now()),review_reason=null,last_error_code=null,updated_at=now() where id=$1 returning *",[reserved.id])).rows[0];
    const table=reserved.shipment_kind==="STUDENT"?"shipments":"trainer_order_shipments";
    const sourceId=reserved.shipment_kind==="STUDENT"?reserved.shipment_id:reserved.trainer_order_shipment_id;
    const synced=await client.query(`update ${table} set status='CANCELLED',updated_at=now() where id=$1 and status in ('PACKED','CANCELLED') returning id`,[sourceId]);
    if(synced.rowCount!==1)throw fail("SHIPMENT_CANCEL_SOURCE_CONFLICT");
    await recordAttempt(client,updated,"CANCEL","SUCCEEDED",{providerResult:{referenceNo:reserved.reference_no,cancelled:true}});
    await appendEvent(client,updated.id,DISPATCH_STATUS.CANCELLED,{source:"OWNER"});
    await client.query("commit");return reply(updated,true,false);
  }catch(error){await client.query("rollback").catch(()=>{});throw error;}
}

function barcodeMimeR408(payload, dispatch) {
  const fail = () => { throw Object.assign(new Error("KG_BARCODE_FORMAT_UNVERIFIED"), {code:"KG_BARCODE_FORMAT_UNVERIFIED",status:502}); };
  if (typeof payload !== "string" || !payload.length || payload.length > 1400000 || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) fail();
  const bytes = Buffer.from(payload,"base64");
  if (bytes.toString("base64") !== payload) fail();
  if (dispatch.provider_name === "MOCK") {
    if (bytes.toString("utf8") !== `MOCK:${dispatch.reference_no}`) fail();
    return null;
  }
  if (bytes.length >= 45 && bytes.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex")) && bytes.readUInt32BE(8)===13 && bytes.toString("ascii",12,16)==="IHDR" && bytes.readUInt32BE(16)>0 && bytes.readUInt32BE(16)<=12000 && bytes.readUInt32BE(20)>0 && bytes.readUInt32BE(20)<=12000 && bytes.readUInt32BE(16)*bytes.readUInt32BE(20)<=40000000 && bytes.subarray(-12).equals(Buffer.from("0000000049454e44ae426082","hex"))) return "image/png";
  // The vendor documents Base64, not its decoded file type. Only PNG is enabled
  // until another actual label format is verified; never render active content.
  fail();
}

export async function barcodeShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    const dispatch = (await client.query("select * from shipment_dispatches where id=$1 for update", [dispatchId])).rows[0];
    if (!dispatch) throw Object.assign(new Error("SHIPMENT_DISPATCH_NOT_FOUND"), {code:"SHIPMENT_DISPATCH_NOT_FOUND",status:404});
    const fail = (code,status=409) => {throw Object.assign(new Error(code),{code,status});};
    if (!["KOLAYGELSIN","MOCK"].includes(dispatch.provider_name) || provider?.runtime?.provider !== dispatch.provider_name) fail("SHIPMENT_PROVIDER_MISMATCH");
    if (!["CREATED","HANDED_OVER","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED"].includes(dispatch.dispatch_status)) fail("SHIPMENT_BARCODE_NOT_AVAILABLE");
    if (dispatch.measurement_status_r408 !== "CONFIRMED" && !(dispatch.provider_name === "MOCK" && !dispatch.parcel_plan_r408_json && dispatch.measurement_status_r408 === "NOT_REQUIRED")) fail("SHIPMENT_MEASUREMENT_REVIEW_REQUIRED");
    if (dispatch.cancellation_requested_at && !dispatch.cancelled_at) fail("SHIPMENT_CANCEL_REVIEW_REQUIRED");
    if (dispatch.provider_name === "KOLAYGELSIN" && Number(dispatch.package_count)!==1) fail("KG_MULTI_PARCEL_LABEL_UNVERIFIED");
    if (!dispatch.provider_tracking_number || !/^[A-Za-z0-9._-]{1,50}$/.test(dispatch.reference_no || "")) fail("SHIPMENT_BARCODE_REFERENCE_UNVERIFIED");
    if (dispatch.barcode_payload && dispatch.barcode_reference === dispatch.reference_no) {
      const barcodeMime=barcodeMimeR408(dispatch.barcode_payload,dispatch);
      await client.query("commit"); return {replay:true,dispatch,providerCall:false,barcodeMime};
    }
    const result = await provider.createLabel(dispatch.reference_no);
    if (!result || typeof result!=="object" || Array.isArray(result)) fail("KG_BARCODE_FORMAT_UNVERIFIED",502);
    if (result.IsSuccess===false || result.isSuccess===false || result.ExceptionMessage || result.exceptionMessage) fail("KG_BARCODE_PROVIDER_REJECTED",502);
    for (const key of ["ReferenceNo","referenceNo"]) if(result[key]!=null && result[key]!==dispatch.reference_no) fail("KG_BARCODE_REFERENCE_MISMATCH",502);
    const tracking = dispatch.provider_name === "MOCK" ? result.BarcodeNumbers : result.TrackingNumber ?? result.trackingNumber;
    if (String(tracking??"") !== dispatch.provider_tracking_number || (result.TrackingNumber!=null && result.trackingNumber!=null && String(result.TrackingNumber)!==String(result.trackingNumber))) fail("KG_BARCODE_TRACKING_MISMATCH",502);
    const barcode=result.Barcode ?? result.barcode;
    if(result.Barcode!=null && result.barcode!=null && result.Barcode!==result.barcode) fail("KG_BARCODE_FORMAT_UNVERIFIED",502);
    const barcodeMime=barcodeMimeR408(barcode,dispatch);
    const updated = (await client.query("update shipment_dispatches set barcode_reference=reference_no,barcode_payload=$1,updated_at=now() where id=$2 returning *", [barcode,dispatch.id])).rows[0];
    await recordAttempt(client, updated, "BARCODE", "SUCCEEDED", {providerResult:{referenceNo:dispatch.reference_no,trackingNumber:tracking,format:barcodeMime||"MOCK"}});
    await client.query("commit");
    return {replay:false,dispatch:updated,providerCall:true,barcodeMime};
  } catch (error) { await client.query("rollback").catch(()=>{}); throw error; }
}


export async function reconcileShipment(client, { dispatchId, provider } = {}) {
  await client.query("begin");
  try {
    const dispatch = (await client.query("select * from shipment_dispatches where id=$1 for update", [dispatchId])).rows[0];
    if (!dispatch) throw Object.assign(new Error("SHIPMENT_DISPATCH_NOT_FOUND"), {code:"SHIPMENT_DISPATCH_NOT_FOUND",status:404});
    if (!["KOLAYGELSIN","MOCK"].includes(dispatch.provider_name) || provider?.runtime?.provider !== dispatch.provider_name)
      throw Object.assign(new Error("SHIPMENT_PROVIDER_MISMATCH"), {code:"SHIPMENT_PROVIDER_MISMATCH",status:409});
    if(dispatch.cancellation_requested_at && !dispatch.cancelled_at) return await reconcilePendingCancellationR408(client,dispatch,provider);
    if (!["CREATING","REVIEW_REQUIRED"].includes(dispatch.dispatch_status))
      throw Object.assign(new Error("SHIPMENT_RECONCILIATION_NOT_REQUIRED"), {code:"SHIPMENT_RECONCILIATION_NOT_REQUIRED",status:409});
    if (dispatch.dispatch_status === "CREATING" && dispatch.last_attempt_at && Date.now()-new Date(dispatch.last_attempt_at).getTime()<120000)
      throw Object.assign(new Error("SHIPMENT_CREATION_IN_PROGRESS"), {code:"SHIPMENT_CREATION_IN_PROGRESS",status:409});
    const fail = async code => {
      const updated=(await client.query(`update shipment_dispatches set dispatch_status='REVIEW_REQUIRED', review_reason='Provider reference verification required.', last_error_code=$2,last_provider_query_at=now(),updated_at=now() where id=$1 returning *`,[dispatch.id,code])).rows[0];
      await recordAttempt(client,updated,"RECONCILE","REVIEW_REQUIRED",{errorCode:code});
      await appendEvent(client,updated.id,"REVIEW_REQUIRED",{source:"RECONCILIATION",metadata:{errorCode:code}});
      await client.query("commit");
      return {status:"REVIEW_REQUIRED",providerCall:true,reviewRequired:true,dispatch:updated};
    };
    let raw, tracking;
    try { raw=await provider.getTracking(dispatch.reference_no); }
    catch(cause) { return await fail(/^[A-Z0-9_]{1,120}$/.test(cause?.code||'') ? cause.code : 'PROVIDER_ERROR'); }
    if (!raw || typeof raw!=="object" || Array.isArray(raw) || (raw.ReferenceNo ?? raw.referenceNo)!==dispatch.reference_no || (raw.ReferenceNo!=null && raw.referenceNo!=null && raw.ReferenceNo!==raw.referenceNo)) return await fail("KG_RECONCILE_REFERENCE_MISMATCH");
    try { tracking=normalizeProviderTracking(raw); } catch { return await fail("KG_RECONCILE_RESPONSE_INVALID"); }
    if (!tracking.dispatchStatus || tracking.dispatchStatus==="REVIEW_REQUIRED" || !tracking.trackingNumber || (dispatch.provider_tracking_number && dispatch.provider_tracking_number!==tracking.trackingNumber)) return await fail("KG_RECONCILE_RESULT_UNCONFIRMED");
    const status=tracking.dispatchStatus;
    const updated=(await client.query(`update shipment_dispatches set dispatch_status=$1,provider_reference=coalesce(provider_reference,reference_no),provider_tracking_number=$2,provider_tracking_url=coalesce($3,provider_tracking_url),provider_result_json=$4,last_provider_query_at=now(),review_reason=null,last_error_code=null,measurement_status_r408=case when parcel_plan_r408_json is not null and measurement_status_r408 in ('NOT_REQUIRED','PENDING') then 'REVIEW_REQUIRED' else measurement_status_r408 end,updated_at=now() where id=$5 returning *`,[status,tracking.trackingNumber,tracking.trackingUrl,JSON.stringify(safeProviderResult(raw)),dispatch.id])).rows[0];
    const table=dispatch.shipment_kind==='STUDENT'?'shipments':'trainer_order_shipments';
    const sourceId=dispatch.shipment_kind==='STUDENT'?dispatch.shipment_id:dispatch.trainer_order_shipment_id;
    await client.query(`update ${table} set carrier=$1,tracking_number=$2,tracking_url=coalesce($3,tracking_url),provider_enabled=true,updated_at=now() where id=$4`,[dispatch.provider_name,tracking.trackingNumber,tracking.trackingUrl,sourceId]);
    await recordAttempt(client,updated,"RECONCILE","SUCCEEDED",{providerResult:safeProviderResult(raw)});
    await appendEvent(client,updated.id,status,{source:"RECONCILIATION",providerStatusId:tracking.providerStatusId,providerStatusText:tracking.providerStatusText});
    await client.query("commit");
    return {status,providerCall:true,dispatch:updated,measurementReviewRequired:["PENDING","IN_PROGRESS","REVIEW_REQUIRED"].includes(updated.measurement_status_r408)};
  } catch(error) { await client.query("rollback").catch(()=>{}); throw error; }
}
