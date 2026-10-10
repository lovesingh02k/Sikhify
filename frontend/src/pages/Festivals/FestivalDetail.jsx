/* ==========================================================================
   /festivals/:slug — one observance: its next verified date, description,
   historical significance, related Guru / topic and the sources its dates were
   checked against. The reusable page for observances without a better page.
   ========================================================================== */
import { Link, useParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import SiteLink from '../../components/common/SiteLink.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { festivalService } from '../../services/festivals/festivalService.js';
import { festivalDateLabel, festivalStatusLabel } from '../../utils/festivalCard.js';
import { CALENDAR_TYPES, CATEGORIES } from '../../../../shared/festivals.js';
import GURUS from '../../data/gurus.js';

const Paragraphs = ({ text }) => String(text).split(/\n{2,}/).map((p, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>);

function Source({ name, url }) {
  if (!name && !url) return null;
  return url
    ? <a className="panel-view-all" href={url} target="_blank" rel="noopener noreferrer">{name || url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}<span className="sr-only"> (opens in a new tab)</span></a>
    : <span>{name}</span>;
}

export default function FestivalDetail() {
  const { slug } = useParams();
  const state = useAsync(() => festivalService.get(slug).then((d) => d.observance), [slug]);
  const o = state.data;
  const missing = !!state.error && state.error.kind === 'notFound';
  useReactPage(o ? `${o.title} — Sikh Festivals & Important Days — Sikhify.in` : missing ? 'Observance not found — Sikhify.in' : 'Sikh Festivals & Important Days — Sikhify.in', o ? o.summary : undefined, { noindex: missing });
  const guru = o && o.relatedGuru ? GURUS.find((g) => g.id === o.relatedGuru) : null;

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Festivals & Important Days', to: '/festivals' }, { label: o ? o.title : '…' }]} eyebrow={o && CATEGORIES[o.category] && o.category !== 'other' ? CATEGORIES[o.category] : 'Sikh Festivals & Important Days'}
        title={o ? o.title : state.error ? 'Observance not found' : 'Loading…'} sub={o ? o.summary : undefined} />
      <div className="sk-container sk-section">
        <AsyncView state={state}>
          {() => (
            <div className="sk-stack" style={{ maxWidth: 820 }}>
              <section className="sk-card" aria-labelledby="when-h">
                <h2 className="sk-card-title" id="when-h"><Icon name="calendar" size={16} /> When</h2>
                {o.next ? (
                  <>
                    <p className="mt-2"><span className="fest-status" style={{ display: 'inline-block' }}>{festivalStatusLabel(o.next)}</span></p>
                    <p className="mt-2" style={{ fontWeight: 600 }}><time dateTime={o.next.start}>{festivalDateLabel(o.next.start, o.next.end)}</time></p>
                    <p className="sk-card-meta">{CALENDAR_TYPES[o.calendarType]} calendar{o.next.sourceName || o.next.sourceUrl ? <> · Date checked against <Source name={o.next.sourceName} url={o.next.sourceUrl} /></> : null}</p>
                  </>
                ) : <p className="sk-card-meta mt-2">The date for the coming year has not been verified yet ({CALENDAR_TYPES[o.calendarType]} calendar).</p>}
              </section>
              {o.description ? <section aria-labelledby="about-h"><h2 className="sk-section-title" id="about-h">About this day</h2><div className="fest-prose mt-3"><Paragraphs text={o.description} /></div></section> : null}
              {o.significance ? <section aria-labelledby="sig-h"><h2 className="sk-section-title" id="sig-h">Historical significance</h2><div className="fest-prose mt-3"><Paragraphs text={o.significance} /></div></section> : null}
              {guru || o.relatedTopic || (o.href !== `/festivals/${o.slug}`) ? (
                <section aria-labelledby="rel-h">
                  <h2 className="sk-section-title" id="rel-h">Related</h2>
                  <ul className="flex flex-wrap gap-2 mt-3">
                    {guru ? <li><Link className="sk-chip" to={`/gurus/${guru.id}`}>Sri {guru.name}</Link></li> : null}
                    {o.relatedTopic ? <li><SiteLink className="sk-chip" to={o.relatedTopic}>Read the history</SiteLink></li> : null}
                    {o.href !== `/festivals/${o.slug}` ? <li>{o.external ? <a className="sk-chip" href={o.href} target="_blank" rel="noopener noreferrer">More about this day ↗</a> : <SiteLink className="sk-chip" to={o.href}>More about this day</SiteLink>}</li> : null}
                  </ul>
                </section>
              ) : null}
              {o.verifiedDates.length > 1 ? (
                <section aria-labelledby="dates-h">
                  <h2 className="sk-section-title" id="dates-h">Verified dates</h2>
                  <ul className="mt-3 flex flex-col gap-1">
                    {o.verifiedDates.map((d) => <li key={d.start}><time dateTime={d.start}>{festivalDateLabel(d.start, d.end)}</time>{d.sourceName || d.sourceUrl ? <span className="sk-card-meta"> — <Source name={d.sourceName} url={d.sourceUrl} /></span> : null}</li>)}
                  </ul>
                </section>
              ) : null}
              <p><Link className="panel-view-all" to="/festivals">← All festivals &amp; important days</Link></p>
            </div>
          )}
        </AsyncView>
      </div>
    </main>
  );
}
