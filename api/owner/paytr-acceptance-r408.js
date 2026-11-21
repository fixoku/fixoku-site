import { isIP } from "node:net";
import pg from "../../src/server/db/guarded-pg.js";
import {
  resolvePrincipal,
  requireMembership
} from "../../src/server/auth/authorization.js";

import {
  requestPaytrIframeToken,
  requestPaytrPaymentStatus,
  validatePaytrSettlement
} from "../../src/server/payments/paytr.js";

import {
  ownerPaytrTestAllowed,
  createOwnerTestReference,
  isOwnerTestReference
} from "../../src/server/payments/paytr-owner-test-r408.js";

const ORIGIN = "https://fixoku.com";

const json = (res, status, data) => {
  res.statusCode = status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, private");
  res.setHeader("X-Content-Type-Options","nosniff");
  return res.end(JSON.stringify(data));
};

const headersOf = req => new Headers(
  Object.entries(req.headers || {}).map(([key,value])=>[
    key,String(value)
  ])
);

const fields = `
  merchant_oid as "merchantOid",
  amount_minor as "amountMinor",
  currency,
  status,
  created_at as "createdAt",
  expires_at as "expiresAt",
  completed_at as "completedAt",
  provider_verified as "providerVerified",
  callback_count as "callbackCount",
  last_error_code as "lastErrorCode"
`;

async function readBody(req) {
  let raw = "";

  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 8192)
      throw new Error("BODY_TOO_LARGE");
  }

  return JSON.parse(raw || "{}");
}

function configuredCustomer() {
  return {
    email: String(process.env.FIXOKU_PAYTR_OWNER_TEST_EMAIL || "").trim(),
    userName: String(process.env.FIXOKU_PAYTR_OWNER_TEST_NAME || "").trim(),
    userAddress: String(process.env.FIXOKU_PAYTR_OWNER_TEST_ADDRESS || "").trim(),
    userPhone: String(process.env.FIXOKU_PAYTR_OWNER_TEST_PHONE || "").trim()
  };
}

export default async function handler(req,res) {
  return executeOwnerTestRequest(req,res);
}

