import { resolvePrincipal, requirePermission } from '../../../src/server/auth/authorization.js';
import { createKolayGelsinAdapter } from '../../../src/server/shipping/kolaygelsin.js';

const reply = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
};

// Responses from the carrier can vary by API version. Output only public
// city/district names and numeric IDs, never the whole provider response.
const publicMatches = (root) => {
  const found = [];
  const seen = new Set();
  const queue = [{ node: root, depth: 0 }];
  while (queue.length && seen.size < 2500 && found.length < 40) {
    const {node,depth} = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node) || depth > 9) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const child of node.slice(0, 1200)) queue.push({node:child,depth:depth+1});
      continue;
    }
    const pairs = Object.entries(node);
    const names = pairs.filter(([k,v]) => /(?:city|district|ilce|ilÃ§e|name|adi|adÄ±)/i.test(k) && typeof v === 'string' && /(?:izmir|iÌ‡zmir|konak)/i.test(v.normalize('NFC')));
    if (names.length) {
      const ids = pairs.filter(([k,v]) => /(?:city|district|ilce|ilÃ§e|^id$|_id$|Id$)/i.test(k) && (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) && Number.isSafeInteger(Number(v)) && Number(v) > 0);
      if (ids.length) found.push({ names:names.map(([field,value])=>({field,value:String(value).slice(0,80)})), ids:ids.map(([field,value])=>({field,value:Number(value)})) });
    }
    for (const [,value] of pairs.slice(0,100)) if (value && typeof value === 'object') queue.push({node:value,depth:depth+1});
  }
  return found;
};

export default async function handler(req,res) {
  if (req.method !== 'GET') return reply(res,405,{error:'METHOD_NOT_ALLOWED'});
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'codex/fixoku-r410-staging-prep-20261121') return reply(res,404,{error:'NOT_AVAILABLE'});
  let principal;
  try {principal = await resolvePrincipal(new Headers(Object.entries(req.headers || {}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)])));}
  catch {return reply(res,503,{error:'AUTHORITY_UNAVAILABLE'});}
  if (!principal) return reply(res,401,{error:'UNAUTHENTICATED'});
  const denied=requirePermission(principal,'shipment.manage');
  if (denied) return reply(res,denied.status,denied.body);
  if (String(process.env.SHIPPING_PROVIDER || '').trim().toUpperCase() !== 'KOLAYGELSIN') return reply(res,409,{error:'PROVIDER_NOT_KOLAYGELSIN'});
  try {
    const adapter=createKolayGelsinAdapter({allowDispatch:false});
    const data=await adapter.getCityDistricts({cityName:'Ä°zmir',districtName:'Konak'});
    return reply(res,200,{provider:'KOLAYGELSIN',operation:'READ_ONLY_CITY_DISTRICT_LOOKUP',query:{city:'Ä°zmir',district:'Konak'},matches:publicMatches(data),rawResponseNotReturned:true,shipmentCreated:false});
  } catch(error) {
    return reply(res,503,{error:'KG_CITY_DISTRICT_LOOKUP_UNVERIFIED',operation:'READ_ONLY_CITY_DISTRICT_LOOKUP',shipmentCreated:false});
  }
}