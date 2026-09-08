import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ORIGIN, buildSiteUrl, normalizeRoutePath } from "../src/config/site.js";
import {
  attentionFocusArticles,
  attentionFocusHub,
  attentionFocusPages,
} from "../src/data/attentionFocusContent.js";
import { blogArticles, blogPages } from "../src/data/blogContent.js";
import { contentExplorerGroups } from "../src/data/contentExplorer.js";
import {
  corporateArticles,
  corporateHub,
  corporatePages,
} from "../src/data/corporateContent.js";
import {
  fixokuEducationArticles,
  fixokuEducationHub,
  fixokuEducationPages,
} from "../src/data/fixokuEducationContent.js";
import {
  knowledgeCenterCategories,
  knowledgeCenterHub,
  knowledgeCenterPages,
} from "../src/data/knowledgeCenterContent.js";
import { businessIdentity, contactPhones, legalPages } from "../src/data/legalContent.js";
import {
  detailedInstitutionProcess,
  institutionBenefits,
  institutionFeatureSummaries,
  institutionFeatures,
  institutionHero,
  institutionReadingLandingRoute,
  institutionSocialProof,
  institutionTypes,
  shortInstitutionProcess,
} from "../src/data/institutionReadingLanding.js";
import { instructorReadingLandingRoute } from "../src/data/instructorReadingLanding.js";
import {
  attentionFocusRoutePaths,
  blogRoutePaths,
  corporateRoutePaths,
  fixokuEducationRoutePaths,
  indexableRoutePaths,
  knowledgeCenterRoutePaths,
  legalRoutePaths,
  publicRouteRegistry,
  quickReadingRoutePaths,
  trainingRoutePaths,
} from "../src/data/contentRoutes.js";
import { studentReadingLandingRoute } from "../src/data/contentRoutes.js";
import {
  COMPLETED_FREE_TEST_COUNT,
  TRAINED_STUDENT_COUNT,
} from "../src/data/socialProof.js";
import {
  quickReadingArticles,
  quickReadingHub,
  quickReadingPages,
} from "../src/data/quickReadingContent.js";
import {
  trainingArticles,
  trainingHub,
  trainingPages,
} from "../src/data/trainingContent.js";
import { trainerStories } from "../src/data/trainerStories.js";
import { buildContentSchemas } from "../src/utils/seoSchemas.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const failures = [];
const successes = [];
const forbiddenOrigin = ["fixoku", "com", "com"].join(".");

function check(condition, message) {
  if (condition) {
    successes.push(message);
  } else {
    failures.push(message);
  }
}

function isUnique(values) {
  return new Set(values).size === values.length;
}

function getSchemaNodes(schemas) {
  return schemas.flatMap((schema) =>
    Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [schema],
  );
}

function getSchemaTypes(schemas) {
  return getSchemaNodes(schemas).map((schema) => schema?.["@type"]);
}

const requiredQuickReadingRoutes = [
  "/hizli-okuma",
  "/hizli-okuma/nedir",
  "/hizli-okuma/neden-onemli",
  "/hizli-okuma/kimler-egitim-almali",
  "/hizli-okuma/firmalar-ve-egitim-modelleri",
  "/hizli-okuma/hizli-okursam-anlar-miyim",
];

const requiredAttentionFocusRoutes = [
  "/dikkat-ve-odaklanma",
  "/dikkat-ve-odaklanma/egitimi-nedir",
  "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
  "/dikkat-ve-odaklanma/ogrencilerde-dikkat-zayifligi",
  "/dikkat-ve-odaklanma/hizli-okumanin-etkisi",
  "/dikkat-ve-odaklanma/fixoku-nasil-destekler",
];

const requiredFixokuEducationRoutes = [
  "/fixoku-egitimi",
  "/fixoku-egitimi/neden-fixoku",
  "/fixoku-egitimi/egitim-sureci",
  "/fixoku-egitimi/yazilim",
  "/fixoku-egitimi/hizli-okuma-kitabi",
  "/fixoku-egitimi/egzersiz-kitaplari",
  "/fixoku-egitimi/paragraf-kitaplari",
];

const requiredKnowledgeCenterCategories = [
  "Hızlı Okuma",
  "Dikkat",
  "Odaklanma",
  "Hafıza",
  "Öğrenme Teknikleri",
  "Sınav Hazırlığı",
  "Kitap Okuma",
  "Verimli Ders Çalışma",
];

const requiredBlogRoutes = [
  "/blog/hizli-okumanin-sinav-basarisina-etkisi",
  "/blog/kelime-dagarcigi-ve-kendini-ifade-etme",
  "/blog/turkiyede-hizli-okumanin-onemi",
  "/blog/dikkat-ve-odaklanmanin-egitime-etkisi",
  "/blog/takistoskop-nedir",
];

const requiredBlogCategories = new Map([
  ["/blog/hizli-okumanin-sinav-basarisina-etkisi", "Sınav Hazırlığı"],
  ["/blog/kelime-dagarcigi-ve-kendini-ifade-etme", "Kitap Okuma"],
  ["/blog/turkiyede-hizli-okumanin-onemi", "Hızlı Okuma"],
  ["/blog/dikkat-ve-odaklanmanin-egitime-etkisi", "Dikkat"],
  ["/blog/takistoskop-nedir", "Öğrenme Teknikleri"],
]);

const requiredTrainingRoutes = [
  "/egitimler",
  "/egitimler/ilkokul-akici-okuma",
  "/egitimler/ilkokul-hizli-okuma",
  "/egitimler/ortaokul-hizli-okuma",
  "/egitimler/lise-hizli-okuma",
  "/egitimler/paragraf-teknikleri",
  "/egitimler/yetiskin-hizli-okuma",
  "/egitimler/sinav-odakli-hizli-okuma",
];

const requiredCorporateRoutes = [
  "/hakkimizda",
  "/sss",
];

const requiredLegalRoutes = [
  "/kvkk",
  "/gizlilik-politikasi",
  "/cerez-politikasi",
];

