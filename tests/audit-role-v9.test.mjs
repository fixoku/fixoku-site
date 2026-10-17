import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('api/admin/audit-history.js', 'utf8');
const page = fs.readFileSync('src/platform/admin/AdminAuditHistoryPage.tsx','utf8');

test('role filter cannot use action prefixes as a proxy for actors',()=>{
  assert.match(api,/const actorGroupCase = `case/);
  assert.match(api,/ae\.actor_user_id is null then 'system'/);
  const cases = ['OWNER','SUPER_ADMIN','TRAINER','STUDENT','GUARDIAN'];
  let prior = -1;
  for (const role of cases) {
    const at = api.indexOf(`'${role}' = any(`);
    assert.ok(at > prior, `missing or out-of-order role: ${role}`);
    prior = at;
  }
  assert.doesNotMatch(api,/const categoryCase = `case/);
});

test('server and UI both support complete mutually exclusive role groups',()=>{
  const roles = ['owner','admin','trainer','student','guardian','system','other'];
  for (const role of roles) {
    assert.ok(api.includes(`as ${role}`),`missing category counter: ${role}`);
    assert.ok(page.includes(`key: "${role}"`),`missing UI actor tab: ${role}`);
  }
  assert.match(api,/sumGroups !== Number\(aggregate\?\.total/);
});

test('role and topic filters are independent for export and pagination',()=>{
  assert.match(page,/category: category|direction, category,/);
  assert.match(page,/value\.set\("domain", domain\)/);
  assert.match(page,/const requestParams = new URLSearchParams\(params\)/);
  assert.match(api,/if \(domain\) conditions\.push\(domainConditions\[domain\]\)/);
  assert.match(api,/if \(category !== "all"\)/);
  assert.match(page,/<option value=\{10\}>10<\/option>/);
  assert.match(page,/<option value=\{1000\}>1\.000<\/option>/);
});

test('no audit mutation or raw sensitive metadata projection',()=>{
  assert.doesNotMatch(api,/\b(update|delete|insert)\s+(?:into|from|platform_audit_events)\b/i);
  assert.doesNotMatch(api,/as\s+"?metadata_json"?/i);
  assert.match(api,/"currentRoles"/);
});
