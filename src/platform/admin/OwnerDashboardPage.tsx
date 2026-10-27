import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PanelIcon } from "../panel/components/PanelIcon";
import "./admin-panel.css";

type Period = "DAILY" | "WEEKLY" | "MONTHLY";

type OverviewSeriesRow = {
  key: string;
  label: string;
  studentMinor: number;
  trainerMinor: number;
  totalMinor: number;
};

type OverviewPackage = {
  key: string;
  audience: "STUDENT" | "TRAINER";
  title: string;
  units: number;
  netMinor: number;
};

type OverviewOrder = {
  id: string;
  createdAt: string;
  status: string;
  paymentMethod: string | null;
  totalMinor: number;
  currency: string;
  customerName: string;
  beneficiaryName: string;
  packageTitle: string;
  educationStage?: string | null;
  kind: "STUDENT" | "TRAINER";
};

type OverviewData = {
  period: Period;
  range: { from: string; to: string; prevFrom: string; prevTo: string };
  current: {
    studentNetMinor: number;
    studentUnits: number;
    trainerNetMinor: number;
    trainerUnits: number;
    totalNetMinor: number;
    totalUnits: number;
    averageMinor: number;
  };
  previous: {
    studentNetMinor: number;
    studentUnits: number;
    trainerNetMinor: number;
    trainerUnits: number;
    totalNetMinor: number;
    totalUnits: number;
    averageMinor: number;
  };
  change: {
    totalRevenuePct: number | null;
    totalUnitsPct: number | null;
    studentRevenuePct: number | null;
    studentUnitsPct: number | null;
    trainerRevenuePct: number | null;
    trainerUnitsPct: number | null;
    averagePct: number | null;
  };
  activeStudents: number;
  activeTrainers: number;
  pending: {
    payments: number;
    assignments: number;
    unpaidEarningsMinor: number;
    unfinishedTrainings: number;
  };
  series: OverviewSeriesRow[];
  topPackages: OverviewPackage[];
  recentOrders: OverviewOrder[];
};

const emptyData: OverviewData = {
  period: "MONTHLY",
  range: { from: "", to: "", prevFrom: "", prevTo: "" },
  current: { studentNetMinor: 0, studentUnits: 0, trainerNetMinor: 0, trainerUnits: 0, totalNetMinor: 0, totalUnits: 0, averageMinor: 0 },
  previous: { studentNetMinor: 0, studentUnits: 0, trainerNetMinor: 0, trainerUnits: 0, totalNetMinor: 0, totalUnits: 0, averageMinor: 0 },
  change: { totalRevenuePct: 0, totalUnitsPct: 0, studentRevenuePct: 0, studentUnitsPct: 0, trainerRevenuePct: 0, trainerUnitsPct: 0, averagePct: 0 },
  activeStudents: 0,
  activeTrainers: 0,
  pending: { payments: 0, assignments: 0, unpaidEarningsMinor: 0, unfinishedTrainings: 0 },
  series: [],
  topPackages: [],
  recentOrders: [],
};

const money = (minor: number | null | undefined, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((minor ?? 0) / 100);

const shortMoney = (minor: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.round(minor / 100));

const isoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, delta: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + delta);
  return copy;
};

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
};

const REPORT_MIN_DATE = "2026-09-01";

const clampReportDate = (value: string) => {
  const today = isoDate(new Date());
  if (!value || value < REPORT_MIN_DATE) return REPORT_MIN_DATE;
  return value > today ? today : value;
};

function rangeFor(period: Period, anchorIso: string, allTime = false) {
  const anchor = new Date(`${clampReportDate(anchorIso)}T12:00:00`);
  const reportMin = new Date(`${REPORT_MIN_DATE}T12:00:00`);
  let from: Date;

  if (allTime) {
    from = new Date(reportMin);
  } else if (period === "DAILY") {
    from = new Date(anchor);
  } else if (period === "WEEKLY") {
    from = startOfWeek(anchor);
    if (from < reportMin) from = new Date(reportMin);
  } else {
    from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    if (from < reportMin) from = new Date(reportMin);
  }

  const length = Math.max(1, Math.floor((anchor.getTime() - from.getTime()) / 86400000) + 1);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(length - 1));

  return { from: isoDate(from), to: isoDate(anchor), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo) };
}

