export const SITE_ORIGIN = "https://fixoku.com";

export function normalizeRoutePath(path = "/") {
  const pathWithoutQueryOrHash = String(path).split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = pathWithoutQueryOrHash.startsWith("/")
    ? pathWithoutQueryOrHash
    : `/${pathWithoutQueryOrHash}`;

  if (withLeadingSlash === "/") {
    return "/";
  }

  return withLeadingSlash.replace(/\/+$/, "");
}

export function buildSiteUrl(path = "/") {
  const normalizedPath = normalizeRoutePath(path);
  return normalizedPath === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${normalizedPath}`;
}
