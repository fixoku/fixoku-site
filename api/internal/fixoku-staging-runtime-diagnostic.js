/*
 * FIXOKU staging-only runtime diagnostic.
 *
 * This route is intentionally separate from the business access gate. It is
 * useful for one Preview deployment only and fails closed everywhere else.
 * Vercel Deployment Protection remains the first perimeter; the probe token
 * (or a signed deployment OIDC request) is an independent staging guard.
 *
 * The request carries no database material. DATABASE_URL and the Neon
 * integration metadata are read only inside the Vercel Function runtime.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import pg from "../../src/server/db/guarded-pg.js";
import {
  CLEAN_STAGING_HOSTS,
  CLEAN_STAGING_METADATA,
  PREVIEW_CONTRACTS,
  R16_STAGING_METADATA,
  R18_STAGING_METADATA,
  R18_STAGING_HOSTS,
  exactPreviewCommit,
  exactPreviewContractEnvironment,
  trustedPreviewDeploymentHost,
  isR16StagingHost,
  previewContractMetadataConfigured,
  previewContractMetadataAttested,
  previewContractForBranch,
  r404ConnectionTargetsConfigured,
} from "../../src/server/auth/preview-contract.js";
import { hasVercelOidcAuthorization } from "../../src/server/auth/vercel-oidc.js";

export const STAGING_DIAGNOSTIC_PATH = "/api/internal/fixoku-staging-runtime-diagnostic";
export const STAGING_DIAGNOSTIC_TOKEN_HEADER = "x-fixoku-clean-runtime-token";
export const STAGING_DIAGNOSTIC_TOKEN_ENV = "FIXOKU_CLEAN_RUNTIME_PROBE_TOKEN";
export const STAGING_DIAGNOSTIC_EXPECTED_PROJECT = "tiny-fire-86403197";
export const STAGING_DIAGNOSTIC_PRODUCTION_PROJECT = "long-mountain-95369343";
export const STAGING_DIAGNOSTIC_SQL = [
  "select current_database() as database,",
  "       current_user as role,",
  "       current_schema() as schema,",
  "       current_setting('server_version') as server_version,",
  "       current_setting('transaction_read_only') as transaction_read_only,",
  "       current_setting('neon.branch_id', true) as neon_branch_id,",
  "       current_setting('neon.project_id', true) as neon_project_id",
].join("\n");

const BEGIN_READ_ONLY_SQL = "begin read only";
const ROLLBACK_SQL = "rollback";
const VERCEL_PROJECT_ID = "prj_yWvXfOndJ6se89FdCiPbvKIZoGwR";
const VERCEL_ORG_ID = "team_G4NbdNKM6NSdvIVMUkszTQYc";
const TOKEN_PATTERN = /^[\x21-\x7e]{32,256}$/u;
const HOST_PATTERN = /^(?<endpoint>ep-[a-z0-9-]+?)(?<pooler>-pooler)?\.(?:[a-z0-9-]+\.){2}[a-z0-9-]+\.neon\.tech$/u;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,127}$/iu;

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.end(JSON.stringify(body));
};

function header(req, name) {
  const headers = req?.headers;
  if (headers && typeof headers.get === "function") return headers.get(name) || "";
  if (!headers || typeof headers !== "object") return "";
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? "" : String(value || "");
}

function constantTimeTokenMatch(provided, expected) {
  if (!TOKEN_PATTERN.test(provided) || !TOKEN_PATTERN.test(expected)) return false;
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

function requestHasBody(req) {
  const contentLength = Number.parseInt(header(req, "content-length"), 10);
  if (Number.isFinite(contentLength) && contentLength > 0) return true;
  if (header(req, "transfer-encoding")) return true;
  if (typeof req?.body === "string") return req.body.trim().length > 0;
  if (req?.body && typeof req.body === "object") return Object.keys(req.body).length > 0;
  return false;
}

function exactPath(req) {
  if (req?.query && Object.keys(req.query).length > 0) return false;
  try {
    const url = new URL(req?.url || STAGING_DIAGNOSTIC_PATH, "https://fixoku.invalid");
    return url.pathname === STAGING_DIAGNOSTIC_PATH && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

function runtimeProjectId(env, contract) {
  const values = [
    env?.NEON_PROJECT_ID,
    env?.DATABASE_NEON_PROJECT_ID,
    env?.VERCEL_NEON_PROJECT_ID,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  if (contract === PREVIEW_CONTRACTS.r16Staging || contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging)) {
    values.push(String(env?.[contract.metadata.project] || "").trim());
  }
  if (new Set(values).size > 1) return null;
  return values[0] || "";
}

function runtimeBranchId(env, contract) {
  const values = [
    env?.NEON_BRANCH_ID,
    env?.DATABASE_NEON_BRANCH_ID,
    env?.VERCEL_NEON_BRANCH_ID,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  if (contract === PREVIEW_CONTRACTS.r16Staging || contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging)) {
    values.push(String(env?.[contract.metadata.branch] || "").trim());
  }
  if (new Set(values).size > 1) return null;
  return values[0] || "";
}

function normalizeHost(value) {
  const host = String(value || "").trim().toLowerCase();
  return host && host.length <= 253 && !host.includes("..") && !host.includes("/") && !host.includes(":")
    ? host
    : "";
}

function connectionTarget(raw, kind) {
  let parsed;
  try { parsed = new URL(String(raw || "")); } catch { return null; }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) return null;
  if (!parsed.username || !parsed.password || (parsed.port && parsed.port !== "5432")) return null;
  const host = normalizeHost(parsed.hostname);
  const match = HOST_PATTERN.exec(host);
  if (!match?.groups?.endpoint) return null;
  if (kind === "pooled" ? match.groups.pooler !== "-pooler" : match.groups.pooler) return null;
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!database || parsed.searchParams.get("sslmode")?.toLowerCase() === "disable") return null;
  return { endpoint: match.groups.endpoint, database, host, pooled: match.groups.pooler === "-pooler" };
}

function targetMatchesExpected(target, kind, contract, env) {
  if (!target) return false;
  const isR16 = contract === PREVIEW_CONTRACTS.r16Staging;
  const isR18 = contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging);
  const expectedMetadata = isR16 ? R16_STAGING_METADATA : isR18 ? R18_STAGING_METADATA : CLEAN_STAGING_METADATA;
  const metadataHostName = kind === "pooled" ? contract.metadata.pooledHost : contract.metadata.directHost;
  const expectedHost = String(env?.[metadataHostName] || "").trim().toLowerCase();
  const targetHost = isR16
    ? (kind === "pooled" ? R16_STAGING_METADATA.pooledHost : R16_STAGING_METADATA.directHost)
    : isR18
      ? (kind === "pooled" ? R18_STAGING_HOSTS.pooled : R18_STAGING_HOSTS.direct)
      : (kind === "pooled" ? CLEAN_STAGING_HOSTS.pooled : CLEAN_STAGING_HOSTS.direct);
  const roleMatches = kind === "pooled" ? target.pooled : !target.pooled;
  const hostMatches = target.host === targetHost
    && expectedHost === targetHost
    && (!isR16 || isR16StagingHost(target.host, kind));
  return roleMatches
    && hostMatches
    && target.endpoint === expectedMetadata.endpoint
    && target.database === expectedMetadata.database;
}

function endpointFingerprint(endpoint) {
  return createHash("sha256").update(endpoint, "utf8").digest("hex");
}

function validRuntimeId(value) {
  const id = String(value || "").trim();
  return ID_PATTERN.test(id) ? id : "";
}

function normalizeFingerprint(row) {
  const database = String(row?.database || "");
  const role = String(row?.role || "");
  const schema = String(row?.schema || "");
  const serverVersion = String(row?.server_version || "");
  const transactionReadOnly = String(row?.transaction_read_only || "").toLowerCase();
  const branchId = validRuntimeId(row?.neon_branch_id);
  const projectId = validRuntimeId(row?.neon_project_id);
  if (!database || !role || !schema || !serverVersion || transactionReadOnly !== "on" || !branchId) {
    throw new Error("RUNTIME_NEON_METADATA_INVALID");
  }
  return { database, role, schema, serverVersion, transactionReadOnly, branchId, projectId };
}

function defaultPoolFactory(connectionString) {
  return new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    statement_timeout: 5_000,
  });
}

export async function readOnlyRuntimeFingerprint(kind, connectionString, poolFactory = defaultPoolFactory) {
  const pool = poolFactory(connectionString);
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query(BEGIN_READ_ONLY_SQL);
    transactionStarted = true;
    const result = await client.query(STAGING_DIAGNOSTIC_SQL);
    const fingerprint = normalizeFingerprint(result?.rows?.[0]);
    await client.query(ROLLBACK_SQL);
    transactionStarted = false;
    return { kind, ...fingerprint };
  } catch {
    if (transactionStarted && client) {
      try { await client.query(ROLLBACK_SQL); } catch { /* preserve safe error */ }
    }
    throw new Error("RUNTIME_NEON_FINGERPRINT_FAILED");
  } finally {
    if (client) {
      try { client.release(); } catch { /* no diagnostic output */ }
    }
    try { await pool.end(); } catch { /* no diagnostic output */ }
  }
}

