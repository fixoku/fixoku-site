import { useMemo, useState } from "react";
import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_CATALOG, renderEmail } from "../../server/domain/email-renderer.js";
import "./admin-panel.css";

const DEMO_DATA = { recipientName: "Ayşe Demir", reference: "FX-2026-005A", amount: "1.250 TL", detail: "Bu alan yalnızca yapılandırılmış demo verisi gösterir.", ctaPath: "/panel/owner" };

export function EmailTemplatesPage() {
  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATE_CATALOG[0].id);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [view, setView] = useState<"html" | "text">("html");
  const selected = useMemo(() => EMAIL_TEMPLATE_CATALOG.find((item) => item.id === selectedId) || EMAIL_TEMPLATE_CATALOG[0], [selectedId]);
  const rendered = useMemo(() => renderEmail(selected.id, DEMO_DATA, { baseUrl: window.location.origin, logoUrl: `${window.location.origin}/logo-fixoku.png` }), [selected.id]);
  return (
    <main className="platform-foundation-panel admin-panel email-template-review">
      <nav aria-label="Yönetim paneli menüsü"><a href="/panel/owner">Genel Bakış</a><a href="/panel/owner/olcumleme">Ölçümleme</a><a href="/panel/owner/e-posta-sablonlari" aria-current="page">E-posta şablonları</a></nav>
      <h1>E-posta şablonları</h1><p>Ortak Fixoku renderer’ı, aynı yapılandırılmış veriden güvenli HTML ve düz metin üretir. Önizleme hiçbir ileti göndermez.</p>
      <section className="email-template-toolbar" aria-label="E-posta şablonu seçimi"><label htmlFor="email-template-select">Şablon<select id="email-template-select" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{EMAIL_TEMPLATE_CATALOG.map((template) => <option value={template.id} key={template.id}>[{template.category}] {template.title}</option>)}</select></label><div className="email-template-segmented" role="group" aria-label="Önizleme görünümü"><button type="button" className={view === "html" ? "is-selected" : ""} onClick={() => setView("html")}>HTML önizleme</button><button type="button" className={view === "text" ? "is-selected" : ""} onClick={() => setView("text")}>Düz metin</button></div>{view === "html" && <div className="email-template-segmented" role="group" aria-label="Ekran boyutu"><button type="button" className={viewport === "desktop" ? "is-selected" : ""} onClick={() => setViewport("desktop")}>Masaüstü</button><button type="button" className={viewport === "mobile" ? "is-selected" : ""} onClick={() => setViewport("mobile")}>Mobil</button></div>}</section>
      <section className="email-template-meta admin-package-grid" aria-label="Gönderim özeti"><article className="admin-package-card"><h2>Gönderim sözleşmesi</h2><dl><div><dt>Konu</dt><dd>{rendered.subject}</dd></div><div><dt>Gönderen</dt><dd>{rendered.from}</dd></div><div><dt>Reply-To</dt><dd>{rendered.replyTo}</dd></div><div><dt>Kategori</dt><dd>{selected.category}</dd></div></dl>{selected.marketing && <p className="email-template-note">Pazarlama: görünür abonelikten çık, List-Unsubscribe ve tek tık sözleşmesi hazır.</p>}</article><article className="admin-package-card"><h2>Logo stratejisi</h2><p>Yerel önizleme için aynı origin’deki <code>/logo-fixoku.png</code> kullanılır. Üretimde <code>EMAIL_LOGO_URL</code>, HTTPS ve değişmez bir asset URL’sine ayarlanmalıdır; localhost veya Windows yolu kullanılmaz.</p></article></section>
      <section className="email-template-preview-card admin-package-card" aria-label="E-posta önizlemesi">{view === "html" ? <div className={`email-template-frame email-template-frame-${viewport}`}><iframe title={`${selected.title} HTML önizlemesi`} srcDoc={rendered.html} /></div> : <pre className="email-template-plain">{rendered.text}</pre>}</section>
      <section className="admin-package-card"><h2>Adres ve rol eşlemesi</h2><p>Adresler gerçek gelen kutusu, alias, sistem göndereni veya pazarlama göndereni olarak ayrıdır. Bu liste yedi ayrı ücretli posta kutusu gerektiği anlamına gelmez.</p><div className="email-identity-table" role="table" aria-label="E-posta adresleri"><div className="email-identity-row email-identity-header" role="row"><strong>Adres</strong><strong>Amaç</strong><strong>Tür</strong><strong>Reply-To</strong></div>{EMAIL_IDENTITIES.map((identity) => <div className="email-identity-row" role="row" key={identity.address}><span>{identity.address}</span><span>{identity.purpose}</span><span>{identity.kind}</span><span>{identity.replyTo}</span></div>)}</div></section>
    </main>
  );
}
