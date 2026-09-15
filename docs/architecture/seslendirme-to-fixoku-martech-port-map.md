# Seslendirme → Fixoku martech port map

SOURCE_REPO=D:\sesyedek\modern-site-astro
AUDIT_DATE=2026-09-13

| SOURCE_PATH | PURPOSE | FIXOKU_DECISION | FIXOKU_TARGET |
|---|---|---|---|
| `src/components/PrivacyConsent.astro` | First layer banner and preference dialog with keyboard accessible controls | ADAPT | `src/components/consent/ConsentManager.jsx` |
| `src/scripts/privacy-consent.ts` | Versioned localStorage receipt, default-denied categories and reopen behavior | ADAPT | `src/lib/consent.js` |
| `src/layouts/BaseLayout.astro` | Consent Mode bootstrap before GTM and dataLayer setup | ADAPT | `src/lib/analytics.js` loaded from `src/main.jsx` |
| `src/components/Footer.astro` | Persistent cookie-preference reopen action | ADAPT | Fixoku `Footer.jsx` legal utility |
| `src/data/privacy-legal.mjs` | Actual installed-service registry and legal facts | REFERENCE_ONLY | Fixoku registry must contain only actually enabled services |
| `src/components/ContactForm.astro` | Form start/submit/success/error event discipline without raw form content | ADAPT | Fixoku form components and canonical event layer |

The Seslendirme identifiers, phone, WhatsApp, email, domain, GTM/GA/Ads IDs,
legal identity and content are excluded. Fixoku uses independent placeholders
and sends no minor/student identity to advertising systems.

READY_SOURCE_FOUND=YES
OFFICIAL_SOURCE_CHECKED=YES (Google Consent Mode v2; Google Tag Manager; Meta and TikTok event guidance)
MATURE_OSS_CHECKED=YES (existing source was sufficient; no generic package added)
LICENSE=Existing project source; official provider documentation; no source code copied
WHY_CUSTOM_REQUIRED=Fixoku has its own React router, legal identity, panel authority and student privacy boundary.
