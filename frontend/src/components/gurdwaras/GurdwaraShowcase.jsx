/* ==========================================================================
   Gurdwara Directory showcase: the Panj Takht, featured historic Gurdwaras
   and browse-by-state chips. Everything comes from the API — records whose
   designation (takht / historic) was set from a cited source. Records still
   awaiting verification are shown with that badge, never hidden as if missing
   and never presented as verified.
   ========================================================================== */
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { GurdwaraImage } from './GurdwaraBits.jsx';
import { VerificationBadge } from '../directory/DirectoryTrust.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { DESIGNATIONS } from '../../../../shared/gurdwaras.js';
import { gurmukhiNumeral } from '../../utils/images.js';
import '../directory/directory.css';

/** Takhts and historic records, including ones awaiting verification (their cards say so). */
const ALL_STATUSES = ['active', 'temporarily_closed', 'needs_verification'];
/** The customary order in which the five Takhts are named. */
const TAKHT_ORDER = [/akal takht/i, /kesgarh|keshgarh/i, /patna/i, /hazur/i, /damdama/i];
const takhtRank = (g) => { const i = TAKHT_ORDER.findIndex((re) => re.test(g.name)); return i === -1 ? 99 : i; };

export function DesignationBadge({ designation }) {
  const d = DESIGNATIONS[designation];
  if (!d) return null;
  return <span className={`sk-gdesig is-${designation}`}>{designation === 'takht' ? <Icon name="shield" size={11} /> : <Icon name="history" size={11} />}{d.label}</span>;
}

const placeOf = (g) => [g.city && g.city.name, g.state && g.state.name].filter(Boolean).join(', ');

/** Image-led card for featured Gurdwaras. */
export function GurdwaraTile({ g, headingLevel = 3, sizes = '(min-width: 1024px) 300px, (min-width: 640px) 46vw, 80vw' }) {
  const H = `h${headingLevel}`;
  return (
    <article className="sk-gtile" aria-labelledby={`gt-${g.id}`}>
      <div className="sk-gtile-media">
        <GurdwaraImage image={g.image} name={g.name} sizes={sizes} />
        <span className="sk-gtile-badge"><DesignationBadge designation={g.designation} /></span>
      </div>
      <div className="sk-gtile-body">
        <H className="sk-gtile-name" id={`gt-${g.id}`}><Link to={g.url}>{g.name}</Link></H>
        <p className="sk-gtile-place"><Icon name="pin" size={13} />{placeOf(g)}</p>
        <div className="sk-gtile-foot">
          {g.verification === 'verified' ? <VerificationBadge status="verified" /> : <VerificationBadge status="needs_verification" />}
          <span className="sk-dlink" aria-hidden="true">Explore <span className="sk-darrow">→</span></span>
        </div>
      </div>
    </article>
  );
}

export function PanjTakhtSection({ headingLevel = 2 }) {
  const res = useAsync(() => gurdwaraService.search({ designation: 'takht', status: ALL_STATUSES, pageSize: 20 }), []);
  const items = res.data ? [...res.data.items].sort((a, b) => takhtRank(a) - takhtRank(b)) : [];
  if (res.error || (res.data && !items.length)) return null;
  const H = `h${headingLevel}`;
  return (
    <section className="sk-takht" aria-labelledby="takht-h">
      <div className="sk-container relative">
        <p className="sk-dlabel">ਪੰਜ ਤਖ਼ਤ · The Panj Takht</p>
        <H className="sk-section-title mt-2" id="takht-h">The five historic seats of Sikh authority</H>
        <p className="sk-section-sub">Sri Akal Takht Sahib and the four Takhts at Anandpur Sahib, Patna Sahib, Nanded and Talwandi Sabo — each tied to a defining moment in the lives of the Guru Sahibs.</p>
        <ul className="sk-takht-list">
          {res.data ? items.map((g, i) => (
            <li key={g.id} data-motion="reveal">
              <Link className="sk-takht-card" to={g.url}>
                <span className="sk-takht-media"><GurdwaraImage image={g.image} name={g.name} sizes="(min-width: 1100px) 250px, (min-width: 640px) 44vw, 78vw" /></span>
                <span className="sk-takht-body">
                  <span className="sk-takht-num" aria-hidden="true" lang="pa">{gurmukhiNumeral(i + 1)}</span>
                  <span className="sk-takht-name">{g.name}</span>
                  <span className="sk-takht-place"><Icon name="pin" size={13} />{placeOf(g)}</span>
                  {g.summary ? <span className="sk-takht-text">{g.summary}</span> : null}
                  <span className="sk-takht-foot">
                    <span>{g.verification === 'verified' ? <><Icon name="check" size={12} /> Verified</> : 'Awaiting verification'}</span>
                    <span className="sk-dlink">Explore <span className="sk-darrow">→</span></span>
                  </span>
                </span>
              </Link>
            </li>
          )) : Array.from({ length: 5 }, (_, i) => <li key={i}><div className="sk-takht-card sk-skeleton" style={{ opacity: 0.15 }} aria-hidden="true" /></li>)}
        </ul>
      </div>
    </section>
  );
}