export async function executeOwnerTestRequest(req,res,{
  principalResolver = resolvePrincipal,
  env = process.env,
  injectedPool = null,
  statusRequester = requestPaytrPaymentStatus
} = {}) {
  if (!["GET","POST"].includes(req.method))
    return json(res,405,{error:"METHOD_NOT_ALLOWED"});

  if (req.method === "POST" &&
      req.headers.origin !== ORIGIN)
    return json(res,403,{error:"ORIGIN_FORBIDDEN"});

  const principal = await principalResolver(headersOf(req));

  if (!principal)
    return json(res,401,{error:"UNAUTHENTICATED"});

  const denied = requireMembership(principal,"OWNER");

  if (denied)
    return json(res,denied.status,denied.body);

  if (!ownerPaytrTestAllowed(env))
    return json(res,503,{error:"OWNER_PAYTR_TEST_DISABLED"});

  const ownerId = principal.user?.id;
  if (!ownerId)
    return json(res,403,{error:"OWNER_IDENTITY_REQUIRED"});
  const pool = injectedPool || new pg.Pool({
    connectionString:env.DATABASE_URL
  });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url || "/",ORIGIN);
      const merchantOid = url.searchParams.get("merchantOid");

      if (merchantOid && !isOwnerTestReference(merchantOid))
        return json(res,400,{error:"INVALID_TEST_REFERENCE"});

      const result = await pool.query(`
        select ${fields}
        from public.paytr_owner_test_attempts
        where owner_user_id=$1
        and ($2::text is null or merchant_oid=$2)
        order by created_at desc
        limit 20
      `,[ownerId,merchantOid]);

      const globalActive = await pool.query(`
        select exists(
          select 1
          from public.paytr_owner_test_attempts
          where status in (
            'CREATED',
            'TOKEN_PENDING',
            'TOKEN_READY',
            'REVIEW_REQUIRED'
          ) or last_error_code='CONFLICTING_CALLBACK'
        ) as blocked
      `);

      return json(res,200,{
        enabled:true,
        testOnly:true,
        attempts:result.rows.map(row => {
          const active = [
            "CREATED",
            "TOKEN_PENDING",
            "TOKEN_READY",
            "REVIEW_REQUIRED"
          ].includes(row.status);

          const expired =
            new Date(row.expiresAt).getTime() <= Date.now();

          return {
            ...row,
            expired:active && expired,
            displayStatus:(active && expired) || row.lastErrorCode === "CONFLICTING_CALLBACK"
              ? "REVIEW_REQUIRED"
              : row.status,
            reconciliationRequired:
              row.lastErrorCode === "CONFLICTING_CALLBACK" ||
              row.status === "REVIEW_REQUIRED" ||
              (active && expired)
          };
        }),
        newTestBlocked:globalActive.rows[0]?.blocked === true
      });
    }

    let input;
    try {
      input = await readBody(req);
    } catch {
      return json(res,400,{error:"INVALID_REQUEST"});
    }

    if (input.action === "RECHECK_TEST") {
      if (input.confirmTestOnly !== true ||
          !isOwnerTestReference(input.merchantOid))
        return json(res,400,{
          error:"INVALID_RECHECK_REQUEST"
        });

      const oid = input.merchantOid;
      const client = await pool.connect();

      try {
        await client.query("begin");

        await client.query(
          "select pg_advisory_xact_lock(hashtext($1))",
          ["R408_OWNER_PAYTR_TEST_GLOBAL"]
        );

        const row = (await client.query(`
          select *
          from public.paytr_owner_test_attempts
          where merchant_oid=$1
          and owner_user_id=$2
          for update
        `,[oid,ownerId])).rows[0];

        if (!row) {
          await client.query("rollback");
          return json(res,404,{
            error:"OWNER_TEST_ATTEMPT_NOT_FOUND"
          });
        }

        if (row.last_error_code === "CONFLICTING_CALLBACK") {
          await client.query("rollback");

          return json(res,409,{
            error:"CONFLICT_REQUIRES_MANUAL_REVIEW"
          });
        }

        if (row.status !== "REVIEW_REQUIRED" ||
            row.last_error_code !== "PROVIDER_STATUS_UNCONFIRMED" ||
            !row.callback_received_at ||
            !/^[a-f0-9]{64}$/.test(
              String(row.callback_hash_sha256 || "")
            ) ||
            Number(row.callback_count) < 1 ||
            Number(row.amount_minor) !== 100 ||
            row.currency !== "TRY" ||
            row.environment !== "TEST") {

          await client.query("rollback");

          return json(res,409,{
            error:"VERIFIED_CALLBACK_EVIDENCE_REQUIRED"
          });
        }

        let settlement;

        try {
          const providerStatus =
            await statusRequester(oid,env);

          settlement = validatePaytrSettlement({
            payload:{
              merchant_oid:oid,
              status:"success",
              total_amount:"100",
              test_mode:"1"
            },
            providerStatus,
            expectedAmountMinor:100,
            expectedCurrency:"TRY",
            expectedTestMode:"1"
          });

          if (settlement.orderAmountMinor !== 100 ||
              settlement.collectedAmountMinor !== 100 ||
              settlement.installments !== 1)
            throw new Error("RECHECK_SETTLEMENT_MISMATCH");

        } catch {
          await client.query("rollback");

          return json(res,503,{
            error:"PROVIDER_STATUS_STILL_UNCONFIRMED"
          });
        }

        const providerReference =
          settlement.providerTransactionId
            ? String(
                settlement.providerTransactionId
              ).slice(0,160)
            : null;

        await client.query(`
          update public.paytr_owner_test_attempts
          set status='SUCCEEDED',
              provider_verified=true,
              collected_amount_minor=100,
              completed_at=now(),
              provider_transaction_reference=$3,
              last_error_code=null
          where merchant_oid=$1
          and owner_user_id=$2
          and status='REVIEW_REQUIRED'
          and last_error_code='PROVIDER_STATUS_UNCONFIRMED'
        `,[oid,ownerId,providerReference]);

        await client.query("commit");

        return json(res,200,{
          merchantOid:oid,
          testOnly:true,
          status:"SUCCEEDED",
          providerVerified:true
        });

      } catch {
        await client.query("rollback").catch(()=>{});

        return json(res,503,{
          error:"OWNER_TEST_RECHECK_UNAVAILABLE"
        });

      } finally {
        client.release();
      }
    }

    if (input.action !== "START_TEST" ||
        input.confirmTestOnly !== true)
      return json(res,400,{error:"TEST_CONFIRMATION_REQUIRED"});

    const customer = configuredCustomer();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
        !customer.userName ||
        customer.userName.length > 60 ||
        !customer.userAddress ||
        customer.userAddress.length > 400 ||
        !customer.userPhone ||
        customer.userPhone.length > 20)
      return json(res,503,{error:"OWNER_TEST_CUSTOMER_CONFIG_REQUIRED"});

    const userIp = String(
      req.headers["x-forwarded-for"] || ""
    ).split(",")[0].trim();

    if (!isIP(userIp))
      return json(res,400,{error:"TEST_CLIENT_IP_REQUIRED"});

    const merchantOid = createOwnerTestReference();

    const client = await pool.connect();

    try {
      await client.query("begin");

      await client.query(
        "select pg_advisory_xact_lock(hashtext($1))",
        ["R408_OWNER_PAYTR_TEST_GLOBAL"]
      );

      const active = await client.query(`
        select merchant_oid
        from public.paytr_owner_test_attempts
        where status in (
          'CREATED',
          'TOKEN_PENDING',
          'TOKEN_READY',
          'REVIEW_REQUIRED'
        ) or last_error_code='CONFLICTING_CALLBACK'
        limit 1
        for update
      `);

      if (active.rowCount > 0) {
        await client.query("rollback");

        return json(res,409,{
          error:"EXISTING_TEST_RECONCILIATION_REQUIRED"
        });
      }

      const recent = await client.query(`
        select count(*)::int as count
        from public.paytr_owner_test_attempts
        where created_at > now() - interval '1 hour'
      `);

      if (Number(recent.rows[0].count) >= 5) {
        await client.query("rollback");

        return json(res,429,{
          error:"OWNER_TEST_RATE_LIMIT"
        });
      }

      await client.query(`
        insert into public.paytr_owner_test_attempts (
          owner_user_id,
          merchant_oid,
          amount_minor,
          currency,
          environment,
          status,
          token_requested_at
        )
        values ($1,$2,100,'TRY','TEST','TOKEN_PENDING',now())
      `,[ownerId,merchantOid]);

      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(()=>{});
      throw error;
    } finally {
      client.release();
    }

    try {
      const token = await requestPaytrIframeToken({
        merchantOid,
        userIp,
        ...customer,
        paymentAmount:"100",
        userBasket:Buffer.from(JSON.stringify([
          ["FIXOKU PayTR Test", "1.00", 1]
        ])).toString("base64"),
        currency:"TL",
        noInstallment:"1",
        maxInstallmentNum:"1",
        testMode:"1"
      });

      const updated = await pool.query(`
        update public.paytr_owner_test_attempts
        set status='TOKEN_READY'
        where merchant_oid=$1
        and owner_user_id=$2
        and status='TOKEN_PENDING'
        and expires_at > now()
        returning merchant_oid
      `,[merchantOid,ownerId]);

      if (updated.rowCount !== 1)
        throw new Error("TEST_TOKEN_STATE_CONFLICT");

      return json(res,201,{
        testOnly:true,
        merchantOid,
        amountMinor:100,
        currency:"TRY",
        status:"TOKEN_READY",
        iframeUrl:"https://www.paytr.com/odeme/guvenli/" +
          encodeURIComponent(token)
      });

    } catch {
      await pool.query(`
        update public.paytr_owner_test_attempts
        set status='REVIEW_REQUIRED',
            last_error_code='TEST_TOKEN_RESULT_UNCERTAIN'
        where merchant_oid=$1
        and owner_user_id=$2
        and status in ('TOKEN_PENDING','TOKEN_READY')
      `,[merchantOid,ownerId]);

      return json(res,503,{
        error:"TEST_TOKEN_RECONCILIATION_REQUIRED"
      });
    }

  } catch {
    return json(res,503,{
      error:"OWNER_PAYTR_TEST_UNAVAILABLE"
    });
  } finally {
    if (!injectedPool) await pool.end();
  }
}