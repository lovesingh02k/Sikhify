import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import LanguageSwitch from '../../components/common/LanguageSwitch.jsx';
import GuruCard from '../../components/gurus/GuruCard.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { useContentLanguage } from '../../hooks/useContentLanguage.js';

export const loadGurus = () => import('../../data/gurus.js').then((m) => m.default);

export default function GurusIndex() {
  useReactPage('The Ten Guru Sahibs — Sikhify.in', 'The lives, teachings and contributions of the Ten Sikh Gurus, from Sri Guru Nanak Dev Ji to Sri Guru Gobind Singh Ji, and the Sri Guru Granth Sahib Ji.');
  const state = useAsync(loadGurus, []);
  const i18n = useContentLanguage();

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Learn', to: '/learn-sikhism' }, { label: 'The Ten Gurus' }]} glyph="ਗੁਰੂ" eyebrow="Learn · Guru Sahiban" title={<>The Ten <span className="gold">Guru Sahibs</span></>}
        sub="From Sri Guru Nanak Dev Ji (1469) to Sri Guru Gobind Singh Ji, who passed the Guruship to the Sri Guru Granth Sahib Ji in 1708.">
        <nav aria-label="Section pages" className="page-subnav">
          <a href="/learn-sikhism">Learn Sikhism</a><Link aria-current="page" to="/gurus">The Ten Gurus</Link><a href="/sikh-history">Sikh History</a>
        </nav>
      </PageHero>
      <div className="sk-container sk-section">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <LanguageSwitch lang={i18n.requested} />
          <p className="sk-art-note">
            Paintings are historical artistic depictions from museum collections, made after the Gurus&apos; lifetimes — not portraits from life.
            {' '}<a href="#artwork-sources">About the artwork</a>
          </p>
        </div>
        <AsyncView state={state}>
          {(gurus) => (
            <>
              <ol className="sk-guru-grid mt-6" role="list">
                {gurus.map((raw) => (
                  <li key={raw.id}><GuruCard raw={raw} guru={i18n.localize('gurus', raw)} lang={i18n.lang} langAttr={i18n.langAttr} /></li>
                ))}
              </ol>
              <a className="sk-ggs-card mt-8" href="/gurbani">
                <span className="sk-ggs-ek" aria-hidden="true">ੴ</span>
                <span>
                  <span className="sk-eyebrow">The eternal Guru · since 1708</span>
                  <span className="sk-card-title block mt-1">Sri Guru Granth Sahib Ji</span>
                  <span className="sk-gurmukhi-accent block" lang="pa">ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ</span>
                  <span className="sk-card-text block">Read Banis and Shabads with meanings, or open any Ang, in the Gurbani Library.</span>
                </span>
                <span className="sk-guru-card-cta" aria-hidden="true">Open the Gurbani Library →</span>
              </a>
              <section id="artwork-sources" className="sk-card mt-8" aria-labelledby="art-h">
                <h2 className="sk-card-title" id="art-h">About the artwork</h2>
                <p className="sk-card-text">
                  The paintings shown here are artistic depictions made after the Gurus&apos; lifetimes, held by museums — mostly a Pahari series in the
                  Museum Rietberg, Zurich (c. 1830–1850; some scholars date it to the early 18th century), with works from the Government Museum and Art Gallery,
                  Chandigarh, and the Victoria Memorial Hall, Kolkata. They are in the public domain; each Guru&apos;s page credits its painting and links to the source.
                  The full list is on the <Link className="panel-view-all" to="/image-credits">image credits</Link> page.
                </p>
              </section>
            </>
          )}
        </AsyncView>
      </div>
    </main>
  );
}
