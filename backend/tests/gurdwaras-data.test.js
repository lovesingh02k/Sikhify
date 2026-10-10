/* ==========================================================================
   Gurdwara Directory — data-flow tests (npm test): distance sorting never
   drops records, combined filters, spelling-tolerant search, honest empty
   states, production never serves dev fixtures, idempotent source imports,
   and the bundled source-backed dataset. Uses throwaway databases only;
   "Audit …" / "[DEV FIXTURE] …" rows here are test data, never production data.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/database.js';
import { createGurdwaraStore, FIXTURE_REF } from '../src/lib/gurdwaraStore.js';
import { startServer } from '../src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-gurdwara-data-'));
const db = openDatabase(path.join(tmp, 'data.db'));
const store = createGurdwaraStore(db);
const quiet = { info() {}, warn() {}, error: console.error };
const extra = [];
const openExtra = (name) => { const d = openDatabase(path.join(tmp, name)); extra.push(d); return d; };
after(() => { db.close(); extra.forEach((d) => d.close()); fs.rmSync(tmp, { recursive: true, force: true }); });

const verify = (id) => db.prepare("UPDATE gurdwaras SET verification_status = 'verified' WHERE id = ?").run(id);
const add = (name, extra = {}, verified = true) => {
  const r = store.create({ name, country: 'IN', state: 'Chhattisgarh', city: 'Raipur', ...extra }, null);
  assert.ok(!r.errors, JSON.stringify(r.errors));
  if (verified) verify(r.id);
  return r.id;
};
const names = (res) => res.items.map((x) => x.name);

before(() => {
  add('Audit Gurdwara With Coordinates', { latitude: 21.25, longitude: 81.63 });
  add('Audit Gurdwara Without Coordinates');
  add('Audit Gurudwara Spelling', { district: 'Raipur', postal_code: '492001' });
  add('Audit Unverified Gurdwara', {}, false);
  add('Audit Punjab Gurdwara', { state: 'Punjab', city: 'Amritsar', latitude: 31.62, longitude: 74.87 });
});

test('the empty state reports matching records that are hidden', () => {
  const empty = createGurdwaraStore(openExtra('empty.db'));
  const r = empty.search({ country: 'india' });
  assert.equal(r.total, 0);
  assert.deepEqual(r.alsoMatching, { needsVerification: 0, otherStatuses: 0 }, 'truly empty');
  // Published but unverified records are listed by default (cards mark them); "Verified only" leaves them out
  // and the empty state says one exists.
  assert.equal(store.search({ country: 'india', state: 'chhattisgarh', q: 'Unverified' }).total, 1, 'listed by default');
  const onlyUnverified = store.search({ country: 'india', state: 'chhattisgarh', q: 'Unverified', statuses: ['verified'] });
  assert.equal(onlyUnverified.total, 0);
  assert.equal(onlyUnverified.alsoMatching.needsVerification, 1, 'tells the UI an unverified listing exists');
});

test('distance sorting orders results but never removes records without coordinates', () => {
  const plain = store.search({ country: 'india' });
  const near = store.search({ country: 'india', sort: 'distance', lat: 21.2, lng: 81.6 });
  assert.equal(near.total, plain.total, 'same records with and without a location');
  assert.equal(near.sort, 'distance');
  assert.equal(near.items[0].name, 'Audit Gurdwara With Coordinates');
  assert.ok(near.items[0].distanceKm < 10);
  assert.equal(near.items.at(-1).distanceKm, null, 'records without coordinates come last, not dropped');
  // "?sort=distance" without a location falls back to name order (still every record).
  assert.equal(store.search({ country: 'india', sort: 'distance' }).total, plain.total);
});

test('country + state + city + status combine; clearing filters restores everything', () => {
  const all = store.search({});
  const raipur = store.search({ country: 'india', state: 'chhattisgarh', city: 'raipur', statuses: ['active'] });
  assert.equal(raipur.total, 4, 'three verified + one awaiting verification');
  assert.equal(store.search({ country: 'india', state: 'chhattisgarh', city: 'raipur', statuses: ['active', 'verified'] }).total, 3, 'verified only');
  assert.ok(names(raipur).every((n) => n !== 'Audit Punjab Gurdwara'));
  assert.equal(store.search({ country: 'india', state: 'punjab' }).total, 1);
  assert.equal(store.search({}).total, all.total);
  assert.equal(store.search({ statuses: ['active', 'needs_verification'] }).total, all.total, 'older links asking for unverified records still work');
  assert.equal(store.search({ statuses: ['verified'] }).total, all.total - 1, '"Verified only" leaves out the one unverified record');
});

test('search: case-insensitive, partial, spelling variants, district and postal code', () => {
  assert.equal(store.search({ q: 'RAIPUR' }).total, 4);
  assert.equal(store.search({ q: 'raip' }).total, 4);
  assert.equal(store.search({ q: 'chhattisgarh' }).total, 4);
  assert.equal(store.search({ q: 'india' }).total, 5);
  assert.equal(store.search({ q: 'raipur', statuses: ['verified'] }).total, 3);
  assert.equal(store.search({ q: 'punjab' }).total, 1);
  assert.equal(store.search({ q: '492001' }).total, 1);
  // "Gurudwara" finds "Gurdwara …" and vice versa.
  assert.equal(store.search({ q: 'gurudwara' }).total, 5, 'includes the imported record awaiting verification');
  assert.equal(store.search({ q: 'gurudwara', statuses: ['verified'] }).total, 4);
  assert.equal(store.search({ q: 'gurdwara spelling' }).total, 1);
  assert.equal(store.search({ q: 'Gurdwara Punjab' }).total, 1);
});

test('production never serves development fixtures', () => {
  const id = add('[DEV FIXTURE] Audit Fixture');
  db.prepare('UPDATE gurdwaras SET external_ref = ? WHERE id = ?').run(FIXTURE_REF + 'audit', id);
  const prod = createGurdwaraStore(db, { hideFixtures: true });
  assert.ok(names(store.search({ q: 'fixture' })).includes('[DEV FIXTURE] Audit Fixture'), 'visible in development');
  assert.equal(prod.search({ q: 'fixture' }).total, 0, 'hidden from production search');
  const r = db.prepare('SELECT g.slug, ci.slug AS ci, st.slug AS st FROM gurdwaras g JOIN cities ci ON ci.id = g.city_id JOIN states_regions st ON st.id = g.state_region_id WHERE g.id = ?').get(id);
  assert.equal(prod.rowByPath('india', r.st, r.ci, r.slug), undefined, 'detail page 404s in production');
  db.prepare('DELETE FROM gurdwaras_fts WHERE rowid = ?').run(id);
  db.prepare('DELETE FROM gurdwaras WHERE id = ?').run(id);
});

test('imports with external_ref are idempotent, keep every source, and never verify', () => {
  const rows = [{
    external_ref: 'wikidata:Q999000001', name: 'Audit Imported Gurdwara', country_code: 'IN', state: 'Delhi Audit State', state_code: 'IN-AU',
    city: 'Audit City', district: 'Audit District', full_address: '1 Audit Marg', latitude: 28.6, longitude: 77.2,
    sources: [{ name: 'Wikidata (Q999000001)', url: 'https://www.wikidata.org/wiki/Q999000001', type: 'open_data' }, { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Audit', type: 'open_data' }],
  }];
  const dry = store.importRows(rows, null, { dryRun: true });
  assert.equal(dry.imported, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE external_ref = 'wikidata:Q999000001'").get().n, 0, 'dry run saves nothing');
  const first = store.importRows(rows, null, { dryRun: false });
  assert.equal(first.imported, 1);
  const g = db.prepare("SELECT g.*, st.code AS state_code FROM gurdwaras g JOIN states_regions st ON st.id = g.state_region_id WHERE external_ref = 'wikidata:Q999000001'").get();
  assert.equal(g.verification_status, 'needs_verification');
  assert.equal(g.address, '1 Audit Marg');
  assert.equal(g.district, 'Audit District');
  assert.equal(g.state_code, 'IN-AU');
  assert.equal(g.phone, '', 'unknown fields stay empty');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwara_sources WHERE gurdwara_id = ?').get(g.id).n, 2);

  const again = store.importRows(rows, null, { dryRun: false });
  assert.equal(again.imported, 0);
  assert.equal(again.unchanged, 1, 'running the same import twice changes nothing');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE name = 'Audit Imported Gurdwara'").get().n, 1, 'no duplicates');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwara_sources WHERE gurdwara_id = ?').get(g.id).n, 2, 'no duplicate sources');

  verify(g.id);
  const changed = store.importRows([{ ...rows[0], postal_code: '110001' }], null, { dryRun: false });
  assert.equal(changed.updated, 1);
  const after = store.row(g.id);
  assert.equal(after.postal_code, '110001');
  assert.equal(after.verification_status, 'needs_verification', 'changed source data must be re-checked by a person');

  const inFile = store.importRows([{ name: 'Audit Twice', country: 'IN', state: 'X State', city: 'Y City' }, { name: 'Audit Twice', country: 'IN', state: 'X State', city: 'Y City' }], null, { dryRun: true });
  assert.equal(inFile.imported, 1);
  assert.equal(inFile.duplicates, 1, 'duplicates within one file are caught');
});

test('bundled dataset: every record is source-backed and imports cleanly', () => {
  const file = fileURLToPath(new URL('../seed/gurdwaras/wikidata-gurdwaras.json', import.meta.url));
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(data.records.length > 0);
  for (const r of data.records) {
    assert.match(r.external_ref, /^wikidata:Q\d+$/);
    assert.ok(r.sources.some((s) => /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(s.url)), `${r.name} has its Wikidata source`);
    for (const k of ['facilities', 'services', 'opening_hours', 'description']) assert.ok(!r[k], `${r.name}: no invented ${k}`);
  }
  const fresh = createGurdwaraStore(openExtra('dataset.db'));
  const report = fresh.importRows(data.records, null, { dryRun: true });
  assert.equal(report.invalid, 0, JSON.stringify(report.rows.filter((r) => r.result === 'invalid').slice(0, 3)));
  assert.equal(report.imported + report.duplicates, data.records.length);
});

test('API: response contract, no debug internals, empty state details', async () => {
  const srv = await startServer({ port: 0, dbPath: path.join(tmp, 'api.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet });
  try {
    const res = await (await fetch(srv.url + '/api/gurdwaras?country=india&sort=distance')).json();
    assert.deepEqual(Object.keys(res).sort(), ['alsoMatching', 'items', 'page', 'pageSize', 'pages', 'sort', 'total']);
    assert.equal(res.debug, undefined, 'SQL is never sent to the browser');
    const bad = await fetch(srv.url + '/api/gurdwaras?q=' + encodeURIComponent('"(*'));
    assert.equal(bad.status, 200, 'odd search text never breaks the query');
  } finally { srv.server.close(); srv.db.close(); }
});
