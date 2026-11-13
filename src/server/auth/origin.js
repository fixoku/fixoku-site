/* global process */

import {
  PREVIEW_CONTRACTS,
  exactPreviewCommit,
  exactPreviewContractEnvironment,
  isContractDeploymentHost,
  previewContractMetadataAttested,
  previewContractForBranch,
  r54sSafePreviewRuntime,
} from "./preview-contract.js";

const PRODUCTION_HOSTS = new Set(["fixoku.com", "www.fixoku.com"]);
const VERCEL_PROJECT_HOST = /^fixoku-site(?:-[a-z0-9-]+)?-fixoku\.vercel\.app$/u;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Resolve the one public origin used by auth callbacks, candidate activation,
 * invitations, and notification mail.
 *
 * Preview values are intentionally allowlisted. A random HTTPS domain is not
 * a valid deployment origin, and an unsafe preview configuration fails closed
 * instead of silently producing a production link.
 */
export function resolveApplicationOrigin(env = process.env) {
  const vercelEnvironment = String(env.VERCEL_ENV || "").trim().toLowerCase();
  const deployment = parseOrigin(env.VERCEL_URL, { preview: true });
  const hasConfigured = [env.APP_ORIGIN, env.BETTER_AUTH_URL].some((value) => String(value || "").trim());
  const configured = configuredOrigin(env);

  if (vercelEnvironment === "preview") {
    const contract = previewContractForBranch(env.VERCEL_GIT_COMMIT_REF);
    // Preview identity comes from Vercel system metadata. Unknown branches,
    // missing deployment URLs, and stale expected-commit values fail closed.
    // R54S uses the source-pinned R18 test DB identity instead of a mutable
    // expected-commit environment variable. Other branches retain the original gate.
    const runtimeVerified = contract === PREVIEW_CONTRACTS.r54StudentAcceptance
      ? r54sSafePreviewRuntime(env)
      : contract?.vercelProjectId
        ? exactPreviewContractEnvironment(contract, env)
        : exactPreviewCommit(contract, env);
    if (!contract || !deployment || !isVercelPreviewOrigin(deployment, contract) || !runtimeVerified) return null;
    if (hasConfigured && !configured) return null;
    if (configured) {
      if (!isApprovedPreviewOrigin(configured, contract, deployment)) return null;
      return configured.origin;
    }
    return deployment.origin;
  }

  if (hasConfigured && !configured) return null;
  if (configured) {
    if (vercelEnvironment === "production") return isProductionOrigin(configured) ? configured.origin : null;
    return isLocalOrigin(configured) ? configured.origin : null;
  }

  if (vercelEnvironment === "production") return "https://fixoku.com";
  return "http://127.0.0.1:5173";
}

/** Return only the current app origin and the exact current Vercel deployment origin. */
export function resolveTrustedOrigins(env = process.env) {
  const applicationOrigin = resolveApplicationOrigin(env);
  if (!applicationOrigin) return [];
  const origins = [applicationOrigin];
  const previewBranch = String(env.VERCEL_GIT_COMMIT_REF || "").trim();
  const contract = previewContractForBranch(previewBranch);
  const isR54S = previewBranch === PREVIEW_CONTRACTS.r54StudentAcceptance.branch || !previewBranch;
  const r54sVerified = isR54S && r54sSafePreviewRuntime(env);
  const contractVerified = contract && contract !== PREVIEW_CONTRACTS.r54StudentAcceptance
    ? exactPreviewContractEnvironment(contract, env) && previewContractMetadataAttested(contract, env)
    : false;
  const stagingContract = contract || (isR54S ? PREVIEW_CONTRACTS.r54StudentAcceptance : null);
  if ((r54sVerified || contractVerified) && stagingContract?.fixedOrigins?.includes("https://staging.fixoku.com")) {
    const stagingOrigin = "https://staging.fixoku.com";
    if (!origins.includes(stagingOrigin)) origins.push(stagingOrigin);
  }
  const deployment = parseOrigin(env.VERCEL_URL, { preview: true });
  if (String(env.VERCEL_ENV || "").trim().toLowerCase() === "preview" && deployment && !origins.includes(deployment.origin)) {
    origins.push(deployment.origin);
  }
  return origins;
}

export function requireApplicationOrigin(env = process.env) {
  const origin = resolveApplicationOrigin(env);
  if (!origin) throw new Error("PUBLIC_ORIGIN_NOT_CONFIGURED");
  return origin;
}

function configuredOrigin(env) {
  const values = [env.APP_ORIGIN, env.BETTER_AUTH_URL].filter((value) => String(value || "").trim());
  if (!values.length) return null;
  const parsed = values.map((value) => parseOrigin(value, { preview: String(env.VERCEL_ENV || "").trim().toLowerCase() === "preview" }));
  if (parsed.some((value) => !value) || new Set(parsed.map((value) => value.origin)).size !== 1) return null;
  return parsed[0];
}

function parseOrigin(value, { preview = false } = {}) {
  if (!String(value || "").trim()) return null;
  try {
    const raw = String(value);
    const parsed = new URL(/^https?:\/\//u.test(raw) ? raw : "https://" + raw);
    // Disposable loopback HTTP tests use an ephemeral port; production and
    // HTTPS preview origins keep the strict no-port allowlist.
    const isLocalHttp = parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash || (parsed.port && (!isLocalHttp || preview))) return null;
    if (preview && parsed.protocol !== "https:") return null;
    return { origin: parsed.origin, host: parsed.hostname.toLowerCase(), protocol: parsed.protocol };
  } catch {
    return null;
  }
}

function isProductionOrigin(value) {
  return value.protocol === "https:" && PRODUCTION_HOSTS.has(value.host);
}

function isVercelPreviewOrigin(value, contract) {
  return value.protocol === "https:"
    && VERCEL_PROJECT_HOST.test(value.host)
    && isContractDeploymentHost(contract, value.host);
}

function isApprovedPreviewOrigin(value, contract, deployment) {
  if (!contract || value.protocol !== "https:") return false;
  // The clean branch is deployment-origin only. It may not reuse the legacy
  // alias or branch URL, even when both APP_ORIGIN and BETTER_AUTH_URL match.
  if (contract === PREVIEW_CONTRACTS.cleanIntegration) return value.origin === deployment.origin;
  // The legacy branch retains its fixed alias/branch origin contract. A
  // generated deployment origin is accepted only when it is Vercel's current
  // deployment metadata, never an arbitrary vercel.app host.
  return contract.fixedOrigins.includes(value.origin) || value.origin === deployment.origin;
}

function isLocalOrigin(value) {
  return LOCAL_HOSTS.has(value.host) && value.protocol === "http:";
}
