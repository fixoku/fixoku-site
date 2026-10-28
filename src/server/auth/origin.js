/* global process */

const PRODUCTION_HOSTS = new Set(["fixoku.com", "www.fixoku.com"]);
const PREVIEW_ALIASES = new Set(["staging.fixoku.com"]);
const VERCEL_PROJECT_HOST = /^fixoku-site-[a-z0-9-]+\.vercel\.app$/u;
const PREVIEW_BRANCH = "codex/r97g-staging-preview-20261027";
const PREVIEW_BRANCH_ORIGIN = "https://fixoku-site-git-codex-r97g-staging-preview-20261027-fixoku.vercel.app";
const PREVIEW_COMMIT_ENV = "R97G_RUNTIME_EXPECTED_COMMIT_SHA";
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
    if (String(env.VERCEL_URL || "").trim() && (!deployment || !isVercelPreviewOrigin(deployment))) return null;
    if (hasConfigured && !configured) return null;
    if (configured) {
      if (!isApprovedPreviewOrigin(configured)) return null;
      if (configured.origin === PREVIEW_BRANCH_ORIGIN) {
        if (!isVerifiedTargetPreview(env)) return null;
        return configured.origin;
      }
      if (deployment && isVercelPreviewOrigin(configured) && configured.host !== deployment.host) return null;
      return configured.origin;
    }
    return deployment?.origin || null;
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

function isVercelPreviewOrigin(value) {
  return value.protocol === "https:" && VERCEL_PROJECT_HOST.test(value.host);
}

function isVerifiedTargetPreview(env) {
  if (String(env?.VERCEL_ENV || "").trim().toLowerCase() !== "preview") return false;
  if (String(env?.VERCEL_GIT_COMMIT_REF || "").trim() !== PREVIEW_BRANCH) return false;
  const actualCommit = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  const expectedCommit = String(env?.[PREVIEW_COMMIT_ENV] || "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/u.test(actualCommit)
    && /^[0-9a-f]{40}$/u.test(expectedCommit)
    && actualCommit === expectedCommit;
}

function isApprovedPreviewOrigin(value) {
  return value.protocol === "https:" && (PREVIEW_ALIASES.has(value.host) || isVercelPreviewOrigin(value));
}

function isLocalOrigin(value) {
  return LOCAL_HOSTS.has(value.host) && value.protocol === "http:";
}
