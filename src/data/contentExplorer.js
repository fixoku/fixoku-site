import { blogArticles } from "./blogContent.js";
import { contentCatalogByPath } from "./contentCatalog.js";
import { publicRouteRegistry } from "./contentRoutes.js";

const blogArticlesByPath = new Map(blogArticles.map((article) => [article.path, article]));

function getContentPage(route) {
  return blogArticlesByPath.get(route.path) ?? contentCatalogByPath[route.path];
}

function buildContentExplorerGroups() {
  const groups = [];
  const groupsByPath = new Map();

  publicRouteRegistry.forEach((route) => {
    if (!route.contentKind) return;

    const page = getContentPage(route);
    if (!page) return;

    const collectionPath = page.kind === "hub"
      ? page.path
      : (route.breadcrumbs?.[1]?.path ?? page.collectionPath);

    if (!collectionPath) return;

    let group = groupsByPath.get(collectionPath);

    if (!group) {
      const hub = contentCatalogByPath[collectionPath];
      group = {
        path: collectionPath,
        label: hub?.navLabel ?? route.breadcrumbs?.[1]?.label ?? page.collectionLabel,
        items: [],
      };
      groupsByPath.set(collectionPath, group);
      groups.push(group);
    }

    group.items.push({
      path: page.path,
      label: page.shortTitle ?? page.navLabel ?? page.heading,
    });
  });

  return groups;
}

export const contentExplorerGroups = buildContentExplorerGroups();
