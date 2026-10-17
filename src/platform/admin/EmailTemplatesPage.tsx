import { useEffect, useMemo, useRef, useState } from "react";
import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_CATALOG, renderEmail } from "../../server/domain/email-renderer.js";
import "./admin-panel.css";
import "./email-templates-owner-ux-v1.css";
import "./email-templates-owner-ux-v2.css";
import "./email-templates-owner-ux-v3.css";
import "./email-templates-owner-ux-v4.css";
import "./email-templates-owner-ux-v5.css";

// Her şablonun örnek verileri e-posta oluşturucusunda kendine özel tutulur.

// FIXOKU_EMAIL_UX_V1_HELPERS: UI'da gorunen kategori isimleri, API sabitleri degil.
function fixokuEmailCategoryTr(value: unknown): string {
  const key = String(value ?? "").trim().toUpperCase().replace(/[- ]/g, "_");
  const names: Record<string, string> = {
    ACCOUNT: "Hesap", COMMERCE: "Ticaret", TRAINER: "Eğitmen", STUDENT: "Öğrenci",
    SHIPPING: "Kargo", APPLICATION: "Başvuru", MARKETING: "Pazarlama", SYSTEM: "Sistem", SECURITY: "Güvenlik",
    NOTIFICATION: "Bildirim", NOTIFICATIONS: "Bildirimler", PAYMENT: "Ödeme",
    PAYMENTS: "Ödemeler", ORDER: "Sipariş", ORDERS: "Siparişler",
    ENROLLMENT: "Kayıt", FULFILLMENT: "Gönderim", DELIVERY: "Teslimat",
    OPERATIONS: "Operasyon", TRANSACTIONAL: "İşlemsel", PROMOTIONAL: "Tanıtım",
    AUTH: "Kimlik", AUTHENTICATION: "Kimlik doğrulama", GENERAL: "Genel",
    SUPPORT: "Destek", PARENT: "Ebeveyn", TEACHER: "Eğitmen",
  };
  return names[key] || String(value ?? "");
}
function fixokuEmailPreviewTr(html: string): string {
  // Yalnizca tarayici onizlemesindeki kategori metnini degistirir.
  // Gonderilen e-posta sablonlari ve renderer ciktilari degismez.
  return html.replace(/>(\s*)(ACCOUNT|COMMERCE|TRAINER|STUDENT|SHIPPING|APPLICATION|MARKETING|SYSTEM|SECURITY|NOTIFICATION|NOTIFICATIONS|PAYMENT|PAYMENTS|ORDER|ORDERS|ENROLLMENT|FULFILLMENT|DELIVERY|OPERATIONS|TRANSACTIONAL|PROMOTIONAL|AUTH|AUTHENTICATION|GENERAL|SUPPORT|PARENT|TEACHER)(\s*)</gi,
    (_full, before: string, category: string, after: string) => `>${before}${fixokuEmailCategoryTr(category)}${after}<`);
}

