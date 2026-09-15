/**
 * Fixoku consent primitives. Optional categories are denied until an explicit choice.
 * The receipt contains only a version, timestamp, category flags and an anonymous
 * first-party reference; it never stores form or student data.
 */
export const CONSENT_VERSION = "fixoku-consent-v1";
export const CONSENT_STORAGE_KEY = "fixoku_consent_preferences";
export const ANONYMOUS_REF_KEY = "fixoku_anonymous_ref";

export const CONSENT_CATEGORIES = ["necessary", "functional", "analytics", "advertising"];

export function deniedConsent() {
  return { necessary: true, functional: false, analytics: false, advertising: false };
}

export function grantedConsent() {
  return { necessary: true, functional: true, analytics: true, advertising: true };
}

export function normalizeConsent(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    necessary: true,
    functional: source.functional === true,
    analytics: source.analytics === true,
    advertising: source.advertising === true,
  };
}

function browserStorage(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

export function getAnonymousReference(storage) {
  const target = browserStorage(storage);
  if (!target) return undefined;
  try {
    const existing = target.getItem(ANONYMOUS_REF_KEY);
    if (existing) return existing;
    const value = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    target.setItem(ANONYMOUS_REF_KEY, value);
    return value;
  } catch { return undefined; }
}

export function readConsent(storage) {
  const target = browserStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.consent_version !== CONSENT_VERSION || typeof parsed?.timestamp !== "string") return null;
    if (!parsed?.categories || typeof parsed.categories !== "object") return null;
    return {
      consent_version: CONSENT_VERSION,
      timestamp: parsed.timestamp,
      categories: normalizeConsent(parsed.categories),
      source: typeof parsed.source === "string" ? parsed.source : "stored",
      anonymous_ref: typeof parsed.anonymous_ref === "string" ? parsed.anonymous_ref : getAnonymousReference(target),
    };
  } catch { return null; }
}

export function saveConsent(categories, { source = "banner", storage } = {}) {
  const normalized = normalizeConsent(categories);
  const receipt = {
    consent_version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: normalized,
    source,
    anonymous_ref: getAnonymousReference(storage),
  };
  const target = browserStorage(storage);
  try { target?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(receipt)); } catch { /* private mode / blocked storage */ }
  return receipt;
}

export function consentCategories(receipt = readConsent()) {
  return receipt?.categories ?? deniedConsent();
}

export function hasConsent(category, receipt) {
  if (category === "necessary") return true;
  return consentCategories(receipt)[category] === true;
}

/** Values required by Google Consent Mode v2 before dependent tags load. */
export function consentModeValues(categories = deniedConsent()) {
  const state = normalizeConsent(categories);
  return {
    analytics_storage: state.analytics ? "granted" : "denied",
    ad_storage: state.advertising ? "granted" : "denied",
    ad_user_data: state.advertising ? "granted" : "denied",
    ad_personalization: state.advertising ? "granted" : "denied",
    functionality_storage: state.functional ? "granted" : "denied",
    personalization_storage: state.functional ? "granted" : "denied",
    security_storage: "granted",
  };
}
