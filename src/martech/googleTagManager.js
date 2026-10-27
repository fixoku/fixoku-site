import { consentModeValues, deniedConsent, normalizeConsent, readConsent } from "./consent.js";

/** The browser has one Google entry point: a consent-gated GTM container. */
export const GTM_CONTAINER_ID = typeof globalThis.__FIXOKU_GTM_ID__ === "string" ? globalThis.__FIXOKU_GTM_ID__ : "";
export const GTM_SCRIPT_ID = "fixoku-google-tag-manager";

function getTarget(target) { return target || globalThis; }

export function initializeGoogleRuntime(target = globalThis) {
  const browser = getTarget(target);
  if (!browser || typeof browser !== "object") return false;
  browser.dataLayer = Array.isArray(browser.dataLayer) ? browser.dataLayer : [];
  // Google consumes gtag commands as Arguments objects, not arrays or event objects.
  if (typeof browser.gtag !== "function") browser.gtag = function gtag() { browser.dataLayer.push(arguments); };
  if (!browser.__fixokuConsentModeInitialized) {
    browser.gtag("consent", "default", consentModeValues(deniedConsent()));
    browser.__fixokuConsentModeInitialized = true;
  }
  return true;
}

export function updateGoogleConsent(categories, target = globalThis) {
  const browser = getTarget(target);
  initializeGoogleRuntime(browser);
  if (typeof browser.gtag !== "function") return false;
  browser.gtag("consent", "update", consentModeValues(categories));
  browser.__fixokuGoogleConsent = JSON.stringify(consentModeValues(categories));
  return true;
}

export function loadGoogleTagManager({ target = globalThis, containerId = GTM_CONTAINER_ID, consent = readConsent()?.categories } = {}) {
  const browser = getTarget(target);
  if (!containerId || !consentAllowsGoogle(consent) || !browser?.document?.createElement) return false;
  initializeGoogleRuntime(browser);
  // Direct callers and stored-consent reloads share the same synchronous sequence.
  if (browser.__fixokuGoogleConsent !== JSON.stringify(consentModeValues(consent))) updateGoogleConsent(consent, browser);
  if (browser.__fixokuGtmLoaded || browser.document.getElementById(GTM_SCRIPT_ID)) {
    browser.__fixokuGtmLoaded = true;
    return false;
  }
  browser.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = browser.document.createElement("script");
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  script.dataset.fixokuGtm = "true";
  const firstScript = browser.document.getElementsByTagName?.("script")?.[0];
  (firstScript?.parentNode || browser.document.head || browser.document.documentElement)?.insertBefore(script, firstScript || null);
  browser.__fixokuGtmLoaded = true;
  return true;
}

export function consentAllowsGoogle(categories) {
  const state = normalizeConsent(categories);
  return state.analytics === true || state.advertising === true;
}
