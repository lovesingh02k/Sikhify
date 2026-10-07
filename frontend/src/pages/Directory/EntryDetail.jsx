/* ==========================================================================
   /<type>/:slug — one directory record, as an editorial page.
   Fields are rendered from the shared schema (shared/contentTypes.js); empty
   fields are simply not shown. Sources, references and verification status
   are always shown. "More in this section" lists real records of the same
   type (same category first) — no invented relationships.
   ========================================================================== */
import { Link, useParams } from 'react-router-dom';
import YouTubePlayer from '../../components/media/YouTubePlayer.jsx';
import Icon from '../../components/ui/Icon.jsx';
import OptimizedImage from '../../components/images/OptimizedImage.jsx';
import DirectoryCard, { externalLinkOf, SiteIcon, hostOf } from '../../components/directory/DirectoryCard.jsx';
import { VerificationBadge } from '../../components/directory/DirectoryTrust.jsx';
import { DirectoryEmpty, DirectoryError } from '../../components/directory/DirectoryStates.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { CONTENT_TYPES } from '../../../../shared/contentTypes.js';
import { visualFor, commonsThumb } from '../../data/directoryVisuals.js';
import { formatDate } from '../../utils/format.js';
import '../../components/directory/directory.css';

/** Long-form fields get their own section; the rest are "key information". */
const LONG = new Set(['videos', 'photos', 'history', 'contribution', 'timeline', 'books', 'related_people']);
/** Shown in the hero or the location panel instead of the facts list. */
const ELSEWHERE = new Set(['country', 'state', 'district', 'city', 'map_url', 'image_credit']);

function Value({ field, value }) {
  if (field.kind === 'url') return <a className="panel-view-all" href={value} target="_blank" rel="noopener noreferrer">{value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 60)}<span className="sr-only"> (opens in a new tab)</span></a>;
  if (field.kind === 'email') return <a className="panel-view-all" href={`mailto:${value}`}>{value}</a>;
  if (field.kind === 'tel') return <a className="panel-view-all" href={`tel:${value.replace(/[^\d+]/g, '')}`}>{value}</a>;
  if (field.kind === 'date') return formatDate(value, { weekday: 'long' });
  if (field.kind === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return <ul>{value.map((v, i) => <li key={i}>{v}</li>)}</ul>;
  return <span style={{ whiteSpace: 'pre-line' }}>{String(value)}</span>;
}

function Related({ type, entry }) {
  const t = CONTENT_TYPES[type];
  const res = useAsync(async () => {
    const same = entry.category ? (await entryService.list(type, { category: entry.category, limit: 5 })).items : [];
    const pick = same.filter((e) => e.id !== entry.id);
    if (pick.length < 3) {
      const more = (await entryService.list(type, { limit: 8 })).items.filter((e) => e.id !== entry.id && !pick.some((p) => p.id === e.id));
      pick.push(...more);
    }
    return pick.slice(0, 3);
  }, [type, entry.id]);
  if (!res.data || !res.data.length) return null;
  return (
    <section className="sk-dsection" aria-labelledby="related-h">
      <div className="sk-dsection-head">
        <div>
          <p className="sk-dlabel">Keep exploring</p>
          <h2 className="sk-section-title" id="related-h">More in {t.plural}</h2>
        </div>
        <Link className="sk-dlink" to={`/${t.path}`}>All {t.plural.toLowerCase()} <span className="sk-darrow">→</span></Link>
      </div>
      <ul className="sk-dgrid">{res.data.map((e) => <li key={e.id} data-motion="reveal"><DirectoryCard entry={e} type={type} headingLevel={3} /></li>)}</ul>
    </section>
  );
}

