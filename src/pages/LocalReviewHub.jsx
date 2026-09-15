import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./local-review-hub.css";
import { DEMO_IDENTITIES, localReviewEnabled } from "./local-review-data.js";

const ownerLinks = [
  ["Genel Bakış", "/panel/owner"],
  ["Finans Özeti", "/panel/owner/finance"],
  ["Sağlayıcı Durumu", "/panel/owner/saglayicilar"],
  ["Ölçümleme", "/panel/owner/olcumleme"],
  ["E-posta Şablonları", "/panel/owner/e-posta-sablonlari"],
  ["Yasal Hazırlık", "/panel/owner/yasal-hazirlik"],
  ["Bildirimler", "/panel/bildirimler"],
];
const operationLinks = [
  ["Admin", "/panel/admin"], ["Eğitmenler", "/panel/admin/egitmenler"],
  ["Paketler", "/panel/admin/paketler"], ["Atamalar", "/panel/admin/atamalar"],
  ["Ürünler", "/panel/admin/urunler"], ["Kargo", "/panel/admin/kargo"],
];
const trainerLinks = [
  ["Ana Sayfa", "/panel/egitmen"], ["Profilim", "/panel/egitmen/profil"],
  ["Eğitimlerim", "/panel/egitmen/egitimlerim"], ["Sunumlarım", "/panel/egitmen/sunumlarim"],
  ["Kaynaklarım", "/panel/egitmen/kaynaklarim"], ["Müsaitlik", "/panel/egitmen/musaitlik"],
  ["Bakiye / Kazançlar", "/panel/egitmen/bakiyem"], ["Ödeme Hesabım", "/panel/egitmen/payout-hesabim"],
  ["Bildirimler", "/panel/bildirimler"],
];
const studentLinks = [
  ["Ana Sayfa", "/panel/ogrenci"], ["Profilim", "/panel/ogrenci/profil"],
  ["Paketlerim / Paketler", "/panel/ogrenci/paketler"], ["Eğitimim", "/panel/ogrenci"],
  ["Kargolarım", "/panel/ogrenci/kargolar"], ["Bildirimler", "/panel/bildirimler"],
];
const legalLinks = [
  ["KVKK", "/kvkk"], ["Gizlilik", "/gizlilik-politikasi"], ["Çerez Politikası", "/cerez-politikasi"],
  ["Açık Rıza", "/acik-riza"], ["Ticari Elektronik İleti", "/ticari-elektronik-ileti"],
  ["Kullanım Koşulları", "/kullanim-kosullari"], ["Üyelik Sözleşmesi", "/uyelik-sozlesmesi"],
  ["Mesafeli Satış", "/mesafeli-satis-sozlesmesi"], ["Ön Bilgilendirme", "/on-bilgilendirme-formu"],
  ["İptal / İade / Cayma", "/iptal-iade-cayma-politikasi"], ["Teslimat / Kargo", "/teslimat-kargo-politikasi"],
  ["Dijital İçerik ve Hizmet Koşulları", "/dijital-icerik-ve-hizmet-kosullari"],
  ["Veri Sahibi Başvuru Formu", "/veri-sahibi-basvuru-formu"],
];

function LinkSection({ title, links }) {
  const headingId = `local-review-${title.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/gu, "-")}`;
  return <section className="local-review-section" aria-labelledby={headingId}><h2 id={headingId}>{title}</h2><div className="local-review-links">{links.map(([label, to]) => <Link className="local-review-link" key={`${label}-${to}`} to={to}>{label}<span aria-hidden="true">›</span></Link>)}</div></section>;
}

function IdentityCard({ identity, current, busy, onSelect }) {
  const active = current?.slug === identity.slug;
  return <button type="button" className={`local-review-identity ${active ? "is-current" : ""}`} aria-pressed={active} disabled={busy} onClick={() => onSelect(identity)}>
    <span className="local-review-avatar" aria-hidden="true">{identity.initials}</span><span className="local-review-identity-copy"><strong>{identity.name}</strong><small>{identity.roleLabel}</small></span><span className="local-review-select">{active ? "Görüntüleniyor" : "Görüntüle"}<span aria-hidden="true">→</span></span>
  </button>;
}

