/* Route integrity: every internal link in the navigation, footer, sitemap and
   Coming Soon pages leads to a route defined in src/app/App.jsx, and nothing
   that has a real page is still listed as Coming Soon. Reads App.jsx as text,
   so it needs no JSX toolchain. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMING_SOON } from '../src/data/comingSoon.js';
import { SITE_SECTIONS } from '../src/data/siteMap.js';
import { CONTENT_TYPES } from '../../shared/contentTypes.js';

const read = (rel) => fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const app = read('../src/app/App.jsx');

// Routes from <Route path="…">, the LEGACY_PAGES table, redirects, content types and Coming Soon pages.
const explicit = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);
const legacy = [...app.matchAll(/\['(\/[^']*)', [A-Z]\w+\]/g)].map((m) => m[1]);
const redirects = [...app.matchAll(/\['(\/[^']*)', '\/[^']*'\]/g)].map((m) => m[1]);
const typePaths = Object.values(CONTENT_TYPES).flatMap((t) => ['/' + t.path, `/${t.path}/:slug`]);
const soon = COMING_SOON.map((p) => p.path);
const patterns = [...new Set([...explicit, ...legacy, ...redirects, ...typePaths, ...soon])]
  .filter((p) => p !== '*')
  .map((p) => new RegExp('^' + p.replace(/:[^/]+/g, '[^/]+') + '/?$'));
const resolves = (href) => {
  const path = href.split(/[?#]/)[0] || '/';
  return patterns.some((re) => re.test(path));
};
const internal = (hrefs) => hrefs.filter((h) => h.startsWith('/') && !h.startsWith('//') && !/^\/(api|uploads)\//.test(h));

test('App.jsx route table was parsed', () => {
  assert.ok(explicit.length > 40, `found ${explicit.length} <Route> paths`);
  assert.ok(legacy.includes('/') && legacy.includes('/nitnem'), 'legacy pages found');
});

test('every sitemap link resolves to a route', () => {
  const bad = SITE_SECTIONS.flatMap((s) => s.links.map((l) => l.href)).filter((h) => !resolves(h));
  assert.deepEqual(bad, []);
});

test('every Coming Soon page has copy, and its related links resolve', () => {
  for (const page of COMING_SOON) {
    assert.ok(page.title && page.description, page.path);
    assert.deepEqual(page.related.filter((h) => !resolves(h)), [], page.path);
  }
});

test('nothing with a real page is still listed as Coming Soon', () => {
  const built = new Set([...explicit, ...legacy, ...typePaths]);
  assert.deepEqual(soon.filter((p) => built.has(p)), []);
});

test('header, footer and home links all resolve', () => {
  for (const file of ['../src/components/layout/Header.jsx', '../src/components/layout/Footer.jsx', '../src/pages/Home.jsx']) {
    const src = read(file);
    const hrefs = internal([...src.matchAll(/href=(?:\{?["'`]|\\")(\/[^"'`\\\s>]*)/g)].map((m) => m[1]));
    assert.ok(hrefs.length > 3, `${file}: found ${hrefs.length} links`);
    assert.deepEqual([...new Set(hrefs.filter((h) => !resolves(h)))], [], file);
  }
});
