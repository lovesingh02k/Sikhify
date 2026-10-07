/* Regression guard for the "ERROR 500" on directory detail pages
   (/personalities/banda-singh-bahadur and every other entry):
   motion/pageMotion.js splits `.page-hero-title` into lines with GSAP SplitText,
   which moves the heading's children into wrapper elements. If React later changes
   that heading's content in place (loading → record), React's removeChild fails and
   the error boundary shows the 500 screen. A heading whose content is dynamic must
   therefore carry a `key`, so React replaces the whole <h1> instead of patching it.
   Reads the JSX as text, so it needs no JSX toolchain. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const jsxFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? jsxFiles(p) : d.name.endsWith('.jsx') ? [p] : [];
});

test('split hero titles with dynamic content are keyed', () => {
  const offenders = [];
  let checked = 0;
  for (const file of jsxFiles(src)) {
    const text = fs.readFileSync(file, 'utf8');
    // JSX headings only (pages written as HTML strings use class=, and are never patched by React).
    for (const m of text.matchAll(/<h1\b([^>]*className="page-hero-title[^"]*"[^>]*)>([\s\S]*?)<\/h1>/g)) {
      const [, attrs, children] = m;
      if (!children.includes('{')) continue; // static text never changes
      checked++;
      if (!/\bkey=\{/.test(attrs)) offenders.push(`${path.relative(src, file)}: <h1${attrs}>`);
    }
  }
  assert.ok(checked >= 4, 'found the dynamic hero titles');
  assert.deepEqual(offenders, [], 'add key={…} that changes whenever the title content changes');
});

test('the entry detail title changes key when the record loads', () => {
  const text = fs.readFileSync(path.join(src, 'pages/Directory/EntryDetail.jsx'), 'utf8');
  assert.match(text, /<h1 key=\{e \? 'entry' : state\.error \? 'error' : 'loading'\} className="page-hero-title"/);
});
