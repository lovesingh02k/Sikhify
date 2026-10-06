import { useEffect, useRef } from 'react';
import StatusEmblem from './StatusEmblem.jsx';
import { STATUS } from '../../status/messages.js';
import { useMotion } from '../../motion/useMotion.js';
import { emblemIn } from '../../motion/emblem.js';
import { gsap, EASE } from '../../motion/gsap.js';
import { initCore } from '../../controllers/coreController.js';
import { initCommonInteractions } from '../../controllers/commonController.js';
import { markChromeReady } from '../../app/navigation.js';

/** Popular destinations offered when a page can't be shown. */
export const POPULAR_LINKS = [
  { href: '/hukamnama', label: 'Daily Hukamnama' },
  { href: '/gurbani', label: 'Gurbani Library' },
  { href: '/nitnem', label: 'Nitnem' },
  { href: '/learn-sikhism', label: 'Learn Sikhism' },
  { href: '/sikh-history', label: 'Sikh History' },
  { href: '/faq', label: 'FAQ' },
];

/**
 * Header controls (menu, search, theme) are wired by the page controllers.
 * Status screens can appear without a page controller (404) or after a page
 * failed part-way, so wire them here — once per document.
 */
export function useSiteChrome() {
  useEffect(() => {
    if (markChromeReady() || window.Sikhify?.search) return;
    initCore();
    initCommonInteractions();
  }, []);
}

export function openSiteSearch() {
  window.Sikhify?.search?.open();
}

/**
 * Full-page status screen: 404, 401, 403, 500, network, timeout.
 * Copy comes from status/messages.js; `title`/`text` override it.
 * `details` is shown only in development builds.
 */
export default function StatusView({ kind = 'server', title, text, actions, children, details }) {
  const copy = STATUS[kind] || STATUS.server;
  const ref = useRef(null);
  useSiteChrome();

  useMotion(ref, ({ motion }) => {
    if (!motion) return;
    const root = ref.current;
    const tl = gsap.timeline({ defaults: { ease: EASE.out } });
    emblemIn(root, tl, 0);
    tl.from(root.querySelectorAll('[data-status-item]'), { y: 18, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.45);
  });

  return (
    <main id="main-content" className="status-page" ref={ref}>
      <section className="status-hero" aria-labelledby="status-title">
        <div className="status-inner">
          <StatusEmblem />
          {copy.code && <p className="status-code" data-status-item>{kind === 'notFound' ? '404 · Page not found' : `Error ${copy.code}`}</p>}
          <h1 id="status-title" className="status-title" tabIndex={-1} data-status-item>{title || copy.title}</h1>
          <p className="status-text" data-status-item>{text || copy.text}</p>
          {actions && <div className="status-actions" data-status-item>{actions}</div>}
          {children}
          {import.meta.env.DEV && details && (
            <details className="status-dev" data-status-item>
              <summary>Developer details (shown in development only)</summary>
              <pre>{details}</pre>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}

export function PopularLinks({ heading = 'Popular on Sikhify' }) {
  return (
    <nav className="status-popular" aria-label={heading} data-status-item>
      <p className="status-popular-label">{heading}</p>
      <ul role="list">
        {POPULAR_LINKS.map((l) => (
          <li key={l.href}><a className="status-chip" href={l.href}>{l.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
