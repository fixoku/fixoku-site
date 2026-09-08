import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildSiteUrl, normalizeRoutePath } from "../../config/site.js";
import {
  getPublicRoute,
  notFoundSeo,
  panelSeo,
} from "../../data/contentRoutes.js";
import { buildContentSchemas } from "../../utils/seoSchemas.js";

function setMetaTag(attribute, value, content) {
  const selector = `meta[${attribute}="${value}"]`;
  let element = document.head.querySelector(selector);

  if (!content) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
  element.dataset.fixokuSeo = "true";
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');

  if (!href) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
  element.dataset.fixokuSeo = "true";
}

function setSchemas(schemas) {
  document.head
    .querySelectorAll('script[type="application/ld+json"][data-fixoku-seo]')
    .forEach((element) => element.remove());

  schemas.forEach((schema) => {
    const element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.fixokuSeo = "true";
    element.textContent = JSON.stringify(schema);
    document.head.appendChild(element);
  });
}

export function Seo({ route, pageType }) {
  useEffect(() => {
    const isIndexable = Boolean(route);
    const fallbackSeo = pageType === "panel" ? panelSeo : notFoundSeo;
    const title = route?.title ?? fallbackSeo.title;
    const description = route?.description ?? fallbackSeo.description;
    const canonical = isIndexable ? buildSiteUrl(route.path) : null;
    const robots = isIndexable ? route.robots : fallbackSeo.robots;

    document.documentElement.lang = "tr";
    document.title = title;

    setMetaTag("name", "description", description);
    setMetaTag("name", "robots", robots);
    setCanonical(canonical);

    setMetaTag("property", "og:title", isIndexable ? title : null);
    setMetaTag("property", "og:description", isIndexable ? description : null);
    setMetaTag("property", "og:url", canonical);
    setMetaTag("property", "og:type", isIndexable ? route.openGraphType : null);
    setMetaTag("property", "og:locale", isIndexable ? "tr_TR" : null);
    setMetaTag("name", "twitter:card", isIndexable ? "summary" : null);
    setMetaTag("name", "twitter:title", isIndexable ? title : null);
    setMetaTag("name", "twitter:description", isIndexable ? description : null);

    setSchemas(isIndexable ? buildContentSchemas(route) : []);
  }, [pageType, route]);

  return null;
}

export default function SeoRouteManager() {
  const location = useLocation();
  const normalizedPath = normalizeRoutePath(location.pathname);
  const route = getPublicRoute(normalizedPath);
  const pageType = location.pathname.startsWith("/panel") || location.pathname.startsWith("/giris") ? "panel" : route ? "public" : "not-found";

  return <Seo route={route} pageType={pageType} />;
}
