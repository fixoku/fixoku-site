import { useEffect, useState } from "react";
import "./admin-panel.css";

type Provider = { name: string; status: string; reason: string | null };
type Payload = { providers: { email: Provider; digitalStorage: Provider; shipping: Provider } };

const labels: Record<string, string> = { CONFIGURED: "Yapılandırıldı", CONFIGURED_TEST: "Yerel test taşıması etkin", DISABLED: "Yapılandırma bekliyor", DISABLED_CONFIG_REQUIRED: "Yapılandırma bekliyor", CONFIG_REQUIRED: "Yapılandırma bekliyor", DIGITAL_STORAGE_CONFIG_REQUIRED: "Yapılandırma bekliyor", CARRIER_SELECTION_REQUIRED: "Taşıyıcı yapılandırması bekleniyor", S3_RUNTIME_NOT_CONFIGURED: "Yapılandırma bekliyor", ERROR: "Kontrol edilemedi" };
const providerName = (provider: Provider, label: string) => provider.name === "DISABLED" || provider.name === "SENDEO" ? (label === "Kargo" ? "Sendeo" : "Yapılandırma bekliyor") : provider.name;

export function ProviderStatusPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState("loading");
  const load = () => { setState("loading"); fetch("/api/provider-status", { credentials: "same-origin" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then((payload) => { setData(payload); setState("ready"); }).catch(() => setState("error")); };
  useEffect(() => { void load(); }, []);
  const rows = data ? [["E-posta", data.providers.email], ["Dijital depolama", data.providers.digitalStorage], ["Kargo", data.providers.shipping]] as const : [];
  return <main className="platform-foundation-panel admin-panel"><nav aria-label="Yönetim paneli menüsü"><a href="/panel/admin">Genel Bakış</a><a href="/panel/admin/saglayicilar" aria-current="page">Sağlayıcı durumu</a></nav><h1>Sağlayıcı Durumu</h1><p>Operasyonel yapılandırma özeti. Kimlik bilgileri ve gizli değerler gösterilmez.</p>{state === "loading" && <p role="status">Sağlayıcı durumu yükleniyor…</p>}{state === "error" && <p role="alert">Sağlayıcı durumu okunamadı. <button type="button" onClick={() => void load()}>Tekrar dene</button></p>}{state === "ready" && <section className="admin-package-grid" aria-label="Sağlayıcılar">{rows.map(([label, provider]) => <article className="admin-package-card" key={label}><h2>{label}</h2><p><strong>{providerName(provider, label)}</strong></p><p role="status">{labels[provider.status] || "Yapılandırma bekliyor"}</p>{provider.reason && <small>{provider.reason === "S3_RUNTIME_NOT_CONFIGURED" || provider.reason === "DIGITAL_STORAGE_CONFIG_REQUIRED" ? "Bu hizmet için gerekli yapılandırma henüz tamamlanmadı." : provider.reason === "CARRIER_SELECTION_REQUIRED" ? "Taşıyıcı yapılandırması bekleniyor." : "Gerekli yapılandırma bulunamadı."}</small>}</article>)}</section>}</main>;
}
