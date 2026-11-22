import { timingSafeEqual } from "node:crypto";
import pg from "../../src/server/db/guarded-pg.js";
import { assertSafeDatabaseUrl } from "../../src/server/db/runtime-guard.js";

const PATH="/api/internal/fixoku-r410-owner-identity-probe";
const BRANCH="codex/fixoku-r410-staging-prep-20261121";
const PROJECT="prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";

function reply(res,status,body){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.end(JSON.stringify(body));
}

function tokenMatches(actual,expected){
  if(typeof actual!=="string" || typeof expected!=="string")
    return false;
  if(actual.length<32 || actual.length>256 ||
     expected.length<32 || expected.length>256)
    return false;
  const a=Buffer.from(actual);
  const b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}

export function createHandler({
  env=process.env,
  poolFactory=config=>new pg.Pool(config),
  validateUrl=assertSafeDatabaseUrl
}={}){
  return async function handler(req,res){
    const sha=String(env.FIXOKU_R410_RUNTIME_EXPECTED_COMMIT_SHA||"");

    const authorizedRuntime=
      env.VERCEL==="1" &&
      env.VERCEL_ENV==="preview" &&
      env.VERCEL_PROJECT_ID===PROJECT &&
      env.VERCEL_GIT_COMMIT_REF===BRANCH &&
      /^[a-f0-9]{40}$/.test(sha) &&
      sha===env.VERCEL_GIT_COMMIT_SHA &&
      env.FIXOKU_R410_RUNTIME_PROBE_ENABLED==="1";

    if(!authorizedRuntime ||
       req.method!=="POST" ||
       req.url!==PATH)
      return reply(res,404,{status:"NOT_FOUND"});

    if(!tokenMatches(
      req.headers?.["x-fixoku-r410-runtime-token"],
      env.FIXOKU_R410_RUNTIME_PROBE_TOKEN
    )) return reply(res,404,{status:"NOT_FOUND"});

    if((req.body && Object.keys(req.body).length>0) ||
       Number(req.headers?.["content-length"]||0)>0 ||
       req.headers?.["transfer-encoding"])
      return reply(res,400,{status:"BODY_NOT_ALLOWED"});

    let pool;
    let client;
    let begun=false;

    try {
      const url=validateUrl(env.DATABASE_URL_UNPOOLED,env);
      pool=poolFactory({
        connectionString:url,
        max:1,
        connectionTimeoutMillis:5000,
        statement_timeout:5000,
        query_timeout:6000
      });

      client=await pool.connect();
      await client.query("BEGIN TRANSACTION READ ONLY");
      begun=true;

      const identity=await client.query(
        "select current_database() as db, "+
        "current_setting('transaction_read_only') as readonly"
      );

      if(identity.rows[0]?.db!=="neondb" ||
         identity.rows[0]?.readonly!=="on")
        throw Error("TARGET_NOT_VERIFIED");

      const result=await client.query(`
        select
          count(distinct u.id)::int as accounts,
          count(distinct u.id) filter (
            where u.email_verified=true
          )::int as verified,
          count(distinct u.id) filter (
            where u.email_verified=true
            and m.role='OWNER'
            and m.status='ACTIVE'
            and m.scope_type='GLOBAL'
            and m.scope_id is null
          )::int as active_owners
        from platform_users u
        left join platform_memberships m on m.user_id=u.id
        where lower(u.email)='ersin@fixoku.com'
      `);

      const r=result.rows[0]||{};
      const ok=r.accounts===1 &&
               r.verified===1 &&
               r.active_owners===1;

      return reply(res,ok?200:409,{
        status:ok?"OWNER_IDENTITY_VERIFIED":"OWNER_IDENTITY_REVIEW",
        accountCount:r.accounts,
        verifiedCount:r.verified,
        activeOwnerCount:r.active_owners,
        notificationRecipient:"ersinusta@fixoku.com",
        databaseWrite:false,
        emailSent:false
      });
    }catch{
      return reply(res,503,{
        status:"OWNER_IDENTITY_PROBE_BLOCKED",
        databaseWrite:false,
        emailSent:false
      });
    }finally{
      if(client){
        if(begun)try{await client.query("ROLLBACK");}catch{}
        try{client.release();}catch{}
      }
      if(pool)try{await pool.end();}catch{}
    }
  };
}

export default createHandler();