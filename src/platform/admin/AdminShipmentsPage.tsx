import { useEffect, useMemo, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import "./admin-panel.css";
import "./fixoku-cargo-owner-v2.css";

/* FIXOKU_CARGO_OWNER_V2: UI-only local acceptance.
   Demo mutations go to localStorage only. Real API access is GET-only.
   No shipment POST/PATCH, inventory mutation, or provider request. */

type Status = "preparing" | "integration" | "packed" | "shipped" | "transit" | "delivered" | "failed" | "return" | "canceled" | "waiting";
type Kind = "student" | "trainer";
type Tab = "all" | "action" | "transit" | "complete" | "issue";
type Mode = "demo" | "real";
type Event = { at: string; title: string; detail: string };
type Shipment = {
  id: string; orderId: string; person: string; kind: Kind; product: string; carrier: string;
  status: Status; tracking: string; createdAt: string; updatedAt: string;
  city: string; district: string; note: string; events: Event[]; demo: boolean;
};

type APIShipment = {
  id?: unknown; orderId?: unknown; status?: unknown;
  beneficiaryStudentName?: unknown; trainerName?: unknown; carrier?: unknown;
  trackingNumber?: unknown; createdAt?: unknown; shippedAt?: unknown; deliveredAt?: unknown;
  items?: unknown;
};

const STORAGE = "fixoku-cargo-owner-v2-demo-only";
const statusText: Record<Status, string> = {
  waiting: "Bekliyor", preparing: "Hazırlanıyor", integration: "Entegrasyon Bekliyor",
  packed: "Paketlendi", shipped: "Kargoya Verildi", transit: "Yolda",
  delivered: "Teslim Edildi", failed: "Teslim Edilemedi", return: "İade Sürecinde", canceled: "İptal Edildi",
};
const statusGroup: Record<Status, Tab> = {
  waiting: "action", preparing: "action", integration: "action", packed: "action",
  shipped: "transit", transit: "transit", delivered: "complete", failed: "issue", return: "issue", canceled: "issue",
};
const tabs: { key: Tab; text: string }[] = [
  { key: "all", text: "Tümü" }, { key: "action", text: "İşlem Bekleyen" },
  { key: "transit", text: "Yolda" }, { key: "complete", text: "Teslim Edilen" },
  { key: "issue", text: "Sorunlu / İptal" },
];
const carriers = ["Sendeo", "Yurtiçi Kargo", "MNG Kargo", "Aras Kargo", "PTT Kargo"];
const statusChoices = Object.keys(statusText) as Status[];
const text = (v: unknown, fallback = ""): string => typeof v === "string" ? v : fallback;
const safeDate = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }); };
const isoDate = (offsetDays: number) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);
const lower = (s: string) => s.toLocaleLowerCase("tr-TR");

const demoSpecs: Array<[string, string, string, string, Status, string, number, string, string, string]> = [
  ["KG-2026-001", "Ali Asaf USTA", "Fixoku Hızlı Okuma Kitabı", "Sendeo", "preparing", "", -1, "İstanbul", "Ümraniye", "Paketleme ve stok hazırlığı bekleniyor"],
  ["KG-2026-002", "Hatice Kübra USTA", "Paragraf Gelişim Seti", "Yurtiçi Kargo", "integration", "", -2, "İstanbul", "Kadıköy", "Kargo firması bağlantısı henüz yapılandırılmadı"],
  ["KG-2026-003", "Deniz ARSLAN", "Fixoku Kitap ve Dijital Destek", "MNG Kargo", "shipped", "TEST-MNG-12650078", -2, "Ankara", "Çankaya", "Şubeye teslim edildi"],
  ["KG-2026-004", "Selin YILMAZ", "Hızlı Okuma Başlangıç Paketi", "Aras Kargo", "transit", "TEST-AR-20261004", -3, "Bursa", "Nilüfer", "Transfer merkezinde"],
  ["KG-2026-005", "Mehmet KAYA", "Öğrenci Çalışma Defteri", "Sendeo", "delivered", "TEST-SND-909021", -7, "İzmir", "Bornova", "Alıcıya teslim edildi"],
  ["KG-2026-006", "Zeynep DEMİR", "Fixoku Okuma Seti", "Yurtiçi Kargo", "return", "TEST-YT-330021", -5, "İstanbul", "Ataşehir", "Adres sorunundan dolayı iade süreci başladı"],
  ["KG-2026-007", "Ahmet KARA", "Eğitim Materyali Paketi", "Aras Kargo", "failed", "TEST-AR-0709", -2, "Antalya", "Muratpaşa", "Alıcıya ulaşılamadı"],
  ["KG-2026-008", "Ayşe ÇELİK", "Fixoku İlkokul Çalışma Kitabı", "PTT Kargo", "canceled", "", -4, "Kocaeli", "İzmit", "Müşteri talebi üzerine iptal edildi"],
];

