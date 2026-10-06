/* ==========================================================================
   GuruCard — one of the Ten Guru Sahibs: museum artwork (or a symbolic
   emblem), number, full name, Gurmukhi name, years, a short description and
   a key teaching. All text comes from data/gurus.js (and its translations);
   nothing is written here.
   ========================================================================== */
import { Link } from 'react-router-dom';
import GuruImage from '../images/GuruImage.jsx';

const HONORIFIC = { en: 'Sri ', hi: 'श्री ', pa: 'ਸ੍ਰੀ ' };

/** "Sri Guru Nanak Dev Ji" in the reading language. */
export function guruTitle(name, lang = 'en') {
  return (HONORIFIC[lang] || HONORIFIC.en) + name;
}

/** First sentence of a biography (used as the card's short description). */
export function firstSentence(text) {
  const m = String(text || '').match(/^.+?[.!?।](?=\s|$)/);
  return m ? m[0] : String(text || '');
}

export const paddedNumber = (n) => String(n).padStart(2, '0');

export default function GuruCard({ raw, guru, lang = 'en', langAttr, headingLevel = 2 }) {
  const H = `h${headingLevel}`;
  return (
    <article className="sk-guru-card">
      <Link to={`/gurus/${raw.id}`} className="sk-guru-card-media" tabIndex={-1} aria-hidden="true">
        <GuruImage guru={raw} sizes="(min-width: 1280px) 240px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" />
        <span className="sk-guru-card-num">{paddedNumber(raw.number)}</span>
      </Link>
      <div className="sk-guru-card-body">
        <H className="sk-guru-card-name" lang={langAttr}>
          <Link to={`/gurus/${raw.id}`}>{guruTitle(guru.name, lang)}</Link>
        </H>
        {lang !== 'pa' ? <p className="sk-guru-card-gurmukhi" lang="pa">ਸ੍ਰੀ {raw.gurmukhi}</p> : null}
        <p className="sk-guru-card-years"><span className="sr-only">Lifespan: </span>{raw.lifespan.replace('–', ' — ')}</p>
        <p className="sk-guru-card-text" lang={langAttr}>{firstSentence(guru.bio)}</p>
        {guru.teachings && guru.teachings[0] ? (
          <p className="sk-guru-card-teaching" lang={langAttr}><span className="sk-eyebrow">Key teaching</span>{guru.teachings[0]}</p>
        ) : null}
        <Link className="sk-guru-card-cta" to={`/gurus/${raw.id}`}>Explore <span aria-hidden="true">→</span><span className="sr-only"> the life of {guru.name}</span></Link>
      </div>
    </article>
  );
}
