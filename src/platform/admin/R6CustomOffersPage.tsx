import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FamilyOfferWorkspace } from "./FamilyOfferPage";
import "./admin-panel.css";

type CatalogItem = {
  id: string;
  kind: "PACKAGE" | "PRODUCT";
  title: string;
  priceMinor: number;
  currency: string;
  subtype?: string | null;
  imageReference?: string | null;
};

type Offer = {
  id: string;
  title: string;
  customerEmail: string;
  status: string;
  listGrossMinor: number;
  specialGrossMinor: number;
  discountMinor: number;
  discountPercentBps: number;
  expiresAt?: string | null;
  createdAt?: string | null;
  lines: Array<{ titleSnapshot: string; quantity: number; listGrossMinor: number; specialGrossMinor: number; vatMinor: number; grossMinor: number }>;
};

type FamilyOfferListItem = {
  id: string;
  title?: string;
  status?: string;
  customerUserId?: string;
  customer_user_id?: string;
  createdAt?: string;
  created_at?: string;
};

type UserRow = { userId: string; displayName: string; email: string };
type ViewMode = "MANAGE" | "CREATE";
type QuoteType = "CUSTOM" | "FAMILY";
type DateFilter = "30" | "MONTH" | "90" | "ALL";
type KindFilter = "ALL" | "PACKAGE" | "PRODUCT";
type DraftLine = { key: string; kind: "PACKAGE" | "PRODUCT"; reference: string; title: string; unitMinor: number; currency: string; quantity: number };

