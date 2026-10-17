import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon } from "../components/TrainerIcon";
import { TrainerCurriculumTab } from "./TrainerCurriculumTab";
import { formatTrainerCourseTitle } from "../../../shared/formatTrainerCourseTitle";
import { TrainerPresentationsTab, TrainerCourseTabIcon } from "./TrainerPresentationsTab";
import "./trainer-shared-presentations.css";
import "./trainer-commerce.css";
import "./trainer-video-sequential-preview.css";

type Progress = { videoIndex: number; durationSeconds?: number; coverageBps?: number; lastPositionSeconds?: number; endedSeen?: boolean; completedAt?: string | null };
type Video = { videoIndex: number; title: string; locked: boolean; src: string | null; posterSrc: string | null; progress: Progress | null };
type Payload = { package: { id: string; slug: string; title: string }; videos: Video[]; watermark: { name: string; reference: string } };
function TrainerVideoThumbnail({ posterSrc, locked, index }: { posterSrc: string | null; locked: boolean; index: number }) {
  return (
    <span className="trainer-video-thumb" aria-hidden="true">
      {posterSrc ? (
        <img src={posterSrc} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span className="trainer-video-thumb-placeholder">{locked ? "🔒" : index}</span>
      )}
      {posterSrc && !locked && <span className="trainer-video-thumb-play">▶</span>}
      {locked && <span className="trainer-video-thumb-lock"><TrainerIcon name="lock" size={24}/></span>}
    </span>
  );
}

const pct = (value: number | undefined) => `${Math.min(100, Math.round((Number(value || 0) / 10000) * 100))}%`;

