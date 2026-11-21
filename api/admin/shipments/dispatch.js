import {
  calculateShipmentParcelPlan,
  overrideSavedParcelPlanR408, parcelRevisionR408
} from "../../../src/server/shipping/book-parcel-plan-db-r408.js";

import pg from "../../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission, requireMembership } from "../../../src/server/auth/authorization.js";
import { createShippingAdapter } from "../../../src/server/shipping/adapter.js";
import { dispatchShipment, trackShipment, cancelShipment, barcodeShipment, reconcileShipment } from "../../../src/server/shipping/dispatch.js";
import { shipmentReference } from "../../../src/server/shipping/order-preflight.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, String(v)]));
async function body(req) { let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 10000) throw Object.assign(new Error("REQUEST_TOO_LARGE"), { status: 413 }); } return raw ? JSON.parse(raw) : {}; }

async function markPacked(client, kind, id, actorUserId) {
  if (!['STUDENT', 'TRAINER'].includes(kind) || !UUID.test(id)) throw Object.assign(new Error("SHIPMENT_REFERENCE_INVALID"), { status: 400 });
  const isStudent = kind === "STUDENT";
  const table = isStudent ? "shipments" : "trainer_order_shipments";
  const itemTable = isStudent ? "shipment_items" : "trainer_order_shipment_items";
  const row = (await client.query(`select s.id,s.order_id as "orderId",s.status,o.status as "orderStatus",s.address_snapshot_json as "addressSnapshotJson" from ${table} s join ${isStudent ? "orders" : "trainer_package_orders"} o on o.id=s.order_id where s.id=$1 for update`, [id])).rows[0];
  if (!row) throw Object.assign(new Error("SHIPMENT_NOT_FOUND"), { status: 404 });
  if (row.orderStatus !== "PAID") throw Object.assign(new Error("PAYMENT_NOT_SETTLED"), { status: 409 });
  const count = Number((await client.query(`select count(*)::int as count from ${itemTable} where ${isStudent ? "shipment_id" : "trainer_order_shipment_id"}=$1`, [id])).rows[0]?.count || 0);
  if (!count) throw Object.assign(new Error("PHYSICAL_ITEMS_REQUIRED"), { status: 409 });

  if (!["WAITING", "PREPARING", "PACKED"].includes(row.status)) throw Object.assign(new Error("INVALID_SHIPMENT_TRANSITION"), { status: 409 });
  if (row.status !== "PACKED") await client.query(`update ${table} set status='PACKED',updated_at=now() where id=$1`, [id]);
  const ref = shipmentReference(kind, id);
  const existing = (await client.query(`select * from shipment_dispatches where ${isStudent ? "shipment_id" : "trainer_order_shipment_id"}=$1 for update`, [id])).rows[0];
  if (existing &&
      !["NOT_READY","READY"].includes(existing.dispatch_status))
    throw Object.assign(
      new Error("SHIPMENT_PACKAGE_LOCKED"),
      {code:"SHIPMENT_PACKAGE_LOCKED",status:409}
    );

  const parcelPlan =
    existing?.parcel_plan_r408_json ||
    await calculateShipmentParcelPlan(client,kind,id);

  const packageCount = Number(parcelPlan.packageCount);

  if (!Number.isSafeInteger(packageCount) ||
      packageCount < 1 || packageCount > 999 ||
      parcelPlan.shipmentId !== id ||
      parcelPlan.shipmentKind !== kind ||
      parcelPlan.orderId !== row.orderId)
    throw Object.assign(
      new Error("PARCEL_PLAN_INVALID"),
      {code:"PARCEL_PLAN_INVALID",status:409}
    );

  let dispatch = existing || (await client.query(`insert into shipment_dispatches(shipment_kind,${isStudent ? "shipment_id" : "trainer_order_shipment_id"},order_kind,order_id,provider_name,reference_no,dispatch_status,package_count,receiver_address_snapshot_json) values($1,$2,$3,$4,'KOLAYGELSIN',$5,'READY',$6,$7) returning *`, [kind, id, isStudent ? "STUDENT_ORDER" : "TRAINER_PACKAGE_ORDER", row.orderId, ref, Number(packageCount), row.addressSnapshotJson || "{}"])).rows[0];
  if (existing) {
    dispatch = (await client.query(`
      update shipment_dispatches
      set dispatch_status='READY',
          package_count=$1,
          updated_at=now()
      where id=$2
      and dispatch_status in ('NOT_READY','READY')
      returning *
    `,[Number(packageCount),existing.id])).rows[0];

    if (!dispatch)
      throw Object.assign(
        new Error("SHIPMENT_PACKAGE_LOCKED"),
        {code:"SHIPMENT_PACKAGE_LOCKED",status:409}
      );
  }
  dispatch = (await client.query(`
    update shipment_dispatches
    set parcel_plan_r408_json=$1::jsonb,
        package_count=$2,
        updated_at=now()
    where id=$3
    and dispatch_status in ('NOT_READY','READY')
    returning *
  `,[
    JSON.stringify(parcelPlan),
    packageCount,
    dispatch.id
  ])).rows[0];

  if (!dispatch)
    throw Object.assign(
      new Error("PARCEL_PLAN_LOCKED"),
      {code:"PARCEL_PLAN_LOCKED",status:409}
    );

  await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'shipment.packed','shipment_dispatch',$2,'SUCCESS',gen_random_uuid(),$3)", [actorUserId, dispatch.id, JSON.stringify({ shipmentKind: kind, packageCount: Number(packageCount), itemCount: count })]);
  return dispatch;
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, req.method === "GET" ? "shipment.read" : "shipment.manage");
  if (denied) return json(res, denied.status, denied.body);
  if (req.method !== "POST" && req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const input = req.method === "GET" ? Object.fromEntries(new URL(req.url || "/", "http://local").searchParams.entries()) : await body(req);
    const kind = String(input.shipmentKind || input.kind || "").toUpperCase();
    const sourceId = String(input.shipmentId || input.id || "");
    const action = String(input.action || (req.method === "GET" ? "GET" : "DISPATCH")).toUpperCase();
    if (!["STUDENT","TRAINER"].includes(kind) ||
        !UUID.test(sourceId))
      return json(res,400,{
        error:"SHIPMENT_REFERENCE_INVALID"
      });

    if (req.method === "GET" && !["GET","PARCEL_PLAN"].includes(action))
      return json(res,405,{
        error:"METHOD_NOT_ALLOWED"
      });

    if (req.method === "POST" && action === "GET")
      return json(res,405,{
        error:"METHOD_NOT_ALLOWED"
      });

    if (action === "PARCEL_OVERRIDE") {
      if (req.method !== "POST") return json(res,405,{error:"METHOD_NOT_ALLOWED"});
      let origin;
      try { origin=new URL(process.env.APP_ORIGIN).origin; } catch { return json(res,503,{error:"ORIGIN_NOT_CONFIGURED"}); }
      if (req.headers.origin!==origin) return json(res,403,{error:"ORIGIN_FORBIDDEN"});
      const deniedOwner=requireMembership(principal,"OWNER");
      if (deniedOwner) return json(res,deniedOwner.status,deniedOwner.body);
      await client.query("begin");
      try {
        const result=await overrideSavedParcelPlanR408(client,kind,sourceId,input,principal.user.id);
        await client.query("commit"); return json(res,200,result);
      } catch(error) { await client.query("rollback").catch(()=>{}); throw error; }
    }
    if (action === "PARCEL_PLAN") {
      if (req.method !== "GET")
        return json(res,405,{error:"METHOD_NOT_ALLOWED"});

      await client.query(
        "begin isolation level repeatable read read only"
      );

      try {
        const existingPlan = (await client.query(`
          select parcel_plan_r408_json,dispatch_status
          from shipment_dispatches
          where ${kind === "STUDENT"
            ? "shipment_id"
            : "trainer_order_shipment_id"}=$1
        `,[sourceId])).rows[0];

        if (existingPlan?.parcel_plan_r408_json) {
          await client.query("commit");

          return json(res,200,{
            plan:existingPlan.parcel_plan_r408_json,
            saved:true,
            editable:existingPlan.dispatch_status === "READY" && !requireMembership(principal,"OWNER"),
            revision:parcelRevisionR408(existingPlan.parcel_plan_r408_json)
          });
        }

        if (existingPlan &&
            !["NOT_READY","READY"].includes(existingPlan.dispatch_status)) {
          await client.query("rollback");

          return json(res,409,{
            error:"HISTORICAL_PARCEL_PLAN_UNAVAILABLE"
          });
        }

        const plan = await calculateShipmentParcelPlan(
          client,kind,sourceId
        );

        await client.query("commit");

        return json(res,200,{
          plan,
          saved:false
        });

      } catch(error) {
        await client.query("rollback").catch(()=>{});

        return json(res,error.status || 503,{
          error:error.code || "PARCEL_PLAN_UNAVAILABLE"
        });
      }
    }

    if (action === "GET") {
      const dispatch = (await client.query(`select * from shipment_dispatches where ${kind === "STUDENT" ? "shipment_id" : "trainer_order_shipment_id"}=$1`, [sourceId])).rows[0];
      if (!dispatch) return json(res, 404, { error: "SHIPMENT_DISPATCH_NOT_FOUND" });
      return json(res, 200, { dispatch });
    }
    if (!['STUDENT', 'TRAINER'].includes(kind) || !UUID.test(sourceId)) return json(res, 400, { error: "SHIPMENT_REFERENCE_INVALID" });
    let result;
    if (action === "PACK") {
      await client.query("begin");
      try { await client.query("select pg_advisory_xact_lock(hashtext($1))", [`FIXOKU_SHIPMENT_DISPATCH:${kind}:${sourceId}`]); const dispatch = await markPacked(client, kind, sourceId, principal.user.id); await client.query("commit"); return json(res, 200, { status: "PACKED", dispatch }); } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
    }
    const dispatchId = String(input.dispatchId || (await client.query(`select id from shipment_dispatches where ${kind === "STUDENT" ? "shipment_id" : "trainer_order_shipment_id"}=$1`, [sourceId])).rows[0]?.id || "");
    if (action !== "DISPATCH" && !UUID.test(dispatchId)) return json(res, 404, { error: "SHIPMENT_DISPATCH_NOT_FOUND" });
    const linked = (await client.query(`
      select id,package_count,dispatch_status,parcel_plan_r408_json
      from shipment_dispatches
      where ${kind === "STUDENT"
        ? "shipment_id"
        : "trainer_order_shipment_id"}=$1
    `,[sourceId])).rows[0];

    if (input.dispatchId &&
        (!linked || String(linked.id) !== dispatchId))
      return json(res,409,{
        error:"SHIPMENT_DISPATCH_REFERENCE_MISMATCH"
      });

    if (action !== "DISPATCH" &&
        (!linked || String(linked.id) !== dispatchId))
      return json(res,404,{
        error:"SHIPMENT_DISPATCH_NOT_FOUND"
      });

    if (action === "DISPATCH" &&
        linked &&
        input.packageCount != null &&
        Number(input.packageCount) !== Number(linked.package_count))
      return json(res,409,{
        error:"SHIPMENT_PACKAGE_COUNT_MISMATCH"
      });

    if (action === "DISPATCH" &&
        (!linked || !linked.parcel_plan_r408_json))
      return json(res,409,{
        error:"AUTOMATIC_PARCEL_PLAN_REQUIRED"
      });

    const provider = createShippingAdapter();
    if (action === "DISPATCH") result = await dispatchShipment(client, { shipmentKind: kind, shipmentId: sourceId, provider, packageCount: linked?.package_count, actorUserId: principal.user.id });
    else if (action === "TRACK") result = await trackShipment(client, { dispatchId, provider });
    else if (action === "CANCEL") result = await cancelShipment(client, { dispatchId, provider });
    else if (action === "BARCODE") result = await barcodeShipment(client, { dispatchId, provider });
    else if (action === "RECONCILE") result = await reconcileShipment(client, { dispatchId, provider });
    else return json(res, 400, { error: "SHIPMENT_ACTION_INVALID" });
    return json(res, 200, result);
  } catch (error) { return json(res, error.status || 409, { error: error.code || "SHIPMENT_OPERATION_FAILED", reviewRequired: error.code === "SHIPMENT_REVIEW_REQUIRED" }); } finally { client.release(); await pool.end(); }
}
