import { useEffect, useMemo, useState } from "react";
import { PanelShell } from "../../panel/layout/PanelShell";
import "./trainer-availability.css";

type Slot = { id: string; startsAt: string; endsAt: string; timezone: string; capacity: number; status: string };
type View = "UPCOMING" | "WEEK" | "ALL";

const statusLabel: Record<string, string> = { OPEN: "Müsait", BOOKED: "Rezerve", CANCELLED: "Kaldırıldı" };

export function TrainerAvailabilityPage({ user }: { user: { id: string; name: string; email: string } }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("UPCOMING");
  const [visibleDays, setVisibleDays] = useState(7);
  const load = () => { setStatus("loading"); fetch("/api/trainer/availability", { credentials: "same-origin" }).then(async (response) => { if (!response.ok) throw Error(); setSlots((await response.json()).slots || []); setStatus("ready"); }).catch(() => setStatus("error")); };
  useEffect(() => { load(); }, []);

  const activeSlots = useMemo(() => slots.filter((slot) => view === "ALL" || slot.status !== "CANCELLED"), [slots, view]);
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    activeSlots.slice().sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)).forEach((slot) => {
      const date = new Date(slot.startsAt);
      const key = date.toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) || []), slot]);
    });
    let entries = [...map.entries()];
    if (view === "UPCOMING") entries = entries.slice(0, visibleDays);
    if (view === "WEEK") entries = entries.slice(0, 7);
    return entries;
  }, [activeSlots, view, visibleDays]);

  const cancelSlot = async (slot: Slot) => { const response = await fetch("/api/trainer/availability", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: slot.capacity, status: "CANCELLED" }) }); setMessage(response.ok ? "Müsaitlik aralığı kaldırıldı." : "Müsaitlik kaldırılamadı."); if (response.ok) load(); };
  const addSlot = async () => { const start = new Date(Date.now() + 2 * 60 * 60 * 1000); start.setMinutes(0, 0, 0); const end = new Date(start.getTime() + 60 * 60 * 1000); const response = await fetch("/api/trainer/availability", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString(), capacity: 1 }) }); setMessage(response.ok ? "Müsaitlik aralığı kaydedildi." : response.status === 409 ? "Bu saat çakışıyor." : "Müsaitlik kaydedilemedi."); if (response.ok) load(); };
  const allDayCount = useMemo(() => new Set(activeSlots.map((slot) => new Date(slot.startsAt).toISOString().slice(0, 10))).size, [activeSlots]);

  return <PanelShell user={user}><main className="trainer-availability-page"><div className="availability-heading"><div><h2>Müsaitlik Takvimim</h2><p>Gelecekte verebileceğiniz ders saatlerini sade bir takvimde yönetin.</p></div><button type="button" onClick={() => void addSlot()}>+ Yeni müsaitlik ekle</button></div>
    <div className="availability-tabs" role="tablist" aria-label="Müsaitlik görünümü">{([['UPCOMING','Yaklaşan müsaitlikler'],['WEEK','Haftalık görünüm'],['ALL','Tüm kayıtlar']] as const).map(([key,label]) => <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? "is-active" : ""} onClick={() => { setView(key); setVisibleDays(7); }}>{label}</button>)}</div>
    {message && <p role="status" className="availability-message">{message}</p>}
    {status === "loading" && <div className="availability-empty" role="status">Müsaitlikler yükleniyor…</div>}
    {status === "error" && <div className="availability-empty" role="alert">Müsaitlikler yüklenemedi. <button type="button" onClick={load}>Tekrar dene</button></div>}
    {status === "ready" && !activeSlots.length && <div className="availability-empty"><h3>Henüz müsaitlik aralığı eklemediniz</h3><p>Yeni bir saat ekleyerek başlayabilirsiniz.</p></div>}
    {status === "ready" && activeSlots.length > 0 && <div className={`availability-groups ${view === "WEEK" ? "is-week" : ""}`} aria-label="Müsaitlik aralıkları">{grouped.map(([date, daySlots]) => <section className="availability-day" key={date}><h3>{new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</h3><div className="availability-list">{daySlots.map((slot) => <article key={slot.id}><strong>{new Date(slot.startsAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} – {new Date(slot.endsAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong><small>{statusLabel[slot.status] || "Müsait"} · Kapasite {slot.capacity}</small><button type="button" className="availability-remove" onClick={() => void cancelSlot(slot)} disabled={slot.status === "CANCELLED"}>{slot.status === "CANCELLED" ? "Kaldırıldı" : "Kaldır"}</button></article>)}</div></section>)}{view === "UPCOMING" && allDayCount > visibleDays && <button className="availability-more" type="button" onClick={() => setVisibleDays((count) => count + 7)}>Daha fazla göster</button>}</div>}
  </main></PanelShell>;
}