export function TrainerVideoPage({ user }: { user: { id: string; name: string; email: string } }) {
  const { slug = "" } = useParams<{ slug: string }>();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [completionToast, setCompletionToast] = useState(false);
  const [activeTab, setActiveTab] = useState<"videos" | "curriculum" | "presentations">("videos");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRailRef = useRef<HTMLElement | null>(null);
  const videoMainRef = useRef<HTMLDivElement | null>(null);
  const [videoRailHeight, setVideoRailHeight] = useState<number | null>(null);
  const lastSentRef = useRef(0);
  const lastAllowedRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const sendingRef = useRef(false);
  const pendingEndedRef = useRef(false);
  const selectedVideo = payload?.videos[selected] || null;

  const load = async () => {
    setStatus("loading");
    try {
      const response = await fetch(`/api/trainer/videos?slug=${encodeURIComponent(slug)}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error();
      setPayload(await response.json() as Payload);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };
  useEffect(() => { void load(); }, [slug]);

  useEffect(() => {
    setIsPlaying(false);
    lastSentRef.current = 0;
    lastAllowedRef.current = Number(selectedVideo?.progress?.lastPositionSeconds || 0);
    lastHeartbeatRef.current = 0;
    if (videoRef.current) videoRef.current.currentTime = lastAllowedRef.current;
  }, [selected, slug]);

  const sendProgress = async (ended = false) => {
    const element = videoRef.current;
    if (!element || !selectedVideo || !Number.isFinite(element.duration) || element.duration <= 0) return;
    if (sendingRef.current) { if (ended) pendingEndedRef.current = true; return; }
    sendingRef.current = true;
    const duration = Math.floor(element.duration);
    const end = ended ? duration : Math.min(duration, Math.max(lastSentRef.current + 0.5, element.currentTime));
    const start = Math.max(0, Math.min(lastSentRef.current, end - 0.5));
    if (end <= start && !ended) { sendingRef.current = false; return; }
    try {
      const response = await fetch(`/api/trainer/videos?packageId=${encodeURIComponent(payload?.package.id || "")}`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoIndex: selectedVideo.videoIndex, durationSeconds: duration, startSeconds: start, endSeconds: end, ended }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(body.error === "VIDEO_FORWARD_SEEK_REJECTED" ? "Videolar sırayla izlenmelidir; ileri sarma kapatıldı." : "Geçici izleme durumu güncellenemedi."); return; }
      lastSentRef.current = Math.max(lastSentRef.current, end);
      lastAllowedRef.current = Math.max(lastAllowedRef.current, end);
      if (body.progress?.completedAt && payload) {
        setPayload((current) => current ? { ...current, videos: current.videos.map((item) => item.videoIndex === selectedVideo.videoIndex ? { ...item, locked: false, progress: { ...item.progress, ...body.progress } } : item) } : current);
      }
      if (body.nextUnlocked) {
        const refreshResponse = await fetch(`/api/trainer/videos?slug=${encodeURIComponent(slug)}`, { credentials: "same-origin" });
        if (refreshResponse.ok) {
          setPayload(await refreshResponse.json() as Payload);
          if (ended) {
            setMessage("");
            setCompletionToast(false);

            window.setTimeout(() => {
              setCompletionToast(true);
            }, 50);

            window.setTimeout(() => {
              setCompletionToast(false);
            }, 4050);
          }
        } else {
          setMessage("Video tamamlandı; ders listesi yenilenemedi.");
        }
      }
    } catch { setMessage("Geçici izleme durumu güncellenemedi."); }
    finally {
      sendingRef.current = false;
      if (pendingEndedRef.current) { pendingEndedRef.current = false; window.setTimeout(() => void sendProgress(true), 0); }
    }
  };

  const onTimeUpdate = () => {
    const element = videoRef.current;
    if (!element) return;
    // Normal playback advances before the network heartbeat is acknowledged.
    // Never rewind real playback based solely on a delayed server response.
    // Explicit forward seeks are rejected in onSeeking, and the server
    // independently validates coverage, wall-clock pace and lesson locks.
    if (!element.seeking && !element.paused && Number.isFinite(element.currentTime)) {
      lastAllowedRef.current = Math.max(lastAllowedRef.current, element.currentTime);
    }
    if (element.currentTime - lastHeartbeatRef.current >= 2) {
      lastHeartbeatRef.current = element.currentTime;
      void sendProgress();
    }
  };
  // FIXOKU_VIDEO_RAIL_MEASURE_V17
  useEffect(() => {
    const frame = videoFrameRef.current;
    const rail = videoRailRef.current;

    if (!frame || !rail) return;

    const syncHeight = () => {
      if (window.matchMedia("(max-width: 760px)").matches) {
        setVideoRailHeight(null);
        return;
      }

      window.requestAnimationFrame(() => {
        const frameRect = frame.getBoundingClientRect();
        const railRect = rail.getBoundingClientRect();

        // Hedef: sağ panelin ALTI, ana video görüntüsünün alt çizgisi ile aynı.
        // Sol kartın alttaki bilgi/not satırı bu yüksekliğe dahil edilmez.
        const height = Math.round(frameRect.bottom - railRect.top);

        setVideoRailHeight(height > 0 ? height : null);
      });
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(frame);

    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [selected, activeTab, status]);

  const cardList = useMemo(() => payload?.videos || [], [payload]);
  if (status === "loading") return <PanelShell user={user}><main className="trainer-commerce-page"><p role="status">Video eğitimi yükleniyor…</p></main></PanelShell>;
  if (status === "error" || !payload) return <PanelShell user={user}><main className="trainer-commerce-page"><p role="alert">Video eğitimi yüklenemedi.</p><button type="button" className="trainer-commerce-secondary" onClick={() => void load()}>Tekrar dene</button></main></PanelShell>;
  return <PanelShell user={user}>
    <main className="trainer-commerce-page trainer-video-page">
      <div className="trainer-course-tabs" role="tablist" aria-label="Eğitim içeriği">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "videos"}
          className={activeTab === "videos" ? "is-active" : ""}
          onClick={() => setActiveTab("videos")}
        >
          <TrainerCourseTabIcon kind="video" /> Video Eğitimleri
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "curriculum"}
          className={activeTab === "curriculum" ? "is-active" : ""}
          onClick={() => setActiveTab("curriculum")}
        >
          <TrainerCourseTabIcon kind="powerpoint" /> Müfredat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "presentations"}
          className={activeTab === "presentations" ? "is-active" : ""}
          onClick={() => setActiveTab("presentations")}
        >
          <TrainerCourseTabIcon kind="pdf" /> Sunumlarım
        </button>
      </div>
      <div className="trainer-commerce-heading"><Link to="/panel/egitmen/egitimlerim">← Eğitimlerim</Link><h2 style={{ textTransform: "none" }}>{formatTrainerCourseTitle(payload.package.title)}</h2><p
        className={activeTab === "videos" ? "trainer-tab-description" : "trainer-tab-description is-placeholder"}
        aria-hidden={activeTab !== "videos"}
      >
        Dersler sıralıdır: %95 izleme ve sona ulaşma gereklidir. Bu, yalnızca yerel test oturumudur; kalıcı ilerleme kaydı yapılmaz.
      </p></div>{activeTab === "videos" && <>
      {message && <p className={`trainer-commerce-message${message.startsWith("Video tamamlandı") ? " is-success" : ""}`} role="status">{message}</p>}
      <section className="trainer-video-layout">
        <div ref={videoMainRef} className="trainer-video-main">
          <div ref={videoFrameRef} className="trainer-video-frame">
            {cardList.length === 0 ? <div className="trainer-video-locked"><TrainerIcon name="book" size={40}/><strong>Video dersleri hazırlanıyor</strong><span>Bu eğitime ait gerçek ders videoları henüz eklenmedi. Müfredat ve Sunumlarım sekmelerini inceleyebilirsiniz.</span></div> : selectedVideo?.src ? <video ref={videoRef} key={selectedVideo.src} controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture disableRemotePlayback playsInline preload="metadata" onContextMenu={(event) => event.preventDefault()} src={selectedVideo.src} poster={selectedVideo.posterSrc ?? undefined} onLoadedMetadata={(event) => { const current = event.currentTarget; const completed = Boolean(selectedVideo.progress?.completedAt); const start = completed ? 0 : Number(selectedVideo.progress?.lastPositionSeconds || 0); lastAllowedRef.current = start; lastSentRef.current = Math.min(start, Math.max(0, current.duration - 1)); current.currentTime = start; }} onTimeUpdate={() => onTimeUpdate()} onSeeking={(event) => { const current = event.currentTarget; if (current.currentTime > lastAllowedRef.current + 0.15) current.currentTime = lastAllowedRef.current; }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => { setIsPlaying(false); void sendProgress(true); }} /> : <div className="trainer-video-locked"><TrainerIcon name="lock" size={40}/><strong>Video kilitli</strong><span>Önceki videoyu tamamladığınızda açılır.</span></div>}
            {isPlaying && <div className="trainer-video-playing-status" role="status"><span className="trainer-video-playing-dot" aria-hidden="true" />Video Oynatılıyor</div>}
            {completionToast && (
              <div className="trainer-video-completion-toast" role="status">
                <span aria-hidden="true">✓</span>
                <strong>Video tamamlandı.</strong>
                <small>Sıradaki video kilidi açıldı.</small>
              </div>
            )}
            <div className="trainer-video-watermark" aria-hidden="true">
  <strong className="trainer-video-watermark-name">{payload.watermark.name}</strong>

  <span className="trainer-video-watermark-warning"><span aria-hidden="true">⛔</span> Videonun FİXOKU Web Sayfası dışında gösterilmesi kesinlikle yasaktır.</span>
</div>
          </div>
          <p className="trainer-video-note">Yerel inceleme: Kilitler bu sunucu oturumunda çalışır. Sunucu yeniden başlatıldığında ilerleme sıfırlanır; kalıcı eğitim tamamlanması veya hakediş oluşturmaz.</p>
        </div>
        <aside ref={videoRailRef} className="trainer-video-list" style={videoRailHeight ? ({ "--fixoku-video-rail-height": `${videoRailHeight}px` } as React.CSSProperties) : undefined} aria-label="Video dersleri"><h3>Video dersleri</h3>{cardList.length === 0 && <p role="status" style={{ padding: "12px" }}>Gerçek ders videoları henüz eklenmedi.</p>}{cardList.map((item, index) => <button key={item.videoIndex} type="button" className={`trainer-video-item ${index === selected ? "is-selected" : ""} ${item.locked ? "is-locked" : ""}`} disabled={item.locked} onClick={() => { setMessage(""); setSelected(index); }}><TrainerVideoThumbnail
                posterSrc={item.posterSrc}
                locked={item.locked}
                index={item.videoIndex}
              />
              <span className="trainer-video-number">{item.locked ? <TrainerIcon name="lock" size={16}/> : item.videoIndex}</span><span className="trainer-video-item-copy"><strong>{item.title}</strong><small className={item.progress?.completedAt ? "is-complete" : ""}>{item.locked ? "Önceki dersi tamamlayın" : item.progress?.completedAt ? "Tamamlandı" : item.progress ? `${pct(item.progress.coverageBps)} izlendi` : "İzlemeye hazır"}</small></span><span className="trainer-video-item-status" aria-hidden="true">{item.locked ? <TrainerIcon name="lock" size={15}/> : item.progress?.completedAt ? "✓" : "›"}</span></button>)}</aside>
      </section>
      </>}

      {activeTab === "curriculum" && (
        <TrainerCurriculumTab
          packageId={payload.package.id}
          watermarkName={payload.watermark.name}
          courseTitle={payload.package.title}
        />
      )}
      {activeTab === "presentations" && (
        <TrainerPresentationsTab packageId={payload.package.id} watermarkName={payload.watermark.name} />
      )}
    </main>
  </PanelShell>;
}
