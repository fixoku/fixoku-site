import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./admin-panel.css";

type DashboardData = {
  requests?: unknown[];
  metrics?: { activeTrainers?: number; activeStudents?: number; pendingAssignments?: number };
};
type FinanceData = { metrics?: { netSalesMinor?: number; trainerUnpaidMinor?: number; trainerPaidMinor?: number }; unfinishedTrainerLedObligations?: number };

const money = (minor: number | null | undefined) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format((minor ?? 0) / 100);

export function OwnerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [finance, setFinance] = useState<FinanceData>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/assignment-requests", { credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
      fetch("/api/owner/finance", { credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
    ]).then(([operations, financeData]) => { if (active) { setDashboard(operations); setFinance(financeData); } }).catch(() => { /* cards retain safe empty states */ }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const metrics = dashboard.metrics || {};
  const financeMetrics = finance.metrics || {};
  return <main className="platform-foundation-panel admin-panel owner-dashboard">
    <h1>Yönetici Genel Bakışı</h1>
    <p>Fixoku operasyonlarını tek bakışta izleyin; ayrıntılı finans kayıtları ayrı Finans Özeti ekranında tutulur.</p>
    {loading && <p role="status">Özet veriler yükleniyor…</p>}
    <section className="owner-dashboard-grid" aria-label="Operasyon özeti">
      <article className="panel-card"><span className="owner-dashboard-card-label">Finans özeti</span><strong>{money(financeMetrics.netSalesMinor)}</strong><p>Net satış</p><Link className="owner-dashboard-card-link" to="/panel/owner/finance">Finans ayrıntılarını görüntüle</Link></article>
      <article className="panel-card"><span className="owner-dashboard-card-label">Aktif eğitmen</span><strong>{metrics.activeTrainers ?? 0}</strong><p>Yetkili ve etkin hesaplar</p><Link className="owner-dashboard-card-link" to="/panel/admin/egitmenler">Eğitmenleri görüntüle</Link></article>
      <article className="panel-card"><span className="owner-dashboard-card-label">Aktif öğrenci</span><strong>{metrics.activeStudents ?? 0}</strong><p>Etkin öğrenci profilleri</p></article>
      <article className="panel-card"><span className="owner-dashboard-card-label">Bekleyen eğitmen ataması</span><strong>{metrics.pendingAssignments ?? dashboard.requests?.length ?? 0}</strong><p>İşleme alınmayı bekleyen talepler</p><Link className="owner-dashboard-card-link" to="/panel/admin/atamalar">Atamaları incele</Link></article>
      <article className="panel-card owner-dashboard-secondary"><h2>Eğitmen yükümlülüğü</h2><strong>{money(financeMetrics.trainerUnpaidMinor)}</strong><p>Henüz ödenmemiş hak ediş</p><Link className="owner-dashboard-card-link" to="/panel/owner/finance">Ödeme kayıtlarını görüntüle</Link></article>
      <article className="panel-card owner-dashboard-secondary"><h2>Operasyon bağlantıları</h2><div className="owner-dashboard-actions"><Link to="/panel/admin/paketler">Paket yönetimi</Link><Link to="/panel/admin/kargo">Kargo</Link><Link to="/panel/owner/saglayicilar">Sağlayıcı durumu</Link></div></article>
    </section>
  </main>;
}
