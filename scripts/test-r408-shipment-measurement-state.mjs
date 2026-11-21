import assert from "node:assert/strict";
import { submitShipmentMeasurements } from "../src/server/shipping/dispatch.js";
const initial = {id:"fixture",reference_no:"FIX-TEST",package_count:1,provider_name:"MOCK",dispatch_status:"CREATED",measurement_status_r408:"PENDING",parcel_plan_r408_json:{packageCount:1}};
function fixture(behavior) {
 let row={...initial}, calls=0, committed=false;
 const client={async query(sql,args=[]) {
  if(sql==="begin" || sql==="rollback") return {rows:[]};
  if(sql==="commit") {committed=true;return {rows:[]};}
  if(sql.includes("set measurement_status_r408='IN_PROGRESS'")) {
   if(row.measurement_status_r408!=="PENDING" || args[1]!==row.provider_name) return {rows:[]};
   row={...row,measurement_status_r408:"IN_PROGRESS"};return {rows:[row]};
  }
  if(sql.includes("set measurement_status_r408=$2")) {row={...row,measurement_status_r408:args[1]};return {rows:[row]};}
  if(sql.startsWith("select *")) return {rows:[row]};
  throw Error("UNEXPECTED_SQL");
 }};
 const provider={runtime:{provider:"MOCK"},async updateMeasurements(ref,plan){calls++;assert.equal(committed,true);assert.equal(ref,initial.reference_no);assert.equal(plan.packageCount,1);return behavior(ref);}};
 return {client,provider,calls:()=>calls,row:()=>row};
}
for(const [behavior,status] of [[r=>({confirmed:true,referenceNo:r,packageCount:1}),"CONFIRMED"],[()=>{throw Error("TIMEOUT")},"REVIEW_REQUIRED"],[()=>({confirmed:false}),"REVIEW_REQUIRED"],[()=>({confirmed:true,referenceNo:"WRONG",packageCount:1}),"REVIEW_REQUIRED"]]) {
 const f=fixture(behavior);const result=await submitShipmentMeasurements(f.client,initial,f.provider);assert.equal(result.measurement_status_r408,status);
 await submitShipmentMeasurements(f.client,initial,f.provider);assert.equal(f.calls(),1);
 await submitShipmentMeasurements(f.client,{...initial,measurement_status_r408:"IN_PROGRESS"},f.provider);assert.equal(f.calls(),1);
}
const f=fixture(r=>({confirmed:true,referenceNo:r,packageCount:1}));
await Promise.all([submitShipmentMeasurements(f.client,initial,f.provider),submitShipmentMeasurements(f.client,initial,f.provider)]);assert.equal(f.calls(),1);
console.log("MEASUREMENT_STATE_CONTRACT=5/5_PASS_SIMULATED");