function makeDemo(): Shipment[] {
  return demoSpecs.map(([id, person, product, carrier, status, tracking, days, city, district, note]) => {
    const date = isoDate(days);
    return { id, orderId: id, person, kind: "student", product, carrier, status, tracking,
      city, district, note, createdAt: date, updatedAt: date, demo: true,
      events: [{ at: date, title: "Test gönderisi oluşturuldu", detail: note }],
    };
  });
}
function readDemo(): Shipment[] {
  try {
    const raw = window.localStorage.getItem(STORAGE);
    if (!raw) return makeDemo();
    const items = JSON.parse(raw) as unknown;
    if (Array.isArray(items) && items.length < 100 && items.every((i) => i && typeof i === "object" && typeof i.id === "string" && i.demo === true && statusChoices.includes(i.status))) return items as Shipment[];
  } catch { /* reset invalid local preview */ }
  return makeDemo();
}
function convertAPI(items: APIShipment[], kind: Kind): Shipment[] {
  return items.filter((x) => x && typeof x === "object").map((x, idx) => {
    const original = text(x.status).toUpperCase();
    const mapped: Status = ({ WAITING: "waiting", PREPARING: "preparing", PACKED: "packed", SHIPPED: "shipped", DELIVERED: "delivered", RETURNED: "return", CANCELLED: "canceled" } as Record<string, Status>)[original] || "waiting";
    const pieces = Array.isArray(x.items) ? x.items as Array<{ titleSnapshot?: unknown; quantity?: unknown }> : [];
    const product = pieces.map(i => `${text(i.titleSnapshot, "Ürün")} × ${Number(i.quantity || 1)}`).join(" · ") || "Ürün bilgisi bulunmuyor";
    const date = text(x.createdAt, today());
    const last = text(x.deliveredAt) || text(x.shippedAt) || date;
    return { id: text(x.id, `${kind}-${idx}`), orderId: text(x.orderId, ""), person: kind === "student" ? text(x.beneficiaryStudentName, "Öğrenci") : text(x.trainerName, "Eğitmen"), kind,
      product, carrier: text(x.carrier, "Belirtilmedi"), status: mapped, tracking: text(x.trackingNumber),
      createdAt: date, updatedAt: last, city: "", district: "", note: "Gerçek sistemden okunmuştur. Bu kabul sürümünde işlem yapılamaz.", demo: false,
      events: [{ at: date, title: "Gönderi kaydı", detail: "Gerçek kargo kaydı, yalnızca görüntülenebilir." }],
    };
  });
}

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    truck: <><path d="M2 7h12v11H2zM14 11h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 6-6"/></>,
    alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12-2"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    shield: <><path d="M12 2 20 6v6c0 5-4 8-8 10-4-2-8-5-8-10V6l8-4Z"/><path d="m8 12 3 3 5-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
}

