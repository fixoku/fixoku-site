import { useCallback, useEffect, useRef } from "react";

export default function StoryVideoModal({
  story,
  currentPosition,
  total,
  storyType,
  onClose,
  onPrevious,
  onNext,
}) {
  const closeButtonRef = useRef(null);
  const videoRef = useRef(null);

  // The modal is mounted from the card's user gesture. A callback ref runs
  // during that same React commit, so attempt normal-audio playback as soon
  // as the new element exists instead of relying on autoPlay alone (which is
  // commonly blocked on mobile after an asynchronous effect).
  const attachVideo = useCallback((node) => {
    videoRef.current = node;
    if (!node) return;

    const playAttempt = node.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {
        // Browser policy may reject playback; absorb the promise rejection so
        // the page does not emit an unhandled rejection. Audio is never muted.
      });
    }
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition <= 1) return;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    onPrevious();
  }, [currentPosition, onPrevious]);

  const navigateNext = useCallback(() => {
    if (currentPosition >= total) return;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    onNext();
  }, [currentPosition, onNext, total]);

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      previouslyFocusedElement?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigatePrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateNext();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigateNext, navigatePrevious, onClose]);

  if (!story) return null;

  return (
    <div
      className="trainer-video-modal story-video-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${storyType} videosu: ${story.title}`}
      onClick={onClose}
    >
      <div className="trainer-video-modal-inner story-video-modal-inner" onClick={(event) => event.stopPropagation()}>
        <button ref={closeButtonRef} type="button" className="trainer-video-close" onClick={onClose} aria-label="Videoyu kapat">×</button>
        <button
          type="button"
          className="story-video-modal-arrow story-video-modal-previous"
          onClick={navigatePrevious}
          disabled={currentPosition <= 1}
          aria-label={`Önceki ${storyType} videosu`}
        >
          ‹
        </button>
        <video
          ref={attachVideo}
          key={story.id}
          src={story.video}
          poster={story.poster}
          preload="auto"
          controls
          autoPlay
          playsInline
          className="trainer-video-player"
        />
        <button
          type="button"
          className="story-video-modal-arrow story-video-modal-next"
          onClick={navigateNext}
          disabled={currentPosition >= total}
          aria-label={`Sonraki ${storyType} videosu`}
        >
          ›
        </button>
        <div className="story-video-modal-details" aria-live="polite">
          <strong>{story.title}</strong>
          <span>{currentPosition} / {total}</span>
        </div>
      </div>
    </div>
  );
}
