import { consentCategories, hasConsent, readConsent } from "./consent.js";

export const CANONICAL_EVENTS = [
  "page_view", "view_item_list", "select_item", "view_item", "add_to_cart", "remove_from_cart", "view_cart",
  "begin_checkout", "add_shipping_info", "add_payment_info", "purchase", "refund", "sign_up", "login", "generate_lead",
  "form_start", "form_step", "form_submit", "form_success", "form_error", "click_phone", "click_whatsapp", "click_email",
  "click_directions", "click_social", "trainer_application_start", "trainer_application_submit", "institution_application_start",
  "institution_application_submit", "student_package_interest", "start_test", "complete_test", "digital_content_interest",
];

const EVENT_CATEGORY = {
  page_view: "analytics", view_item_list: "analytics", select_item: "analytics", view_item: "analytics", add_to_cart: "analytics",
  remove_from_cart: "analytics", view_cart: "analytics", begin_checkout: "analytics", add_shipping_info: "analytics",
  add_payment_info: "analytics", purchase: "analytics", refund: "analytics", sign_up: "analytics", login: "analytics",
  generate_lead: "analytics", form_start: "analytics", form_step: "analytics", form_submit: "analytics", form_success: "analytics",
  form_error: "analytics", click_phone: "analytics", click_whatsapp: "analytics", click_email: "analytics", click_directions: "analytics",
  click_social: "analytics", trainer_application_start: "analytics", trainer_application_submit: "analytics", institution_application_start: "analytics",
  institution_application_submit: "analytics", student_package_interest: "analytics", start_test: "analytics", complete_test: "analytics",
  digital_content_interest: "analytics",
};

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid", "ttclid"];
const ATTRIBUTION_STORAGE_KEY = "fixoku_attribution";
// Keep personally identifying or education/guardian details out of all marketing
// envelopes.  The guardian relationship field is sensitive even when callers use
// the explicit `guardianRelationship` camel case key, so cover both that form and
// a standalone `guardian` key as well.
const SENSITIVE_KEYS = /^(message|note|free.?text|teacher.?notes?|dob|birth|school|grade|class|iban|address|student.?name|guardian(?:.?relationship)?|phone|email)$/i;

function randomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function captureAttribution({ location = globalThis.location, storage } = {}) {
  const params = new URLSearchParams(location?.search || "");
  const values = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value && value.length <= 200) values[key] = value;
  }
  if (!Object.keys(values).length) {
    try { return JSON.parse(storage?.getItem(ATTRIBUTION_STORAGE_KEY) || "null") || {}; } catch { return {}; }
  }
  try { storage?.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(values)); } catch { /* blocked storage */ }
  return values;
}

export function getAttribution({ location, storage } = {}) {
  return captureAttribution({ location, storage });
}

function pageContext(target = globalThis) {
  const location = target?.location;
  const documentRef = target?.document;
  return {
    page_location: typeof location?.href === "string" ? location.href : undefined,
    page_path: typeof location?.pathname === "string" ? location.pathname : "/",
    page_title: typeof documentRef?.title === "string" ? documentRef.title : "",
  };
}

function sanitizeProperties(properties = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(properties || {})) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (value == null || typeof value === "function" || typeof value === "symbol") continue;
    if (typeof value === "string" && value.length > 200) continue;
    if (Array.isArray(value)) {
      clean[key] = value.slice(0, 50).map((item) => (item && typeof item === "object" ? sanitizeProperties(item) : item));
    } else if (value && typeof value === "object") clean[key] = sanitizeProperties(value);
    else clean[key] = value;
  }
  return clean;
}

export function createEvent(event, properties = {}, { target = globalThis, source = "web", consent, includeAttribution = true } = {}) {
  if (!CANONICAL_EVENTS.includes(event)) return null;
  const receipt = consent || readConsent();
  const categories = consentCategories(receipt);
  const clean = sanitizeProperties(properties);
  const envelope = {
    event,
    event_id: typeof clean.event_id === "string" ? clean.event_id : randomId(),
    event_time: new Date().toISOString(),
    ...pageContext(target),
    source,
    consent_state: { ...categories },
    ...(includeAttribution && categories.analytics ? { attribution: getAttribution({ location: target?.location, storage: target?.localStorage }) } : {}),
    ...clean,
  };
  if (envelope.items && Array.isArray(envelope.items)) envelope.items = envelope.items.map((item) => sanitizeProperties(item));
  return envelope;
}

export function pushEvent(event, properties = {}, options = {}) {
  const target = options.target || globalThis;
  const receipt = options.consent || readConsent();
  const category = EVENT_CATEGORY[event] || "analytics";
  if (!hasConsent(category, receipt)) return { pushed: false, reason: "consent_required", event: null };
  const envelope = createEvent(event, properties, { ...options, target, consent: receipt });
  if (!envelope) return { pushed: false, reason: "unsupported_event", event: null };
  target.dataLayer = Array.isArray(target.dataLayer) ? target.dataLayer : [];
  target.dataLayer.push(envelope);
  return { pushed: true, reason: "ok", event: envelope };
}

export function installCanonicalTracking(target = globalThis) {
  const documentRef = target?.document;
  if (!documentRef?.addEventListener || target.__fixokuCanonicalTrackingInstalled) return false;
  const onClick = (event) => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    const placement = anchor.dataset.analyticsPlacement || "unknown";
    let name = null;
    if (/^tel:/i.test(href)) name = "click_phone";
    else if (href.toLowerCase().startsWith("whatsapp:") || /(?:wa\.me|api\.whatsapp\.com)/i.test(href)) name = "click_whatsapp";
    else if (/^mailto:/i.test(href)) name = "click_email";
    else if (anchor.dataset.analyticsEvent) name = anchor.dataset.analyticsEvent;
    if (!name) return;
    pushEvent(name, { placement, cta_id: anchor.dataset.ctaId || anchor.id || undefined }, { target });
  };
  const onSubmit = (event) => {
    const form = event.target;
    if (!(form instanceof target.HTMLFormElement)) return;
    pushEvent("form_submit", { form_id: form.dataset.formId || form.id || "unknown" }, { target });
  };
  documentRef.addEventListener("click", onClick, { passive: true });
  documentRef.addEventListener("submit", onSubmit);
  target.__fixokuCanonicalTrackingInstalled = true;
  return true;
}

if (typeof window !== "undefined") installCanonicalTracking(window);
