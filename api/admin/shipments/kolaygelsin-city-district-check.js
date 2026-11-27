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
  const reject = () => {
    throw new Error('KG_LOCATION_RESPONSE_INVALID');
  };

  const normalize = value =>
    typeof value === 'string'
      ? value.trim().normalize('NFD')
          .replace(/[\u0300-\u036f]/g,'')
          .toLowerCase()
      : '';

  const validId = value =>
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0;

  if (!root ||
      root.StatusCode !== 200 ||
      root.IsSuccessful !== true ||
      root.ExceptionMessage) reject();

  const city = root.result;

  if (!city ||
      normalize(city.CityName) !== 'izmir' ||
      !validId(city.CityId) ||
      !Array.isArray(city.Districts)) reject();

  const districts = city.Districts.filter(
    item => item &&
      normalize(item.DistrictName) === 'konak'
  );

  if (districts.length !== 1) reject();

  const district = districts[0];

  if (!validId(district.DistrictId)) reject();

  return [{
    names:[
      {field:'CityName',value:'\u0130zmir'},
      {field:'DistrictName',value:'Konak'}
    ],
    ids:[
      {field:'CityId',value:city.CityId},
      {field:'DistrictId',value:district.DistrictId}
    ]
  }];
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
    const data=await adapter.getCityDistricts({cityName:'\u0130zmir',districtName:'Konak'});
    return reply(res,200,{provider:'KOLAYGELSIN',operation:'READ_ONLY_CITY_DISTRICT_LOOKUP',query:{city:'\u0130zmir',district:'Konak'},matches:publicMatches(data),rawResponseNotReturned:true,shipmentCreated:false});
  } catch(error) {
    return reply(res,503,{error:'KG_CITY_DISTRICT_LOOKUP_UNVERIFIED',operation:'READ_ONLY_CITY_DISTRICT_LOOKUP',shipmentCreated:false});
  }
}