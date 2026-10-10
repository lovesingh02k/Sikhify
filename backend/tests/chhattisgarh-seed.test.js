/* ==========================================================================
   Chhattisgarh Gurdwara seed (seed/gurdwaras/chhattisgarh-gurdwaras.json) and
   multilingual directory search — tests on a throwaway database.
   ========================================================================== */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/database.js';
import { createGurdwaraStore, ftsQuery } from '../src/lib/gurdwaraStore.js';

const file = fileURLToPath(new URL('../seed/gurdwaras/chhattisgarh-gurdwaras.json', import.meta.url));
const seed = JSON.parse(fs.readFileSync(file, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-cg-'));
const db = openDatabase(path.join(tmp, 'cg.db'));
const store = createGurdwaraStore(db);
after(() => { db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('seed: every record is in Chhattisgarh, cites a source with a link, and has a unique reference', () => {
  assert.equal(seed.districts.length, 33, 'all 33 districts researched');
  assert.ok(seed.records.length > 0);
  const refs = new Set();
  for (const r of seed.records) {
    assert.equal(r.state, 'Chhattisgarh', r.name);
    assert.equal(r.state_code, 'IN-CG');
    assert.ok(!r.district || seed.districts.includes(r.district), `${r.name}: district "${r.district}" is one of the 33`);
    assert.ok(r.sources.length && r.sources.every((s) => /^https:\/\//.test(s.url)), `${r.name}: cited source`);
    assert.ok(!refs.has(r.external_ref), 'unique external_ref ' + r.external_ref);
    refs.add(r.external_ref);
    assert.ok(!('verification_status' in r) && !r.verified, 'never pre-verified');
    if (r.latitude !== undefined) assert.ok(r.latitude > 17.7 && r.latitude < 24.2 && r.longitude > 80.2 && r.longitude < 84.5, `${r.name}: inside the state's bounding box`);
    if (r.postal_code) assert.match(r.postal_code, /^49\d{4}$/, 'Chhattisgarh PIN codes start with 49');
  }
  assert.ok(seed.excluded.every((x) => x.why), 'every excluded candidate says why');
});

test('import: dry run, apply, re-run changes nothing; all records need verification', () => {
  const dry = store.importRows(seed.records, null, { dryRun: true });
  assert.equal(dry.imported, seed.records.length);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n, 0, 'dry run saves nothing');
  const real = store.importRows(seed.records, null, { dryRun: false });
  assert.equal(real.imported, seed.records.length);
  assert.equal(real.invalid + real.duplicates, 0);
  const again = store.importRows(seed.records, null, { dryRun: false });
  assert.equal(again.imported, 0);
  assert.equal(again.unchanged, seed.records.length, 'idempotent');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE verification_status = 'verified'").get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwaras g WHERE NOT EXISTS (SELECT 1 FROM gurdwara_sources s WHERE s.gurdwara_id = g.id)').get().n, 0, 'every record keeps its source');
});

test('public directory: listed (needs verification), paged, findable by name, town, district and in Hindi/Punjabi', () => {
  const all = store.search({ country: 'india', state: 'chhattisgarh', pageSize: 50 });
  assert.equal(all.total, seed.records.length);
  assert.ok(all.items.every((g) => g.verification === 'needs_verification'));
  const pages = store.search({ country: 'india', state: 'chhattisgarh', pageSize: 10 });
  assert.equal(pages.pages, Math.ceil(seed.records.length / 10));
  const seen = new Set();
  for (let p = 1; p <= pages.pages; p++) store.search({ country: 'india', state: 'chhattisgarh', pageSize: 10, page: p }).items.forEach((g) => seen.add(g.id));
  assert.equal(seen.size, seed.records.length, 'paging reaches every record');
  assert.equal(store.search({ q: 'Bhilai' }).total, 1);
  assert.equal(store.search({ q: 'Sirgitti' }).total, 1);
  assert.ok(store.search({ q: 'Korba' }).total >= 1, 'district');
  assert.equal(store.search({ q: 'गुरुद्वारा' }).total, seed.records.length, 'Hindi');
  assert.equal(store.search({ q: 'ਗੁਰਦੁਆਰਾ' }).total, seed.records.length, 'Punjabi');
  assert.equal(store.search({ q: 'गुरुद्वारा दुर्ग' }).total, store.search({ q: 'gurudwara durg' }).total, 'Hindi town names');
  assert.equal(store.search({ statuses: ['verified'], country: 'india', state: 'chhattisgarh' }).total, 0, '"Verified only" shows none yet');
});

test('search terms keep Devanagari / Gurmukhi words whole', () => {
  assert.match(ftsQuery('गुरुद्वारा'), /"gurdwara"\*/);
  assert.match(ftsQuery('ਗੁਰਦੁਆਰਾ ਸਾਹਿਬ'), /"sahib"\*/);
});
