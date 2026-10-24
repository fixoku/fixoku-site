import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./admin-panel.css";
import "./owner-payout-v4.css";

/*
 * FIXOKU_HAKEDIS_V3_LOCAL_R2
 * FIXOKU_HAKEDIS_V3_RULES_R3
 * FIXOKU_HAKEDIS_OWNER_UX_V4_LOCAL_R1
 * FIXOKU_HAKEDIS_OWNER_UX_V4_R2_NAV_AND_PAID
 * Owner hakedişleri: gerçek API kayıtları dışında örnek/yerel ödeme yazılmaz.
 * Mevcut GET/POST /api/admin/payouts yetkilendirmesi korunur.
 */

type LedgerEntry = {
  id: string;
  status: string;
  effectiveStatus?: string;
  entryType: string;
  amountMinor: number | string;
  allocatedMinor?: number | string;
  remainingMinor?: number | string;
  currency?: string;
  payableAt?: string | null;
  occurredAt?: string | null;
  studentName?: string | null;
  trainingTitle?: string | null;
  sourceType?: string | null;
  billableStudentCount?: number | null;
};
type SummaryRow = {
  trainerUserId: string;
  trainerName: string;
  trainerEmail?: string;
  month: string;
  earnedMinor: number | string;
  payableMinor: number | string;
  scheduledMinor: number | string;
  paidMinor: number | string;
  adjustmentMinor: number | string;
  nextPayableAt?: string | null;
  entries?: LedgerEntry[];
};
type PaymentRow = {
  id: string;
  trainer_user_id: string;
  amount_minor: number | string;
  currency?: string;
  payment_date?: string;
  period_start?: string;
  period_end?: string;
  bank_reference?: string | null;
  note?: string | null;
};
type PayoutPayload = { summary?: SummaryRow[]; payouts?: PaymentRow[] };
type GroupParticipant = { id?: string; studentName?: string; status?: string };
type TrainingGroup = {
  id: string;
  trainerUserId?: string | null;
  trainerName?: string;
  trainingType?: string;
  educationStage?: string;
  mode?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string | null;
  projectedPayoutMinor?: number | string;
  requiredQualificationTitle?: string;
  participants?: GroupParticipant[];
};
type TabKey = "overview" | "earnings" | "payments" | "reports";
type Period = "all" | "today" | "week" | "month" | "year";
type Status = "all" | "PAYABLE" | "EARNED" | "PAID";
type RecordLine = LedgerEntry & { trainerUserId: string; trainerName: string; trainerEmail: string; summaryMonth: string };
type PaymentCandidate = { trainerUserId: string; trainerName: string; completionMonth: string; currency: string; amountMinor: number; count: number };

const tabItems: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Genel Bakış" },
  { key: "earnings", label: "Hakedişler" },
  { key: "payments", label: "Ödemeler" },
  { key: "reports", label: "Raporlar" },
];
const money = (value: number | string | null | undefined, currency = "TRY") =>
  value == null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toMinor(value) / 100);
const toMinor = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const dayKey = (value?: string | null) => {
  const raw = String(value || "");
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/u.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};
const todayKey = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
};
const dateText = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", year: "numeric" });
};
const dueDateForEntry = (entry: LedgerEntry): string | null => {
  // The server's persisted payable_at is the only payment-date authority.
  // Missing dates remain unresolved and must never become payable by inference.
  if (!["EARNED", "PAYABLE", "PAID"].includes(entry.status)) return null;
  const persistedDate = /^\d{4}-\d{2}-\d{2}$/.test(dayKey(entry.payableAt)) ? dayKey(entry.payableAt) : null;
  return persistedDate;
};
const activePeriod = (dateValue: string | null | undefined, period: Period) => {
  if (period === "all") return true;
  const value = dayKey(dateValue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const today = todayKey();
  if (period === "today") return value === today;
  if (period === "month") return value.slice(0, 7) === today.slice(0, 7);
  if (period === "year") return value.slice(0, 4) === today.slice(0, 4);
  const now = new Date(today + "T12:00:00");
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const current = new Date(value + "T12:00:00");
  return current >= start && current <= end;
};
const statusTitle = (status: string) => ({
  EARNED: "Kesinleşti", PAYABLE: "Ödenebilir", PAID: "Ödendi", HELD: "Bekletildi", PENDING: "Bekliyor", REVERSED: "İptal",
}[status] || status || "Bilinmiyor");
const statusClass = (status: string) => ["PAYABLE", "PAID", "EARNED", "HELD", "PENDING"].includes(status) ? status.toLowerCase() : "neutral";
const isEligibleForPayment = (entry: LedgerEntry) =>
  entry.entryType !== "ADJUSTMENT"
  && (entry.status === "EARNED" || entry.status === "PAYABLE")
  && toMinor(entry.remainingMinor ?? entry.amountMinor) > 0
  && Boolean(dueDateForEntry(entry) && dueDateForEntry(entry)! <= todayKey());
const completionMonth = (entry: LedgerEntry) => dayKey(entry.occurredAt).slice(0, 7);
const currentGroup = (group: TrainingGroup) =>
  Boolean(group.trainerUserId) && ["DRAFT", "ASSIGNED", "IN_PROGRESS"].includes(String(group.status || "").toUpperCase());
const groupLabel = (group: TrainingGroup) => {
  const mode = group.mode === "GROUP" ? "Grup" : group.mode === "INDIVIDUAL" ? "Birebir" : (group.mode || "Eğitim");
  const stage = group.educationStage || group.requiredQualificationTitle || "Eğitim";
  return `${stage} · ${mode}`;
};
const monthBounds = (month: string) => {
  const start = `${month}-01`;
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0));
  return { start, end: last.toISOString().slice(0, 10) };
};
const csvCell = (value: string | number | null | undefined) => {
  const raw = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(raw.trimStart()) ? "'" + raw : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};
