import Icon from '../ui/Icon.jsx';
import { CONTENT_LANGS, setContentLanguage } from '../../hooks/useContentLanguage.js';

/** Same control and styling as S.i18n.switcher() on the legacy pages. */
export default function LanguageSwitch({ lang, compact = false }) {
  return (
    <div className={`sk-lang${compact ? ' sk-lang-compact' : ''}`} role="group" aria-label="Content language">
      <span className="sk-lang-label"><Icon name="globe" size={16} /><span>Read in</span></span>
      <div className="sk-seg">
        {CONTENT_LANGS.map((x) => (
          <button key={x.code} type="button" className="sk-seg-btn" lang={x.code} aria-pressed={lang === x.code}
            aria-label={x.code !== 'en' ? `${x.name} (${x.native})` : undefined} onClick={() => setContentLanguage(x.code)}>
            {x.native}
          </button>
        ))}
      </div>
      {lang !== 'en' ? <p className="sk-lang-note">Hindi and Punjabi versions are translations of Sikhify&apos;s English text.</p> : null}
    </div>
  );
}
