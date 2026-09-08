import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteUrl, normalizeRoutePath, SITE_ORIGIN } from "../src/config/site.js";
import { contentExplorerGroups } from "../src/data/contentExplorer.js";
import { businessIdentity, contactPhones } from "../src/data/legalContent.js";
import {
  getPrerenderOutputPath,
  indexableRoutePaths,
  institutionReadingLandingRoute,
  legalRoutePaths,
  notFoundSeo,
  panelSeo,
  publicRouteRegistry,
  studentReadingLandingRoute,
} from "../src/data/contentRoutes.js";
import {
  COMPLETED_FREE_TEST_COUNT,
  formatSocialProofCount,
  TRAINED_STUDENT_COUNT,
} from "../src/data/socialProof.js";
import { buildContentSchemas } from "../src/utils/seoSchemas.js";
import { startRenderedServer } from "./rendered-server.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectRoot, "dist");
const failures = [];
const successes = [];
const forbiddenOrigin = ["fixoku", "com", "com"].join(".");

function check(condition, message) {
  if (condition) successes.push(message);
  else failures.push(message);
}

function decodeHtml(value = "") {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function capture(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].trim()) : null;
}

function getMeta(html, attribute, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyPattern = new RegExp(`${attribute}\\s*=\\s*(["'])${escapedKey}\\1`, "i");

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!keyPattern.test(tag)) continue;
    const contentMatch = tag.match(/content\s*=\s*(["'])([\s\S]*?)\1/i);
    return contentMatch ? decodeHtml(contentMatch[2]) : null;
  }

  return null;
}

function countMeta(html, attribute, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(new RegExp(`<meta[^>]*${attribute}=["']${escapedKey}["'][^>]*>`, "gi")) ?? []
  ).length;
}

function getCanonical(html) {
  return (
    capture(
      html,
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    ) ??
    capture(
      html,
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i,
    )
  );
}