export default function LocalReviewHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadCurrent = useCallback(async () => {
    try {
      const response = await fetch("/api/panel-context", { credentials: "same-origin" });
      if (!response.ok) { setCurrent(null); return; }
      const context = await response.json();
      const match = DEMO_IDENTITIES.find((identity) => identity.name === context.user?.name || identity.slug === context.user?.reviewSlug);
      setCurrent({ ...(match || {}), name: context.user?.name || match?.name || "", role: context.roles?.[0] || match?.role || "" });
    } catch { setCurrent(null); }
  }, []);
  useEffect(() => { void loadCurrent(); }, [loadCurrent, location.key]);

  const selectIdentity = useCallback(async (identity) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local-review/switch-user", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: identity.slug }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === "LOCAL_REVIEW_DISABLED" ? "Yerel inceleme bu ortamda etkin değil." : "Kullanıcı değiştirilemedi.");
      setCurrent(identity);
      const target = result.redirect || (identity.role === "OWNER" ? "/panel/owner" : identity.role === "TRAINER" ? "/panel/egitmen" : "/panel/ogrenci");
      navigate(target, { replace: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kullanıcı değiştirilemedi."); }
    finally { setBusy(false); }
  }, [navigate]);

  const quickSections = useMemo(() => {
    if (!current) return [];
    if (current.role === "OWNER") return [["Sahip / Yönetim", ownerLinks], ["Operasyon", operationLinks]];
    if (current.role === "TRAINER") return [["Eğitmen Paneli", trainerLinks]];
    return [["Öğrenci Paneli", studentLinks]];
  }, [current]);

  if (!localReviewEnabled()) return <main className="local-review-unavailable"><h1>Sayfa bulunamadı</h1><p>Yerel inceleme yalnızca bu bilgisayardaki geliştirme ortamında kullanılabilir.</p></main>;
  return <main className="local-review-page"><div className="local-review-shell">
    <header className="local-review-header"><div><span className="local-review-eyebrow">Fixoku</span><h1>Fixoku Yerel İnceleme</h1><p>Kontrol etmek istediğiniz kullanıcıyı seçin. Şifre girmeniz gerekmez.</p></div><Link className="local-review-home" to="/">Ana sayfaya dön</Link></header>
    <section className="local-review-current" aria-live="polite"><div><span>Şu an görüntülenen kullanıcı:</span><strong>{current?.name || "Henüz bir kullanıcı seçilmedi"}</strong>{current?.role && <small>Rol: {current.role === "OWNER" ? "Sahip / Yönetici" : current.role === "TRAINER" ? "Usta Öğretici" : "Öğrenci"}</small>}</div><button type="button" onClick={() => document.getElementById("local-review-identities")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Kullanıcı değiştir</button></section>
    {error && <p className="local-review-error" role="alert">{error}</p>}
    <section id="local-review-identities" className="local-review-identities" aria-labelledby="local-review-identities-title"><div className="local-review-section-heading"><div><span className="local-review-eyebrow">Kullanıcı seçimi</span><h2 id="local-review-identities-title">Bir kullanıcıyla devam edin</h2></div><span className="local-review-local-badge">Yerel inceleme</span></div><div className="local-review-identity-grid">{DEMO_IDENTITIES.map((identity) => <IdentityCard key={identity.slug} identity={identity} current={current} busy={busy} onSelect={selectIdentity} />)}</div></section>
    {quickSections.map(([title, links]) => <LinkSection key={title} title={title} links={links} />)}
    <div className="local-review-columns"><LinkSection title="Genel Site" links={[["Ana Sayfa", "/"], ["İletişim", "/iletisim"]]} /><section className="local-review-section"><h2>Çerezler</h2><button type="button" className="local-review-cookie" onClick={() => window.dispatchEvent(new CustomEvent("fixoku:consent-open"))}>Çerezleri yeniden göster <span aria-hidden="true">›</span></button></section></div>
    <LinkSection title="Yasal" links={legalLinks} />
    <footer className="local-review-footer"><span>Bu alan yalnızca yerel kullanıcı incelemesi içindir.</span><Link to="/giris">Giriş sayfası</Link></footer>
  </div></main>;
}
