import { useEffect, useState } from "react";
import { nedenFixokuPromoVideo } from "../data/promoVideoMedia.js";
import "./shared-promo-video.css";

export default function SharedPromoVideo({
  context = "home",
  className = "",
  title = "Neden Fixoku?",
  label = "Neden Fixoku tanıtım videosunu oynat",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const poster = nedenFixokuPromoVideo.posters[context] ?? nedenFixokuPromoVideo.posters.home;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`shared-promo-video shared-promo-video-${context} ${className}`.trim()}
        aria-label={label}
        onClick={() => setIsOpen(true)}
      >
        <picture>
          <source media="(max-width: 768px)" srcSet={poster.mobile} />
          <img src={poster.desktop} alt="" loading="lazy" decoding="async" />
        </picture>
        <span className="shared-promo-video-shade" aria-hidden="true" />
        <span className="shared-promo-video-play" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="29" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.72)" strokeWidth="2" />
            <path d="M27 21 44 32 27 43V21Z" fill="white" />
          </svg>
        </span>
        <span className="shared-promo-video-caption">{title}</span>
      </button>

      {isOpen && (
        <div className="shared-promo-video-modal" role="dialog" aria-modal="true" aria-label={title} onClick={() => setIsOpen(false)}>
          <div className="shared-promo-video-modal-inner" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="shared-promo-video-close" onClick={() => setIsOpen(false)} aria-label="Videoyu kapat">×</button>
            <video
              src={nedenFixokuPromoVideo.video}
              poster={poster.desktop}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="shared-promo-video-player"
            />
          </div>
        </div>
      )}
    </>
  );
}
