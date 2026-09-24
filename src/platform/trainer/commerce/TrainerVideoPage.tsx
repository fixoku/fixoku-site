import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon } from "../components/TrainerIcon";
import { TrainerCurriculumTab } from "./TrainerCurriculumTab";
import "./trainer-commerce.css";

type Progress = { videoIndex: number; durationSeconds?: number; coverageBps?: number; lastPositionSeconds?: number; endedSeen?: boolean; completedAt?: string | null };
type Video = { videoIndex: number; title: string; locked: boolean; src: string | null; progress: Progress | null };
type Payload = { package: { id: string; slug: string; title: string }; videos: Video[]; watermark: { name: string; reference: string } };
function TrainerVideoThumbnail({
  src,
  locked,
  index,
}: {
  src: string | null;
  locked: boolean;
  index: number;
}) {
  return (
    <span className="trainer-video-thumb" aria-hidden="true">
      {src ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            const target = Number.isFinite(element.duration) && element.duration > 0
              ? Math.min(0.5, Math.max(0.05, element.duration * 0.02))
              : 0.1;

            try {
              element.currentTime = target;
            }
            catch {
              // Metadata preview only.
            }
          }}
        />
      ) : (
        <span className="trainer-video-thumb-placeholder">
          {locked ? "🔒" : index}
        </span>
      )}

      {src && (
        <span className="trainer-video-thumb-play">
          ▶
        </span>
      )}
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
  const [activeTab, setActiveTab] = useState<"videos" | "curriculum">("videos");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRailRef = useRef<HTMLElement | null>(null);
  const videoMainRef = useRef<HTMLDivElement | null>(null);
  const [videoRailHeight, setVideoRailHeight] = useState<number | null>(null);
  const lastSentRef = useRef(0);
  const lastAllowedRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
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
  }, [selected, selectedVideo?.progress?.lastPositionSeconds]);

  const sendProgress = async (ended = false) => {
    const element = videoRef.current;
    if (!element || !selectedVideo || !Number.isFinite(element.duration) || element.duration <= 0) return;
    const duration = Math.floor(element.duration);
    const end = ended ? duration : Math.min(duration, Math.max(lastSentRef.current + 0.5, element.currentTime));
    const start = Math.max(0, Math.min(lastSentRef.current, end - 0.5));
    if (end <= start && !ended) return;
    try {
      const response = await fetch(`/api/trainer/videos?packageId=${encodeURIComponent(payload?.package.id || "")}`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoIndex: selectedVideo.videoIndex, durationSeconds: duration, startSeconds: start, endSeconds: end, ended }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(body.error === "VIDEO_FORWARD_SEEK_REJECTED" ? "Videolar sırayla izlenmelidir; ileri sarma kapatıldı." : "Video ilerlemesi kaydedilemedi."); return; }
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
          setMessage("Video tamamlandı ancak video listesi yenilenemedi.");
        }
      }
    } catch { setMessage("Video ilerlemesi kaydedilemedi."); }
  };

  const onTimeUpdate = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.currentTime > lastAllowedRef.current + 2) {
      element.currentTime = lastAllowedRef.current;
      setMessage("İleri sarma kapalıdır. İzlemediğiniz bölüme geçemezsiniz.");
      return;
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
          Video Eğitimleri
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "curriculum"}
          className={activeTab === "curriculum" ? "is-active" : ""}
          onClick={() => setActiveTab("curriculum")}
        >
          Müfredat
        </button>
      </div>
      <div className="trainer-commerce-heading"><Link to="/panel/egitmen/egitimlerim">← Eğitimlerim</Link><h2>{payload.package.title}</h2><p
        className={activeTab === "videos" ? "trainer-tab-description" : "trainer-tab-description is-placeholder"}
        aria-hidden={activeTab !== "videos"}
      >
        Videolar sırayla açılır. Her videonun en az %95’ini izleyip sona ulaşmanız gerekir.
      </p></div>{activeTab === "videos" && <>
      {message && <p className={`trainer-commerce-message${message.startsWith("Video tamamlandı") ? " is-success" : ""}`} role="status">{message}</p>}
      <section className="trainer-video-layout">
        <div ref={videoMainRef} className="trainer-video-main">
          <div ref={videoFrameRef} className="trainer-video-frame">
            {selectedVideo?.src ? <video ref={videoRef} key={selectedVideo.src} controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture disableRemotePlayback playsInline preload="metadata" onContextMenu={(event) => event.preventDefault()} src={selectedVideo.src} onLoadedMetadata={(event) => { const current = event.currentTarget; const completed = Boolean(selectedVideo.progress?.completedAt); const start = completed ? 0 : Number(selectedVideo.progress?.lastPositionSeconds || 0); lastAllowedRef.current = start; lastSentRef.current = Math.min(start, Math.max(0, current.duration - 1)); current.currentTime = start; }} onTimeUpdate={(event) => { const current = event.currentTarget; if (!current.seeking) lastAllowedRef.current = Math.max(lastAllowedRef.current, current.currentTime); onTimeUpdate(); }} onSeeking={(event) => { const current = event.currentTarget; if (current.currentTime > lastAllowedRef.current + 0.15) current.currentTime = lastAllowedRef.current; }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => { setIsPlaying(false); void sendProgress(true); }} /> : <div className="trainer-video-locked"><TrainerIcon name="lock" size={40}/><strong>Video kilitli</strong><span>Önceki videoyu tamamladığınızda açılır.</span></div>}
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
          <p className="trainer-video-note">Video ilerlemeniz sunucuda kaydedilir. Sayfayı kapatsanız bile tamamladığınız bölümler korunur.</p>
        </div>
        <aside ref={videoRailRef} className="trainer-video-list" style={videoRailHeight ? ({ "--fixoku-video-rail-height": `${videoRailHeight}px` } as React.CSSProperties) : undefined} aria-label="Video dersleri"><h3>Video dersleri</h3>{cardList.map((item, index) => <button key={item.videoIndex} type="button" className={`trainer-video-item ${index === selected ? "is-selected" : ""} ${item.locked ? "is-locked" : ""}`} disabled={item.locked} onClick={() => { setMessage(""); setSelected(index); }}><TrainerVideoThumbnail
                src={item.src}
                locked={item.locked}
                index={item.videoIndex}
              />
              <span className="trainer-video-number">{item.locked ? <TrainerIcon name="lock" size={16}/> : item.videoIndex}</span><span className="trainer-video-item-copy"><strong>{item.title}</strong><small className={item.progress?.completedAt ? "is-complete" : ""}>{item.progress?.completedAt ? "Tamamlandı" : item.progress ? `${pct(item.progress.coverageBps)} izlendi` : "Başlamadı"}</small></span><span className="trainer-video-item-status" aria-hidden="true">{item.progress?.completedAt ? "✓" : "›"}</span></button>)}</aside>
      </section>
      </>}

      {activeTab === "curriculum" && (
        <TrainerCurriculumTab
          packageId={payload.package.id}
          watermarkName={payload.watermark.name}
        />
      )}
    </main>
  </PanelShell>;
}
