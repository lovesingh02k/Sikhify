/* ==========================================================================
   Sikhify — scripts/export-app-data.mjs
   Copies the site's Gurbani data (frontend/src/data, generated from BaniDB)
   into the Android app (app/assets/data) as JSON, so the app reads the same
   text offline. Run after regenerating the site's data: `node scripts/export-app-data.mjs`.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
const load = async (f) => (await import(pathToFileURL(path.join(root, 'frontend/src/data', f)).href)).default;
const gurbani = await load('gurbani.js');
const nitnem = await load('nitnem.js');
const text = await load('nitnem-text.js');

// BaniDB marks pauses with "~" (one also ends some lines): commas inside a line, nothing at the end.
const clean = (s) => (typeof s === 'string' ? s.replace(/\s*~\s*$/, '').replace(/~/g, ',') : s);
const line = (l) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, clean(v)]));

const out = path.join(root, 'app/assets/data');
fs.mkdirSync(out, { recursive: true });
const write = (name, data) => {
  fs.writeFileSync(path.join(out, name), JSON.stringify(data));
  console.log(name, (fs.statSync(path.join(out, name)).size / 1024).toFixed(0) + ' KB');
};
write('banis.json', {
  nitnem: nitnem.times,
  note: nitnem.note,
  banis: gurbani.banis.map(({ opening, ...b }) => b),
});
write('nitnem_text.json', Object.fromEntries(Object.entries(text).map(([id, lines]) => [id, lines.map(line)])));
write('shabads.json', gurbani.shabads.map((s) => ({ ...s, lines: s.lines.map(line) })));

// Learn: the site's lessons and the Ten Gurus (their lessons are built from data/gurus.js, as on the site).
const learnMod = await import(pathToFileURL(path.join(root, 'frontend/src/data/learn.js')).href);
const gurusMod = await import(pathToFileURL(path.join(root, 'frontend/src/data/gurus.js')).href);
write('learn.json', {
  categories: globalThis.window.SikhifyData.learnCategories,
  lessons: globalThis.window.SikhifyData.learn,
  gurus: gurusMod.default,
});

// Sikh History, Rehat Maryada and FAQ (explanatory guides), and their Punjabi and Hindi translations.
await import(pathToFileURL(path.join(root, 'frontend/src/data/history.js')).href);
await import(pathToFileURL(path.join(root, 'frontend/src/data/rehat.js')).href);
await import(pathToFileURL(path.join(root, 'frontend/src/data/faq.js')).href);
const D = globalThis.window.SikhifyData;
write('history.json', { categories: D.historyCategories, events: D.history, figures: D.historyFigures, empire: D.sikhEmpire });
write('rehat.json', D.rehat);
write('faq.json', { categories: D.faqCategories, items: D.faq });
for (const lang of ['pa', 'hi']) {
  const t = (await import(pathToFileURL(path.join(root, `frontend/src/data/i18n/${lang}.js`)).href)).default;
  write(`i18n_${lang}.json`, t);
}

// Directory sections (Personalities, Books, Blog, Downloads, …): names, descriptions and field labels.
const ct = await import(pathToFileURL(path.join(root, 'shared/contentTypes.js')).href);
write('content_types.json', Object.fromEntries(Object.entries(ct.CONTENT_TYPES).map(([k, t]) => [k, {
  label: t.label, plural: t.plural, path: t.path, group: t.group, description: t.description, ownContent: !!t.ownContent,
  fields: t.fields.map((f) => ({ name: f.name, label: f.label, kind: f.kind })),
}])));