check(
  requiredQuickReadingRoutes.every((routePath) => quickReadingRoutePaths.includes(routePath)),
  "Altı Hızlı Okuma route'u merkezi registry içinde kayıtlı.",
);
check(quickReadingRoutePaths.length === 6, "Hızlı Okuma route sayısı tam olarak 6.");
check(
  requiredAttentionFocusRoutes.every((routePath) => attentionFocusRoutePaths.includes(routePath)),
  "Altı Dikkat ve Odaklanma route'u merkezi registry içinde kayıtlı.",
);
check(attentionFocusRoutePaths.length === 6, "Dikkat ve Odaklanma route sayısı tam olarak 6.");
check(
  requiredFixokuEducationRoutes.every((routePath) => fixokuEducationRoutePaths.includes(routePath)),
  "Yedi Fixoku Eğitimi route'u merkezi registry içinde kayıtlı.",
);
check(fixokuEducationRoutePaths.length === 7, "Fixoku Eğitimi route sayısı tam olarak 7.");
check(
  knowledgeCenterRoutePaths.length === 1 && knowledgeCenterRoutePaths[0] === "/blog",
  "Bilgi Merkezi yalnızca /blog hub route'u ile kayıtlı.",
);
check(
  knowledgeCenterPages.length === 1 &&
    knowledgeCenterCategories.length === 8 &&
    requiredKnowledgeCenterCategories.every((heading) =>
      knowledgeCenterCategories.some((category) => category.heading === heading),
    ) &&
    knowledgeCenterCategories.every((category) => !category.path),
  "Bilgi Merkezi sekiz routesuz kategori kartıyla hub-only yapıda hazır.",
);
check(
  requiredBlogRoutes.every((routePath) => blogRoutePaths.includes(routePath)) && blogRoutePaths.length === 5,
  "Beş Blog makalesi merkezi registry içinde kayıtlı.",
);
check(
  blogArticles.length === 5 &&
    blogArticles.every(
      (article) =>
        requiredBlogCategories.get(article.path) === article.category &&
        article.collectionPath === "/blog" &&
        article.schemaType === "Article",
    ),
  "Beş Blog makalesinin kategori, merkez ve schema eşleştirmeleri doğru.",
);
check(
  requiredTrainingRoutes.every((routePath) => trainingRoutePaths.includes(routePath)) &&
    trainingRoutePaths.length === 8,
  "Eğitimlerimiz hub ve yedi alt route ile merkezi registry içinde kayıtlı.",
);
check(
  trainingArticles.length === 7 &&
    trainingPages.length === 8 &&
    trainingHub.path === "/egitimler" &&
    trainingArticles.every(
      (article) => article.collectionPath === "/egitimler" && article.kind === "article",
    ),
  "Eğitimlerimiz merkezi veri kümesi bir hub ve yedi gerçek program içeriyor.",
);
check(
  publicRouteRegistry.filter((route) => route.path === "/egitimler").length === 1 &&
    !indexableRoutePaths.includes("/egitimlerimiz"),
  "Mevcut /egitimler hub'ı tek; yinelenen /egitimlerimiz route'u bulunmuyor.",
);
check(
  requiredCorporateRoutes.every((routePath) => corporateRoutePaths.includes(routePath)) &&
    corporateRoutePaths.length === 2,
  "Kurumsal hub ve bir alt route merkezi registry içinde kayıtlı.",
);
check(
  corporatePages.length === 2 &&
    corporateArticles.length === 1 &&
    corporateHub.path === "/hakkimizda" &&
    corporateHub.schemaType === "AboutPage" &&
    corporateArticles.every(
      (article) => article.collectionPath === "/hakkimizda" && article.kind === "article",
    ),
  "Kurumsal merkezi veri kümesi bir hub ve bir gerçek alt içerik taşıyor.",
);
const forbiddenCorporateRoutes = [
  "/kurumsal",
  "/kurumsalimiz",
  "/kurumsal-sayfalar",
  "/misyon-vizyon",
  "/yorumlar",
  "/okullar-icin/basvuru",
  "/egitmen-ol/basvuru",
];
check(
  publicRouteRegistry.filter((route) => route.path === "/hakkimizda").length === 1 &&
    forbiddenCorporateRoutes.every((routePath) => !indexableRoutePaths.includes(routePath)),
  "Mevcut /hakkimizda hub'ı tek ve kaynaksız kurumsal route üretilmedi.",
);
check(
  requiredLegalRoutes.every((routePath) => legalRoutePaths.includes(routePath)) &&
    legalRoutePaths.length === 3 &&
    legalPages.length === 3,
  "Üç hukuki route merkezi veri ve route registry içinde kayıtlı.",
);
check(indexableRoutePaths.length === 43, "Toplam indexlenebilir public route sayısı tam olarak 43.");
check(
  publicRouteRegistry.filter(
    (route) => route.path === studentReadingLandingRoute.path,
  ).length === 1 &&
    studentReadingLandingRoute.title === "Öğrenciler İçin Hızlı Okuma Eğitimi | Fixoku" &&
    studentReadingLandingRoute.description ===
      "Fixoku’nun ücretsiz dikkat, okuma ve anlama testleriyle öğrencinizin mevcut seviyesini ölçün; hızlı okuma, anlama, dikkat ve odaklanma eğitim modelini inceleyin." &&
    studentReadingLandingRoute.schemaType === "WebPage",
  "Öğrenci landing route'u tekil ve onaylı metadata ile merkezi registry içinde.",
);
check(
  publicRouteRegistry.filter(
    (route) => route.path === institutionReadingLandingRoute.path,
  ).length === 1 &&
    institutionReadingLandingRoute.title ===
      "Kurumlar İçin Hızlı Okuma Eğitimi | Fixoku Akademi" &&
    institutionReadingLandingRoute.description ===
      "Fixoku Akademi’nin yapay zekâ destekli hızlı okuma, anlama, dikkat ve odaklanma modelini okul, kurs, etüt merkezi ve eğitim kurumunuzda uygulayın." &&
    institutionReadingLandingRoute.schemaType === "WebPage",
  "Kurum landing route'u tekil ve onaylı metadata ile merkezi registry içinde.",
);
check(
  isUnique(publicRouteRegistry.map((route) => route.title)),
  "Indexlenebilir route title değerleri benzersiz.",
);
check(
  isUnique(publicRouteRegistry.map((route) => route.description)),
  "Indexlenebilir route meta description değerleri benzersiz.",
);
const approvedMetadataExceptions = new Map([
  [
    studentReadingLandingRoute.path,
    {
      title: "Öğrenciler İçin Hızlı Okuma Eğitimi | Fixoku",
      description:
        "Fixoku’nun ücretsiz dikkat, okuma ve anlama testleriyle öğrencinizin mevcut seviyesini ölçün; hızlı okuma, anlama, dikkat ve odaklanma eğitim modelini inceleyin.",
    },
  ],
  [
    instructorReadingLandingRoute.path,
    {
      title: "Hızlı Okuma Eğitmeni Ol | Fixoku Akademi",
      description:
        "Fixoku Akademi eğitmen modelini, yapay zekâ destekli yazılımı, eğitim sistemini, öğrenci takibini ve eğitmenlik sürecini keşfedin.",
    },
  ],
]);
check(
  publicRouteRegistry.every((route) => {
    const exception = approvedMetadataExceptions.get(route.path);
    return exception
      ? route.title === exception.title && route.description === exception.description
      : route.title.length >= 45 && route.title.length <= 70;
  }),
  "Title değerleri doğal SEO hedef aralığında veya onaylı landing title sözleşmesinde.",
);
check(
  publicRouteRegistry.every((route) => {
    if (approvedMetadataExceptions.has(route.path)) return true;
    return route.description.length >= 140 && route.description.length <= 165;
  }),
  "Meta description uzunlukları doğal SEO hedef aralığında.",
);

const canonicals = publicRouteRegistry.map((route) => buildSiteUrl(route.path));
check(isUnique(canonicals), "Canonical URL değerleri benzersiz.");
check(
  canonicals.every((canonical) => canonical.startsWith(SITE_ORIGIN)),
  "Bütün canonical URL değerleri merkezi production origin ile başlıyor.",
);
check(
  canonicals.every((canonical) => canonical === buildSiteUrl("/") || !canonical.endsWith("/")),
  "Ana sayfa dışındaki canonical URL değerlerinde trailing slash yok.",
);
check(
  canonicals.every((canonical) => !canonical.includes("?") && !canonical.includes("#")),
  "Canonical URL değerlerinde query string veya hash yok.",
);

const layoutSource = await readFile(
  path.join(projectRoot, "src", "components", "content", "ContentPageLayout.jsx"),
  "utf8",
);
const hubSource = await readFile(
  path.join(projectRoot, "src", "pages", "content", "TopicHub.jsx"),
  "utf8",
);
const articleSource = await readFile(
  path.join(projectRoot, "src", "pages", "content", "TopicArticle.jsx"),
  "utf8",
);
check(
  (layoutSource.match(/<h1(?:\s|>)/g) ?? []).length === 1 &&
    (hubSource.match(/<h1(?:\s|>)/g) ?? []).length === 0 &&
    (articleSource.match(/<h1(?:\s|>)/g) ?? []).length === 0,
  "Ortak içerik mimarisi her sayfada tek H1 üretiyor.",
);

