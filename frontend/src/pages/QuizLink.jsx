/* /quiz — where a quiz shared from the Sikhify app lands when the app is not installed (with the app,
   Android opens the link in the app straight away: see public/.well-known/assetlinks.json).
   "Open in the app" hands the same questions to the app through its sikhify:// link. */
import { useSearchParams } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import { useReactPage } from '../hooks/useReactPage.js';

const PACKAGE = 'in.sikhify.app';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

export default function QuizLink() {
  useReactPage('Sikhify Daily Quiz', 'A friend shared a Sikhify quiz with you — open it in the Sikhify app.');
  const [params] = useSearchParams();
  const ids = (params.get('q') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const score = params.get('s');
  const query = new URLSearchParams({ q: ids.join(','), ...(score ? { s: score } : {}) }).toString();
  // Android Chrome opens the app from an intent link, or the Play Store when the app is missing.
  const intentUrl = `intent://quiz?${query}#Intent;scheme=sikhify;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
  const android = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Quiz' }]} eyebrow="Sikhify app" title={<>Daily <span className="gold">Quiz</span></>}
        sub={score && ids.length ? `Your friend got ${score}/${ids.length}. Can you beat them?` : 'A friend sent you a question about Sikhi. Can you answer it?'} />
      <div className="sk-container sk-section sk-stack" style={{ maxWidth: 720 }}>
        <section className="sk-card" aria-labelledby="open-h">
          <h2 className="sk-card-title" id="open-h">Play it in the Sikhify app</h2>
          <div className="fest-prose mt-3">
            <p>This quiz plays in the Sikhify app: {ids.length > 1 ? `the same ${ids.length} questions your friend answered` : 'the question your friend sent'}, one at a time, in English, Punjabi or Hindi.</p>
            <p>The app also has the daily Hukamnama, Nitnem, Gurbani, Sikh history and 5 new quiz questions every day.</p>
          </div>
          <div className="sk-form-actions mt-4">
            {android ? <a className="sk-btn sk-btn-gold" href={intentUrl}>Open in the Sikhify app</a> : null}
            <a className="sk-btn" href={PLAY_URL} rel="noopener">Get the app on Google Play</a>
          </div>
          {!android ? <p className="sk-card-meta mt-4">The Sikhify app is for Android phones. Open this link on your phone to play.</p> : null}
        </section>
      </div>
    </main>
  );
}
