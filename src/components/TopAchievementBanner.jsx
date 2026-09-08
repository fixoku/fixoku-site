import { useEffect, useId, useState } from "react";

const achievementMessages = [
  "İstediği Okulu Kazandı",
  "İstediği başarıyı yakaladı",
  "okumasını geliştirdi",
  "paragraf tekniklerini öğrendi.",
];

const ROTATION_INTERVAL_MS = 3600;

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function TrophyTargetArtwork() {
  const artworkId = useId().replace(/:/g, "");
  const goldGradientId = `topAchievementGold-${artworkId}`;
  const darkGradientId = `topAchievementGoldDark-${artworkId}`;
  const arrowGradientId = `topAchievementArrow-${artworkId}`;

  return (
    <svg
      className="top-achievement-artwork"
      viewBox="0 0 190 92"
      role="img"
      aria-label="Başarı kupası, hedef ve ok"
      focusable="false"
    >
      <defs>
        <linearGradient id={goldGradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe98a" />
          <stop offset="0.48" stopColor="#f8c53c" />
          <stop offset="1" stopColor="#c88600" />
        </linearGradient>
        <linearGradient id={darkGradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c98b09" />
          <stop offset="1" stopColor="#815000" />
        </linearGradient>
        <linearGradient id={arrowGradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dc382a" />
          <stop offset="1" stopColor="#a82028" />
        </linearGradient>
      </defs>

      <g className="top-achievement-trophy" aria-hidden="true">
        <ellipse cx="104" cy="84" rx="34" ry="4" fill="#6d3f00" opacity="0.22" />
        <path
          d="M76 18H124V30C124 47 113 59 100 64C87 59 76 47 76 30V18Z"
          fill={`url(#${goldGradientId})`}
          stroke="#b87900"
          strokeWidth="1.4"
        />
        <path
          d="M76 25H64C57 25 52 30 52 37C52 47 61 53 73 53"
          fill="none"
          stroke="#e8b62a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M124 25H136C143 25 148 30 148 37C148 47 139 53 127 53"
          fill="none"
          stroke="#d99c0a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="M100 64V75" stroke="#a76b00" strokeWidth="8" strokeLinecap="round" />
        <path d="M85 78H115" stroke={`url(#${darkGradientId})`} strokeWidth="8" strokeLinecap="round" />
        <path d="M85 78H115" stroke="#f2c23b" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M84 23C88 27 91 29 96 30" fill="none" stroke="#fff2a8" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      </g>

      <g className="top-achievement-target" aria-hidden="true">
        <circle cx="43" cy="55" r="24" fill="#f6d35f" stroke="#bc8000" strokeWidth="1.4" />
        <circle cx="43" cy="55" r="18" fill="#24192b" />
        <circle cx="43" cy="55" r="12" fill="#f6d35f" />
        <circle cx="43" cy="55" r="7" fill="#d53a31" />
        <circle cx="43" cy="55" r="2.8" fill="#ffe58a" />
        <path d="M5 57H28" stroke="#b87900" strokeWidth="4" strokeLinecap="round" />
        <path d="M28 57L19 50" stroke="#b87900" strokeWidth="4" strokeLinecap="round" />
        <path d="M28 57L19 64" stroke="#b87900" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g className="top-achievement-arrow" aria-hidden="true">
        <path d="M4 58L43 55" stroke={`url(#${arrowGradientId})`} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M31 45L44 55L31 65" fill="none" stroke="#a82028" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default function TopAchievementBanner() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % achievementMessages.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="top-achievement-banner" aria-label="Fixoku öğrenci başarıları">
      <div className="top-achievement-inner">
        <div className="top-achievement-art" aria-hidden="true">
          <TrophyTargetArtwork />
        </div>
        <p className="top-achievement-copy">
          <span className="top-achievement-prefix">Binlerce Öğrenci Fixoku Eğitimleri ile</span>
          <span className="top-achievement-suffix" key={achievementMessages[messageIndex]} aria-live="polite">
            {achievementMessages[messageIndex]}
          </span>
        </p>
      </div>
    </div>
  );
}
