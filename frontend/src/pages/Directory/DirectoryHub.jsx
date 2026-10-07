/* ==========================================================================
   /directory — the Sikh Directory hub.
   Every number on this page comes from the API (published records, verified
   Gurdwaras, states with listings, Kirtan artists); nothing is hard-coded.
   Sections come from shared/contentTypes.js plus the three directories that
   live elsewhere (Gurdwaras, the Ten Gurus, Kirtaniye & Katha Vachaks).
   ========================================================================== */
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import OptimizedImage from '../../components/images/OptimizedImage.jsx';
import CategoryCard from '../../components/directory/CategoryCard.jsx';
import DirectoryCard from '../../components/directory/DirectoryCard.jsx';
import { TrustSection, SubmitCta } from '../../components/directory/DirectoryTrust.jsx';
import { PanjTakhtSection } from '../../components/gurdwaras/GurdwaraShowcase.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { mediaService } from '../../services/media/mediaService.js';
import { CONTENT_TYPES } from '../../../../shared/contentTypes.js';
import { COMMONS_COVERS, SECTION_PITCH } from '../../data/directoryVisuals.js';
import { heroArt } from '../../data/heroArt.js';
import { guruArtwork } from '../../data/guruArtwork.js';
import '../../components/directory/directory.css';

const GROUPS = [
  { key: 'Places', label: 'Places', icon: 'pin', sub: 'Gurdwaras and the sites where Sikh history happened.' },
  { key: 'People', label: 'People', icon: 'users', sub: 'The Guru Sahibs, the Sikhs who shaped history, and the voices of Kirtan and Katha today.' },
  { key: 'Community', label: 'Community', icon: 'calendar', sub: 'Gurpurabs and Samagams, Sikh institutions and sourced community news.' },
  { key: 'Resources', label: 'Resources', icon: 'book', sub: 'Trusted websites, apps, books and research for Gurbani, learning and history.' },
  { key: 'Learn', label: 'Learn', icon: 'heart', sub: 'Stories, Sakhis and values for children.' },
];
const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '');

function Stat({ value, label }) {
  const loading = value === undefined;
  if (value === null) return null; // unavailable: leave it out rather than show a guess
  return <div className={`sk-dstat${loading ? ' is-loading' : ''}`}><b>{loading ? '00' : num(value)}</b><span>{label}</span></div>;
}

function HeroMosaic() {
  const painting = heroArt('history');
  const nanak = guruArtwork('guru-nanak-dev-ji');
  const h = COMMONS_COVERS.harmandir;
  return (
    <div className="sk-dmosaic" data-motion="hero-item">
      <figure>
        <OptimizedImage src={h.src} srcSet={`${h.thumb} 500w, ${h.src} 1280w`} sizes="420px" width={h.width} height={h.height} alt={h.alt} priority />
        <figcaption><b>Sri Harmandir Sahib, Amritsar</b>Photo: {h.author}, {h.license}</figcaption>
      </figure>
      {nanak ? (
        <figure>
          <OptimizedImage src={nanak.fallbackSrc} sources={[{ type: 'image/webp', srcSet: nanak.webpSrcSet }]} sizes="300px" width={nanak.width} height={nanak.height} alt={nanak.alt} />
          <figcaption><b>Sri Guru Nanak Dev Ji</b>{nanak.style}, {nanak.date}</figcaption>
        </figure>
      ) : null}
      {painting ? (
        <figure>
          <OptimizedImage src={painting.fallbackSrc} sources={[{ type: 'image/webp', srcSet: painting.webpSrcSet }]} sizes="300px" width={painting.width} height={painting.height} alt={painting.alt} />
          <figcaption><b>{painting.title}</b>{painting.artist}, {painting.date}</figcaption>
        </figure>
      ) : null}
    </div>
  );
}