export function AdminShipmentsPage() {
  const [mode, setMode] = useState<Mode>("demo");
  const [demo, setDemo] = useState<Shipment[]>(readDemo);
  const [real, setReal] = useState<Shipment[]>([]);
  const [realState, setRealState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [realMessage, setRealMessage] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [carrier, setCarrier] = useState("all");
  const [status, setStatus] = useState("all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [kind, setKind] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<Status>("preparing");
  const [draftTracking, setDraftTracking] = useState("");
  const [draftCarrier, setDraftCarrier] = useState("Sendeo");
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState({ person: "", product: "", carrier: "Sendeo", city: "", district: "", status: "preparing" as Status });
  const [notice, setNotice] = useState("");

  useEffect(() => { try { window.localStorage.setItem(STORAGE, JSON.stringify(demo)); } catch { /* private-mode browser */ } }, [demo]);
  useEffect(() => {
    if (mode !== "real") return;
    let alive = true;
    setRealState("loading");
    fetch("/api/admin/shipments", { credentials: "same-origin", cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error(`Gönderiler okunamadı (HTTP ${r.status}).`); return r.json(); })
      .then((data: { shipments?: APIShipment[]; trainerShipments?: APIShipment[] }) => {
        if (!alive) return;
        setReal([...convertAPI(Array.isArray(data.shipments) ? data.shipments : [], "student"), ...convertAPI(Array.isArray(data.trainerShipments) ? data.trainerShipments : [], "trainer")]);
        setRealState("ready"); setRealMessage("");
      }).catch((e: unknown) => { if (alive) { setRealState("error"); setRealMessage(e instanceof Error ? e.message : "Gönderiler okunamadı."); } });
    return () => { alive = false; };
  }, [mode]);
  useEffect(() => {
    if (!selectedId && !createOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setSelectedId(null); setCreateOpen(false); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, createOpen]);

  const items = mode === "demo" ? demo : real;
  const selected = items.find(x => x.id === selectedId) || null;
  const counts = useMemo(() => ({
    all: items.length, action: items.filter(x => statusGroup[x.status] === "action").length,
    transit: items.filter(x => statusGroup[x.status] === "transit").length,
    complete: items.filter(x => statusGroup[x.status] === "complete").length,
    issue: items.filter(x => statusGroup[x.status] === "issue").length,
  }), [items]);
  const filtered = useMemo(() => items.filter(x => {
    if (tab !== "all" && statusGroup[x.status] !== tab) return false;
    if (carrier !== "all" && x.carrier !== carrier) return false;
    if (status !== "all" && x.status !== status) return false;
    if (kind !== "all" && x.kind !== kind) return false;
    if (onlyMissing && !!x.tracking) return false;
    const q = lower(query.trim());
    return !q || lower([x.orderId, x.person, x.product, x.carrier, x.tracking, x.city].join(" ")).includes(q);
  }), [items, tab, carrier, status, kind, onlyMissing, query]);

  function switchMode(m: Mode) {
    setMode(m); setTab("all"); setSelectedId(null); setNotice("");
    setQuery(""); setCarrier("all"); setStatus("all"); setKind("all"); setOnlyMissing(false);
  }
  function openDetails(item: Shipment) {
    setSelectedId(item.id); setDraftStatus(item.status); setDraftTracking(item.tracking); setDraftCarrier(item.carrier);
  }
  function updateDemo() {
    if (!selected || mode !== "demo" || !selected.demo) return;
    const changed = selected.status !== draftStatus || selected.tracking !== draftTracking.trim() || selected.carrier !== draftCarrier;
    if (!changed) { setSelectedId(null); return; }
    const date = today();
    setDemo(prev => prev.map(x => x.id === selected.id ? { ...x, status: draftStatus, tracking: draftTracking.trim().slice(0, 80), carrier: draftCarrier,
      updatedAt: date, events: [{ at: date, title: "Test kaydı güncellendi", detail: `${statusText[x.status]} → ${statusText[draftStatus]} (yalnızca demo)` }, ...x.events],
    } : x));
    setNotice("Örnek gönderi güncellendi. Gerçek kargo kaydı değişmedi."); setSelectedId(null);
  }
  function newDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!create.person.trim() || !create.product.trim()) return;
    const id = `KG-TEST-${Date.now().toString(36).toUpperCase()}`;
    const d = today();
    const row: Shipment = { id, orderId: id, person: create.person.trim().slice(0, 90), kind: "student", product: create.product.trim().slice(0, 180), carrier: create.carrier,
      status: create.status, tracking: "", city: create.city.trim().slice(0, 70), district: create.district.trim().slice(0, 70), note: "Yerel test kaydı", createdAt: d, updatedAt: d, demo: true,
      events: [{ at: d, title: "Yeni test gönderisi", detail: "Gerçek API'ye gönderilmedi" }],
    };
    setDemo(prev => [row, ...prev]); setCreateOpen(false); setCreate({ person: "", product: "", carrier: "Sendeo", city: "", district: "", status: "preparing" });
    setTab("all"); setNotice("Yeni test kargosu eklendi. Gerçek sisteme yazılmadı.");
  }
  function clearFilters() { setQuery(""); setCarrier("all"); setStatus("all"); setKind("all"); setOnlyMissing(false); setTab("all"); }
  const uniqueCarriers = Array.from(new Set([...carriers, ...items.map(i => i.carrier).filter(Boolean)]));
  const actionItems = items.filter(i => ["waiting", "preparing", "integration", "failed"].includes(i.status)).slice(0, 3);

  return <main className="platform-foundation-panel admin-panel fx-cargo-owner-v2">
    <div className="fx-cargo-header">
      <div><div className="fx-cargo-eyebrow">OPERASYON / KARGO</div><h1>Kargo ve Gönderiler</h1><p>Gönderilerin durumunu görün, sorunlu kayıtları hızlıca çözün.</p></div>
      <div className="fx-cargo-actions">
        <div className="fx-cargo-mode" aria-label="Veri modu">
          <button type="button" className={mode === "demo" ? "active" : ""} onClick={() => switchMode("demo")}>Test Kargoları</button>
          <button type="button" className={mode === "real" ? "active" : ""} onClick={() => switchMode("real")}>Gerçek Kargolar</button>
        </div>
        {mode === "demo" && <><button className="fx-cargo-button" type="button" onClick={() => { if (window.confirm("Örnek kargoları başlangıç durumuna döndürmek istiyor musunuz?")) { setDemo(makeDemo()); setNotice("Sekiz test kargosu başlangıç durumuna döndürüldü."); setSelectedId(null); clearFilters(); } }}><Icon name="refresh" size={16}/> Sıfırla</button>
          <button className="fx-cargo-button primary" type="button" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16}/> Yeni Test Kargosu</button></>}
      </div>
    </div>
    <div className={`fx-cargo-banner ${mode === "real" ? "real" : ""}`} role="status">
      <Icon name={mode === "demo" ? "info" : "shield"} size={20}/>
      <span>{mode === "demo" ? <><b>TEST MODU:</b> Bu ekrandaki {demo.length} gönderi örnektir. Durum ve takip numarası değişiklikleri yalnızca bu tarayıcıda saklanır. Gerçek sipariş, stok veya kargo firması etkilenmez.</> : <><b>GERÇEK KAYITLAR · SALT OKUNUR:</b> Öğrenci ve eğitmen gönderileri mevcut API'den okunur. Bu kabul aşamasında canlı durum değişikliği ve stok hareketi devre dışıdır.</>}</span>
      <strong>{mode === "demo" ? `${demo.length} TEST` : `${items.length} GERÇEK`}</strong>
    </div>
    {notice && <div className="fx-cargo-notice" role="status">{notice}<button type="button" aria-label="Bildirimi kapat" onClick={() => setNotice("")}><Icon name="close" size={15}/></button></div>}
    <div className="fx-cargo-stats">
      {([ ["İşlem Bekleyen", counts.action, "Hazırlık ve entegrasyon", "box", "orange", "action"], ["Yolda", counts.transit, "Taşıyıcıya teslim edilen", "truck", "blue", "transit"], ["Teslim Edilen", counts.complete, "Tamamlanan gönderiler", "check", "green", "complete"], ["Sorunlu / İptal", counts.issue, "İnceleme gerekenler", "alert", "red", "issue"] ] as const).map(([label, value, subtitle, icon, theme, target]) =>
        <button type="button" className={`fx-cargo-stat ${theme} ${tab === target ? "chosen" : ""}`} key={label} onClick={() => setTab(target)}><span className="fx-cargo-stat-icon"><Icon name={icon} size={26}/></span><span><span className="fx-cargo-stat-title">{label}</span><strong>{value}</strong><small>{subtitle}</small></span></button>)}
    </div>
    <section className="fx-cargo-panel" aria-label="Gönderi yönetimi">
      <div className="fx-cargo-panelheading"><div><h2>Gönderi Yönetimi</h2><p>Sipariş, öğrenci veya eğitmen, taşıyıcı ve gönderi durumu tek listede.</p></div><span className="fx-cargo-total">{filtered.length} kayıt</span></div>
      <div className="fx-cargo-tabs" role="tablist" aria-label="Kargo durumları">
        {tabs.map(t => <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.text} <span>{counts[t.key]}</span></button>)}
      </div>
      <div className="fx-cargo-filters">
        <label className="fx-cargo-search"><Icon name="search" size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Öğrenci, sipariş, ürün veya takip no ara..." aria-label="Gönderilerde ara"/></label>
        <select value={carrier} onChange={e => setCarrier(e.target.value)} aria-label="Taşıyıcı filtresi"><option value="all">Tüm taşıyıcılar</option>{uniqueCarriers.map(c => <option value={c} key={c}>{c}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Durum filtresi"><option value="all">Tüm durumlar</option>{statusChoices.map(st => <option key={st} value={st}>{statusText[st]}</option>)}</select>
        <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Alıcı türü filtresi"><option value="all">Tüm alıcılar</option><option value="student">Öğrenciler</option><option value="trainer">Eğitmenler</option></select>
        <label className="fx-cargo-check"><input checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} type="checkbox"/> Takip no olmayanlar</label>
        <button className="fx-cargo-button compact" type="button" onClick={clearFilters}>Temizle</button>
      </div>
      {realState === "loading" && mode === "real" ? <div className="fx-cargo-empty" role="status">Gerçek gönderiler yükleniyor…</div> : realState === "error" && mode === "real" ? <div className="fx-cargo-empty" role="alert">{realMessage} <button className="fx-cargo-button" type="button" onClick={() => { switchMode("demo"); }}>Test ekranına dön</button></div> :
        <div className="fx-cargo-tablewrap"><table><thead><tr><th>Sipariş / Alıcı</th><th>Ürün</th><th>Taşıyıcı</th><th>Takip numarası</th><th>Güncel durum</th><th>Son işlem</th><th>İşlem</th></tr></thead><tbody>
          {filtered.map(item => <tr key={`${item.kind}:${item.id}`}><td><div className="fx-cargo-order">{item.orderId ? `#${item.orderId.slice(0, 20)}` : "Gönderi"}</div><div className="fx-cargo-person"><span className="fx-cargo-avatar">{item.person.charAt(0).toLocaleUpperCase("tr-TR")}</span><div><b>{item.person}</b><small>{item.kind === "student" ? "Öğrenci" : "Eğitmen"}</small></div></div></td><td><span className="fx-cargo-product" title={item.product}>{item.product}</span></td><td>{item.carrier}</td><td>{item.tracking ? <code>{item.tracking}</code> : <span className="fx-cargo-muted">Henüz yok</span>}</td><td><span className={`fx-cargo-chip s-${item.status}`}>{statusText[item.status]}</span></td><td>{safeDate(item.updatedAt)}</td><td><button className="fx-cargo-button compact" onClick={() => openDetails(item)} type="button">Ayrıntılar <Icon name="chevron" size={14}/></button></td></tr>)}
          {!filtered.length && <tr><td colSpan={7}><div className="fx-cargo-empty">Bu filtrelerde gönderi bulunamadı. Filtreleri temizleyerek yeniden deneyebilirsin.</div></td></tr>}
        </tbody></table></div>}
      <div className="fx-cargo-tablefoot">{mode === "demo" ? "Test gönderisinde durum ve takip numarası değiştirmek için Ayrıntılar'a tıklayın." : "Gerçek gönderiler salt okunurdur; hiçbir durum veya stok kaydı değiştirilmez."}</div>
    </section>
    <div className="fx-cargo-lower">
      <section className="fx-cargo-panel small"><h3>Öncelikli İşler</h3>{actionItems.length ? actionItems.map(i => <button className="fx-cargo-task" type="button" key={i.id} onClick={() => openDetails(i)}><span className="fx-cargo-taskdot"/><span><b>{i.person}</b><small>{statusText[i.status]} · {i.product}</small></span><Icon name="chevron" size={16}/></button>) : <p>Şu anda öncelikli işlem bulunmuyor.</p>}</section>
      <section className="fx-cargo-panel small"><h3>Gönderi Akışı</h3><div className="fx-cargo-flow"><div><span>İşlem Bekleyen</span><strong>{counts.action}</strong></div><div><span>Yolda</span><strong>{counts.transit}</strong></div><div><span>Tamamlanan</span><strong>{counts.complete}</strong></div></div><p>{mode === "demo" ? "Bu sayılar yalnızca sekiz örnek kargo ve eklediğin test kayıtlarından oluşur." : "Mevcut kargo API'sinden okunan gönderilerin özetidir."}</p></section>
    </div>
    <div className="fx-cargo-footer">Fixoku Kargo ve Gönderiler · {mode === "demo" ? "Yerel test modu · Gerçek API'ye hiçbir işlem yazılmaz" : "Gerçek gönderiler · Salt okunur kabul sürümü"}</div>
    {selected && <><div className="fx-cargo-scrim" onClick={() => setSelectedId(null)} aria-hidden="true"/><aside className="fx-cargo-drawer" role="dialog" aria-modal="true" aria-label="Kargo ayrıntıları">
      <header><div><small>{selected.demo ? "TEST GÖNDERİSİ" : "GERÇEK GÖNDERİ · SALT OKUNUR"}</small><h2>{selected.person}</h2><p>{selected.orderId ? `#${selected.orderId}` : selected.id} · {statusText[selected.status]}</p></div><button className="fx-cargo-button compact" type="button" aria-label="Kapat" onClick={() => setSelectedId(null)}><Icon name="close"/></button></header>
      <div className="fx-cargo-drawerbody"><section className="fx-cargo-drawcard"><h3>Gönderi Bilgileri</h3><div className="fx-cargo-data"><div><small>Alıcı</small><b>{selected.person}</b></div><div><small>Alıcı türü</small><b>{selected.kind === "student" ? "Öğrenci" : "Eğitmen"}</b></div><div><small>Taşıyıcı</small><b>{selected.carrier}</b></div><div><small>Güncel durum</small><b>{statusText[selected.status]}</b></div><div><small>Takip numarası</small><b>{selected.tracking || "Henüz yok"}</b></div><div><small>Son güncelleme</small><b>{safeDate(selected.updatedAt)}</b></div></div></section>
        <section className="fx-cargo-drawcard"><h3>Ürün ve Teslimat</h3><p className="fx-cargo-drawproduct">{selected.product}</p><p className="fx-cargo-muted">{selected.demo ? `${selected.city} / ${selected.district}` : "Gerçek teslimat adresi güvenlik nedeniyle bu önizlemede gösterilmiyor."}</p><p>{selected.note}</p></section>
        {selected.demo && <section className="fx-cargo-drawcard"><h3>Test Gönderisini Güncelle</h3><p className="fx-cargo-drawhelp">Bu alan yalnızca örnek kaydı değiştirir. Gerçek kargo ya da stok işlemi yapılmaz.</p><label>Durum<select value={draftStatus} onChange={e => setDraftStatus(e.target.value as Status)}>{statusChoices.map(st => <option key={st} value={st}>{statusText[st]}</option>)}</select></label><label>Taşıyıcı<select value={draftCarrier} onChange={e => setDraftCarrier(e.target.value)}>{carriers.map(c => <option key={c}>{c}</option>)}</select></label><label>Takip numarası<input value={draftTracking} onChange={e => setDraftTracking(e.target.value)} maxLength={80} placeholder="TEST-..."/></label><button className="fx-cargo-button primary full" type="button" onClick={updateDemo}>Test Değişikliğini Kaydet</button></section>}
        <section className="fx-cargo-drawcard"><h3>Durum Geçmişi</h3><ol className="fx-cargo-timeline">{selected.events.map((e, idx) => <li key={`${idx}-${e.at}`}><b>{e.title}</b><small>{safeDate(e.at)}</small><p>{e.detail}</p></li>)}</ol></section>
      </div><footer><button type="button" className="fx-cargo-button" onClick={() => setSelectedId(null)}>Listeye Dön</button></footer>
    </aside></>}
    {createOpen && <div className="fx-cargo-modalback" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setCreateOpen(false); }}><section className="fx-cargo-modal" role="dialog" aria-modal="true" aria-labelledby="fx-cargo-add-title"><div className="fx-cargo-modalheader"><div><small>SADECE TEST MODU</small><h2 id="fx-cargo-add-title">Yeni Test Kargosu</h2></div><button type="button" className="fx-cargo-button compact" aria-label="Kapat" onClick={() => setCreateOpen(false)}><Icon name="close"/></button></div><p>Oluşturacağın gönderi yalnızca bu tarayıcıda saklanır.</p><form onSubmit={newDemo}>
      <label>Öğrenci adı<input required value={create.person} maxLength={90} onChange={e => setCreate({ ...create, person: e.target.value })} placeholder="Ad Soyad"/></label>
      <label>Ürün<input required value={create.product} maxLength={180} onChange={e => setCreate({ ...create, product: e.target.value })} placeholder="Ürün veya paket"/></label>
      <div className="fx-cargo-two"><label>İl<input value={create.city} onChange={e => setCreate({ ...create, city: e.target.value })} placeholder="İstanbul"/></label><label>İlçe<input value={create.district} onChange={e => setCreate({ ...create, district: e.target.value })} placeholder="Ümraniye"/></label></div>
      <label>Taşıyıcı<select value={create.carrier} onChange={e => setCreate({ ...create, carrier: e.target.value })}>{carriers.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Durum<select value={create.status} onChange={e => setCreate({ ...create, status: e.target.value as Status })}>{statusChoices.map(st => <option key={st} value={st}>{statusText[st]}</option>)}</select></label>
      <div className="fx-cargo-modalactions"><button type="button" className="fx-cargo-button" onClick={() => setCreateOpen(false)}>Vazgeç</button><button className="fx-cargo-button primary" type="submit">Test Kargosunu Ekle</button></div>
    </form></section></div>}
  </main>;
}
