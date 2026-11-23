import assert from "node:assert/strict";
import { paytrR410PreviewIsolation } from "../src/server/payments/paytr-staging-isolation-r410.js";
import { R18_STAGING_METADATA } from "../src/server/auth/preview-contract.js";
const base={
  VERCEL:"1",VERCEL_ENV:"preview",NODE_ENV:"production",
  VERCEL_PROJECT_ID:"prj_yWvXfOndJ6se89FdCiPbvKIZoGwR",
  VERCEL_GIT_COMMIT_REF:"codex/fixoku-r410-staging-prep-20261121",
  PAYTR_ENABLED:"1",PAYTR_TEST_MODE:"1",FIXOKU_PAYTR_STAGING_TEST_APPROVED:"1",
  VERCEL_GIT_COMMIT_SHA:"d27bcdd2ca50d95c20838010135425585742ab85",
  FIXOKU_R410_RUNTIME_EXPECTED_COMMIT_SHA:"d27bcdd2ca50d95c20838010135425585742ab85",
  FIXOKU_R410_ENDPOINT_METADATA_ATTESTED:"1",
  FIXOKU_R410_NEON_PROJECT_ID:R18_STAGING_METADATA.project,
  FIXOKU_R410_NEON_BRANCH_ID:R18_STAGING_METADATA.branch,
  FIXOKU_R410_DATABASE:R18_STAGING_METADATA.database,
  FIXOKU_R410_POOLED_HOST:R18_STAGING_METADATA.pooledHost,
  FIXOKU_R410_DIRECT_HOST:R18_STAGING_METADATA.directHost,
  EMAIL_PROVIDER:"DISABLED",FIXOKU_OWNER_NOTIFICATIONS_ENABLED:"0",
  SHIPPING_PROVIDER:"DISABLED",SHIPPING_KG_LIVE_DISPATCH_APPROVED:"0",
  DATABASE_URL:`postgresql://test:secret@${R18_STAGING_METADATA.pooledHost}/neondb?sslmode=verify-full`,
  DATABASE_URL_UNPOOLED:`postgresql://test:secret@${R18_STAGING_METADATA.directHost}/neondb?sslmode=verify-full`
};
assert.deepEqual(paytrR410PreviewIsolation(base),{applicable:true,approved:true});
for(const [key,value] of Object.entries({VERCEL_GIT_COMMIT_SHA:"0000000000000000000000000000000000000000",FIXOKU_R410_RUNTIME_EXPECTED_COMMIT_SHA:"0000000000000000000000000000000000000000",FIXOKU_R410_ENDPOINT_METADATA_ATTESTED:"0",FIXOKU_R410_NEON_BRANCH_ID:"br-wrong",EMAIL_PROVIDER:"SMTP",FIXOKU_OWNER_NOTIFICATIONS_ENABLED:"1",SHIPPING_PROVIDER:"KOLAYGELSIN",SHIPPING_KG_LIVE_DISPATCH_APPROVED:"1",PAYTR_TEST_MODE:"0",FIXOKU_PAYTR_STAGING_TEST_APPROVED:"0",DATABASE_URL:"postgresql://test:secret@other.neon.tech/neondb?sslmode=verify-full",VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"other"})) {
 const result=paytrR410PreviewIsolation({...base,[key]:value});
 if(key==="VERCEL_ENV") assert.equal(result.applicable,false);
 else assert.equal(result.approved,false,`MUST_FAIL_CLOSED:${key}`);
}
assert.deepEqual(paytrR410PreviewIsolation({VERCEL_ENV:"production"}),{applicable:false,approved:true});
console.log("K34_PAYTR_PREVIEW_ISOLATION_TEST=PASS");
console.log("EXTERNAL_NETWORK=NO; DB_CONNECT=NO; PAYMENT=NO; EMAIL_SEND=NO; SHIPPING=NO");