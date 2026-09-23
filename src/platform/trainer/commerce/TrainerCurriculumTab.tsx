import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CurriculumItem = {
  index: number;
  type: "slide" | "video";
  slideNo: number;
  title: string;
  src: string;
  thumbSrc: string;
};

type CurriculumPayload = {
  slideCount: number;
  videoCount: number;
  itemCount: number;
  items: CurriculumItem[];
};

type StoredProgress = {
  maxUnlockedIndex: number;
  completedVideoItems: number[];
};

export function TrainerCurriculumTab({
  packageId,
  watermarkName,
}: {
  packageId: string;
  watermarkName: string;
}) {
  const [payload, setPayload] =
    useState<CurriculumPayload | null>(null);

  const [selected, setSelected] = useState(0);

  const [status, setStatus] =
    useState<"loading" | "ready" | "error">("loading");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(0);

  const [completedVideoItems, setCompletedVideoItems] =
    useState<Set<number>>(() => new Set());

  const curriculumVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoAllowedRef = useRef(0);

  const storageKey = `fixoku-curriculum-progress:${packageId}`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");

      try {
        const response = await fetch(
          `/api/trainer/curriculum?packageId=${encodeURIComponent(packageId)}`,
          { credentials: "same-origin" }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const body =
          await response.json() as CurriculumPayload;

        if (
          !Array.isArray(body.items) ||
          body.items.length === 0
        ) {
          throw new Error("EMPTY_CURRICULUM");
        }

        let stored: StoredProgress | null = null;

        try {
          const raw = sessionStorage.getItem(storageKey);
          stored = raw ? JSON.parse(raw) as StoredProgress : null;
        }
        catch {
          stored = null;
        }

        const restoredMax = stored
          ? Math.max(
              0,
              Math.min(
                Number(stored.maxUnlockedIndex || 0),
                body.items.length - 1
              )
            )
          : 0;

        const restoredCompleted = new Set<number>(
          Array.isArray(stored?.completedVideoItems)
            ? stored!.completedVideoItems
                .map(Number)
                .filter(Number.isFinite)
            : []
        );

        if (!cancelled) {
          setPayload(body);
          setSelected(0);
          setMaxUnlockedIndex(restoredMax);
          setCompletedVideoItems(restoredCompleted);
          setIsPlaying(false);
          setStatus("ready");
        }
      }
      catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [packageId, storageKey]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    try {
      const stored: StoredProgress = {
        maxUnlockedIndex,
        completedVideoItems: Array.from(completedVideoItems),
      };

      sessionStorage.setItem(
        storageKey,
        JSON.stringify(stored)
      );
    }
    catch {
      // Session storage is only a convenience layer.
    }
  }, [
    payload,
    maxUnlockedIndex,
    completedVideoItems,
    storageKey,
  ]);

  useEffect(() => {
    setIsPlaying(false);
    videoAllowedRef.current = 0;

    const current = payload?.items[selected];

    if (!current) {
      return;
    }

    document
      .getElementById(`curriculum-item-${current.index}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, payload, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeFromEscape = () => {
      setIsPlaying(false);
      setIsFullscreen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        closeFromEscape();
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        closeFromEscape();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
    };
  }, [isFullscreen]);

  if (status === "loading") {
    return (
      <section className="trainer-curriculum-panel">
        <p role="status">Müfredat yükleniyor...</p>
      </section>
    );
  }

  if (
    status === "error" ||
    !payload ||
    payload.items.length === 0
  ) {
    return (
      <section className="trainer-curriculum-panel">
        <p role="alert">Müfredat görüntülenemedi.</p>
      </section>
    );
  }

  const current = payload.items[selected];

  const currentVideoComplete =
    current.type !== "video" ||
    completedVideoItems.has(current.index);

  const canGoNext =
    selected < payload.items.length - 1 &&
    currentVideoComplete;

  const selectItem = (index: number) => {
    if (index > maxUnlockedIndex) {
      return;
    }

    setIsPlaying(false);
    setSelected(index);
  };

  const previous = () => {
    setIsPlaying(false);
    setSelected((value) => Math.max(0, value - 1));
  };

  const next = () => {
    if (!canGoNext) {
      return;
    }

    const nextIndex = Math.min(
      payload.items.length - 1,
      selected + 1
    );

    setMaxUnlockedIndex((value) =>
      Math.max(value, nextIndex)
    );

    setIsPlaying(false);
    setSelected(nextIndex);
  };

  const markCurrentVideoComplete = () => {
    if (current.type !== "video") {
      return;
    }

    setIsPlaying(false);

    setCompletedVideoItems((previousSet) => {
      const nextSet = new Set(previousSet);
      nextSet.add(current.index);
      return nextSet;
    });

    if (selected < payload.items.length - 1) {
      setMaxUnlockedIndex((value) =>
        Math.max(value, selected + 1)
      );
    }
  };

  const openFullscreen = () => {
    setIsFullscreen(true);

    if (
      !document.fullscreenElement &&
      document.documentElement.requestFullscreen
    ) {
      void document.documentElement
        .requestFullscreen()
        .catch(() => {
          // Fixed modal still gives a full viewport fallback.
        });
    }
  };

  const closeFullscreen = () => {
    setIsPlaying(false);
    setIsFullscreen(false);

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Modal is already closed.
      });
    }
  };

  const rail = (mode: "preview" | "fullscreen") => (
    <aside
      className={`trainer-curriculum-list trainer-curriculum-list-${mode}`}
      aria-label="Müfredat içeriği"
    >
      <div className="trainer-curriculum-list-heading">
        <strong>Müfredat İçeriği</strong>
        <span>{payload.items.length} öğe</span>
      </div>

      <div className="trainer-curriculum-list-scroll">
        {payload.items.map((item, index) => {
          const locked = index > maxUnlockedIndex;
          const complete =
            item.type === "video" &&
            completedVideoItems.has(item.index);

          return (
            <button
              id={`curriculum-item-${item.index}`}
              key={item.index}
              type="button"
              disabled={locked}
              className={[
                "trainer-curriculum-list-item",
                item.type === "video"
                  ? "is-video"
                  : "is-slide",
                index === selected
                  ? "is-active"
                  : "",
                locked
                  ? "is-locked"
                  : "",
                complete
                  ? "is-complete"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => selectItem(index)}
            >
              <span
                className="trainer-curriculum-thumb"
                aria-hidden="true"
              >
                <img
                  src={item.thumbSrc}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />

                {item.type === "video" && (
                  <span className="trainer-curriculum-thumb-play">
                    {complete ? "✓" : locked ? "🔒" : "▶"}
                  </span>
                )}
              </span>

              <span className="trainer-curriculum-list-copy">
                <strong>{item.title}</strong>

                <small>
                  {locked
                    ? "Kilitli"
                    : complete
                      ? "Tamamlandı"
                      : item.type === "video"
                        ? "Video"
                        : "Slayt"}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );

  const fullscreen =
    isFullscreen &&
    createPortal(
      <div
        className="trainer-curriculum-fullscreen"
        role="dialog"
        aria-modal="true"
        aria-label="Müfredat tam ekran görüntüleyici"
        onContextMenu={(event) => event.preventDefault()}
      >
        <header className="trainer-curriculum-fullscreen-header">
          <div>
            <strong>İlkokul Akıcı ve Hızlı Okuma Eğitimi</strong>

            <span>
              {payload.slideCount} slayt
              {" • "}
              {payload.videoCount} video
            </span>
          </div>

          <button
            type="button"
            className="trainer-curriculum-close"
            aria-label="Müfredatı kapat"
            onClick={closeFullscreen}
          >
            ×
          </button>
        </header>

        <div className="trainer-curriculum-fullscreen-body">
          <main className="trainer-curriculum-fullscreen-main">
            <div className="trainer-curriculum-fullscreen-stage">
              {current.type === "slide" ? (
                <img
                  key={current.src}
                  src={current.src}
                  alt={`Müfredat slaytı ${current.slideNo}`}
                  draggable={false}
                />
              ) : (
                <video
                  ref={curriculumVideoRef}
                  key={current.src}
                  className="trainer-curriculum-fullscreen-video"
                  src={current.src}
                  poster={current.thumbSrc}
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                  disableRemotePlayback
                  playsInline
                  preload="metadata"
                  onContextMenu={(event) =>
                    event.preventDefault()
                  }
                  onLoadedMetadata={(event) => {
                    const element = event.currentTarget;
                    videoAllowedRef.current = 0;
                    element.currentTime = 0;
                  }}
                  onTimeUpdate={(event) => {
                    const element = event.currentTarget;

                    if (!element.seeking) {
                      videoAllowedRef.current = Math.max(
                        videoAllowedRef.current,
                        element.currentTime
                      );
                    }
                  }}
                  onSeeking={(event) => {
                    const element = event.currentTarget;

                    if (
                      element.currentTime >
                      videoAllowedRef.current + 0.15
                    ) {
                      element.currentTime =
                        videoAllowedRef.current;
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={markCurrentVideoComplete}
                />
              )}

              {current.type === "video" && isPlaying && (
                <div
                  className="trainer-video-playing-status"
                  role="status"
                >
                  <span
                    className="trainer-video-playing-dot"
                    aria-hidden="true"
                  />

                  Video Oynatılıyor
                </div>
              )}

              <div
                className="trainer-curriculum-watermark trainer-curriculum-watermark-fullscreen"
                aria-hidden="true"
              >
                <strong>{watermarkName}</strong>

                <span>
                  ⛔ Videonun FİXOKU Web Sayfası dışında
                  gösterilmesi kesinlikle yasaktır.
                </span>
              </div>
            </div>

            <footer className="trainer-curriculum-fullscreen-footer">
              <button
                type="button"
                disabled={selected === 0}
                onClick={previous}
              >
                ← Önceki
              </button>

              <div>
                <strong>{current.title}</strong>

                <span>
                  {selected + 1} / {payload.items.length}
                  {" • "}
                  {current.type === "video" &&
                    !currentVideoComplete
                    ? "Videoyu tamamlayın"
                    : "Devam edebilirsiniz"}
                </span>
              </div>

              <button
                type="button"
                disabled={!canGoNext}
                onClick={next}
              >
                Sonraki →
              </button>
            </footer>
          </main>

          {rail("fullscreen")}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <section
        className="trainer-curriculum-panel"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="trainer-curriculum-summary">
          <strong>Müfredat</strong>

          <span>
            {payload.slideCount} slayt
            {" • "}
            {payload.videoCount} video
          </span>
        </div>

        <div className="trainer-curriculum-layout trainer-curriculum-preview-layout">
          <div className="trainer-curriculum-main">
            <div className="trainer-curriculum-stage trainer-curriculum-preview-stage">
              <img
                src={
                  current.type === "slide"
                    ? current.src
                    : current.thumbSrc
                }
                alt={`${current.title} önizlemesi`}
                draggable={false}
              />

              <div className="trainer-curriculum-preview-shade" />

              <button
                type="button"
                className="trainer-curriculum-launch"
                onClick={openFullscreen}
              >
                <span aria-hidden="true">▶</span>
                <strong>Müfredatı İnceleyin</strong>
                <small>Tam ekranda aç</small>
              </button>
            </div>

            <div className="trainer-curriculum-navigation">
              <button
                type="button"
                disabled={selected === 0}
                onClick={previous}
              >
                ← Önceki
              </button>

              <div>
                <strong>{current.title}</strong>

                <span>
                  {selected + 1} / {payload.items.length}
                </span>
              </div>

              <button
                type="button"
                disabled={!canGoNext}
                onClick={next}
              >
                Sonraki →
              </button>
            </div>
          </div>

          {rail("preview")}
        </div>
      </section>

      {fullscreen}
    </>
  );
}