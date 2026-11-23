/* ==========================================================================
   Sikhify — utils/dailyQuiz.js
   The website's Daily Quiz: the Sikhify app's own questions in English,
   Punjabi and Hindi (data/quizBank.json, exported from the app — see
   app/test/quiz_bank_export.dart), so a quiz shared from either one lists
   the same question ids.

   Five questions a day, never the same five twice until every question has
   come up. Progress lives in this browser only (localStorage).

   Links: a quiz shared from the website is /daily-quiz?q=…&s=… and opens on
   the website. A quiz shared from the app is /quiz?q=… — Android opens that
   one in the app when it is installed (App Links cover /quiz only).
   ========================================================================== */
export const PER_DAY = 5;
export const LANGUAGES = [['en', 'English'], ['pa', 'ਪੰਜਾਬੀ'], ['hi', 'हिंदी']];
const SITE = 'https://www.sikhify.in';
const KEY = 'sikhify:quiz:';

/** Words only the website needs (the rest come from the app with the questions). */
const WEB_WORDS = {
  en: { playHere: 'Play these questions on Sikhify', answerHere: 'Answer it on Sikhify', share: 'Share', whatsapp: 'WhatsApp', copied: 'Copied — paste it to share', none: 'These questions aren’t available. Try today’s Daily Quiz instead.', loading: 'Loading the quiz…', openApp: 'Open in the Sikhify app' },
  pa: { playHere: 'ਇਹ ਸਵਾਲ ਸਿੱਖੀਫ਼ਾਈ ’ਤੇ ਖੇਡੋ', answerHere: 'ਇਸ ਦਾ ਜਵਾਬ ਸਿੱਖੀਫ਼ਾਈ ’ਤੇ ਦਿਓ', share: 'ਸਾਂਝਾ ਕਰੋ', whatsapp: 'ਵਟਸਐਪ', copied: 'ਕਾਪੀ ਹੋ ਗਿਆ — ਸਾਂਝਾ ਕਰਨ ਲਈ ਪੇਸਟ ਕਰੋ', none: 'ਇਹ ਸਵਾਲ ਉਪਲਬਧ ਨਹੀਂ ਹਨ। ਅੱਜ ਦਾ ਰੋਜ਼ਾਨਾ ਕੁਇਜ਼ ਖੇਡੋ।', loading: 'ਕੁਇਜ਼ ਖੁੱਲ੍ਹ ਰਿਹਾ ਹੈ…', openApp: 'ਸਿੱਖੀਫ਼ਾਈ ਐਪ ਵਿੱਚ ਖੋਲ੍ਹੋ' },
  hi: { playHere: 'ये सवाल सिखीफ़ाई पर खेलें', answerHere: 'इसका जवाब सिखीफ़ाई पर दें', share: 'साझा करें', whatsapp: 'व्हाट्सएप', copied: 'कॉपी हो गया — साझा करने के लिए पेस्ट करें', none: 'ये सवाल उपलब्ध नहीं हैं। आज का रोज़ाना क्विज़ खेलें।', loading: 'क्विज़ खुल रहा है…', openApp: 'सिखीफ़ाई ऐप में खोलें' },
};

