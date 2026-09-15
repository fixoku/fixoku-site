import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trainerStories } from "../data/trainerStories.js";
import StoryVideoModal from "./StoryVideoModal.jsx";

export default function TrainerStoriesSection({
  className = "",
  subtitle = "Fixoku eğitmenleri, sistemin öğrenciler üzerindeki etkilerini ve eğitim sürecindeki deneyimlerini anlatıyor.",
}) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);
  const storiesGridRef = useRef(null);
  const closeVideo = useCallback(() => setActiveVideoIndex(null), []);
  const showPreviousVideo = useCallback(() => {
    setActiveVideoIndex((currentIndex) => (
      currentIndex === null
        ? null
        : Math.max(0, currentIndex - 1)
    ));
  }, []);
  const showNextVideo = useCallback(() => {
    setActiveVideoIndex((currentIndex) => (
      currentIndex === null ? null : Math.min(trainerStories.length - 1, currentIndex + 1)
    ));
  }, []);
  const scrollStories = (direction) => {
    storiesGridRef.current?.scrollBy({
      left: direction * storiesGridRef.current.clientWidth * 0.86,
      behavior: "smooth",
    });
  };

  return (
    <section className={`trainer-videos-section ${className}`.trim()}>
      <div className="trainer-videos-container">
        <div className="trainer-videos-heading">
          <h2 className="trainer-videos-title"><span>Fixoku</span> Eğitmenleri Ne Söylüyor?</h2>
          <p className="trainer-videos-subtitle">{subtitle}</p>
        </div>
        <div className="trainer-videos-panel">
          <button type="button" className="trainer-slider-arrow trainer-slider-prev" onClick={() => scrollStories(-1)} aria-label="Önceki video">‹</button>
          <div className="trainer-videos-grid" ref={storiesGridRef}>
            {trainerStories.map((story, storyIndex) => (
              <button type="button" className="trainer-video-card" key={story.id} onClick={() => setActiveVideoIndex(storyIndex)} aria-label={`${story.badge}: ${story.title} videosunu oynat`}>
                <div className="trainer-video-badge">{story.badge}</div>
                <div className="trainer-video-media" style={{ backgroundImage: `url(${story.poster})` }}>
                  <div className="trainer-video-overlay" />
                  <div className="trainer-video-play">
                    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                      <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.2)" />
                      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                      <path d="M27 21l17 11-17 11V21z" fill="white" />
                    </svg>
                  </div>
                  <div className="trainer-video-meta">
                    <div className="trainer-video-name">{story.title}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button type="button" className="trainer-slider-arrow trainer-slider-next" onClick={() => scrollStories(1)} aria-label="Sonraki video">›</button>
        </div>
        <div className="trainer-apply-panel">
          <h3>Siz de <span>Fixoku</span> Eğitmeni Olabilirsiniz</h3>
          <p>Fixoku eğitmeni olarak kendi eğitim programınızı başlatabilir ve öğrencilerinizin gelişimine katkı sağlayabilirsiniz.</p>
          <Link to="/hizli-okuma-egitmeni-ol" className="trainer-apply-btn"><span>Eğitmen Başvurusu Yap</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
        </div>
      </div>
      {activeVideoIndex !== null && (
        <StoryVideoModal
          story={trainerStories[activeVideoIndex]}
          currentPosition={activeVideoIndex + 1}
          total={trainerStories.length}
          storyType="eğitmen"
          onClose={closeVideo}
          onPrevious={showPreviousVideo}
          onNext={showNextVideo}
        />
      )}
    </section>
  );
}