export default function DirectoryHub() {
  useReactPage('Sikh Directory — Gurdwaras, Personalities, Heritage & Resources | Sikhify',
    'Explore the Sikhify Directory: the Panj Takht and historic Gurdwaras, Sikh personalities, heritage sites, organizations, events, websites, apps, books and research — every record sourced and reviewed.');
  const counts = useAsync(() => entryService.summary(), []);
  const meta = useAsync(() => gurdwaraService.meta(), []);
  const india = useAsync(() => gurdwaraService.locations('india'), []);
  const media = useAsync(() => mediaService.catalog(), []);
  const people = useAsync(() => entryService.list('personality', { limit: 4 }), []);

  const c = counts.data;
  const countOf = (key) => (counts.error ? null : c ? c[key] : undefined);
  const published = counts.error ? null : c ? Object.values(c).reduce((a, b) => a + b, 0) : undefined;
  const gVerified = meta.error ? null : meta.data ? meta.data.totalVerified : undefined;
  const historic = meta.error ? null : meta.data ? Object.values(meta.data.designations || {}).reduce((a, b) => a + b, 0) : undefined;
  const states = india.error ? null : india.data ? (india.data.states || []).filter((s) => s.count > 0).length : undefined;
  const artists = media.error ? null : media.data ? media.data.artists.length : undefined;

  const extra = {
    Places: [{ key: 'gurdwaras', type: 'gurdwara', title: 'Global Gurdwara Directory', text: SECTION_PITCH.gurdwara, to: '/directory/gurdwaras', count: gVerified, unit: 'verified Gurdwara', feature: true }],
    People: [
      { key: 'gurus', type: 'gurus', title: 'The Ten Gurus', text: SECTION_PITCH.gurus, to: '/gurus', countLabel: <><b>10</b> Guru Sahibs</> },
      { key: 'kirtan', type: 'kirtan', title: 'Kirtaniye, Ragis & Katha Vachaks', text: SECTION_PITCH.kirtan, href: '/sikh-media', count: artists, unit: 'artist' },
    ],
  };

  return (
    <main id="main-content">
      <section className="page-hero sk-dhero" aria-labelledby="page-title">
        <span className="page-hero-glyph" aria-hidden="true" lang="pa">ਸਿੱਖ</span>
        <div className="sk-container">
          <nav aria-label="Breadcrumb" className="breadcrumbs"><ol><li><a href="/">Home</a></li><li><span aria-current="page">Directory</span></li></ol></nav>
          <div className="sk-dhero-grid">
            <div>
              <p className="sk-dhero-kicker page-hero-eyebrow"><span>Discover</span><span>Learn</span><span>Connect</span></p>
              <h1 className="page-hero-title" id="page-title">Sikhify <span className="gold">Directory</span></h1>
              <p className="page-hero-sub">Sikh places, people, organizations, heritage, resources and communities — gathered in one place, with the source of every record on its page.</p>
              <div className="sk-dhero-actions" data-motion="hero-item">
                <a className="sk-btn sk-btn-gold sk-btn-lg" href="#places">Explore the directory <span aria-hidden="true">↓</span></a>
                <Link className="sk-btn sk-btn-lg sk-btn-ghost" to="/directory/gurdwaras"><Icon name="pin" size={16} />Find a Gurdwara</Link>
              </div>
              <div className="sk-dstats" data-motion="hero-item" aria-label="Directory in numbers">
                <Stat value={gVerified} label="verified Gurdwaras" />
                <Stat value={historic} label="Takhts & historic Gurdwaras" />
                <Stat value={states} label="states & territories" />
                <Stat value={published} label="published directory records" />
              </div>
            </div>
            <HeroMosaic />
          </div>
        </div>
      </section>

      <nav className="sk-djump" aria-label="Directory sections">
        <div className="sk-container">
          <ul>
            {GROUPS.map((g) => <li key={g.key}><a href={`#${g.key.toLowerCase()}`}><Icon name={g.icon} size={14} />{g.label}</a></li>)}
            <li><a href="#trust"><Icon name="shield" size={14} />Trust</a></li>
          </ul>
        </div>
      </nav>

      {GROUPS.map((group, gi) => {
        const types = Object.entries(CONTENT_TYPES).filter(([, t]) => t.group === group.key);
        const cards = [
          ...(extra[group.key] || []).filter((x) => x.feature),
          ...types.map(([key, t]) => ({ key, type: key, title: t.plural, text: t.description, to: `/${t.path}`, count: countOf(key), unit: 'record' })),
          ...(extra[group.key] || []).filter((x) => !x.feature),
        ];
        if (!cards.length) return null;
        return (
          <div key={group.key}>
            <section className="sk-container sk-dsection" id={group.key.toLowerCase()} aria-labelledby={`dir-${group.key}`}>
              <div className="sk-dsection-head">
                <div>
                  <p className="sk-dlabel"><span className="sk-dsection-num" lang="pa" aria-hidden="true">{['੧', '੨', '੩', '੪', '੫'][gi]}</span>{group.label}</p>
                  <h2 className="sk-section-title" id={`dir-${group.key}`}>{group.label}</h2>
                  <p className="sk-section-sub">{group.sub}</p>
                </div>
              </div>
              <ul className="sk-dcats">
                {cards.map(({ key, ...x }) => <CategoryCard key={key} group={group.label} {...x} />)}
              </ul>
            </section>
            {group.key === 'Places' ? <div className="mt-12"><PanjTakhtSection /></div> : null}
            {group.key === 'People' && people.data && people.data.items.length ? (
              <section className="sk-container sk-dsection" aria-labelledby="people-h">
                <div className="sk-dsection-head">
                  <div>
                    <p className="sk-dlabel">From the directory</p>
                    <h2 className="sk-section-title" id="people-h">Sikh personalities</h2>
                  </div>
                  <Link className="sk-dlink" to="/personalities">All personalities <span className="sk-darrow">→</span></Link>
                </div>
                <ul className="sk-dgrid is-dense">
                  {people.data.items.map((e) => <li key={e.id} data-motion="reveal"><DirectoryCard entry={e} type="personality" headingLevel={3} /></li>)}
                </ul>
              </section>
            ) : null}
          </div>
        );
      })}

      <div className="sk-container">
        <TrustSection />
        <SubmitCta />
        <div className="pb-16" />
      </div>
    </main>
  );
}
