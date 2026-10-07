import { useRef } from 'react';
import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import StatusEmblem from '../components/status/StatusEmblem.jsx';
import { useMotion } from '../motion/useMotion.js';
import { emblemIn } from '../motion/emblem.js';
import { gsap } from '../motion/gsap.js';
import { PAGES } from '../data/siteMap.js';

const SITEMAP_LINK = { href: '/sitemap', title: 'Sitemap', text: 'Every page on Sikhify, in one place.' };

/** Honest placeholder for a section that is in the navigation but not built yet. */
export default function ComingSoon({ page }) {
  const ref = useRef(null);
  usePageMeta(`${page.title} — Coming soon — Sikhify.in`, page.description, { noindex: true });
  usePageController(() => {
    initCore();
    initCommonInteractions();
  }, []);

  useMotion(ref, ({ motion }) => {
    if (!motion) return;
    emblemIn(ref.current, gsap.timeline({ delay: 0.35 }), 0);
  });

  const related = page.related.map((href) => (href === '/sitemap' ? SITEMAP_LINK : PAGES[href])).filter(Boolean);

  return (
    <main id="main-content" ref={ref}>
      <section aria-labelledby="page-title" className="page-hero">
        <div className="sk-container relative z-10">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol>
              <li><a href="/">Home</a></li>
              <li><span aria-current="page">{page.title}</span></li>
            </ol>
          </nav>
          <p className="page-hero-eyebrow">{page.eyebrow} · Coming soon</p>
          <h1 key={page.title} className="page-hero-title" id="page-title">{page.title}</h1>
          <p className="page-hero-sub">{page.description}</p>
        </div>
      </section>

      <div className="sk-container sk-section">
        <div className="soon-grid">
          <section className="sk-card soon-card" aria-labelledby="soon-heading">
            <div className="soon-visual">
              <StatusEmblem size={150} />
            </div>
            <span className="soon-badge"><span className="soon-dot" aria-hidden="true" />Coming soon</span>
            <h2 className="sk-card-title soon-title" id="soon-heading">We&apos;re still preparing this section</h2>
            <p className="sk-card-text">
              {page.title} isn&apos;t available yet. Rather than show placeholder content, we&apos;re keeping this page
              simple until it&apos;s ready. In the meantime, everything below is available today.
            </p>
            <div className="soon-actions">
              <a className="sk-btn sk-btn-gold" href="/">Back to Home</a>
              <a className="sk-btn" href="/sitemap">Browse all pages</a>
            </div>
          </section>

          <section aria-labelledby="available-heading" className="soon-related">
            <p className="sk-eyebrow">Available now</p>
            <h2 className="sk-section-title" id="available-heading">Explore while you wait</h2>
            <ul className="soon-links" role="list">
              {related.map((l) => (
                <li key={l.href}>
                  <a className="sk-card sk-card-link soon-link" href={l.href}>
                    <span className="sk-card-title">{l.title}</span>
                    <span className="sk-card-text block">{l.text}</span>
                    <span className="panel-view-all block mt-3" aria-hidden="true">Open →</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
