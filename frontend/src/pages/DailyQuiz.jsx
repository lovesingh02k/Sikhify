/* /daily-quiz — the Daily Quiz on the website: five questions a day in English, Punjabi or Hindi.
   With ?q=… (a quiz shared from the website) it plays those questions instead, against the friend's score (?s=). */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import QuizGame from '../components/quiz/QuizGame.jsx';
import { useReactPage } from '../hooks/useReactPage.js';
import { loadBank, wordsFor, savedLanguage, todayIds, answersOn, saveAnswer, streak, scoreText, PER_DAY } from '../utils/dailyQuiz.js';

/** A friend's quiz: the questions from the link, answered here (nothing is saved). */
export function FriendQuiz({ bank, ids, friendScore, lang, setLang, t, children }) {
  const entries = ids.map((id) => bank.byId.get(id)).filter(Boolean);
  const [answers, setAnswers] = useState(() => entries.map(() => null));
  if (!entries.length) return <p className="sk-notice">{t('none')}</p>;
  const n = entries.length;
  return (
    <>
      <p className="sk-notice" role="note">
        {friendScore !== null && friendScore !== undefined ? `${t('Your friend got')} ${friendScore}/${n}. ${t('Can you beat them?')}` : t('A friend sent you this question. Can you answer it?')}
      </p>
      <QuizGame entries={entries} lang={lang} onLang={setLang} t={t} answers={answers} onAnswer={(i, j) => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
        renderScore={(score, questions, Share) => (
          <div className="sk-stack" style={{ gap: '0.9rem' }}>
            <div className="sk-quiz-score">
              <b>{score} / {n}</b>
              {friendScore !== null && friendScore !== undefined ? <p>{score > friendScore ? t('You beat your friend!') : score === friendScore ? t('A tie with your friend!') : t('Your friend wins this time.')}</p> : null}
            </div>
            <Share t={t} text={scoreText(t, questions, answers, score, 0)} label={t('Share my score')} />
            {children}
          </div>
        )} />
    </>
  );
}

function TodaysQuiz({ bank, lang, setLang, t }) {
  const [ids] = useState(() => todayIds(bank));
  const [answers, setAnswers] = useState(() => answersOn());
  const entries = ids.map((id) => bank.byId.get(id));
  return (
    <QuizGame entries={entries} lang={lang} onLang={setLang} t={t} answers={answers} onAnswer={(i, j) => setAnswers(saveAnswer(i, j))}
      renderScore={(score, questions, Share) => {
        const days = streak();
        const message = score === PER_DAY ? t('Perfect! Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!') : score >= PER_DAY - 2 ? t('Very good! Keep learning.') : t('Good effort — you’ll know these next time.');
        return (
          <div className="sk-stack" style={{ gap: '0.9rem' }}>
            <div className="sk-quiz-score" lang={lang}>
              <span aria-hidden="true">🏆</span>
              <b>{score} / {PER_DAY}</b>
              <p>{message}</p>
              {days > 0 ? <span className="sk-quiz-streak">🔥 {t('Streak')}: {days} {days === 1 ? t('day') : t('days')}</span> : null}
            </div>
            <p className="text-center font-semibold">{t('Come back tomorrow for 5 new questions.')}</p>
            <Share t={t} text={scoreText(t, questions, answers, score, days)} label={t('Share my score')} />
          </div>
        );
      }} />
  );
}

export default function DailyQuiz() {
  const [params] = useSearchParams();
  const ids = (params.get('q') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const s = Number.parseInt(params.get('s') || '', 10);
  const friendScore = Number.isFinite(s) ? s : null;
  const [bank, setBank] = useState(null);
  const [failed, setFailed] = useState(false);
  const [lang, setLang] = useState(savedLanguage);
  useEffect(() => { loadBank().then(setBank).catch(() => setFailed(true)); }, []);
  const t = wordsFor(bank, lang);
  const friend = ids.length > 0;
  useReactPage(friend ? 'Quiz from a friend — Sikhify' : 'Daily Quiz — Sikhify', '5 new questions every day on the Gurus, Sikh history, Gurbani and Sikh life — in English, Punjabi or Hindi.');

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: friend ? t('Quiz from a friend') : t('Daily Quiz') }]} eyebrow="Sikhify" glyph="ਕੁਇਜ਼"
        title={friend ? t('Quiz from a friend') : <>{t('Daily Quiz')}</>}
        sub={t('5 new questions every day — on the Gurus, Sikh history, Gurbani and Sikh life.')} />
      <div className="sk-container sk-section sk-stack" style={{ maxWidth: 760, gap: '1rem' }}>
        {failed ? <p className="sk-notice" role="alert">The quiz couldn’t load. Please reload the page.</p>
          : !bank ? <p className="sk-muted" role="status">{t('loading')}</p>
            : friend ? (
              <FriendQuiz key={ids.join(',')} bank={bank} ids={ids} friendScore={friendScore} lang={lang} setLang={setLang} t={t}>
                <Link className="sk-btn" to="/daily-quiz">{t('Play today’s Daily Quiz')}</Link>
              </FriendQuiz>
            ) : <TodaysQuiz bank={bank} lang={lang} setLang={setLang} t={t} />}
      </div>
    </main>
  );
}
