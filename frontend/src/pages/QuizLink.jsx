/* /quiz — a quiz shared from the Sikhify app. With the app installed, Android opens these links in the app
   straight away (see public/.well-known/assetlinks.json), so this page is seen without it: the same questions
   play right here, in English, Punjabi or Hindi, and "Open in the app" hands them to the app (sikhify:// link). */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import { FriendQuiz } from './DailyQuiz.jsx';
import { useReactPage } from '../hooks/useReactPage.js';
import { loadBank, wordsFor, savedLanguage } from '../utils/dailyQuiz.js';

const PACKAGE = 'in.sikhify.app';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

export default function QuizLink() {
  useReactPage('Sikhify Daily Quiz', 'A friend shared a Sikhify quiz with you — play it here or in the Sikhify app.');
  const [params] = useSearchParams();
  const ids = (params.get('q') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const s = Number.parseInt(params.get('s') || '', 10);
  const score = Number.isFinite(s) ? s : null;
  const [bank, setBank] = useState(null);
  const [lang, setLang] = useState(savedLanguage);
  useEffect(() => { loadBank().then(setBank).catch(() => {}); }, []);
  const t = wordsFor(bank, lang);
  const query = new URLSearchParams({ q: ids.join(','), ...(score !== null ? { s: String(score) } : {}) }).toString();
  // Android Chrome opens the app from an intent link, or the Play Store when the app is missing.
  const intentUrl = `intent://quiz?${query}#Intent;scheme=sikhify;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
  const android = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Quiz' }]} eyebrow="Sikhify" glyph="ਕੁਇਜ਼" title={t('Quiz from a friend')}
        sub={t('5 new questions every day — on the Gurus, Sikh history, Gurbani and Sikh life.')} />
      <div className="sk-container sk-section sk-stack" style={{ maxWidth: 760, gap: '1rem' }}>
        {android ? (
          <div className="sk-form-actions">
            <a className="sk-btn" href={intentUrl}>{t('openApp')}</a>
          </div>
        ) : null}
        {!bank ? <p className="sk-muted" role="status">{t('loading')}</p> : ids.length ? (
          <FriendQuiz bank={bank} ids={ids} friendScore={score} lang={lang} setLang={setLang} t={t}>
            <Link className="sk-btn" to="/daily-quiz">{t('Play today’s Daily Quiz')}</Link>
          </FriendQuiz>
        ) : (
          <Link className="sk-btn sk-btn-gold" to="/daily-quiz">{t('Play today’s Daily Quiz')}</Link>
        )}
      </div>
    </main>
  );
}