const read = (k, fallback) => { try { const v = localStorage.getItem(KEY + k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* storage blocked: progress is not kept */ } };

let bankPromise = null;
/** The questions and screen words (loaded with the quiz page only). */
export function loadBank() {
  bankPromise ||= import('../data/quizBank.json', { with: { type: 'json' } }).then((m) => {
    const data = m.default || m;
    return { byId: new Map(data.questions.map((q) => [q.id, q])), ids: data.questions.map((q) => q.id), ui: data.ui };
  });
  return bankPromise;
}

/** A translator for the quiz screen in `lang` (English when a word has no translation). */
export function wordsFor(bank, lang) {
  const app = (bank && bank.ui[lang]) || {};
  const web = WEB_WORDS[lang] || WEB_WORDS.en;
  return (w) => web[w] || app[w] || w;
}

/** One question in `lang`: { id, q, o, a, d }. */
export const questionIn = (entry, lang) => ({ id: entry.id, ...(entry[lang] || entry.en) });

export function savedLanguage() {
  const own = read('lang', null);
  if (LANGUAGES.some(([l]) => l === own)) return own;
  const site = window.Sikhify && window.Sikhify.prefs ? window.Sikhify.prefs.get().lang : '';
  return LANGUAGES.some(([l]) => l === site) ? site : 'en';
}
export const saveLanguage = (lang) => write('lang', lang);

/* ---------------------------------------------------------------- the day's five */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** FNV-1a, as in the app: the same number for the same text everywhere. */
function hash(s) {
  let h = 0x811c9dc5;
  for (const c of new TextEncoder().encode(s)) h = Math.imul(h ^ c, 0x01000193) >>> 0 & 0x7fffffff;
  return h;
}
/** A small seeded random generator (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Today's five question ids: picked once, the first time the quiz is opened that day. */
export function todayIds(bank, now = new Date()) {
  const day = dayKey(now);
  const saved = read('day:' + day, null);
  if (Array.isArray(saved) && saved.length === PER_DAY && saved.every((id) => bank.byId.has(id))) return saved;
  let seen = new Set(read('seen', []));
  let fresh = bank.ids.filter((id) => !seen.has(id));
  if (fresh.length < PER_DAY) { seen = new Set(); fresh = [...bank.ids]; } // every question has come up: start again
  fresh.sort();
  const rnd = seeded(hash(day));
  for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  const ids = fresh.slice(0, PER_DAY);
  write('day:' + day, ids);
  write('seen', [...seen, ...ids]);
  return ids;
}

export function answersOn(day = dayKey()) {
  const raw = read('ans:' + day, []);
  return Array.from({ length: PER_DAY }, (_, i) => (Number.isInteger(raw[i]) ? raw[i] : null));
}
export function saveAnswer(i, option, day = dayKey()) {
  const a = answersOn(day);
  a[i] = option;
  write('ans:' + day, a);
  return a;
}

/** Days in a row the quiz was finished, up to today (or yesterday, if today's isn't done yet). */
export function streak(now = new Date()) {
  const done = (d) => answersOn(dayKey(d)).every((x) => x !== null);
  const d = new Date(now);
  if (!done(d)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (done(d) && n < 3650) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------------------------------------------------------------- sharing */
/** The website link for these questions (opens on the website, not in the app). */
export const quizLink = (ids, score) => `${SITE}/daily-quiz?${new URLSearchParams({ q: ids.join(','), ...(score !== undefined && score !== null ? { s: String(score) } : {}) })}`;

/** "Sikhify Daily Quiz — 4/5 ✅✅❌✅✅" with the questions (no answers) and the link. */
export function scoreText(t, questions, answers, score, days) {
  const marks = questions.map((q, i) => (answers[i] === q.a ? '✅' : '❌')).join('');
  const lines = [`${t('Sikhify Daily Quiz')} — ${score}/${questions.length} ${marks}`];
  if (days > 1) lines.push(`🔥 ${t('Streak')}: ${days} ${t('days')}`);
  lines.push('', t('Can you answer today’s questions?'), '');
  questions.forEach((q, i) => lines.push(`${i + 1}. ${q.q}${q.d ? ` — ${q.d}` : ''}`));
  lines.push('', `${t('playHere')}:`, quizLink(questions.map((q) => q.id), score));
  return lines.join('\n');
}

/** One question with its options, to ask someone (the answer isn't included). */
export function questionText(t, q) {
  const lines = [`${t('Can you answer this?')} 🤔`, '', q.q];
  if (q.d) lines.push(`“${q.d}”`);
  lines.push('', ...q.o.map((o, j) => `${String.fromCharCode(65 + j)}) ${o}`), '', `${t('answerHere')}:`, quizLink([q.id]));
  return lines.join('\n');
}

/** The phone's share sheet, or copies the text. */
export async function shareText(t, text) {
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); if (window.Sikhify && window.Sikhify.toast) window.Sikhify.toast(t('copied')); } catch { /* nothing to do */ }
}
export const whatsappLink = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
