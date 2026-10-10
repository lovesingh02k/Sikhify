/* ==========================================================================
   /festivals — Sikh Festivals & Important Days: every published observance.
   Those with a verified current or upcoming date are shown as cards (the same
   cards as the homepage); the rest are listed with "date to be confirmed" —
   no date is ever guessed.
   ========================================================================== */
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { festivalService } from '../../services/festivals/festivalService.js';
import { festivalCardHtml } from '../../utils/festivalCard.js';
import { weekdayOf } from '../../../../shared/festivals.js';

export default function FestivalsIndex() {
  useReactPage('Sikh Festivals & Important Days — Sikhify.in', 'Gurpurabs, Shaheedi Purabs, Vaisakhi, Bandi Chhor Divas and other Sikh observances, with dates checked against a named source.');
  const state = useAsync(() => festivalService.list(), []);
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Festivals & Important Days' }]} eyebrow="Learn · Calendar" title={<>Sikh Festivals &amp; <span className="gold">Important Days</span></>}
        sub="Celebrate the moments that connect us to Sikhi. Dates are shown once they have been checked against a named source." />
      <div className="sk-container sk-section sk-stack">
        <AsyncView state={state}>
          {(d) => {
            const dated = d.items.filter((o) => o.next);
            const tbc = d.items.filter((o) => !o.next);
            if (!d.items.length) {
              return (
                <Empty icon="calendar" title="No observances are listed yet" text="Gurpurabs and important days appear here once their dates have been verified.">
                  <a className="sk-btn sk-btn-sm" href="/sikh-history">Explore Sikh history</a>
                </Empty>
              );
            }
            const cards = dated.map((o) => ({ ...o, ...o.next, weekday: weekdayOf(o.next.start), featured: false }));
            return (
              <>
                {dated.length ? (
                  <section aria-labelledby="dated-h">
                    <h2 className="sk-section-title" id="dated-h">Today and coming up</h2>
                    <div className="festivals-grid mt-6"
                      dangerouslySetInnerHTML={{ __html: cards.map((c) => festivalCardHtml(c)).join('') }} />
                  </section>
                ) : null}
                {tbc.length ? (
                  <section aria-labelledby="tbc-h">
                    <h2 className="sk-section-title" id="tbc-h">Dates to be confirmed</h2>
                    <p className="sk-section-sub">These observances don&apos;t have a verified date for the coming year yet.</p>
                    <ul className="sk-grid sk-grid-3 mt-6">
                      {tbc.map((o) => (
                        <li key={o.slug} className="sk-card">
                          <p className="sk-card-title">{o.external ? <a href={o.href} target="_blank" rel="noopener noreferrer">{o.title} ↗</a> : <Link to={`/festivals/${o.slug}`}>{o.title}</Link>}</p>
                          {o.summary ? <p className="sk-card-meta">{o.summary}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            );
          }}
        </AsyncView>
      </div>
    </main>
  );
}