const sitemapSource = await readFile(path.join(projectRoot, "public", "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
check(
  sitemapUrls.length === indexableRoutePaths.length &&
    indexableRoutePaths.every((routePath) => sitemapUrls.includes(buildSiteUrl(routePath))),
  "Sitemap ile merkezi indexlenebilir route registry birbiriyle uyumlu.",
);
check(
  !sitemapUrls.some((url) => new URL(url).pathname.startsWith("/panel")),
  "Panel route'ları sitemap dışında.",
);
check(
  !sitemapUrls.some((url) => new URL(url).pathname.includes("404")),
  "404 sitemap dışında.",
);

const schemaRoutes = publicRouteRegistry.filter((route) => route.schemaType);
check(
  schemaRoutes.length === publicRouteRegistry.length &&
    schemaRoutes.every((route) => {
      const schemas = buildContentSchemas(route);
      return schemas.length > 0 && schemas.every((schema) => {
      JSON.parse(JSON.stringify(schema));
      return true;
      });
    }),
  "Her public route boş olmayan, geçerli bir JSON-LD şema dizisi üretiyor.",
);

const homeRoute = publicRouteRegistry.find((route) => route.path === "/");
const homeSchemas = buildContentSchemas(homeRoute);
const homeGraph = homeSchemas[0];
const homeSchemaNodes = getSchemaNodes(homeSchemas);
const homeSchemaTypes = getSchemaTypes(homeSchemas);
const homeOrganization = homeSchemaNodes.find((schema) => schema["@type"] === "Organization");
const homeWebsite = homeSchemaNodes.find((schema) => schema["@type"] === "WebSite");
const homeWebpage = homeSchemaNodes.find((schema) => schema["@type"] === "WebPage");
const homeContactPoints = homeOrganization?.contactPoint ?? [];
const homeSchemaText = JSON.stringify(homeSchemas);
check(
  homeSchemas.length === 1 &&
    homeGraph?.["@context"] === "https://schema.org" &&
    Array.isArray(homeGraph?.["@graph"]) &&
    homeGraph["@graph"].length === 3 &&
    homeSchemaNodes.every((schema) => !schema["@context"]) &&
    JSON.stringify(homeSchemaTypes) === JSON.stringify(["Organization", "WebSite", "WebPage"]),
  "Ana sayfa tek kök @context ve üç düğümlü JSON-LD graph üretiyor.",
);
check(
    homeOrganization?.["@id"] === `${buildSiteUrl("/")}#organization` &&
    homeOrganization?.name === "Fixoku" &&
    homeOrganization?.legalName === "Fixoku Yayınları — Mavi Yeşil Ajans" &&
    homeOrganization?.alternateName === "Fixoku Akademi" &&
    homeOrganization?.url === buildSiteUrl("/") &&
    homeOrganization?.logo === buildSiteUrl("/brand/fixoku-logo-schema-512.png") &&
    homeOrganization?.slogan === "Okuyan, Anlayan, Gelişen Nesiller" &&
    homeOrganization?.foundingDate === "2022-01" &&
    !Object.hasOwn(homeOrganization, "founder") &&
    homeOrganization?.email === "info@fixoku.com" &&
    JSON.stringify(homeOrganization?.sameAs) === JSON.stringify(businessIdentity.socialProfiles) &&
    homeContactPoints.length === 2 &&
    new Set(homeContactPoints.map((point) => point.telephone)).size === 2 &&
    JSON.stringify(homeContactPoints.map((point) => point.name)) ===
      JSON.stringify([contactPhones.mobile.label, contactPhones.office.label]) &&
    JSON.stringify(homeContactPoints.map((point) => point.telephone)) ===
      JSON.stringify([contactPhones.mobile.display, contactPhones.office.display]) &&
    homeContactPoints.every(
      (point) =>
        point.contactType === "customer service" &&
        point.areaServed === "TR" &&
        point.availableLanguage === "tr",
    ) &&
    homeOrganization?.identifier?.some(
      (identifier) => identifier.propertyID === "MERSİS No" && identifier.value === "3437915176600013",
    ) &&
    homeOrganization?.identifier?.some(
      (identifier) => identifier.propertyID === "Ticaret Sicil No" && identifier.value === "1 171925",
    ),
  "Ana sayfa Organization düğümü doğrulanmış kurumsal kimlik, iletişim ve logo verilerini içeriyor.",
);
check(
  homeWebsite?.["@id"] === `${buildSiteUrl("/")}#website` &&
    homeWebsite?.url === buildSiteUrl("/") &&
    homeWebsite?.publisher?.["@id"] === homeOrganization?.["@id"] &&
    homeWebpage?.["@id"] === `${buildSiteUrl("/")}#webpage` &&
    homeWebpage?.url === buildSiteUrl("/") &&
    homeWebpage?.isPartOf?.["@id"] === homeWebsite?.["@id"] &&
    homeWebpage?.about?.["@id"] === homeOrganization?.["@id"] &&
    homeWebpage?.publisher?.["@id"] === homeOrganization?.["@id"],
  "Ana sayfa WebSite ve WebPage düğümleri canonical ve Organization kimliklerine bağlı.",
);
check(
  ![
    "FAQPage",
    "LocalBusiness",
    "Product",
    "Course",
    "Review",
    "AggregateRating",
    "SearchAction",
  ].some((type) => homeSchemaText.includes(`\"@type\":\"${type}\"`)),
  "Ana sayfa graph yasaklı veya doğrulanmamış schema türlerini içermiyor.",
);

const contactRoute = publicRouteRegistry.find((route) => route.path === "/iletisim");
check(
  JSON.stringify(buildContentSchemas(contactRoute).map((schema) => schema["@type"])) ===
    JSON.stringify(["ContactPage", "BreadcrumbList"]) &&
    contactRoute.breadcrumbs?.[0]?.path === "/" &&
    contactRoute.breadcrumbs?.[1]?.path === "/iletisim",
  "İletişim route'u ContactPage ve BreadcrumbList şemalarını doğru hiyerarşiyle üretiyor.",
);

check(
  legalRoutePaths.every((routePath) => {
    const route = publicRouteRegistry.find((item) => item.path === routePath);
    return JSON.stringify(buildContentSchemas(route).map((schema) => schema["@type"])) ===
      JSON.stringify(["WebPage", "BreadcrumbList"]);
  }),
  "Üç hukuki route WebPage ve BreadcrumbList şemalarını üretiyor.",
);

const blogArticleRoutes = publicRouteRegistry.filter((route) => blogRoutePaths.includes(route.path));
check(
  blogArticleRoutes.every((route) => {
    const articleSchema = buildContentSchemas(route)[0];
    return (
      articleSchema?.["@type"] === "Article" &&
      articleSchema.headline === route.heading &&
      articleSchema.description === route.description &&
      articleSchema.url === buildSiteUrl(route.path) &&
      articleSchema.mainEntityOfPage?.["@id"] === buildSiteUrl(route.path) &&
      articleSchema.inLanguage === "tr-TR" &&
      !articleSchema.author &&
      !articleSchema.datePublished &&
      !articleSchema.dateModified &&
      !articleSchema.publisher &&
      !articleSchema.image
    );
  }),
  "Blog Article şemaları yalnızca doğrulanabilir alanları içeriyor.",
);

const knownRoutePaths = new Set([...indexableRoutePaths, "/giris"]);
check(
  schemaRoutes.every(
    (route) =>
      route.path === "/" ||
      route.breadcrumbs?.every((item) => knownRoutePaths.has(item.path)),
  ),
  "Breadcrumb bağlantılarının tamamı gerçek route'lara gidiyor.",
);

const contentLinks = [
  ...quickReadingArticles.flatMap((article) => [
    ...article.related,
    article.cta.primary.to,
    article.cta.secondary?.to,
  ]),
  quickReadingHub.cta.primary.to,
  quickReadingHub.cta.secondary?.to,
  ...attentionFocusArticles.flatMap((article) => [
    ...article.related,
    article.cta.primary.to,
    article.cta.secondary?.to,
  ]),
  attentionFocusHub.cta.primary.to,
  attentionFocusHub.cta.secondary?.to,
  ...fixokuEducationArticles.flatMap((article) => [
    ...article.related,
    article.cta.primary.to,
    article.cta.secondary?.to,
  ]),
  fixokuEducationHub.cta.primary.to,
  fixokuEducationHub.cta.secondary?.to,
  knowledgeCenterHub.cta.primary.to,
  knowledgeCenterHub.cta.secondary?.to,
  ...blogArticles.flatMap((article) => [
    ...article.related,
    article.cta.primary.to,
    article.cta.secondary?.to,
  ]),
  ...trainingArticles.flatMap((article) => [
    ...article.related,
    article.cta.primary.to,
    article.cta.secondary?.to,
  ]),
  trainingHub.cta.primary.to,
  trainingHub.cta.secondary?.to,
  ...corporateArticles.flatMap((article) => [
    ...article.related,
    article.cta.primary.to,
    article.cta.secondary?.to,
  ]),
  corporateHub.cta.primary.to,
  corporateHub.cta.secondary?.to,
].filter(Boolean);
check(
  contentLinks.every((routePath) => knownRoutePaths.has(routePath)),
  "İlgili içerik ve CTA bağlantılarının tamamı gerçek route'lara gidiyor.",
);
const contentPages = [
  ...quickReadingPages,
  ...attentionFocusPages,
  ...fixokuEducationPages,
  ...knowledgeCenterPages,
  ...blogPages,
  ...trainingPages,
  ...corporatePages,
];
check(
  contentPages.every(
    (page) => page.sections.length > 0 && new Set(page.sections.map((section) => section.id)).size === page.sections.length,
  ),
  "Her içerik sayfasındaki bölüm ID değerleri dolu ve benzersiz.",
);

const attentionContent = JSON.stringify(attentionFocusPages).toLocaleLowerCase("tr-TR");
const unsafeAttentionClaims = [
  /(?:en az|ortalama) (?:2|iki) kat/,
  /garanti (?:eder|sağlar|sunar)/,
  /kesin (?:başarı sağlar|sonuç verir)/,
  /(?:tanı koyar|tedavi eder)/,
  /her öğrenci için aynı sonuç/,
];
check(
  unsafeAttentionClaims.every((pattern) => !pattern.test(attentionContent)),
  "Dikkat ve Odaklanma içeriklerinde garanti, kesin sonuç, tanı veya tedavi iddiası bulunmuyor.",
);

const attentionRiskPage = attentionFocusPages.find(
  (page) => page.path === "/dikkat-ve-odaklanma/ogrencilerde-dikkat-zayifligi",
);
const attentionRiskContent = JSON.stringify(attentionRiskPage).toLocaleLowerCase("tr-TR");
check(
  attentionRiskContent.includes("tıbbi tanı") &&
    attentionRiskContent.includes("sağlık uzman"),
  "Dikkat güçlüğü içeriği tanı koymuyor ve gerektiğinde uzman değerlendirmesine yönlendiriyor.",
);

const fixokuEducationContent = JSON.stringify(fixokuEducationPages).toLocaleLowerCase("tr-TR");
const unsafeFixokuClaims = [
  /(?:en iyi|ilk ve tek|en gelişmiş|en donanımlı)/,
  /(?:en az|ortalama) (?:2|iki) kat/,
  /garanti (?:eder|sağlar|sunar|verir)/,
  /kesin (?:başarı sağlar|sonuç verir)/,
  /21 günde kesin/,
  /(?:sınırsız|kesintisiz) (?:bir|1) yıllık erişim/,
];
check(
  unsafeFixokuClaims.every((pattern) => !pattern.test(fixokuEducationContent)),
  "Fixoku Eğitimi içeriklerinde garanti, kesin sonuç veya doğrulanmamış karşılaştırmalı iddia bulunmuyor.",
);
check(
  fixokuEducationContent.includes("eğitmenin yerini almaz") &&
    fixokuEducationContent.includes("otomatik teşhis") &&
    fixokuEducationContent.includes("başarı garantisi"),
  "Yazılım ve ürün içerikleri yapay zekâ, ölçüm ve sonuç sınırlarını açıkça belirtiyor.",
);
check(
  schemaRoutes.every((route) => !["Product", "Offer", "AggregateRating"].includes(route.schemaType)),
  "Kitap sayfalarında uydurma Product, Offer veya AggregateRating şeması bulunmuyor.",
);

const blogContent = JSON.stringify(blogPages).toLocaleLowerCase("tr-TR");
const unsafeBlogClaims = [
  /garanti (?:eder|sağlar|sunar|verir)/,
  /kesin (?:başarı|sonuç|hız artışı)/,
  /(?:2|iki) kat/,
  /\b\d+(?:[.,]\d+)?\s*%/,
  /(?:oecd|pisa)/,
  /(?:beyni yeniden programlar|görme bozukluğunu tedavi eder)/,
];
check(
  unsafeBlogClaims.every((pattern) => !pattern.test(blogContent)),
  "Blog içeriklerinde garanti, kesin sonuç, uydurma istatistik veya tıbbi iddia bulunmuyor.",
);
check(
  blogArticles.every(
    (article) =>
      !Object.hasOwn(article, "author") &&
      !Object.hasOwn(article, "datePublished") &&
      !Object.hasOwn(article, "dateModified") &&
      article.sections.length >= 5 &&
      article.related.length >= 1 &&
      article.related.length <= 3,
  ),
  "Blog makalelerinde yazar veya tarih uydurulmamış; bölüm ve ilgili içerik yapısı geçerli.",
);

const trainingContent = JSON.stringify(trainingPages).toLocaleLowerCase("tr-TR");
const unsafeTrainingClaims = [
  /(?:2|iki) kat/,
  /garanti (?:eder|sağlar|sunar|verir)/,
  /kesin (?:başarı|sonuç|hız artışı|puan|net)/,
  /(?:tanı koyar|tedavi eder|beyni yeniden programlar|fotoğrafik hafıza)/,
  /(?:türkiye'nin en|en iyi|ilk ve tek)/,
  /(?:4[.,]9|5[.,]0) (?:puan|yıldız)/,
  /(?:21|30) (?:gün|hafta)/,
  /3[.]000\+? öğrenci/,
];
check(
  unsafeTrainingClaims.every((pattern) => !pattern.test(trainingContent)),
  "Eğitimlerimiz içeriklerinde garanti, iki kat, tıbbi, puan, süre veya öğrenci sayısı iddiası bulunmuyor.",
);
check(
  trainingHub.sections.length >= 4 &&
    trainingArticles.every(
      (article) =>
        article.audience &&
        article.sections.length >= 5 &&
        article.related.length >= 2 &&
        article.related.length <= 3,
    ),
  "Eğitimlerimiz sayfalarında hedef kitle, bölüm ve ilgili içerik yapısı yeterli.",
);
const trainingSchemaRoutes = publicRouteRegistry.filter((route) =>
  trainingRoutePaths.includes(route.path),
);
check(
  trainingSchemaRoutes.every((route) =>
    route.path === "/egitimler"
      ? route.schemaType === "CollectionPage"
      : route.schemaType === "WebPage"),
  "Eğitimlerimiz hub CollectionPage, alt sayfalar WebPage şeması kullanıyor.",
);
check(
  trainingSchemaRoutes.every(
    (route) =>
      !["Course", "Product", "Offer", "Review", "AggregateRating", "FAQPage"].includes(
        route.schemaType,
      ),
  ),
  "Eğitim sayfalarında doğrulanamayan ticari, puan veya Course şeması bulunmuyor.",
);

const corporateSourceTruthPhrases = [
  "21 günlük ana gelişim programı",
  "21 günlük program",
  "21 günlük planlı",
  "126 uygulamadan",
  "126 egzersizle",
  "9 farklı beceri alanında",
];
const corporateHubContent = JSON.stringify(corporateHub).toLocaleLowerCase("tr-TR");
const corporateContent = JSON.stringify(corporateArticles).toLocaleLowerCase("tr-TR");
const unsafeCorporateClaims = [
  /(?:2|iki) kat/,
  /garanti (?:eder|sağlar|sunar|verir)/,
  /(?:ekonomik özgürlük|gelirlerini artır|kariyerini zirveye)/,
  /(?:21 günlük|4 ile 6 hafta|40 saat|1 yıl açık)/,
  /(?:%80|%30|%40)/,
  /(?:126 egzersiz|9 analiz|4\+ gelişim)/,
  /(?:en etkili|en az iki|başarıyı doğrudan)/,
  /(?:hiperaktif bozukluğu|tanı koyar|tedavi eder)/,
];
check(
  unsafeCorporateClaims.every((pattern) => !pattern.test(corporateContent)),
  "Kurumsal içeriklerde garanti, iki kat, gelir, sabit süre, yüzde veya tıbbi iddia bulunmuyor.",
);
check(
  corporateSourceTruthPhrases.every((phrase) => corporateHubContent.includes(phrase)),
  "Hakkımızda SOURCE OF TRUTH içeriğinin ölçülebilir gelişim ifadeleri eksiksiz korunuyor.",
);
check(
  corporateHub.sections.length >= 4 &&
    corporateArticles.every(
      (article) =>
        article.audience &&
        article.sections.length >= 5 &&
        article.related.length >= 2 &&
        article.related.length <= 3,
    ),
  "Kurumsal sayfalarda hedef kitle, bölüm ve ilgili içerik yapısı yeterli.",
);
const corporateSchemaRoutes = publicRouteRegistry.filter((route) =>
  corporateRoutePaths.includes(route.path),
);
check(
  corporateSchemaRoutes.every((route) =>
    route.path === "/hakkimizda"
      ? route.schemaType === "AboutPage"
      : route.schemaType === "WebPage"),
  "Kurumsal hub AboutPage, bir alt sayfa WebPage şeması kullanıyor.",
);
const aboutRoute = publicRouteRegistry.find((route) => route.path === "/hakkimizda");
const aboutPageSchema = buildContentSchemas(aboutRoute).find((schema) => schema?.["@type"] === "AboutPage");
const requiredAboutHeadings = [
  "Biz Kimiz?",
  "Fixoku Akademi Nedir?",
  "Eğitim Modelimiz",
  "Fixoku Akademi Nasıl Çalışır?",
  "Fixoku Metodu",
  "Eğitim Alanlarımız",
  "Kimler İçin Uygundur?",
  "Neden Fixoku Akademi?",
  "Eğitim Kazanımları",
  "Eğitmen ve Kurum Modeli",
  "Misyonumuz",
  "Vizyonumuz",
  "Geleceğin Öğrenme Modeli",
];
check(
  aboutRoute?.title === "Fixoku Akademi Hakkında | Hızlı Okuma ve Akademik Gelişim" &&
    aboutRoute?.description.length >= 140 &&
    aboutRoute?.description.length <= 165 &&
    aboutPageSchema?.about?.["@id"] === `${buildSiteUrl("/")}#organization` &&
    aboutPageSchema?.publisher?.["@id"] === `${buildSiteUrl("/")}#organization` &&
    aboutPageSchema?.isPartOf?.["@id"] === `${buildSiteUrl("/")}#website` &&
    !JSON.stringify(buildContentSchemas(aboutRoute)).includes('"@type":"Organization"'),
  "Hakkımızda AboutPage metadata ve mevcut Organization/Website bağlantılarıyla tekil şema kullanıyor.",
);
check(
  JSON.stringify(corporateHub.sections.map((section) => section.title)) === JSON.stringify(requiredAboutHeadings) &&
    corporateHub.sections.some((section) => section.subsections?.length),
  "Hakkımızda tek H1 altında on üç H2 ve iç içe H3 içerik hiyerarşisini kullanıyor.",
);
check(
  corporateSchemaRoutes.every(
    (route) =>
      ![
        "FAQPage",
        "Course",
        "Product",
        "Offer",
        "Review",
        "AggregateRating",
      ].includes(route.schemaType),
  ),
  "Kurumsal sayfalarda FAQPage veya doğrulanamayan ticari şema bulunmuyor.",
);

const legalContent = JSON.stringify(legalPages).toLocaleLowerCase("tr-TR");
const forbiddenLegalContent = [
  "fixoku.com.tr",
  "dersfix.com",
  "tamamen güvende",
  "kırılması mümkün olmayan",
  "mail order",
  "paytr",
  "iyzico",
  "iyzigo",
];
check(
  legalPages.every(
    (page) =>
      page.sections.length >= 5 &&
      page.updatedAt === "19 Temmuz 2026" &&
      page.schemaType === "WebPage",
  ) && forbiddenLegalContent.every((phrase) => !legalContent.includes(phrase)),
  "Hukuki içerikler kapsamlı, güncel tarihli ve eski domain, kesin güvenlik veya doğrulanmamış ödeme ifadelerinden arınmış.",
);
check(
  legalContent.includes("fixoku-reading-text-rotation-v1") &&
    legalContent.includes("document.cookie") &&
    legalContent.includes("google analytics") &&
    legalContent.includes("meta pixel") &&
    legalContent.includes("iletişim formu mevcut teknik yapıda veriyi bir sunucuya göndermemektedir"),
  "Hukuki metinler gerçek storage ve iletişim formu envanterini açıkça yansıtıyor.",
);

const expectedExplorerCounts = new Map([
  ["Hızlı Okuma", 6],
  ["Dikkat ve Odaklanma", 6],
  ["Fixoku Eğitimi", 7],
  ["Bilgi Merkezi", 6],
  ["Eğitimlerimiz", 8],
  ["Kurumsal", 2],
]);
check(
  contentExplorerGroups.length === expectedExplorerCounts.size &&
    contentExplorerGroups.every(
      (group) => expectedExplorerCounts.get(group.label) === group.items.length,
    ),
  "Global Content Explorer altı merkezi grubu 6, 6, 7, 6, 8 ve 2 içerikle üretiyor.",
);
check(
  contentExplorerGroups
    .find((group) => group.label === "Eğitimlerimiz")
    ?.items.every((item) => requiredTrainingRoutes.includes(item.path)),
  "Global Content Explorer Eğitimlerimiz grubunu sekiz gerçek route'tan otomatik oluşturuyor.",
);
check(
  contentExplorerGroups
    .find((group) => group.label === "Kurumsal")
    ?.items.every((item) => requiredCorporateRoutes.includes(item.path)),
  "Global Content Explorer Kurumsal grubunu iki gerçek route'tan otomatik oluşturuyor.",
);

const headerSource = await readFile(
  path.join(projectRoot, "src", "components", "Header.jsx"),
  "utf8",
);
const footerSource = await readFile(
  path.join(projectRoot, "src", "components", "Footer.jsx"),
  "utf8",
);
check(
  headerSource.includes("attentionFocusArticles") &&
    headerSource.includes("ATTENTION_FOCUS_HUB_PATH") &&
    footerSource.includes('/dikkat-ve-odaklanma'),
  "Dikkat ve Odaklanma masaüstü, mobil ve footer navigasyonuna bağlı.",
);
check(
  headerSource.includes("fixokuEducationArticles") &&
    headerSource.includes("FIXOKU_EDUCATION_HUB_PATH") &&
    footerSource.includes('/fixoku-egitimi'),
  "Fixoku Eğitimi masaüstü, mobil ve footer navigasyonuna bağlı.",
);
check(
  headerSource.includes("trainingArticles") &&
    headerSource.includes("TRAINING_HUB_PATH") &&
    footerSource.includes("trainingFooterLinks") &&
    !headerSource.includes("/ogrenci-programlari") &&
    !footerSource.includes("/ogrenci-programlari"),
  "Eğitimlerimiz masaüstü, mobil ve footer navigasyonunda merkezi gerçek route'ları kullanıyor.",
);
check(
  headerSource.includes("corporateArticles") &&
    headerSource.includes("CORPORATE_HUB_PATH") &&
    footerSource.includes("corporateFooterLinks") &&
    forbiddenCorporateRoutes.every(
      (routePath) => !headerSource.includes(routePath) && !footerSource.includes(routePath),
    ),
  "Kurumsal masaüstü, mobil ve footer navigasyonu merkezi gerçek route'ları kullanıyor.",
);
check(
  headerSource.includes('const BLOG_PATH = "/blog";') &&
    headerSource.includes('{ label: "Blog", to: BLOG_PATH, icon: "message" }') &&
    (headerSource.match(/items: corporateMenuItems/g) ?? []).length === 2 &&
    !headerSource.includes('className="nav-link blog-nav-link"') &&
    !headerSource.includes('className={`mobile-main-link ${location.pathname.startsWith("/blog")') &&
    footerSource.includes('{ label: "Bilgi Merkezi", to: "/blog" }'),
  "Blog masaüstü ve mobil Kurumsal alt menülerinin son öğesi; footer Bilgi Merkezi bağlantısı korunuyor.",
);
const appRoutesSource = await readFile(path.join(projectRoot, "src", "AppRoutes.jsx"), "utf8");
const appSource = await readFile(path.join(projectRoot, "src", "App.jsx"), "utf8");
const assessmentTestsSource = await readFile(
  path.join(projectRoot, "src", "components", "assessment", "AssessmentTests.jsx"),
  "utf8",
);
const studentLandingSource = await readFile(
  path.join(projectRoot, "src", "pages", "StudentReadingLanding.jsx"),
  "utf8",
);
const studentLandingCssSource = await readFile(
  path.join(projectRoot, "src", "pages", "student-reading-landing.css"),
  "utf8",
);
const studentStoriesSource = await readFile(
  path.join(projectRoot, "src", "components", "StudentStoriesSection.jsx"),
  "utf8",
);
const socialProofSource = await readFile(
  path.join(projectRoot, "src", "data", "socialProof.js"),
  "utf8",
);
const trainerStoriesSource = await readFile(
  path.join(projectRoot, "src", "components", "TrainerStoriesSection.jsx"),
  "utf8",
);
const trainerStoriesDataSource = await readFile(
  path.join(projectRoot, "src", "data", "trainerStories.js"),
  "utf8",
);
const institutionLandingSource = await readFile(
  path.join(projectRoot, "src", "pages", "InstitutionReadingLanding.jsx"),
  "utf8",
);
const institutionLandingCssSource = await readFile(
  path.join(projectRoot, "src", "pages", "institution-reading-landing.css"),
  "utf8",
);
const institutionApiSource = await readFile(
  path.join(projectRoot, "api", "institution-application.js"),
  "utf8",
);
const institutionContractSource = await readFile(
  path.join(projectRoot, "scripts", "test-institution-application.mjs"),
  "utf8",
);
const packageSource = await readFile(path.join(projectRoot, "package.json"), "utf8");
const viteConfigSource = await readFile(path.join(projectRoot, "vite.config.js"), "utf8");
const STANDING_CHILD_IMAGE_PATH =
  "/images/landing/ogrenciler-icin-hizli-okuma-egitimi/ayakta-cocuk.png";
const SEATED_CHILD_IMAGE_PATH =
  "/images/landing/ogrenciler-icin-hizli-okuma-egitimi/oturan-cocuk.png";
const contactSource = await readFile(path.join(projectRoot, "src", "pages", "iletisim.jsx"), "utf8");
const readingTestSource = await readFile(path.join(projectRoot, "src", "ReadingSpeedTest.jsx"), "utf8");
const attentionTestSource = await readFile(path.join(projectRoot, "src", "AttentionFocusTest.jsx"), "utf8");
const requiredHomepagePhrases = [
  "Çocuğunuzun dikkat ve odaklanma seviyesini 2 dakikada ölçün",
  "Okuma Ölçümünü Başlat",
  "Fixoku Eğitim Kitapları",
  "21 Günlük Başarı Serüveni",
  "126 Egzersiz İçeriği",
  "9 Kategoride Ölçümleme ve Analiz",
  "1 Yıl Aktif Serbest Çalışma Alanı",
  "21 günlük eğitim sonunda öğrencilerin okuma hızında ve anlama",
  "Yapay zekâ destekli yazılımımız, öğrencilerin gelişimini anlık olarak takip",
  "Fixoku Yazılımı",
  "becerilerini geliştiren bütüncül eğitim sistemiyle öğrencilerin akademik",
  "Uzman eğitmen eğitim vererek gelişimi takip eder.",
  "Eğitim nasıl yapılmaktadır?",
  "Eğitim online ya da yüz yüze olarak yapılabilir.",
];
const forbiddenHomepagePhrases = [
  "12000",
  "12.000+",
  "ortalama 2 kat",
  "ortalama iki kat",
  "2 kat okuma",
  "Fixoku Eğitim Deneyimi",
  "Eğitim online mı yapılmaktadır?",
  "Okuma Testini Başlat",
  "2 dakikalık test ile",
];
const homepageExperienceSource = `${appSource}\n${assessmentTestsSource}\n${studentStoriesSource}`;
check(
  requiredHomepagePhrases.every((phrase) => homepageExperienceSource.includes(phrase)) &&
    forbiddenHomepagePhrases.every((phrase) => !homepageExperienceSource.includes(phrase)) &&
    !/Fixoku Eğitim Kitabı(?!ları)/u.test(homepageExperienceSource),
  "Ana sayfa kaynak içeriği güncel Word sözleşmesindeki metinlerle eşleşiyor.",
);
check(
  TRAINED_STUDENT_COUNT === 2000 &&
    COMPLETED_FREE_TEST_COUNT === 3000 &&
    socialProofSource.includes("export const TRAINED_STUDENT_COUNT = 2000;") &&
    socialProofSource.includes("export const COMPLETED_FREE_TEST_COUNT = 3000;") &&
    assessmentTestsSource.includes("data-counter-target={COMPLETED_FREE_TEST_COUNT}") &&
    studentStoriesSource.includes("formatSocialProofCount(TRAINED_STUDENT_COUNT)") &&
    studentLandingSource.includes("formatSocialProofCount(TRAINED_STUDENT_COUNT)") &&
    studentLandingSource.includes("formatSocialProofCount(COMPLETED_FREE_TEST_COUNT)"),
  "Test çözen 3000 ve eğitim alan 2000 istatistikleri tek merkezi veri kaynağından ayrı bağlamlarda kullanılıyor.",
);

const forbiddenStudentLandingPhrases = [
  "28 gün",
  "Türkiye’nin en iyi",
  "Netlerini katlayacağız",
  "İstediğin okulu kazandıracağız",
  "Kesin başarı",
  "Garanti sonuç",
  "Ortalama 2 kat",
  "12.000+",
  "12000",
  "3.000+ öğrenci eğitim aldı",
  "Her iki test 2 dakikada tamamlanır",
  "Ersin Usta",
  "ERSİN USTA",
  "Ersin usta",
  "Uzman Eğitmenle Görüş",
  "Yeni Nesil Akademik Gelişim Sistemi",
];
check(
  (studentLandingSource.match(/<h1(?:\s|>)/g) ?? []).length === 1 &&
    studentLandingSource.includes(studentReadingLandingRoute.heading) &&
    studentLandingSource.includes("Okuma hızı, anlama oranı, dikkat ve odaklanma becerileri için ücretsiz") &&
    forbiddenStudentLandingPhrases.every((phrase) => !studentLandingSource.includes(phrase)),
  "Öğrenci landing sayfası tek onaylı H1 ile başlıyor; üst PDF hero'su ve yüksek riskli iddialar kaynakta yok.",
);
check(
  appRoutesSource.includes('path="/ogrenciler-icin-hizli-okuma-egitimi"') &&
    appRoutesSource.includes("<StudentReadingLanding />") &&
    appSource.includes('to: "/ogrenciler-icin-hizli-okuma-egitimi"') &&
    !appSource.includes('title: "Veliyim",\n    description: "Çocuğuma eğitim almak istiyorum.",\n    to: "/iletisim"'),
  "Yeni landing route'u AppRoutes'a bağlı ve ana sayfadaki Veliyim kartı doğal hedef olarak güncellendi.",
);
check(
  appSource.includes("<AssessmentTestExperience>") &&
    appSource.includes("<AssessmentTestCards onStartTest={openTest} />") &&
    studentLandingSource.includes("<AssessmentTestExperience>") &&
    studentLandingSource.includes("<AssessmentTestCards") &&
    (assessmentTestsSource.match(/import\("\.\.\/\.\.\/ReadingSpeedTest\.jsx"\)/g) ?? []).length === 1 &&
    (assessmentTestsSource.match(/import\("\.\.\/\.\.\/AttentionFocusTest\.jsx"\)/g) ?? []).length === 1 &&
    !appSource.includes("ReadingSpeedTest") &&
    !appSource.includes("AttentionFocusTest") &&
    !studentLandingSource.includes("ReadingSpeedTest") &&
    !studentLandingSource.includes("AttentionFocusTest"),
  "Ana sayfa ve öğrenci landing sayfası aynı kart, modal, state ve gerçek test componentlerini kullanıyor; test kodu yinelenmiyor.",
);
check(
  appSource.includes("<StudentStoriesSection />") &&
    studentLandingSource.includes("<StudentStoriesSection />") &&
    studentStoriesSource.includes('className={`stories-section ${className}`.trim()}') &&
    studentStoriesSource.includes("Fixoku</span> Eğitimi Alan Öğrenciler ve Veliler") &&
    studentStoriesSource.includes('aria-label="Önceki öğrenci videosu"') &&
    studentStoriesSource.includes('aria-label="Sonraki öğrenci videosu"') &&
    studentStoriesSource.includes('className="trainer-video-modal"') &&
    !appSource.includes('className="stories-section"') &&
    !studentLandingSource.includes('className="stories-section"'),
  "Ana sayfa ve öğrenci landing sayfası aynı öğrenci/veli video slider componentini ve veri kaynağını kullanıyor.",
);
check(
  appRoutesSource.includes("INSTITUTION_READING_LANDING_PATH") &&
    appRoutesSource.includes("<InstitutionReadingLanding />") &&
    appSource.includes("INSTITUTION_READING_LANDING_PATH") &&
    headerSource.includes("INSTITUTION_READING_LANDING_PATH") &&
    headerSource.includes('article.navLabel === "Kurumunuzda Eğitim Verin"'),
  "Kurum landing route'u AppRoutes, ana sayfa kurum kartı ve Kurumsal menü hedefiyle bağlı.",
);
check(
  (institutionLandingSource.match(/<h1(?:\s|>)/g) ?? []).length === 1 &&
    institutionLandingSource.includes("{institutionReadingLandingRoute.heading}") &&
    institutionTypes.length === 5 &&
    institutionBenefits.length === 5 &&
    institutionFeatureSummaries.length === 6 &&
    institutionFeatures.length === 11 &&
    shortInstitutionProcess.length === 5 &&
    detailedInstitutionProcess.length === 7,
  "Kurum landing tek H1, 5 kurum türü, 5 kazanım, 6 honeycomb maddesi, 11 özellik ve 5/7 süreç sözleşmesini karşılıyor.",
);
check(
  /<StudentStoriesSection\s+[\s\S]*?className="institution-shared-stories"[\s\S]*?\/>/.test(
    institutionLandingSource,
  ) &&
    /<TrainerStoriesSection\s+[\s\S]*?className="institution-shared-trainers"[\s\S]*?\/>/.test(
      institutionLandingSource,
    ) &&
    (institutionLandingSource.match(/<StudentStoriesSection(?:\s|>)/g) ?? []).length === 1 &&
    (institutionLandingSource.match(/<TrainerStoriesSection(?:\s|>)/g) ?? []).length === 1 &&
    appSource.includes("<TrainerStoriesSection />") &&
    !appSource.includes('className="trainer-videos-section"') &&
    trainerStoriesSource.includes('className={`trainer-videos-section ${className}`.trim()}') &&
    trainerStories.length === 8 &&
    isUnique(trainerStories.map((story) => story.id)) &&
    trainerStoriesDataSource.includes('id: "trainer-burak-antalya"'),
  "Öğrenci ve eğitmen video alanları ortak componentlerden geliyor; ana sayfadaki inline eğitmen sliderı kaldırıldı.",
);
check(
  institutionLandingSource.includes("function InstitutionVideoPlaceholder({ ariaLabel, variant })") &&
    (institutionLandingSource.match(/<InstitutionVideoPlaceholder(?:\s|>)/g) ?? []).length === 2 &&
    institutionLandingSource.includes('variant="hero"') &&
    institutionLandingSource.includes('variant="features"') &&
    institutionLandingSource.includes("data-empty-video={variant}") &&
    institutionLandingSource.includes('role="img"') &&
    institutionLandingSource.includes('aria-label={ariaLabel}') &&
    institutionLandingSource.includes('aria-hidden="true"') &&
    !(institutionLandingSource.match(/function InstitutionVideoPlaceholder[\s\S]*?\n}/)?.[0] ?? "").includes("onClick") &&
    !institutionLandingSource.includes("<video") &&
    /\.institution-video-placeholder\s*\{[\s\S]*?cursor:\s*default;[\s\S]*?\}/.test(
      institutionLandingCssSource,
    ),
  "Kurum landing iki farklı etiketli, ortak, dekoratif ve etkileşimsiz boş play alanı kullanıyor.",
);
check(
  institutionLandingSource.includes("data-institution-circle-count={institutionTypes.length}") &&
    institutionLandingSource.includes("data-benefit-count={institutionBenefits.length}") &&
    institutionLandingSource.includes("data-feature-count={institutionFeatures.length}") &&
    institutionLandingSource.includes("data-honeycomb-count={institutionFeatureSummaries.length}") &&
    !institutionLandingSource.includes("data-process-summary-count=") &&
    !institutionLandingSource.includes("data-process-summary=") &&
    !institutionLandingSource.includes("institution-summary-icon") &&
    institutionLandingSource.includes('className="institution-feature-bars institution-feature-cards"') &&
    institutionLandingSource.includes("institutionFeatures.slice(0, 3)") &&
    institutionLandingSource.includes("detailedInstitutionProcess.slice(0, 3)") &&
    institutionLandingSource.includes('data-feature-visibility={!featuresExpanded && index === 2 ? "partial" : "full"}') &&
    institutionLandingSource.includes('data-process-visibility={!processExpanded && index === 2 ? "partial" : "full"}') &&
    institutionLandingSource.includes('aria-controls="institution-feature-list"') &&
    institutionLandingSource.includes('aria-controls="institution-detailed-process-list"') &&
    institutionLandingSource.includes("aria-expanded={featuresExpanded}") &&
    institutionLandingSource.includes("aria-expanded={processExpanded}") &&
    !institutionLandingSource.includes('className="institution-feature-icon"') &&
    institutionLandingCssSource.includes("grid-template-columns: 82px minmax(0, 1fr)") &&
    institutionLandingSource.includes('"TÜM ÖZELLİKLERİ GÖR"') &&
    institutionLandingSource.includes('"TÜM ADIMLARI GÖR"') &&
    (institutionLandingSource.match(/"DAHA AZ GÖSTER"/g) ?? []).length === 2 &&
    !institutionLandingSource.includes("<details"),
  "Kurum grafikleri merkezi sayıları taşıyor; özellikler ve ayrıntılı süreç bağımsız, erişilebilir 2 tam + 1 önizleme açılımları kullanıyor.",
);
check(
    institutionLandingSource.includes("function InstitutionBrandText({ children })") &&
    institutionLandingSource.includes("children.split(/(Fixoku Akademi|FİXOKU AKADEMİ)/g)") &&
    institutionLandingSource.includes('className="institution-brand-highlight"') &&
    !institutionLandingSource.includes("dangerouslySetInnerHTML") &&
    institutionLandingSource.includes("function BeeAccessories({ variant })") &&
    institutionLandingSource.includes("function BeeWings({ wingGradientId, leftTransform, rightTransform })") &&
    institutionLandingSource.includes("function BeeFace({ faceGradientId, look, transform })") &&
    institutionLandingSource.includes("function InstitutionBeeIllustration({ variant, title, animated = true, className = \"\" })") &&
    [
      "standing-learning-left",
      "rushing-right-with-test",
      "seated-focused-over-notebook",
      "rising-inspired-upward",
      "technology-working-right",
    ].every((pose) =>
      institutionLandingSource.includes(`pose: \"${pose}\"`),
    ) &&
    [
      "book-graduation-cap",
      "test-pencil-timer",
      "desk-notebook-lamp",
      "brain-lightbulb-focus-rings",
      "laptop-books-growth-graph",
    ].every((accessory) => institutionLandingSource.includes(`data-bee-accessory=\"${accessory}\"`)) &&
    institutionLandingSource.includes('data-bee-leg-count="6"') &&
    institutionLandingSource.includes('data-bee-wing-count="4"') &&
    institutionLandingSource.includes('data-bee-expression="warm-bright-friendly"') &&
    institutionLandingSource.includes('data-bee-style="friendly-soft-professional"') &&
    institutionLandingSource.includes('data-bee-anatomy="head-thorax-striped-abdomen-two-antennae-six-legs-four-wings-veins-eyes"') &&
    institutionLandingSource.includes('data-wing-group="left"') &&
    institutionLandingSource.includes('data-wing-group="right"') &&
    institutionLandingCssSource.includes("@keyframes institution-bee-wing-left") &&
    institutionLandingCssSource.includes("@keyframes institution-bee-wing-right") &&
    institutionLandingCssSource.includes("animation: institution-bee-wing-left 0.86s") &&
    institutionLandingCssSource.includes("animation: institution-bee-wing-right 0.94s") &&
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.institution-bee\.is-animated \.institution-bee-wing-left,[\s\S]*?animation:\s*none !important;/.test(
      institutionLandingCssSource,
    ),
  "Kurum landing güvenli marka vurgusu, beş bağlamsal arı varyantı, tam arı anatomisi ve reduced-motion uyumlu kanat animasyonu içeriyor.",
);
check(
  institutionHero.paragraphs.length === 3 &&
    institutionLandingSource.includes("institutionHero.paragraphs[0]") &&
    institutionLandingSource.includes("institutionHero.paragraphs.slice(1).map") &&
    institutionTypes.some((item) =>
      item.text.includes("LGS, YKS ve ara sınıf öğrencilerinde uzun soruları daha hızlı okuma"),
    ) &&
    institutionFeatures.some((item) =>
      item.text.includes("yaklaşık 11.000 kelimelik içerik havuzu"),
    ) &&
    detailedInstitutionProcess.some((item) =>
      item.text.includes("21 günlük sistemli yapıda 9 kategori ve 126 egzersiz"),
    ) &&
    institutionSocialProof.studentText.includes("okuma, anlama, dikkat, odaklanma") &&
    institutionSocialProof.trainerText.includes("yazılım takibi, egzersiz süreci"),
  "Kurum landing kritik hero, kurum, özellik, süreç ve sosyal kanıt metinlerini merkezi DOCX verisinden eksiksiz kullanıyor.",
);
check(
  studentStoriesSource.includes("key={story.id}") &&
    trainerStoriesSource.includes("key={story.id}") &&
    headerSource.includes('key={`${menu.key}-${item.to}-${item.label}`}') &&
    footerSource.includes('key={`${column.title}-${link.to}-${link.label}`}'),
  "Öğrenci, eğitmen, Header ve Footer listeleri stabil benzersiz React key kullanıyor.",
);
check(
  [
    "fullName",
    "institutionName",
    "email",
    "phone",
    "city",
    "district",
    "institutionType",
    "studentCount",
    "message",
    "consent",
  ].every((fieldName) => institutionLandingSource.includes(`name="${fieldName}"`)) &&
    institutionLandingSource.includes('fetch("/api/institution-application"') &&
    institutionLandingSource.includes('href="/kvkk"') &&
    !institutionLandingSource.includes("mailto:") &&
    institutionLandingSource.includes("Başvurunuz alınmıştır. Ekibimiz sizinle iletişime geçecektir."),
  "Kurum formu tüm alanları, KVKK onayını, same-origin API çağrısını ve yalnız gerçek 200 sonrası başarı mesajını içeriyor.",
);
check(
  institutionApiSource.includes('INSTITUTION_APPLICATION_RECIPIENT = "info@fixoku.com"') &&
    institutionApiSource.includes("nodemailer.createTransport") &&
    institutionApiSource.includes("SITE_ORIGIN") &&
    ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"].every(
      (name) => institutionApiSource.includes(name),
    ) &&
    !institutionApiSource.includes("VITE_") &&
    institutionApiSource.includes("FORM_RATE_LIMIT_STATUS = \"BEST_EFFORT_INSTANCE_LOCAL\"") &&
    institutionApiSource.includes("sendJson(response, 503") &&
    institutionApiSource.includes("sendJson(response, 502"),
  "Vercel mail function sabit recipient, server-side SMTP env, origin, fail-closed ve kontrollü teslim hatası sözleşmesini uyguluyor.",
);
check(
  packageSource.includes('"nodemailer"') &&
    packageSource.includes('"test:institution-form"') &&
    viteConfigSource.includes("fixoku-institution-application-api") &&
    viteConfigSource.includes("/api/institution-application") &&
    institutionContractSource.includes("real SMTP delivery disabled") &&
    institutionContractSource.includes("INSTITUTION_APPLICATION_RECIPIENT"),
  "Yalnız nodemailer bağımlılığı, yerel aynı API middleware'i ve gerçek teslimat yapmayan contract testi kayıtlı.",
);
check(
  institutionLandingCssSource.includes("overflow-x: clip") &&
    institutionLandingCssSource.includes("@media (max-width: 900px)") &&
    institutionLandingCssSource.includes("@media (max-width: 480px)") &&
    institutionLandingCssSource.includes("@media (prefers-reduced-motion: reduce)"),
  "Kurum landing CSS'i masaüstü, tablet, mobil, yatay taşma ve azaltılmış hareket kurallarını içeriyor.",
);
check(
  assessmentTestsSource.includes("Dikkat testi yaklaşık 2 dakika") &&
    assessmentTestsSource.includes("Okuma ve anlama testi yaklaşık 5 dakika") &&
    studentLandingSource.includes("Dikkat testi yaklaşık 2 dakika") &&
    studentLandingSource.includes("Okuma ve anlama testi yaklaşık 5 dakika") &&
    !studentLandingSource.includes("2 Dakikada Tamamlanır"),
  "Dikkat testi yaklaşık 2, okuma ve anlama testi yaklaşık 5 dakika olarak ayrı sunuluyor.",
);
check(
  studentLandingSource.includes(STANDING_CHILD_IMAGE_PATH) &&
    studentLandingSource.includes(SEATED_CHILD_IMAGE_PATH) &&
    studentLandingSource.includes("width: 607") &&
    studentLandingSource.includes("height: 1013") &&
    studentLandingSource.includes("width: 679") &&
    studentLandingSource.includes("height: 905") &&
    studentLandingSource.includes('alt="Okuma, anlama ve dikkat gelişimini destekleyen öğrenci"') &&
    studentLandingSource.includes('alt="Fixoku ücretsiz seviye tespit testlerini uygulayan öğrenci"') &&
    studentLandingSource.includes('loading="lazy"') &&
    studentLandingSource.includes('decoding="async"') &&
    studentLandingCssSource.includes("object-fit: contain") &&
    studentLandingCssSource.includes("max-width: 100%") &&
    studentLandingCssSource.includes("height: auto") &&
    !studentLandingSource.includes("student-video-placeholder") &&
    !studentLandingSource.includes("<iframe") &&
    !studentLandingSource.includes("<video"),
  "Landing iki onaylı çocuk PNG'sini gerçek ölçü, alt metin ve oran koruyan responsive kurallarla kullanıyor; özel video placeholder kaldırıldı.",
);
check(
  [
    "Yapay Zekâ Destekli Ölçüm Sistemi",
    "126 Özel Gelişim Egzersizi",
    "9 Kategoride Gelişim Analizi",
    "Kitap + Yazılım Destekli Eğitim",
  ].every((feature) => studentLandingSource.includes(feature)) &&
    studentLandingSource.includes('className="student-seated-problem-frame"') &&
    studentLandingSource.includes('className="student-standing-final-frame"') &&
    studentLandingSource.includes('className="student-why-play" aria-hidden="true"') &&
    studentLandingSource.includes('className="student-landing-shell student-info-grid"') &&
    studentLandingSource.includes("Test Nasıl Çalışır?") &&
    studentLandingSource.includes("Bu Testler Neyi Ölçer?") &&
    studentLandingSource.includes("Test sonucunu uzmanla değerlendirerek çocuğunuzun gelişim alanları") &&
    studentLandingSource.includes('href="https://wa.me/905334789253"') &&
    studentLandingSource.includes('target="_blank"') &&
    studentLandingSource.includes('onClick={() => openTest("attention")}') &&
    studentLandingSource.includes('onClick={() => openTest("reading")}') &&
    studentLandingSource.includes("<Footer showCta={false} />") &&
    !studentLandingSource.includes("student-result-share") &&
    !studentLandingSource.includes("student-landing-intro"),
  "Landing PDF sırasındaki problem, play, üç kolon, kullanıcı kontrollü paylaşım, final CTA ve route-specific footer akışını içeriyor.",
);
check(
  footerSource.includes("Çocuğunuzun Akademik Gelişimini Ertelemeyin") &&
    footerSource.includes("Fixoku, Mavi Yeşil Ajans kuruluşudur.") &&
    footerSource.includes("Fixoku Yayınları — Mavi Yeşil Ajans") &&
    !footerSource.includes("Ersin Usta") &&
    !footerSource.includes("Okuyan, Anlayan, Gelişen Nesiller"),
  "Footer güncel CTA ve üç kurumsal satırı gösteriyor; eski kişi adı ve görünür slogan kaldırıldı.",
);
check(
  headerSource.includes("Satın Al") &&
    headerSource.includes("Giriş Yap") &&
    headerSource.includes('disabled aria-disabled="true"') &&
    !footerSource.includes("Ersin Usta") &&
    !homeSchemaText.includes("Ersin Usta"),
  "Header Satın Al/Giriş Yap etiketlerini unresolved durumda gösteriyor; Ersin Usta public kaynak ve schema çıktısından kaldırıldı.",
);
check(
  headerSource.includes("flex-wrap: nowrap;") &&
    headerSource.includes("white-space: nowrap;") &&
    headerSource.includes("@media (max-width: 1100px)") &&
    headerSource.includes("@media (max-width: 1100px) and (min-width: 769px)") &&
    headerSource.includes("@media (max-width: 1399px) and (min-width: 1101px)"),
  "Header masaüstünde tek satır kullanıyor ve 1024 genişlikte merkezi mobil navigasyona geçiyor.",
);
const legacyTrainingPageExists = await stat(
  path.join(projectRoot, "src", "pages", "Egitimler.jsx"),
).then(() => true).catch(() => false);
const legacyCorporatePageExists = await stat(
  path.join(projectRoot, "src", "pages", "Hakkimizda.jsx"),
).then(() => true).catch(() => false);
check(
  appRoutesSource.includes("articles={blogArticles}") &&
    appRoutesSource.includes("blogArticles.map") &&
    hubSource.includes("articleCount") &&
    knowledgeCenterCategories.every((category) => !category.path),
  "/blog hub beş gerçek makaleyi gösteriyor ve routesuz kategori kartları kırık link üretmiyor.",
);
check(
  appRoutesSource.includes("articles={trainingArticles}") &&
    appRoutesSource.includes("trainingArticles.map") &&
    !appRoutesSource.includes("Egitimler") &&
    !appSource.includes("Egitimler") &&
    !legacyTrainingPageExists,
  "Eski hardcoded eğitim component'i kaldırıldı ve /egitimler ortak içerik mimarisine taşındı.",
);
check(
  appRoutesSource.includes("articles={corporateArticles}") &&
    appRoutesSource.includes("corporateArticles.map") &&
    !appRoutesSource.includes("Hakkimizda") &&
    !legacyCorporatePageExists,
  "Eski hardcoded Hakkımızda component'i kaldırıldı ve /hakkimizda ortak içerik mimarisine taşındı.",
);
check(
  appRoutesSource.includes("legalPages.map") &&
    appRoutesSource.includes("<LegalPage") &&
    requiredLegalRoutes.every((routePath) => indexableRoutePaths.includes(routePath)),
  "Hukuki sayfalar ortak LegalPage component'i üzerinden route sistemine bağlı.",
);

const activeNavigationSources = [
  appSource,
  headerSource,
  footerSource,
  contactSource,
  studentLandingSource,
];
const staticInternalTargets = [];
for (const source of activeNavigationSources) {
  for (const pattern of [
    /\b(?:href|to)\s*=\s*["']([^"']+)["']/g,
    /\bto\s*:\s*["']([^"']+)["']/g,
  ]) {
    for (const match of source.matchAll(pattern)) staticInternalTargets.push(match[1]);
  }
}

function isValidInternalTarget(target) {
  if (target.startsWith("#")) return target.length > 1;
  if (!target.startsWith("/")) return true;

  const url = new URL(target, SITE_ORIGIN);
  const pathname = normalizeRoutePath(url.pathname);
  const routeExists = knownRoutePaths.has(pathname) || pathname === "/panel";
  if (!routeExists) return false;

  if (url.search) {
    const params = [...url.searchParams.entries()];
    if (
      pathname !== "/" ||
      params.length !== 1 ||
      params[0][0] !== "test" ||
      !["reading", "attention"].includes(params[0][1])
    ) return false;
  }

  if (url.hash && pathname === "/" && url.hash !== "#testler") return false;
  return true;
}

const invalidInternalTargets = [...new Set(
  staticInternalTargets.filter((target) => target.startsWith("/") || target.startsWith("#"))
    .filter((target) => !isValidInternalTarget(target)),
)];
check(
  invalidInternalTargets.length === 0,
  invalidInternalTargets.length
    ? `Karşılanmayan global internal hedefler: ${invalidInternalTargets.join(", ")}`
    : "Global static internal href ve Link hedeflerinin tamamı gerçek route, hash veya izinli test query'sine gidiyor.",
);
check(
  activeNavigationSources.every((source) => !/href\s*=\s*["']#["']/.test(source)),
  "Aktif public kaynaklarda href=\"#\" bulunmuyor.",
);
check(
  assessmentTestsSource.includes('id = "testler"') &&
    assessmentTestsSource.includes("useSyncExternalStore") &&
    assessmentTestsSource.includes("getServerHydrationSnapshot") &&
    assessmentTestsSource.includes("new URLSearchParams(location.search)") &&
    assessmentTestsSource.includes('searchParams.delete("test")') &&
    assessmentTestsSource.includes('hash: location.hash') &&
    assessmentTestsSource.includes("const activeTest = manualTest ??") &&
    headerSource.includes('/?test=reading') &&
    headerSource.includes('/?test=attention') &&
    footerSource.includes('/?test=reading') &&
    footerSource.includes('/?test=attention'),
  "Test linkleri mevcut ana sayfa modallarını query ile açıyor ve kapamada yalnız test parametresini temizliyor.",
);

const phoneAndWhatsappSource = [
  headerSource,
  footerSource,
  contactSource,
  readingTestSource,
  attentionTestSource,
  studentLandingSource,
].join("\n");
const whatsappNumbers = [...phoneAndWhatsappSource.matchAll(/wa\.me\/(\d+)/g)].map((match) => match[1]);
const telephoneNumbers = [...phoneAndWhatsappSource.matchAll(/tel:\+(\d+)/g)].map((match) => match[1]);
check(
  businessIdentity.mobilePhone === contactPhones.mobile &&
    businessIdentity.officePhone === contactPhones.office &&
    contactPhones.mobile.display === "+90 533 478 92 53" &&
    contactPhones.mobile.telUri === "tel:+905334789253" &&
    contactPhones.mobile.whatsappUrl === "https://wa.me/905334789253" &&
    contactPhones.office.display === "+90 232 462 07 43" &&
    contactPhones.office.telUri === "tel:+902324620743" &&
    !Object.hasOwn(contactPhones.office, "whatsappUrl") &&
  whatsappNumbers.length >= 1 &&
    whatsappNumbers.every((number) => number === "905334789253") &&
    telephoneNumbers.length >= 1 &&
    telephoneNumbers.every((number) => ["905334789253", "902324620743"].includes(number)) &&
    contactSource.includes("contactPhones.mobile.telUri") &&
    contactSource.includes("contactPhones.office.telUri") &&
    contactSource.includes("contactPhones.mobile.whatsappUrl") &&
    footerSource.includes("contactPhones.mobile.telUri") &&
    footerSource.includes("contactPhones.office.telUri") &&
    !phoneAndWhatsappSource.includes("wa.me/902324620743"),
  "Merkezi cep/WhatsApp ve ofis telefon verileri doğru URI'lerle iletişim sayfası, footer ve schema akışına bağlı.",
);
check(
  businessIdentity.socialProfiles.every(
    (profile) =>
      footerSource.includes(`href="${profile}"`) &&
      footerSource.includes('target="_blank"') &&
      footerSource.includes('rel="noopener noreferrer"'),
  ),
  "Footer'daki dört sosyal medya bağlantısı doğrulanmış URL, yeni sekme ve güvenli rel kullanıyor.",
);

const readingRotationSource = await readFile(
  path.join(projectRoot, "src", "utils", "readingTextRotation.js"),
  "utf8",
);
const runtimeInventorySource = [
  appSource,
  assessmentTestsSource,
  studentLandingSource,
  headerSource,
  footerSource,
  contactSource,
  readingTestSource,
  attentionTestSource,
  readingRotationSource,
].join("\n");
check(
  !runtimeInventorySource.includes("document.cookie") &&
    !runtimeInventorySource.includes("sessionStorage") &&
    !/(?:\bgtag\s*\(|googletagmanager|google-analytics|\bfbq\s*\(|meta.?pixel)/i.test(runtimeInventorySource) &&
    readingRotationSource.includes('const STORAGE_KEY = "fixoku-reading-text-rotation-v1"') &&
    readingRotationSource.includes("window.localStorage"),
  "Runtime envanteri izleme çerezi içermiyor ve tek kalıcı storage anahtarı okuma metni rotasyonuna ait.",
);

const robotsSource = await readFile(path.join(projectRoot, "public", "robots.txt"), "utf8");
check(
  robotsSource.includes(`Sitemap: ${buildSiteUrl("/sitemap.xml")}`),
  "Robots dosyası merkezi origin üzerinden doğru sitemap adresini gösteriyor.",
);

const ignoredDirectories = new Set([".git", "node_modules", "dist"]);
const repositoryFiles = [];

async function collectFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath);
    } else if ((await stat(entryPath)).size < 5_000_000) {
      repositoryFiles.push(entryPath);
    }
  }
}

await collectFiles(projectRoot);
const filesWithWrongOrigin = [];
const filesWithRepeatedOrigin = [];
const allowedOriginFiles = new Set([
  path.join(projectRoot, "src", "config", "site.js"),
  path.join(projectRoot, "public", "sitemap.xml"),
  path.join(projectRoot, "public", "robots.txt"),
]);

for (const filePath of repositoryFiles) {
  const contents = await readFile(filePath, "utf8").catch(() => "");
  if (contents.includes(forbiddenOrigin)) {
    filesWithWrongOrigin.push(path.relative(projectRoot, filePath));
  }
  if (contents.includes(SITE_ORIGIN) && !allowedOriginFiles.has(filePath)) {
    filesWithRepeatedOrigin.push(path.relative(projectRoot, filePath));
  }
}

check(
  filesWithWrongOrigin.length === 0,
  filesWithWrongOrigin.length
    ? `Hatalı domain bulunan dosyalar: ${filesWithWrongOrigin.join(", ")}`
    : "Repository içinde hatalı production domain bulunmuyor.",
);
check(
  filesWithRepeatedOrigin.length === 0,
  filesWithRepeatedOrigin.length
    ? `Production origin merkezi config dışında tekrarlandı: ${filesWithRepeatedOrigin.join(", ")}`
    : "Production origin yalnızca merkezi config ve üretilen SEO dosyalarında bulunuyor.",
);

for (const message of successes) {
  console.log(`✓ ${message}`);
}

if (failures.length) {
  for (const message of failures) {
    console.error(`✗ ${message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`SEO doğrulaması başarılı: ${successes.length} kontrol geçti.`);
}
