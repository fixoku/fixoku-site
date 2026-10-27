import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import "./admin-panel.css";

type Period = "DAILY" | "WEEKLY" | "MONTHLY";
type SortKey = "createdAt" | "totalMinor" | "status";
type Direction = "asc" | "desc";
type ScopeFilter = "ALL" | "STUDENT" | "TRAINER";

type OrderRow = {
  id: string;
  kind: "STUDENT" | "TRAINER";
  createdAt: string;
  status: string;
  currency: string;
  totalMinor: number;
  netMinor: number;
  refundMinor: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  customerName: string;
  customerEmail: string;
  beneficiaryName: string;
  packageTitle: string;
  educationStage: string | null;
  itemCount: number;
};

type Metrics = {
  totalOrders: number;
  netMinor: number;
  pendingCount: number;
  issueCount: number;
};

type Quick = {
  todayOrders: number;
  pendingBankTransfers: number;
  refundCount: number;
  last7ConversionPct: number;
};

type Response = {
  orders: OrderRow[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  metrics: Metrics;
  previous: Metrics;
  quick: Quick;
  range: { from: string; to: string; prevFrom: string; prevTo: string };
};

const REPORT_MIN_DATE = "2026-09-01";
const stageLabels: Record<string, string> = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };
const orderLabels: Record<string, string> = {
  PENDING_PAYMENT: "Ödeme bekliyor",
  PAYMENT_FAILED: "Ödeme başarısız",
  PAID: "Ödendi",
  PARTIALLY_REFUNDED: "Kısmen iade edildi",
  REFUNDED: "İade edildi",
  CANCELLED: "İptal edildi",
  PAYMENT_REVIEW: "Ödeme inceleniyor",
  REJECTED: "Reddedildi",
};
const paymentMethodLabels: Record<string, string> = {
  PAYTR: "Kredi Kartı / PayTR",
  BANK_TRANSFER: "Havale / EFT",
};
const paymentStatusLabels: Record<string, string> = {
  CREATED: "Oluşturuldu",
  PENDING: "Bekliyor",
  AUTHORIZED: "Onaylandı",
  SUCCEEDED: "Başarılı",
  FAILED: "Başarısız",
  CANCELLED: "İptal edildi",
  PARTIALLY_REFUNDED: "Kısmen iade edildi",
  REFUNDED: "İade edildi",
};
const statusTone: Record<string, string> = {
  PAID: "is-ok",
  PENDING_PAYMENT: "is-wait",
  PAYMENT_REVIEW: "is-review",
  PAYMENT_FAILED: "is-fail",
  REFUNDED: "is-fail",
  PARTIALLY_REFUNDED: "is-partial",
  CANCELLED: "is-neutral",
  REJECTED: "is-fail",
};