function customRangeFor(fromIso: string, toIso: string) {
  const from = new Date(`${clampReportDate(fromIso)}T12:00:00`);
  const to = new Date(`${clampReportDate(toIso)}T12:00:00`);
  const safeFrom = from <= to ? from : to;
  const safeTo = to >= from ? to : from;
  const length = Math.max(1, Math.floor((safeTo.getTime() - safeFrom.getTime()) / 86400000) + 1);
  const prevTo = addDays(safeFrom, -1);
  const prevFrom = addDays(prevTo, -(length - 1));
  return { from: isoDate(safeFrom), to: isoDate(safeTo), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo) };
}

const dateRangeLabel = (from: string, to: string) => {
  if (!from || !to) return "Dönem";
  const f = new Date(`${from}T12:00:00`);
  const t = new Date(`${to}T12:00:00`);
  const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
  if (sameMonth) {
    return `${f.getDate()} – ${t.getDate()} ${new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(t)}`;
  }
  return `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(f)} – ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(t)}`;
};

const stageLabels: Record<string, string> = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };

const cleanPackageTitle = (title: string, stage?: string | null) => {
  const patterns: Record<string, RegExp> = {
    PRIMARY: /^(İLKOKUL|İLK OKUL)\s*[-·:]?\s*/iu,
    MIDDLE: /^(ORTAOKUL|ORTA OKUL)\s*[-·:]?\s*/iu,
    HIGH: /^(LİSEL|LİSE)\s*[-·:]?\s*/iu,
    ADULT: /^(YETİŞKİN)\s*[-·:]?\s*/iu,
  };
  let result = title || "Paket";
  if (stage && patterns[stage]) result = result.replace(patterns[stage], "");
  return result
    .toLocaleLowerCase("tr-TR")
    .split(/\s+/u)
    .map((part) => part ? `${part.slice(0, 1).toLocaleUpperCase("tr-TR")}${part.slice(1)}` : "")
    .join(" ");
};

const displayOrderPackage = (order: OverviewOrder) => {
  if (order.kind === "TRAINER") return `Eğitmen - ${cleanPackageTitle(order.packageTitle)}`;
  const stage = order.educationStage ? stageLabels[order.educationStage] : "";
  const title = cleanPackageTitle(order.packageTitle, order.educationStage);
  return stage ? `${stage} - ${title}` : title;
};

const paymentLabel = (method: string | null) => method === "BANK_TRANSFER" ? "Havale / EFT" : method === "PAYTR" ? "PayTR" : "—";

const statusLabel: Record<string, string> = {
  PAID: "Tamamlandı",
  PENDING_PAYMENT: "Ödeme bekliyor",
  PAYMENT_REVIEW: "İnceleniyor",
  PAYMENT_FAILED: "Ödeme başarısız",
  PARTIALLY_REFUNDED: "Kısmen iade",
  REFUNDED: "İade edildi",
  CANCELLED: "İptal",
  REJECTED: "Reddedildi",
};

const statusTone = (status: string) => status === "PAID" ? "ok" : ["PENDING_PAYMENT", "PAYMENT_REVIEW"].includes(status) ? "wait" : "bad";

const trendText = (value: number | null) => {
  if (value === null) return "Yeni";
  if (value === 0) return "%0";
  const arrow = value > 0 ? "↑" : "↓";
  return `${arrow} %${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(Math.abs(value))}`;
};

const trendClass = (value: number | null) => value !== null && value < 0 ? "is-down" : "is-up";

