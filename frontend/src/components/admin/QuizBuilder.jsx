/* ==========================================================================
   Build a quiz without any special format: add questions, type 2–4 answers,
   tick the right one, reorder or remove. `value` is the questions array the
   server checks (shared/contentTypes.js parseQuiz). Preview plays it.
   ========================================================================== */
import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import KidsQuiz from '../kids/KidsQuiz.jsx';
import { QUIZ_LIMITS } from '../../../../shared/contentTypes.js';

const blank = () => ({ question: '', options: ['', ''], answer: 0 });

export default function QuizBuilder({ value, onChange, error }) {
  const questions = value && value.length ? value : [];
  const [preview, setPreview] = useState(false);
  const update = (i, patch) => onChange(questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const move = (i, d) => {
    const next = [...questions];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const ready = questions.filter((q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 2);

  return (
    <div className="sk-quizb">
      {questions.map((q, i) => (
        <fieldset key={i} className="sk-quizb-q">
          <legend><span className="sk-kids-qnum">{i + 1}</span>Question {i + 1}</legend>
          <div className="sk-quizb-tools">
            <button type="button" className="sk-icon-btn" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="chevron" size={16} className="sk-flip" /></button>
            <button type="button" className="sk-icon-btn" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => move(i, 1)}><Icon name="chevron" size={16} /></button>
            <button type="button" className="sk-icon-btn" aria-label={`Remove question ${i + 1}`} onClick={() => onChange(questions.filter((_, k) => k !== i))}><Icon name="trash" size={16} /></button>
          </div>
          <label className="sk-form-label" htmlFor={`qq-${i}`}>Question</label>
          <input id={`qq-${i}`} className="sk-form-input" value={q.question} maxLength={QUIZ_LIMITS.question} placeholder="e.g. Who was the first Sikh Guru?"
            onChange={(e) => update(i, { question: e.target.value })} />
          <p className="sk-form-label mt-3">Answers — tick the right one</p>
          <ul className="sk-quizb-options" role="list">
            {q.options.map((o, j) => (
              <li key={j} className={q.answer === j ? 'is-right' : ''}>
                <input type="radio" name={`qa-${i}`} checked={q.answer === j} onChange={() => update(i, { answer: j })} aria-label={`Answer ${j + 1} is the right one`} />
                <input className="sk-form-input" value={o} maxLength={QUIZ_LIMITS.option} placeholder={`Answer ${j + 1}`} aria-label={`Question ${i + 1}, answer ${j + 1}`}
                  onChange={(e) => update(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} />
                {q.options.length > 2 ? (
                  <button type="button" className="sk-icon-btn" aria-label={`Remove answer ${j + 1}`}
                    onClick={() => update(i, { options: q.options.filter((_, k) => k !== j), answer: q.answer === j ? 0 : q.answer > j ? q.answer - 1 : q.answer })}><Icon name="close" size={14} /></button>
                ) : null}
              </li>
            ))}
          </ul>
          {q.options.length < QUIZ_LIMITS.options ? (
            <button type="button" className="sk-link-btn mt-2" onClick={() => update(i, { options: [...q.options, ''] })}><Icon name="plus" size={14} />Add an answer</button>
          ) : null}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        {questions.length < QUIZ_LIMITS.questions ? (
          <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" onClick={() => onChange([...questions, blank()])}><Icon name="plus" size={14} />{questions.length ? 'Add another question' : 'Add the first question'}</button>
        ) : null}
        {ready.length ? <button type="button" className="sk-btn sk-btn-sm" aria-pressed={preview} onClick={() => setPreview(!preview)}><Icon name="eye" size={14} />{preview ? 'Hide preview' : 'Try the quiz'}</button> : null}
        <span className="sk-card-meta" style={{ marginTop: 0 }}>{questions.length} / {QUIZ_LIMITS.questions} questions</span>
      </div>
      {error ? <p className="sk-form-error" role="alert">{error}</p> : null}
      {preview && ready.length ? (
        <div className="sk-kids sk-quizb-preview">
          <KidsQuiz key={JSON.stringify(ready)} questions={ready.map((q) => {
            const options = q.options.filter((o) => o.trim());
            const right = q.options[q.answer];
            return { question: q.question, options, answer: Math.max(0, options.indexOf(right)) };
          })} />
        </div>
      ) : null}
    </div>
  );
}
