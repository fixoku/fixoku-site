/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import {
  CONSENT_VERSION,
  consentModeValues,
  deniedConsent,
  grantedConsent,
  readConsent,
  saveConsent,
  normalizeConsent,
} from "./consent.js";
import "./consent.css";

function initializeConsentMode() {
  if (typeof window === "undefined") return;
  window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
  window.gtag = window.gtag || ((...args) => window.dataLayer.push(args));
  if (!window.__fixokuConsentModeInitialized) {
    window.gtag("consent", "default", consentModeValues(deniedConsent()));
    window.__fixokuConsentModeInitialized = true;
  }
}

function updateConsentMode(categories) {
  if (typeof window === "undefined") return;
  initializeConsentMode();
  window.gtag("consent", "update", consentModeValues(categories));
}

export default function ConsentManager() {
  const [receipt, setReceipt] = useState(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(deniedConsent);
  const lastFocused = useRef(null);

  useEffect(() => {
    initializeConsentMode();
    const stored = readConsent();
    if (stored) {
      setReceipt(stored);
      setDraft(stored.categories);
      updateConsentMode(stored.categories);
    } else {
      updateConsentMode(deniedConsent());
    }
    const onOpen = () => {
      setDraft(readConsent()?.categories || deniedConsent());
      setOpen(true);
    };
    window.addEventListener("fixoku:consent-open", onOpen);
    return () => window.removeEventListener("fixoku:consent-open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    lastFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const focusable = [...document.querySelectorAll(".fixoku-consent-dialog button, .fixoku-consent-dialog input, .fixoku-consent-dialog a")].filter((el) => !el.disabled);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) window.setTimeout(() => document.querySelector(".fixoku-consent-dialog button")?.focus(), 0);
    else lastFocused.current?.focus?.();
  }, [open]);

  const commit = (categories, source) => {
    const next = saveConsent(normalizeConsent(categories), { source });
    setReceipt(next);
    setDraft(next.categories);
    updateConsentMode(next.categories);
    window.dispatchEvent(new CustomEvent("fixoku:consent-updated", { detail: next }));
    setOpen(false);
  };

  const openPreferences = () => {
    setDraft(receipt?.categories || readConsent()?.categories || deniedConsent());
    setOpen(true);
  };

  return (
    <>
      {!receipt && !open && (
        <section className="fixoku-consent-banner" role="region" aria-labelledby="fixoku-consent-title">
          <div>
            <p className="fixoku-consent-eyebrow">Gizlilik tercihleri</p>
            <h2 id="fixoku-consent-title">Çerezleri nasıl kullandığımızı seçin</h2>
            <p>Fixoku, zorunlu çerezleri hizmeti sunmak için kullanır. Analitik ve reklam çerezleri yalnızca izninizle etkinleşir.</p>
          </div>
          <div className="fixoku-consent-actions" aria-label="Çerez tercihleri işlemleri">
            <button type="button" className="fixoku-consent-primary" onClick={() => commit(grantedConsent(), "banner_accept_all")}>Tümünü Kabul Et</button>
            <button type="button" onClick={() => commit(deniedConsent(), "banner_reject_all")}>Tümünü Reddet</button>
            <button type="button" onClick={openPreferences}>Tercihleri Yönet</button>
          </div>
        </section>
      )}

      {open && (
        <div className="fixoku-consent-layer">
          <button type="button" className="fixoku-consent-backdrop" aria-label="Çerez tercihleri penceresini kapat" onClick={() => setOpen(false)} />
          <section className="fixoku-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="fixoku-preferences-title">
            <header><div><p className="fixoku-consent-eyebrow">Consent {CONSENT_VERSION}</p><h2 id="fixoku-preferences-title">Çerez Tercihleri</h2></div><button type="button" className="fixoku-consent-close" onClick={() => setOpen(false)} aria-label="Tercihleri kapat">×</button></header>
            <p>İşlevsel, analitik ve reklam/pazarlama çerezlerini ayrı ayrı seçebilirsiniz. Zorunlu çerezler her zaman aktiftir.</p>
            <div className="fixoku-consent-categories">
              <label><span><strong>Zorunlu</strong><small>Güvenlik ve temel sayfa işlevleri için gereklidir.</small></span><input type="checkbox" checked disabled aria-label="Zorunlu çerezler her zaman aktif" /></label>
              {[["functional", "İşlevsel", "Tercihlerinizi ve temel kullanım deneyimini hatırlar."], ["analytics", "Analitik", "Site kullanımını anonim ve ölçülü biçimde anlamamıza yardımcı olur."], ["advertising", "Reklam/Pazarlama", "İzin verdiğinizde ölçüm ve kampanya ilişkilendirmesi yapılır."]].map(([key, label, description]) => <label key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))} aria-label={`${label} çerezleri`} /></label>)}
            </div>
            <div className="fixoku-consent-dialog-actions"><button type="button" className="fixoku-consent-primary" onClick={() => commit(grantedConsent(), "preferences_accept_all")}>Tümünü Kabul Et</button><button type="button" onClick={() => commit(draft, "preferences_save")}>Seçimleri Kaydet</button><button type="button" onClick={() => commit(deniedConsent(), "preferences_reject_all")}>Tümünü Reddet</button></div>
          </section>
        </div>
      )}
    </>
  );
}