function downloadCsv(filename: string, heading: string[], rows: Array<Array<string | number>>) {
  const content = [heading, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}


const readableSource = (source?: string | null): string => {
  const key = String(source || "").toUpperCase();
  const labels: Record<string,string> = {
    ENROLLMENT_COMPLETION: "Eğitim tamamlama kaydı",
    ENROLLMENT_PROGRESS: "Eğitim ilerleme kaydı",
    SESSION: "Ders oturumu",
    ASSIGNMENT: "Öğrenci ataması",
    GROUP_COMPLETION: "Grup eğitimi tamamlandı",
  };
  return labels[key] || "Eğitim kaydı";
};
const readableGroup = (group: TrainingGroup) => {
  const stage: Record<string,string> = { PRIMARY:"İlkokul", MIDDLE:"Ortaokul", SECONDARY:"Ortaokul", HIGH:"Lise", ADULT:"Yetişkin" };
  const label = stage[String(group.educationStage || "").toUpperCase()] || group.requiredQualificationTitle || "Eğitim";
  return `${label} · ${group.mode === "GROUP" ? "Grup" : group.mode === "INDIVIDUAL" ? "Birebir" : "Eğitim"}`;
};
const monthTitle = (yearMonth: string) => {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const d = new Date(`${yearMonth}-01T12:00:00`);
  return Number.isNaN(d.getTime()) ? yearMonth : d.toLocaleDateString("tr-TR",{month:"long",year:"numeric"});
};

export function R6PayoutsPage() {
  const [data, setData] = useState<PayoutPayload | null>(null);
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [groupsError, setGroupsError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [earningsMode, setEarningsMode] = useState<"confirmed" | "planned">("confirmed");
  const [paymentsMode, setPaymentsMode] = useState<"due" | "history">("due");
  const [reportMode, setReportMode] = useState<"teachers" | "packages">("teachers");
  const [period, setPeriod] = useState<Period>("all");
  const [query, setQuery] = useState("");
  const [trainerFilter, setTrainerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [focusTrainer, setFocusTrainer] = useState<string | null>(null);
  const [payCandidate, setPayCandidate] = useState<PaymentCandidate | null>(null);
  const [paymentDate, setPaymentDate] = useState(todayKey());
  const [paymentError, setPaymentError] = useState("");
  const [currentCalendarDay, setCurrentCalendarDay] = useState(todayKey());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/payouts", { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error(`Hakediş verileri alınamadı (HTTP ${r.status}).`);
      const payload = await r.json() as PayoutPayload;
      if (!Array.isArray(payload.summary) || !Array.isArray(payload.payouts)) throw new Error("Hakediş veri biçimi beklenenden farklı.");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Hakediş kayıtları yüklenemedi.");
    } finally {
      setLoading(false);
    }
    try {
      const r = await fetch("/api/admin/r6-training-groups", { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error(`Grup atamaları okunamadı (HTTP ${r.status}).`);
      const payload = await r.json() as { groups?: TrainingGroup[] };
      if (!Array.isArray(payload.groups)) throw new Error("Grup atama veri biçimi beklenenden farklı.");
      setGroups(payload.groups);
      setGroupsError("");
    } catch {
      setGroups([]);
      setGroupsError("Planlanan grup eğitimleri şu an alınamadı; kesinleşmiş hakedişler ayrı kaynaktan gösteriliyor.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const ticker = window.setInterval(() => setCurrentCalendarDay(todayKey()), 60_000);
    return () => window.clearInterval(ticker);
  }, []);
  // Modal first, then trainer drawer: escape behaves as a natural back action.
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      if (payCandidate) setPayCandidate(null);
      else if (focusTrainer) setFocusTrainer(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, payCandidate, focusTrainer]);

  const sourceRows = data?.summary || [];
  const teacherList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    sourceRows.forEach((row) => map.set(row.trainerUserId, { id: row.trainerUserId, name: row.trainerName || "Eğitmen", email: row.trainerEmail || "" }));
    groups.forEach((g) => { if (g.trainerUserId && !map.has(g.trainerUserId)) map.set(g.trainerUserId, { id: g.trainerUserId, name: g.trainerName || "Eğitmen", email: "" }); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [sourceRows, groups]);
  const byName = (id: string) => teacherList.find((item) => item.id === id)?.name || "Eğitmen";
  const search = query.trim().toLocaleLowerCase("tr-TR");
  const recordLines = useMemo<RecordLine[]>(() => sourceRows.flatMap((row) => (row.entries || [])
    .filter((entry) => entry.entryType !== "ADJUSTMENT" && ["EARNED", "PAYABLE", "PAID"].includes(entry.status))
    .map((entry) => ({ ...entry, trainerUserId: row.trainerUserId, trainerName: row.trainerName, trainerEmail: row.trainerEmail || "", summaryMonth: String(row.month || "") }))
  ), [sourceRows]);
  // The API filters allocation eligibility by the ACTUAL payment date.
  // For a backdated record, require all included earnings to have become payable.
  const paymentEarliestAllowed = payCandidate
    ? recordLines.filter((entry) => entry.trainerUserId === payCandidate.trainerUserId
      && completionMonth(entry) === payCandidate.completionMonth && isEligibleForPayment(entry))
      .map(dueDateForEntry).filter((date): date is string => Boolean(date)).sort().slice(-1)[0] || ""
    : "";
  const validPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDate)
    && paymentDate <= currentCalendarDay
    && (!paymentEarliestAllowed || paymentDate >= paymentEarliestAllowed);
  const canSubmitPayment = Boolean(payCandidate) && Number.isSafeInteger(payCandidate?.amountMinor)
    && (payCandidate?.amountMinor || 0) > 0 && validPaymentDate && !busy;
  const paymentCandidates = useMemo(() => {
    const map = new Map<string, PaymentCandidate>();
    // Ödeme POST API'si eğitim TAMAMLANMA tarihine göre dönem bekler.
    // API'nin payable_period_start alanını ödeme dönemine dönüştürmeyin.
    recordLines.forEach((entry) => {
      if (!isEligibleForPayment(entry)) return;
      const month = completionMonth(entry);
      if (!/^\d{4}-\d{2}$/.test(month)) return;
      const currency = String(entry.currency || "TRY").toUpperCase();
      const key = `${entry.trainerUserId}:${month}:${currency}`;
      const existing = map.get(key) || { trainerUserId: entry.trainerUserId, trainerName: entry.trainerName, completionMonth: month, currency, amountMinor: 0, count: 0 };
      existing.amountMinor += toMinor(entry.remainingMinor ?? entry.amountMinor);
      existing.count++;
      map.set(key, existing);
    });
    return Array.from(map.values());
  }, [recordLines]);
  const openPayment = (candidate: PaymentCandidate) => {
    setPaymentError("");
    setPaymentDate(todayKey());
    setPayCandidate(candidate);
  };
  const submitPayment = async () => {
    if (!payCandidate || !canSubmitPayment) return;
    setBusy(true);
    setPaymentError("");
    setNotice("");
    try {
      const { start, end } = monthBounds(payCandidate.completionMonth);
      const response = await fetch("/api/admin/payouts", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trainerUserId: payCandidate.trainerUserId,
          amountMinor: payCandidate.amountMinor,
          currency: payCandidate.currency,
          periodStart: start,
          periodEnd: end,
          paymentDate,
        }),
      });
      const answer = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(answer.error === "PAYOUT_AMOUNT_EXCEEDS_DUE"
        ? "Ödenebilir bakiye değişmiş veya kısmi ödeme yapılmış olabilir. İşlem kaydedilmedi; sayfayı yenileyip kontrol edin."
        : answer.error || "Ödeme kaydedilemedi.");
      setPayCandidate(null);
      setNotice(`${dateText(paymentDate)} tarihli ödeme kaydı oluşturuldu. Güncel kayıtlar yenileniyor.`);
      await load();
    } catch (reason) {
      setPaymentError(reason instanceof Error ? reason.message : "Ödeme kaydedilemedi.");
    } finally { setBusy(false); }
  };
  // V4: Owner's financial overview is NOT tied to the report date filter.
  // The source of truth remains the existing GET /api/admin/payouts and R6 group GET.
  const allUnpaid = recordLines.filter((entry) => ["EARNED", "PAYABLE"].includes(entry.status) && toMinor(entry.remainingMinor ?? entry.amountMinor) > 0);
  const allDue = allUnpaid.filter(isEligibleForPayment);
  const allSoon = allUnpaid.filter((entry) => {
    const due = dayKey(dueDateForEntry(entry));
    if (!due || due <= currentCalendarDay) return false;
    const days = Math.round((Date.parse(`${due}T12:00:00`) - Date.parse(`${currentCalendarDay}T12:00:00`)) / 86400000);
    return days >= 1 && days <= 30;
  });
  const allPaid = data?.payouts || [];
  const allPlanned = groups.filter(currentGroup);
  const totalMinor = (items: Array<{ amountMinor: number | string; remainingMinor?: number | string; currency?: string }>, remaining = false) => {
    const currencies = new Set(items.map((entry) => String(entry.currency || "TRY").toUpperCase()));
    if (currencies.size > 1) return null;
    return items.reduce((sum, entry) => sum + toMinor(remaining ? (entry.remainingMinor ?? entry.amountMinor) : entry.amountMinor), 0);
  };
  const sumPlanned = (items: TrainingGroup[]) => items.reduce((sum, group) => sum + toMinor(group.projectedPayoutMinor), 0);
  const allTeacherDue = Array.from(new Set(allDue.map((item) => item.trainerUserId))).length;
  const openTrainerList = teacherList.map((teacher) => {
    const entries = allUnpaid.filter((entry) => entry.trainerUserId === teacher.id);
    const dates = entries.map(dueDateForEntry).filter((date): date is string => Boolean(date)).sort();
    const earliest = dates[0] || null;
    return { ...teacher, entries, amount: totalMinor(entries, true), earliest, dueAmount: totalMinor(entries.filter(isEligibleForPayment), true) };
  }).filter((teacher) => teacher.entries.length > 0)
    .sort((a, b) => (a.earliest || "9999-12-31").localeCompare(b.earliest || "9999-12-31") || a.name.localeCompare(b.name, "tr"));
  const matchingTeacher = (id: string, fields: string) => (!trainerFilter || trainerFilter === id)
    && (!search || `${byName(id)} ${fields}`.toLocaleLowerCase("tr-TR").includes(search));
  const paymentQueue = paymentCandidates.map((candidate) => {
    const eligible = allDue.filter((entry) => entry.trainerUserId === candidate.trainerUserId && completionMonth(entry) === candidate.completionMonth && String(entry.currency || "TRY").toUpperCase() === candidate.currency);
    const due = eligible.map(dueDateForEntry).filter((d): d is string => Boolean(d)).sort()[0] || null;
    return { ...candidate, due, eligible };
  }).filter((candidate) => matchingTeacher(candidate.trainerUserId, candidate.eligible.map((e) => `${e.studentName || ""} ${e.trainingTitle || ""}`).join(" ")))
    .sort((a, b) => (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31"));
  const shownPayments = (data?.payouts || []).filter((payment) => matchingTeacher(payment.trainer_user_id, payment.bank_reference || ""))
    .sort((a, b) => dayKey(b.payment_date).localeCompare(dayKey(a.payment_date)));
  const filteredRecords = recordLines.filter((entry) => matchingTeacher(entry.trainerUserId,
    `${entry.studentName || ""} ${entry.trainingTitle || ""} ${entry.sourceType || ""}`));
  const filteredGroups = allPlanned.filter((group) => matchingTeacher(group.trainerUserId || "",
    `${groupLabel(group)} ${(group.participants || []).map((p) => p.studentName || "").join(" ")}`));
  const reportRecords = filteredRecords.filter((entry) => activePeriod(entry.occurredAt, period));
  const reportGroups = filteredGroups.filter((group) => activePeriod(group.createdAt, period));
  const reportPayments = shownPayments.filter((row) => activePeriod(row.payment_date, period));
  const reportBreakdown = new Map<string, { count: number; sum: number }>();
  reportRecords.forEach((entry) => {
    const id = reportMode === "teachers" ? entry.trainerName : (entry.trainingTitle || readableSource(entry.sourceType));
    const currency = String(entry.currency || "TRY").toUpperCase();
    const key = `${id} · ${currency}`;
    const current = reportBreakdown.get(key) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += toMinor(entry.amountMinor);
    reportBreakdown.set(key, current);
  });
  const topBreakdown = Array.from(reportBreakdown.entries()).sort((a, b) => b[1].sum - a[1].sum);
  const reportMax = Math.max(1, ...topBreakdown.map(([, val]) => val.sum));
  const activeTeacher = focusTrainer ? teacherList.find((teacher) => teacher.id === focusTrainer) : null;
  const drawerEntries = activeTeacher ? recordLines.filter((entry) => entry.trainerUserId === activeTeacher.id)
    .sort((a, b) => dayKey(b.occurredAt).localeCompare(dayKey(a.occurredAt))) : [];
  const drawerPlans = activeTeacher ? allPlanned.filter((group) => group.trainerUserId === activeTeacher.id) : [];
  const drawerPayments = activeTeacher ? (data?.payouts || []).filter((p) => p.trainer_user_id === activeTeacher.id) : [];
  const drawerDue = drawerEntries.filter(isEligibleForPayment);
  const sourceAlert = loading && data ? "Kayıtlar güncelleniyor…" : "";

  const clearFilters = () => { setQuery(""); setTrainerFilter(""); setStatusFilter("all"); };
  const backToOverview = () => { setFocusTrainer(null); setTab("overview"); };
  const avatar = (name: string) => <span className="hp4-avatar" aria-hidden="true">{name.trim().charAt(0).toLocaleUpperCase("tr-TR")}</span>;
  const person = (id: string, name?: string, email?: string) => <div className="hp4-person">{avatar(name || byName(id))}<span><strong>{name || byName(id)}</strong>{email && <small>{email}</small>}</span></div>;
  const pill = (status: string) => <span className={`hp4-pill hp4-pill-${statusClass(status)}`}>{statusTitle(status)}</span>;
  const duePill = (date: string | null) => {
    if (!date) return <span className="hp4-pill hp4-pill-neutral">Tarih doğrulanamadı</span>;
    const diff = Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${currentCalendarDay}T12:00:00`)) / 86400000);
    if (diff < 0) return <span className="hp4-pill hp4-pill-late">{-diff} gün gecikti</span>;
    if (diff === 0) return <span className="hp4-pill hp4-pill-today">Bugün ödenecek</span>;
    return <span className="hp4-pill hp4-pill-soon">{diff} gün kaldı</span>;
  };
  const table = (headings: string[], rows: ReactNode[], emptyMessage: string) => <div className="hp4-table-scroll" role="region" tabIndex={0} aria-label="Yatay kaydırılabilir hakediş tablosu">
    <table className="hp4-table"><thead><tr>{headings.map((name) => <th key={name} scope="col">{name}</th>)}</tr></thead>
    <tbody>{rows.length ? rows : <tr><td colSpan={headings.length} className="hp4-empty-row">{emptyMessage}</td></tr>}</tbody></table>
  </div>;
  const filters = <div className="hp4-toolbar"><label className="hp4-search"><span className="hp4-sr-only">Öğretmen, öğrenci veya eğitim ara</span>
    <input type="search" value={query} placeholder="Öğretmen, öğrenci veya eğitim ara" onChange={(e) => setQuery(e.target.value)} /></label>
    <label className="hp4-sr-only" htmlFor="hp4-trainer">Öğretmen</label>
    <select id="hp4-trainer" value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}><option value="">Tüm öğretmenler</option>
    {teacherList.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select>
    <button type="button" className="hp4-btn" onClick={clearFilters}>Filtreleri temizle</button>
  </div>;
  const showPaymentCandidate = (candidate: PaymentCandidate) => {
    // The ledger might have partial allocations; API remains authoritative at POST time.
    if (candidate.amountMinor > 0) openPayment(candidate);
  };
  const reportCsv = () => {
    downloadCsv(`fixoku-owner-hakedis-v4-${todayKey()}.csv`,
      ["Öğretmen", "Öğrenci", "Eğitim", "Tamamlanma", "Ödeme tarihi", "Durum", "Tutar (TL)"],
      reportRecords.map((entry) => [entry.trainerName, entry.studentName || "", entry.trainingTitle || readableSource(entry.sourceType),
        dayKey(entry.occurredAt), dueDateForEntry(entry) || "", statusTitle(entry.status), money(entry.amountMinor)]));
  };

  return <main className="platform-foundation-panel admin-panel owner-payout-page owner-payout-v4">
    <header className="hp4-page-header"><div><span className="hp4-overline">SATIŞLAR / ÖĞRETMEN HAKEDİŞLERİ</span>
      <h1>Öğretmen Hakedişleri</h1><p>Kime, ne zaman ve ne kadar ödeme yapacağınızı tek bakışta görün.</p></div>
      <div className="hp4-actions"><button type="button" className="hp4-btn" disabled={loading} onClick={() => void load()}>↻ Yenile</button>
        <button type="button" className="hp4-btn hp4-btn-primary" disabled={!data} onClick={reportCsv}>↓ Raporu İndir</button></div>
    </header>
    <nav className="hp4-tabs" role="tablist" aria-label="Hakediş bölümleri">{tabItems.map(({key,label}) => <button
      role="tab" aria-selected={tab===key} key={key} type="button" className={tab===key?"active":""} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {tab !== "overview" && <div className="hp4-back-row" aria-label="Sayfa içi gezinme">
      <button type="button" className="hp4-btn hp4-back-btn" onClick={backToOverview}>← Genel Bakış'a Dön</button>
      <span className="hp4-back-crumb">Genel Bakış <span aria-hidden="true">/</span> {tabItems.find((item) => item.key === tab)?.label}
      {tab === "payments" ? ` / ${paymentsMode === "due" ? "Ödenecekler" : "Ödeme Geçmişi"}` : ""}</span>
    </div>}
    {sourceAlert && <p role="status" className="hp4-banner">{sourceAlert}</p>}
    {error && <div className="hp4-banner hp4-banner-error" role="alert">{error} <button type="button" onClick={() => void load()}>Tekrar dene</button></div>}
    {notice && <div className="hp4-banner" role="status">{notice}</div>}
    {groupsError && <div className="hp4-banner hp4-banner-warn" role="status">{groupsError}</div>}
    {loading && !data ? <div className="hp4-panel hp4-empty">Hakediş kayıtları yükleniyor…</div> : !data ? <div className="hp4-panel hp4-empty">Gerçek hakediş verileri alınamadı. Yenile düğmesini kullanabilirsiniz.</div> : <>
      {tab === "overview" && <>
        <div className="hp4-notice"><span className="hp4-notice-mark">i</span><div><strong>{allTeacherDue} öğretmene ait {allDue.length} ödeme günü gelmiş hakediş kaydı var.</strong>
          <span> Toplam <b>{money(totalMinor(allDue))}</b> için kayıtları inceleyebilirsiniz.</span></div>
          <button type="button" className="hp4-btn hp4-btn-soft" onClick={() => { setTab("payments"); setPaymentsMode("due"); }}>Ödemeleri Gör →</button></div>
        <section className="hp4-kpis" aria-label="Hakediş finansal özet">
          <article className="hp4-kpi hp4-kpi-accent"><div className="hp4-kpi-head"><span>Ödeme günü gelen</span><span className="hp4-kpi-icon">◷</span></div><strong>{money(totalMinor(allDue))}</strong><small>{allDue.length} kesinleşmiş kayıt · ödeme günü geldi</small></article>
          <article className="hp4-kpi"><div className="hp4-kpi-head"><span>Yaklaşan ödemeler</span><span className="hp4-kpi-icon">▣</span></div><strong>{money(totalMinor(allSoon))}</strong><small>Önümüzdeki 30 gün içinde</small></article>
          <article className="hp4-kpi"><div className="hp4-kpi-head"><span>Toplam ödenen</span><span className="hp4-kpi-icon">✓</span></div><strong>{money(allPaid.reduce((sum, pay) => sum + toMinor(pay.amount_minor), 0))}</strong><small>Gerçek ödeme sicilindeki kayıtlar</small></article>
          <article className="hp4-kpi"><div className="hp4-kpi-head"><span>Henüz planlanan</span><span className="hp4-kpi-icon">◇</span></div><strong>{money(sumPlanned(allPlanned))}</strong><small>Doğrulanmış grup atamaları · ödeme borcu değil</small></article>
        </section>
        <section className="hp4-panel"><div className="hp4-panel-head"><div><h2>Ödeme bekleyen öğretmenler</h2><p>Öğretmen başına toplam ve en eski ödeme tarihi. Ayrıntılar tek tıkla açılır.</p></div>
          <span className="hp4-count">{openTrainerList.length} öğretmen</span></div>
          {table(["Öğretmen", "Bekleyen toplam", "En eski ödeme günü", "Durum", "İşlem"], openTrainerList.map((teacher) => <tr key={teacher.id}>
            <td>{person(teacher.id, teacher.name, teacher.email)}</td><td><small className="hp4-sub">{teacher.entries.length} hakediş kaydı</small><strong className="hp4-money">{money(teacher.amount)}</strong></td>
            <td><strong>{dateText(teacher.earliest)}</strong><small className="hp4-sub">{new Set(teacher.entries.map((e) => completionMonth(e))).size} tamamlanma dönemi</small></td>
            <td>{duePill(teacher.earliest)}</td><td><button type="button" className="hp4-btn hp4-btn-small" onClick={() => setFocusTrainer(teacher.id)}>Ayrıntıları Aç →</button></td></tr>), "Bekleyen hakediş bulunmuyor.")}
          <p className="hp4-footnote">Ayrı tamamlanma ayları tek ödeme işlemine katılmaz. Ödeme günü doğrulanamayan kayıtlarda gerçek işlem yapılamaz.</p></section>
        <div className="hp4-secondary">
          <section className="hp4-panel"><div className="hp4-panel-head"><div><h2>Son ödeme hareketleri</h2><p>Ödendi olarak kaydedilen son işlemler</p></div><button type="button" className="hp4-btn hp4-btn-small" onClick={() => { setTab("payments"); setPaymentsMode("history"); }}>Tümünü Gör →</button></div>
            {allPaid.slice().sort((a,b) => dayKey(b.payment_date).localeCompare(dayKey(a.payment_date))).slice(0,4).map((row) => <div className="hp4-list-row" key={row.id}>{person(row.trainer_user_id)}<div><strong>{money(row.amount_minor)}</strong><small>{dateText(row.payment_date)}</small></div></div>)}
            {allPaid.length===0 && <p className="hp4-empty">Henüz ödeme kaydı bulunmuyor.</p>}</section>
          <section className="hp4-panel"><div className="hp4-panel-head"><div><h2>Planlanan eğitimler</h2><p>Henüz bitmeyen, ödeme borcu oluşturmayan atamalar</p></div><button type="button" className="hp4-btn hp4-btn-small" onClick={() => { setTab("earnings"); setEarningsMode("planned"); }}>Planlananları Gör →</button></div>
            {teacherList.filter((t) => allPlanned.some((g) => g.trainerUserId===t.id)).slice(0,4).map((teacher) => {
              const teacherPlans = allPlanned.filter((g) => g.trainerUserId===teacher.id);
              return <div className="hp4-list-row" key={teacher.id}>{person(teacher.id, teacher.name)}<div><strong>{money(sumPlanned(teacherPlans))}</strong><small>{teacherPlans.length} aktif grup · kesinleşmedi</small></div></div>;
            })}{allPlanned.length === 0 && <p className="hp4-empty">Planlanan grup ataması yok.</p>}</section>
        </div>
      </>}
      {tab === "earnings" && <section className="hp4-panel"><div className="hp4-panel-head"><div><h2>Hakedişler</h2><p>Planlanan tutar ile eğitim bitince kesinleşen hakediş ayrı gösterilir.</p></div>
        <div className="hp4-segment" role="group" aria-label="Hakediş görünümü"><button type="button" className={earningsMode==="confirmed"?"active":""} onClick={() => setEarningsMode("confirmed")}>Kesinleşenler</button><button type="button" className={earningsMode==="planned"?"active":""} onClick={() => setEarningsMode("planned")}>Planlananlar</button></div></div>{filters}
        {earningsMode === "planned" ? <>{table(["Öğretmen", "Eğitim / Grup", "Katılımcı", "Atama", "Öngörülen tutar", "Durum"], filteredGroups.map((group) => <tr key={group.id}>
          <td>{person(group.trainerUserId || "", group.trainerName || byName(group.trainerUserId || ""))}</td><td>{readableGroup(group)}</td><td>{group.participants?.filter((p) => p.status === "ACTIVE").length || 0}</td><td>{dateText(group.createdAt)}</td>
          <td><strong className="hp4-money">{money(group.projectedPayoutMinor)}</strong></td><td><span className="hp4-pill hp4-pill-planned">{group.status === "IN_PROGRESS" ? "Devam ediyor" : "Planlandı"}</span></td></tr>), "Planlanan grup ataması yok.")}
          <p className="hp4-footnote">Yalnız doğrulanabilen R6 grup atamalarını gösteriyoruz; birebir atamalar bu kaynakta eksik olabilir. Planlanan tutar henüz ödeme borcu değildir.</p></> : <>{table(["Öğretmen / Öğrenci", "Eğitim", "Tamamlanma", "Ödeme günü", "Tutar", "Durum", "İşlem"], filteredRecords.filter((e) => statusFilter === "all" || e.status === statusFilter || (e.effectiveStatus || e.status) === statusFilter).map((entry) => {
            const candidate = paymentCandidates.find((c) => c.trainerUserId === entry.trainerUserId && c.completionMonth === completionMonth(entry) && c.currency === String(entry.currency || "TRY").toUpperCase());
            return <tr key={entry.id}><td>{person(entry.trainerUserId, entry.trainerName, entry.studentName || "")}</td><td>{entry.trainingTitle || readableSource(entry.sourceType)}</td><td>{dateText(entry.occurredAt)}</td><td>{dateText(dueDateForEntry(entry))}</td>
              <td><strong className="hp4-money">{money(entry.amountMinor)}</strong></td><td>{pill(entry.effectiveStatus || entry.status)}</td>
              <td>{candidate && isEligibleForPayment(entry) ? <button type="button" className="hp4-btn hp4-btn-small" onClick={() => { setTab("payments"); setPaymentsMode("due"); setTrainerFilter(entry.trainerUserId); }}>Ödeme dönemini gör →</button> : <span className="hp4-sub">—</span>}</td></tr>;
          }), "Kesinleşmiş kayıt bulunamadı.")}
          <div className="hp4-footnote"><label>Durum filtresi: <select aria-label="Hakediş durumunu filtrele" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status)}><option value="all">Tüm durumlar</option><option value="PAYABLE">Ödenebilir</option><option value="EARNED">Kesinleşti</option><option value="PAID">Ödendi</option></select></label><span> Ödeme tarihi: eğitimin tamamlanmasından sonraki ayın ilk iş günü. Gerçek ödeme kaydı "Ödemeler" bölümünde incelenir.</span></div></>}
      </section>}
      {tab === "payments" && <section className="hp4-panel"><div className="hp4-panel-head"><div><h2>Ödemeler</h2><p>Ödeme günü gelen dönemleri inceleyin, geçmiş kayıtları kontrol edin.</p></div>
        <div className="hp4-segment" role="group" aria-label="Ödeme görünümü"><button type="button" className={paymentsMode==="due"?"active":""} onClick={() => setPaymentsMode("due")}>Ödenecekler</button>
          <button type="button" className={paymentsMode==="history"?"active":""} onClick={() => setPaymentsMode("history")}>Ödeme Geçmişi</button></div></div>{filters}
        {paymentsMode === "due" ? <>{table(["Öğretmen", "Tamamlanma dönemi", "Hakediş sayısı", "İncelenecek tutar", "En eski ödeme günü", "İşlem"], paymentQueue.map((candidate) => <tr key={`${candidate.trainerUserId}:${candidate.completionMonth}`}>
          <td>{person(candidate.trainerUserId, candidate.trainerName)}</td><td>{monthTitle(candidate.completionMonth)}</td><td>{candidate.count} kayıt</td>
          <td><strong className="hp4-money">{money(candidate.amountMinor)}</strong></td><td>{duePill(candidate.due)}</td>
          <td><button type="button" className="hp4-btn hp4-btn-small hp4-btn-primary" onClick={() => showPaymentCandidate(candidate)}>Ödendi</button></td></tr>), "Ödeme günü gelmiş hakediş bulunmuyor.")}
          <p className="hp4-footnote">İşlemler öğretmen ve eğitimin tamamlandığı ay temelinde ayrılır. Kısmi ödeme varsa son bakiyeyi API yeniden denetler; liste tutarı tek başına ödeme yetkisi değildir.</p></> : table(["Öğretmen", "Ödeme tarihi", "Tamamlanma dönemi", "Tutar", "Durum"], shownPayments.map((payment) => <tr key={payment.id}>
            <td>{person(payment.trainer_user_id)}</td><td>{dateText(payment.payment_date)}</td><td>{dateText(payment.period_start)} – {dateText(payment.period_end)}</td>
            <td><strong className="hp4-money">{money(payment.amount_minor)}</strong></td><td>{pill("PAID")}</td></tr>), "Ödeme geçmişinde kayıt bulunamadı.")}
      </section>}
      {tab === "reports" && <section className="hp4-panel"><div className="hp4-panel-head"><div><h2>Raporlar</h2><p>İhtiyaç duyduğunuzda öğretmen veya paket bazında inceleyin.</p></div>
        <button type="button" className="hp4-btn" onClick={reportCsv}>↓ CSV İndir</button></div>
        <div className="hp4-toolbar hp4-report-tools"><div className="hp4-segment" role="group" aria-label="Rapor kırılımı"><button type="button" className={reportMode==="teachers"?"active":""} onClick={() => setReportMode("teachers")}>Öğretmen Bazında</button>
          <button type="button" className={reportMode==="packages"?"active":""} onClick={() => setReportMode("packages")}>Paket Bazında</button></div>
          <select aria-label="Rapor öğretmen filtresi" value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}><option value="">Tüm öğretmenler</option>{teacherList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select aria-label="Rapor dönemi" value={period} onChange={(e) => setPeriod(e.target.value as Period)}><option value="all">Tüm dönemler</option><option value="today">Bugün</option><option value="week">Bu hafta</option><option value="month">Bu ay</option><option value="year">Bu yıl</option></select></div>
        <div className="hp4-report-kpis"><article><small>Kesinleşmiş hakediş</small><strong>{money(totalMinor(reportRecords))}</strong></article>
          <article><small>Ödenen</small><strong>{money(reportPayments.reduce((sum, payment) => sum + toMinor(payment.amount_minor), 0))}</strong></article>
          <article><small>Henüz planlanan (grup)</small><strong>{money(sumPlanned(reportGroups))}</strong></article></div>
        <div className="hp4-bars">{topBreakdown.map(([label, values]) => <div className="hp4-bar-row" key={label}><strong>{label}</strong><div className="hp4-bar-track"><span style={{width:`${Math.max(3, values.sum/reportMax*100)}%`}} /></div><b>{money(values.sum)}</b></div>)}
          {topBreakdown.length===0 && <p className="hp4-empty">Bu rapor döneminde kesinleşmiş kayıt yok.</p>}</div>
        <p className="hp4-footnote">Kesinleşme raporu tamamlama tarihine, ödeme raporu ödeme tarihine, grup planı oluşturulma tarihine göre filtrelenir.</p></section>}
    </>}
    {activeTeacher && <div className="hp4-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target===event.currentTarget) setFocusTrainer(null); }}>
      <aside className="hp4-drawer" role="dialog" aria-modal="true" aria-label={`${activeTeacher.name} hakediş ayrıntıları`}>
        <div className="hp4-drawer-head"><div><button type="button" className="hp4-drawer-back" onClick={() => setFocusTrainer(null)}>← Listeye Dön</button><span className="hp4-overline">ÖĞRETMEN AYRINTILARI</span><h2>{activeTeacher.name}</h2><p>{activeTeacher.email}</p></div>
          <button type="button" className="hp4-close" aria-label="Kapat" onClick={() => setFocusTrainer(null)}>×</button></div>
        <div className="hp4-drawer-body"><div className="hp4-drawer-metrics"><div><small>Ödeme günü gelen</small><strong>{money(totalMinor(drawerDue))}</strong></div>
          <div><small>Bekleyen toplam</small><strong>{money(totalMinor(drawerEntries.filter((e) => e.status !== "PAID")))}</strong></div></div>
          <h3>Bekleyen dönemler</h3>{paymentCandidates.filter((p) => p.trainerUserId===activeTeacher.id).map((candidate) => <div className="hp4-drawer-item" key={candidate.completionMonth}>
            <div><strong>{monthTitle(candidate.completionMonth)}</strong><small>{candidate.count} ödenebilir hakediş</small></div>
            <div><b>{money(candidate.amountMinor)}</b><button type="button" className="hp4-btn hp4-btn-small" onClick={() => showPaymentCandidate(candidate)}>Ödendi</button></div></div>)}
          {drawerDue.length===0 && <p className="hp4-sub">Ödeme günü gelmiş kayıt yok.</p>}
          <h3>Hakediş ayrıntıları</h3>{drawerEntries.map((entry) => <div className="hp4-drawer-item" key={entry.id}><div><strong>{entry.trainingTitle || readableSource(entry.sourceType)}</strong>
            <small>{entry.studentName || "Öğrenci belirtilmedi"} · {dateText(entry.occurredAt)}</small><small>Ödeme günü: {dateText(dueDateForEntry(entry))}</small></div><div><b>{money(entry.amountMinor)}</b>{pill(entry.effectiveStatus || entry.status)}</div></div>)}
          {drawerEntries.length===0 && <p className="hp4-sub">Kesinleşmiş hakediş bulunmuyor.</p>}
          <h3>Planlanan grup eğitimleri</h3>{drawerPlans.map((group) => <div className="hp4-drawer-item" key={group.id}><div><strong>{readableGroup(group)}</strong><small>{dateText(group.createdAt)}</small></div>
            <div><b>{money(group.projectedPayoutMinor)}</b><span className="hp4-sub">Henüz borç değil</span></div></div>)}
          {drawerPlans.length===0 && <p className="hp4-sub">Planlanan grup yok.</p>}
          <h3>Kaydedilmiş ödemeler</h3>{drawerPayments.slice(0,7).map((payment) => <div className="hp4-drawer-item" key={payment.id}><div><strong>{dateText(payment.payment_date)}</strong><small>{payment.note || "Ödendi olarak kaydedildi"}</small></div><b>{money(payment.amount_minor)}</b></div>)}
          {drawerPayments.length===0 && <p className="hp4-sub">Ödeme sicilinde kayıt yok.</p>}
        </div></aside></div>}
    {payCandidate && <div className="hp4-payment-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPayCandidate(null); }}>
      <section className="hp4-payment hp4-payment-simple" role="dialog" aria-modal="true" aria-labelledby="hp4-payment-title">
        <div className="hp4-payment-head"><div><span className="hp4-overline">ÖDEME DURUMU</span>
          <h2 id="hp4-payment-title">Ödendi Olarak İşaretle</h2>
          <p>{payCandidate.trainerName} · {monthTitle(payCandidate.completionMonth)}</p></div>
          <button type="button" className="hp4-close" aria-label="Kapat" disabled={busy} onClick={() => setPayCandidate(null)}>×</button>
        </div>
        <div className="hp4-payment-summary"><span>Ödendi olarak kaydedilecek tutar</span>
          <strong>{money(payCandidate.amountMinor)}</strong><small>{payCandidate.count} hakediş kaydı · aynı tamamlanma dönemi</small>
        </div>
        <div className="hp4-payment-fields hp4-payment-simple-fields">
          <label htmlFor="hp4-paid-date">Ödeme tarihi
            <input id="hp4-paid-date" type="date" value={paymentDate} min={paymentEarliestAllowed || undefined}
              max={currentCalendarDay} onChange={(e) => setPaymentDate(e.target.value)} required disabled={busy} />
          </label>
          <p className="hp4-payment-date-help">Tarih varsayılan olarak bugündür. Önceki bir banka ödemesini sonradan kaydediyorsanız gerçek ödeme gününü seçin.</p>
          {!validPaymentDate && <p className="hp4-payment-date-error" role="alert">Geçerli bir ödeme tarihi seçin.
            {paymentEarliestAllowed ? ` Bu dönem için en erken uygun tarih ${dateText(paymentEarliestAllowed)}.` : ""} Gelecek tarihli ödeme kaydı oluşturulamaz.</p>}
        </div>
        <p className="hp4-payment-warning"><strong>Onay:</strong> Bu işlem gerçek hakediş kayıtlarını “Ödendi” olarak günceller.
          Banka transferi yapmaz. Yalnızca ödemenin gerçekten gerçekleştiğinden eminseniz onaylayın.</p>
        {paymentError && <p className="hp4-payment-date-error" role="alert">{paymentError}</p>}
        <div className="hp4-payment-actions">
          <button type="button" className="hp4-btn" disabled={busy} onClick={() => setPayCandidate(null)}>Vazgeç</button>
          <button type="button" className="hp4-btn hp4-btn-primary" disabled={!canSubmitPayment} onClick={() => void submitPayment()}>
            {busy ? "Kaydediliyor…" : "Evet, Ödendi Olarak Kaydet"}</button>
        </div>
      </section>
    </div>}
    <p className="hp4-footer">V4 yerel entegrasyon · Veriler mevcut API'lerden okunur · Örnek kayıt üretilmez · Banka havalesi yapılmaz.</p>
  </main>;
}