function countCanonical(html) {
  return (html.match(/<link[^>]*rel=["']canonical["'][^>]*>/gi) ?? []).length;
}

function getJsonLd(html) {
  return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (match) => JSON.parse(match[1]),
  );
}

function getSchemaNodes(schemas) {
  return schemas.flatMap((schema) =>
    Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [schema],
  );
}

function getSchemaTypes(schemas) {
  return getSchemaNodes(schemas).map((schema) => schema?.["@type"]);
}

function getH1Count(html) {
  return (html.match(/<h1(?:\s|>)/gi) ?? []).length;
}

function getVisibleText(html = "") {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function getHrefValues(html) {
  return [...html.matchAll(/<a\b[^>]*\shref=["']([^"']*)["'][^>]*>/gi)].map(
    (match) => decodeHtml(match[1]),
  );
}

function getInternalAssetPaths(html) {
  const paths = new Set();
  const patterns = [
    /<(?:script|img|source|video)[^>]*\ssrc=["'](\/[^"']+)["'][^>]*>/gi,
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["'](\/[^"']+)["'][^>]*>/gi,
    /<link[^>]*href=["'](\/[^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) paths.add(match[1].split(/[?#]/, 1)[0]);
  }

  return [...paths];
}

function getDistPath(relativePath) {
  return path.join(distDirectory, ...relativePath.split("/"));
}

async function exists(filePath) {
  return stat(filePath).then((value) => value.isFile()).catch(() => false);
}

const renderedRoutes = [];

for (const route of publicRouteRegistry) {
  const relativePath = getPrerenderOutputPath(route.path);
  const filePath = getDistPath(relativePath);
  const filePresent = await exists(filePath);
  check(filePresent, `${route.path}: fiziksel HTML mevcut.`);
  if (!filePresent) continue;

  const html = await readFile(filePath, "utf8");
  const canonical = buildSiteUrl(route.path);
  const schemas = getJsonLd(html);
  const expectedSchemaTypes = getSchemaTypes(buildContentSchemas(route));
  const schemaTypes = getSchemaTypes(schemas);
  const assetPaths = getInternalAssetPaths(html);
  const assetChecks = await Promise.all(
    assetPaths.map((assetPath) => exists(getDistPath(assetPath.replace(/^\/+/, "")))),
  );

  check(capture(html, /<title[^>]*>([\s\S]*?)<\/title>/i) === route.title, `${route.path}: title doğru.`);
  check(getMeta(html, "name", "description") === route.description, `${route.path}: description doğru.`);
  check(getCanonical(html) === canonical, `${route.path}: self-canonical doğru.`);
  check(canonical.startsWith(SITE_ORIGIN), `${route.path}: canonical production origin kullanıyor.`);
  check(
    getMeta(html, "property", "og:title") === route.title &&
      getMeta(html, "property", "og:description") === route.description &&
      getMeta(html, "property", "og:url") === canonical &&
      getMeta(html, "property", "og:type") === route.openGraphType &&
      getMeta(html, "property", "og:locale") === "tr_TR",
    `${route.path}: Open Graph alanları doğru.`,
  );
  check(
    getMeta(html, "name", "twitter:card") === "summary" &&
      getMeta(html, "name", "twitter:title") === route.title &&
      getMeta(html, "name", "twitter:description") === route.description,
    `${route.path}: Twitter metadata doğru.`,
  );
  check(
    expectedSchemaTypes.length > 0 &&
      JSON.stringify(schemaTypes) === JSON.stringify(expectedSchemaTypes),
    `${route.path}: beklenen JSON-LD türleri doğru.`,
  );
  check(getH1Count(html) === 1, `${route.path}: prerender HTML içinde tek H1 var.`);
  check(getVisibleText(html).includes(route.distinguishingText), `${route.path}: ayırt edici ana içerik mevcut.`);
  check(
    html.includes('<div id="root" data-render-mode="prerendered"><'),
    `${route.path}: prerender root dolu ve işaretli.`,
  );
  check(assetPaths.length >= 2 && assetChecks.every(Boolean), `${route.path}: HTML asset yolları mevcut dosyalara gidiyor.`);
  check(
    (html.match(/<title(?:\s|>)/gi) ?? []).length === 1 &&
      countMeta(html, "name", "description") === 1 &&
      countCanonical(html) === 1,
    `${route.path}: title, description ve canonical yinelenmiyor.`,
  );

  renderedRoutes.push({
    route: route.path,
    relativePath,
    html,
    hash: createHash("sha256").update(html).digest("hex"),
    title: route.title,
    canonical,
    schemas,
    schemaTypes,
  });
}

check(
  renderedRoutes.length === publicRouteRegistry.length,
  "Bütün indexlenebilir public route'lar prerender edildi.",
);
check(
  publicRouteRegistry.length === indexableRoutePaths.length &&
    renderedRoutes.length === indexableRoutePaths.length &&
    indexableRoutePaths.includes("/hizli-okuma-egitmeni-ol") &&
    indexableRoutePaths.filter((routePath) => routePath === "/hizli-okuma-egitmeni-ol").length === 1,
  `Public route ve prerender HTML sayısı ${indexableRoutePaths.length}/${indexableRoutePaths.length}; eğitmen route'u tekil.`,
);
check(
  new Set(renderedRoutes.map((route) => route.hash)).size === renderedRoutes.length,
  "Public route HTML hash değerleri birbirinden farklı.",
);
check(
  contentExplorerGroups.length === 6 &&
    contentExplorerGroups.reduce((total, group) => total + group.items.length, 0) === 35,
  "Global Content Explorer altı grup ve 35 içerik öğesiyle güncel yapıyı koruyor.",
);

const renderedByPath = new Map(renderedRoutes.map((item) => [item.route, item]));
const homeRendered = renderedByPath.get("/");
const contactRendered = renderedByPath.get("/iletisim");
const studentLandingRendered = renderedByPath.get(studentReadingLandingRoute.path);
const institutionLandingRendered = renderedByPath.get(institutionReadingLandingRoute.path);
const homeCanonical = buildSiteUrl("/");
const homeSchemaRoot = homeRendered?.schemas?.[0];
const homeSchemaNodes = getSchemaNodes(homeRendered?.schemas ?? []);
const homeOrganization = homeSchemaNodes.find((schema) => schema?.["@type"] === "Organization");
const homeWebsite = homeSchemaNodes.find((schema) => schema?.["@type"] === "WebSite");
const homeWebpage = homeSchemaNodes.find((schema) => schema?.["@type"] === "WebPage");
const homeContactPoints = homeOrganization?.contactPoint ?? [];
const homeIds = homeSchemaNodes.map((schema) => schema?.["@id"]).filter(Boolean);
const homeVisibleText = getVisibleText(homeRendered?.html);
const homeFooterHtml = homeRendered?.html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? "";
const homeFooterText = getVisibleText(homeFooterHtml);
const homeFooterHrefs = getHrefValues(homeFooterHtml);
const contactMainHtml = contactRendered?.html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? "";
const contactMainText = getVisibleText(contactMainHtml);
const contactMainHrefs = getHrefValues(contactMainHtml);
check(
  JSON.stringify(homeRendered?.schemaTypes) ===
    JSON.stringify(["Organization", "WebSite", "WebPage"]),
  "Ana sayfa ilk HTML Organization, WebSite ve WebPage şemalarını içeriyor.",
);
check(
  homeRendered?.schemas?.length === 1 &&
    homeSchemaRoot?.["@context"] === "https://schema.org" &&
    homeSchemaRoot?.["@graph"]?.length === 3 &&
    homeSchemaNodes.every((schema) => !schema?.["@context"]),
  "Ana sayfa ilk HTML tek JSON-LD graph ve tek kök @context içeriyor.",
);
check(
  homeRendered?.canonical === homeCanonical &&
    homeOrganization?.["@id"] === `${homeCanonical}#organization` &&
    homeWebsite?.["@id"] === `${homeCanonical}#website` &&
    homeWebpage?.["@id"] === `${homeCanonical}#webpage` &&
    homeOrganization?.legalName === "Fixoku Yayınları — Mavi Yeşil Ajans" &&
    !Object.hasOwn(homeOrganization, "founder") &&
    homeOrganization?.slogan === "Okuyan, Anlayan, Gelişen Nesiller" &&
    homeOrganization?.logo === buildSiteUrl("/brand/fixoku-logo-schema-512.png") &&
    homeWebsite?.url === homeRendered?.canonical &&
    homeWebpage?.url === homeRendered?.canonical &&
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
    new Set(homeIds).size === homeIds.length,
  "Ana sayfa rendered graph kimlikleri, iki benzersiz ContactPoint, canonical, yasal ad, slogan ve logo URL'si doğru.",
);
check(
  !homeRendered?.html.includes("localhost") &&
    ![
      "FAQPage",
      "LocalBusiness",
      "Product",
      "Course",
      "Review",
      "AggregateRating",
      "SearchAction",
    ].some((type) => homeRendered?.html.includes(`\"@type\":\"${type}\"`)),
  "Ana sayfa rendered graph localhost ve yasaklı schema türlerini içermiyor.",
);
check(
  [
    "Çocuğunuzun dikkat ve odaklanma seviyesini 2 dakikada ölçün, gelişim alanlarını uzman eğitmenimizle değerlendirin.",
    "Çocuğunuzun okuma hızını ve anlama becerisini ölçün, sonuçları uzman eğitmenimizle değerlendirin.",
    "Okuma Ölçümünü Başlat",
    "Fixoku Eğitim Kitapları",
    "21 Günlük Başarı Serüveni",
    "126 Egzersiz İçeriği",
    "9 Kategoride Ölçümleme ve Analiz",
    "1 Yıl Aktif Serbest Çalışma Alanı",
    "21 günlük eğitim sonunda öğrencilerin okuma hızında ve anlama becerilerinde belirgin gelişim elde edilmektedir.",
    "Yapay zekâ destekli yazılımımız, öğrencilerin gelişimini anlık olarak takip ederek eğitim sonunda detaylı veriler sunar.",
    "Uzman eğitmen eğitim vererek gelişimi takip eder.",
    "Eğitim nasıl yapılmaktadır?",
    "Eğitim online ya da yüz yüze olarak yapılabilir.",
  ].every((phrase) => homeVisibleText.includes(phrase)) &&
    ![
      "12.000+",
      "ortalama 2 kat",
      "ortalama iki kat",
      "2 kat okuma",
      "Fixoku Eğitim Deneyimi",
      "Eğitim online mı yapılmaktadır?",
      "Okuma Testini Başlat",
      "2 dakikalık test ile",
    ].some((phrase) => homeVisibleText.includes(phrase)) &&
    !/Fixoku Eğitim Kitabı(?!ları)/u.test(homeVisibleText),
  "Ana sayfa rendered görünür içeriği güncel Word metin sözleşmesine uyuyor.",
);
check(
  homeRendered?.html.includes('data-counter-target="3000"') &&
    homeVisibleText.includes("2.000+ öğrenci eğitim aldı") &&
    !homeVisibleText.includes("3.000+ öğrenci eğitim aldı"),
  "Rendered ana sayfada test hedefi 3000 ve eğitim alan öğrenci istatistiği bağımsız 2.000+.",
);
check(
  homeFooterText.includes("Çocuğunuzun Akademik Gelişimini Ertelemeyin") &&
    homeFooterText.includes("Fixoku, Mavi Yeşil Ajans kuruluşudur.") &&
    homeFooterText.includes("Fixoku Yayınları — Mavi Yeşil Ajans") &&
    !homeRendered?.html.includes("Ersin Usta") &&
    !homeFooterText.includes("Okuyan, Anlayan, Gelişen Nesiller") &&
    homeOrganization?.slogan === "Okuyan, Anlayan, Gelişen Nesiller",
  "Rendered footer kişi adını ve görünür sloganı kaldırırken Organization schema sloganını koruyor.",
);
check(
  JSON.stringify(contactRendered?.schemaTypes) ===
    JSON.stringify(["ContactPage", "BreadcrumbList"]) &&
    contactRendered?.html.includes('aria-label="İçerik yolu"') &&
    contactRendered?.html.includes('aria-current="page">İletişim'),
  "İletişim ilk HTML ContactPage, BreadcrumbList ve görünür breadcrumb içeriyor.",
);
check(
  (contactMainText.match(new RegExp(contactPhones.mobile.display.replace(/\+/g, "\\+"), "g")) ?? [])
    .length === 1 &&
    (contactMainText.match(new RegExp(contactPhones.office.display.replace(/\+/g, "\\+"), "g")) ?? [])
      .length === 1 &&
    contactMainHrefs.filter((href) => href === contactPhones.mobile.telUri).length === 1 &&
    contactMainHrefs.filter((href) => href === contactPhones.office.telUri).length === 1 &&
    contactMainHrefs.filter((href) => href.startsWith(contactPhones.mobile.whatsappUrl)).length === 1 &&
    !contactMainHrefs.some((href) => href.includes("wa.me/902324620743")),
  "Rendered iletişim alanı cep/WhatsApp ve ofis telefonlarını tekil, ayrı ve doğru bağlantılarla gösteriyor.",
);
check(
  homeFooterText.includes(contactPhones.mobile.label) &&
    homeFooterText.includes(contactPhones.mobile.display) &&
    homeFooterText.includes(contactPhones.office.label) &&
    homeFooterText.includes(contactPhones.office.display) &&
    homeFooterHrefs.filter((href) => href === contactPhones.mobile.telUri).length === 1 &&
    homeFooterHrefs.filter((href) => href === contactPhones.office.telUri).length === 1 &&
    !homeFooterHrefs.some((href) => href.includes("wa.me/902324620743")),
  "Rendered footer cep/WhatsApp ve ofis telefonlarını doğru tel URI'leriyle ayırt ediyor.",
);
check(
  legalRoutePaths.length === 3 &&
    legalRoutePaths.every((routePath) => {
      const rendered = renderedByPath.get(routePath);
      return (
        JSON.stringify(rendered?.schemaTypes) === JSON.stringify(["WebPage", "BreadcrumbList"]) &&
        rendered?.html.includes('aria-label="İçerik yolu"') &&
        rendered?.html.includes("Son güncelleme: 19 Temmuz 2026") &&
        !rendered?.html.includes('class="footer-cta-band"')
      );
    }),
  "Üç hukuki route ilk HTML'de metin, görünür breadcrumb, WebPage + BreadcrumbList içeriyor ve pazarlama CTA bandı göstermiyor.",
);

const studentLandingHtml = studentLandingRendered?.html ?? "";
const forbiddenStudentLandingPhrases = [
  "Çocuğunuzun Okuma Hızını ve Dikkat Seviyesini 2 Dakikada Ücretsiz Ölçün",
  "Yeni Nesil Akademik Gelişim Sistemi",
  "Uzman Eğitmenle Görüş",
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
];
check(
  studentLandingRendered &&
    JSON.stringify(studentLandingRendered.schemaTypes) ===
      JSON.stringify(["WebPage", "BreadcrumbList"]) &&
    getH1Count(studentLandingHtml) === 1 &&
    studentLandingHtml.includes(studentReadingLandingRoute.heading) &&
    forbiddenStudentLandingPhrases.every((phrase) => !studentLandingHtml.includes(phrase)),
  "Öğrenci landing ilk HTML'i WebPage + BreadcrumbList, tek H1 ve güvenli içerik sözleşmesini karşılıyor.",
);
check(
  (studentLandingHtml.match(/Ücretsiz Dikkat Testi/g) ?? []).length === 1 &&
    (studentLandingHtml.match(/Ücretsiz Okuma ve Anlama Testi/g) ?? []).length === 1 &&
    studentLandingHtml.includes("Dikkat Testini Başlat") &&
    studentLandingHtml.includes("Okuma Ölçümünü Başlat") &&
    studentLandingHtml.includes("Dikkat testi yaklaşık 2 dakika") &&
    studentLandingHtml.includes("Okuma ve anlama testi yaklaşık 5 dakika"),
  "Öğrenci landing ilk HTML'inde ortak iki test kartı tekil ve süreleri doğru.",
);
check(
  studentLandingHtml.includes(formatSocialProofCount(TRAINED_STUDENT_COUNT)) &&
    studentLandingHtml.includes("öğrenci Fixoku eğitimi aldı") &&
    studentLandingHtml.includes(formatSocialProofCount(COMPLETED_FREE_TEST_COUNT)) &&
    studentLandingHtml.includes("öğrenci ücretsiz testleri çözdü") &&
    !studentLandingHtml.includes("3.000+ öğrenci eğitim aldı"),
  "Öğrenci landing sosyal kanıt değerleri 2.000+ eğitim ve 3.000+ test bağlamlarında ayrışıyor.",
);
check(
  studentLandingHtml.includes("Fixoku</span> Eğitimi Alan Öğrenciler ve Veliler") &&
    studentLandingHtml.includes('aria-label="Önceki öğrenci videosu"') &&
    studentLandingHtml.includes('aria-label="Sonraki öğrenci videosu"') &&
    studentLandingHtml.includes('/images/landing/ogrenciler-icin-hizli-okuma-egitimi/ayakta-cocuk.png') &&
    studentLandingHtml.includes('width="607"') &&
    studentLandingHtml.includes('height="1013"') &&
    studentLandingHtml.includes('/images/landing/ogrenciler-icin-hizli-okuma-egitimi/oturan-cocuk.png') &&
    studentLandingHtml.includes('width="1405"') &&
    studentLandingHtml.includes('height="1120"') &&
    studentLandingHtml.includes('loading="lazy"') &&
    studentLandingHtml.includes('class="student-seated-problem-frame"') &&
    studentLandingHtml.includes('class="student-standing-final-frame"') &&
    studentLandingHtml.includes('class="student-why-play" aria-hidden="true"') &&
    studentLandingHtml.includes('class="student-landing-shell student-info-grid"') &&
    !studentLandingHtml.includes("Çocuğunuzun Akademik Gelişimini Ertelemeyin") &&
    !studentLandingHtml.includes('class="student-video-placeholder"') &&
    !studentLandingHtml.includes("<iframe") &&
    !studentLandingHtml.includes("<video") &&
    studentLandingHtml.includes('href="https://wa.me/905334789253"') &&
    studentLandingHtml.includes("Test sonucunu uzmanla değerlendirerek çocuğunuzun gelişim alanları"),
  "Landing ortak öğrenci/veli video sliderını, iki onaylı çocuk görselini ve kullanıcı kontrollü WhatsApp akışını içeriyor.",
);

const institutionLandingHtml = institutionLandingRendered?.html ?? "";
const institutionFormHtml = institutionLandingHtml.match(
  /<section class="institution-form-section"[\s\S]*?<\/section>/i,
)?.[0] ?? "";
const institutionEmptyVideoHtml = ["hero", "features"].map((variant) =>
  institutionLandingHtml.match(
    new RegExp(`<div[^>]*data-empty-video="${variant}"[\\s\\S]*?<\\/div>`, "i"),
  )?.[0] ?? "",
);
check(
  institutionLandingRendered &&
    JSON.stringify(institutionLandingRendered.schemaTypes) ===
      JSON.stringify(["WebPage", "BreadcrumbList"]) &&
    getH1Count(institutionLandingHtml) === 1 &&
    institutionLandingHtml.includes(institutionReadingLandingRoute.heading) &&
    !["FAQPage", "Review", "AggregateRating", "Offer"].some((type) =>
      institutionLandingHtml.includes(`\"@type\":\"${type}\"`),
    ),
  "Kurum landing ilk HTML'i WebPage + BreadcrumbList, tek H1 ve güvenli schema sözleşmesini karşılıyor.",
);
check(
  institutionLandingHtml.includes("Fixoku</span> Eğitimi Alan Öğrenciler ve Veliler") &&
    institutionLandingHtml.includes("Fixoku</span> Eğitmenleri Ne Söylüyor?") &&
    institutionLandingHtml.includes('aria-label="Önceki öğrenci videosu"') &&
    institutionLandingHtml.includes('aria-label="Sonraki öğrenci videosu"') &&
    institutionLandingHtml.includes('aria-label="Önceki video"') &&
    institutionLandingHtml.includes('aria-label="Sonraki video"'),
  "Kurum landing ilk HTML'inde iki gerçek ortak video sliderı doğru bileşenlerden geliyor.",
);
check(
  (institutionLandingHtml.match(/data-empty-video=/g) ?? []).length === 2 &&
    institutionEmptyVideoHtml.every((html) =>
      html.includes('role="img"') &&
      html.includes('aria-label="') &&
      html.includes("institution-placeholder-play") &&
      !/<(?:video|button|a)\b/i.test(html) &&
      !/tabindex=|onclick=/i.test(html)
    ) &&
    institutionEmptyVideoHtml[0] !== institutionEmptyVideoHtml[1],
  "Kurum landing ilk HTML'inde iki farklı aria-label taşıyan, turuncu play işaretli ve etkileşimsiz boş medya alanı var.",
);
check(
  (institutionLandingHtml.match(/data-institution-type=/g) ?? []).length === 5 &&
    (institutionLandingHtml.match(/data-institution-benefit=/g) ?? []).length === 5 &&
    (institutionLandingHtml.match(/data-institution-feature=/g) ?? []).length === 3 &&
    (institutionLandingHtml.match(/data-feature-visibility="full"/g) ?? []).length === 2 &&
    (institutionLandingHtml.match(/data-feature-visibility="partial"/g) ?? []).length === 1 &&
    (institutionLandingHtml.match(/data-institution-process=/g) ?? []).length === 3 &&
    (institutionLandingHtml.match(/data-process-visibility="full"/g) ?? []).length === 2 &&
    (institutionLandingHtml.match(/data-process-visibility="partial"/g) ?? []).length === 1 &&
    (institutionLandingHtml.match(/data-feature-summary=/g) ?? []).length === 6 &&
    institutionLandingHtml.includes('data-institution-circle-count="5"') &&
    institutionLandingHtml.includes('data-benefit-count="5"') &&
    institutionLandingHtml.includes('data-feature-count="11"') &&
    institutionLandingHtml.includes('data-visible-feature-count="3"') &&
    (institutionLandingHtml.match(/class="institution-feature-number"/g) ?? []).length === 3 &&
    !institutionLandingHtml.includes("institution-feature-icon") &&
    institutionLandingHtml.includes('id="institution-feature-list"') &&
    institutionLandingHtml.includes('aria-controls="institution-feature-list"') &&
    institutionLandingHtml.includes('aria-expanded="false"') &&
    institutionLandingHtml.includes("TÜM ÖZELLİKLERİ GÖR") &&
    institutionLandingHtml.includes('data-honeycomb-count="6"') &&
    institutionLandingHtml.includes('data-process-steps="5"') &&
    institutionLandingHtml.includes('data-process-steps="7"') &&
    institutionLandingHtml.includes('data-visible-process-count="3"') &&
    institutionLandingHtml.includes('id="institution-detailed-process-list"') &&
    institutionLandingHtml.includes('aria-controls="institution-detailed-process-list"') &&
    institutionLandingHtml.includes("TÜM ADIMLARI GÖR") &&
    !institutionLandingHtml.includes("data-process-summary=") &&
    !institutionLandingHtml.includes("data-process-summary-count=") &&
    !institutionLandingHtml.includes("institution-summary-icon") &&
    (institutionLandingHtml.match(/data-video-type="student-stories"/g) ?? []).length === 1 &&
    (institutionLandingHtml.match(/data-video-type="trainer-stories"/g) ?? []).length === 1,
  "Kurum landing ilk HTML'i 5 kurum türü, 5 kazanım, 6 honeycomb maddesi, 11/7 toplam sözleşmesiyle 2 tam + 1 önizleme, tekrarsız süreç ve tekil sliderları içeriyor.",
);
const institutionBeeAssets = [
  "/images/institution-bees/bee-school.webp",
  "/images/institution-bees/bee-course.webp",
  "/images/institution-bees/bee-study.webp",
  "/images/institution-bees/bee-development.webp",
  "/images/institution-bees/bee-academy.webp",
];
check(
  institutionBeeAssets.every((assetPath) => institutionLandingHtml.includes(assetPath)) &&
    new Set(institutionBeeAssets).size === 5 &&
    (institutionLandingHtml.match(/class="institution-reading__bee-image/g) ?? []).length === 5 &&
    (institutionLandingHtml.match(/<img[^>]+institution-reading__bee-image[^>]+alt="/g) ?? []).length === 5 &&
    !institutionLandingHtml.includes("data-bee-anatomy") &&
    !institutionLandingHtml.includes("data-bee-leg-count") &&
    !institutionLandingHtml.includes("data-bee-wing-count") &&
    !institutionLandingHtml.includes("data-bee-pose") &&
    institutionLandingHtml.includes("institution-brand-highlight") &&
    !institutionLandingHtml.includes("dangerouslySetInnerHTML"),
  "Kurum landing ilk HTML'i güvenli marka vurgusu ile beş farklı WebP arı görselini anlamlı img yapısıyla içeriyor.",
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
  ].every((fieldName) => institutionFormHtml.includes(`name="${fieldName}"`)) &&
    institutionFormHtml.includes('href="/kvkk"') &&
    institutionFormHtml.includes("info@fixoku.com") &&
    !institutionFormHtml.includes("mailto:"),
  "Kurum landing ilk HTML'i erişilebilir başvuru alanlarını, KVKK bağlantısını ve mailto içermeyen iletişim bilgisini sunuyor.",
);

const combinedPublicHtml = renderedRoutes.map((item) => item.html).join("\n");
const allRenderedHrefs = renderedRoutes.flatMap((item) =>
  getHrefValues(item.html).map((href) => ({ route: item.route, href })),
);
const renderedHrefValues = allRenderedHrefs.map(({ href }) => href);
const knownPublicPaths = new Set(indexableRoutePaths);
const knownNonIndexablePaths = new Set(["/giris", "/panel"]);

function isValidRenderedInternalHref(href) {
  if (href.startsWith("#")) return href.length > 1;
  if (!href.startsWith("/")) return true;

  const url = new URL(href, SITE_ORIGIN);
  const pathname = normalizeRoutePath(url.pathname);
  if (!knownPublicPaths.has(pathname) && !knownNonIndexablePaths.has(pathname)) return false;

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

const brokenRenderedLinks = allRenderedHrefs.filter(
  ({ href }) =>
    (href.startsWith("/") || href.startsWith("#")) &&
    !isValidRenderedInternalHref(href),
);
check(
  brokenRenderedLinks.length === 0,
  brokenRenderedLinks.length
    ? `Rendered karşılanmayan internal linkler: ${[
        ...new Set(brokenRenderedLinks.map(({ route, href }) => `${route} -> ${href}`)),
      ].join(", ")}`
    : "Rendered global internal linklerin tamamı gerçek route, hash veya izinli test query'sine gidiyor.",
);
check(
  allRenderedHrefs.every(({ href }) => href !== "#"),
  "Rendered public HTML içinde href=\"#\" bulunmuyor.",
);
check(
  combinedPublicHtml.includes('href="/#testler"') &&
    combinedPublicHtml.includes('href="/?test=reading"') &&
    combinedPublicHtml.includes('href="/?test=attention"'),
  "Rendered navigasyon mevcut test bölümü ile iki modal query hedefini içeriyor.",
);
check(
  renderedHrefValues.includes(contactPhones.mobile.telUri) &&
    renderedHrefValues.includes(contactPhones.office.telUri) &&
    renderedHrefValues.some((href) => href.startsWith(contactPhones.mobile.whatsappUrl)) &&
    renderedHrefValues
      .filter((href) => href.startsWith("https://wa.me/"))
      .every((href) => href.startsWith(contactPhones.mobile.whatsappUrl)) &&
    !renderedHrefValues.some((href) => href.includes("wa.me/902324620743")),
  "Rendered telefon hedefleri cep ve ofis hatlarını içeriyor; WhatsApp yalnız cep numarasını kullanıyor.",
);
check(
  businessIdentity.socialProfiles.every(
    (profile) => combinedPublicHtml.includes(`href="${profile}"`),
  ) &&
    combinedPublicHtml.includes('target="_blank"') &&
    combinedPublicHtml.includes('rel="noopener noreferrer"'),
  "Rendered footer dört doğrulanmış sosyal medya URL'sini güvenli dış bağlantı olarak içeriyor.",
);
const renderedLegalHtml = legalRoutePaths.map((routePath) => renderedByPath.get(routePath)?.html ?? "").join("\n").toLocaleLowerCase("tr-TR");
check(
  [
    "fixoku.com.tr",
    "dersfix.com",
    "tamamen güvende",
    "kırılması mümkün olmayan",
    "mail order",
    "paytr",
    "iyzico",
    "iyzigo",
  ].every((phrase) => !renderedLegalHtml.includes(phrase)),
  "Rendered hukuki içerikte eski domain, kesin güvenlik veya doğrulanmamış ödeme sağlayıcısı ifadesi yok.",
);

const panelPath = getDistPath("panel.html");
const panelPresent = await exists(panelPath);
check(panelPresent, "Panel HTML kabuğu mevcut.");
const panelHtml = panelPresent ? await readFile(panelPath, "utf8") : "";
check(getMeta(panelHtml, "name", "robots") === panelSeo.robots, "Panel ilk HTML noindex, nofollow.");
check(
  countCanonical(panelHtml) === 0 && getJsonLd(panelHtml).length === 0,
  "Panel HTML canonical ve JSON-LD içermiyor.",
);
check(
  panelHtml.includes('<div id="root" data-render-mode="client"></div>'),
  "Panel client mount kabuğu açık biçimde işaretli.",
);

const notFoundPath = getDistPath("404.html");
const notFoundPresent = await exists(notFoundPath);
check(notFoundPresent, "404.html mevcut.");
const notFoundHtml = notFoundPresent ? await readFile(notFoundPath, "utf8") : "";
check(getMeta(notFoundHtml, "name", "robots") === notFoundSeo.robots, "404 ilk HTML noindex, nofollow.");
check(
  countCanonical(notFoundHtml) === 0 &&
    getJsonLd(notFoundHtml).length === 0 &&
    countMeta(notFoundHtml, "property", "og:title") === 0,
  "404 canonical, JSON-LD ve indexlenebilir OG iddiası içermiyor.",
);
check(
  getH1Count(notFoundHtml) === 1 &&
    notFoundHtml.includes('href="/"') &&
    notFoundHtml.includes('href="/hizli-okuma"'),
  "404 görünür H1 ve dönüş bağlantıları içeriyor.",
);

const vercelConfig = JSON.parse(await readFile(path.join(projectRoot, "vercel.json"), "utf8"));
const rewrites = vercelConfig.rewrites ?? [];
const hasGlobalCatchAll = rewrites.some(({ source }) =>
  ["/(.*)", "/:path*", "/(.*)*"].includes(source),
);
check(!hasGlobalCatchAll, "Global SPA catch-all rewrite kaldırıldı.");
check(
  vercelConfig.cleanUrls === true &&
    vercelConfig.trailingSlash === false &&
    rewrites.length > 0 &&
    rewrites.every(({ source }) => source === "/panel" || source.startsWith("/panel/")),
  "Vercel clean URL ve yalnızca panel fallback yapılandırması doğru.",
);

const sitemap = await readFile(getDistPath("sitemap.xml"), "utf8");
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
check(
  sitemapPaths.length === indexableRoutePaths.length &&
    sitemapPaths.filter((routePath) => routePath === "/hizli-okuma-egitmeni-ol").length === 1 &&
    !sitemapPaths.some((routePath) => routePath.startsWith("/panel")) &&
    !sitemapPaths.some((routePath) => routePath.includes("404")) &&
    indexableRoutePaths.every((routePath) => sitemapPaths.includes(routePath)),
  "Sitemap ile prerender public route listesi uyumlu.",
);

const ignoredDirectories = new Set([".git", "node_modules"]);
const wrongOriginFiles = [];

async function scanWrongOrigin(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanWrongOrigin(entryPath);
    } else if ((await stat(entryPath)).size < 5_000_000) {
      const content = await readFile(entryPath, "utf8").catch(() => "");
      if (content.includes(forbiddenOrigin)) wrongOriginFiles.push(path.relative(projectRoot, entryPath));
    }
  }
}

await scanWrongOrigin(projectRoot);
check(wrongOriginFiles.length === 0, "Repository ve build çıktısında hatalı production domain yok.");

const renderedServer = await startRenderedServer();
const httpRoutes = [
  ...indexableRoutePaths,
  "/panel",
  "/panel/ornek-alt-route",
  "/bilinmeyen-bir-route",
];
const httpResults = [];

try {
  for (const routePath of httpRoutes) {
    const response = await fetch(`${renderedServer.origin}${routePath}`);
    const html = await response.text();
    httpResults.push({
      route: routePath,
      status: response.status,
      title: capture(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      canonical: getCanonical(html),
      robots: getMeta(html, "name", "robots"),
      h1: capture(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? null,
      hash: createHash("sha256").update(html).digest("hex"),
    });
  }
} finally {
  await renderedServer.close();
}

check(
  httpResults
    .filter((result) => indexableRoutePaths.includes(result.route))
    .every((result) => result.status === 200),
  "Bilinen public route'lar yerel statik sunucuda 200 dönüyor.",
);
check(
  httpResults
    .filter((result) => result.route === "/panel" || result.route.startsWith("/panel/"))
    .every((result) => result.status === 200 && result.robots === panelSeo.robots),
  "Panel ve panel alt route'ları 200 ve ilk HTML noindex dönüyor.",
);
const unknownResult = httpResults.find((result) => result.route === "/bilinmeyen-bir-route");
check(
  unknownResult?.status === 404 && unknownResult.robots === notFoundSeo.robots,
  "Bilinmeyen route gerçek 404 ve noindex HTML dönüyor.",
);

for (const message of successes) console.log(`✓ ${message}`);

console.log("\nRendered HTTP özeti:");
console.log(JSON.stringify(httpResults, null, 2));

if (failures.length) {
  for (const message of failures) console.error(`✗ ${message}`);
  process.exitCode = 1;
} else {
  console.log(`\nRendered SEO doğrulaması başarılı: ${successes.length} kontrol geçti.`);
}
