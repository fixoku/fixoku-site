import assert from "node:assert/strict";
import { PREVIEW_CONTRACTS, STAGING_ACCEPTANCE_METADATA as target, isCleanPreviewBusinessAccessBlocked, exactPreviewContractEnvironment } from "../src/server/auth/preview-contract.js";
import { resolveApplicationOrigin, resolveTrustedOrigins } from "../src/server/auth/origin.js";
import { assertSafeDatabaseUrl } from "../src/server/db/runtime-guard.js";
const c = PREVIEW_CONTRACTS.r405Staging;
const pooled = `postgresql://synthetic:synthetic@${target.pooledHost}/neondb?sslmode=verify-full`;
const direct = `postgresql://synthetic:synthetic@${target.directHost}/neondb?sslmode=verify-full`;
const base = { VERCEL:"1", VERCEL_ENV:"preview", VERCEL_PROJECT_ID:c.vercelProjectId,
  VERCEL_GIT_COMMIT_REF:c.branch, VERCEL_GIT_COMMIT_SHA:"a".repeat(40), VERCEL_URL:"fixoku-site-git-codex-fixoku-r405-staging-20261119-fixoku.vercel.app",
  [c.expectedCommitEnv]:"a".repeat(40), [c.probeEnabledEnv]:"1", [c.metadata.attested]:"1",
  [c.metadata.project]:target.project, [c.metadata.branch]:target.branch, [c.metadata.database]:target.database,
  [c.metadata.pooledHost]:target.pooledHost,[c.metadata.directHost]:target.directHost,
  DATABASE_URL:pooled,DATABASE_URL_UNPOOLED:direct,APP_ORIGIN:"https://staging.fixoku.com",BETTER_AUTH_URL:"https://staging.fixoku.com" };
assert.equal(exactPreviewContractEnvironment(c,base),true);
assert.throws(()=>assertSafeDatabaseUrl(pooled,{VERCEL_GIT_COMMIT_REF:c.branch}));
assert.equal(exactPreviewContractEnvironment(c,{...base,VERCEL_URL:"fixoku-site-git-codex-fixoku-r404-development-fixoku.vercel.app"}),false);
assert.equal(isCleanPreviewBusinessAccessBlocked(base),false);
assert.equal(resolveApplicationOrigin(base),"https://staging.fixoku.com");
assert.ok(resolveTrustedOrigins(base).includes("https://staging.fixoku.com"));
assert.equal(assertSafeDatabaseUrl(pooled,base),pooled);
assert.equal(assertSafeDatabaseUrl(direct,base),direct);
let count=0;
for (const change of [ {VERCEL_GIT_COMMIT_REF:"codex/unknown"},{VERCEL_PROJECT_ID:"wrong"},{VERCEL_GIT_COMMIT_SHA:"b".repeat(40)},
  {VERCEL_GIT_COMMIT_SHA:"a913f49b4e40213321b5304594ce3b0bf7bad40b",[c.expectedCommitEnv]:"a913f49b4e40213321b5304594ce3b0bf7bad40b"},
  {[c.expectedCommitEnv]:""},{[c.probeEnabledEnv]:"0"},{[c.metadata.attested]:"0"},{[c.metadata.project]:"bitter-dream-05261699"},
  {[c.metadata.branch]:"wrong"},{[c.metadata.database]:"wrong"},{[c.metadata.pooledHost]:"wrong"},{[c.metadata.directHost]:"wrong"},
  {VERCEL_URL:"evil.example"},{VERCEL_URL:"fixoku-site-git-codex-fixoku-staging-acceptance-20261113-fixoku.vercel.app"},
  {DATABASE_URL:direct},{DATABASE_URL_UNPOOLED:pooled},{DATABASE_URL:pooled.replace(target.pooledHost,"ep-shiny-moon-baj05hk6.c-8.eu-central-1.aws.neon.tech")},
  {DATABASE_URL:pooled.replace("verify-full","disable")},{DATABASE_URL:pooled+"&host=evil.example"},{DATABASE_URL:pooled+"&sslmode=verify-full"},
  {DATABASE_URL_UNPOOLED:direct.replace("/neondb","/postgres")},{DATABASE_URL_UNPOOLED:""} ]) {
  const env={...base,...change};
  assert.equal(isCleanPreviewBusinessAccessBlocked(env),true);
  assert.equal(resolveApplicationOrigin(env),null);
  assert.throws(()=>assertSafeDatabaseUrl(env.DATABASE_URL,env)); count++;
}
assert.throws(()=>assertSafeDatabaseUrl(pooled,{...base,VERCEL_ENV:"production"}));
assert.throws(()=>assertSafeDatabaseUrl(pooled.replace("synthetic:synthetic","other:other"),base));
assert.equal(resolveApplicationOrigin({...base,APP_ORIGIN:"https://fixoku.com",BETTER_AUTH_URL:"https://fixoku.com"}),null);
console.log(`R405_RUNTIME_OFFLINE=PASS POSITIVE=6 NEGATIVE=${count+3}`);

