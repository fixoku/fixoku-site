import { hasConsent, readConsent } from "./consent.js";

/** Browser/server adapters are deliberately no-op until independent IDs/tokens exist. */
export function marketingRuntime(env = import.meta?.env || {}) {
  return {
    metaPixel: Boolean(env.META_PIXEL_ID),
    metaCapi: Boolean(env.META_CAPI_ACCESS_TOKEN),
    tiktokPixel: Boolean(env.TIKTOK_PIXEL_ID),
    tiktokEventsApi: Boolean(env.TIKTOK_EVENTS_ACCESS_TOKEN),
  };
}

export function canSendAdvertising(consent = readConsent()) { return hasConsent("advertising", consent); }

export function dedupePayload(event) {
  if (!event || typeof event !== "object") return null;
  return { event_id: event.event_id, event_name: event.event, event_time: event.event_time, page_location: event.page_location, consent_state: event.consent_state };
}