const money = (minor: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((minor || 0) / 100);

const todayIstanbul = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const isoDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const addDays = (value: string, amount: number) => {
  const date = new Date(`${value}T12:00:00+03:00`);
  date.setDate(date.getDate() + amount);
  return isoDate(date);
};

const daysBetween = (from: string, to: string) => {
  const a = new Date(`${from}T12:00:00+03:00`).getTime();
  const b = new Date(`${to}T12:00:00+03:00`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

const clampDate = (value: string, min: string, max: string) => (value < min ? min : value > max ? max : value);

function periodRange(period: Period, anchor: string, allTime: boolean) {
  const max = todayIstanbul();
  if (allTime) {
    const from = REPORT_MIN_DATE;
    const to = max;
    const length = daysBetween(from, to);
    return { from, to, prevFrom: addDays(from, -length), prevTo: addDays(from, -1) };
  }

  const anchorDate = new Date(`${clampDate(anchor, REPORT_MIN_DATE, max)}T12:00:00+03:00`);
  let from = isoDate(anchorDate);
  let to = from;

  if (period === "WEEKLY") {
    const day = anchorDate.getDay() || 7;
    const monday = new Date(anchorDate);
    monday.setDate(anchorDate.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    from = clampDate(isoDate(monday), REPORT_MIN_DATE, max);
    to = clampDate(isoDate(sunday), REPORT_MIN_DATE, max);
  }

  if (period === "MONTHLY") {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 12);
    const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 12);
    from = clampDate(isoDate(first), REPORT_MIN_DATE, max);
    to = clampDate(isoDate(last), REPORT_MIN_DATE, max);
  }

  const length = daysBetween(from, to);
  return { from, to, prevFrom: addDays(from, -length), prevTo: addDays(from, -1) };
}

const explicitRange = (fromValue: string, toValue: string) => {
  const max = todayIstanbul();
  const from = clampDate(fromValue || REPORT_MIN_DATE, REPORT_MIN_DATE, max);
  const to = clampDate(toValue || max, from, max);
  const length = daysBetween(from, to);
  return { from, to, prevFrom: addDays(from, -length), prevTo: addDays(from, -1) };
};

const rangeLabel = (from: string, to: string, allTime: boolean) => {
  if (allTime) return "Tüm zamanlar";
  const format = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  if (from === to) return format.format(new Date(`${from}T12:00:00+03:00`));
  const fromDate = new Date(`${from}T12:00:00+03:00`);
  const toDate = new Date(`${to}T12:00:00+03:00`);
  if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
    return `${fromDate.getDate()} – ${format.format(toDate)}`;
  }
  return `${format.format(fromDate)} – ${format.format(toDate)}`;
};

const pct = (current: number, previous: number) => {
  if (!previous) return current ? null : 0;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
};

const trendText = (current: number, previous: number) => {
  const value = pct(current, previous);
  if (value === null) return "Yeni";
  if (value === 0) return "%0";
  return `${value > 0 ? "↑" : "↓"} %${Math.abs(value).toLocaleString("tr-TR")}`;
};

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const cleanPackageTitle = (row: OrderRow) => {
  const raw = String(row.packageTitle || "Paket").trim();
  if (row.kind === "TRAINER") return raw;
  const stage = row.educationStage ? stageLabels[row.educationStage] : "";
  if (!stage) return raw;
  const escaped = stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clean = raw.replace(new RegExp(`^${escaped}\\s*[-·:]?\\s*`, "iu"), "");
  return `${stage} - ${clean}`;
};

type OrdersIconName = "calendar" | "cart" | "coins" | "clock" | "alert" | "grid" | "graduation" | "trainer" | "filter" | "receipt" | "download" | "eye" | "bank" | "refund" | "trend";

function OrdersIcon({ name }: { name: OrdersIconName }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "calendar": return <svg {...common}><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/><path d="M8 14h3M8 17h6"/></svg>;
    case "cart": return <svg {...common}><path d="M3 4h2l2 11h10.5l2-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>;
    case "coins": return <svg {...common}><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.5 2"/></svg>;
    case "alert": return <svg {...common}><path d="M12 3.5 3.3 20h17.4L12 3.5Z"/><path d="M12 9v5M12 17.2h.01"/></svg>;
    case "grid": return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>;
    case "graduation": return <svg {...common}><path d="m3 8.5 9-5 9 5-9 5-9-5Z"/><path d="M6.5 11v4.5c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3V11"/><path d="M21 9v5"/></svg>;
    case "trainer": return <svg {...common}><circle cx="12" cy="7.5" r="3.3"/><path d="M5.5 20c.8-4.4 3-6.7 6.5-6.7s5.7 2.3 6.5 6.7"/><path d="M18.5 5.5 20 7l2.5-3"/></svg>;
    case "filter": return <svg {...common}><path d="M4 5h16l-6.2 7v5.3l-3.6 1.8V12L4 5Z"/></svg>;
    case "receipt": return <svg {...common}><path d="M6 3.5h12v17l-2.2-1.5-2 1.5-1.8-1.5-2 1.5L8 19 6 20.5v-17Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
    case "download": return <svg {...common}><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 18v2h14v-2"/></svg>;
    case "eye": return <svg {...common}><path d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
    case "bank": return <svg {...common}><rect x="3.5" y="6.5" width="17" height="12" rx="2"/><path d="M3.5 10h17M7 15h4"/></svg>;
    case "refund": return <svg {...common}><path d="M5 8H2.8V5.8"/><path d="M3.2 8a8.5 8.5 0 1 1-.3 7"/><path d="M9 12h6M12 9l-3 3 3 3"/></svg>;
    case "trend": return <svg {...common}><path d="M4 18h16"/><path d="m5.5 15 4-4 3 2.5 5-6"/><path d="M15.5 7.5h2v2"/></svg>;
  }
}