const { createStagingRuntimeDiagnosticHandler } = await import("../api/internal/fixoku-staging-runtime-diagnostic.js");
const { default: guardedPg } = await import("../src/server/db/guarded-pg.js");
const token = "s".repeat(40);
const original = { ...process.env };
const reset = env => { for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, env); };
try {
  const runtime = { ...base, [c.probeTokenEnv]: token };
  const req = { method: "POST", url: "/api/internal/fixoku-staging-runtime-diagnostic", headers: { [c.probeTokenHeader]: token } };
  async function probe(env, request = req, observedBranch = target.branch, observedProject = target.project) {
    reset(env); let opens=0; let queryCount=0;
    const handler = createStagingRuntimeDiagnosticHandler({ oidcVerifier: async () => false, poolFactory: url => {
      assert.ok([pooled,direct].includes(url)); opens++;
      const client = { query: async sql => { queryCount++; if (sql.startsWith("select current_database()")) return { rows: [{ database:"neondb",role:"synthetic",schema:"public",server_version:"18.7",transaction_read_only:"on",neon_branch_id:observedBranch,neon_project_id:observedProject }] }; return {rows:[]}; }, release(){} };
      return {connect:async()=>client,end:async()=>{}};
    }});
    const res={statusCode:0,setHeader(){},end(value){this.body=JSON.parse(value);}};
    await handler(request,res); return {res,opens,queryCount};
  }
  const good=await probe(runtime); assert.equal(good.res.statusCode,200); assert.equal(good.opens,2); assert.equal(good.queryCount,6); assert.equal(good.res.body.ok,true);
  for (const invalid of [{ ...runtime, [c.metadata.attested]:"0" },{ ...runtime, DATABASE_URL:pooled+"&host=evil.example" },{ ...runtime, VERCEL_PROJECT_ID:"wrong" }]) { const r=await probe(invalid); assert.notEqual(r.res.statusCode,200); assert.equal(r.opens,0); }
  const unauthorized=await probe(runtime,{...req,headers:{}}); assert.equal(unauthorized.res.statusCode,404); assert.equal(unauthorized.opens,0);
  const wrongObserved=await probe(runtime,req,"br-wrong"); assert.equal(wrongObserved.res.statusCode,503);
  const missingObserved=await probe(runtime,req,target.branch,""); assert.equal(missingObserved.res.statusCode,503);
  reset({...runtime,NODE_ENV:"production"}); assert.throws(()=>new guardedPg.Pool({connectionString:pooled,host:"evil.example"}));
  const instance=new guardedPg.Pool({connectionString:direct,max:1}); await instance.end();
  console.log("R405_DIAGNOSTIC_AND_PG_OFFLINE=PASS");
} finally { reset(original); }
