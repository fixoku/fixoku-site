// FIXOKU_TRAINER_BADGES_R5: React-owned presentation, no DOM mutation.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { badgeForQualificationTitleR5 } from './fixokuTrainerBadgeMapR5';
import './fixokuTrainerBadgeR5.css';

type Props = { title: string; fallback: ReactNode; size?: number; zoomSize?: number };
type ZoomPosition = { left: number; top: number };

export function TrainerQualificationBadgeR5({ title, fallback, size = 42, zoomSize }: Props) {
  const badge = badgeForQualificationTitleR5(title);
  const anchor = useRef<HTMLSpanElement>(null);
  const [zoom, setZoom] = useState<ZoomPosition | null>(null);

  useEffect(() => {
    if (zoom === null) return;
    const close = () => setZoom(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [zoom]);

  if (!badge) return <>{fallback}</>;

  function open() {
    if (!anchor.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const width = zoomSize ?? (size * 3);
    const gap = 10;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), Math.max(8, window.innerWidth - width - 8));
    const below = rect.bottom + gap;
    const above = rect.top - width - gap;
    const top = below + width <= window.innerHeight - 8 ? below : Math.max(8, above);
    setZoom({ left, top });
  }

  return (
    <>
      <span
        ref={anchor}
        className="fixoku-trainer-badge-r5"
        style={{ width: size, height: size, minWidth: size, flexBasis: size }}
        role="img"
        tabIndex={0}
        aria-label={badge.name}
        title={badge.name}
        onMouseEnter={open}
        onMouseLeave={() => setZoom(null)}
        onFocus={open}
        onBlur={() => setZoom(null)}
      >
        <img src={badge.src} alt="" width={size} height={size} loading="lazy" style={{ width: size, height: size }} />
      </span>
      {zoom !== null && typeof document !== 'undefined' && createPortal(
        <div
          className="fixoku-trainer-badge-zoom-r5"
          style={{ left: zoom.left, top: zoom.top, width: zoomSize ?? (size * 3), height: zoomSize ?? (size * 3) }}
          aria-hidden="true"
        >
          <img src={badge.src} alt="" width={zoomSize ?? (size * 3)} height={zoomSize ?? (size * 3)} />
        </div>,
        document.body,
      )}
    </>
  );
}