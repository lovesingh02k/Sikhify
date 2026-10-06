/* /image-credits — the source and licence of every image on Sikhify. */
import { Link } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import GuruImage from '../components/images/GuruImage.jsx';
import { AsyncView } from '../components/ui/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useReactPage } from '../hooks/useReactPage.js';
import { guruArtwork } from '../data/guruArtwork.js';
import { PHOTO_CREDITS, OTHER_CREDITS } from '../data/imageCredits.js';
import { heroArt, HERO_ART_KEYS } from '../data/heroArt.js';

export default function ImageCredits() {
  useReactPage('Image credits — Sikhify.in', 'Sources and licences for the historical artwork and photographs used on Sikhify.');
  const gurus = useAsync(() => import('../data/gurus.js').then((m) => m.default), []);
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Image credits' }]} eyebrow="About" title="Image credits"
        sub="Where every image on Sikhify comes from, and under what licence. Text on the site is always real text — never images." />
      <div className="sk-container sk-section sk-stack">
        <section aria-labelledby="art-h">
          <h2 className="sk-section-title" id="art-h">Historical artwork of the Ten Guru Sahibs</h2>
          <p className="sk-section-sub">Artistic depictions made after the Gurus&apos; lifetimes and held by museums — not portraits from life or photographs. Optimized copies of the public-domain files on Wikimedia Commons.</p>
          <AsyncView state={gurus}>
            {(list) => (
              <ul className="sk-credit-list mt-6">
                {list.map((g) => {
                  const art = guruArtwork(g.id);
                  return (
                    <li key={g.id} className="sk-card sk-credit-item">
                      <span className="sk-credit-thumb"><GuruImage guru={g} sizes="96px" emblemSize="sm" /></span>
                      <div className="min-w-0">
                        <p className="sk-card-title"><Link to={`/gurus/${g.id}`}>Sri {g.name}</Link></p>
                        {art ? (
                          <dl className="sk-dl mt-2">
                            <dt>Work</dt><dd>{art.style}, {art.date}{art.dateNote ? ` — ${art.dateNote}` : ''}</dd>
                            <dt>Depicts</dt><dd>{art.subject}</dd>
                            <dt>Collection</dt><dd>{art.institution}{art.accession ? `, acc. no. ${art.accession}` : ''}</dd>
                            <dt>Licence</dt><dd>{art.license}</dd>
                            <dt>Source</dt><dd><a className="panel-view-all" href={art.sourceUrl} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></dd>
                          </dl>
                        ) : <p className="sk-card-meta">Shown with a symbolic emblem (Ik Onkar and the Guru&apos;s number in Gurmukhi).</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AsyncView>
        </section>
        <section aria-labelledby="hero-h">
          <h2 className="sk-section-title" id="hero-h">Historical artwork in section headers</h2>
          <ul className="sk-credit-list mt-6">
            {HERO_ART_KEYS.map((k) => {
              const a = heroArt(k);
              return (
                <li key={k} className="sk-card sk-credit-item">
                  <span className="sk-credit-thumb" style={{ width: 120, height: 'auto' }}>
                    <picture><source type="image/webp" srcSet={a.webpSrcSet} sizes="120px" /><img src={a.fallbackSrc} width={a.width} height={a.height} alt={a.alt} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto' }} /></picture>
                  </span>
                  <div className="min-w-0">
                    <p className="sk-card-title">{a.title}</p>
                    <dl className="sk-dl mt-2">
                      <dt>Used on</dt><dd>{k === 'history' ? 'Sikh History' : 'Gurbani Library'}</dd>
                      {a.artist ? <><dt>Artist</dt><dd>{a.artist}{a.date ? ', ' + a.date : ''}</dd></> : null}
                      <dt>Medium</dt><dd>{a.medium}</dd>
                      <dt>Collection</dt><dd><a className="panel-view-all" href={a.institutionUrl} target="_blank" rel="noopener noreferrer">{a.institution}</a></dd>
                      <dt>Licence</dt><dd>{a.license}</dd>
                      <dt>Source</dt><dd><a className="panel-view-all" href={a.sourceUrl} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></dd>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="photo-h">
          <h2 className="sk-section-title" id="photo-h">Photographs</h2>
          <div className="sk-table-wrap mt-4">
            <table className="sk-table">
              <thead><tr><th scope="col">Where</th><th scope="col">Subject</th><th scope="col">Photographer</th><th scope="col">Licence</th></tr></thead>
              <tbody>
                {PHOTO_CREDITS.map((p) => (
                  <tr key={p.url}>
                    <td>{p.use}</td>
                    <td><a className="panel-view-all" href={p.url} target="_blank" rel="noopener noreferrer">{p.subject}</a></td>
                    <td>{p.author}</td>
                    <td><a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">{p.license}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-labelledby="other-h">
          <h2 className="sk-section-title" id="other-h">Other images</h2>
          <ul className="mt-3 sk-card-text">{OTHER_CREDITS.map((o) => <li key={o.use}><strong>{o.use}:</strong> {o.text}</li>)}</ul>
          <p className="sk-card-meta mt-3">The Khanda mark is Sikhify&apos;s brand artwork. Ik Onkar and other Gurmukhi decorative elements are text set in Noto Sans Gurmukhi (SIL Open Font License), not images.</p>
        </section>
      </div>
    </main>
  );
}
