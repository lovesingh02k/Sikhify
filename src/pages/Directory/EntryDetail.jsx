/* ==========================================================================
   /<type>/:slug — one directory record. Fields are rendered from the shared
   schema (shared/contentTypes.js); empty fields are simply not shown, and the
   verification block always shows status, source, references and dates.
   YouTube videos play in Sikhify's own player.
   ========================================================================== */
import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import YouTubePlayer from '../../components/media/YouTubePlayer.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { CONTENT_TYPES, VERIFICATION_LABELS } from '../../../shared/contentTypes.js';
import { formatDate } from '../../utils/format.js';

const HIDDEN_IN_TABLE = new Set(['videos', 'photos', 'history', 'contribution', 'timeline', 'books', 'related_people']);

export function VerificationLine({ v, compact = false }) {
  return (
    <span className="sk-verify">
      <span className={`sk-pill sk-pill-${v.status}`}>{v.status === 'verified' ? <Icon name="check" size={12} /> : null}{VERIFICATION_LABELS[v.status]}</span>
      {!compact && v.lastVerifiedAt ? <span>Last verified {formatDate(v.lastVerifiedAt)}</span> : null}
      {!compact ? <span>Last updated {formatDate(v.updatedAt)}</span> : null}
    </span>
  );
}

function Value({ field, value }) {
  if (field.kind === 'url') return <a className="panel-view-all" href={value} target="_blank" rel="noopener noreferrer">{value.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}<span className="sr-only"> (opens in a new tab)</span></a>;
  if (field.kind === 'email') return <a className="panel-view-all" href={`mailto:${value}`}>{value}</a>;
  if (field.kind === 'tel') return <a className="panel-view-all" href={`tel:${value.replace(/[^\d+]/g, '')}`}>{value}</a>;
  if (field.kind === 'date') return formatDate(value, { weekday: 'long' });
  if (field.kind === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return <ul>{value.map((v, i) => <li key={i}>{v}</li>)}</ul>;
  return <span style={{ whiteSpace: 'pre-line' }}>{String(value)}</span>;
}

export default function EntryDetail({ type }) {
  const t = CONTENT_TYPES[type];
  const { slug } = useParams();
  const state = useAsync(() => entryService.get(type, slug), [type, slug]);
  const e = state.data;
  useReactPage(e ? `${e.title} — ${t.plural} — Sikhify.in` : `${t.plural} — Sikhify.in`, e ? e.summary || `${e.title} in the Sikhify directory.` : t.description);

  return (
    <main id="main-content">
      <PageHero
        crumbs={[{ label: 'Directory', to: '/directory' }, { label: t.plural, to: `/${t.path}` }, { label: e ? e.title : '…' }]}
        eyebrow={e && e.category ? `${t.label} · ${e.category}` : t.label}
        title={e ? e.title : t.plural}
        sub={e ? [e.city, e.district, e.state, e.country].filter(Boolean).join(', ') || undefined : undefined}
      />
      <div className="sk-container sk-section">
        <AsyncView state={state} errorTitle={state.error && state.error.kind === 'notFound' ? 'This record is not available' : undefined}>
          {(entry) => {
            const fields = t.fields.filter((f) => entry.fields[f.name] !== undefined && entry.fields[f.name] !== '' && !HIDDEN_IN_TABLE.has(f.name));
            const long = t.fields.filter((f) => HIDDEN_IN_TABLE.has(f.name) && entry.fields[f.name] && f.name !== 'videos' && f.name !== 'photos');
            const videos = entry.fields.videos || [];
            const photos = entry.fields.photos || [];
            return (
              <div className="sk-grid sk-grid-3" style={{ alignItems: 'start' }}>
                <div className="sk-stack" style={{ gridColumn: 'span 2 / span 2' }}>
                  {entry.preview ? <div className="sk-notice" role="note">Preview — this record is not published, so only staff can see it.</div> : null}
                  {entry.imageUrl ? <img src={entry.imageUrl} alt="" className="sk-card" style={{ padding: 0, width: '100%', maxHeight: 420, objectFit: 'cover' }} /> : null}
                  <section className="sk-card" aria-labelledby="about">
                    <h2 className="sk-card-title" id="about">About</h2>
                    {entry.summary ? <p className="sk-card-text" style={{ fontSize: '1rem' }}>{entry.summary}</p> : null}
                    {entry.body ? <p className="sk-card-text" style={{ whiteSpace: 'pre-line' }}>{entry.body}</p> : null}
                    {!entry.summary && !entry.body ? <p className="sk-card-meta">No description has been added yet.</p> : null}
                  </section>
                  {long.map((f) => (
                    <section className="sk-card" key={f.name} aria-label={f.label}>
                      <h2 className="sk-card-title">{f.label}</h2>
                      <div className="sk-card-text"><Value field={f} value={entry.fields[f.name]} /></div>
                    </section>
                  ))}
                  {videos.length ? (
                    <section aria-labelledby="videos" className="sk-stack">
                      <h2 className="sk-section-title" id="videos">Videos</h2>
                      {videos.map((id) => <YouTubePlayer key={id} videoId={id} title={`${entry.title} — video`} />)}
                    </section>
                  ) : null}
                  {photos.length ? (
                    <section aria-labelledby="photos" className="sk-card">
                      <h2 className="sk-card-title" id="photos">Photos</h2>
                      <div className="sk-post-images">{photos.map((p) => <img key={p} src={p} alt={`${entry.title}`} loading="lazy" />)}</div>
                    </section>
                  ) : null}
                </div>
                <aside className="sk-stack">
                  {fields.length ? (
                    <section className="sk-card" aria-labelledby="details">
                      <h2 className="sk-card-title" id="details">Details</h2>
                      <dl className="sk-dl mt-3">
                        {fields.map((f) => <Fragment key={f.name}><dt>{f.label}</dt><dd><Value field={f} value={entry.fields[f.name]} /></dd></Fragment>)}
                      </dl>
                    </section>
                  ) : null}
                  <section className="sk-card" aria-labelledby="verification">
                    <h2 className="sk-card-title" id="verification">Verification</h2>
                    <div className="mt-3"><VerificationLine v={entry.verification} /></div>
                    {entry.verification.source ? <p className="sk-card-text"><strong>Source:</strong> {entry.verification.source}</p> : null}
                    {entry.verification.references.length ? (
                      <>
                        <p className="sk-card-text"><strong>References</strong></p>
                        <ul className="mt-1 flex flex-col gap-1">
                          {entry.verification.references.map((r) => <li key={r.url}><a className="panel-view-all" href={r.url} target="_blank" rel="noopener noreferrer">{r.label}</a></li>)}
                        </ul>
                      </>
                    ) : null}
                    <Link className="sk-btn sk-btn-sm mt-4" to={`/submit?kind=correction&target=${encodeURIComponent(entry.url)}&entry=${entry.id}`}><Icon name="edit" size={14} />Suggest a correction</Link>
                  </section>
                </aside>
              </div>
            );
          }}
        </AsyncView>
        {state.error && state.error.kind === 'notFound' ? (
          <div className="mt-4"><Empty title="Looking for something else?" text={`Browse all ${t.plural.toLowerCase()}.`}><Link className="sk-btn sk-btn-sm" to={`/${t.path}`}>{t.plural}</Link></Empty></div>
        ) : null}
      </div>
    </main>
  );
}
