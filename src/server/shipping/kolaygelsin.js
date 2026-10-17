/* global process */
/** Kolay Gelsin / Sendeo documented cargo endpoints. Network is OFF by default.
 * Reference: https://klyglsn.github.io/web-service-doc/
 * Do not enable live dispatch without separate approved provider contract and tests.
 */
const OFFICIAL_HOST = 'apiintg.kolaygelsin.com';
const fail = (code, status = 422) => Object.assign(new Error(code), {code, status});
const string = (v, max) => String(v ?? '').trim().slice(0, max);
const positiveId = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0;
const tel = (v) => String(v ?? '').replace(/\D/g, '').replace(/^90(?=5\d{9}$)/, '').replace(/^0(?=[2-5]\d{9}$)/, '');
function requireAddress(part, prefix) {
  if (!part || !positiveId(part.cityId) || !positiveId(part.districtId)) throw fail(`KG_${prefix}_CITY_DISTRICT_REQUIRED`);
  if (!string(part.address, 225)) throw fail(`KG_${prefix}_ADDRESS_REQUIRED`);
  if (!/^[0-9]{10}$/.test(tel(part.phone))) throw fail(`KG_${prefix}_PHONE_REQUIRED`);
}
export function buildKolayGelsinDelivery(input) {
  const ref=string(input?.referenceNo, 51);
  if (!ref || ref.length > 50 || !/^[a-zA-Z0-9._-]+$/.test(ref)) throw fail('KG_REFERENCE_INVALID');
  if (!input?.receiver?.name || !string(input.receiver.name, 200)) throw fail('KG_RECEIVER_REQUIRED');
  requireAddress(input.sender, 'SENDER');
  requireAddress(input.receiver, 'RECEIVER');
  const count=Number(input.packageCount);
  if (!Number.isSafeInteger(count) || count < 1 || count > 999) throw fail('KG_PACKAGE_COUNT_INVALID');
  // DeliveryType=1, sender site -> customer. No COD, no estimated billing.
  return {
    DeliveryType: 1, ReferenceNo: ref, Description: string(input.description || 'FIXOKU kitap siparisi', 200),
    SenderAddress: string(input.sender.address,225), SenderCityId: Number(input.sender.cityId), SenderDistrictId: Number(input.sender.districtId), SenderGSM: tel(input.sender.phone),
    Receiver: string(input.receiver.name,200), ReceiverAddress: string(input.receiver.address,225), ReceiverCityId: Number(input.receiver.cityId), ReceiverDistrictId: Number(input.receiver.districtId), ReceiverGSM: tel(input.receiver.phone),
    PaymentType: 1, CollectionType: 0, CollectionPrice: 0, ServiceType: 1,
    BarcodeLabelType: 1, BarcodeVersion: 'V2',
    Products: [{ Count: count, ProductCode: '', Description: '', Deci: 0, Weigth: 0, DeciWeight: 0, Price: 0 }],
  };
}
function normalize(data) {
  const number=string(data?.TrackingNumber ?? data?.trackingNumber,64);
  if (!number) throw fail('KG_TRACKING_NUMBER_MISSING',502);
  const url=string(data?.TrackingUrl ?? data?.trackingUrl,1024);
  if (url && (!url.startsWith('https://') || !new URL(url).hostname.endsWith('.kolaygelsin.com'))) throw fail('KG_TRACKING_URL_UNTRUSTED',502);
  return {provider:'KOLAYGELSIN',providerReference:number,trackingNumber:number,trackingUrl:url||null,barcode:data?.Barcode ?? data?.barcode ?? null};
}
export function createKolayGelsinAdapter(options={}) {
  const token=String(options.token ?? process.env.SHIPPING_TOKEN ?? '');
  const base=String(options.baseUrl ?? process.env.SHIPPING_BASE_URL ?? '').trim();
  let url;
  try { url=new URL(base); } catch { /* fail closed below */ }
  const trusted=Boolean(url && url.protocol === 'https:' && url.hostname.toLowerCase() === OFFICIAL_HOST && !url.username && !url.password && !url.port && (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash);
  const configured=trusted && Boolean(token);
  const explicitlyApproved = options.allowDispatch === true && typeof options.fetchImpl === 'function' || (String(process.env.SHIPPING_KG_LIVE_DISPATCH_APPROVED || '') === '1' && options.allowDispatch !== false);
  const enabled=configured && explicitlyApproved;
  const runtime=Object.freeze({provider:'KOLAYGELSIN',enabled,configured,status:!configured?'CONFIG_REQUIRED':enabled?'CONFIGURED':'CONFIGURED_UNVERIFIED'});
  async function request(service,{method='POST',body,query}={}) {
    if (!enabled) throw fail('KG_DISPATCH_NOT_APPROVED',503);
    const target=new URL(`/api/Cargo/${service}`,url);
    if (query) for(const [k,v] of Object.entries(query))target.searchParams.set(k,String(v));
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const result=await (options.fetchImpl || fetch)(target.toString(),{method,redirect:'error',signal:controller.signal,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json'},...(method==='POST'?{body:JSON.stringify(body ?? {})}:{})});
      const response=await result.json().catch(()=>({}));
      if(!result.ok || response?.IsSuccess===false || response?.isSuccess===false || response?.ExceptionMessage) throw fail('KG_PROVIDER_REJECTED',502);
      return response;
    } catch(error) {if(error?.name === 'AbortError') throw fail('KG_PROVIDER_TIMEOUT',503);throw error;} finally {clearTimeout(timeout);}
  }
  return Object.freeze({
    runtime,
    quote: async () => {throw fail('KG_QUOTE_API_NOT_VERIFIED',503);},
    createShipment: async input => normalize(await request('SetDelivery',{body:buildKolayGelsinDelivery(input)})),
    getTracking: async ref => {if(!ref)throw fail('KG_REFERENCE_REQUIRED'); return request('TrackDelivery',{method:'GET',query:{referenceNo:ref}});},
    cancelShipment: async ref => {if(!ref)throw fail('KG_REFERENCE_REQUIRED'); const r=await request('CancelDelivery',{query:{referenceNo:ref}});if(r?.IsSuccess!==true && r?.isSuccess!==true)throw fail('KG_CANCEL_NOT_CONFIRMED',502);return {cancelled:true};},
    createLabel: async ref => {if(!ref)throw fail('KG_REFERENCE_REQUIRED');return request('GetBarcode',{body:{barcodeLabelType:1,referenceNo:ref,BarcodeVersion:'V2'}});},
  });
}