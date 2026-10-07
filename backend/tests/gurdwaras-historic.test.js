/* The curated historic Gurdwaras of India (seed/gurdwaras/india-historic-gurdwaras.json):
   every row is sourced and valid, the Panj Takht are all present once, the import updates the
   Wikidata records instead of duplicating them, photos are Commons-only with credits, and
   nothing is verified unless a named admin does it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/database.js';
import { createGurdwaraStore } from '../src/lib/gurdwaraStore.js';
import { validateGurdwara, DESIGNATION_KEYS } from '../../shared/gurdwaras.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(here, '../seed/gurdwaras', f), 'utf8'));
const curated = read('india-historic-gurdwaras.json');
const wikidata = read('wikidata-gurdwaras.json');

test('curated file: valid, sourced, five Takhts, Commons photos with credits, no duplicates', () => {
  const rows = curated.records;
  assert.ok(rows.length >= 25);
  assert.equal(rows.filter((r) => r.designation === 'takht').length, 5);
  assert.equal(new Set(rows.map((r) => r.external_ref)).size, rows.length, 'one row per Gurdwara');
  for (const r of rows) {
    assert.deepEqual(validateGurdwara(r).errors, {}, r.name);
    assert.ok(DESIGNATION_KEYS.includes(r.designation), r.name);
    assert.ok(r.sources.length && r.sources.every((s) => /^https:\/\//.test(s.url)), `${r.name} cites https sources`);
    assert.ok(r.description.length > 40, `${r.name} has a description`);
    assert.equal(r.phone, undefined, 'no phone numbers are guessed');
    for (const img of r.images || []) {
      assert.match(img.url, /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//);
      assert.ok(img.credit && img.license && img.alt, `${r.name} photo is credited`);
      assert.match(img.source_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  }
});

test('import after the Wikidata dataset updates those records, adds photos, never verifies by itself', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-historic-'));
  const db = openDatabase(path.join(tmp, 'data.db'));
  const store = createGurdwaraStore(db);
  store.importRows(wikidata.records, null, { dryRun: false });
  const before = db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n;
  const report = store.importRows(curated.records, null, { dryRun: false });
  assert.equal(report.invalid, 0);
  assert.equal(report.duplicates, 0);
  const matched = curated.records.filter((r) => wikidata.records.some((w) => w.external_ref === r.external_ref)).length;
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n, before + curated.records.length - matched, 'Wikidata records are updated, not duplicated');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE verification_status = 'verified'").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE designation = 'takht'").get().n, 5);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwara_images').get().n, curated.records.filter((r) => r.images).length);

  // A wrong coordinate copied between records is cleared; a misplaced record moves to the right state.
  const handi = db.prepare("SELECT g.latitude, st.name AS state FROM gurdwaras g JOIN states_regions st ON st.id = g.state_region_id WHERE external_ref = 'wikidata:Q5619961'").get();
  assert.equal(handi.latitude, null);
  assert.equal(handi.state, 'Bihar');

  // Takht filter (any verification status) and verification by a named admin.
  const takht = store.search({ designation: 'takht', statuses: ['active', 'needs_verification'] });
  assert.equal(takht.total, 5);
  assert.ok(takht.items.every((g) => g.designation === 'takht' && g.summary));
  db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('a@x.test', 'a', 'A', 'x', 'admin')").run();
  const admin = db.prepare('SELECT id FROM users').get();
  const ids = takht.items.map((g) => g.id);
  assert.equal(store.verify(ids, admin, 'checked').verified.length, 5);
  assert.equal(store.search({ designation: 'takht' }).total, 5, 'verified Takhts are public by default');

  // Re-running changes nothing.
  const again = store.importRows(curated.records, null, { dryRun: false });
  assert.equal(again.unchanged, curated.records.length);
  db.close();
});
