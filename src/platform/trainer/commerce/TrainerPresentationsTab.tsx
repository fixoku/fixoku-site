import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CourseTabIconKind = "video" | "powerpoint" | "pdf";
export function TrainerCourseTabIcon({ kind }: { kind: CourseTabIconKind }) {
  if (kind === "video") return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none"/></svg>;
  if (kind === "powerpoint") return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M12 17v4M8 21h8"/><path d="M8 13V7h3a2 2 0 0 1 0 4H8"/></svg>;
  return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="#EC1C24"><path d="M23.63 15.3c-.71-.745-2.166-1.17-4.224-1.17-1.1 0-2.377.106-3.761.354a19.443 19.443 0 0 1-2.307-2.661c-.532-.71-.994-1.49-1.42-2.236.817-2.484 1.207-4.507 1.207-5.962 0-1.632-.603-3.336-2.342-3.336-.532 0-1.065.32-1.349.781-.78 1.384-.425 4.4.923 7.381a60.277 60.277 0 0 1-1.703 4.507c-.568 1.349-1.207 2.733-1.917 4.01C2.834 18.53.314 20.34.03 21.758c-.106.533.071 1.03.462 1.42.142.107.639.533 1.49.533 2.59 0 5.323-4.188 6.707-6.707 1.065-.355 2.13-.71 3.194-.994a34.963 34.963 0 0 1 3.407-.745c2.732 2.448 5.145 2.839 6.352 2.839 1.49 0 2.023-.604 2.2-1.1.32-.64.106-1.349-.213-1.704zm-1.42 1.03c-.107.532-.64.887-1.384.887-.213 0-.39-.036-.604-.071-1.348-.32-2.626-.994-3.903-2.059a17.717 17.717 0 0 1 2.98-.248c.746 0 1.385.035 1.81.142.497.106 1.278.426 1.1 1.348zm-7.524-1.668a38.01 38.01 0 0 0-2.945.674 39.68 39.68 0 0 0-2.52.745 40.05 40.05 0 0 0 1.207-2.555c.426-.994.78-2.023 1.136-2.981.354.603.745 1.207 1.135 1.739a50.127 50.127 0 0 0 1.987 2.378zM10.038 1.46a.768.768 0 0 1 .674-.425c.745 0 .887.851.887 1.526 0 1.135-.355 2.874-.958 4.861-1.03-2.768-1.1-5.074-.603-5.962zM6.134 17.997c-1.81 2.981-3.549 4.826-4.613 4.826a.872.872 0 0 1-.532-.177c-.213-.213-.32-.461-.249-.745.213-1.065 2.271-2.555 5.394-3.904Z"/></svg>;
}

type Presentation = { id: string; title: string; pageCount: number; coverSrc: string };
const imageUrl = (packageId: string, id: string, page: number, mode: "page" | "thumb") =>
  `/api/trainer/shared-presentation-media?packageId=${encodeURIComponent(packageId)}&presentation=${encodeURIComponent(id)}&page=${page}&mode=${mode}`;