/**
 * Historic Gurdwaras with photos, one per state first so the selection spans India,
 * then the rest in alphabetical order. No ranking is implied.
 */
export function FeaturedGurdwaras({ limit = 8, title = 'Featured historic Gurdwaras', sub, headingLevel = 2, state }) {
  const res = useAsync(() => gurdwaraService.search({ designation: 'historic', status: ALL_STATUSES, pageSize: 50, ...(state ? { country: 'india', state } : {}) }), [state]);
  const all = res.data ? res.data.items : [];
  const withPhoto = all.filter((g) => g.image);
  const seen = new Set();
  const spread = [];
  for (const g of withPhoto) if (!seen.has(g.state.slug)) { seen.add(g.state.slug); spread.push(g); }
  const items = [...spread, ...withPhoto.filter((g) => !spread.includes(g))].slice(0, limit);
  if (res.error || (res.data && !items.length)) return null;
  const H = `h${headingLevel}`;
  return (
    <section className="sk-dsection" aria-labelledby="featured-h">
      <div className="sk-dsection-head">
        <div>
          <p className="sk-dlabel">Historic · Heritage · Pilgrimage</p>
          <H className="sk-section-title" id="featured-h">{title}</H>
          <p className="sk-section-sub">{sub || 'Gurdwaras connected with the Guru Sahibs and with defining events of Sikh history, from Punjab and Delhi to Bihar, Maharashtra and beyond.'}</p>
        </div>
        {res.data && res.data.total > items.length ? <p className="sk-dcount">Showing {items.length} of <b>{res.data.total}</b> historic Gurdwaras — all are in the results below.</p> : null}
      </div>
      <ul className="sk-gfeature-list">
        {res.data ? items.map((g) => <li key={g.id} data-motion="reveal"><GurdwaraTile g={g} headingLevel={headingLevel + 1} /></li>)
          : Array.from({ length: 4 }, (_, i) => <li key={i}><div className="sk-gtile" aria-hidden="true"><div className="sk-gtile-media sk-skeleton" /><div className="sk-gtile-body"><div className="sk-skeleton" style={{ height: '1rem', width: '70%' }} /></div></div></li>)}
      </ul>
    </section>
  );
}

/** States and territories of India that have verified, active Gurdwaras (from the database). */
export function StateChips({ country = 'india', headingLevel = 2 }) {
  const res = useAsync(() => gurdwaraService.locations(country), [country]);
  const states = res.data && res.data.states ? res.data.states.filter((s) => s.count > 0) : [];
  if (!states.length) return null;
  const H = `h${headingLevel}`;
  return (
    <section className="sk-dsection" aria-labelledby="states-h">
      <div className="sk-dsection-head">
        <div>
          <p className="sk-dlabel">Browse by state</p>
          <H className="sk-section-title" id="states-h">Gurdwaras across India</H>
        </div>
      </div>
      <ul className="sk-gstates" data-motion="reveal">
        {states.map((s) => (
          <li key={s.slug}><Link to={`/directory/gurdwaras/${country}/${s.slug}`}>{s.name}<small>{s.count}</small><span className="sr-only"> verified Gurdwaras</span></Link></li>
        ))}
      </ul>
    </section>
  );
}