// FIXOKU_EMAIL_V2_ADDRESS_PANEL: only the administrative label is translated.
// SMTP identities and email delivery logic are not modified.
function fixokuEmailIdentityKindV2(value: unknown): string {
  const raw = String(value ?? "");
  const key = raw.toUpperCase().trim().replace(/[\s-]+/g, "_");
  if (key === "REAL_INBOX") return "Gerçek gelen kutusu";
  if (key.includes("ALIAS") && key.includes("SYSTEM")) return "Sistem göndericisi / yönlendirme";
  if (key.includes("ALIAS")) return "Yönlendirme adresi";
  if (key.includes("MARKETING")) return "Pazarlama göndericisi";
  if (key.includes("SYSTEM") || key.includes("TRANSACTIONAL")) return "Sistem göndericisi";
  if (key.includes("REPLY")) return "Yanıt adresi";
  return raw.replace(/_/g, " ");
}
// FIXOKU_EMAIL_V4_UI_ICONS: inline SVGs only in the admin interface.
type FixokuEmailUiV4IconName = "templates" | "categories" | "marketing" | "identity" | "library" | "preview" | "sending" | "information";
function FixokuEmailUiV4Icon({ name }: { name: FixokuEmailUiV4IconName }) {
  const iconProps = { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "templates": return <svg {...iconProps}><rect x="5" y="3.5" width="13" height="17" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
    case "categories": return <svg {...iconProps}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>;
    case "marketing": return <svg {...iconProps}><path d="M4 11v2l9 3V8l-9 3ZM13 9l5-4v14l-5-4M7 15l1.5 4h3"/></svg>;
    case "identity": return <svg {...iconProps}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>;
    case "library": return <svg {...iconProps}><path d="M5 5a2 2 0 0 1 2-2h12v17H7a2 2 0 0 0-2 2V5Z"/><path d="M5 7h14M9 11h6M9 14h6"/></svg>;
    case "preview": return <svg {...iconProps}><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
    case "sending": return <svg {...iconProps}><path d="m3 11 18-8-6.5 18-3.5-8L3 11Z"/><path d="m11 13 10-10"/></svg>;
    case "information": return <svg {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
  }
}

export function EmailTemplatesPage() {
  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATE_CATALOG[0].id);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [view, setView] = useState<"html" | "text">("html");
  const mainColumnRef = useRef<HTMLDivElement | null>(null);
  const [mainColumnHeight, setMainColumnHeight] = useState<number | null>(null);
  useEffect(() => {
    const element = mainColumnRef.current;
    if (!element) return;
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      setMainColumnHeight((previous) => previous === height ? previous : height);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const selected = useMemo(() => EMAIL_TEMPLATE_CATALOG.find((item) => item.id === selectedId) || EMAIL_TEMPLATE_CATALOG[0], [selectedId]);
  const rendered = useMemo(() => renderEmail(selected.id, {}, { preview: true, baseUrl: window.location.origin, logoUrl: `${window.location.origin}/logo-fixoku.png` }), [selected.id]);
  const marketingCount = EMAIL_TEMPLATE_CATALOG.filter((item) => item.marketing).length;
  const categories = Array.from(new Set(EMAIL_TEMPLATE_CATALOG.map((item) => item.category)));

  return <main className="platform-foundation-panel admin-panel email-template-review email-template-pro">
    <header className="admin-pro-header">
      <div><span className="admin-eyebrow">SİSTEM · İLETİŞİM</span><h1>E-posta Şablonları</h1><p>Fixoku’nun sistem ve pazarlama e-postalarını içerik, gönderici ve mobil görünüm açısından inceleyin.</p></div>
    </header>

    <section className="admin-kpi-grid fixoku-mail-v4-kpis">
      <article><span className="fixoku-mail-v4-kpi-icon is-lilac"><FixokuEmailUiV4Icon name="templates" /></span><div><span>Toplam şablon</span><strong>{EMAIL_TEMPLATE_CATALOG.length}</strong><small>Şablon kataloğunda</small></div></article>
      <article><span className="fixoku-mail-v4-kpi-icon is-blue"><FixokuEmailUiV4Icon name="categories" /></span><div><span>Kategori</span><strong>{categories.length}</strong><small>Şablon sınıfı</small></div></article>
      <article><span className="fixoku-mail-v4-kpi-icon is-peach"><FixokuEmailUiV4Icon name="marketing" /></span><div><span>Pazarlama</span><strong>{marketingCount}</strong><small>Abonelikten çıkma kuralı gerekir</small></div></article>
      <article><span className="fixoku-mail-v4-kpi-icon is-mint"><FixokuEmailUiV4Icon name="identity" /></span><div><span>Kimlik / adres</span><strong>{EMAIL_IDENTITIES.length}</strong><small>Gönderici ve yanıt rolleri</small></div></article>
    </section>

    <section className="email-template-workspace">
      <aside className="panel-card email-template-library" aria-label="E-posta şablonu seçimi" style={mainColumnHeight ? { height: `${mainColumnHeight}px` } : undefined}>
        <div className="admin-section-heading"><div className="fixoku-mail-v4-section-title"><span className="fixoku-mail-v4-section-icon is-lilac"><FixokuEmailUiV4Icon name="library" /></span><div><span className="admin-eyebrow">KÜTÜPHANE</span><h2>Şablonlar</h2><small>{EMAIL_TEMPLATE_CATALOG.length} şablon · Devamı için listeyi kaydırın</small></div></div></div>
        <div className="email-template-list">
          {EMAIL_TEMPLATE_CATALOG.map((template) => <button type="button" className={template.id === selected.id ? "is-active" : ""} key={template.id} onClick={() => setSelectedId(template.id)}><span>{fixokuEmailCategoryTr(template.category)}</span><strong>{template.title}</strong>{template.marketing && <small>Pazarlama</small>}</button>)}
        </div>
      </aside>

      <div className="email-template-main" ref={mainColumnRef}>
        <section className="panel-card email-template-toolbar-pro">
          <div className="fixoku-mail-v4-section-title"><span className="fixoku-mail-v4-section-icon is-peach"><FixokuEmailUiV4Icon name="preview" /></span><div><span className="admin-eyebrow">ÖNİZLEME</span><h2>{selected.title}</h2></div></div>
          <div className="email-template-controls">
            <div className="email-template-segmented" role="group" aria-label="Önizleme görünümü"><button type="button" className={view === "html" ? "is-selected" : ""} onClick={() => setView("html")}>Görsel</button><button type="button" className={view === "text" ? "is-selected" : ""} onClick={() => setView("text")}>Düz metin</button></div>
            {view === "html" && <div className="email-template-segmented" role="group" aria-label="Ekran boyutu"><button type="button" className={viewport === "desktop" ? "is-selected" : ""} onClick={() => setViewport("desktop")}>Masaüstü</button><button type="button" className={viewport === "mobile" ? "is-selected" : ""} onClick={() => setViewport("mobile")}>Mobil</button></div>}
          </div>
        </section>

        <section className="email-template-meta admin-package-grid" aria-label="Gönderim özeti">
          <article className="admin-package-card fixoku-mail-v4-sending"><h3><span className="fixoku-mail-v4-heading-icon is-blue"><FixokuEmailUiV4Icon name="sending" /></span>Gönderim bilgileri</h3><dl><div><dt>Konu</dt><dd>{rendered.subject}</dd></div><div><dt>Gönderen</dt><dd>{rendered.from}</dd></div><div><dt>Yanıt adresi</dt><dd>{rendered.replyTo}</dd></div><div><dt>Kategori</dt><dd>{fixokuEmailCategoryTr(selected.category)}</dd></div></dl>{selected.marketing && <p className="email-template-note">Pazarlama şablonu: abonelikten çıkma ve List-Unsubscribe sözleşmesi korunmalıdır.</p>}</article>
          <article className="admin-package-card fixoku-mail-v4-notes"><h3><span className="fixoku-mail-v4-heading-icon is-mint"><FixokuEmailUiV4Icon name="information" /></span>Önizleme notları</h3><p>Her şablon kendine özel, temsili bilgilerle önizlenir. Gerçek kişilere gönderim yapılmaz; canlı veri bağlantıları ayrıca doğrulanacaktır.</p><small>Üretimde logo için HTTPS ve sabit <code>EMAIL_LOGO_URL</code> kullanılmalıdır.</small></article>
        </section>

        <section className="email-template-preview-card admin-package-card" aria-label="E-posta önizlemesi">{view === "html" ? <div className={`email-template-frame email-template-frame-${viewport}`}><iframe title={`${selected.title} HTML önizlemesi`} srcDoc={fixokuEmailPreviewTr(rendered.html)} /></div> : <pre className="email-template-plain">{rendered.text}</pre>}</section>
      </div>
    </section>

    <section className="panel-card email-identity-details fixoku-email-v2-addresses fixoku-mail-v5-addresses" aria-label="Gönderici ve yanıt adresleri">
      <div className="fixoku-mail-v5-address-heading"><span className="fixoku-email-v2-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="m4.5 7.5 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Gönderici ve yanıt adresleri <span>{EMAIL_IDENTITIES.length} kayıt</span></div>
      <div className="fixoku-mail-v4-address-hint"><FixokuEmailUiV4Icon name="information" /><p>Bu liste ayrı ücretli posta kutusu sayısını değil, sistemdeki gönderici ve yanıt rollerini gösterir.</p></div>
      <div className="email-identity-table" role="table" aria-label="E-posta adresleri"><div className="email-identity-row email-identity-header" role="row"><strong>Adres</strong><strong>Amaç</strong><strong>Tür</strong><strong>Yanıt adresi</strong></div>{EMAIL_IDENTITIES.map((identity) => <div className="email-identity-row" role="row" key={identity.address}><span>{identity.address}</span><span>{fixokuEmailCategoryTr(identity.purpose)}</span><span>{fixokuEmailIdentityKindV2(identity.kind)}</span><span>{identity.replyTo}</span></div>)}</div>
    </section>
  </main>;
}