function exactPreviewRuntime(env) {
  const contract = previewContractForBranch(env?.VERCEL_GIT_COMMIT_REF);
  return (contract === PREVIEW_CONTRACTS.cleanIntegration || contract === PREVIEW_CONTRACTS.r16Staging || contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging))
    && env?.VERCEL_PROJECT_ID === VERCEL_PROJECT_ID
    // VERCEL_ORG_ID is not a documented Vercel system variable; VERCEL_PROJECT_ID is checked above.
    && exactPreviewContractEnvironment(contract, env);
}

export function createStagingRuntimeDiagnosticHandler({
  poolFactory = defaultPoolFactory,
  oidcVerifier = hasVercelOidcAuthorization,
} = {}) {
  return async function stagingRuntimeDiagnosticHandler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    if (!exactPath(req) || requestHasBody(req)) return json(res, 400, { error: "REQUEST_BODY_NOT_ALLOWED" });

    const env = process.env;
    if (!exactPreviewRuntime(env)) {
      const c = previewContractForBranch(env.VERCEL_GIT_COMMIT_REF);
      // Temporary read-only 404 diagnosis. Emit boolean checks only, never values.
      console.warn("FIXOKU_R24Y_GATE", JSON.stringify({
        contractKnown: Boolean(c),
        vercelRuntime: env.VERCEL === "1",
        previewEnvironment: env.VERCEL_ENV === "preview",
        projectMatch: env.VERCEL_PROJECT_ID === VERCEL_PROJECT_ID,
        orgMatch: env.VERCEL_ORG_ID === VERCEL_ORG_ID,
        commitMatch: Boolean(c && exactPreviewCommit(c, env)),
        probeEnabled: Boolean(c && env[c.probeEnabledEnv] === "1"),
        hostMatch: Boolean(c && trustedPreviewDeploymentHost(c, env)),
      }));
      return json(res, 404, { error: "STAGING_DIAGNOSTIC_NOT_FOUND" });
    }

    const contract = previewContractForBranch(env.VERCEL_GIT_COMMIT_REF);
    const tokenHeader = contract?.probeTokenHeader || STAGING_DIAGNOSTIC_TOKEN_HEADER;
    const tokenEnv = contract?.probeTokenEnv || STAGING_DIAGNOSTIC_TOKEN_ENV;

    const tokenAuthorized = constantTimeTokenMatch(
      header(req, tokenHeader),
      String(env[tokenEnv] || ""),
    );
    const oidcAuthorized = await oidcVerifier(req, env);
    // A generated deployment host is only routing metadata. It is not proof
    // that the caller passed Vercel Deployment Protection. Require either the
    // independently configured probe token or a verified deployment OIDC
    // assertion before opening either read-only database connection.
    if (!tokenAuthorized && !oidcAuthorized) {
      // Temporary: presence booleans only, never token/header values.
      console.warn("FIXOKU_R24Y_AUTH", JSON.stringify({
        tokenHeaderPresent: Boolean(header(req, tokenHeader)),
        tokenConfigured: Boolean(env[tokenEnv]),
        tokenAccepted: tokenAuthorized,
        oidcAccepted: oidcAuthorized,
      }));
      return json(res, 404, { error: "STAGING_DIAGNOSTIC_NOT_FOUND" });
    }

    // R16 may bootstrap its read-only fingerprint before the operator writes
    // the attestation flag. Clean Preview and every other contract retain the
    // existing attestation requirement; this route never opens business APIs.
    if (!previewContractMetadataConfigured(contract, env)) {
      return json(res, 503, { error: "RUNTIME_STAGING_METADATA_UNVERIFIED" });
    }
    const attestation = String(env[contract.metadata.attested] || "").trim();
    if (contract !== PREVIEW_CONTRACTS.r16Staging && contract !== PREVIEW_CONTRACTS.r18Acceptance && !previewContractMetadataAttested(contract, env)) {
      return json(res, 503, { error: "RUNTIME_STAGING_METADATA_UNATTESTED" });
    }
    if ((contract === PREVIEW_CONTRACTS.r16Staging || contract === PREVIEW_CONTRACTS.r18Acceptance) && !["", "0", "1"].includes(attestation)) {
      return json(res, 503, { error: "RUNTIME_STAGING_METADATA_UNATTESTED" });
    }

    const configuredProjectId = runtimeProjectId(env, contract);
    if (configuredProjectId === null) {
      return json(res, 503, { error: "RUNTIME_NEON_PROJECT_METADATA_MISMATCH" });
    }
    const configuredBranchId = runtimeBranchId(env, contract);
    if (configuredBranchId === null) {
      return json(res, 503, { error: "RUNTIME_NEON_BRANCH_METADATA_MISMATCH" });
    }
    if (configuredProjectId === STAGING_DIAGNOSTIC_PRODUCTION_PROJECT) {
      return json(res, 503, { error: "RUNTIME_PRODUCTION_TARGET_BLOCKED" });
    }
    if (configuredProjectId !== STAGING_DIAGNOSTIC_EXPECTED_PROJECT) {
      return json(res, 503, { error: "RUNTIME_NEON_PROJECT_MISMATCH", target: { expectedProjectId: STAGING_DIAGNOSTIC_EXPECTED_PROJECT, configuredProjectId, matched: false } });
    }
    const expectedBranchId = contract === PREVIEW_CONTRACTS.r16Staging
      ? R16_STAGING_METADATA.branch
      : (contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging))
        ? R18_STAGING_METADATA.branch
        : null;
    if (expectedBranchId && configuredBranchId !== expectedBranchId) {
      return json(res, 503, { error: "RUNTIME_NEON_BRANCH_MISMATCH", target: { expectedBranchId, configuredBranchId, matched: false } });
    }

    if ((contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging) && !r404ConnectionTargetsConfigured(env)) {
      return json(res, 503, { error: "RUNTIME_DATABASE_TARGET_UNVERIFIED" });
    }
    const pooledTarget = connectionTarget(env.DATABASE_URL, "pooled");
    const directTarget = connectionTarget(env.DATABASE_URL_UNPOOLED, "direct");
    if (!pooledTarget || !directTarget
      || !targetMatchesExpected(pooledTarget, "pooled", contract, env)
      || !targetMatchesExpected(directTarget, "direct", contract, env)) {
      return json(res, 503, { error: "RUNTIME_DATABASE_TARGET_UNVERIFIED" });
    }
    if (pooledTarget.endpoint !== directTarget.endpoint || pooledTarget.database !== directTarget.database) {
      return json(res, 503, { error: "RUNTIME_DATABASE_ENDPOINT_MISMATCH" });
    }

    let pooled;
    try {
      pooled = await readOnlyRuntimeFingerprint("pooled", env.DATABASE_URL, poolFactory);
      const expectedDatabase = contract === PREVIEW_CONTRACTS.r16Staging
        ? R16_STAGING_METADATA.database
        : (contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging))
          ? R18_STAGING_METADATA.database
          : CLEAN_STAGING_METADATA.database;
      if (pooled.database !== expectedDatabase) {
        return json(res, 503, { error: "RUNTIME_DATABASE_MISMATCH" });
      }
      if (pooled.projectId === STAGING_DIAGNOSTIC_PRODUCTION_PROJECT) {
        return json(res, 503, { error: "RUNTIME_PRODUCTION_TARGET_BLOCKED" });
      }
      if (!pooled.projectId && !configuredProjectId) return json(res, 503, { error: "RUNTIME_NEON_PROJECT_METADATA_UNAVAILABLE" });
      if (pooled.projectId && pooled.projectId !== STAGING_DIAGNOSTIC_EXPECTED_PROJECT) {
        return json(res, 503, { error: "RUNTIME_NEON_PROJECT_MISMATCH", target: { expectedProjectId: STAGING_DIAGNOSTIC_EXPECTED_PROJECT, observedProjectId: pooled.projectId, matched: false } });
      }
      if (configuredProjectId && pooled.projectId && pooled.projectId !== configuredProjectId) {
        return json(res, 503, { error: "RUNTIME_NEON_PROJECT_MISMATCH", target: { configuredProjectId, observedProjectId: pooled.projectId, matched: false } });
      }
      if (expectedBranchId && pooled.branchId !== expectedBranchId) {
        return json(res, 503, { error: "RUNTIME_NEON_BRANCH_MISMATCH" });
      }
      if (configuredBranchId && pooled.branchId !== configuredBranchId) {
        return json(res, 503, { error: "RUNTIME_NEON_BRANCH_MISMATCH", target: { configuredBranchId, observedBranchId: pooled.branchId, matched: false } });
      }
    } catch {
      return json(res, 503, { error: "RUNTIME_NEON_FINGERPRINT_UNAVAILABLE" });
    }

    let direct;
    try {
      direct = await readOnlyRuntimeFingerprint("direct", env.DATABASE_URL_UNPOOLED, poolFactory);
    } catch {
      return json(res, 503, { error: "RUNTIME_NEON_FINGERPRINT_UNAVAILABLE" });
    }
    if (direct.projectId === STAGING_DIAGNOSTIC_PRODUCTION_PROJECT) {
      return json(res, 503, { error: "RUNTIME_PRODUCTION_TARGET_BLOCKED" });
    }
    const expectedDatabase = contract === PREVIEW_CONTRACTS.r16Staging
      ? R16_STAGING_METADATA.database
      : (contract === PREVIEW_CONTRACTS.r18Acceptance || contract === PREVIEW_CONTRACTS.stagingAcceptance || (contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging))
        ? R18_STAGING_METADATA.database
        : CLEAN_STAGING_METADATA.database;
    if (direct.database !== expectedDatabase) return json(res, 503, { error: "RUNTIME_DATABASE_MISMATCH" });
    if (!direct.projectId && !configuredProjectId) return json(res, 503, { error: "RUNTIME_NEON_PROJECT_METADATA_UNAVAILABLE" });
    if (direct.projectId && direct.projectId !== STAGING_DIAGNOSTIC_EXPECTED_PROJECT) return json(res, 503, { error: "RUNTIME_NEON_PROJECT_MISMATCH", target: { expectedProjectId: STAGING_DIAGNOSTIC_EXPECTED_PROJECT, observedProjectId: direct.projectId, matched: false } });
    if (pooled.projectId && direct.projectId && direct.projectId !== pooled.projectId) return json(res, 503, { error: "RUNTIME_NEON_PROJECT_MISMATCH", target: { pooledProjectId: pooled.projectId, directProjectId: direct.projectId, matched: false } });
    if (configuredProjectId && direct.projectId && direct.projectId !== configuredProjectId) return json(res, 503, { error: "RUNTIME_NEON_PROJECT_MISMATCH", target: { configuredProjectId, observedProjectId: direct.projectId, matched: false } });
    if (expectedBranchId && direct.branchId !== expectedBranchId) return json(res, 503, { error: "RUNTIME_NEON_BRANCH_MISMATCH" });
    if (configuredBranchId && direct.branchId !== configuredBranchId) return json(res, 503, { error: "RUNTIME_NEON_BRANCH_MISMATCH", target: { configuredBranchId, observedBranchId: direct.branchId, matched: false } });
    if ((contract === PREVIEW_CONTRACTS.r404Staging || contract === PREVIEW_CONTRACTS.r405Staging) &&
      (pooled.projectId !== STAGING_DIAGNOSTIC_EXPECTED_PROJECT || direct.projectId !== STAGING_DIAGNOSTIC_EXPECTED_PROJECT)) {
      return json(res, 503, { error: "RUNTIME_NEON_PROJECT_METADATA_UNAVAILABLE" });
    }
    if (pooled.branchId !== direct.branchId) return json(res, 503, { error: "RUNTIME_NEON_BRANCH_MISMATCH" });
    if (pooled.database !== direct.database) return json(res, 503, { error: "RUNTIME_DATABASE_MISMATCH" });

    // OWNER_WORKER_R394C
    if (header(req, "x-fixoku-owner-worker") === "1") {
      if (
        env.VERCEL_ENV !== "preview" ||
        env.VERCEL_GIT_COMMIT_REF !== "codex/fixoku-staging-acceptance-20261113" ||
        !tokenAuthorized ||
        header(req, "x-fixoku-smtp-check") === "1"
      ) {
        return json(res, 404, { error: "OWNER_WORKER_NOT_FOUND" });
      }

      if (
        env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1" ||
        env.FIXOKU_OWNER_EMAIL_WORKER_ENABLED !== "1"
      ) {
        return json(res, 503, { error: "OWNER_WORKER_DISABLED" });
      }

      if (
        pooled.branchId !== "br-fragrant-grass-b14anzbn" ||
        direct.branchId !== "br-fragrant-grass-b14anzbn" ||
        direct.database !== "neondb"
      ) {
        return json(res, 503, { error: "OWNER_WORKER_TARGET_BLOCKED" });
      }

      let workerPool;
      let workerClient;

      try {
        const { runOwnerEmailWorker } =
          await import("../../src/server/domain/owner-email-worker-r394.js");

        const workerUrl = new URL(env.DATABASE_URL_UNPOOLED);
        workerUrl.searchParams.set("sslmode", "verify-full");

        workerPool = new pg.Pool({
          connectionString: workerUrl.toString(),
          max: 1,
          connectionTimeoutMillis: 5000,
          statement_timeout: 10000
        });

        workerClient = await workerPool.connect();

        const target = (await workerClient.query(`
          select current_database() as db,
                 current_setting('neon.branch_id', true) as branch
        `)).rows[0];

        if (
          target?.db !== "neondb" ||
          target?.branch !== "br-fragrant-grass-b14anzbn"
        ) {
          return json(res, 503, { error: "OWNER_WORKER_DB_BLOCKED" });
        }

        const result = await runOwnerEmailWorker({
          client: workerClient,
          env
        });

        console.info("FIXOKU_OWNER_WORKER", JSON.stringify(result));

        return json(res, 200, {
          ok: result.status === "PROCESSED",
          environment: "preview",
          ownerWorker: result
        });

      } catch {
        return json(res, 503, { error: "OWNER_WORKER_EXECUTION_FAILED" });
      } finally {
        workerClient?.release();
        if (workerPool) await workerPool.end();
      }
    }

    // SMTP_RUNTIME_R391V
    if (
      env.VERCEL_GIT_COMMIT_REF === "codex/fixoku-staging-acceptance-20261113" &&
      header(req, "x-fixoku-smtp-check") === "1"
    ) {
      const { getSmtpConfig, getEmailTransportStatus } =
        await import("../../src/server/domain/email-outbox.js");

      const current = getEmailTransportStatus(env);
      const smtp = getSmtpConfig({
        ...env,
        EMAIL_PROVIDER: "SMTP",
        EMAIL_TEST_MODE: "0"
      });

      const result = {
        mode: current.mode,
        configured: Boolean(smtp),
        connected: false,
        passwordPresent: Boolean(env.SMTP_PASS || env.SMTP_PASSWORD),
        mailFromPresent: Boolean(env.MAIL_FROM),
        smtpFromPresent: Boolean(env.SMTP_FROM),
        ownerRecipientCorrect:
          env.FIXOKU_OWNER_NOTIFICATION_EMAIL === "ersinusta@fixoku.com",
        ownerNotificationsEnabled:
          env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED === "1",
        dailySummaryEnabled:
          env.FIXOKU_OWNER_DAILY_SUMMARY_ENABLED === "1",
        emailSent: false
      };

      if (smtp) {
        let transport;
        try {
          const { default: nodemailer } = await import("nodemailer");
          transport = nodemailer.createTransport({
            ...smtp.transport,
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
          });
          result.connected = await transport.verify() === true;
        } catch (error) {
          result.error = "SMTP_VERIFY_FAILED";
          result.errorCode = /^[A-Z0-9_]+$/.test(String(error?.code || ""))
            ? String(error.code) : "UNKNOWN";
          result.responseCode = Number(error?.responseCode) || null;
        } finally {
          transport?.close();
        }
      }

      return json(res, 200, {
        ok: result.connected,
        environment: "preview",
        smtp: result
      });
    }


    return json(res, 200, {
      ok: true,
      environment: "preview",
      branch: String(env.VERCEL_GIT_COMMIT_REF),
      commit: String(env.VERCEL_GIT_COMMIT_SHA).trim().toLowerCase(),
      target: {
        expectedProjectId: STAGING_DIAGNOSTIC_EXPECTED_PROJECT,
        neonProjectId: pooled.projectId || direct.projectId || configuredProjectId,
        matched: true,
        source: "vercel-neon-runtime-metadata",
      },
      connections: {
        pooled: {
          database: pooled.database,
          role: pooled.role,
          schema: pooled.schema,
          serverVersion: pooled.serverVersion,
          transactionReadOnly: pooled.transactionReadOnly,
          branchId: pooled.branchId,
          endpointFingerprint: endpointFingerprint(pooledTarget.endpoint),
        },
        direct: {
          database: direct.database,
          role: direct.role,
          schema: direct.schema,
          serverVersion: direct.serverVersion,
          transactionReadOnly: direct.transactionReadOnly,
          branchId: direct.branchId,
          endpointFingerprint: endpointFingerprint(directTarget.endpoint),
        },
      },
    });
  };
}

export default createStagingRuntimeDiagnosticHandler();