async function loadOrders(params: URLSearchParams) {
  const response = await fetch(`/api/admin/orders?${params.toString()}`, { credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Siparişler okunamadı.");
  return body as Response;
}

export function AdminOrdersPage() {
  const maxSelectableDate = todayIstanbul();
  const [period, setPeriod] = useState<Period>("MONTHLY");
  const [anchorDate, setAnchorDate] = useState(maxSelectableDate);
  const [allTime, setAllTime] = useState(false);
  const [customRange, setCustomRange] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(REPORT_MIN_DATE);
  const [rangeTo, setRangeTo] = useState(maxSelectableDate);
  const dateMenuRef = useRef<HTMLDetailsElement | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [direction, setDirection] = useState<Direction>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const range = useMemo(() => {
    if (allTime) return periodRange(period, anchorDate, true);
    if (customRange) return explicitRange(rangeFrom, rangeTo);
    return periodRange(period, anchorDate, false);
  }, [period, anchorDate, allTime, customRange, rangeFrom, rangeTo]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      const menu = dateMenuRef.current;
      if (menu?.hasAttribute("open") && event.target instanceof Node && !menu.contains(event.target)) menu.removeAttribute("open");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dateMenuRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      ordersDashboard: "1",
      page: String(page),
      pageSize: "20",
      sort,
      direction,
      scope,
      from: range.from,
      to: range.to,
      prevFrom: range.prevFrom,
      prevTo: range.prevTo,
    });
    if (search.trim()) value.set("search", search.trim());
    if (status) value.set("status", status);
    if (paymentMethod) value.set("paymentMethod", paymentMethod);
    return value;
  }, [page, sort, direction, scope, range, search, status, paymentMethod]);

  const query = useQuery({
    queryKey: ["admin-orders-v6", params.toString()],
    queryFn: () => loadOrders(params),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const orders = data?.orders || [];
  const metrics = data?.metrics || { totalOrders: 0, netMinor: 0, pendingCount: 0, issueCount: 0 };
  const previous = data?.previous || { totalOrders: 0, netMinor: 0, pendingCount: 0, issueCount: 0 };
  const quick = data?.quick || { todayOrders: 0, pendingBankTransfers: 0, refundCount: 0, last7ConversionPct: 0 };

  const resetPage = () => setPage(1);
  const setPeriodFixed = (value: Period) => { setPeriod(value); setAllTime(false); setCustomRange(false); resetPage(); };
  const setScopeFixed = (value: ScopeFilter) => { setScope(value); resetPage(); };

  const sortBy = (key: SortKey) => {
    if (sort === key) setDirection((value) => value === "desc" ? "asc" : "desc");
    else { setSort(key); setDirection("desc"); }
    resetPage();
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setScope("ALL");
    setPaymentMethod("");
    setAllTime(false);
    setCustomRange(false);
    setRangeFrom(REPORT_MIN_DATE);
    setRangeTo(maxSelectableDate);
    setPeriod("MONTHLY");
    setAnchorDate(maxSelectableDate);
    setSort("createdAt");
    setDirection("desc");
    setExpanded(null);
    setPage(1);
  };

  const exportCsv = () => {
    const headers = ["Sipariş No", "Tarih", "Müşteri", "E-posta", "Kapsam", "Paket", "Ödeme", "Tutar", "Durum"];
    const rows = orders.map((row) => [
      `#${row.id.slice(0, 8)}`,
      shortDate(row.createdAt),
      row.customerName,
      row.customerEmail,
      row.kind === "TRAINER" ? "Öğretmen" : "Öğrenci",
      cleanPackageTitle(row),
      paymentMethodLabels[row.paymentMethod || ""] || row.paymentMethod || "—",
      money(row.totalMinor, row.currency),
      orderLabels[row.status] || row.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fixoku-siparisler-${range.from}-${range.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const selectedRangeLabel = rangeLabel(range.from, range.to, allTime);

  return (
    <main className="platform-foundation-panel admin-panel admin-orders-v6">
      <section className="orders-v6-hero">
        <div>
          <span className="orders-v6-eyebrow">YÖNETİCİ PANELİ</span>
          <h1>Siparişler</h1>
          <p>Siparişleri, ödeme akışlarını ve durumlarını detaylı izleyin.</p>
        </div>

        <div className="orders-v6-periodbar">
          <details ref={dateMenuRef} className="orders-v6-date-menu orders-v62-date-menu">
            <summary className="orders-v6-date">
              <span className="orders-v61-inline-icon"><OrdersIcon name="calendar" /></span>
              <strong>{selectedRangeLabel}</strong>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="orders-v6-date-popover orders-v62-date-popover">
              <div className="orders-v62-date-title">Tarih aralığı seç</div>
              <div className="orders-v62-date-grid">
                <label>
                  Başlangıç
                  <input
                    type="date"
                    min={REPORT_MIN_DATE}
                    max={rangeTo || maxSelectableDate}
                    value={customRange ? rangeFrom : range.from}
                    onChange={(event) => {
                      const next = clampDate(event.target.value || REPORT_MIN_DATE, REPORT_MIN_DATE, maxSelectableDate);
                      setRangeFrom(next);
                      if (rangeTo < next) setRangeTo(next);
                      setCustomRange(true);
                      setAllTime(false);
                      resetPage();
                    }}
                  />
                </label>
                <label>
                  Bitiş
                  <input
                    type="date"
                    min={customRange ? rangeFrom : range.from}
                    max={maxSelectableDate}
                    value={customRange ? rangeTo : range.to}
                    onChange={(event) => {
                      const next = clampDate(event.target.value || maxSelectableDate, REPORT_MIN_DATE, maxSelectableDate);
                      setRangeTo(next);
                      if (rangeFrom > next) setRangeFrom(next);
                      setAnchorDate(next);
                      setCustomRange(true);
                      setAllTime(false);
                      resetPage();
                      dateMenuRef.current?.removeAttribute("open");
                    }}
                  />
                </label>
              </div>
              <small>En erken tarih 1 Eylül 2026, en geç bugün.</small>
              <div className="orders-v62-date-divider" />
              <button type="button" className={`orders-v62-alltime ${allTime ? "is-active" : ""}`} onClick={() => { setAllTime(true); setCustomRange(false); resetPage(); dateMenuRef.current?.removeAttribute("open"); }}>
                Tüm zamanlar
              </button>
            </div>
          </details>

          <div className="orders-v6-segment" aria-label="Dönem seçimi">
            {(["DAILY", "WEEKLY", "MONTHLY"] as Period[]).map((item) => (
              <button key={item} type="button" className={!allTime && period === item ? "is-active" : ""} onClick={() => setPeriodFixed(item)}>
                {item === "DAILY" ? "Günlük" : item === "WEEKLY" ? "Haftalık" : "Aylık"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {query.isError && <div className="orders-v6-error" role="alert">{String((query.error as Error)?.message || "Siparişler yüklenemedi.")}</div>}

      <section className="orders-v6-kpis" aria-label="Sipariş özeti">
        <article className="orders-v6-kpi is-orange">
          <span className="orders-v6-kpi-icon"><OrdersIcon name="cart" /></span>
          <div>
            <strong>Toplam sipariş</strong>
            <b>{metrics.totalOrders.toLocaleString("tr-TR")}</b>
            <em>{trendText(metrics.totalOrders, previous.totalOrders)}</em>
            <small>Önceki dönem: {previous.totalOrders.toLocaleString("tr-TR")}</small>
          </div>
          <i className="orders-v6-spark" aria-hidden="true"><u/><u/><u/><u/><u/></i>
        </article>

        <article className="orders-v6-kpi is-blue">
          <span className="orders-v6-kpi-icon"><OrdersIcon name="coins" /></span>
          <div>
            <strong>Toplam ciro</strong>
            <b>{money(metrics.netMinor)}</b>
            <em>{trendText(metrics.netMinor, previous.netMinor)}</em>
            <small>Önceki dönem: {money(previous.netMinor)}</small>
          </div>
          <i className="orders-v6-spark" aria-hidden="true"><u/><u/><u/><u/><u/></i>
        </article>

        <article className="orders-v6-kpi is-amber">
          <span className="orders-v6-kpi-icon"><OrdersIcon name="clock" /></span>
          <div>
            <strong>Ödeme bekleyen</strong>
            <b>{metrics.pendingCount.toLocaleString("tr-TR")}</b>
            <em>{trendText(metrics.pendingCount, previous.pendingCount)}</em>
            <small>Önceki dönem: {previous.pendingCount.toLocaleString("tr-TR")}</small>
          </div>
          <i className="orders-v6-spark" aria-hidden="true"><u/><u/><u/><u/><u/></i>
        </article>

        <article className="orders-v6-kpi is-red">
          <span className="orders-v6-kpi-icon"><OrdersIcon name="alert" /></span>
          <div>
            <strong>Sorunlu / iade</strong>
            <b>{metrics.issueCount.toLocaleString("tr-TR")}</b>
            <em>{trendText(metrics.issueCount, previous.issueCount)}</em>
            <small>Önceki dönem: {previous.issueCount.toLocaleString("tr-TR")}</small>
          </div>
          <i className="orders-v6-spark" aria-hidden="true"><u/><u/><u/><u/><u/></i>
        </article>
      </section>

      <section className="orders-v62-quickstrip" aria-label="Hızlı bakış">
        <header>
          <span><OrdersIcon name="eye" /></span>
          <div><h2>Hızlı bakış</h2><p>Sipariş akışındaki önemli durumlar</p></div>
        </header>
        <div className="orders-v62-quickgrid">
          <article className="is-green"><i><OrdersIcon name="cart" /></i><div><strong>Bugün gelen siparişler</strong><b>{quick.todayOrders}</b></div></article>
          <article className="is-blue"><i><OrdersIcon name="bank" /></i><div><strong>Bekleyen havale / EFT</strong><b>{quick.pendingBankTransfers}</b></div></article>
          <article className="is-red"><i><OrdersIcon name="refund" /></i><div><strong>İade işlemleri</strong><b>{quick.refundCount}</b></div></article>
          <article className="is-purple"><i><OrdersIcon name="trend" /></i><div><strong>Son 7 gün dönüşüm</strong><b>%{quick.last7ConversionPct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</b></div></article>
        </div>
      </section>

      <section className="orders-v6-content">
        <div className="orders-v6-left">
          <section className="orders-v6-filtercard">
            <div className="orders-v6-filter-top">
              <label className="orders-v6-search">
                <span>Arama</span>
                <input
                  type="search"
                  maxLength={100}
                  value={search}
                  placeholder="Sipariş, müşteri, e-posta veya paket adı ile ara..."
                  onChange={(event) => { setSearch(event.target.value); resetPage(); }}
                />
              </label>

              <div className="orders-v6-scope-tabs" aria-label="Sipariş kapsamı">
                <button type="button" className={scope === "ALL" ? "is-active" : ""} onClick={() => setScopeFixed("ALL")}><span className="orders-v61-scope-icon"><OrdersIcon name="grid" /></span><span>Tümü</span></button>
                <button type="button" className={scope === "STUDENT" ? "is-active" : ""} onClick={() => setScopeFixed("STUDENT")}><span className="orders-v61-scope-icon"><OrdersIcon name="graduation" /></span><span>Öğrenci paketleri</span></button>
                <button type="button" className={scope === "TRAINER" ? "is-active" : ""} onClick={() => setScopeFixed("TRAINER")}><span className="orders-v61-scope-icon"><OrdersIcon name="trainer" /></span><span>Öğretmen paketleri</span></button>
              </div>
            </div>

            <div className="orders-v6-filter-grid">
              <label>
                <span>Sipariş durumu</span>
                <select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }}>
                  <option value="">Tüm durumlar</option>
                  {Object.entries(orderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>Kapsam</span>
                <select value={scope} onChange={(event) => setScopeFixed(event.target.value as ScopeFilter)}>
                  <option value="ALL">Tüm kapsamlar</option>
                  <option value="STUDENT">Öğrenci</option>
                  <option value="TRAINER">Öğretmen</option>
                </select>
              </label>
              <label>
                <span>Ödeme yöntemi</span>
                <select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); resetPage(); }}>
                  <option value="">Tüm ödeme yöntemleri</option>
                  <option value="PAYTR">Kredi Kartı / PayTR</option>
                  <option value="BANK_TRANSFER">Havale / EFT</option>
                </select>
              </label>
              <label>
                <span>Tarih aralığı</span>
                <select
                  value={allTime ? "ALL" : customRange ? "CUSTOM" : period}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "ALL") { setAllTime(true); setCustomRange(false); resetPage(); return; }
                    if (value === "CUSTOM") { setAllTime(false); setCustomRange(true); dateMenuRef.current?.setAttribute("open", ""); resetPage(); return; }
                    setPeriodFixed(value as Period);
                  }}
                >
                  <option value="DAILY">Seçili gün</option>
                  <option value="WEEKLY">Seçili hafta</option>
                  <option value="MONTHLY">Seçili ay</option>
                  <option value="CUSTOM">Özel tarih aralığı</option>
                  <option value="ALL">Tüm zamanlar</option>
                </select>
              </label>
              <button type="button" className="orders-v6-clear" onClick={clearFilters}><OrdersIcon name="filter" /> <span>Filtreleri temizle</span></button>
            </div>
          </section>

          <section className={`orders-v6-tablecard ${query.isFetching ? "is-fetching" : ""}`}>
            <header className="orders-v6-tablehead">
              <div>
                <span className="orders-v6-section-icon"><OrdersIcon name="receipt" /></span>
                <div>
                  <h2>Sipariş listesi</h2>
                  <p>Tüm siparişleri, ödeme durumlarını ve müşteri bilgilerini görüntüleyin.</p>
                </div>
              </div>
              <button type="button" className="orders-v6-export" onClick={exportCsv} disabled={!orders.length}><OrdersIcon name="download" /><span>Dışa aktar</span></button>
            </header>

            <div className="orders-v6-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sipariş No</th>
                    <th><button type="button" onClick={() => sortBy("createdAt")}>Tarih {sort === "createdAt" ? (direction === "desc" ? "↓" : "↑") : ""}</button></th>
                    <th>Müşteri / Kullanıcı</th>
                    <th>Kapsam</th>
                    <th>Paket</th>
                    <th>Ödeme</th>
                    <th><button type="button" onClick={() => sortBy("totalMinor")}>Tutar {sort === "totalMinor" ? (direction === "desc" ? "↓" : "↑") : ""}</button></th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => {
                    const open = expanded === row.id;
                    const label = orderLabels[row.status] || row.status;
                    return [
                      <tr key={row.id} className={row.status === "PENDING_PAYMENT" ? "is-highlight" : ""}>
                        <td><strong>#{row.id.slice(0, 8)}</strong><small>{row.itemCount} kalem</small></td>
                        <td>{shortDate(row.createdAt)}</td>
                        <td><strong>{row.customerName}</strong><small>{row.customerEmail}</small></td>
                        <td><span className={`orders-v6-scope is-${row.kind.toLowerCase()}`}>{row.kind === "TRAINER" ? "Öğretmen" : "Öğrenci"}</span></td>
                        <td>{cleanPackageTitle(row)}</td>
                        <td>{paymentMethodLabels[row.paymentMethod || ""] || row.paymentMethod || "—"}</td>
                        <td>{money(row.totalMinor, row.currency)}</td>
                        <td><span className={`orders-v6-status ${statusTone[row.status] || "is-neutral"}`}>● {label}</span></td>
                        <td><button type="button" className="orders-v6-detail" onClick={() => setExpanded(open ? null : row.id)}>{open ? "Kapat" : row.status === "PENDING_PAYMENT" || row.status === "PAYMENT_REVIEW" || row.status === "PAYMENT_FAILED" ? "İncele" : "Detay"}</button></td>
                      </tr>,
                      open ? (
                        <tr key={`${row.id}-detail`} className="orders-v6-detail-row">
                          <td colSpan={9}>
                            <div className="orders-v6-inline-detail">
                              <span><b>Yararlanıcı:</b> {row.beneficiaryName || "—"}</span>
                              <span><b>Ödeme durumu:</b> {paymentStatusLabels[row.paymentStatus || ""] || label}</span>
                              <span><b>Net tutar:</b> {money(row.netMinor, row.currency)}</span>
                              <span><b>İade:</b> {money(row.refundMinor, row.currency)}</span>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                    ];
                  })}
                  {!orders.length && !query.isLoading && (
                    <tr><td colSpan={9}><div className="orders-v6-empty">Bu filtrelere uygun sipariş bulunamadı.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="orders-v6-pagination">
              <span>Toplam {data?.pagination.total || 0} sipariş</span>
              <div>
                <button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
                <span>Önceki</span>
                <b>{page}</b>
                <span>Sonraki</span>
                <button type="button" disabled={page >= (data?.pagination.pageCount || 1) || query.isFetching} onClick={() => setPage((value) => value + 1)}>›</button>
              </div>
            </footer>

            {query.isFetching && <div className="orders-v6-loading">Veriler güncelleniyor…</div>}
          </section>



        </div>

      </section>

      <div className="orders-v6-blank-frame" aria-hidden="true" />
    </main>
  );
}
