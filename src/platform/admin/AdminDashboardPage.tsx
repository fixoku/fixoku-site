import { useEffect, useState } from "react";
import "./admin-panel.css";

type ProviderStatus = { provider: string; status: string; configured: boolean };

export function AdminDashboardPage() {
  const [data, setData] = useState<any>({ requests: [], metrics: {} });
  const [providers, setProviders] = useState<Record<string, ProviderStatus> | null>(null);
  useEffect(() => {
    fetch("/api/admin/assignment-requests").then((r) => r.json()).then(setData).catch(() => { /* explanatory empty state */ });
    fetch("/api/provider-status", { credentials: "same-origin" }).then((r) => r.ok ? r.json() : null).then((body) => { if (body?.providers) setProviders(body.providers); }).catch(() => { /* status remains unavailable */ });
  }, []);
  const providerRows: [string, string][] = [["email", "E-posta"], ["digitalStorage", "Dijital depolama"], ["shipping", "Kargo"]];
  return <main className="platform-foundation-panel admin-panel">
    <nav aria-label="Yönetim paneli menüsü"><a href="/panel/admin" aria-current="page">Genel Bakış</a><a href="/panel/admin/atamalar">Eğitmen Atamaları</a><a href="/panel/admin/paketler">Paket Yönetimi</a><a href="/panel/admin/egitmenler">Eğitmenler</a><a href="/panel/admin/kargo">Kargo</a><a href="/panel/admin/urunler">Ürünler</a><a href="/panel/admin/saglayicilar">Sağlayıcı durumu</a><a href="/panel/bildirimler">Bildirimler</a><a href="/panel/owner">Owner finansı</a></nav>
    <h1>Yönetim Paneli</h1><p>Fixoku operasyonlarını güvenle yönetin.</p>
    <div className="panel-card"><h2>Bekleyen Eğitmen Atamaları</h2><strong>{data.requests?.length || 0}</strong><a href="/panel/admin/atamalar">Eğitmen Atamaları</a></div>
    <div className="panel-card"><h2>Aktif Eğitmenler</h2><strong>{data.metrics?.activeTrainers || 0}</strong></div>
    <div className="panel-card"><h2>Aktif Öğrenciler</h2><strong>{data.metrics?.activeStudents || 0}</strong></div>
    <section className="panel-card provider-status-card" aria-labelledby="provider-status-title"><h2 id="provider-status-title">Sağlayıcı durumu</h2><p>Yalnızca Owner ve operasyon yöneticilerine görünen yapılandırma özeti.</p>{!providers ? <p role="status">Sağlayıcı durumu yükleniyor…</p> : <dl>{providerRows.map(([key, label]) => { const item = providers[key]; return <div key={key}><dt>{label}</dt><dd><span className={`provider-status-dot ${item?.configured ? "is-configured" : "is-disabled"}`} aria-hidden="true" />{item?.configured ? "Yapılandırıldı" : "Yapılandırma gerekli"}<small data-text-integrity-technical>{item?.provider || "—"} · {item?.status || "Durum bilinmiyor"}</small></dd></div>; })}</dl>}</section>
  </main>;
}