export default function EntryDetail({ type }) {
  const t = CONTENT_TYPES[type];
  const v = visualFor(type);
  const { slug } = useParams();
  const state = useAsync(() => entryService.get(type, slug), [type, slug]);
  const e = state.data;
  useReactPage(e ? `${e.title} — ${t.plural} | Sikhify` : `${t.plural} | Sikhify`, e ? e.summary || `${e.title} in the Sikhify directory.` : t.description,
    { noindex: !!(e && e.preview) });

  const f = (e && e.fields) || {};
  const place = e ? [e.city, e.district, e.state, e.country].filter(Boolean).join(', ') : '';
  const ext = e ? externalLinkOf(type, f) : null;
  const portrait = v.layout === 'portrait';
  const hasMedia = !!(e && e.imageUrl);

  return (
    <main id="main-content">
      <section className="page-hero sk-dentry-hero" aria-labelledby="page-title">
        <span className="page-hero-glyph" aria-hidden="true" lang="pa">{v.glyph}</span>
        <div className="sk-container">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol><li><a href="/">Home</a></li><li><Link to="/directory">Directory</Link></li><li><Link to={`/${t.path}`}>{t.plural}</Link></li><li><span aria-current="page">{e ? e.title : '…'}</span></li></ol>
          </nav>
          <div className={`sk-dentry-head${hasMedia ? ' has-media' : ''}`}>
            <div>
              <p className="page-hero-eyebrow">{e && e.category ? `${t.label} · ${e.category}` : t.label}</p>
              {/* Keyed like PageHero: the title is split into lines by GSAP SplitText, so when the
                  record loads React must replace the heading rather than patch children GSAP has moved. */}
              <h1 key={e ? 'entry' : state.error ? 'error' : 'loading'} className="page-hero-title" id="page-title">{e ? e.title : state.error ? t.plural : <span className="sr-only">Loading…</span>}</h1>
              {place ? <p className="sk-dentry-place" data-motion="hero-item"><Icon name="pin" size={15} />{place}</p> : null}
              {e && e.summary ? <p className="page-hero-sub sk-dentry-lede">{e.summary}</p> : null}
              {e ? (
                <div className="sk-dentry-badges" data-motion="hero-item">
                  <VerificationBadge status={e.verification.status} />
                  {ext ? <a className="sk-btn sk-btn-gold sk-btn-sm" href={ext.href} target="_blank" rel="noopener noreferrer">{ext.label}<Icon name="external" size={13} /><span className="sr-only"> (opens in a new tab)</span></a> : null}
                </div>
              ) : null}
            </div>
            {hasMedia ? (
              <figure className={`sk-dentry-figure${portrait ? ' is-portrait' : ''}`} data-motion="hero-item">
                <div className="sk-dentry-frame">
                  <OptimizedImage src={commonsThumb(e.imageUrl, 1280)} width={portrait ? 800 : 1600} height={1000} sizes="(min-width: 900px) 520px, 100vw"
                    alt={portrait ? `Depiction of ${e.title}` : `${e.title}`} priority fallback={null} />
                </div>
                {f.image_credit ? <figcaption>{f.image_credit}</figcaption> : null}
              </figure>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sk-container sk-section">
        {state.error ? (
          state.error.kind === 'notFound' ? (
            <DirectoryEmpty title="This record isn’t available" text={`It may have been moved or is still being reviewed. Browse all ${t.plural.toLowerCase()} instead.`}>
              <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/${t.path}`}>{t.plural}</Link>
              <Link className="sk-btn sk-btn-sm" to="/directory">Directory</Link>
            </DirectoryEmpty>
          ) : <DirectoryError error={state.error} title="We couldn’t load this record" onRetry={state.reload} />
        ) : !e ? (
          <div className="sk-dentry-grid" aria-busy="true" role="status"><span className="sr-only">Loading…</span>
            <div><div className="sk-skeleton" style={{ height: '1.2rem', width: '60%' }} /><div className="sk-skeleton mt-4" style={{ height: '0.9rem' }} /><div className="sk-skeleton mt-2" style={{ height: '0.9rem', width: '85%' }} /><div className="sk-skeleton mt-2" style={{ height: '0.9rem', width: '70%' }} /></div>
            <div className="sk-skeleton" style={{ height: '14rem', borderRadius: 18 }} />
          </div>
        ) : (
          <EntryBody type={type} e={e} f={f} place={place} ext={ext} />
        )}
        {e ? <Related type={type} entry={e} /> : null}
      </div>
    </main>
  );
}

function EntryBody({ type, e, f, place, ext }) {
  const t = CONTENT_TYPES[type];
  const facts = t.fields.filter((fl) => f[fl.name] !== undefined && f[fl.name] !== '' && !LONG.has(fl.name) && !ELSEWHERE.has(fl.name));
  const long = t.fields.filter((fl) => LONG.has(fl.name) && f[fl.name] && fl.name !== 'videos' && fl.name !== 'photos');
  const videos = f.videos || [];
  const photos = f.photos || [];
  const v = e.verification;
  const siteUrl = f.url || f.website || f.store_url;
  return (
    <div className="sk-dentry-grid">
      <article className="min-w-0">
        {e.preview ? <div className="sk-notice mb-6" role="note">Preview — this record is not published, so only staff can see it.</div> : null}
        <section className="sk-dblock" aria-labelledby="about-h">
          <h2 className="sk-dblock-title" id="about-h">About</h2>
          {e.body ? <p className="sk-dprose">{e.body}</p> : e.summary ? <p className="sk-dprose">{e.summary}</p> : <p className="sk-muted">A full description hasn&apos;t been added yet.</p>}
        </section>
        {long.map((fl) => (
          <section className="sk-dblock" key={fl.name} aria-labelledby={`f-${fl.name}`}>
            <h2 className="sk-dblock-title" id={`f-${fl.name}`}>{fl.label}</h2>
            {fl.name === 'timeline' && Array.isArray(f.timeline)
              ? <ol className="sk-dtimeline">{f.timeline.map((x, i) => <li key={i}>{x}</li>)}</ol>
              : <div className="sk-dprose"><Value field={fl} value={f[fl.name]} /></div>}
          </section>
        ))}
        {videos.length ? (
          <section className="sk-dblock sk-stack" aria-labelledby="videos-h">
            <h2 className="sk-dblock-title" id="videos-h">Videos</h2>
            {videos.map((id) => <YouTubePlayer key={id} videoId={id} title={`${e.title} — video`} />)}
          </section>
        ) : null}
        {photos.length ? (
          <section className="sk-dblock" aria-labelledby="photos-h">
            <h2 className="sk-dblock-title" id="photos-h">Photos</h2>
            <div className="sk-post-images">{photos.map((p) => <img key={p} src={p} alt={e.title} loading="lazy" />)}</div>
          </section>
        ) : null}
      </article>

      <aside className="sk-dentry-aside" aria-label="Key information and sources">
        {facts.length || (siteUrl && ext) ? (
          <section className="sk-dpanel" aria-labelledby="facts-h">
            {siteUrl && ['website', 'app', 'organization'].includes(type) ? (
              <div className="flex items-center gap-3 mb-3"><SiteIcon url={siteUrl} name={e.title} /><span className="sk-card-meta" style={{ marginTop: 0 }}>{hostOf(siteUrl)}</span></div>
            ) : null}
            <h2 className="sk-dpanel-title" id="facts-h">Key information</h2>
            <dl className="sk-dfacts">
              {facts.map((fl) => <div key={fl.name}><dt>{fl.label}</dt><dd><Value field={fl} value={f[fl.name]} /></dd></div>)}
            </dl>
            {ext ? <a className="sk-btn sk-btn-gold w-full mt-4" href={ext.href} target="_blank" rel="noopener noreferrer">{ext.label}<Icon name="external" size={14} /><span className="sr-only"> (opens in a new tab)</span></a> : null}
          </section>
        ) : null}
        {place ? (
          <section className="sk-dpanel" aria-labelledby="loc-h">
            <h2 className="sk-dpanel-title" id="loc-h">Location</h2>
            <p className="sk-card-text flex gap-2" style={{ marginTop: 0 }}><Icon name="pin" size={16} /><span>{place}</span></p>
            {f.map_url ? <a className="sk-btn sk-btn-sm mt-3" href={f.map_url} target="_blank" rel="noopener noreferrer"><Icon name="map" size={14} />Open map<span className="sr-only"> (opens in a new tab)</span></a> : null}
          </section>
        ) : null}
        <section className="sk-dpanel" aria-labelledby="src-h">
          <h2 className="sk-dpanel-title" id="src-h">Sources &amp; verification</h2>
          <VerificationBadge status={v.status} />
          <p className="sk-card-meta">{v.lastVerifiedAt ? `Last verified ${formatDate(v.lastVerifiedAt)} · ` : ''}Last updated {formatDate(v.updatedAt)}</p>
          {v.source ? <p className="sk-card-text"><strong>Source:</strong> {v.source}</p> : null}
          {v.references.length ? (
            <ul className="sk-dsources">
              {v.references.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={13} />{r.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
            </ul>
          ) : null}
          <Link className="sk-btn sk-btn-sm mt-4" to={`/submit?kind=correction&target=${encodeURIComponent(e.url)}&entry=${e.id}`}><Icon name="edit" size={14} />Suggest a correction</Link>
        </section>
      </aside>
    </div>
  );
}
