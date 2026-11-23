/* The quiz on the website: a language switch, questions one at a time, and the score with sharing.
   Used by /daily-quiz (today's five, or a quiz a friend shared from the website) and /quiz (one shared from the app). */
import { useEffect, useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { LANGUAGES, questionIn, saveLanguage, questionText, scoreText, shareText, whatsappLink } from '../../utils/dailyQuiz.js';
import './quiz.css';

export function LanguageSwitch({ lang, onChange, label }) {
  return (
    <div className="sk-quiz-langs" role="group" aria-label={label}>
      <Icon name="globe" size={16} />
      {LANGUAGES.map(([code, name]) => (
        <button key={code} type="button" lang={code} className="sk-chip" aria-pressed={lang === code} onClick={() => { saveLanguage(code); onChange(code); }}>{name}</button>
      ))}
    </div>
  );
}

function ShareButtons({ t, text, label }) {
  return (
    <div className="sk-quiz-share">
      <button type="button" className="sk-btn sk-btn-gold" onClick={() => shareText(t, text)}><Icon name="share" size={16} />{label}</button>
      <a className="sk-btn" href={whatsappLink(text)} target="_blank" rel="noopener noreferrer"><Icon name="message" size={16} />{t('whatsapp')}<span className="sr-only"> (opens in a new tab)</span></a>
    </div>
  );
}

/**
 * entries: the questions (all languages); lang / onLang: the language shown.
 * answers / onAnswer: the option chosen per question (null = not yet).
 * renderScore(score, questions): what shows once every question is answered.
 */
export default function QuizGame({ entries, lang, onLang, t, answers, onAnswer, renderScore }) {
  const questions = useMemo(() => entries.map((e) => questionIn(e, lang)), [entries, lang]);
  const firstOpen = () => { const i = answers.findIndex((a) => a === null); return i < 0 ? questions.length - 1 : i; };
  const [at, setAt] = useState(firstOpen);
  const [finished, setFinished] = useState(() => answers.every((a) => a !== null));
  useEffect(() => { if (answers.every((a) => a === null)) { setAt(0); setFinished(false); } }, [answers]);

  if (!questions.length) return null;
  const score = questions.filter((q, i) => answers[i] === q.a).length;
  const nextOpen = (from) => { for (let k = 0; k < answers.length; k++) { const i = (from + k) % answers.length; if (answers[i] === null) return i; } return null; };
  const q = questions[at];
  const picked = answers[at];

  return (
    <div className="sk-stack" style={{ gap: '1rem' }}>
      <LanguageSwitch lang={lang} onChange={onLang} label={t('Quiz language')} />
      {finished ? renderScore(score, questions, ShareButtons) : (
        <>
          <div className="sk-quiz-progress">
            <b>{t('Question')} {at + 1} / {questions.length}</b>
            <span className="sk-quiz-dots" aria-hidden="true">
              {answers.map((a, i) => <span key={i} className={a === null ? (i === at ? 'is-now' : '') : a === questions[i].a ? 'is-right' : 'is-wrong'} />)}
            </span>
          </div>
          <article className="sk-card sk-quiz-card" lang={lang} aria-labelledby="quiz-q">
            <div className="sk-quiz-head">
              <h2 id="quiz-q" className="sk-quiz-question">{q.q}</h2>
              <button type="button" className="sk-icon-btn" title={t('Ask a friend')} aria-label={t('Ask a friend')} onClick={() => shareText(t, questionText(t, q))}><Icon name="share" size={18} /></button>
            </div>
            {q.d ? <p className="sk-quiz-detail">{q.d}</p> : null}
            <ol className="sk-quiz-options" role="list">
              {q.o.map((o, j) => {
                const state = picked === null ? '' : j === q.a ? 'is-right' : j === picked ? 'is-wrong' : 'is-other';
                return (
                  <li key={j}>
                    <button type="button" className={`sk-quiz-option ${state}`} disabled={picked !== null} aria-pressed={picked === j} onClick={() => onAnswer(at, j)}>
                      <span className="sk-quiz-letter" aria-hidden="true">{state === 'is-right' ? '✓' : state === 'is-wrong' ? '✕' : String.fromCharCode(65 + j)}</span>
                      <span>{o}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {picked !== null ? (
              <p className={`sk-quiz-result ${picked === q.a ? 'is-right' : ''}`} role="status">
                {picked === q.a ? t('Shabaash! That’s right.') : `${t('Good try! The answer is')} ${q.o[q.a]}.`}
              </p>
            ) : null}
          </article>
          {picked !== null ? (
            <button type="button" className="sk-btn sk-btn-gold sk-btn-lg" onClick={() => { const n = nextOpen(at + 1); if (n === null) setFinished(true); else setAt(n); }}>
              {nextOpen(at + 1) === null ? t('See my score') : t('Next question')} <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

export { scoreText, ShareButtons };
