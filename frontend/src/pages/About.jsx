/* /about — what Sikhify is, what it offers, and who builds it. Only facts about the site itself. */
import { Link } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import { useReactPage } from '../hooks/useReactPage.js';

const OFFERS = [
  ['/hukamnama', 'Daily Hukamnama', 'The Hukamnama from Sri Harmandir Sahib, Amritsar, with meanings and audio.'],
  ['/gurbani', 'Gurbani', 'Read and listen to Gurbani with transliteration and meanings.'],
  ['/nitnem', 'Nitnem', 'The daily prayers, with a reader for each Bani.'],
  ['/learn-sikhism', 'Learn Sikhism', 'Lessons on Sikh beliefs, the Gurus and Sikh practice.'],
  ['/sikh-history', 'Sikh History', 'A searchable timeline from 1469 to the present day.'],
  ['/festivals', 'Festivals & Important Days', 'Gurpurabs and other observances, with dates checked against a named source.'],
  ['/sikh-media', 'Kirtan & Katha', 'Kirtan and Katha from Ragis and Kathavachaks.'],
  ['/directory', 'Directory', 'Gurdwaras, organisations, books, websites and more.'],
  ['/community', 'Community', 'A place for the Sangat to share, ask and connect.'],
];

export default function About() {
  useReactPage('About Sikhify — Sikhify.in', 'What Sikhify is, what it offers, and who designs and develops it.');
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'About' }]} eyebrow="About" title={<>About <span className="gold">Sikhify</span></>}
        sub="Discover. Learn. Live Sikhism — the teachings, history and beauty of Sikhi in one place." />
      <div className="sk-container sk-section sk-stack" style={{ maxWidth: 900 }}>
        <section aria-labelledby="purpose-h">
          <h2 className="sk-section-title" id="purpose-h">Simplifying Sikhism</h2>
          <div className="fest-prose mt-3">
            <p>Sikhify brings together the daily Hukamnama, Gurbani with meanings, Nitnem, lessons on Sikhi, Sikh history, Kirtan and Katha, and a directory of Gurdwaras and Sikh resources — so that anyone, anywhere, can explore and learn.</p>
            <p>Where dates or facts are uncertain, we say so, and we show where our information comes from.</p>
          </div>
        </section>
        <section aria-labelledby="offers-h">
          <h2 className="sk-section-title" id="offers-h">What you&apos;ll find here</h2>
          <ul className="sk-grid sk-grid-3 mt-6">
            {OFFERS.map(([to, title, text]) => (
              <li key={to} className="sk-card">
                <p className="sk-card-title"><a href={to}>{title}</a></p>
                <p className="sk-card-meta">{text}</p>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="credits-h" className="sk-card">
          <h2 className="sk-card-title" id="credits-h">Credits</h2>
          <dl className="sk-dl mt-3">
            <dt>Images</dt><dd><Link className="panel-view-all" to="/image-credits">Image sources and licences</Link></dd>
          </dl>
        </section>
      </div>
    </main>
  );
}