function chartCoordinates(rows: OverviewSeriesRow[], field: "totalMinor" | "studentMinor" | "trainerMinor", width = 720, height = 115) {
  if (!rows.length) return [] as Array<{ x: number; y: number }>;
  const max = Math.max(1, ...rows.map((row) => row.totalMinor));
  return rows.map((row, index) => ({
    x: rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width,
    y: height - (row[field] / max) * (height - 10),
  }));
}

const svgPoints = (points: Array<{ x: number; y: number }>) => points.map((point) => `${(point.x + 48).toFixed(2)},${(point.y + 10).toFixed(2)}`).join(" ");
const svgAreaPoints = (points: Array<{ x: number; y: number }>) => points.length ? `${(points[0].x + 48).toFixed(2)},125 ${svgPoints(points)} ${(points[points.length - 1].x + 48).toFixed(2)},125` : "";

const chartLabels = (rows: OverviewSeriesRow[]) => {
  if (rows.length <= 7) return rows.map((row, index) => ({ ...row, index }));
  const picks = [0, Math.round((rows.length - 1) * .17), Math.round((rows.length - 1) * .34), Math.round((rows.length - 1) * .5), Math.round((rows.length - 1) * .67), Math.round((rows.length - 1) * .84), rows.length - 1];
  return [...new Set(picks)].map((index) => ({ ...rows[index], index }));
};

