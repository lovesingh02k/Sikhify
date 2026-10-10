import { usePageController } from '../hooks/usePageController';
import { usePageMeta } from '../hooks/usePageMeta';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { SITE_SECTIONS } from '../data/siteMap.js';
import { COMING_SOON } from '../data/comingSoon.js';

export default function Sitemap() {
  usePageMeta('Sitemap — Sikhify.in', 'Every page on Sikhify.in: Learn Sikhism, Sikh History, Rehat Maryada, FAQ, Gurbani, Nitnem, Hukamnama and Kirtan & Katha.');
  usePageController(() => {
    initCore();
    initCommonInteractions();
  }, []);

  return (
    <main id="main-content">
      <section aria-labelledby="page-title" className="page-hero">
        <div className="sk-container relative z-10">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol>
              <li><a href="/">Home</a></li>
              <li><span aria-current="page">Sitemap</span></li>
            </ol>
          </nav>
          <p className="page-hero-eyebrow">Support</p>
          <h1 className="page-hero-title" id="page-title">Every page on <span className="gold">Sikhify</span></h1>
          <p className="page-hero-sub">Everything you can read, listen to and explore today, plus the sections we&apos;re still preparing.</p>
        </div>
      </section>

      <div className="sk-container sk-section">
        <div className="sitemap-grid">
          {SITE_SECTIONS.map((section) => (
            <section key={section.title} className="sk-card" aria-labelledby={`sm-${section.title}`}>
              <h2 className="sk-card-title" id={`sm-${section.title}`}>{section.title}</h2>
              <ul className="sitemap-list" role="list">
                {section.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{l.title}</a>
                    <span className="sk-card-meta block">{l.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-12" aria-labelledby="sm-soon">
          <p className="sk-eyebrow">On the way</p>
          <h2 className="sk-section-title" id="sm-soon">Coming soon</h2>
          <p className="sk-section-sub">These sections are planned but not available yet.</p>
          <ul className="sitemap-soon" role="list">
            {COMING_SOON.filter((p) => !p.retired).map((p) => (
              <li key={p.path}><a className="sk-chip" href={p.path}>{p.title}<span className="soon-pill">Soon</span></a></li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
