/* ==========================================================================
   A children's quiz: pick an answer, see at once if it's right, get a score.
   `questions`: [{ question, options: [...], answer: index }] — the built-in
   quiz on /kids and the quizzes admins build (shared/contentTypes.js parseQuiz).
   ========================================================================== */
import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

export default function KidsQuiz({ questions }) {
  const [answers, setAnswers] = useState({});
  const done = Object.keys(answers).length;
  const score = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  return (
    <>
      <ol className="sk-kids-quiz" role="list">
        {questions.map(({ question, options, answer }, i) => {
          const picked = answers[i];
          return (
            <li key={i} className="sk-card sk-kids-card">
              <p className="sk-card-title"><span className="sk-kids-qnum">{i + 1}</span>{question}</p>
              <div className="sk-kids-options" role="group" aria-label={question}>
                {options.map((o, j) => {
                  const state = picked === undefined ? '' : j === answer ? ' is-right' : j === picked ? ' is-wrong' : '';
                  return (
                    <button key={j} type="button" className={`sk-kids-option${state}`} disabled={picked !== undefined}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}>
                      {o}{state === ' is-right' ? <Icon name="check" size={16} /> : null}
                    </button>
                  );
                })}
              </div>
              {picked !== undefined ? <p className="sk-kids-feedback" role="status">{picked === answer ? 'Shabaash! That’s right.' : `Good try! The answer is ${options[answer]}.`}</p> : null}
            </li>
          );
        })}
      </ol>
      <div className="sk-kids-score" role="status">
        <strong>{done === questions.length ? `You got ${score} out of ${questions.length}!` : `${done} of ${questions.length} answered · ${score} right so far`}</strong>
        {done ? <button type="button" className="sk-btn sk-btn-sm" onClick={() => setAnswers({})}>Play again</button> : null}
      </div>
    </>
  );
}
