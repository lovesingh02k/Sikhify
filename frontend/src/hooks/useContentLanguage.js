/* ==========================================================================
   The site-wide content language (English · Hindi · Punjabi) for React pages.
   It is the same reading preference the legacy pages use (S.prefs.lang,
   stored as sikhify:readingPrefs), loads the same translation packs
   (data/i18n/{hi,pa}.js) and overlays translated fields on the English data —
   anything untranslated stays English.
   ========================================================================== */
import { useEffect, useState } from 'react';

const PACKS = { hi: () => import('../data/i18n/hi.js'), pa: () => import('../data/i18n/pa.js') };
const cache = {};

function readLang() {
  try {
    const p = window.Sikhify && window.Sikhify.prefs ? window.Sikhify.prefs.get() : JSON.parse(localStorage.getItem('sikhify:readingPrefs') || '{}');
    return p.lang === 'hi' || p.lang === 'pa' ? p.lang : 'en';
  } catch {
    return 'en';
  }
}

export function setContentLanguage(lang) {
  if (window.Sikhify && window.Sikhify.prefs) { window.Sikhify.prefs.set({ lang }); return; }
  try {
    const p = JSON.parse(localStorage.getItem('sikhify:readingPrefs') || '{}');
    localStorage.setItem('sikhify:readingPrefs', JSON.stringify({ ...p, lang }));
  } catch { /* storage unavailable */ }
  document.dispatchEvent(new CustomEvent('sikhify:prefs'));
}

function overlay(base, tr) {
  if (tr === undefined || tr === null || tr === '') return base;
  if (Array.isArray(base)) return base.map((b, i) => overlay(b, tr[i]));
  if (base && typeof base === 'object') {
    const out = { ...base };
    Object.keys(tr).forEach((k) => { out[k] = overlay(base[k], tr[k]); });
    return out;
  }
  return typeof tr === 'string' || typeof tr === 'number' ? tr : base;
}

export function useContentLanguage() {
  const [lang, setLang] = useState(readLang);
  const [pack, setPack] = useState(() => cache[readLang()] || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onPrefs = () => setLang(readLang());
    document.addEventListener('sikhify:prefs', onPrefs);
    return () => document.removeEventListener('sikhify:prefs', onPrefs);
  }, []);

  useEffect(() => {
    if (lang === 'en') { setPack(null); return undefined; }
    if (cache[lang]) { setPack(cache[lang]); return undefined; }
    let live = true;
    PACKS[lang]().then((m) => { cache[lang] = m.default; if (live) { setPack(m.default); setFailed(false); } })
      .catch(() => { if (live) { setFailed(true); setPack(null); } });
    return () => { live = false; };
  }, [lang]);

  const active = lang !== 'en' && pack ? lang : 'en';
  return {
    lang: active,
    requested: lang,
    failed,
    /** pack[kind][id] overlaid on the English item. */
    localize(kind, item, id) {
      if (active === 'en' || !pack || !pack[kind] || !item) return item;
      return overlay(item, pack[kind][id !== undefined ? id : item.id]);
    },
    t(key, english) { return (active !== 'en' && pack && pack.text && pack.text[key]) || english; },
    langAttr: active === 'en' ? undefined : active,
  };
}

/** The "Read in English | हिन्दी | ਪੰਜਾਬੀ" control (same markup and styles as the legacy pages). */
export const CONTENT_LANGS = [
  { code: 'en', native: 'English', name: 'English' },
  { code: 'hi', native: 'हिन्दी', name: 'Hindi' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', name: 'Punjabi' },
];
