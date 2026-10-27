import './fixokuTrainerBadges.css';
import { findFixokuTrainerBadgeFromText } from './fixokuTrainerBadges';

function enhanceTextNode(element: HTMLElement) {
  if (!element || element.dataset.fixokuBadgeApplied === '1') return;
  const text = (element.textContent || '').trim();
  const badge = findFixokuTrainerBadgeFromText(text);
  if (!badge) return;

  const existingInline = element.querySelector(':scope > .fixoku-trainer-badge-inline');
  if (existingInline) {
    element.dataset.fixokuBadgeApplied = '1';
    return;
  }

  const nearbySvgs = Array.from(element.querySelectorAll(':scope svg'));
  nearbySvgs.forEach((svg) => {
    (svg as HTMLElement).style.display = 'none';
  });

  const wrapper = document.createElement('span');
  wrapper.className = 'fixoku-trainer-badge-inline';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('title', badge.label);
  wrapper.setAttribute('aria-label', badge.label);

  const img = document.createElement('img');
  img.src = badge.src;
  img.alt = badge.label;
  img.loading = 'lazy';
  wrapper.appendChild(img);

  element.appendChild(wrapper);
  element.dataset.fixokuBadgeApplied = '1';
}

function runEnhancer() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('span, div, p, li, button, h1, h2, h3, h4, h5, h6'));
  candidates.forEach((element) => {
    const text = (element.textContent || '').trim();
    if (!text) return;
    if (text.length > 120) return;
    enhanceTextNode(element);
  });
}

export function initFixokuTrainerBadgeDom() {
  runEnhancer();
  const intervalId = window.setInterval(runEnhancer, 1200);
  const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 30000);

  const observer = new MutationObserver(() => runEnhancer());
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    window.clearInterval(intervalId);
    window.clearTimeout(timeoutId);
    observer.disconnect();
  };
}