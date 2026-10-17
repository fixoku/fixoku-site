import assert from 'node:assert/strict';
import { EMAIL_TEMPLATE_CATALOG, EMAIL_TEMPLATE_COUNT, renderEmail, renderEmailForEvent, renderLifecycleEmail, EMAIL_EDITORIAL_DRAFTS } from '../src/server/domain/email-renderer.js';
import { EMAIL_NEW_DRAFT_COPY_V1 } from '../src/server/domain/email-editorial-v1.js';
assert.equal(EMAIL_TEMPLATE_COUNT, 27);
assert.equal(EMAIL_EDITORIAL_DRAFTS.length, 6);
assert.equal(Object.keys(EMAIL_NEW_DRAFT_COPY_V1).length, 6);
for (const template of EMAIL_TEMPLATE_CATALOG) {
  const result = renderEmail(template.id, {}, { preview: true, baseUrl: 'https://fixoku.com' });
  for (const value of [result.html, result.text]) {
    assert.ok(value.includes(template.title), `missing title ${template.id}`);
    assert.ok(!value.includes('FX-2026-005A'), `old placeholder ${template.id}`);
    assert.ok(!value.includes('FX-LOCAL-2026'), `old fallback ${template.id}`);
    assert.ok(!value.includes('Bu alan yalnızca yapılandırılmış örnek'), `old detail ${template.id}`);
  }
}
for (const id of ['password-reset','email-verification','trainer-assigned','education-completed']) {
  const result=renderEmail(id, {}, {preview:true}).text;
  assert.ok(!result.includes('Tutar:'), `${id} has unrelated amount`);
  assert.ok(!result.includes('Referans:'), `${id} has unrelated reference`);
}
assert.throws(()=>renderEmailForEvent('unknown-fixoku-event', {recipientName:'Deniz Yılmaz'}), /EMAIL_EVENT_UNKNOWN/);
assert.throws(()=>renderEmailForEvent('shipment-shipped',{recipientName:'Deniz Yılmaz'}), /EMAIL_REQUIRED_FIELD/);
assert.throws(()=>renderEmailForEvent('marketing',{recipientName:'Deniz Yılmaz'}), /EMAIL_MARKETING_CONSENT_UNSUBSCRIBE_NOT_VERIFIED/);
const delivered=renderEmailForEvent('trainer-assignment', {recipientName:'Özlem Kaplan',studentName:'Ali Asaf Usta',programName:'Ortaokul Hızlı Okuma'});
assert.ok(delivered.html.includes('Ali Asaf Usta'));
assert.ok(!delivered.text.includes('FX-LOCAL'));
const lifecycle=renderLifecycleEmail('reset', {url:'https://fixoku.com/sifre-sifirla?token=TEST'});
assert.ok(lifecycle.html.includes('token=TEST'));
console.log('FIXOKU_EMAIL_EDITORIAL_V1_TEST=PASS');
console.log('EXISTING_TEMPLATES=27');
console.log('NEW_DRAFT_COPIES=6');
console.log('LEGACY_GENERIC_ROWS=ABSENT');
console.log('UNKNOWN_EVENTS=REJECTED');
console.log('MARKETING_EVENT=BLOCKED');
console.log('LIFECYCLE_TOKEN=UNCHANGED');
