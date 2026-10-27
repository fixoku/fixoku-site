import { useCallback, useEffect, useRef, useState } from "react";
import { trainerLandingVideoMedia } from "../data/trainerLandingVideoMedia.js";
import "./trainer-intro-video-section.css";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 8 6-8 6V6Z" fill="currentColor" />
    </svg>
  );
}

export default function TrainerIntroVideoSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const videoRef = useRef(null);
  const activeVideo = trainerLandingVideoMedia[activeIndex];

  const closeModal = useCallback(() => setIsOpen(false), []);
  const moveVideo = useCallback((direction) => {
    setActiveIndex((current) => (
      (current + direction + trainerLandingVideoMedia.length) % trainerLandingVideoMedia.length
    ));
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocusedElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveVideo(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveVideo(1);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      previousFocusedElement?.focus?.();
    };
  }, [closeModal, isOpen, moveVideo]);

  const attachVideo = useCallback((node) => {
    videoRef.current = node;
    if (!node) return;
    const playAttempt = node.play();
    playAttempt?.catch?.(() => {});
  }, []);

  return (
    <div className="trainer-intro-video" data-video-count={trainerLandingVideoMedia.length}>
      <div className="trainer-intro-video-preview-column">
        <button
          type="button"
          className="trainer-intro-video-preview"
          onClick={() => setIsOpen(true)}
          aria-label={`${activeVideo.title} videosunu oynat`}
        >
          <img src={activeVideo.poster} alt={`${activeVideo.title} kapak görseli`} />
          <span className="trainer-intro-video-preview-shade" aria-hidden="true" />
          <span className="trainer-intro-video-play" aria-hidden="true"><PlayIcon /></span>
          <span className="sr-only">{activeVideo.title} videosunu aç</span>
        </button>
        <div className="trainer-intro-video-copy" aria-live="polite">
          <span className="trainer-intro-video-eyebrow">{activeVideo.number} / {trainerLandingVideoMedia.length}</span>
          <h3>{activeVideo.title}</h3>
        </div>
      </div>

      <ol className="trainer-intro-video-list" aria-label="Eğitmenlik modeli videoları">
        {trainerLandingVideoMedia.map((video, index) => (
          <li key={video.id}>
            <button
              type="button"
              className={`trainer-intro-video-item${index === activeIndex ? " is-active" : ""}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            >
              <span className="trainer-intro-video-number">{video.number}</span>
              <span className="trainer-intro-video-item-title">{video.title}</span>
              <span className="trainer-intro-video-item-play" aria-hidden="true"><PlayIcon /></span>
            </button>
          </li>
        ))}
      </ol>

      {isOpen && (
        <div
          className="trainer-intro-video-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Eğitmenlik modeli videosu: ${activeVideo.title}`}
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        >
          <div className="trainer-intro-video-modal-inner">
            <button ref={closeButtonRef} type="button" className="trainer-intro-video-close" onClick={closeModal} aria-label="Videoyu kapat">×</button>
            <button type="button" className="trainer-intro-video-modal-arrow is-previous" onClick={() => moveVideo(-1)} aria-label="Önceki video">‹</button>
            <video
              key={activeVideo.id}
              ref={attachVideo}
              src={activeVideo.video}
              poster={activeVideo.poster}
              controls
              autoPlay
              playsInline
              preload="auto"
              className="trainer-intro-video-player"
            />
            <button type="button" className="trainer-intro-video-modal-arrow is-next" onClick={() => moveVideo(1)} aria-label="Sonraki video">›</button>
            <div className="trainer-intro-video-modal-details" aria-live="polite">
              <strong>{activeVideo.title}</strong>
              <span>{activeVideo.number} / {trainerLandingVideoMedia.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