const money = (minor: number | null | undefined, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((Number(minor) || 0) / 100);

const statusLabel: Record<string, string> = {
  DRAFT: "Taslak",
  SENT: "Gönderildi",
  ACCEPTED: "Kabul edildi",
  MATERIALIZED: "Satın alındı",
  PURCHASED: "Satın alındı",
  CANCELLED: "İptal",
  EXPIRED: "Süresi doldu",
};

const statusClass = (status: string) => {
  if (["ACCEPTED", "MATERIALIZED", "PURCHASED"].includes(status)) return "is-accepted";
  if (status === "SENT") return "is-sent";
  if (status === "DRAFT") return "is-draft";
  if (status === "CANCELLED") return "is-cancelled";
  return "is-expired";
};

const parseTlToMinor = (value: string) => {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
};

const catalogTypeMeta = (item: CatalogItem) => {
  const code = item.kind === "PACKAGE" ? "PAKET" : String(item.subtype || "PRODUCT").toUpperCase();
  const css =
    code === "BOOK" ? "is-book" :
    code === "SOFTWARE" ? "is-software" :
    code === "TRAINING_SERVICE" || code === "SERVICE" ? "is-service" :
    code === "PAKET" || code === "PACKAGE" ? "is-package" :
    "is-product";
  return { code, css };
};

const catalogFallback = (item: CatalogItem) => {
  if (item.kind === "PACKAGE") return "P";
  const code = String(item.subtype || "ÜRÜN").toUpperCase();
  if (code === "BOOK") return "K";
  if (code === "SOFTWARE") return "Y";
  if (code === "TRAINING_SERVICE" || code === "SERVICE") return "E";
  return "Ü";
};

function OfferIcon({ name }: { name: "plus" | "download" | "draft" | "send" | "check" | "total" | "search" | "customer" | "family" | "box" | "tag" | "clock" | "review" | "trash" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {name === "plus" && <><path {...common} d="M12 5v14" /><path {...common} d="M5 12h14" /></>}
    {name === "download" && <><path {...common} d="M12 3v12" /><path {...common} d="m7 10 5 5 5-5" /><path {...common} d="M5 20h14" /></>}
    {name === "draft" && <><path {...common} d="M5 4h14v16H5z" /><path {...common} d="M8 8h8M8 12h6" /></>}
    {name === "send" && <><path {...common} d="M4 12 20 4l-5 16-3-6-8-2Z" /><path {...common} d="m12 14 4-6" /></>}
    {name === "check" && <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="m8 12 2.5 2.5L16 9" /></>}
    {name === "total" && <><path {...common} d="M5 6h14v12H5z" /><path {...common} d="M8 10h8M8 14h5" /></>}
    {name === "search" && <><circle {...common} cx="11" cy="11" r="7" /><path {...common} d="m20 20-4-4" /></>}
    {name === "customer" && <><circle {...common} cx="12" cy="8" r="3.4" /><path {...common} d="M5.5 20c.7-4.2 2.9-6.3 6.5-6.3s5.8 2.1 6.5 6.3" /></>}
    {name === "family" && <><circle {...common} cx="8" cy="8" r="3" /><circle {...common} cx="16.5" cy="9" r="2.5" /><path {...common} d="M3 20c.7-4 2.5-6 5-6s4.3 2 5 6" /><path {...common} d="M13 20c.4-2.8 1.7-4.3 3.5-4.3S19.6 17.2 20 20" /></>}
    {name === "box" && <><path {...common} d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path {...common} d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>}
    {name === "tag" && <><path {...common} d="M4 5h7l9 9-6 6-9-9V5Z" /><circle {...common} cx="8" cy="9" r="1" /></>}
    {name === "clock" && <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 7v5l3 2" /></>}
    {name === "review" && <><path {...common} d="M5 4h14v16H5z" /><path {...common} d="M8 8h8M8 12h8M8 16h5" /></>}
    {name === "trash" && <><path {...common} d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6.5 7l1 13h9l1-13" /></>}
  </svg>;
}

export function R6CustomOffersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFamily = searchParams.get("tab") === "family";

  const [view, setView] = useState<ViewMode>(requestedFamily ? "CREATE" : "MANAGE");
  const [quoteType, setQuoteType] = useState<QuoteType>(requestedFamily ? "FAMILY" : "CUSTOM");
  const [step, setStep] = useState(0);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [familyOffers, setFamilyOffers] = useState<FamilyOfferListItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | QuoteType>("ALL");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerUserId, setCustomerUserId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [specialTotalText, setSpecialTotalText] = useState("");

  const load = async () => {
    setLoading(true);
    const [offerResponse, familyResponse, packageResponse, productResponse, userResponse] = await Promise.all([
      fetch("/api/admin/r6-custom-offers", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/family-offers", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/packages", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/products", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/users?role=STUDENT&pageSize=100", { credentials: "same-origin", cache: "no-store" }),
    ]);

    const offerBody = await offerResponse.json().catch(() => ({}));
    const familyBody = await familyResponse.json().catch(() => ({}));
    const packageBody = await packageResponse.json().catch(() => ({}));
    const productBody = await productResponse.json().catch(() => ({}));
    const userBody = await userResponse.json().catch(() => ({}));

    setOffers(offerBody.offers || []);
    setFamilyOffers(familyBody.offers || []);
    setUsers(userBody.users || []);

    const packageRows: CatalogItem[] = (packageBody.packages || []).flatMap((item: any) =>
      (item.versions || [])
        .filter((version: any) => version.status === "PUBLISHED")
        .map((version: any) => ({
          id: version.id,
          kind: "PACKAGE" as const,
          title: version.title,
          priceMinor: Number(version.priceMinor) || 0,
          currency: version.currency || "TRY",
          subtype: "PACKAGE",
          imageReference: version.imageReference || version.image_reference || item.imageReference || item.image_reference || null,
        }))
    );

    const productRows: CatalogItem[] = (productBody.products || [])
      .filter((item: any) => item.isActive && ["BOOK", "SOFTWARE", "TRAINING_SERVICE"].includes(item.r6ProductType))
      .map((item: any) => ({
        id: item.id,
        kind: "PRODUCT" as const,
        title: item.title || item.name || "Ürün",
        priceMinor: Number(item.listGrossMinor) || 0,
        currency: item.currency || "TRY",
        subtype: item.r6ProductType || item.productType || "PRODUCT",
        imageReference: item.imageReference || item.image_reference || null,
      }));

    setCatalog([...packageRows, ...productRows]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (requestedFamily) {
      setView("CREATE");
      setQuoteType("FAMILY");
    }
  }, [requestedFamily]);

  const normalTotal = useMemo(() => lines.reduce((sum, line) => sum + line.unitMinor * line.quantity, 0), [lines]);
  const specialMinorInput = parseTlToMinor(specialTotalText);
  const defaultSpecialTotal = Math.round(normalTotal * (1 - discountPercent / 100));
  const specialTotal = Math.min(normalTotal, specialMinorInput ?? defaultSpecialTotal);
  const discountMinor = Math.max(0, normalTotal - specialTotal);
  const derivedDiscountPercent = normalTotal ? Math.round((discountMinor / normalTotal) * 100) : 0;

  const selectedCustomer = useMemo(() => users.find((user) => user.userId === customerUserId), [customerUserId, users]);

  const filteredUsers = useMemo(() => {
    const q = customerSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return users.slice(0, 8);
    return users.filter((user) => `${user.displayName} ${user.email}`.toLocaleLowerCase("tr-TR").includes(q)).slice(0, 12);
  }, [customerSearch, users]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLocaleLowerCase("tr-TR");
    return catalog.filter((item) => {
      if (kindFilter !== "ALL" && item.kind !== kindFilter) return false;
      if (q && !`${item.title} ${item.subtype || ""}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    }).slice(0, 40);
  }, [catalog, catalogSearch, kindFilter]);

  const combinedRows = useMemo(() => {
    const standardRows = offers.map((offer) => ({
      id: offer.id,
      type: "CUSTOM" as QuoteType,
      title: offer.title,
      customer: offer.customerEmail,
      amountMinor: offer.specialGrossMinor,
      status: offer.status,
      createdAt: offer.createdAt || null,
      expiresAt: offer.expiresAt || null,
    }));

    const familyRows = familyOffers.map((offer: any) => {
      const userId = offer.customerUserId || offer.customer_user_id || "";
      const user = users.find((row) => row.userId === userId);
      const revision = offer.revision || offer.currentRevision || null;
      const amountMinor = revision?.pricing?.finalFamilyPriceMinor ?? offer.finalFamilyPriceMinor ?? null;
      return {
        id: String(offer.id),
        type: "FAMILY" as QuoteType,
        title: offer.title || "Aile Teklifi",
        customer: user?.displayName || user?.email || "Aile müşterisi",
        amountMinor: amountMinor == null ? null : Number(amountMinor),
        status: String(offer.status || "DRAFT"),
        createdAt: offer.createdAt || offer.created_at || null,
        expiresAt: null,
      };
    });

    return [...standardRows, ...familyRows];
  }, [familyOffers, offers, users]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const cutoff30 = now.getTime() - 30 * 86400000;
    const cutoff90 = now.getTime() - 90 * 86400000;

    return combinedRows.filter((row) => {
      if (typeFilter !== "ALL" && row.type !== typeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (q && !`${row.title} ${row.customer} ${row.id}`.toLocaleLowerCase("tr-TR").includes(q)) return false;

      if (dateFilter !== "ALL" && row.createdAt) {
        const time = new Date(row.createdAt).getTime();
        if (Number.isFinite(time)) {
          if (dateFilter === "30" && time < cutoff30) return false;
          if (dateFilter === "90" && time < cutoff90) return false;
          if (dateFilter === "MONTH" && time < monthStart) return false;
        }
      }
      return true;
    });
  }, [combinedRows, dateFilter, search, statusFilter, typeFilter]);

  const counts = useMemo(() => ({
    draft: combinedRows.filter((offer) => offer.status === "DRAFT").length,
    sent: combinedRows.filter((offer) => offer.status === "SENT").length,
    accepted: combinedRows.filter((offer) => ["ACCEPTED", "MATERIALIZED", "PURCHASED"].includes(offer.status)).length,
    total: combinedRows.length,
  }), [combinedRows]);

  const changeView = (next: ViewMode) => {
    setView(next);
    if (next === "MANAGE") {
      const updated = new URLSearchParams(searchParams);
      updated.delete("tab");
      setSearchParams(updated, { replace: true });
    }
  };

  const chooseQuoteType = (next: QuoteType) => {
    setQuoteType(next);
    const updated = new URLSearchParams(searchParams);
    if (next === "FAMILY") updated.set("tab", "family"); else updated.delete("tab");
    setSearchParams(updated, { replace: true });
  };

  const resetStandardDraft = () => {
    setStep(0);
    setCustomerSearch("");
    setCustomerUserId("");
    setCustomerEmail("");
    setTitle("");
    setCatalogSearch("");
    setKindFilter("ALL");
    setLines([]);
    setExpiresAt("");
    setDiscountPercent(0);
    setSpecialTotalText("");
    setMessage("");
  };

  const selectCustomer = (user: UserRow) => {
    setCustomerUserId(user.userId);
    setCustomerEmail(user.email);
  };

  const addLine = (item: CatalogItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.kind === item.kind && line.reference === item.id);
      if (existing) return current.map((line) => line.key === existing.key ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line);
      return [...current, { key: crypto.randomUUID(), kind: item.kind, reference: item.id, title: item.title, unitMinor: item.priceMinor, currency: item.currency, quantity: 1 }];
    });
    setSpecialTotalText("");
  };

  const updateLineQuantity = (key: string, quantity: number) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, quantity: Math.max(1, Math.min(99, quantity || 1)) } : line));
    setSpecialTotalText("");
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
    setSpecialTotalText("");
  };

  const distributeSpecialTotals = () => {
    if (!normalTotal || !lines.length) return lines.map(() => 0);
    let remaining = specialTotal;
    return lines.map((line, index) => {
      const lineList = line.unitMinor * line.quantity;
      if (index === lines.length - 1) return Math.max(0, remaining);
      const share = Math.round((lineList / normalTotal) * specialTotal);
      remaining -= share;
      return Math.max(0, share);
    });
  };

  const createStandardOffer = async () => {
    setMessage("");
    if (!title.trim() || !customerEmail.trim() || !lines.length) {
      setMessage("Müşteri e-postası, teklif başlığı ve en az bir teklif kalemi zorunludur.");
      return;
    }

    const distributed = distributeSpecialTotals();
    const body = {
      title: title.trim(),
      customerUserId: customerUserId || null,
      customerEmail: customerEmail.trim(),
      expiresAt: expiresAt || null,
      lines: lines.map((line, index) => ({
        lineKind: line.kind,
        packageVersionId: line.kind === "PACKAGE" ? line.reference : undefined,
        physicalProductId: line.kind === "PRODUCT" ? line.reference : undefined,
        quantity: line.quantity,
        listGrossMinor: line.unitMinor * line.quantity,
        specialGrossMinor: distributed[index],
        lineOrder: index,
      })),
    };

    const response = await fetch("/api/admin/r6-custom-offers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Teklif oluşturulamadı.");
      return;
    }

    setMessage(`Teklif oluşturuldu${result.offerUrl ? ` · ${result.offerUrl}` : ""}`);
    resetStandardDraft();
    setView("MANAGE");
    await load();
  };

  const action = async (id: string, actionName: string) => {
    const response = await fetch(`/api/admin/r6-custom-offers/${id}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${statusLabel[result.offer?.status || actionName] || actionName} işlemi tamamlandı.` : result.error || "İşlem başarısız.");
    if (response.ok) await load();
  };

  const exportCsv = () => {
    const rows = [
      ["Teklif", "Müşteri", "Tür", "Tutar", "Durum"],
      ...filteredRows.map((row) => [
        row.title,
        row.customer,
        row.type === "FAMILY" ? "Aile Teklifi" : "Standart Teklif",
        row.amountMinor == null ? "" : (row.amountMinor / 100).toFixed(2).replace(".", ","),
        statusLabel[row.status] || row.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fixoku-teklifler.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const canNext = quoteType === "FAMILY" || (
    step === 0 ? Boolean(customerEmail.trim() && title.trim()) :
    step === 1 ? lines.length > 0 :
    step === 2 ? specialTotal >= 0 && specialTotal <= normalTotal :
    true
  );

  const next = () => {
    if (quoteType === "FAMILY") return;
    if (step < 3) setStep((value) => value + 1);
    else void createStandardOffer();
  };

  const previous = () => {
    if (quoteType === "FAMILY") return;
    setStep((value) => Math.max(0, value - 1));
  };

  return <main className="platform-foundation-panel admin-panel offer-center-v3">
    <header className="offer-v3-hero">
      <div><span>SATIŞLAR</span><h1>Teklif Merkezi</h1><p>Teklifleri yönetin veya birkaç adımda yeni bir teklif hazırlayın.</p></div>
      <div className="offer-v3-hero-actions">
        <button type="button" onClick={exportCsv}><OfferIcon name="download" />Dışa aktar</button>
        <button type="button" className="is-primary" onClick={() => { resetStandardDraft(); setQuoteType("CUSTOM"); setView("CREATE"); }}><OfferIcon name="plus" />Yeni teklif</button>
      </div>
    </header>

    <div className="offer-v3-page-switch" role="tablist" aria-label="Teklif merkezi görünümü">
      <button type="button" className={view === "MANAGE" ? "is-active" : ""} onClick={() => changeView("MANAGE")}>Teklifler</button>
      <button type="button" className={view === "CREATE" ? "is-active" : ""} onClick={() => setView("CREATE")}>Yeni teklif oluştur</button>
    </div>

    {message && <p className="admin-inline-status offer-v3-message" role="status">{message}</p>}

    {view === "MANAGE" ? <>
      <section className="offer-v3-kpis" aria-label="Teklif özeti">
        <article><i className="is-purple"><OfferIcon name="draft" /></i><div><span>Taslak</span><strong>{counts.draft}</strong><small>Hazırlanıyor</small></div></article>
        <article><i className="is-blue"><OfferIcon name="send" /></i><div><span>Gönderildi</span><strong>{counts.sent}</strong><small>Yanıt bekliyor</small></div></article>
        <article><i className="is-green"><OfferIcon name="check" /></i><div><span>Kabul edildi</span><strong>{counts.accepted}</strong><small>Siparişe dönüştü</small></div></article>
        <article><i className="is-orange"><OfferIcon name="total" /></i><div><span>Toplam teklif</span><strong>{counts.total}</strong><small>Tüm kayıtlar</small></div></article>
      </section>

      <section className="panel-card offer-v3-list-card">
        <div className="offer-v3-filters">
          <label className="offer-v3-search"><OfferIcon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Teklif, müşteri veya e-posta ara..." /></label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}><option value="ALL">Tüm teklif türleri</option><option value="CUSTOM">Standart teklif</option><option value="FAMILY">Aile teklifi</option></select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tüm durumlar</option><option value="DRAFT">Taslak</option><option value="SENT">Gönderildi</option><option value="ACCEPTED">Kabul edildi</option><option value="MATERIALIZED">Satın alındı</option><option value="CANCELLED">İptal</option><option value="EXPIRED">Süresi doldu</option></select>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}><option value="30">Son 30 gün</option><option value="MONTH">Bu ay</option><option value="90">Son 90 gün</option><option value="ALL">Tüm zamanlar</option></select>
        </div>

        <div className="offer-v3-table-wrap">
          <table className="offer-v3-table">
            <thead><tr><th>Teklif</th><th>Müşteri</th><th>Tür</th><th>Tutar</th><th>Geçerlilik</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
              {filteredRows.map((row) => <tr key={`${row.type}-${row.id}`}>
                <td><strong>{row.title}</strong><small>#{row.id.slice(0, 8)}</small></td>
                <td>{row.customer}</td>
                <td><span className={`offer-v3-type ${row.type === "FAMILY" ? "is-family" : ""}`}>{row.type === "FAMILY" ? "Aile teklifi" : "Standart teklif"}</span></td>
                <td><strong>{row.amountMinor == null ? "—" : money(row.amountMinor)}</strong></td>
                <td>{row.expiresAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(row.expiresAt)) : "—"}</td>
                <td><span className={`offer-v3-status ${statusClass(row.status)}`}>{statusLabel[row.status] || row.status}</span></td>
                <td>{row.type === "CUSTOM" ? <div className="offer-v3-row-actions">{row.status === "DRAFT" && <button type="button" onClick={() => void action(row.id, "send")}>Gönder</button>}{row.status === "SENT" && <button type="button" onClick={() => void action(row.id, "cancel")}>İptal</button>}{!["DRAFT", "SENT"].includes(row.status) && <span>—</span>}</div> : <button type="button" className="offer-v3-open-family" onClick={() => { chooseQuoteType("FAMILY"); setView("CREATE"); }}>Aç</button>}</td>
              </tr>)}
            </tbody>
          </table>

          {!loading && !filteredRows.length && <div className="offer-v3-empty">
            <OfferIcon name="review" />
            <strong>{combinedRows.length ? "Filtreye uygun teklif bulunamadı" : "Henüz teklif oluşturulmadı"}</strong>
            <span>{combinedRows.length ? "Filtreleri değiştirerek tekrar deneyin." : "İlk teklifinizi oluşturduğunuzda tüm takip burada yapılacak."}</span>
            {!combinedRows.length && <button type="button" onClick={() => setView("CREATE")}>Yeni teklif oluştur</button>}
          </div>}
          {loading && <div className="offer-v3-empty"><strong>Teklifler yükleniyor…</strong></div>}
        </div>
      </section>
    </> : <>
      <section className="panel-card offer-v3-builder">
        <div className="offer-v3-builder-head">
          <div><strong>Yeni teklif oluştur</strong><span>Sadece içinde bulunduğunuz adımı tamamlayın; diğer alanlar sizi beklemiyor.</span></div>
          <button type="button" onClick={() => changeView("MANAGE")}>Vazgeç</button>
        </div>

        <div className="offer-v3-type-choice" aria-label="Teklif türü">
          <button type="button" className={quoteType === "CUSTOM" ? "is-active" : ""} onClick={() => chooseQuoteType("CUSTOM")}><i><OfferIcon name="customer" /></i><span><strong>Standart teklif</strong><small>Tek müşteri için paket veya ürün bazlı özel fiyat.</small></span></button>
          <button type="button" className={quoteType === "FAMILY" ? "is-active" : ""} onClick={() => chooseQuoteType("FAMILY")}><i><OfferIcon name="family" /></i><span><strong>Aile teklifi</strong><small>Birden fazla çocuk / öğrenci için tek aile teklifi.</small></span></button>
        </div>

        {quoteType === "FAMILY" ? <div className="offer-v3-family-bridge">
          <div className="offer-v3-family-title"><span>AİLE TEKLİFİ ÇALIŞMA ALANI</span><h2>Aile teklifini hazırlayın</h2><p>Mevcut çoklu çocuk, sınıf uygunluğu, sunucu fiyatlandırması ve revizyon kuralları korunur.</p></div>
          <FamilyOfferWorkspace embedded />
        </div> : <>
          <div className="offer-v3-stepper">
            {[
              ["Müşteri", "Kim için?"],
              ["İçerik", "Ne teklif ediyoruz?"],
              ["Fiyat & süre", "Koşullar"],
              ["Kontrol & oluştur", "Son kontrol"],
            ].map(([label, sub], index) => <button type="button" key={label} className={`${index === step ? "is-active" : ""} ${index < step ? "is-done" : ""}`} onClick={() => index <= step && setStep(index)}><b>{index < step ? "✓" : index + 1}</b><span><strong>{label}</strong><small>{sub}</small></span></button>)}
          </div>

          <div className="offer-v3-stage">
            <div className="offer-v3-stage-main">
              {step === 0 && <section className="offer-v3-panel">
                <h2>Müşteriyi seçin</h2><p>Mevcut müşteriyi arayın veya yalnız e-posta ile teklif hazırlayın.</p>
                <label className="offer-v3-customer-search"><OfferIcon name="search" /><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="İsim veya e-posta ile müşteri ara..." /></label>
                <div className="offer-v3-customer-results">
                  {filteredUsers.map((user) => <button type="button" key={user.userId} className={customerUserId === user.userId ? "is-selected" : ""} onClick={() => selectCustomer(user)}><i>{user.displayName.split(/\s+/).slice(0, 2).map((piece) => piece[0]).join("").toLocaleUpperCase("tr-TR")}</i><span><strong>{user.displayName}</strong><small>{user.email}</small></span><b>{customerUserId === user.userId ? "Seçildi" : "Seç"}</b></button>)}
                </div>
                <div className="offer-v3-form-grid">
                  <label>Seçili müşteri<input value={selectedCustomer?.displayName || ""} readOnly placeholder="Kayıtlı müşteri seçilmedi" /></label>
                  <label>Müşteri e-postası<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="musteri@ornek.com" /></label>
                  <label className="is-wide">Teklif başlığı<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Eylül özel eğitim teklifi" /></label>
                </div>
              </section>}

              {step === 1 && <section className="offer-v3-panel">
                <h2>Teklif içeriğini oluşturun</h2><p>Katalogdan paket veya ürün ekleyin. Aynı içerik tekrar eklenirse adedi artırılır.</p>
                <div className="offer-v3-catalog-layout">
                  <aside>
                    <strong>İçerik türü</strong>
                    <label><input type="radio" checked={kindFilter === "ALL"} onChange={() => setKindFilter("ALL")} /> Tümü</label>
                    <label><input type="radio" checked={kindFilter === "PACKAGE"} onChange={() => setKindFilter("PACKAGE")} /> Paketler</label>
                    <label><input type="radio" checked={kindFilter === "PRODUCT"} onChange={() => setKindFilter("PRODUCT")} /> Ürünler</label>
                  </aside>
                  <div>
                    <label className="offer-v3-catalog-search"><OfferIcon name="search" /><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Paket veya ürün ara..." /></label>
                    <div className="offer-v3-catalog-grid">{filteredCatalog.map((item) => {
                      const meta = catalogTypeMeta(item);
                      return <article key={`${item.kind}-${item.id}`} className="offer-v32-product-card">
                        <div className="offer-v32-product-media">
                          {item.imageReference ? <>
                            <img src={item.imageReference} alt="" loading="lazy" />
                            <div className="offer-v32-image-zoom" aria-hidden="true"><img src={item.imageReference} alt="" /></div>
                          </> : <div className={`offer-v32-product-placeholder ${meta.css}`} aria-label="Ürün görseli eklenmemiş"><b>{catalogFallback(item)}</b><small>Görsel eklenmemiş</small></div>}
                        </div>
                        <div className="offer-v32-product-copy">
                          <span className={`offer-v32-type-badge ${meta.css}`}>{meta.code}</span>
                          <h3>{item.title}</h3>
                          <strong>{money(item.priceMinor, item.currency)}</strong>
                        </div>
                        <button type="button" onClick={() => addLine(item)} aria-label={`${item.title} ekle`}><OfferIcon name="plus" /></button>
                      </article>;
                    })}</div>
                  </div>
                </div>
                <div className="offer-v3-selected">
                  <header><strong>Teklife eklenenler</strong><span>{lines.length} kalem</span></header>
                  {!lines.length ? <p>Henüz içerik eklenmedi.</p> : lines.map((line) => <div key={line.key}><span><strong>{line.title}</strong><small>{line.kind === "PACKAGE" ? "Paket" : "Ürün"} · {money(line.unitMinor, line.currency)}</small></span><input type="number" min="1" max="99" value={line.quantity} onChange={(event) => updateLineQuantity(line.key, Number(event.target.value))} /><b>{money(line.unitMinor * line.quantity, line.currency)}</b><button type="button" onClick={() => removeLine(line.key)}><OfferIcon name="trash" /></button></div>)}
                </div>
              </section>}

              {step === 2 && <section className="offer-v3-panel">
                <h2>Fiyat ve geçerlilik</h2><p>İndirim oranını veya özel toplamı belirleyin; teklifin son geçerlilik tarihini seçin.</p>
                <div className="offer-v3-price-grid">
                  <div className="offer-v3-price-card">
                    <h3>Fiyatlandırma</h3>
                    <div className="offer-v3-form-grid">
                      <label>Liste toplamı<input value={money(normalTotal)} readOnly /></label>
                      <label>Özel toplam (TL)<input inputMode="decimal" value={specialTotalText} onChange={(event) => setSpecialTotalText(event.target.value)} placeholder={(specialTotal / 100).toFixed(2).replace(".", ",")} /></label>
                    </div>
                    <label className="offer-v3-range">İndirim oranı <strong>%{derivedDiscountPercent}</strong><input type="range" min="0" max="50" value={derivedDiscountPercent} onChange={(event) => { const percent = Number(event.target.value); setDiscountPercent(percent); setSpecialTotalText(((normalTotal * (1 - percent / 100)) / 100).toFixed(2).replace(".", ",")); }} /></label>
                    <div className="offer-v3-discount-pills">{[0, 5, 10, 15, 20].map((value) => <button type="button" key={value} className={derivedDiscountPercent === value ? "is-active" : ""} onClick={() => { setDiscountPercent(value); setSpecialTotalText(((normalTotal * (1 - value / 100)) / 100).toFixed(2).replace(".", ",")); }}>%{value}</button>)}</div>
                  </div>
                  <div className="offer-v3-price-card">
                    <h3>Geçerlilik</h3>
                    <label className="offer-v3-single-field">Son geçerlilik tarihi<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
                    <div className="offer-v3-info"><OfferIcon name="clock" /><span>Geçerlilik tarihi zorunlu değildir. Boş bırakırsanız teklif mevcut sunucu kurallarıyla oluşturulur.</span></div>
                  </div>
                </div>
              </section>}

              {step === 3 && <section className="offer-v3-panel">
                <h2>Kontrol edin ve oluşturun</h2><p>Teklif verilerini son kez kontrol edin. Oluşturma sonrası mevcut gönderme akışını kullanabilirsiniz.</p>
                <div className="offer-v3-review">
                  <div><span>MÜŞTERİ</span><strong>{selectedCustomer?.displayName || "Kayıtlı müşteri seçilmedi"}</strong><small>{customerEmail || "E-posta bekleniyor"}</small></div>
                  <div><span>TEKLİF</span><strong>{title || "Başlık girilmedi"}</strong><small>{lines.length} kalem · {money(specialTotal)}</small></div>
                  <div><span>FİYAT</span><strong>{money(normalTotal)} → {money(specialTotal)}</strong><small>{money(discountMinor)} indirim · %{derivedDiscountPercent}</small></div>
                  <div><span>GEÇERLİLİK</span><strong>{expiresAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(expiresAt)) : "Süre sınırı seçilmedi"}</strong><small>Teklif oluşturulduktan sonra gönderilebilir.</small></div>
                </div>
              </section>}
            </div>

            <aside className="offer-v3-live-summary">
              <span>TEKLİF ÖZETİ</span><h2>{title.trim() || "Yeni teklif"}</h2><p>{selectedCustomer?.displayName || customerEmail || "Müşteri seçilmedi"}</p>
              <dl><div><dt>Kalem sayısı</dt><dd>{lines.length}</dd></div><div><dt>Liste toplamı</dt><dd>{money(normalTotal)}</dd></div><div><dt>İndirim</dt><dd>{money(discountMinor)}</dd></div><div className="is-total"><dt>Teklif toplamı</dt><dd>{money(specialTotal)}</dd></div></dl>
              <div className="offer-v3-summary-note">Ödeme bu ekranda alınmaz. Teklif kabulü sonrası satın alma mevcut ticaret akışında ilerler.</div>
            </aside>
          </div>

          <footer className="offer-v3-footer">
            <span>{step + 1} / 4 · {["Müşteri bilgilerini tamamlayın", "Teklife en az bir içerik ekleyin", "Fiyat ve geçerlilik koşullarını belirleyin", "Son kontrolü yapın"][step]}</span>
            <div><button type="button" onClick={previous} disabled={step === 0}>Geri</button><button type="button" className="is-primary" onClick={next} disabled={!canNext}>{step === 3 ? "Teklifi oluştur" : "Devam et"}</button></div>
          </footer>
        </>}
      </section>
    </>}
  </main>;
}
