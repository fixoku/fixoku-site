import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./admin-panel.css";

type FilterState = { from: string; to: string; packageId: string; trainerId: string; currency: string };
const EMPTY_FILTERS: FilterState = { from: "", to: "", packageId: "", trainerId: "", currency: "" };
const money = (minor: number | null | undefined, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((minor ?? 0) / 100);
const entryLabels: Record<string, string> = { ADJUSTMENT: "Düzeltme", SALE: "Satış", REFUND: "İade", PAYOUT: "Eğitmen ödemesi", SHIPPING: "Kargo", PRODUCT_COST: "Ürün maliyeti" };
const readFilters = (params: URLSearchParams): FilterState => ({ from: params.get("from") || "", to: params.get("to") || "", packageId: params.get("packageId") || "", trainerId: params.get("trainerId") || "", currency: (params.get("currency") || "").toUpperCase() });

export function OwnerFinancePage() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => readFilters(params));
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [adjustment, setAdjustment] = useState({ entryType: "ADJUSTMENT", sourceType: "MANUAL", amountMinor: "", sourceId: "", note: "", currency: "TRY" });

  const query = useMemo(() => {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && q.set(key, value));
    return q.toString();
  }, [filters]);

  useEffect(() => {
    const next = readFilters(params);
    setFilters((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
  }, [params]);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/owner/finance${query ? `?${query}` : ""}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError("Finans verileri okunamadı. Bu alan yalnızca Owner yetkisiyle kullanılabilir.");
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  const setFilter = (key: keyof FilterState, value: string) => {
    const next = { ...filters, [key]: key === "currency" ? value.toUpperCase() : value };
    setFilters(next);
    const q = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && q.set(k, v));
    setParams(q, { replace: true });
  };

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setParams({}, { replace: true }); };
  const exportCsv = () => { const q = new URLSearchParams(query); q.set("format", "csv"); window.location.assign(`/api/owner/finance?${q.toString()}`); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/owner/finance", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...adjustment, amountMinor: Number(adjustment.amountMinor) }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Finans düzeltmesi kaydedildi." : body.error || "Düzeltme kaydedilemedi.");
    if (response.ok) {
      setAdjustment({ ...adjustment, amountMinor: "", sourceId: "", note: "" });
      await load();
    }
  };

  const metrics = data?.metrics || {};
  const costRows = [
    ["Eğitmen yükümlülüğü", Number(metrics.trainerEarnedLiabilityMinor || 0)],
    ["Fiziksel ürün", Number(metrics.physicalProductCostMinor || 0)],
    ["Kargo", Number(metrics.shippingCostMinor || 0)],
  ] as const;
  const maxCost = Math.max(1, ...costRows.map(([, value]) => value));
  const contributionMinor = Number(metrics.netSalesMinor || 0) - costRows.reduce((sum, [, value]) => sum + value, 0);

  return <main className="platform-foundation-panel admin-panel owner-finance-pro">
    <header className="admin-pro-header">
      <div>
        <span className="admin-eyebrow">FİNANS</span>
        <h1>Finans Özeti</h1>
        <p>Satışları, maliyetleri, eğitmen yükümlülüğünü ve paket katkısını tek ekrandan izleyin.</p>
      </div>
      <div className="admin-pro-header-actions">
        <button type="button" className="admin-secondary-button" onClick={exportCsv} disabled={!data}>CSV indir</button>
        <button type="button" onClick={() => void load()}>Yenile</button>
      </div>
    </header>

    <section className="panel-card finance-filters finance-filter-pro" aria-label="Finans filtreleri">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">KAPSAM</span><h2>Finans filtresi</h2></div><button type="button" className="admin-text-button" onClick={clearFilters}>Filtreleri temizle</button></div>
      <div className="admin-finance-toolbar">
        <label>Başlangıç<input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} /></label>
        <label>Bitiş<input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} /></label>
        <label>Paket<select value={filters.packageId} onChange={(e) => setFilter("packageId", e.target.value)}><option value="">Tüm paketler</option>{(data?.packages || []).map((item: any) => <option key={item.packageId} value={item.packageId}>{item.title}</option>)}</select></label>
        <label>Eğitmen<select value={filters.trainerId} onChange={(e) => setFilter("trainerId", e.target.value)}><option value="">Tüm eğitmenler</option>{(data?.trainers || []).map((item: any) => <option key={item.trainerId} value={item.trainerId}>{item.name}</option>)}</select></label>
        <label>Para birimi<input value={filters.currency} onChange={(e) => setFilter("currency", e.target.value.slice(0, 3))} placeholder="TRY" maxLength={3} /></label>
      </div>
    </section>

    {error && <div className="admin-callout is-danger" role="alert">{error}</div>}
    {!data && !error && <div className="admin-loading-card" role="status">Finans verileri yükleniyor…</div>}
    {message && <div className="admin-callout" role="status">{message}</div>}

    {data && <>
      <section className="admin-kpi-grid admin-kpi-grid-five">
        <article><span>Brüt satış</span><strong>{money(metrics.grossSalesMinor)}</strong><small>Tahsilat öncesi toplam satış</small></article>
        <article><span>Net satış</span><strong>{money(metrics.netSalesMinor)}</strong><small>İade ve düzeltmeler sonrası</small></article>
        <article><span>Eğitmen yükümlülüğü</span><strong>{money(metrics.trainerEarnedLiabilityMinor)}</strong><small>Kazanılmış eğitmen hakedişi</small></article>
        <article><span>Ürün + kargo</span><strong>{money(Number(metrics.physicalProductCostMinor || 0) + Number(metrics.shippingCostMinor || 0))}</strong><small>Fiziksel operasyon maliyeti</small></article>
        <article className={contributionMinor >= 0 ? "is-positive" : "is-negative"}><span>Operasyon katkısı</span><strong>{money(contributionMinor)}</strong><small>Net satış eksi görünen maliyetler</small></article>
      </section>

      <section className="admin-dashboard-grid owner-finance-visuals">
        <article className="panel-card">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">MALİYET</span><h2>Maliyet dağılımı</h2></div></div>
          <div className="admin-bar-list">
            {costRows.map(([label, value]) => <div className="admin-bar-row" key={label}><div><span>{label}</span><strong>{money(value)}</strong></div><div className="admin-bar-track"><span style={{ width: `${Math.max(4, Math.round((value / maxCost) * 100))}%` }} /></div></div>)}
          </div>
        </article>
        <article className="panel-card">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">YÖNETİM</span><h2>Finans okuma rehberi</h2></div></div>
          <div className="finance-reading-list">
            <p><strong>Net satış</strong><span>Seçilen dönem ve filtre kapsamındaki satış sonucudur.</span></p>
            <p><strong>Eğitmen yükümlülüğü</strong><span>Henüz ödenmemiş olsa bile kazanılmış eğitmen maliyetini gösterir.</span></p>
            <p><strong>Katkı</strong><span>Operasyon görünümüdür; resmî muhasebe kârı veya vergi hesabı değildir.</span></p>
          </div>
        </article>
      </section>

      <section className="panel-card finance-table-card">
        <div className="admin-section-heading"><div><span className="admin-eyebrow">KÂRLILIK</span><h2>Paket bazında katkı</h2></div><span className="admin-section-meta">{data.packageProfitability?.length || 0} satır</span></div>
        {data.packageProfitability?.length ? <div className="finance-table-wrap" tabIndex={0} role="region" aria-label="Paket kârlılığı tablosu; yatay kaydırılabilir"><table><thead><tr><th>Paket</th><th>Satış</th><th>Brüt gelir</th><th>İade</th><th>Eğitmen</th><th>Ürün</th><th>Kargo</th><th>Düzeltme</th><th>Katkı</th><th>Katkı %</th></tr></thead><tbody>{data.packageProfitability.map((row: any) => <tr key={`${row.packageId}-${row.currency}`}><td><strong>{row.packageTitle}</strong></td><td>{row.salesCount}</td><td>{money(row.grossRevenueMinor,row.currency)}</td><td>{money(row.refundsMinor,row.currency)}</td><td>{money(row.trainerCostMinor,row.currency)}</td><td>{money(row.physicalProductCostMinor,row.currency)}</td><td>{money(row.shippingCostMinor,row.currency)}</td><td>{money(row.adjustmentCostMinor,row.currency)}</td><td><strong>{money(row.contributionMinor,row.currency)}</strong></td><td>{row.contributionPercent}%</td></tr>)}</tbody></table></div> : <div className="admin-empty-state"><strong>Seçili kapsamda paket satışı yok.</strong><span>Filtreleri değiştirerek farklı bir dönem veya paket görüntüleyebilirsiniz.</span></div>}
      </section>

      <section className="admin-dashboard-grid">
        <article className="panel-card finance-table-card">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">DEFTER</span><h2>Son finans hareketleri</h2></div></div>
          {data.ledger?.length ? <div className="finance-ledger-list">{data.ledger.slice(0, 12).map((item: any, index: number) => <div className="finance-ledger-row" key={`${item.entryType}-${item.sourceId}-${item.currency}-${index}`}><div><strong>{entryLabels[item.entryType] || "Diğer işlem"}</strong><small>{item.occurredAt ? new Date(item.occurredAt).toLocaleDateString("tr-TR") : "—"} · {item.sourceId || "Referans yok"}</small></div><strong>{money(item.amountMinor,item.currency)}</strong></div>)}</div> : <div className="admin-empty-state"><span>Henüz finans hareketi yok.</span></div>}
        </article>
        <article className="panel-card finance-table-card">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">ÖDEME</span><h2>Eğitmen ödeme kayıtları</h2></div></div>
          {data.payouts?.length ? <div className="finance-ledger-list">{data.payouts.map((item: any) => <div className="finance-ledger-row" key={`${item.trainerUserId}-${item.currency}`}><div><strong>{item.trainerName || "Eğitmen"}</strong><small>Ödenmiş tutar</small></div><strong>{money(item.paidMinor,item.currency)}</strong></div>)}</div> : <div className="admin-empty-state"><span>Henüz eğitmen ödeme kaydı yok.</span></div>}
        </article>
      </section>

      <details className="panel-card finance-adjustment-details">
        <summary>Gelişmiş finans işlemleri</summary>
        <p className="finance-adjustment-help">İade, istisnai ödeme veya muhasebe kaynaklı düzeltmeler için kullanın. Normal satış akışını burada tekrar kaydetmeyin.</p>
        <form className="admin-package-form finance-adjustment-form" onSubmit={(event) => void submit(event)}>
          <label>Giriş türü<select value={adjustment.entryType} onChange={(e) => setAdjustment({ ...adjustment, entryType: e.target.value })}><option value="ADJUSTMENT">Düzeltme</option><option value="SALE">Satış</option><option value="REFUND">İade</option></select></label>
          <label>Kaynak türü<select required value={adjustment.sourceType} onChange={(e) => setAdjustment({ ...adjustment, sourceType: e.target.value })}><option value="MANUAL">Manuel düzeltme</option><option value="REFUND">İade</option><option value="ACCOUNTING">Muhasebe düzeltmesi</option></select></label>
          <label>Tutar (TL)<input required type="number" min="0" step="0.01" inputMode="decimal" value={adjustment.amountMinor ? (Number(adjustment.amountMinor)/100).toFixed(2) : ""} onChange={(e) => setAdjustment({ ...adjustment, amountMinor: String(Math.round(Number(e.target.value || 0) * 100)) })} /></label>
          <label>Para birimi<input required maxLength={3} value={adjustment.currency} onChange={(e) => setAdjustment({ ...adjustment, currency: e.target.value.toUpperCase() })} /></label>
          <label>Kaynak / Referans<input value={adjustment.sourceId} onChange={(e) => setAdjustment({ ...adjustment, sourceId: e.target.value })} /></label>
          <label>Not<textarea required value={adjustment.note} onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })} /></label>
          <button type="submit">Düzeltmeyi kaydet</button>
        </form>
      </details>
    </>}
  </main>;
}
