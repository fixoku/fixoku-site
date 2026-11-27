import { resolvePrincipal, requirePermission } from '../../../src/server/auth/authorization.js';
import { createKolayGelsinAdapter } from '../../../src/server/shipping/kolaygelsin.js';

const reply = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF !== 'codex/fixoku-r410-staging-prep-20261121') {
    return reply(res, 404, { error: 'NOT_AVAILABLE' });
  }
  let principal;
  try {
    principal = await resolvePrincipal(new Headers(Object.entries(req.headers || {})
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)])));
  } catch {
    return reply(res, 503, { error: 'AUTHORITY_UNAVAILABLE' });
  }
  if (!principal) return reply(res, 401, { error: 'UNAUTHENTICATED' });
  const denied = requirePermission(principal, 'shipment.manage');
  if (denied) return reply(res, denied.status, denied.body);
  if (String(process.env.SHIPPING_PROVIDER || '').trim().toUpperCase() !== 'KOLAYGELSIN') {
    return reply(res, 409, { error: 'PROVIDER_NOT_KOLAYGELSIN' });
  }
  try {
    const adapter = createKolayGelsinAdapter({ allowDispatch: false });
    const result = await adapter.verifyConnection();
    return reply(res, 200, {
      provider: 'KOLAYGELSIN',
      authentication: result.verified ? 'PASS' : 'UNVERIFIED',
      operation: 'LOGIN_AND_READ_ONLY_CITY_PROBE',
      shipmentCreated: false,
      liveDispatchApprovedByThisCheck: false
    });
  } catch (error) {
    const allowed = new Set([
      'KG_PROBE_CREDENTIALS_REQUIRED', 'KG_LOGIN_HTTP_FAILED',
      'KG_LOGIN_INVALID', 'KG_TOKEN_PROBE_HTTP_FAILED',
      'KG_TOKEN_NOT_VERIFIED', 'KG_CREDENTIALS_REQUIRED',
      'KG_PROVIDER_TIMEOUT'
    ]);
    return reply(res, 503, {
      error: allowed.has(error?.code) ? error.code : 'KG_CONNECTION_UNVERIFIED',
      operation: 'LOGIN_AND_READ_ONLY_CITY_PROBE',
      shipmentCreated: false
    });
  }
}