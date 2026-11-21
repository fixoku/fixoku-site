import { useCallback, useEffect, useState } from "react";

type CostOrder = { orderId: string; orderKind: "STUDENT_ORDER" | "TRAINER_PACKAGE_ORDER"; costMinor: number; lines: number; recordedAt?: string | null };
type Evidence = { status: "COST_EVIDENCE_ONLY"; certifiedProfit: false; coverageVerified: false; knownOrderCount: number; knownCostMinor: number; orders: CostOrder[]; disclaimer: string };
const money = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(minor / 100);
export function OwnerCostEvidenceR410({ from, to }: { from: string; to: string }) {
  const [kind, setKind] = useState("");
  const [report, setReport] = useState<Evidence | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "pending" | "error">("loading");
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async () => {
    setStatus("loading"); setReport(null);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      if (kind) q.set("kind", kind);
      const response = await fetch(`/api/admin/r410-cost-evidence?${q}`, { credentials: "same-origin", cache: "no-store" });
      if (response.status === 503) { setStatus("pending"); return; }
      if (!response.ok) { setStatus("error"); return; }
      const body: Evidence = await response.json();
      if (body.status !== "COST_EVIDENCE_ONLY" || body.certifiedProfit !== false || body.coverageVerified !== false || !Array.isArray(body.orders)) { setStatus("error"); return; }
      setReport(body); setStatus("ready");
    } catch { setStatus("error"); }
  }, [from, to, kind]);
  useEffect(() => { void load(); }, [load, refresh]);
  return <section className="panel-card finance-table-card" aria-label="Sipariş maliyet kanıtları">
    <div className="admin-section-heading"><div><span className="admin-eyebrow">MALİYET KANITI</span><h2>Sipariş maliyet kayıtları</h2><p>Bu rapor kesin kâr değildir. Eksik maliyet, iade, kargo, komisyon ve eğitmen hakedişi henüz bütün olarak doğrulanmadı.</p></div></div>
    <div className="admin-finance-toolbar"><label>Sipariş türü<select value={kind} onChange={e => setKind(e.target.value)}><option value="">Tüm siparişler</option><option value="STUDENT_ORDER">Öğrenci</option><option value="TRAINER_PACKAGE_ORDER">Eğitmen</option></select></label><button type="button" onClick={() => setRefresh(v => v + 1)}>Maliyet kayıtlarını yenile</button></div>
    {status === "loading" && <p role="status">Maliyet kanıtları okunuyor…</p>}
    {status === "pending" && <p role="status">Maliyet tablosu henüz etkin değil. SQL geçişi ve kontrollü kabul tamamlanmadan rapor gösterilmez.</p>}
    {status === "error" && <p role="alert">Maliyet kanıtları doğrulanamadı. Bu durumda kâr hesaplanamaz.</p>}
    {status === "ready" && report && <>
      <div className="admin-kpi-grid"><article><span>Kaydı bulunan sipariş</span><strong>{report.knownOrderCount}</strong></article><article><span>Kayıtlı maliyet toplamı</span><strong>{money(report.knownCostMinor)}</strong><small>Sadece kayıtlı siparişler</small></article><article><span>Kesin kâr durumu</span><strong>Doğrulanmadı</strong><small>Eksik giderler ve kapsam bekliyor</small></article></div>
      <p role="status">{report.disclaimer}</p>
      {report.orders.length ? <div className="finance-table-wrap" tabIndex={0} role="region" aria-label="Sipariş maliyet kayıtları; yatay kaydırılabilir"><table><thead><tr><th>Sipariş türü</th><th>Sipariş referansı</th><th>Kayıt tarihi</th><th>Maliyet kalemi</th><th>Kayıtlı maliyet</th></tr></thead><tbody>{report.orders.map(item => <tr key={`${item.orderKind}:${item.orderId}`}><td>{item.orderKind === "STUDENT_ORDER" ? "Öğrenci" : "Eğitmen"}</td><td>{item.orderId.slice(0, 8).toUpperCase()}</td><td>{item.recordedAt ? new Date(item.recordedAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—"}</td><td>{item.lines}</td><td>{money(Number(item.costMinor))}</td></tr>)}</tbody></table></div> : <p>Bu filtrelerde kayıtlı sipariş maliyeti bulunmuyor. Bu, maliyetlerin sıfır olduğu anlamına gelmez.</p>}
    </>}
  </section>;
}
