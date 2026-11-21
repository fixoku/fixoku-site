import {
  parcelError,
  countShipmentBooks,
  buildBookParcelPlan,
  normalizeBookParcelProfile
} from "./book-parcel-profiles-r408.js";

import crypto from "node:crypto";
import { buildKgMeasurementPayload } from "./kolaygelsin-measurements-r408.js";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function calculateShipmentParcelPlan(
  client,
  shipmentKind,
  shipmentId
) {
  if (!["STUDENT","TRAINER"].includes(shipmentKind) ||
      !uuid.test(String(shipmentId || "")))
    throw parcelError("SHIPMENT_REFERENCE_INVALID");

  const student = shipmentKind === "STUDENT";

  const shipmentTable = student
    ? "shipments" : "trainer_order_shipments";

  const orderTable = student
    ? "orders" : "trainer_package_orders";

  const itemTable = student
    ? "shipment_items" : "trainer_order_shipment_items";

  const itemForeignKey = student
    ? "shipment_id" : "trainer_order_shipment_id";

  const shipment = (await client.query(`
    select
      s.id,
      s.order_id as "orderId",
      s.status,
      o.status as "orderStatus"
    from ${shipmentTable} s
    join ${orderTable} o on o.id=s.order_id
    where s.id=$1
  `,[shipmentId])).rows[0];

  if (!shipment)
    throw parcelError("SHIPMENT_NOT_FOUND");

  if (shipment.orderStatus !== "PAID")
    throw parcelError("PAYMENT_NOT_SETTLED");

  const items = (await client.query(`
    select
      si.quantity,
      pp.product_type as "productType",
      pp.r6_product_type as "r6ProductType"
    from ${itemTable} si
    left join physical_products pp
      on pp.id=si.physical_product_id
    where si.${itemForeignKey}=$1
    order by si.id
  `,[shipmentId])).rows;

  if (!items.length)
    throw parcelError("PHYSICAL_ITEMS_REQUIRED");

  const bookCount = countShipmentBooks(items);

  if (!bookCount)
    throw parcelError("BOOK_SHIPMENT_NOT_REQUIRED");

  const profiles = (await client.query(`
    select
      book_count as "bookCount",
      package_count as "packageCount",
      width_cm as "widthCm",
      length_cm as "lengthCm",
      height_cm as "heightCm",
      weight_kg as "weightKg"
    from public.book_parcel_profiles_r408
    order by book_count
  `)).rows;

  const plan = buildBookParcelPlan(bookCount,profiles);

  return {
    schemaVersion:1,
    source:"OWNER_BOOK_PARCEL_PROFILES",
    shipmentKind,
    shipmentId,
    orderId:shipment.orderId,
    ...plan
  };
}

// Caller must wrap this function in a transaction. The same lock is used by PACK and DISPATCH.
export function parcelRevisionR408(plan) {
  return crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
export async function overrideSavedParcelPlanR408(client, kind, id, input, actor) {
  if (!["STUDENT","TRAINER"].includes(kind) || !uuid.test(id) || !uuid.test(actor)) throw parcelError("SHIPMENT_REFERENCE_INVALID");
  if (typeof input.reason !== "string" || input.reason.trim().length < 5 || input.reason.trim().length > 300) throw parcelError("PARCEL_REASON_REQUIRED");
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_DISPATCH:${kind}:${id}`]);
  const student = kind === "STUDENT";
  const row = (await client.query(`select s.id,s.order_id,s.status,o.status as order_status from ${student?"shipments":"trainer_order_shipments"} s join ${student?"orders":"trainer_package_orders"} o on o.id=s.order_id where s.id=$1 for update of s,o`,[id])).rows[0];
  if (!row || row.status !== "PACKED" || row.order_status !== "PAID") throw parcelError("PARCEL_PLAN_LOCKED");
  const dispatch = (await client.query(`select * from shipment_dispatches where ${student?"shipment_id":"trainer_order_shipment_id"}=$1 for update`,[id])).rows[0];
  const old = dispatch?.parcel_plan_r408_json;
  if (!old || dispatch.dispatch_status !== "READY" || dispatch.cancellation_requested_at || dispatch.last_attempt_at || Number(dispatch.attempt_count)!==0 || old.shipmentId!==id || old.shipmentKind!==kind || old.orderId!==row.order_id || old.packageCount!==Number(dispatch.package_count)) throw parcelError("PARCEL_PLAN_LOCKED");
  if (input.revision !== parcelRevisionR408(old)) throw parcelError("PARCEL_PLAN_STALE");
  if (!Array.isArray(input.parcels) || input.parcels.length!==old.packageCount || !Array.isArray(old.parcels) || old.parcels.length!==old.packageCount) throw parcelError("PARCEL_PLAN_INVALID");
  const parcels = old.parcels.map((p,i)=>{
    const v=input.parcels[i];
    if (!v || v.parcelNo!==p.parcelNo || Object.keys(v).some(k=>!["parcelNo","widthCm","lengthCm","heightCm","weightKg"].includes(k))) throw parcelError("PARCEL_PLAN_INVALID");
    return {...normalizeBookParcelProfile({bookCount:p.bookCount,packageCount:1,widthCm:v.widthCm,lengthCm:v.lengthCm,heightCm:v.heightCm,weightKg:v.weightKg}),parcelNo:p.parcelNo};
  });
  const next={...old,parcels,totalWeightKg:Math.round(parcels.reduce((n,p)=>n+p.weightKg,0)*1000)/1000,totalEstimatedDesi:Math.round(parcels.reduce((n,p)=>n+p.estimatedDesi,0)*100)/100};
  buildKgMeasurementPayload(dispatch.reference_no,next);
  const updated=(await client.query("update shipment_dispatches set parcel_plan_r408_json=$1::jsonb,updated_at=now() where id=$2 and dispatch_status='READY' returning parcel_plan_r408_json",[JSON.stringify(next),dispatch.id])).rows[0];
  if (!updated) throw parcelError("PARCEL_PLAN_LOCKED");
  await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'shipment.parcel.override','shipment_dispatch',$2,'SUCCESS',gen_random_uuid(),$3)",[actor,dispatch.id,JSON.stringify({reason:input.reason.trim(),before:old.parcels,after:next.parcels})]);
  return {plan:updated.parcel_plan_r408_json,saved:true,editable:true,revision:parcelRevisionR408(updated.parcel_plan_r408_json)};
}
