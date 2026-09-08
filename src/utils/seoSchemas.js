import { buildSiteUrl } from "../config/site.js";
import { contactPhones } from "../data/legalContent.js";

const homeOrganizationDescription =
  "Fixoku; yapay zekâ destekli yazılımı, akıcı okuma, hızlı okuma, okuduğunu anlama, paragraf teknikleri, dikkat ve odaklanma programlarıyla öğrencilerin ve yetişkinlerin öğrenme becerilerini bütüncül bir eğitim modeli içinde geliştiren yeni nesil akademik gelişim sistemidir.";

const homeContactHours = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:30",
    closes: "19:00",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: "Saturday",
    opens: "08:30",
    closes: "13:00",
  },
];

function buildHomeSchemas(route) {
  const pageUrl = buildSiteUrl(route.path);
  const organizationId = `${pageUrl}#organization`;
  const websiteId = `${pageUrl}#website`;
  const webpageId = `${pageUrl}#webpage`;

  return [
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": organizationId,
          name: "Fixoku",
          legalName: "Fixoku Yayınları — Mavi Yeşil Ajans",
          alternateName: "Fixoku Akademi",
          url: pageUrl,
          logo: buildSiteUrl("/brand/fixoku-logo-schema-512.png"),
          slogan: "Okuyan, Anlayan, Gelişen Nesiller",
          description: homeOrganizationDescription,
          foundingDate: "2022-01",
          address: {
            "@type": "PostalAddress",
            streetAddress: "1202/2 Sok. No:80/L Temsil Plaza",
            addressLocality: "Konak",
            addressRegion: "İzmir",
            addressCountry: "TR",
          },
          email: "info@fixoku.com",
          contactPoint: [
            {
              "@type": "ContactPoint",
              name: contactPhones.mobile.label,
              telephone: contactPhones.mobile.display,
              contactType: "customer service",
              email: "info@fixoku.com",
              areaServed: "TR",
              availableLanguage: "tr",
              hoursAvailable: homeContactHours,
            },
            {
              "@type": "ContactPoint",
              name: contactPhones.office.label,
              telephone: contactPhones.office.display,
              contactType: "customer service",
              email: "info@fixoku.com",
              areaServed: "TR",
              availableLanguage: "tr",
              hoursAvailable: homeContactHours,
            },
          ],
          areaServed: {
            "@type": "Country",
            name: "Türkiye",
          },
          knowsAbout: ["Online eğitim", "Yüz yüze eğitim"],
          sameAs: [
            "https://www.instagram.com/fixokuakademi",
            "https://www.youtube.com/@fixoku",
            "https://www.facebook.com/fixoku",
            "https://www.linkedin.com/company/fixoku",
          ],
          identifier: [
            {
              "@type": "PropertyValue",
              propertyID: "MERSİS No",
              value: "3437915176600013",
            },
            {
              "@type": "PropertyValue",
              propertyID: "Ticaret Sicil No",
              value: "1 171925",
            },
          ],
        },
        {
          "@type": "WebSite",
          "@id": websiteId,
          url: pageUrl,
          name: "Fixoku",
          publisher: { "@id": organizationId },
          inLanguage: "tr-TR",
        },
        {
          "@type": "WebPage",
          "@id": webpageId,
          url: pageUrl,
          name: route.heading,
          description: route.description,
          isPartOf: { "@id": websiteId },
          about: { "@id": organizationId },
          publisher: { "@id": organizationId },
          inLanguage: "tr-TR",
        },
      ],
    },
  ];
}

export function buildContentSchemas(route) {
  if (!route?.schemaType) {
    return [];
  }

  if (route.path === "/") {
    return buildHomeSchemas(route);
  }

  if (!route.breadcrumbs?.length) return [];

  const pageUrl = buildSiteUrl(route.path);
  const pageSchema = route.schemaType === "Article"
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: route.heading,
        description: route.description,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": pageUrl,
        },
        url: pageUrl,
        inLanguage: "tr-TR",
      }
    : {
        "@context": "https://schema.org",
        "@type": route.schemaType,
        name: route.heading,
        description: route.description,
        url: pageUrl,
        inLanguage: "tr-TR",
        ...(route.schemaType === "AboutPage"
          ? {
              isPartOf: { "@id": `${buildSiteUrl("/")}#website` },
              about: { "@id": `${buildSiteUrl("/")}#organization` },
              publisher: { "@id": `${buildSiteUrl("/")}#organization` },
            }
          : {}),
      };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: route.breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: buildSiteUrl(item.path),
    })),
  };

  return [pageSchema, breadcrumbSchema];
}
