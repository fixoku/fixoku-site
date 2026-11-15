import assert from 'node:assert/strict';import {EMAIL_EVENT_TEMPLATE_MAP,buildEmailSnapshot,staticTemplateRecord} from '../src/server/domain/email-templates.js';import {OWNER_EMAIL_EDITORIAL} from '../src/server/domain/owner-email-editorial-r390.js';import {queueOwnerManagementEmail} from '../src/server/domain/owner-management-notifications-r390.js';
assert.equal(Object.keys(OWNER_EMAIL_EDITORIAL).length,16);
for(const [key,def] of Object.entries(OWNER_EMAIL_EDITORIAL)){const eventType=key.toUpperCase().replace(/-/g,'_');assert.equal(EMAIL_EVENT_TEMPLATE_MAP[eventType],key);const data={...def.fixture};const r=buildEmailSnapshot({eventType,record:staticTemplateRecord(key),metadata:data});assert(!r.subject.includes('{{'));assert(r.html.includes('Ersin Bey,'));}
const noDb={query(){throw Error('unexpected db')}};assert.equal(await queueOwnerManagementEmail(noDb,{},{}),false);await assert.rejects(queueOwnerManagementEmail(noDb,{},{FIXOKU_OWNER_NOTIFICATIONS_ENABLED:'1',FIXOKU_OWNER_NOTIFICATION_EMAIL:'wrong@example.com'}),/NOT_APPROVED/);
console.log('R390C_OFFLINE_CONTRACT_PASS');

const enabled={FIXOKU_OWNER_NOTIFICATIONS_ENABLED:'1',FIXOKU_OWNER_NOTIFICATION_EMAIL:'ersinusta@fixoku.com'};
let queries=0;
const probe={async query(sql,params){queries++;assert.equal(params[0],'ersin@fixoku.com');return {rows:[]};}};
await assert.rejects(queueOwnerManagementEmail(probe,{templateKey:'owner-student-registration',eventId:'test-id',metadata:{personName:'Test'}},enabled),/NOT_UNIQUE_VERIFIED_OWNER/);
assert.equal(queries,1);
await assert.rejects(queueOwnerManagementEmail(noDb,{}, {...enabled,FIXOKU_OWNER_NOTIFICATION_EMAIL:'ersin@fixoku.com'}),/NOT_APPROVED/);
const {queueVerifiedOwnerRegistration}=await import('../src/server/domain/owner-management-notifications-r390.js');
assert.equal(await queueVerifiedOwnerRegistration(noDb,'test',{}),0);
const unverified={async query(sql){assert(sql.includes('u.email_verified=true'));return {rows:[]};}};
assert.equal(await queueVerifiedOwnerRegistration(unverified,'test',enabled),0);
console.log('R390D_RECIPIENT_AND_VERIFICATION_CONTRACT_PASS');
assert.equal(EMAIL_EVENT_TEMPLATE_MAP.OWNER_STOCK,undefined);
assert.equal(Object.hasOwn(OWNER_EMAIL_EDITORIAL,"owner-stock"),false);