export function OwnerDashboardPage() {
  const [period, setPeriod] = useState<Period>("MONTHLY");
  const [anchorDate, setAnchorDate] = useState(() => clampReportDate(isoDate(new Date())));
  const [allTime, setAllTime] = useState(true);
  const [customRange, setCustomRange] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(REPORT_MIN_DATE);
  const [rangeTo, setRangeTo] = useState(() => clampReportDate(isoDate(new Date())));
  const dateMenuRef = useRef<HTMLDetailsElement | null>(null);
  const [data, setData] = useState<OverviewData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const range = customRange ? customRangeFor(rangeFrom, rangeTo) : rangeFor(period, anchorDate, allTime);
    const query = new URLSearchParams({ overview: "1", period, ...range });
    setLoading(true);
    setError("");
    fetch(`/api/admin/orders?${query.toString()}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Genel bakış verileri alınamadı.");
        return body as OverviewData;
      })
      .then((body) => { if (alive) setData(body); })
      .catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : "Genel bakış verileri alınamadı."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period, anchorDate, allTime, customRange, rangeFrom, rangeTo]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const menu = dateMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.removeAttribute("open");
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dateMenuRef.current?.removeAttribute("open"); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const series = data.series || [];
  const coordsTotal = chartCoordinates(series, "totalMinor");
  const coordsStudent = chartCoordinates(series, "studentMinor");
  const coordsTrainer = chartCoordinates(series, "trainerMinor");
  const pointsTotal = svgPoints(coordsTotal);
  const pointsStudent = svgPoints(coordsStudent);
  const pointsTrainer = svgPoints(coordsTrainer);
  const labels = chartLabels(series);
  const chartMax = Math.max(1, ...series.map((row) => row.totalMinor));
  const latest = series[series.length - 1] || { label: "—", totalMinor: 0, studentMinor: 0, trainerMinor: 0 };
  const topMax = Math.max(1, ...data.topPackages.map((item) => item.netMinor));
  const periodNames: Record<Period, string> = { DAILY: "Günlük", WEEKLY: "Haftalık", MONTHLY: "Aylık" };
  const activeRange = customRange ? customRangeFor(rangeFrom, rangeTo) : rangeFor(period, anchorDate, allTime);
  const maxSelectableDate = isoDate(new Date());

  return <main className="platform-foundation-panel admin-panel owner-dashboard owner-dashboard-v5">
    <header className="owner-v5-hero">
      <div>
        <span className="owner-v5-eyebrow">YÖNETİCİ PANELİ</span>
        <h1>İşletme Genel Bakışı</h1>
        <p>Satış, eğitim operasyonu ve finansal verilerinizi tek ekranda takip edin.</p>
      </div>
      <div className="owner-v5-filters">
        <details ref={dateMenuRef} className="owner-v5-date-menu owner-v55-date-menu">
          <summary className="owner-v5-date" title="Rapor tarih aralığını seç">
            <PanelIcon name="calendar" size={18} />
            <strong>{allTime ? "Tüm zamanlar" : dateRangeLabel(activeRange.from, activeRange.to)}</strong>
            <span>⌄</span>
          </summary>
          <div className="owner-v5-date-popover owner-v55-date-popover">
            <div className="owner-v55-date-title">Tarih aralığı seç</div>
            <div className="owner-v55-date-grid">
              <label>
                <span>Başlangıç</span>
                <input
                  className="owner-v5-date-input"
                  type="date"
                  min={REPORT_MIN_DATE}
                  max={customRange ? rangeTo : activeRange.to}
                  value={customRange ? rangeFrom : activeRange.from}
                  onChange={(event) => {
                    const next = clampReportDate(event.target.value);
                    setRangeFrom(next);
                    if (rangeTo < next) setRangeTo(next);
                    setCustomRange(true);
                    setAllTime(false);
                  }}
                />
              </label>
              <label>
                <span>Bitiş</span>
                <input
                  className="owner-v5-date-input"
                  type="date"
                  min={customRange ? rangeFrom : activeRange.from}
                  max={maxSelectableDate}
                  value={customRange ? rangeTo : activeRange.to}
                  onChange={(event) => {
                    const next = clampReportDate(event.target.value);
                    setRangeTo(next);
                    if (rangeFrom > next) setRangeFrom(next);
                    setAnchorDate(next);
                    setCustomRange(true);
                    setAllTime(false);
                    dateMenuRef.current?.removeAttribute("open");
                  }}
                />
              </label>
            </div>
            <small>En erken tarih 1 Eylül 2026, en geç bugün.</small>
            <div className="owner-v55-date-divider" />
            <button
              type="button"
              className={`owner-v55-alltime ${allTime ? "is-active" : ""}`}
              onClick={() => {
                setAllTime(true);
                setCustomRange(false);
                dateMenuRef.current?.removeAttribute("open");
              }}
            >Tüm zamanlar</button>
          </div>
        </details>
        <div className="owner-v5-segment" role="tablist" aria-label="Rapor dönemi">
          {(["DAILY", "WEEKLY", "MONTHLY"] as Period[]).map((item) =>
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={!allTime && period === item}
              className={!allTime && period === item ? "is-active" : ""}
              onClick={() => { setAllTime(false); setCustomRange(false); setPeriod(item); }}
            >{periodNames[item]}</button>
          )}
        </div>
      </div>
    </header>

    {loading && <div className="owner-v5-loading" role="status">Gerçek sistem verileri yükleniyor…</div>}
    {error && <div className="owner-v5-error" role="alert">{error}</div>}

    <section className="owner-v5-summary-grid" aria-label="Satış özetleri">
      <article className="owner-v5-card owner-v5-summary is-total">
        <div className="owner-v5-summary-head">
          <span className="owner-v5-icon is-orange"><PanelIcon name="chart" size={25} /></span>
          <h2>Toplu satış özeti</h2>
          <span className={`owner-v5-change ${trendClass(data.change.totalRevenuePct)}`}>{trendText(data.change.totalRevenuePct)}</span>
        </div>
        <span className="owner-v5-period-note">Önceki döneme göre</span>
        <div className="owner-v5-summary-body">
          <div><span>Toplam ciro</span><strong>{money(data.current.totalNetMinor)}</strong><small>Önceki dönem: {money(data.previous.totalNetMinor)}</small></div>
          <div><span>Toplam adet</span><strong>{data.current.totalUnits}</strong><small>Önceki dönem: {data.previous.totalUnits}</small></div>
        </div>
      </article>

      <article className="owner-v5-card owner-v5-summary is-student">
        <div className="owner-v5-summary-head">
          <span className="owner-v5-icon is-blue"><PanelIcon name="graduation" size={25} /></span>
          <h2>Öğrenci paket satışları</h2>
          <span className={`owner-v5-change ${trendClass(data.change.studentRevenuePct)}`}>{trendText(data.change.studentRevenuePct)}</span>
        </div>
        <span className="owner-v5-period-note">Önceki döneme göre</span>
        <div className="owner-v5-summary-body">
          <div><span>Ciro</span><strong>{money(data.current.studentNetMinor)}</strong><small>Önceki dönem: {money(data.previous.studentNetMinor)}</small></div>
          <div><span>Adet</span><strong>{data.current.studentUnits}</strong><small>Önceki dönem: {data.previous.studentUnits}</small></div>
        </div>
      </article>

      <article className="owner-v5-card owner-v5-summary is-trainer">
        <div className="owner-v5-summary-head">
          <span className="owner-v5-icon is-purple"><PanelIcon name="user-check" size={25} /></span>
          <h2>Öğretmen paket satışları</h2>
          <span className={`owner-v5-change ${trendClass(data.change.trainerRevenuePct)}`}>{trendText(data.change.trainerRevenuePct)}</span>
        </div>
        <span className="owner-v5-period-note">Önceki döneme göre</span>
        <div className="owner-v5-summary-body">
          <div><span>Ciro</span><strong>{money(data.current.trainerNetMinor)}</strong><small>Önceki dönem: {money(data.previous.trainerNetMinor)}</small></div>
          <div><span>Adet</span><strong>{data.current.trainerUnits}</strong><small>Önceki dönem: {data.previous.trainerUnits}</small></div>
        </div>
      </article>
    </section>

    <section className="owner-v5-main-grid">
      <article className="owner-v5-card owner-v5-chart-card">
        <div className="owner-v5-section-head">
          <div className="owner-v5-section-title"><span className="owner-v5-section-icon"><PanelIcon name="chart" size={23} /></span><div><h2>Satış performansı</h2><p>Toplam ve kategori bazlı ciro gelişimi</p></div></div>
          <div className="owner-v5-legend"><span><i className="is-total" />Toplam ciro</span><span><i className="is-student" />Öğrenci paketleri</span><span><i className="is-trainer" />Öğretmen paketleri</span></div>
        </div>
        <div className="owner-v5-chart">
          <svg viewBox="0 0 770 160" preserveAspectRatio="none" aria-label={`${periodNames[period]} satış performansı`}>
            {[0, 1, 2, 3].map((row) => <line key={row} x1="48" x2="755" y1={20 + row * 31} y2={20 + row * 31} className="owner-v5-grid-line" />)}
            {[0, 1, 2, 3, 4, 5, 6].map((col) => <line key={col} y1="20" y2="125" x1={48 + col * 118} x2={48 + col * 118} className="owner-v5-grid-line" />)}
            {[1, .75, .5, .25, 0].map((ratio, index) => <text key={ratio} x="0" y={24 + index * 26} className="owner-v5-axis-label">{ratio === 0 ? "0" : `₺${shortMoney(chartMax * ratio)}`}</text>)}
            {pointsTotal && <polygon points={svgAreaPoints(coordsTotal)} className="owner-v5-area is-total" />}
            {pointsStudent && <polygon points={svgAreaPoints(coordsStudent)} className="owner-v5-area is-student" />}
            {pointsTrainer && <polygon points={svgAreaPoints(coordsTrainer)} className="owner-v5-area is-trainer" />}
            {pointsTotal && <polyline points={pointsTotal} className="owner-v5-line is-total" />}
            {pointsStudent && <polyline points={pointsStudent} className="owner-v5-line is-student" />}
            {pointsTrainer && <polyline points={pointsTrainer} className="owner-v5-line is-trainer" />}
            {coordsTotal.map((point, index) => <circle key={`total-${index}`} cx={point.x + 48} cy={point.y + 10} r="3.4" className="owner-v5-point is-total" />)}
            {coordsStudent.map((point, index) => <circle key={`student-${index}`} cx={point.x + 48} cy={point.y + 10} r="3.4" className="owner-v5-point is-student" />)}
            {coordsTrainer.map((point, index) => <circle key={`trainer-${index}`} cx={point.x + 48} cy={point.y + 10} r="3.4" className="owner-v5-point is-trainer" />)}
            {labels.map((row) => {
              const rawX = 48 + (series.length <= 1 ? 360 : (row.index / (series.length - 1)) * 720);
              const isFirst = row.index === 0;
              const isLast = row.index === series.length - 1;
              const x = Math.max(58, Math.min(758, rawX));
              return <text
                key={`${row.key}-label`}
                x={x}
                y="151"
                textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                className="owner-v5-axis-label"
              >{row.label}</text>;
            })}
          </svg>
          <div className="owner-v5-tooltip">
            <span>{latest.label}</span>
            <p><i className="is-total" />Toplam:<b>{money(latest.totalMinor)}</b></p>
            <p><i className="is-student" />Öğrenci:<b>{money(latest.studentMinor)}</b></p>
            <p><i className="is-trainer" />Öğretmen:<b>{money(latest.trainerMinor)}</b></p>
          </div>
        </div>
      </article>

      <article className="owner-v5-card owner-v5-stats-card">
        <div className="owner-v5-section-title"><span className="owner-v5-section-icon"><PanelIcon name="chart" size={23} /></span><div><h2>Hızlı istatistikler</h2><p>Bu döneme ait önemli metrikler</p></div></div>
        <div className="owner-v5-stats-grid">
          <div className="owner-v5-stat is-green"><span><PanelIcon name="users" size={25} /></span><div><small>Aktif öğrenci</small><strong>{data.activeStudents}</strong><em>Etkin öğrenci profili</em></div></div>
          <div className="owner-v5-stat is-purple"><span><PanelIcon name="user-check" size={25} /></span><div><small>Aktif eğitmen</small><strong>{data.activeTrainers}</strong><em>Etkin eğitmen hesabı</em></div></div>
          <div className="owner-v5-stat is-orange"><span><PanelIcon name="receipt" size={25} /></span><div><small>Satılan paket adedi</small><strong>{data.current.totalUnits} <b className={trendClass(data.change.totalUnitsPct)}>{trendText(data.change.totalUnitsPct)}</b></strong><em>Önceki dönem: {data.previous.totalUnits}</em></div></div>
          <div className="owner-v5-stat is-blue"><span><PanelIcon name="calendar" size={25} /></span><div><small>Ortalama paket tutarı</small><strong>{money(data.current.averageMinor)} <b className={trendClass(data.change.averagePct)}>{trendText(data.change.averagePct)}</b></strong><em>Önceki dönem: {money(data.previous.averageMinor)}</em></div></div>
        </div>
      </article>
    </section>

    <section className="owner-v5-lower-grid">
      <article className="owner-v5-card owner-v5-ranking-card">
        <div className="owner-v5-section-head">
          <div className="owner-v5-section-title"><span className="owner-v5-section-icon"><PanelIcon name="chart" size={23} /></span><div><h2>En çok satan paketler</h2><p>Bu dönemde en yüksek ciro getiren paketler</p></div></div>
          <Link to="/panel/admin/ogrenci-ticaret">Tüm paketleri gör →</Link>
        </div>
        <div className="owner-v5-ranking">
          {data.topPackages.length ? data.topPackages.map((item, index) =>
            <div className="owner-v5-rank-row" key={item.key}>
              <span className="owner-v5-rank-num">{index + 1}</span>
              <strong title={item.title}>{item.title}</strong>
              <div className="owner-v5-rank-track"><i style={{ width: `${Math.max(7, (item.netMinor / topMax) * 100)}%` }} /></div>
              <span>{item.units} satış</span>
              <b>{money(item.netMinor)}</b>
            </div>
          ) : <div className="owner-v5-empty">Bu dönemde tamamlanmış paket satışı yok.</div>}
        </div>
      </article>

      <article className="owner-v5-card owner-v5-pending-card">
        <div className="owner-v5-section-head">
          <div className="owner-v5-section-title"><span className="owner-v5-section-icon"><PanelIcon name="receipt" size={23} /></span><div><h2>Bekleyen işler</h2><p>Acil aksiyon gerektiren konular</p></div></div>
          <Link to="/panel/admin/siparisler">Tümünü gör →</Link>
        </div>
        <div className="owner-v5-pending">
          <Link to="/panel/admin/odemeler"><span className="is-orange"><PanelIcon name="calendar" size={19} /></span><div><strong>Ödeme bekleyen sipariş</strong><small>Öğrenci ve öğretmen paket ödemeleri</small></div><b>{data.pending.payments}</b></Link>
          <Link to="/panel/admin/atamalar"><span className="is-green"><PanelIcon name="flow" size={19} /></span><div><strong>Atama bekleyen öğrenci</strong><small>Öğrenci-eğitmen eşleştirmesi</small></div><b>{data.pending.assignments}</b></Link>
          <Link to="/panel/owner/hakedisler"><span className="is-orange"><PanelIcon name="wallet" size={19} /></span><div><strong>Ödenmemiş hakediş</strong><small>Eğitmen ödeme yükümlülüğü</small></div><b>{money(data.pending.unpaidEarningsMinor)}</b></Link>
          <Link to="/panel/admin/atamalar"><span className="is-purple"><PanelIcon name="graduation" size={19} /></span><div><strong>Tamamlanmamış eğitim</strong><small>Aktif veya duraklatılmış eğitimler</small></div><b>{data.pending.unfinishedTrainings}</b></Link>
        </div>
      </article>
    </section>

    <section className="owner-v5-card owner-v5-orders-card">
      <div className="owner-v5-section-head">
        <div className="owner-v5-section-title"><span className="owner-v5-section-icon"><PanelIcon name="receipt" size={23} /></span><div><h2>Son siparişler</h2><p>Öğrenci ve öğretmen paketlerinde en son satış hareketleri</p></div></div>
        <Link to="/panel/admin/siparisler">Tüm siparişleri gör →</Link>
      </div>
      {data.recentOrders.length ? <div className="owner-v5-table-wrap"><table>
        <thead><tr><th>Sipariş No</th><th>Müşteri / Kullanıcı</th><th>Paket</th><th>Ödeme</th><th>Tutar</th><th>Durum</th><th>Tarih</th><th>İşlemler</th></tr></thead>
        <tbody>{data.recentOrders.map((order) =>
          <tr key={`${order.kind}-${order.id}`}>
            <td>#{order.id.slice(0, 8).toUpperCase()}</td>
            <td><strong>{order.customerName || order.beneficiaryName}</strong></td>
            <td>{displayOrderPackage(order)}</td>
            <td>{paymentLabel(order.paymentMethod)}</td>
            <td>{money(order.totalMinor, order.currency)}</td>
            <td><span className={`owner-v5-status ${statusTone(order.status)}`}>{statusLabel[order.status] || order.status}</span></td>
            <td>{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(order.createdAt))}</td>
            <td><Link className="owner-v5-detail" to={order.kind === "TRAINER" ? "/panel/admin/egitmen-ticaret" : "/panel/admin/siparisler"}>Detay</Link><span className="owner-v5-more">•••</span></td>
          </tr>
        )}</tbody>
      </table></div> : <div className="owner-v5-empty">Henüz sipariş kaydı yok.</div>}
    </section>

    <div className="owner-v5-blank-frame" aria-hidden="true" />
  </main>;
}