export function TrainerPresentationsTab({ packageId, watermarkName }: { packageId: string; watermarkName: string }) {
  const [items, setItems] = useState<Presentation[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [opened, setOpened] = useState<Presentation | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let canceled = false;
    setStatus("loading");
    fetch(`/api/trainer/shared-presentation-catalog?packageId=${encodeURIComponent(packageId)}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw Error(String(response.status)); return await response.json() as { presentations: Presentation[] }; })
      .then((result) => { if (!canceled) { setItems(result.presentations ?? []); setStatus("ready"); } })
      .catch(() => { if (!canceled) setStatus("error"); });
    return () => { canceled = true; };
  }, [packageId]);

  useEffect(() => {
    if (!opened) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogCloseRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpened(null); }
      if (event.key === "ArrowLeft") { event.preventDefault(); setPage((p) => Math.max(1, p - 1)); }
      if (event.key === "ArrowRight") { event.preventDefault(); setPage((p) => Math.min(opened.pageCount, p + 1)); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", handleKey); };
  }, [opened]);

  useEffect(() => {
    setZoom(1);
    stageRef.current?.scrollTo({ top: 0, left: 0 });
    document.getElementById(`fixoku-presentation-thumb-${page}`)?.scrollIntoView({ block: "nearest" });
  }, [page, opened]);

  const open = (item: Presentation) => { setOpened(item); setPage(1); setZoom(1); };
  const close = () => setOpened(null);

  return <section className="trainer-shared-presentations" aria-label="Ortak sunumlarım">
    <header className="trainer-shared-presentations-intro"><div><h3>Sunumlarım</h3><p>Tüm eğitmen eğitimlerinde ortak kullanılan sunum ve broşürler</p></div><span>5 PDF sunum</span></header>
    {status === "loading" && <p role="status">Sunumlar yükleniyor…</p>}
    {status === "error" && <p role="alert">Sunumlar şu anda görüntülenemiyor. Sayfayı yenileyerek yeniden deneyin.</p>}
    {status === "ready" && <div className="trainer-shared-presentation-grid">
      {items.map((item) => <button type="button" className="trainer-shared-presentation-card" key={item.id} onClick={() => open(item)}>
        <span className="trainer-shared-presentation-cover"><img loading="lazy" decoding="async" alt={`${item.title} sunumunun ilk sayfasÄ±`} src={imageUrl(packageId, item.id, 1, "page")} onError={(event) => { const image = event.currentTarget; if (image.dataset.fallback !== "1") { image.dataset.fallback = "1"; image.src = item.coverSrc; } }}/><span className="trainer-shared-presentation-filemark"><TrainerCourseTabIcon kind="pdf"/><b>PDF</b></span></span>
        <span className="trainer-shared-presentation-card-label"><strong>{item.title}</strong><small>{item.pageCount} sayfa · Sunumu aç <span aria-hidden="true">↗</span></small></span>
      </button>)}
    </div>}
    {opened && createPortal(<div className="trainer-shared-presentation-overlay" role="dialog" aria-modal="true" aria-label={`${opened.title} sunumu`}>
      <header className="trainer-shared-presentation-modal-top"><div className="trainer-shared-presentation-modal-title"><TrainerCourseTabIcon kind="pdf"/><strong>{opened.title}</strong><small>{page} / {opened.pageCount}</small></div><div className="trainer-shared-presentation-actions"><button type="button" aria-label="Uzaklaştır" onClick={() => setZoom((z) => Math.max(1,z-0.25))} disabled={zoom <= 1}>−</button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Yakınlaştır" onClick={() => setZoom((z) => Math.min(3,z+0.25))} disabled={zoom >= 3}>+</button><button type="button" ref={dialogCloseRef} onClick={close} aria-label="Sunumu kapat">✕</button></div></header>
      <div className="trainer-shared-presentation-modal-body"><div className="trainer-shared-presentation-stage" ref={stageRef}><img src={imageUrl(packageId,opened.id,page,"page")} style={{ width: `${zoom*100}%` }} alt={`${opened.title}, sayfa ${page}`} draggable={false}/><div className="trainer-shared-presentation-watermark" aria-hidden="true">{watermarkName} · FİXOKU</div></div><aside className="trainer-shared-presentation-rail" aria-label="Sayfa önizlemeleri"><div className="trainer-shared-presentation-rail-title"><b>Sunum içeriği</b><span>{opened.pageCount} sayfa</span></div><div className="trainer-shared-presentation-thumbs">{Array.from({length:opened.pageCount},(_,i)=>i+1).map((number)=><button id={`fixoku-presentation-thumb-${number}`} className={number === page ? "is-active" : ""} type="button" onClick={()=>setPage(number)} key={number}><img loading="lazy" src={imageUrl(packageId,opened.id,number,"thumb")} alt=""/><span>Sayfa {number}</span></button>)}</div></aside></div>
      <footer className="trainer-shared-presentation-modal-bottom"><button type="button" disabled={page === 1} onClick={()=>setPage((p)=>p-1)}>← Önceki</button><span>{page} / {opened.pageCount} · {opened.title}</span><button type="button" disabled={page === opened.pageCount} onClick={()=>setPage((p)=>p+1)}>Sonraki →</button></footer>
    </div>, document.body)}
  </section>;
}
