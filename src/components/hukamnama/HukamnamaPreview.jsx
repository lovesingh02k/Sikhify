/* ==========================================================================
   Preview of a Hukamnama record exactly as the public page will normalize it
   (hukamnamaService.fromRecord): line-aligned meanings under each line, or
   paragraph meanings when the line counts don't match.
   ========================================================================== */
import { useState } from 'react';
import { fromRecord } from '../../services/hukamnama/hukamnamaService.js';
import { formatDate } from '../../utils/format.js';

const LANGS = [['en', 'English'], ['pa', 'ਪੰਜਾਬੀ'], ['hi', 'हिंदी']];

export default function HukamnamaPreview({ record }) {
  const [lang, setLang] = useState('en');
  const h = fromRecord(record);
  const blockLang = h.blocks[lang] ? lang : null;
  return (
    <article className="sk-card" aria-label="Preview">
      <div className="sk-panel-head">
        <div>
          <p className="sk-eyebrow">Hukamnama · preview</p>
          <h3 className="sk-section-title mt-1" style={{ fontSize: '1.3rem' }}>{h.date ? formatDate(h.date, { weekday: 'long' }) : 'No date'}</h3>
          <div className="flex flex-wrap gap-1 mt-2">
            {h.ang ? <span className="sk-badge sk-badge-navy">Ang {h.ang}</span> : null}
            {h.raag ? <span className="sk-badge">{h.raag}</span> : null}
            {h.writer ? <span className="sk-badge sk-badge-muted">{h.writer}</span> : null}
          </div>
        </div>
        <div className="sk-seg" role="group" aria-label="Meaning language">
          {LANGS.map(([k, l]) => <button key={k} type="button" className="sk-seg-btn" lang={k} aria-pressed={lang === k} onClick={() => setLang(k)}>{l}</button>)}
        </div>
      </div>
      <div className="gb-text mt-5">
        {h.lines.length ? h.lines.map((l, i) => (
          <div className="gb-line" key={i}>
            <p className="gb-gurmukhi" lang="pa">{l.g}</p>
            {l.t ? <p className="gb-translit">{l.t}</p> : null}
            {l[lang] ? <p className="gb-meaning" lang={lang}>{l[lang]}</p> : null}
          </div>
        )) : <p className="sk-card-meta">Add the Gurmukhi text to see the preview.</p>}
        {h.blocks.t ? <div className="gb-line"><p className="sk-eyebrow">Transliteration</p><p className="gb-translit" style={{ whiteSpace: 'pre-line' }}>{h.blocks.t}</p></div> : null}
        {blockLang ? <div className="gb-line"><p className="sk-eyebrow">Meaning</p><p className="gb-meaning" lang={blockLang} style={{ whiteSpace: 'pre-line' }}>{h.blocks[blockLang]}</p></div> : null}
      </div>
      <div className="sk-card-meta mt-5">
        <p>Source: {h.source || <em>not set</em>}</p>
        <p>Hukamnama audio: {h.audioUrl ? <a className="panel-view-all" href={h.audioUrl} target="_blank" rel="noopener noreferrer">open</a> : 'none — the page will say “Audio unavailable”'} · Katha: {h.kathaUrl ? <a className="panel-view-all" href={h.kathaUrl} target="_blank" rel="noopener noreferrer">open</a> : 'none'}</p>
      </div>
    </article>
  );
}
