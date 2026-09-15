import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatSocialProofCount,
  TRAINED_STUDENT_COUNT,
} from "../data/socialProof.js";
import { publicStudentVideoMedia } from "../data/publicVideoMedia.js";
import StoryVideoModal from "./StoryVideoModal.jsx";

const studentStories = publicStudentVideoMedia;
export default function StudentStoriesSection({
  className = "",
  subtitle = "Fixoku hızlı okuma ve dikkat geliştirme eğitimi alan öğrenciler ve veliler, eğitim sürecindeki deneyimlerini paylaşıyor.",
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
      currentIndex === null ? null : Math.min(studentStories.length - 1, currentIndex + 1)
    ));
  }, []);
  const scrollStories = (direction) => {
    storiesGridRef.current?.scrollBy({
      left: direction * storiesGridRef.current.clientWidth * 0.86,
      behavior: "smooth",
    });
  };

  return (
    <section className={`stories-section ${className}`.trim()}>
      <div className="stories-container">
        <div className="stories-heading">
          <h2 className="stories-title">
            <span>Fixoku</span> Eğitimi Alan Öğrenciler ve Veliler
            <br />
            Ne Söylüyor?
          </h2>

          <p className="stories-subtitle">{subtitle}</p>
        </div>

        <div className="stories-panel">
          <button
            type="button"
            className="story-slider-arrow story-slider-prev"
            onClick={() => scrollStories(-1)}
            aria-label="Önceki öğrenci videosu"
          >
            ‹
          </button>

          <div className="stories-grid" ref={storiesGridRef}>
            {studentStories.map((story, storyIndex) => (
              <button
                type="button"
                className="story-card"
                key={story.id}
                aria-label={`${story.badge}: ${story.title} videosunu oynat`}
                onClick={() => setActiveVideoIndex(storyIndex)}
              >
                <div className="story-badge">
                  {story.badge}
                </div>
                <div className="story-media" style={{ backgroundImage: `url(${story.poster})` }}>
                  <div className="story-overlay" />
                  <div className="story-play">
                    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                      <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.18)" />
                      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                      <path d="M27 21l16 11-16 11V21z" fill="white" />
                    </svg>
                  </div>

                  <div className="story-meta">
                    <div className="story-name">{story.title}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="story-slider-arrow story-slider-next"
            onClick={() => scrollStories(1)}
            aria-label="Sonraki öğrenci videosu"
          >
            ›
          </button>

          <div className="stories-footer">
            <div className="stories-footer-left">
              <div className="stories-coin" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="28" fill="url(#storiesCoinGrad)" />
                  <path
                    d="M32 18l4.4 8.9 9.8 1.4-7.1 6.9 1.7 9.8L32 40.4l-8.8 4.6 1.7-9.8-7.1-6.9 9.8-1.4L32 18Z"
                    fill="#8f5a00"
                  />
                </svg>
              </div>

              <p>
                <strong>{formatSocialProofCount(TRAINED_STUDENT_COUNT)}</strong> öğrenci eğitim aldı
              </p>
            </div>

            <Link to="/iletisim" className="stories-cta">
              <span>Siz de Fixoku Eğitimi Hakkında Bilgi Alın</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {activeVideoIndex !== null && (
        <StoryVideoModal
          story={studentStories[activeVideoIndex]}
          currentPosition={activeVideoIndex + 1}
          total={studentStories.length}
          storyType="öğrenci"
          onClose={closeVideo}
          onPrevious={showPreviousVideo}
          onNext={showNextVideo}
        />
      )}
    </section>
  );
}
