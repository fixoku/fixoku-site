import { useEffect } from 'react';
import { badgeForTrainerText, normalizeFixokuTrainerBadgeText } from './fixokuTrainerBadges';
import './fixokuTrainerBadges.css';

export function useFixokuTrainerBadges(): void {
  useEffect(() => {
    const created = new Set<HTMLElement>();
    const hiddenIcons = new Map<SVGElement, string | null>();
    let zoom: HTMLElement | null = null;
    let scheduled = false;
    let rafId = 0;

    const closeZoom = () => {
      if (zoom) { zoom.remove(); zoom = null; }
    };
    const showZoom = (anchor: HTMLElement, source: string, label: string) => {
      closeZoom();
      const popup = document.createElement('div');
      popup.className = 'fixoku-trainer-badge-zoom';
      popup.setAttribute('role', 'img');
      popup.setAttribute('aria-label', label);
      const picture = document.createElement('img');
      picture.src = source;
      picture.alt = '';
      popup.appendChild(picture);
      const rect = anchor.getBoundingClientRect();
      const left = rect.right + 12 + 96 <= window.innerWidth ? rect.right + 12 : rect.left - 108;
      popup.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 100))}px`;
      popup.style.top = `${Math.max(8, Math.min(rect.top - 29, window.innerHeight - 100))}px`;
      document.body.appendChild(popup);
      zoom = popup;
    };

    const scan = () => {
      scheduled = false;
      // Exact label matching prevents adding 'earned' badges to unrelated trainer text.
      const elements = document.querySelectorAll<HTMLElement>('span, strong, small, label, p, div');
      elements.forEach((element) => {
        if (element.closest('.fixoku-trainer-badge-inline, .fixoku-trainer-badge-zoom')) return;
        if (element.hasAttribute('data-fixoku-trainer-badge')) {
          if (element.querySelector(':scope > .fixoku-trainer-badge-inline')) return;
          element.removeAttribute('data-fixoku-trainer-badge'); // React may have re-rendered the element.
        }
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 58) return;
        const badge = badgeForTrainerText(text);
        if (!badge) return;
        // Choose the innermost matching element, avoiding duplicate badges on ancestor nodes.
        if (Array.from(element.children).some((child) =>
          normalizeFixokuTrainerBadgeText(child.textContent || '') === normalizeFixokuTrainerBadgeText(text))) return;

        // Only conceal an SVG that belongs directly to this exact label, not nearby action icons.
        const icon = Array.from(element.children).find((child) => child.tagName.toLowerCase() === 'svg');
        if (icon instanceof SVGElement && !hiddenIcons.has(icon)) {
          hiddenIcons.set(icon, icon.getAttribute('style'));
          icon.style.display = 'none';
        }
        const wrapper = document.createElement('span');
        wrapper.className = 'fixoku-trainer-badge-inline';
        wrapper.setAttribute('data-fixoku-trainer-badge', badge.key);
        wrapper.tabIndex = 0;
        wrapper.title = badge.name;
        wrapper.setAttribute('aria-label', badge.name);
        const img = document.createElement('img');
        img.src = badge.src;
        img.alt = badge.name;
        img.loading = 'lazy';
        wrapper.appendChild(img);
        wrapper.addEventListener('mouseenter', () => showZoom(wrapper, badge.src, badge.name));
        wrapper.addEventListener('mouseleave', closeZoom);
        wrapper.addEventListener('focus', () => showZoom(wrapper, badge.src, badge.name));
        wrapper.addEventListener('blur', closeZoom);
        element.appendChild(wrapper);
        element.setAttribute('data-fixoku-trainer-badge', 'done');
        created.add(wrapper);
      });
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      rafId = window.requestAnimationFrame(scan);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
      closeZoom();
      for (const wrapper of created) {
        const parent = wrapper.parentElement;
        wrapper.remove();
        if (parent) parent.removeAttribute('data-fixoku-trainer-badge');
      }
      for (const [svg, originalStyle] of hiddenIcons) {
        if (originalStyle === null) svg.removeAttribute('style');
        else svg.setAttribute('style', originalStyle);
      }
    };
  }, []);
}