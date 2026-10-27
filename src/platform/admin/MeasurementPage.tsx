import { useEffect, useMemo, useState } from "react";
import "./admin-panel.css";

const keys = [["GTM", "GTM_CONTAINER_ID"], ["GA4", "GA4_MEASUREMENT_ID"], ["Google Ads", "GOOGLE_ADS_ID"], ["Meta Pixel", "META_PIXEL_ID"], ["Meta CAPI", "META_CAPI_ACCESS_TOKEN"], ["TikTok Pixel", "TIKTOK_PIXEL_ID"], ["TikTok Events API", "TIKTOK_EVENTS_ACCESS_TOKEN"]] as const;

export function MeasurementPage() {
  const [consent, setConsent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const update = () => {
      try { setConsent(JSON.parse(window.localStorage.getItem("fixoku_consent_preferences") || "null")); }
      catch { setConsent(null); }
    };
    update();
    window.addEventListener("fixoku:consent-updated", update);
    return () => window.removeEventListener("fixoku:consent-updated", update);
  }, []);

  useEffect(() => {
    const update = () => {
      const layer = Array.isArray((window as any).dataLayer) ? (window as any).dataLayer : [];
      setEvents(layer.slice(-20).filter((item: any) => item && typeof item === "object" && typeof item.event === "string").map((item: any) => ({ event: item.event, event_id: item.event_id, event_time: item.event_time, page: item.page_path, consent_state: item.consent_state })));
    };
    update();
    const timer = window.setInterval(update, 750);
    return () => window.clearInterval(timer);
  }, []);

  const categories = consent?.categories || { necessary: true, functional: false, analytics: false, advertising: false };
  const activeConsentCount = useMemo(() => Object.values(categories).filter(Boolean).length, [categories]);

  return <main className="platform-foundation-panel admin-panel measurement-pro">
    <header className="admin-pro-header">
      <div><span className="admin-eyebrow">SİSTEM · ÖLÇÜMLEME</span><h1>Ölçümleme & Pazarlama</h1><p>Onay yönetimini, ölçümleme entegrasyonlarını ve tarayıcıdaki güvenli olay akışını tek yerde inceleyin.</p></div>
    </header>

    <section className="admin-kpi-grid">
      <article><span>Onay kategorisi</span><strong>{activeConsentCount}/4</strong><small>Tarayıcıda etkin kategori</small></article>
      <article><span>İzlenen teknik bağlantı</span><strong>{keys.length}</strong><small>Kimlik/token değeri gösterilmez</small></article>
      <article><span>Yerel olay</span><strong>{events.length}</strong><small>Son 20 dataLayer olayı içinden</small></article>
      <article><span>Gizli değer</span><strong>Korunuyor</strong><small>Token ve kimlikler UI'a yazılmaz</small></article>
    </section>

    <section className="admin-dashboard-grid">
      <article className="panel-card">
        <div className="admin-section-heading"><div><span className="admin-eyebrow">ONAY</span><h2>Çerez ve izin durumu</h2></div><span className="admin-status admin-status-published">Varsayılan kapalı</span></div>
        <div className="consent-grid">
          {Object.entries(categories).map(([key, enabled]) => <div className={`consent-tile ${enabled ? "is-on" : ""}`} key={key}><strong>{key === "necessary" ? "Zorunlu" : key === "functional" ? "Fonksiyonel" : key === "analytics" ? "Analitik" : "Reklam"}</strong><span>{enabled ? "Açık" : "Kapalı"}</span></div>)}
        </div>
      </article>
      <article className="panel-card">
        <div className="admin-section-heading"><div><span className="admin-eyebrow">KURAL</span><h2>Bu ekran neyi doğrular?</h2></div></div>
        <div className="finance-reading-list">
          <p><strong>Gizlilik</strong><span>Sağlayıcı tokenları ve kimlikleri burada gösterilmez.</span></p>
          <p><strong>Onay</strong><span>Tarayıcıda kayıtlı kategori tercihleri gerçek zamanlı okunur.</span></p>
          <p><strong>Olaylar</strong><span>Yalnız güvenli event adı, sayfa, zaman ve onay bağlamı görünür.</span></p>
        </div>
      </article>
    </section>

    <section className="panel-card">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">ENTEGRASYONLAR</span><h2>Ölçümleme bağlantıları</h2></div><span className="admin-section-meta">Değerler güvenlik nedeniyle gizlidir</span></div>
      <div className="integration-card-grid">
        {keys.map(([label, key]) => <article className="integration-card" key={key}><div className="integration-card-icon" aria-hidden="true">{label.slice(0, 1)}</div><div><h3>{label}</h3><p>Teknik anahtar: <code>{key}</code></p><small>Bu ekran yapılandırma değerini açığa çıkarmaz; bağlantının üretim kabulü ayrı provider/runtime testiyle yapılmalıdır.</small></div></article>)}
      </div>
    </section>

    <details className="panel-card measurement-event-log">
      <summary>Güvenli yerel olay günlüğü <span>{events.length} olay</span></summary>
      <p>Bu görünüm yalnız tarayıcıdaki son olayları gösterir; sağlayıcı tarafında teslim edildiğini kanıtlamaz.</p>
      {events.length ? <div className="event-log-list">{events.map((event, index) => <div className="event-log-row" key={`${event.event}-${event.event_id || index}`}><strong>{event.event}</strong><span>{event.page || "Sayfa yok"}</span><small>{event.consent_state || "Onay durumu yok"}</small></div>)}</div> : <div className="admin-empty-state"><strong>Henüz olay yok.</strong><span>Sayfa etkileşimleri oluştuğunda güvenli olaylar burada görünecek.</span></div>}
    </details>
  </main>;
}
