import { buildKolayGelsinDelivery } from './kolaygelsin.js';

/** Pure shipment preflight. It NEVER contacts a provider or writes a database. */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = value => String(value ?? '').trim();
const integer = n => Number.isSafeInteger(Number(n)) && Number(n)>0;
function snapshot(value) {
  if (value && typeof value==='object' && !Array.isArray(value)) return value;
  if (typeof value!=='string') return {};
  try { const parsed=JSON.parse(value); return parsed && typeof parsed==='object' && !Array.isArray(parsed) ? parsed : {}; }
  catch { return {}; }
}
export function shipmentReference(audience, id) {
  if (!['STUDENT','TRAINER'].includes(audience) || !ID.test(String(id||''))) throw new Error('SHIPMENT_REFERENCE_INVALID');
  return 'FIXOKU-' + (audience==='STUDENT' ? 'S-' : 'T-') + String(id).replace(/-/g,'').toUpperCase();
}
export function preflightOrderShipment({audience,shipment,orderStatus,items,sender,packageCount}={}) {
  const blockers=[];
  if (!['STUDENT','TRAINER'].includes(audience)) blockers.push('AUDIENCE_INVALID');
  if (!shipment || !ID.test(String(shipment.id||''))) blockers.push('SHIPMENT_ID_INVALID');
  if (text(orderStatus).toUpperCase()!=='PAID') blockers.push('PAYMENT_NOT_SETTLED');
  if (text(shipment?.status).toUpperCase()!=='PACKED') blockers.push('SHIPMENT_NOT_PACKED');
  if (text(shipment?.trackingNumber) || text(shipment?.tracking_number) || text(shipment?.labelReference) || text(shipment?.carrier) || shipment?.providerEnabled===true) blockers.push('SHIPMENT_PROVIDER_ALREADY_LINKED');
  if (!Array.isArray(items) || !items.length) blockers.push('PHYSICAL_ITEMS_REQUIRED');
  else if (items.some(i => text(i.productType).toUpperCase()!=='PHYSICAL' || !ID.test(String(i.productId||'')) || !integer(i.quantity) || Number(i.quantity)>999)) blockers.push('INVALID_PHYSICAL_ITEM');
  if (!integer(packageCount) || Number(packageCount)>999) blockers.push('VERIFIED_PACKAGE_COUNT_REQUIRED');
  const address=snapshot(shipment?.addressSnapshot ?? shipment?.address_snapshot_json);
  if (!text(address.firstName) || !text(address.lastName) || !text(address.phone) || !text(address.addressLine)) blockers.push('RECEIVER_CONTACT_INCOMPLETE');
  if (!integer(address.cityId) || !integer(address.districtId)) blockers.push('KG_RECEIVER_LOCATION_IDS_REQUIRED');
  const origin=snapshot(sender);
  if (!integer(origin.cityId) || !integer(origin.districtId) || !text(origin.phone) || !text(origin.address)) blockers.push('KG_SENDER_CONFIGURATION_REQUIRED');
  let providerPayload=null;
  let referenceNo=null;
  if (!blockers.length) {
    referenceNo=shipmentReference(audience,shipment.id);
    try {
      providerPayload=buildKolayGelsinDelivery({
        referenceNo, packageCount:Number(packageCount),description:'FIXOKU fiziksel kitap gönderisi',
        sender:origin,
        receiver:{name:[address.firstName,address.lastName].map(text).join(' '),phone:address.phone,address:address.addressLine,cityId:Number(address.cityId),districtId:Number(address.districtId)}
      });
    } catch { blockers.push('KG_PROVIDER_PAYLOAD_INVALID'); }
  }
  return {audience, shipmentId:shipment?.id??null, eligible:blockers.length===0, blockers, referenceNo, physicalLineCount:Array.isArray(items)?items.length:0, packageCount:integer(packageCount)?Number(packageCount):null, providerPayload};
}
