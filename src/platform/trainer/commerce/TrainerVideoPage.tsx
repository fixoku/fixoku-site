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

type Progress = { videoIndex: number; durationSeconds?: number; coverageBps?: number; lastPositionSeconds?: number; maxWatchedSeconds?: number; endedSeen?: boolean; completedAt?: string | null };
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

const pct = (value: number | undefined) => `${Math.max(0, Math.min(100, Math.floor(Number(value || 0) / 100)))}%`;
const videoClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
// A rejected sample must not reset the clock and permanently strand the frontier.
function playbackSampleAccepted(previous: number, position: number, elapsed: number, played: TimeRanges) {
  const delta = position - previous;
  if (delta < 0) return false;
  if (delta <= elapsed + 0.5) return true;
  for (let i = 0; i < played.length; i += 1) {
    if (played.start(i) <= previous + 0.05 && played.end(i) >= position - 0.05) return true;
  }
  return false;
}

export function TrainerVideoPage({ user }: { user: { id: string; name: string; email: string } }) {
  const { slug = "" } = useParams<{ slug: string }>();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferPercent, setBufferPercent] = useState(0);
  const [bufferTrack, setBufferTrack] = useState("#475569");
  const [mediaLoading, setMediaLoading] = useState(false);

  const updateBuffer = (video: HTMLVideoElement) => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    let total = 0;
    let previous = 0;
    const stops: string[] = [];
    for (let i = 0; i < video.buffered.length; i++) {
      const start = Math.min(100, video.buffered.start(i) / video.duration * 100);
      const end = Math.min(100, video.buffered.end(i) / video.duration * 100);
      total += Math.max(0, end - start);
      stops.push(`#475569 ${previous}% ${start}%`, `#b5bdc7 ${start}% ${end}%`);
      previous = end;
    }
    stops.push(`#475569 ${previous}% 100%`);
    setBufferPercent(Math.min(100, Math.floor(total)));
    setBufferTrack(`linear-gradient(to right, ${stops.join(",")})`);
  };
  const [mediaRefresh, setMediaRefresh] = useState(0);
  const playbackRecoveryRef = useRef<{ position: number; resume: boolean } | null>(null);
  const mediaRetriesRef = useRef(0);
  const mediaStallTimerRef = useRef<number | null>(null);
  const [completionToast, setCompletionToast] = useState(false);
  const [completionHasNext, setCompletionHasNext] = useState(false);
  const [activeTab, setActiveTab] = useState<"videos" | "curriculum" | "presentations">("videos");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRailRef = useRef<HTMLElement | null>(null);
  const videoMainRef = useRef<HTMLDivElement | null>(null);
  const [videoRailHeight, setVideoRailHeight] = useState<number | null>(null);
  const [timeline, setTimeline] = useState({ position: 0, frontier: 0, duration: 0 });
  const draggingRef = useRef(false);
  const dragTargetRef = useRef(0);
  const lastSentRef = useRef(0);
  const lastAllowedRef = useRef(0);
  const observedRef = useRef(0);
  const observedAtRef = useRef(0);
  const initializedRef = useRef<HTMLVideoElement | null>(null);
  const requestQueueRef = useRef<Promise<void>>(Promise.resolve());
  const completionNotifiedRef = useRef(new Set<string>());
  const latestFlushRef = useRef<(() => void) | null>(null);
  const selectedVideo = payload?.videos[selected] || null;
  const trainerFirstName = String(payload?.watermark?.name || user.name || "Eğitmenimiz").trim().split(/\s+/u)[0];

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
    setMediaRefresh(0);
    setBufferPercent(0);
    setBufferTrack("#475569");
    setMediaLoading(false);
    mediaRetriesRef.current = 0;
    playbackRecoveryRef.current = null;
    if (mediaStallTimerRef.current !== null) {
      window.clearTimeout(mediaStallTimerRef.current);
      mediaStallTimerRef.current = null;
    }
    setTimeline({ position: 0, frontier: 0, duration: 0 });
    draggingRef.current = false;
    dragTargetRef.current = 0;
    lastSentRef.current = 0;
    lastAllowedRef.current = 0;
    observedRef.current = 0;
    observedAtRef.current = 0;
    initializedRef.current = null;
    return () => {
      if (mediaStallTimerRef.current !== null) {
        window.clearTimeout(mediaStallTimerRef.current);
        mediaStallTimerRef.current = null;
      }
    };
  }, [selected, slug]);

  const queueProgress = (
    element: HTMLVideoElement,
    start: number,
    end: number,
    resumeOnly: boolean,
    ended = false
  ) => {
    if (!payload || !selectedVideo) return;
    if (!Number.isFinite(element.duration) || element.duration < 1) return;

    const packageId = payload.package.id;
    const videoIndex = selectedVideo.videoIndex;
    const courseSlug = slug;
    const identity = `${packageId}:${videoIndex}`;
    const duration = element.duration;

    const request = {
      videoIndex,
      durationSeconds: duration,
      startSeconds: start,
      endSeconds: end,
      resumeOnly,
      resumePositionSeconds: end,
      ended
    };

    requestQueueRef.current = requestQueueRef.current
      .catch(() => {})
      .then(async () => {
        try {
          const response = await fetch(
            `/api/trainer/videos?packageId=${encodeURIComponent(packageId)}`,
            {
              method: "POST",
              credentials: "same-origin",
              keepalive: true,
              headers: { "content-type": "application/json" },
              body: JSON.stringify(request)
            }
          );

          const body = await response.json().catch(() => ({}));

          if (!response.ok || !body.progress) {
            if (videoRef.current === element) {
              setMessage("Izleme konumu kaydedilemedi. Lutfen yeniden deneyin.");
              element.pause();

              const readback = await fetch(
                `/api/trainer/videos?slug=${encodeURIComponent(courseSlug)}`,
                { credentials: "same-origin", cache: "no-store" }
              );

              if (readback.ok && videoRef.current === element) {
                const fresh = await readback.json() as Payload;

                if (videoRef.current !== element) return;

                const item = fresh.videos.find(
                  video => video.videoIndex === videoIndex
                );

                if (item && fresh.package.id === packageId) {
                  const saved = Number(
                    item.progress?.lastPositionSeconds || 0
                  );

                  lastAllowedRef.current = Number(
                    item.progress?.maxWatchedSeconds || 0
                  );

                  const position = Math.min(
                    saved, lastAllowedRef.current
                  );

                  lastSentRef.current = position;
                  observedRef.current = position;
                  observedAtRef.current = performance.now();

                  element.currentTime = position;

                  setPayload(current =>
                    current?.package.id === packageId
                      ? fresh : current
                  );
                }
              }
            }
            return;
          }

          const progress = body.progress as Progress;

          setPayload(current =>
            current?.package.id === packageId ? {
              ...current,
              videos: current.videos.map(item =>
                item.videoIndex === videoIndex
                  ? {
                      ...item,
                      progress: { ...item.progress, ...progress }
                    }
                  : item
              )
            } : current
          );

          if (videoRef.current === element) {
            setMessage("");
          }

          if (
            progress.completedAt &&
            !completionNotifiedRef.current.has(identity) &&
            !selectedVideo.progress?.completedAt
          ) {
            completionNotifiedRef.current.add(identity);

            const refreshed = await fetch(
              `/api/trainer/videos?slug=${encodeURIComponent(courseSlug)}`,
              { credentials: "same-origin", cache: "no-store" }
            );

            if (refreshed.ok) {
              const fresh = await refreshed.json() as Payload;

              setPayload(current =>
                current?.package.id === packageId &&
                fresh.package.id === packageId
                  ? fresh : current
              );

              if (videoRef.current === element) {
                setCompletionHasNext(Boolean(body.nextUnlocked));
                setCompletionToast(true);
                window.setTimeout(
                  () => setCompletionToast(false), 4050
                );
              }
            } else {
              completionNotifiedRef.current.delete(identity);

              if (videoRef.current === element) {
                setMessage("Ders kaydedildi; video listesi yenilenemedi.");
              }
            }
          }
        } catch {
          if (videoRef.current === element) {
            element.pause();
            setMessage("Izleme konumu kaydedilemedi. Baglantinizi kontrol edin.");
          }
        }
      });
  };

  const flushObserved = (element: HTMLVideoElement, ended = false) => {
    if (initializedRef.current !== element) return;
    if (!Number.isFinite(element.duration)) return;

    const duration = element.duration;
    const observed = Math.max(
      0, Math.min(duration, observedRef.current)
    );

    let cursor = Math.max(
      0, Math.min(duration, lastSentRef.current)
    );

    while (observed - cursor > 0.001) {
      const end = Math.min(observed, cursor + 4);

      queueProgress(
        element, cursor, end, false,
        ended && end >= duration - 0.001
      );

      cursor = end;
    }

    lastSentRef.current = cursor;
  };

  const samplePlayback = (
    element: HTMLVideoElement,
    stopped = false
  ) => {
    if (initializedRef.current !== element ||
        element.seeking ||
        (!stopped && element.paused) ||
        !Number.isFinite(element.currentTime) ||
        !Number.isFinite(element.duration)) return;

    const position = Math.max(
      0,
      Math.min(element.duration, element.currentTime)
    );

    const now = performance.now();
    const elapsed = Math.max(
      0, (now - observedAtRef.current) / 1000
    );

    if (playbackSampleAccepted(observedRef.current, position, elapsed, element.played)) {
      observedRef.current = position;
      lastAllowedRef.current = Math.max(lastAllowedRef.current, position);
      observedAtRef.current = now;
    }
    if (!draggingRef.current) setTimeline({ position, frontier: lastAllowedRef.current, duration: element.duration });
  };

  const saveResume = (element: HTMLVideoElement) => {
    if (initializedRef.current !== element) return;

    flushObserved(element);

    const position = Math.max(
      0,
      Math.min(
        observedRef.current,
        lastAllowedRef.current,
        element.duration
      )
    );

    if (lastAllowedRef.current > 0) {
      queueProgress(element, position, position, true);
    }
  };

  useEffect(() => {
    latestFlushRef.current = () => {
      const element = videoRef.current;
      if (!element) return;
      if (!element.paused && !element.seeking) {
        samplePlayback(element);
      }
      saveResume(element);
    };
  });

  useEffect(() => {
    const flush = () => latestFlushRef.current?.();

    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const clearMediaStall = () => {
    if (mediaStallTimerRef.current !== null) {
      window.clearTimeout(mediaStallTimerRef.current);
      mediaStallTimerRef.current = null;
    }
  };

  const recoverMedia = (element: HTMLVideoElement) => {
    if (mediaRetriesRef.current >= 2) {
      setMediaLoading(false);
      setMessage("Video bağlantısı yeniden kurulamadı. Sayfayı yenileyip tekrar deneyin.");
      return;
    }
    mediaRetriesRef.current += 1;
    setMediaLoading(true);
    playbackRecoveryRef.current = {
      position: Number.isFinite(element.currentTime) ? element.currentTime : 0,
      resume: !element.paused
    };
    clearMediaStall();
    setMessage("Video bağlantısı yenileniyor…");
    setMediaRefresh((value) => value + 1);
  };

  const onTimeUpdate = () => {
    const element = videoRef.current;
    if (!element) return;

    samplePlayback(element);

    if (observedRef.current - lastSentRef.current >= 4) {
      flushObserved(element);
    }
  };

  const seekWatched = (requested: number) => {
    const element = videoRef.current;
    if (!element || initializedRef.current !== element || !Number.isFinite(element.duration)) return;
    if (!element.paused && !element.seeking) samplePlayback(element);
    flushObserved(element);
    const position = Math.max(0, Math.min(requested, lastAllowedRef.current, element.duration));
    setTimeline({ position, frontier: lastAllowedRef.current, duration: element.duration });
    if (Math.abs(element.currentTime - position) > 0.001) element.currentTime = position;
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
  const completedCount = cardList.filter(item => Boolean(item.progress?.completedAt)).length;
  const allCompleted = cardList.length > 0 && completedCount === cardList.length;
  const [reviewCompleted, setReviewCompleted] = useState(false);
  useEffect(() => { setReviewCompleted(false); }, [slug]);
  if (status === "loading") return <PanelShell user={user}><main className="trainer-commerce-page"><p role="status">Video eğitimi yükleniyor…</p></main></PanelShell>;
  if (status === "error" || !payload) return <PanelShell user={user}><main className="trainer-commerce-page"><p role="alert">Video eğitimi yüklenemedi.</p><button type="button" className="trainer-commerce-secondary" onClick={() => void load()}>Tekrar dene</button></main></PanelShell>;
  return <PanelShell user={user}>
    <main className="trainer-commerce-page trainer-video-page">
      <style>{`
        .fixoku-r397-navigation{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .fixoku-r397-navigation .trainer-course-tabs{margin:0!important}
        .fixoku-r397-back{display:inline-flex;align-items:center;gap:8px;padding:13px 17px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#b45309;font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap}
        .fixoku-r397-back:hover{background:#ffedd5}
        .fixoku-r397-course-progress{margin:0 0 20px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#fff}
        .fixoku-r397-summary{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:13px;color:#334155}
        .fixoku-r397-summary span{color:#15803d;font-weight:700}
        .fixoku-r397-total{height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin:10px 0 14px}
        .fixoku-r397-total span{display:block;height:100%;background:#22c55e;border-radius:99px;transition:width .4s}
        .fixoku-r397-lessons{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:9px}
        .fixoku-r397-lesson{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;padding:12px 5px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#475569;cursor:pointer;font:inherit}
        .fixoku-r397-lesson strong{font-size:13px}
        .fixoku-r397-lesson small{font-size:10px;font-weight:700;line-height:1.3;text-align:center}
        .fixoku-r397-lesson.is-done{background:#ecfdf5;color:#15803d;border-color:#86efac}
        .fixoku-r397-lesson.is-current{border:2px solid #f97316;background:#fff7ed;color:#c2410c;box-shadow:0 3px 12px #f973161a}
        .fixoku-r397-lesson.is-current.is-done{background:#ecfdf5;color:#15803d}
        .fixoku-r397-lesson.is-locked{cursor:not-allowed;color:#64748b;background:#f8fafc}
        .fixoku-r397-lesson:not(:disabled):hover{box-shadow:0 3px 12px #0f172a15}
        .trainer-video-thumb-lock{color:#facc15!important}
        .trainer-video-item.is-locked .trainer-video-item-status,.trainer-video-item.is-locked .trainer-video-number{color:#ca8a04!important}
        .fixoku-r397-watching{display:inline-block;color:#15803d;font-size:10px;font-weight:800;margin-left:5px}
        .fixoku-r397-rule{padding:12px!important;margin:12px 0 0!important;background:#fff7ed;color:#92400e;border:1px solid #fed7aa;border-radius:10px;font-size:12px!important;line-height:1.6}
        .fixoku-r397-celebration{text-align:center;border:1px solid #bbf7d0;border-radius:20px;padding:20px;margin:0 0 20px;background:linear-gradient(135deg,#ecfdf5,#fffbeb);overflow:hidden}
        .fixoku-r397-celebration h3{font-size:clamp(23px,3vw,34px);color:#15803d;margin:4px 0 8px}
        .fixoku-r397-celebration h4{color:#1e293b;font-size:clamp(16px,2vw,23px);margin:0 0 8px}
        .fixoku-r397-celebration p{color:#475569;font-size:14px}
        .fixoku-r397-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:15px}
        .fixoku-r397-actions a,.fixoku-r397-actions button{padding:12px 18px;border:1px solid #fed7aa;border-radius:10px;background:#fff;color:#9a3412;text-decoration:none;font:inherit;font-weight:700;cursor:pointer}
        .fixoku-r397-actions button{background:#c2410c;color:#fff;border-color:#c2410c}
        .fixoku-r397-bloom{animation:fixoku-r397-bloom 4.5s ease-in-out infinite}
        @keyframes fixoku-r397-bloom{0%,100%{transform:scale(.2);opacity:.4}35%,78%{transform:scale(1);opacity:1}}
        @media(prefers-reduced-motion:reduce){.fixoku-r397-bloom{animation:none}.fixoku-r397-total span{transition:none}}
        @media(max-width:760px){.fixoku-r397-navigation{gap:8px}.fixoku-r397-navigation .trainer-course-tabs{width:100%!important}.fixoku-r397-lessons{grid-template-columns:repeat(auto-fit,minmax(85px,1fr))}.fixoku-r397-lesson{padding:9px 3px}.fixoku-r397-course-progress{padding:12px}.fixoku-r397-summary{font-size:11px}}
      `}</style>
      <div className="fixoku-r397-navigation">
      <Link className="fixoku-r397-back" to="/panel/egitmen/egitimlerim" onClick={() => latestFlushRef.current?.()}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Eğitimlere Dön
      </Link>
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
          onClick={() => {
        latestFlushRef.current?.();
        setActiveTab("curriculum");
      }}
        >
          <TrainerCourseTabIcon kind="powerpoint" /> Müfredat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "presentations"}
          className={activeTab === "presentations" ? "is-active" : ""}
          onClick={() => {
        latestFlushRef.current?.();
        setActiveTab("presentations");
      }}
        >
          <TrainerCourseTabIcon kind="pdf" /> Sunumlarım
        </button>
      </div>
      </div>
      <div className="trainer-commerce-heading">
        <h2 style={{ textTransform: "none" }}>{formatTrainerCourseTitle(payload.package.title)}</h2>
      </div>
      {activeTab === "videos" && cardList.length > 0 && (
        <div className="fixoku-r397-course-progress">
          <div className="fixoku-r397-summary">
            <strong>Eğitim İlerlemeniz</strong>
            <span>{completedCount} / {cardList.length} ders tamamlandı</span>
          </div>
          <div className="fixoku-r397-total" role="progressbar" aria-label="Tamamlanan dersler" aria-valuemin={0} aria-valuemax={cardList.length} aria-valuenow={completedCount}>
            <span style={{width:`${completedCount/cardList.length*100}%`}}/>
          </div>
          <div className="fixoku-r397-lessons">
            {cardList.map((item,index) => {
              const done = Boolean(item.progress?.completedAt);
              const active = index === selected;
              const percent = Math.max(0,Math.min(100,Math.floor(Number(item.progress?.coverageBps || 0)/100)));
              return (
                <button key={item.videoIndex} type="button"
                  disabled={item.locked}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${index+1}. Ders ${done ? "Tamamlandı" : item.locked ? "Kilitli" : `%${percent}`}`}
                  className={`fixoku-r397-lesson ${active ? "is-current" : ""} ${done ? "is-done" : ""} ${item.locked ? "is-locked" : ""}`}
                  onClick={() => {
                    latestFlushRef.current?.();
                    setMessage("");
                    setCompletionToast(false);
                    setReviewCompleted(true);
                    setSelected(index);
                  }}>
                  <strong>{index+1}. Ders</strong>
                  <svg viewBox="0 0 60 60" width="52" height="52" aria-hidden="true">
                    <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="4"/>
                    {!item.locked && <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(done ? 100 : percent)*1.5708} 157.08`} transform="rotate(-90 30 30)"/>}
                    {done ? <path d="M19 30l8 8 15-17" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/> :
                     item.locked ? <g fill="#eab308"><rect x="20" y="28" width="20" height="15" rx="3"/><path d="M24 28v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#ca8a04" strokeWidth="3"/><circle cx="30" cy="35" r="2" fill="#854d0e"/></g> :
                     <text x="30" y="35" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">%{percent}</text>}
                  </svg>
                  <small>{done ? `%${percent} Tamamlandı` : item.locked ? "Kilitli" : active && isPlaying && !mediaLoading ? "İzleniyor" : active ? "Seçili ders" : "İzlemeye hazır"}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {activeTab === "videos" && allCompleted && !reviewCompleted && (
        <section className="fixoku-r397-celebration" aria-label="Video eğitimi tamamlandı">
          <svg className="fixoku-r397-flower" viewBox="0 0 180 155" width="180" height="155" aria-hidden="true">
            <g fill="none" stroke="#15803d" strokeWidth="5" strokeLinecap="round">
              <path d="M90 140Q79 100 50 45M90 140V34M90 140Q105 95 132 48"/>
            </g>
            <g fill="#4ade80">
              <path d="M85 116Q35 110 40 82Q76 83 85 116"/>
              <path d="M94 107Q135 72 142 90Q137 114 94 107"/>
            </g>
            {[{x:50,y:44,c:"#f472b6"},{x:90,y:30,c:"#fb923c"},{x:132,y:47,c:"#a78bfa"}].map((flower,i)=>
              <g key={i} className="fixoku-r397-bloom" style={{transformOrigin:`${flower.x}px ${flower.y}px`,animationDelay:`${i*.22}s`}}>
                {[0,60,120,180,240,300].map(angle=>
                  <ellipse key={angle} cx={flower.x} cy={flower.y-13} rx="7" ry="15" fill={flower.c} transform={`rotate(${angle} ${flower.x} ${flower.y})`}/>
                )}
                <circle cx={flower.x} cy={flower.y} r="8" fill="#facc15"/>
              </g>
            )}
            <path d="M76 126l27 0 9 22-22-6-22 6z" fill="#f59e0b"/>
          </svg>
          <h3>Tebrikler {String(payload.watermark.name || user.name || "").trim().split(/\s+/u)[0]} Hocam</h3>
          <h4>{formatTrainerCourseTitle(payload.package.title).replace(/Eğitimi$/u,"Eğitiminizi")} {formatTrainerCourseTitle(payload.package.title).endsWith("Eğitimi") ? "" : "eğitiminizi"} Tamamladınız.</h4>
          <p>Tüm video derslerini başarıyla tamamladınız.</p>
          <div className="fixoku-r397-actions">
            <Link to="/panel/egitmen/egitimlerim" onClick={() => latestFlushRef.current?.()}>← Eğitimlere Dön</Link>
            <button type="button" onClick={() => {
              latestFlushRef.current?.();
              setCompletionToast(false);
              setSelected(0);
              setReviewCompleted(true);
            }}>Tekrar İncele</button>
          </div>
        </section>
      )}
{activeTab === "videos" && <>
      {message && <p className={`trainer-commerce-message${message.startsWith("Video tamamlandı") ? " is-success" : ""}`} role="status">{message}</p>}
      <section className="trainer-video-layout">
        <div ref={videoMainRef} className="trainer-video-main">
          <div ref={videoFrameRef} className="trainer-video-frame">
            {cardList.length === 0 ? <div className="trainer-video-locked"><TrainerIcon name="book" size={40}/><strong>Video dersleri hazırlanıyor</strong><span>Bu eğitime ait gerçek ders videoları henüz eklenmedi. Müfredat ve Sunumlarım sekmelerini inceleyebilirsiniz.</span></div> : selectedVideo?.src ? <video ref={videoRef} key={`${selectedVideo.src}-${mediaRefresh}`} controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture disableRemotePlayback playsInline preload="metadata"
              onProgress={event => updateBuffer(event.currentTarget)}
              onCanPlay={event => {
                updateBuffer(event.currentTarget);
                setMediaLoading(false);
              }} onContextMenu={(event) => event.preventDefault()} src={`${selectedVideo.src}&renew=${mediaRefresh}`} poster={selectedVideo.posterSrc ?? undefined} onLoadedMetadata={(event) => {
              const current = event.currentTarget;
              const recovery = playbackRecoveryRef.current;
              playbackRecoveryRef.current = null;
              const stored = Number(
                selectedVideo.progress?.lastPositionSeconds || 0
              );

              const frontier = Number(
                selectedVideo.progress?.maxWatchedSeconds ??
                selectedVideo.progress?.lastPositionSeconds ?? 0
              );

              const position = recovery ? recovery.position : stored;

              const start = Math.max(0, Math.min(
                position,
                recovery ? Math.max(frontier, lastAllowedRef.current) : frontier,
                Math.max(0, current.duration - 0.5)
              ));

              lastAllowedRef.current = Math.max(
                recovery ? lastAllowedRef.current : 0,
                frontier,
                start
              );

              initializedRef.current = current;
              lastSentRef.current = start;
              observedRef.current = start;
              observedAtRef.current = performance.now();
              current.currentTime = start;
              setTimeline({ position: start, frontier: lastAllowedRef.current, duration: current.duration });
              if (recovery?.resume) {
                void current.play().catch(() => {
                  setMessage("Bağlantı yenilendi. Devam etmek için oynat düğmesine basın.");
                });
              } else if (recovery) {
                setMessage("");
              }
            }} onTimeUpdate={event => {
              updateBuffer(event.currentTarget);
              onTimeUpdate();
            }}
              onSeeking={(event) => {
                const current = event.currentTarget;

                if (initializedRef.current !== current) return;

                flushObserved(current);

                if (current.currentTime > lastAllowedRef.current + 0.05) {
                  current.currentTime = lastAllowedRef.current;
                }
              }}
              onSeeked={(event) => {
                const current = event.currentTarget;

                if (initializedRef.current !== current) return;

                if (current.currentTime > lastAllowedRef.current + 0.05) {
                  current.currentTime = lastAllowedRef.current;
                  return;
                }

                const position = Math.max(
                  0, Math.min(
                    current.currentTime,
                    lastAllowedRef.current
                  )
                );

                lastSentRef.current = position;
                observedRef.current = position;
                observedAtRef.current = performance.now();

                if (!draggingRef.current) setTimeline({ position, frontier: lastAllowedRef.current, duration: current.duration });
                saveResume(current);
              }}
              onPlay={() => {
                setMediaLoading(true);
                clearMediaStall();
                observedAtRef.current = performance.now();
                setIsPlaying(true);
              }}
              onPlaying={() => {
                clearMediaStall();
                setMediaLoading(false);
                setMessage("");
              }}
              onRateChange={(event) => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
              onWaiting={(event) => {
                updateBuffer(event.currentTarget);
                setMediaLoading(true);
                clearMediaStall();
                const element = event.currentTarget;
                mediaStallTimerRef.current = window.setTimeout(() => {
                  mediaStallTimerRef.current = null;
                  if (!element.paused && element.readyState < 3) {
                    recoverMedia(element);
                  }
                }, 12000);
              }}
              onError={(event) => recoverMedia(event.currentTarget)} onPause={(event) => {
        setMediaLoading(false);
        clearMediaStall();
        setIsPlaying(false);
        const current = event.currentTarget;
        if (!current.seeking) {
          samplePlayback(current, true);
          saveResume(current);
        }
      }} onEnded={(event) => {
        setIsPlaying(false);
        const current = event.currentTarget;
        samplePlayback(current, true);
        flushObserved(current, true);
        saveResume(current);
      }} /> : <div className="trainer-video-locked"><TrainerIcon name="lock" size={40}/><strong>Video kilitli</strong><span>Önceki videoyu tamamladığınızda açılır.</span></div>}
            {mediaLoading && selectedVideo?.src && (
              <div role="status" style={{
                position:"absolute", inset:0, zIndex:9,
                display:"grid", placeItems:"center", pointerEvents:"none",
                background:"rgba(0,0,0,.16)", color:"#fff"
              }}>
                <div style={{
                  width:"min(76%,420px)", padding:"22px",
                  borderRadius:14, background:"rgba(15,23,42,.42)",
                  textAlign:"center", boxShadow:"0 8px 32px #0002"
                }}>
                  <strong style={{color:"#fff",fontSize:18}}>
                    Video y&#252;kleniyor... %{bufferPercent}
                  </strong>
                  <div style={{
                    height:8, borderRadius:8, marginTop:14,
                    background:"rgba(255,255,255,.32)",overflow:"hidden"
                  }}>
                    <div style={{
                      width:`${bufferPercent}%`,height:"100%",
                      background:"#fff",borderRadius:8,
                      transition:"width .25s ease"
                    }}/>
                  </div>
                  <small style={{color:"#fff",display:"block",marginTop:10}}>
                    Video oynat&#305;lmaya haz&#305;rlan&#305;yor
                  </small>
                </div>
              </div>
            )}
            {isPlaying && !mediaLoading && <div className="trainer-video-playing-status" role="status"><span className="trainer-video-playing-dot" aria-hidden="true" />Video Oynatılıyor</div>}
            {completionToast && (
              <div className="trainer-video-completion-toast" role="status">
                <span aria-hidden="true">✓</span>
                <strong>Tebrikler {trainerFirstName} Hocam. Bu video eğitimini başarıyla tamamladınız.</strong>
                <small>{completionHasNext ? "Sıradaki eğitim videonuzun kilidi açıldı. Keyifli öğrenmeler!" : "Bu eğitimdeki tüm video derslerini tamamladınız. Tebrikler!"}</small>
              </div>
            )}
            <div className="trainer-video-watermark" aria-hidden="true">
  <strong className="trainer-video-watermark-name">{payload.watermark.name}</strong>

  <span className="trainer-video-watermark-warning"><span aria-hidden="true">⛔</span> Videonun FİXOKU Web Sayfası dışında gösterilmesi kesinlikle yasaktır.</span>
</div>
          </div>
          {selectedVideo?.src && (
            <div className="fixoku-watched-seekbar">
              <style>{`
                .trainer-video-page .fixoku-watched-seekbar input::-webkit-slider-runnable-track {
                  background:linear-gradient(to right,#f97316 0 var(--fixoku-watched),transparent var(--fixoku-watched) 100%),var(--fixoku-buffer,#475569);
                }
                .trainer-video-page .fixoku-watched-seekbar input::-moz-range-track {
                  background:linear-gradient(to right,#f97316 0 var(--fixoku-watched),transparent var(--fixoku-watched) 100%),var(--fixoku-buffer,#475569);
                }
                @media(max-width:760px){
                  .trainer-video-page .fixoku-watched-seekbar-labels{
                    flex-direction:column;gap:5px
                  }
                }
              `}</style>
              <input type="range" min={0} max={timeline.duration || 1} step={0.01}
                value={Math.min(timeline.position, timeline.duration || 1)}
                disabled={!timeline.duration}
                aria-label="Video izlenen bolumlerde ileri ve geri sarma"
                aria-valuetext={`${videoClock(timeline.position)} / ${videoClock(timeline.duration)}`}
                style={{ "--fixoku-buffer": bufferTrack, "--fixoku-watched": `${timeline.duration ? Math.min(100, 100 * timeline.frontier / timeline.duration) : 0}%` } as React.CSSProperties}
                onPointerDown={() => { draggingRef.current = true; dragTargetRef.current = timeline.position; }}
                onChange={(event) => {
                  const position = Math.max(0, Math.min(Number(event.currentTarget.value), lastAllowedRef.current));
                  dragTargetRef.current = position;
                  if (draggingRef.current) setTimeline(t => ({ ...t, position }));
                  else seekWatched(position);
                }}
                onPointerUp={() => { draggingRef.current = false; seekWatched(dragTargetRef.current); }}
                onBlur={() => { if (draggingRef.current) { draggingRef.current = false; seekWatched(dragTargetRef.current); } }}
                onPointerCancel={() => { draggingRef.current = false; if (videoRef.current) setTimeline(t => ({ ...t, position: videoRef.current!.currentTime })); }} />
              <div className="fixoku-watched-seekbar-labels"><span>&#304;zlenen s&#252;re: {videoClock(timeline.frontier)} / {videoClock(timeline.duration)}</span>
              <span>&#304;zleme ilerlemesi: %{timeline.duration ? Math.min(100,Math.floor(timeline.frontier/timeline.duration*100)) : 0}</span></div>
            </div>
          )}
          <p className="fixoku-r397-rule">
            Dersler sırayla tamamlanır. Bir sonraki dersin açılması için mevcut dersin en az %95 izlenmesi gerekir.
          </p>
        </div>
        <aside ref={videoRailRef} className="trainer-video-list" style={videoRailHeight ? ({ "--fixoku-video-rail-height": `${videoRailHeight}px` } as React.CSSProperties) : undefined} aria-label="Video dersleri"><h3>Video dersleri</h3>{cardList.length === 0 && <p role="status" style={{ padding: "12px" }}>Gerçek ders videoları henüz eklenmedi.</p>}{cardList.map((item, index) => <button key={item.videoIndex} type="button" className={`trainer-video-item ${index === selected ? "is-selected" : ""} ${item.locked ? "is-locked" : ""}`} disabled={item.locked} onClick={() => {
        latestFlushRef.current?.();
        setMessage("");
        setCompletionToast(false);
        setSelected(index);
      }}><TrainerVideoThumbnail
                posterSrc={item.posterSrc}
                locked={item.locked}
                index={item.videoIndex}
              />
              <span className="trainer-video-number">{item.locked ? <TrainerIcon name="lock" size={16}/> : item.videoIndex}</span><span className="trainer-video-item-copy"><strong>{item.title}{index === selected && isPlaying && !mediaLoading && !item.locked && <span className="fixoku-r397-watching">İzleniyor</span>}</strong><small className={item.progress?.completedAt ? "is-complete" : ""}>{item.locked ? "Önceki dersi tamamlayın" : item.progress?.completedAt ? `Tamamlandı · ${pct(item.progress.coverageBps)} izlendi` : item.progress ? `${pct(item.progress.coverageBps)} izlendi` : "İzlemeye hazır"}</small></span><span className="trainer-video-item-status" aria-hidden="true">{item.locked ? <TrainerIcon name="lock" size={15}/> : item.progress?.completedAt ? "✓" : "›"}</span></button>)}</aside>
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
