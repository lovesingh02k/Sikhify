/* ==========================================================================
   scripts/import-observances.js — the seed file is valid, the import is
   idempotent, and it never overrides an admin: edited records, admin-created
   records and verified dates are left exactly as they are. Nothing is ever
   published or marked verified by the import.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/database.js';
import { importObservances } from '../scripts/import-observances.js';
import { CATEGORIES, GURU_IDS } from '../../shared/festivals.js';

const seed = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../seed/observances/observances.json', import.meta.url)), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-obs-'));
const db = openDatabase(path.join(tmp, 'test.db'));
const count = (sql, ...p) => db.prepare(sql).get(...p).n;
const TODAY = '2026-10-09'; // the seed's retrieval date, so the expectations are fixed

test('the seed file: unique slugs, known categories and Gurus, every date cites a known source', () => {
  const slugs = seed.records.map((r) => r.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const r of seed.records) {
    assert.ok(CATEGORIES[r.category], r.slug);
    if (r.relatedGuru) assert.ok(GURU_IDS.includes(r.relatedGuru), r.slug);
    for (const d of r.dates) {
      assert.ok(d.sources.length && d.sources.every((k) => seed.sources[k]), `${r.slug} ${d.startDate}`);
      assert.ok(!('verification' in d), 'the seed never claims a date is verified');
    }
  }
  for (const s of Object.values(seed.sources)) assert.match(s.url, /^https:\/\//);
});

test('dry run writes nothing', () => {
  const r = importObservances(db, seed, { dryRun: true, today: TODAY });
  assert.equal(r.inserted, seed.records.length);
  assert.equal(r.invalid, 0);
  assert.equal(count('SELECT COUNT(*) n FROM observances'), 0);
  assert.equal(count('SELECT COUNT(*) n FROM observance_dates'), 0);
});

test('apply: drafts with unverified, sourced dates', () => {
  const r = importObservances(db, seed, { dryRun: false, today: TODAY });
  const dates = seed.records.reduce((n, x) => n + x.dates.length, 0);
  assert.deepEqual([r.inserted, r.datesAdded, r.invalid], [seed.records.length, dates, 0]);
  assert.equal(count("SELECT COUNT(*) n FROM observances WHERE status = 'draft'"), seed.records.length);
  assert.equal(count("SELECT COUNT(*) n FROM observance_dates WHERE verification = 'verified'"), 0);
  assert.equal(count("SELECT COUNT(*) n FROM observance_dates WHERE source_url NOT LIKE 'https://%' OR source_name = ''"), 0);
  assert.equal(r.needVerification, seed.records.length, 'every record still needs a verified date');
});

test('re-running creates no duplicates and changes nothing', () => {
  const r = importObservances(db, seed, { dryRun: false, today: TODAY });
  assert.deepEqual([r.inserted, r.updated, r.unchanged, r.datesAdded], [0, 0, seed.records.length, 0]);
  assert.equal(count('SELECT COUNT(*) n FROM observances'), seed.records.length);
});

test('admin edits, verified dates and admin-created records are never overwritten', () => {
  const nanak = db.prepare("SELECT id FROM observances WHERE slug = 'parkash-purab-guru-nanak-dev-ji'").get().id;
  // An admin edits the text and verifies (and corrects) the 2026 date.
  db.prepare("UPDATE observances SET summary = 'Edited by an admin.' WHERE id = ?").run(nanak);
  db.prepare("UPDATE observance_dates SET verification = 'verified', start_date = '2026-11-25', end_date = '2026-11-25' WHERE observance_id = ?").run(nanak);
  // An admin creates a record whose slug the file also uses.
  db.prepare("UPDATE observances SET slug = 'hola-mohalla-old' WHERE slug = 'hola-mohalla'").run();
  db.prepare("INSERT INTO observances (slug, title, summary) VALUES ('hola-mohalla', 'Hola Mohalla (admin)', 'Admin text.')").run();

  const changed = structuredClone(seed);
  changed.records.find((x) => x.slug === 'parkash-purab-guru-nanak-dev-ji').summary = 'New text from the file.';
  changed.records.find((x) => x.slug === 'bandi-chhor-divas').summary = 'Updated summary from the file.';
  const r = importObservances(db, changed, { dryRun: false, today: TODAY });

  assert.equal(db.prepare('SELECT summary FROM observances WHERE id = ?').get(nanak).summary, 'Edited by an admin.');
  const d = db.prepare('SELECT * FROM observance_dates WHERE observance_id = ?').all(nanak);
  assert.deepEqual(d.map((x) => [x.start_date, x.verification]), [['2026-11-25', 'verified']], 'no second 2026 date is added');
  assert.equal(db.prepare("SELECT summary FROM observances WHERE slug = 'hola-mohalla'").get().summary, 'Admin text.');
  assert.equal(db.prepare("SELECT summary FROM observances WHERE slug = 'bandi-chhor-divas'").get().summary, 'Updated summary from the file.', 'an untouched import is refreshed');
  assert.equal(r.updated, 1);
  assert.equal(r.kept, 2);
  assert.equal(count("SELECT COUNT(*) n FROM observances WHERE status = 'published'"), 0, 'the import never publishes');
});

test('cleanup', () => { db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
