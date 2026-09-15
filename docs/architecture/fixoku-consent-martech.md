# Consent and event martech port map

The consent manager is implemented in `src/martech/ConsentManager.jsx` and uses
`src/martech/consent.js` for versioned receipts, local persistence, and Google
Consent Mode v2 defaults. Optional categories (functional, analytics,
advertising) start denied; necessary and security storage remain active.

`src/martech/events.js` is the single browser event layer. It validates the
canonical event names, adds a stable envelope (`event_id`, timestamp, page and
consent state), strips sensitive form/student fields, and gates analytics events
on analytics consent. Contact anchors (`tel:`, `mailto:`, WhatsApp) are tracked
through one delegated listener. Attribution parameters are first-party stored
and included only with analytics consent.

The footer exposes **Çerez Tercihleri** through a `fixoku:consent-open` event,
which reopens the preference center after a prior choice. Provider identifiers
for GTM, GA4, Ads, Meta and TikTok are intentionally blank in `.env.example`.
No third-party scripts are loaded until a future, consent-gated integration
provides approved identifiers.

`src/martech/adapters.js` exposes config-gated Meta Pixel/CAPI and TikTok
Pixel/Events API capability checks plus a shared `event_id` dedupe projection.
It intentionally performs no network call while IDs/tokens are absent and never
allows advertising sends without the `advertising` consent category.
