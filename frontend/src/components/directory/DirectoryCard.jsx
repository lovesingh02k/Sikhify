/* ==========================================================================
   One directory record as a card. The layout follows the section
   (data/directoryVisuals.js): portrait for personalities, landscape for
   heritage, identity tiles for websites / apps / organizations, a designed
   cover for books, a date block for events, a friendlier card for kids.
   Only the record's real fields are shown; empty ones are left out.
   The whole card links to the record; external links sit above it.
   ========================================================================== */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../images/OptimizedImage.jsx';
import { SectionTile } from './DirectoryVisual.jsx';
import { VerificationBadge } from './DirectoryTrust.jsx';
import { visualFor, commonsThumb } from '../../data/directoryVisuals.js';
import { formatDate, initials } from '../../utils/format.js';
import './directory.css';

export const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const placeOf = (e) => [e.city, e.state, e.country].filter(Boolean).join(', ');
const todayIso = () => new Date().toISOString().slice(0, 10);

/** The link a record points to outside Sikhify, with a label for its kind. */
export function externalLinkOf(type, f = {}) {
  if (type === 'website') return f.url && { href: f.url, label: 'Visit website' };
  if (type === 'app') return (f.store_url || f.website) && { href: f.store_url || f.website, label: f.store_url ? 'Get the app' : 'Website' };
  if (type === 'organization') return f.website && { href: f.website, label: 'Official website' };
  if (type === 'news') return f.source_url && { href: f.source_url, label: 'Read article' };
  if (type === 'book') return f.url && { href: f.url, label: 'Where to find it' };
  if (type === 'event') return (f.registration_url || f.livestream_url) && { href: f.registration_url || f.livestream_url, label: f.registration_url ? 'Register' : 'Livestream' };
  return null;
}

/** The site's own icon (/favicon.ico), falling back to a monogram — never a guessed logo. */
export function SiteIcon({ url, name }) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  return (
    <span className="sk-dfavicon" aria-hidden="true">
      {host && !failed
        ? <img src={`https://${host}/favicon.ico`} alt="" width="30" height="30" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} onLoad={(e) => { if (e.currentTarget.naturalWidth < 8) setFailed(true); }} />
        : <b>{initials(name).slice(0, 2)}</b>}
    </span>
  );
}

function Media({ e, layout, type }) {
  const f = e.fields || {};
  if (layout === 'site') {
    const url = f.url || f.website || f.store_url;
    return (
      <SectionTile type={type}>
        <span className="sk-dcard-identity"><SiteIcon url={url} name={e.title} />{hostOf(url) ? <span className="sk-ddomain">{hostOf(url)}</span> : null}</span>
      </SectionTile>
    );
  }
  if (layout === 'book') {
    return (
      <SectionTile type={type}>
        <span className="sk-dbook"><b>{e.title}</b><small>{f.authors}</small></span>
      </SectionTile>
    );
  }
  if (layout === 'event' && e.date) {
    const d = new Date(e.date + 'T00:00:00');
    return (
      <SectionTile type={type}>
        <span className="sk-ddate">
          <small>{d.toLocaleDateString('en-IN', { month: 'short' })}</small>
          <b>{d.getDate()}</b>
          <span>{d.getFullYear()}</span>
        </span>
      </SectionTile>
    );
  }
  if (e.imageUrl) {
    const tile = <SectionTile type={type} monogram={layout === 'portrait' ? initials(e.title) : undefined} />;
    const small = commonsThumb(e.imageUrl, 500);
    return (
      <OptimizedImage src={small} srcSet={small !== e.imageUrl ? `${small} 500w, ${e.imageUrl} 1280w` : undefined}
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" width={layout === 'portrait' ? 800 : 1600} height={1000}
        alt="" decorative fallback={tile} />
    );
  }
  return <SectionTile type={type} monogram={layout === 'portrait' ? initials(e.title) : undefined} />;
}

function metaFor(e, type) {
  const f = e.fields || {};
  const out = [];
  const place = placeOf(e);
  if (type === 'personality') {
    if (f.era) out.push(['history', f.era]);
    else if (f.born || f.died) out.push(['calendar', [f.born, f.died].filter(Boolean).join(' – ')]);
  }
  if (type === 'heritage') {
    if (place) out.push(['pin', place]);
    if (f.period) out.push(['history', f.period]);
  }
  if (type === 'event') {
    if (f.venue) out.push(['pin', [f.venue, e.city].filter(Boolean).join(', ')]);
    if (f.start_time) out.push(['calendar', f.start_time]);
  }
  if (type === 'organization') {
    if (place) out.push(['pin', place]);
    if (f.founded) out.push(['calendar', `Founded ${f.founded}`]);
  }
  if (type === 'website' || type === 'app') {
    if (f.platform) out.push(['phone', f.platform]);
    if (f.language) out.push(['globe', f.language]);
  }
  if (type === 'book') {
    if (f.authors) out.push(['user', f.authors]);
    if (f.year) out.push(['calendar', f.year]);
  }
  if (type === 'news') {
    if (f.source_name) out.push(['globe', f.source_name]);
    if (e.date) out.push(['calendar', formatDate(e.date)]);
  }
  if (type === 'kids' && f.age_group) out.push(['users', `Ages ${f.age_group}`]);
  return out;
}

export default function DirectoryCard({ entry: e, type, headingLevel = 2 }) {
  const v = visualFor(type);
  const layout = v.layout || 'landscape';
  const H = `h${headingLevel}`;
  const ext = externalLinkOf(type, e.fields);
  const meta = metaFor(e, type);
  const status = type === 'event' && e.date ? (e.date >= todayIso() ? 'Upcoming' : 'Past') : null;
  return (
    <article className={`sk-dcard is-${layout}`} aria-labelledby={`e-${e.id}`}>
      <div className="sk-dcard-media">
        <Media e={e} layout={layout} type={type} />
      </div>
      <div className="sk-dcard-body">
        <div className="sk-dcard-kicker">
          {e.category ? <span className="sk-badge">{e.category}</span> : null}
          {status ? <span className={`sk-badge ${status === 'Past' ? 'sk-badge-muted' : 'sk-badge-navy'}`}>{status}</span> : null}
        </div>
        <H className="sk-dcard-title" id={`e-${e.id}`}><Link to={e.url}>{e.title}</Link></H>
        {meta.length ? (
          <p className="sk-dcard-meta">{meta.map(([icon, text]) => <span key={icon + text}><Icon name={icon} size={13} />{text}</span>)}</p>
        ) : null}
        {e.summary ? <p className="sk-dcard-text">{e.summary}</p> : null}
        <div className="sk-dcard-foot">
          <VerificationBadge status={e.verification.status} />
          {ext ? (
            <a className="sk-dlink sk-dcard-ext" href={ext.href} target="_blank" rel="noopener noreferrer">
              {ext.label} <Icon name="external" size={13} /><span className="sr-only"> for {e.title} (opens in a new tab)</span>
            </a>
          ) : <span className="sk-dlink sk-dcard-cta" aria-hidden="true">Explore <span className="sk-darrow">→</span></span>}
        </div>
      </div>
    </article>
  );
}
