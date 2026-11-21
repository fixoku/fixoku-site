import {
  recordPaytrFinance
} from "./paytr-finance-store-r410.js";

export function paytrFinanceWorkerAllowed(env) {
  return (
    env.FIXOKU_PAYTR_FINANCE_WORKER_ENABLED==="1" &&
    env.FIXOKU_PAYTR_FINANCE_LIVE_QUERY_APPROVED==="1" &&
    env.VERCEL==="1" &&
    env.VERCEL_ENV==="production" &&
    env.PAYTR_ENABLED==="1" &&
    env.PAYTR_TEST_MODE==="0"
  );
}

export async function runPaytrFinanceWorker({
  client,
  env=process.env,
  statusRequester,
  recorder=recordPaytrFinance,
  limit=5
}={}) {
  if(!paytrFinanceWorkerAllowed(env))
    return {status:"DISABLED",processed:0};

  if(!client || typeof client.query!=="function")
    throw new Error("FINANCE_WORKER_DATABASE_REQUIRED");

  if(typeof statusRequester!=="function")
    throw new Error("FINANCE_STATUS_REQUESTER_REQUIRED");

  if(!Number.isInteger(limit)||limit<1||limit>5)
    throw new Error("FINANCE_WORKER_LIMIT_INVALID");

  const lockKey="R410_PAYTR_FINANCE_WORKER";

  const lock=(await client.query(
    "select pg_try_advisory_lock(hashtext($1)) as locked",
    [lockKey]
  )).rows[0]?.locked;

  if(lock!==true)
    return {status:"BUSY",processed:0};

  let processed=0;
  let verified=0;
  let reviewRequired=0;
  let retryRequired=0;

  try {
    const candidates=(await client.query(`
      select a.id,a.merchant_oid
      from public.paytr_payment_attempts a
      left join public.r410_paytr_finance f
        on f.attempt_id=a.id
      left join public.r410_paytr_finance_checks c
        on c.attempt_id=a.id
      where a.environment='LIVE'
        and a.status='SUCCEEDED'
        and a.review_required=false
        and a.verified_at is not null
        and a.succeeded_at is not null
        and a.currency='TRY'
        and f.attempt_id is null
        and (
          c.attempt_id is null
          or (
            c.status in ('PENDING','RETRY_REQUIRED')
            and coalesce(c.check_count,0)<3
            and coalesce(c.next_check_at,now())<=now()
          )
        )
      order by a.succeeded_at,a.id
      limit $1
    `,[limit])).rows;

    const saveCheck=async(id,status,code=null)=>{
      await client.query(`
        insert into public.r410_paytr_finance_checks(
          attempt_id,status,check_count,
          last_checked_at,next_check_at,
          last_error_code
        ) values(
          $1,$2,1,now(),
          case when $2='RETRY_REQUIRED'
            then now()+interval '30 minutes'
            else null end,
          $3
        )
        on conflict(attempt_id) do update set
          status=excluded.status,
          check_count=
            r410_paytr_finance_checks.check_count+1,
          last_checked_at=now(),
          next_check_at=excluded.next_check_at,
          last_error_code=excluded.last_error_code,
          updated_at=now()
      `,[id,status,code]);
    };

    for(const attempt of candidates){
      let providerStatus;

      try{
        providerStatus=await statusRequester(
          attempt.merchant_oid,env
        );
      }catch{
        await saveCheck(
          attempt.id,
          "RETRY_REQUIRED",
          "PROVIDER_QUERY_FAILED"
        );

        retryRequired++;
        processed++;
        continue;
      }

      await client.query("begin");

      try{
        const result=await recorder(client,{
          attemptId:attempt.id,
          providerStatus
        });

        if(["RECORDED","ALREADY_RECORDED"].includes(
          result.status
        )){
          await saveCheck(attempt.id,"VERIFIED");
          await client.query("commit");
          verified++;
        }else if(result.status==="REVIEW_REQUIRED"){
          await saveCheck(
            attempt.id,
            "REVIEW_REQUIRED",
            "FINANCE_EVIDENCE_CONFLICT"
          );

          await client.query("commit");
          reviewRequired++;
        }else{
          throw new Error("FINANCE_RESULT_UNKNOWN");
        }
      }catch(error){
        await client.query("rollback");

        const code=String(error?.code||"");

        if(!/^PAYTR_FINANCE_[A-Z0-9_]+$/u.test(code))
          throw error;

        await saveCheck(
          attempt.id,"REVIEW_REQUIRED",code
        );

        reviewRequired++;
      }

      processed++;
    }

    return {
      status:reviewRequired>0
        ? "REVIEW_REQUIRED"
        : retryRequired>0
          ? "RETRY_REQUIRED"
          : "COMPLETED",
      processed,
      verified,
      reviewRequired,
      retryRequired
    };
  }finally{
    await client.query(
      "select pg_advisory_unlock(hashtext($1))",
      [lockKey]
    );
  }
}