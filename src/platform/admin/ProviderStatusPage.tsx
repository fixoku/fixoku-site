import { useEffect, useState } from "react";
import "./admin-panel.css";

type Provider = { name: string; status: string; reason: string | null; runtimeVerified?: boolean; readyForLive?: boolean; configured?: boolean };
type Payload = { providers: { email: Provider; digitalStorage: Provider; shipping: Provider; paytr?: Provider } };

const labels: Record<string, string> = { CONFIGURED: "Yapılandırıldı", CONFIGURED_TEST: "Yerel test taşıması etkin", CONFIGURED_UNVERIFIED: "Yapılandırıldı, canlı doğrulama bekliyor", DISABLED: "Yapılandırma bekliyor", DISABLED_CONFIG_REQUIRED: "Yapılandırma bekliyor", CONFIG_REQUIRED: "Yapılandırma bekliyor", DIGITAL_STORAGE_CONFIG_REQUIRED: "Yapılandırma bekliyor", CARRIER_SELECTION_REQUIRED: "Taşıyıcı yapılandırması bekleniyor", S3_RUNTIME_NOT_CONFIGURED: "Yapılandırma bekliyor", ERROR: "Kontrol edilemedi" };
const providerName = (provider: Provider, label: string) => provider.name === "DISABLED" ? (label === "Kargo" ? "Kargo seçilmedi" : "Yapılandırma bekliyor") : provider.name;
const statusClass = (status: string) => status === "CONFIGURED" || status === "CONFIGURED_TEST" ? "is-success" : status === "ERROR" ? "is-danger" : "is-warning";

export function ProviderStatusPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState("loading");
  const load = () => { setState("loading"); fetch("/api/provider-status", { credentials: "same-origin" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then((payload) => { setData(payload); setState("ready"); }).catch(() => setState("error")); };
  useEffect(() => { void load(); }, []);
  const rows = data ? [["E-posta", "mail", data.providers.email], ["Dijital depolama", "cloud", data.providers.digitalStorage], ["Kargo", "truck", data.providers.shipping], ...(data.providers.paytr ? [["PayTR", "credit-card", data.providers.paytr] as const] : [])] as const : [];
  const configured = rows.filter(([, , provider]) => provider.readyForLive === true).length;

  return <main className="platform-foundation-panel admin-panel provider-status-pro">
    <header className="admin-pro-header">
      <div><span className="admin-eyebrow">SİSTEM · ENTEGRASYON</span><h1>Entegrasyon Durumu</h1><p>Operasyonel servislerin çalışma ve yapılandırma durumunu gizli değerleri açığa çıkarmadan kontrol edin.</p></div>
      <button type="button" onClick={() => void load()} disabled={state === "loading"}>{state === "loading" ? "Kontrol ediliyor…" : "Yeniden kontrol et"}</button>
    </header>

    {state === "loading" && <div className="admin-loading-card" role="status">Entegrasyon durumu kontrol ediliyor…</div>}
    {state === "error" && <div className="admin-callout is-danger" role="alert"><strong>Entegrasyon durumu okunamadı.</strong><button type="button" onClick={() => void load()}>Tekrar dene</button></div>}

    {state === "ready" && data && <>
      <section className="admin-kpi-grid">
        <article><span>Toplam servis</span><strong>{rows.length}</strong><small>Operasyon provider'ı</small></article>
        <article><span>Hazır / test</span><strong>{configured}</strong><small>Çalışabilir durumda görünen</small></article>
        <article><span>İşlem bekleyen</span><strong>{rows.length - configured}</strong><small>Yapılandırma veya kontrol gerekir</small></article>
        <article><span>Gizli bilgi</span><strong>Korunuyor</strong><small>Token ve parola gösterilmez</small></article>
      </section>
      <section className="integration-card-grid provider-card-grid" aria-label="Sağlayıcılar">
        {rows.map(([label, icon, provider]) => <article className="panel-card provider-card" key={label}><div className={`provider-state-dot ${statusClass(provider.status)}`} aria-hidden="true" /><div className="provider-card-copy"><span className="admin-eyebrow">{icon === "mail" ? "İLETİŞİM" : icon === "cloud" ? "DOSYA" : "LOJİSTİK"}</span><h2>{label}</h2><strong>{providerName(provider, label)}</strong><span className={`admin-status ${statusClass(provider.status)}`}>{labels[provider.status] || "Yapılandırma bekliyor"}</span>{provider.reason && <small>{provider.reason === "S3_RUNTIME_NOT_CONFIGURED" || provider.reason === "DIGITAL_STORAGE_CONFIG_REQUIRED" ? "Bu hizmet için gerekli runtime yapılandırması henüz tamamlanmadı." : provider.reason === "CARRIER_SELECTION_REQUIRED" ? "Taşıyıcı seçimi ve gerekli bağlantı bilgileri bekleniyor." : "Servis yapılandırmasının kontrol edilmesi gerekiyor."}</small>}</div></article>)}
      </section>
    </>}
  </main>;
}
