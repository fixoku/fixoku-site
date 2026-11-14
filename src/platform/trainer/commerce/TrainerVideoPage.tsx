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
      setMessage("Video bağlantısı yeniden kurulamadı. Sayfayı yenileyip tekrar deneyin.");
      return;
    }
    mediaRetriesRef.current += 1;
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
      <div className="trainer-commerce-heading"><Link to="/panel/egitmen/egitimlerim">← Eğitimlerim</Link><h2 style={{ textTransform: "none" }}>{formatTrainerCourseTitle(payload.package.title)}</h2><p
        className={activeTab === "videos" ? "trainer-tab-description" : "trainer-tab-description is-placeholder"}
        aria-hidden={activeTab !== "videos"}
      >
        Dersler sırayla tamamlanır. Bir sonraki dersin açılması için mevcut dersin en az %95 izlenmesi gerekir.
      </p></div>{activeTab === "videos" && <>
      {message && <p className={`trainer-commerce-message${message.startsWith("Video tamamlandı") ? " is-success" : ""}`} role="status">{message}</p>}
      <section className="trainer-video-layout">
        <div ref={videoMainRef} className="trainer-video-main">
          <div ref={videoFrameRef} className="trainer-video-frame">
            {cardList.length === 0 ? <div className="trainer-video-locked"><TrainerIcon name="book" size={40}/><strong>Video dersleri hazırlanıyor</strong><span>Bu eğitime ait gerçek ders videoları henüz eklenmedi. Müfredat ve Sunumlarım sekmelerini inceleyebilirsiniz.</span></div> : selectedVideo?.src ? <video ref={videoRef} key={`${selectedVideo.src}-${mediaRefresh}`} controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture disableRemotePlayback playsInline preload="metadata" onContextMenu={(event) => event.preventDefault()} src={`${selectedVideo.src}&renew=${mediaRefresh}`} poster={selectedVideo.posterSrc ?? undefined} onLoadedMetadata={(event) => {
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
            }} onTimeUpdate={() => onTimeUpdate()}
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
                clearMediaStall();
                observedAtRef.current = performance.now();
                setIsPlaying(true);
              }}
              onPlaying={() => { clearMediaStall(); setMessage(""); }}
              onRateChange={(event) => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
              onWaiting={(event) => {
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
            {isPlaying && <div className="trainer-video-playing-status" role="status"><span className="trainer-video-playing-dot" aria-hidden="true" />Video Oynatılıyor</div>}
            {completionToast && (
              <div className="trainer-video-completion-toast" role="status">
                <span aria-hidden="true">✓</span>
                <strong>Tebrikler {trainerFirstName} Hocam! Bu video eğitimini başarıyla tamamladınız.</strong>
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
              <input type="range" min={0} max={timeline.duration || 1} step={0.01}
                value={Math.min(timeline.position, timeline.duration || 1)}
                disabled={!timeline.duration}
                aria-label="Video izlenen bolumlerde ileri ve geri sarma"
                aria-valuetext={`${videoClock(timeline.position)} / ${videoClock(timeline.duration)}`}
                style={{ "--fixoku-watched": `${timeline.duration ? Math.min(100, 100 * timeline.frontier / timeline.duration) : 0}%` } as React.CSSProperties}
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
              <div className="fixoku-watched-seekbar-labels"><span>{videoClock(timeline.position)} / {videoClock(timeline.duration)}</span><span>Izlenen: {videoClock(timeline.frontier)}</span></div>
            </div>
          )}
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
              <span className="trainer-video-number">{item.locked ? <TrainerIcon name="lock" size={16}/> : item.videoIndex}</span><span className="trainer-video-item-copy"><strong>{item.title}</strong><small className={item.progress?.completedAt ? "is-complete" : ""}>{item.locked ? "Önceki dersi tamamlayın" : item.progress?.completedAt ? `Tamamlandı · ${pct(item.progress.coverageBps)} izlendi` : item.progress ? `${pct(item.progress.coverageBps)} izlendi` : "İzlemeye hazır"}</small></span><span className="trainer-video-item-status" aria-hidden="true">{item.locked ? <TrainerIcon name="lock" size={15}/> : item.progress?.completedAt ? "✓" : "›"}</span></button>)}</aside>
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
