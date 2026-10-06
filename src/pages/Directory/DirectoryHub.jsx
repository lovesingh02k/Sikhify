import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { CONTENT_TYPES } from '../../../shared/contentTypes.js';
import { plural } from '../../utils/format.js';

const GROUPS = ['Places', 'People', 'Community', 'Resources', 'Learn'];

export default function DirectoryHub() {
  useReactPage('Sikh Directory — Sikhify.in', 'Gurdwaras, Sikh personalities, organizations, events, websites, apps, books and research, heritage sites and news — verified and sourced.');
  const counts = useAsync(() => entryService.summary(), []);
  const gurdwaras = useAsync(() => gurdwaraService.meta(), []);

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Directory' }]} glyph="ਸਿੱਖ" eyebrow="Discover" title={<>Sikh <span className="gold">Directory</span></>}
        sub="Gurdwaras, personalities, organizations, events, resources and heritage — every record is reviewed and shows its source and when it was last verified." />
      <div className="sk-container sk-section">
        <div className="sk-note mb-8" role="note">
          <Icon name="shield" size={18} />
          <p><strong>Nothing is published without a source.</strong> Records come from the Sikhify team and from the Sangat through <Link className="panel-view-all" to="/submit">Submit / Update Information</Link>; every submission is reviewed before it appears here.</p>
        </div>
        {GROUPS.map((group) => {
          const types = Object.entries(CONTENT_TYPES).filter(([, t]) => t.group === group);
          if (!types.length) return null;
          return (
            <section key={group} className="mt-10 first:mt-0" aria-labelledby={`dir-${group}`}>
              <p className="sk-eyebrow">Directory</p>
              <h2 className="sk-section-title" id={`dir-${group}`}>{group}</h2>
              <ul className="sk-grid sk-grid-3 mt-5" role="list">
                {types.map(([key, t]) => {
                  const n = counts.data ? counts.data[key] : null;
                  return (
                    <li key={key}>
                      <Link className="sk-card sk-card-link h-full" to={`/${t.path}`}>
                        <h3 className="sk-card-title">{t.plural}</h3>
                        <p className="sk-card-text">{t.description}</p>
                        <p className="sk-card-meta">
                          {counts.error ? 'Listing unavailable right now' : n === null ? '…' : n === 0 ? 'No records published yet' : plural(n, 'record')}
                        </p>
                      </Link>
                    </li>
                  );
                })}
                {group === 'Places' ? (
                  <li>
                    <Link className="sk-card sk-card-link h-full" to="/directory/gurdwaras">
                      <h3 className="sk-card-title">Global Gurdwara Directory</h3>
                      <p className="sk-card-text">Find Gurdwaras by country, state and city, see them on a map, or find the ones nearest to you.</p>
                      <p className="sk-card-meta">
                        {gurdwaras.error ? 'Listing unavailable right now' : !gurdwaras.data ? '…' : gurdwaras.data.totalVerified === 0 ? 'No verified listings yet' : plural(gurdwaras.data.totalVerified, 'verified Gurdwara')}
                      </p>
                    </Link>
                  </li>
                ) : null}
                {group === 'People' ? (
                  <>
                    <li><Link className="sk-card sk-card-link h-full" to="/gurus"><h3 className="sk-card-title">The Ten Gurus</h3><p className="sk-card-text">Biographies, timelines, teachings and Bani of the Ten Gurus.</p><p className="sk-card-meta">10 profiles</p></Link></li>
                    <li><a className="sk-card sk-card-link h-full" href="/sikh-media"><h3 className="sk-card-title">Kirtaniye, Ragis &amp; Katha Vachaks</h3><p className="sk-card-text">Hazoori Ragis, Raagi Jathas, Dhadi Jathas and Katha Vachaks with their videos.</p><p className="sk-card-meta">In Kirtan &amp; Katha</p></a></li>
                  </>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
