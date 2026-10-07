/* ==========================================================================
   /gurus/:id — a Guru's profile, built only from Sikhify's existing content:
   biography, timeline, teachings and contributions (data/gurus.js), the
   events, places and people connected to them in Sikh History
   (data/history.js), and their Bani in the Gurbani Library (data/gurbani.js).
   Sections with no content yet (Sakhis, references) say so honestly and
   invite verified submissions.
   ========================================================================== */
import { Link, useParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import LanguageSwitch from '../../components/common/LanguageSwitch.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { useContentLanguage } from '../../hooks/useContentLanguage.js';
import { loadGurus } from './GurusIndex.jsx';
import GuruImage, { ArtworkCredit } from '../../components/images/GuruImage.jsx';
import { guruTitle, paddedNumber } from '../../components/gurus/GuruCard.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { useNearViewport } from '../../hooks/useNearViewport.js';

async function loadProfile(id) {
  const [gurus, history] = await Promise.all([loadGurus(), import('../../data/history.js')]);
  const index = gurus.findIndex((g) => g.id === id);
  if (index === -1) return null;
  const guru = gurus[index];
  const events = history.history.filter((e) => e.people.includes(guru.name)).sort((a, b) => a.sort - b.sort);
  const eventIds = new Set(events.map((e) => e.id));
  const people = history.historyFigures.filter((f) => eventIds.has(f.event) || f.role.includes(guru.name) || f.summary.includes(guru.name));
  const places = [...new Set(events.map((e) => e.location).filter(Boolean))];
  return { guru, prev: gurus[index - 1] || null, next: gurus[index + 1] || null, events, people, places };
}

const loadBani = (name) => import('../../data/gurbani.js').then((m) => {
  const g = m.default;
  return {
    banis: g.banis.filter((b) => b.author && b.author.includes(name)),
    shabads: g.shabads.filter((s) => s.author && s.author.includes(name)),
  };
});

function Section({ id, title, children }) {
  return (
    <section className="sk-card" aria-labelledby={id}>
      <h2 className="sk-card-title" id={id}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function GuruProfile() {
  const { id } = useParams();
  const state = useAsync(() => loadProfile(id), [id]);
  const i18n = useContentLanguage();
  const raw = state.data && state.data.guru;
  // The Gurbani dataset (~250 KB) is only needed for the Bani section further down: load it as that section approaches.
  const [baniRef, baniNear] = useNearViewport();
  const bani = useAsync(() => (raw && baniNear ? loadBani(raw.name) : null), [raw && raw.name, baniNear]);
  const g = raw ? i18n.localize('gurus', raw) : null;
  useReactPage(raw ? `${raw.name} — The Ten Gurus — Sikhify.in` : 'The Ten Gurus — Sikhify.in', raw ? `${raw.name} (${raw.lifespan}): biography, timeline, teachings, contributions and Bani.` : undefined);
  const la = i18n.langAttr;

  return (
    <main id="main-content">
      <PageHero
        crumbs={[{ label: 'Learn', to: '/learn-sikhism' }, { label: 'The Ten Gurus', to: '/gurus' }, { label: raw ? raw.name : 'Guru' }]}
        glyph="ਗੁਰੂ"
        eyebrow={raw ? (raw.number === 1 ? 'The First Guru' : `Guru ${raw.number} of 10`) : 'The Ten Gurus'}
        title={g ? <span lang={la}>{guruTitle(g.name, i18n.lang)}</span> : 'The Ten Gurus'}
        sub={raw ? <><span lang="pa" className="font-gurmukhi">ਸ੍ਰੀ {raw.gurmukhi}</span> · {raw.lifespan.replace('–', ' — ')}</> : undefined}
      />
      <div className="sk-container sk-section">
        <AsyncView state={state}>
          {(data) => {
            if (!data) return <Empty title="Guru not found" text="Choose one of the Ten Gurus."><Link className="sk-btn sk-btn-sm" to="/gurus">The Ten Gurus</Link></Empty>;
            const { events, people, places, prev, next } = data;
            return (
              <div className="sk-stack">
                <LanguageSwitch lang={i18n.requested} />
                <div className="sk-grid sk-grid-3" style={{ alignItems: 'start' }}>
                  <div className="sk-stack" style={{ gridColumn: 'span 2 / span 2' }}>
                    <section className="sk-card sk-guru-intro" aria-labelledby="bio">
                      <figure className="sk-guru-intro-art">
                        <GuruImage guru={raw} priority sizes="(min-width: 1024px) 260px, (min-width: 640px) 40vw, 80vw" emblemSize="lg" />
                        <figcaption><ArtworkCredit guru={raw} /></figcaption>
                      </figure>
                      <div className="min-w-0">
                        <p className="sk-guru-intro-num" aria-hidden="true">{paddedNumber(raw.number)}</p>
                        <h2 className="sk-card-title" id="bio">{i18n.t('biography', 'Biography')}</h2>
                        <p className="sk-card-text" lang={la} style={{ fontSize: '1rem' }}>{g.bio}</p>
                        <dl className="sk-facts mt-5">
                          <div><dt>Lifespan</dt><dd>{raw.lifespan}</dd></div>
                          <div><dt>Guruship</dt><dd lang={la}>{g.guruship}</dd></div>
                          <div><dt>Birthplace</dt><dd lang={la}>{g.birthplace}</dd></div>
                        </dl>
                      </div>
                    </section>
                    <Section id="timeline" title={i18n.t('timeline', 'Timeline')}>
                      <ol className="sk-vtimeline" role="list">
                        {g.events.map((e, i) => (
                          <li key={i}>
                            <span className="sk-vtimeline-year">{raw.events[i].year}</span>
                            <span className="sk-vtimeline-text" lang={la}>{e.text}</span>
                          </li>
                        ))}
                      </ol>
                    </Section>
                    <section aria-labelledby="teachings">
                      <h2 className="sk-section-title" id="teachings" style={{ fontSize: '1.35rem' }}>{i18n.t('teachings', 'Teachings')}</h2>
                      <ul className="sk-quote-grid mt-4" lang={la}>{g.teachings.map((t, i) => <li key={i} className="sk-quote">{t}</li>)}</ul>
                    </section>
                    <div>
                      <Section id="contributions" title={i18n.t('contributions', 'Contributions')}>
                        <ul className="sk-icon-list" lang={la}>{g.contributions.map((t, i) => <li key={i}><span className="sk-icon-list-mark" aria-hidden="true"><Icon name="check" size={14} /></span>{t}</li>)}</ul>
                      </Section>
                    </div>
                    <Section id="events" title="Major events in Sikh History">
                      {events.length ? (
                        <ul className="flex flex-col gap-2">
                          {events.map((e) => (
                            <li key={e.id}><a className="sk-nav-card block" href={`/sikh-history#event=${e.id}`}><small>{e.year} · {e.location}</small>{e.title}</a></li>
                          ))}
                        </ul>
                      ) : <p className="sk-card-meta">No events for {raw.name} are in the Sikh History timeline yet.</p>}
                    </Section>
                    <div ref={baniRef}><Section id="bani" title="Bani in the Gurbani Library">
                      {bani.loading || !baniNear ? <p className="sk-card-meta">Loading…</p> : bani.error ? <p className="sk-card-meta">The Gurbani Library couldn't be loaded.</p>
                        : bani.data && (bani.data.banis.length || bani.data.shabads.length) ? (
                          <ul className="sk-suggest">
                            {bani.data.banis.map((b) => <li key={b.id}><a className="sk-chip" href={`/gurbani#item=${b.id}`}>{b.name}{b.ang ? ` · Ang ${b.ang}` : ''}</a></li>)}
                            {bani.data.shabads.map((s) => <li key={s.id}><a className="sk-chip" href={`/gurbani#item=${s.id}`} lang="pa">{s.gurmukhiTitle}</a></li>)}
                          </ul>
                        ) : (
                          <p className="sk-card-meta">
                            The Gurbani Library doesn&apos;t list any Bani under {raw.name}. You can read any Ang in the <a className="panel-view-all" href="/gurbani">Gurbani Library</a>.
                          </p>
                        )}
                    </Section></div>
                    <Section id="sakhis" title="Sakhis">
                      <p className="sk-card-meta">No Sakhis have been added for {raw.name} yet. Sakhis are published only with a cited source.</p>
                      <Link className="panel-view-all block mt-2" to="/submit">Suggest a Sakhi with its source →</Link>
                    </Section>
                  </div>
                  <aside className="sk-stack">
                    <Section id="places" title="Related places">
                      {places.length ? <ul className="flex flex-col gap-1">{places.map((p) => <li key={p}><a className="panel-view-all" href={`/sikh-history#q=${encodeURIComponent(p.split(/[,(]/)[0].trim())}`}>{p}</a></li>)}</ul>
                        : <p className="sk-card-meta">None recorded yet.</p>}
                    </Section>
                    <Section id="people" title="Related people">
                      {people.length ? (
                        <ul className="flex flex-col gap-3">
                          {people.map((p) => <li key={p.id}><p className="sk-post-author">{p.name}</p><p className="sk-card-meta" style={{ marginTop: 0 }}>{p.role} · {p.era}</p></li>)}
                        </ul>
                      ) : <p className="sk-card-meta">None recorded yet.</p>}
                    </Section>
                    <Section id="refs" title="References">
                      <p className="sk-card-meta">This profile is an educational summary in plain language. Dates follow commonly accepted Common Era dates; some traditions differ slightly. Cited references will be listed here as they are verified.</p>
                      <p className="sk-card-meta">Painting: see the credit under the artwork, and the <Link className="panel-view-all" to="/image-credits">image credits</Link> page.</p>
                    </Section>
                  </aside>
                </div>
                <nav className="sk-lesson-nav" aria-label="Other Gurus">
                  {prev ? <Link className="sk-nav-card" to={`/gurus/${prev.id}`}><small>← Previous Guru</small>{i18n.localize('gurus', prev).name}</Link> : <span />}
                  <Link className="sk-nav-card" to="/gurus" style={{ textAlign: 'center' }}><small>All</small>The Ten Gurus</Link>
                  {next ? <Link className="sk-nav-card sk-next" to={`/gurus/${next.id}`}><small>Next Guru →</small>{i18n.localize('gurus', next).name}</Link> : <span />}
                </nav>
              </div>
            );
          }}
        </AsyncView>
      </div>
    </main>
  );
}
