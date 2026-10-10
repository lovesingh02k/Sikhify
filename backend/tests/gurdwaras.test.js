/* ==========================================================================
   Global Gurdwara Directory — API tests (npm test).
   Runs the real server against a throwaway database. Records created here are
   TEST FIXTURES ("Test Fixture Gurdwara …", "Testland") that exist only in the
   temporary database and are deleted afterwards — never production data.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';
import { createGurdwaraStore } from '../src/lib/gurdwaraStore.js';
import { MIGRATIONS } from '../src/db/database.js';
import { registerFunctions } from '../src/db/gurdwaraSchema.js';

let srv;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-gurdwara-test-'));
const quiet = { info() {}, warn() {}, error: console.error };

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet });
  base = srv.url;
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('admin@test.local', 'admin', 'Admin Singh', ?, 'admin')").run(await hashPassword('admin-password-1'));
});
after(() => { srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  async function call(method, url, body) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-Sikhify-Request': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const s of res.headers.getSetCookie()) { const [pair] = s.split(';'); cookie = /=$/.test(pair) ? '' : pair; }
    return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
  }
  return { get: (u) => call('GET', u), post: (u, b = {}) => call('POST', u, b), patch: (u, b = {}) => call('PATCH', u, b), del: (u) => call('DELETE', u) };
}
const guest = client();
const admin = client();
const member = client();
const ms = async (fn) => { const t = performance.now(); const r = await fn(); return { r, ms: performance.now() - t }; };

test('setup: sign in', async () => {
  assert.equal((await admin.post('/api/auth/login', { identifier: 'admin', password: 'admin-password-1' })).status, 200);
  assert.equal((await member.post('/api/auth/signup', { name: 'Member Kaur', username: 'memberk', email: 'm@test.local', password: 'member-password' })).status, 200);
});

test('0 records: empty directory, real country list, meta', async () => {
  const r = await guest.get('/api/gurdwaras');
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 0);
  assert.deepEqual(r.data.items, []);
  const meta = await guest.get('/api/gurdwaras/meta');
  assert.deepEqual(meta.data.quickCountries.map((c) => c.code), ['IN', 'CA', 'GB', 'US', 'AU', 'MY']);
  assert.ok(meta.data.quickCountries.every((c) => c.count === 0));
  const countries = await guest.get('/api/gurdwaras/countries');
  assert.ok(countries.data.items.length >= 240, 'ISO country list from the database');
  assert.deepEqual((await guest.get('/api/gurdwaras/locations')).data.countries, []);
});

let raipurId;
test('admin creates a record; it is listed as "needs verification" until verified (needs a source)', async () => {
  assert.equal((await member.post('/api/admin/gurdwaras', { name: 'x' })).status, 403);
  const bad = await admin.post('/api/admin/gurdwaras', { name: 'G', website: 'nope' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.error.fields.country && bad.data.error.fields.city && bad.data.error.fields.website);
  const ok = await admin.post('/api/admin/gurdwaras', {
    name: 'Test Fixture Gurdwara Singh Sabha', country: 'IN', state: 'Testland Pradesh', city: 'Testpur', address: '1 Test Road', postal_code: '492001',
    latitude: 21.2514, longitude: 81.6296, phone: '+91 00000 00001', website: 'https://gss.example', facilities: ['langar', 'parking'], services: ['kirtan'],
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  raipurId = ok.data.gurdwara.id;
  assert.equal(ok.data.gurdwara.verification, 'needs_verification');
  assert.equal(ok.data.gurdwara.url, '/directory/gurdwaras/india/testland-pradesh/testpur/test-fixture-gurdwara-singh-sabha');
  const listed = await guest.get('/api/gurdwaras');
  assert.equal(listed.data.total, 1, 'a published record is listed before verification…');
  assert.equal(listed.data.items[0].verification, 'needs_verification', '…and says it still needs verification');
  assert.equal((await guest.get('/api/gurdwaras?status=verified')).data.total, 0, '"Verified only" leaves it out');
  const noSource = await admin.post(`/api/admin/gurdwaras/${raipurId}/verify`, { verified: true });
  assert.equal(noSource.status, 422);
  await admin.post(`/api/admin/gurdwaras/${raipurId}/sources`, { name: 'Official website', url: 'https://example.org/gss', type: 'official_website' });
  const ver = await admin.post(`/api/admin/gurdwaras/${raipurId}/verify`, { verified: true, note: 'Checked the official site' });
  assert.equal(ver.data.gurdwara.verification, 'verified');
  assert.ok(ver.data.gurdwara.verifiedAt);
  assert.equal(ver.data.gurdwara.verificationLog[0].action, 'verified');
  assert.equal((await guest.get('/api/gurdwaras')).data.total, 1);
  assert.equal((await guest.get('/api/gurdwaras?status=verified')).data.total, 1, 'verified now');
});

test('1 record: search (name, partial, city, state, country, postal code, address), detail by path', async () => {
  for (const q of ['Singh Sabha', 'sing', 'Testpur', 'Testland', 'India', '492001', 'Test Road']) {
    const r = await guest.get('/api/gurdwaras?q=' + encodeURIComponent(q));
    assert.equal(r.data.total, 1, `search "${q}"`);
  }
  assert.equal((await guest.get('/api/gurdwaras?q=nowhere-at-all')).data.total, 0);
  const card = (await guest.get('/api/gurdwaras')).data.items[0];
  assert.deepEqual(card.facilities.sort(), ['langar', 'parking']);
  assert.equal(card.distanceKm, null, 'no distance without the visitor’s location');
  const d = await guest.get('/api/gurdwaras/by-path/india/testland-pradesh/testpur/test-fixture-gurdwara-singh-sabha');
  assert.equal(d.status, 200);
  assert.equal(d.data.gurdwara.sources[0].type, 'official_website');
  assert.equal(d.data.gurdwara.history, undefined, 'audit history is staff-only');
  assert.equal((await guest.get('/api/gurdwaras/by-path/india/x/y/z')).status, 404);
  const loc = await guest.get('/api/gurdwaras/locations?country=india&state=testland-pradesh');
  assert.equal(loc.data.countries[0].slug, 'india');
  assert.equal(loc.data.states[0].slug, 'testland-pradesh');
  assert.equal(loc.data.cities[0].count, 1);
});

test('duplicate detection: same name in the same city, same phone, same website, nearby coordinates', async () => {
  const dupName = await admin.post('/api/admin/gurdwaras', { name: 'Gurdwara Test Fixture Singh Sabha Sahib', country: 'India', state: 'Testland Pradesh', city: 'Testpur' });
  assert.equal(dupName.status, 409);
  assert.equal(dupName.data.error.code, 'possible_duplicates');
  assert.equal(dupName.data.error.fields.duplicates[0].id, raipurId);
  for (const extra of [{ phone: '00000 00001' }, { website: 'https://www.gss.example/about' }, { latitude: 21.2515, longitude: 81.6297 }]) {
    const r = await admin.get('/api/admin/gurdwaras/check-duplicates?' + new URLSearchParams({ name: 'Completely Different Name', country: 'CA', city: 'Elsewhere', ...extra }));
    assert.equal(r.data.items[0] && r.data.items[0].id, raipurId, JSON.stringify(extra));
  }
  const forced = await admin.post('/api/admin/gurdwaras', { name: 'Gurdwara Test Fixture Singh Sabha Sahib', country: 'India', state: 'Testland Pradesh', city: 'Testpur', force: true });
  assert.equal(forced.status, 200);
  const pairs = await admin.get('/api/admin/gurdwaras/duplicates');
  assert.equal(pairs.data.items.length, 1);
  assert.equal((await admin.get('/api/admin/gurdwaras/stats')).data.possibleDuplicates, 1);
  await admin.post(`/api/admin/gurdwaras/${forced.data.gurdwara.id}/archive`, { archived: true });
  assert.equal((await admin.get('/api/admin/gurdwaras/stats')).data.possibleDuplicates, 0, 'archived records are not counted');
  assert.equal((await guest.get(forced.data.gurdwara.url.replace('/directory/gurdwaras/', '/api/gurdwaras/by-path/'))).status, 404, 'archived is never public');
});

test('community submission: pending → changes requested → resubmit → approved (merge or create) → notified', async () => {
  // Visitors may suggest a Gurdwara without an account — the form is validated the same way.
  const guestBad = await guest.post('/api/gurdwaras/submissions', { name: 'X' });
  assert.equal(guestBad.status, 422);
  assert.ok(guestBad.data.error.fields.country);
  const bad = await member.post('/api/gurdwaras/submissions', { name: 'Gu' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.error.fields.country && bad.data.error.fields.source);
  const sub = await member.post('/api/gurdwaras/submissions', { name: 'Test Fixture Gurdwara Nanaksar', country: 'Canada', state: 'Testario', city: 'Testton', address: '9 Fixture St', source: 'https://example.org/nanaksar' });
  assert.equal(sub.status, 200);
  assert.equal(sub.data.status, 'pending');
  assert.equal((await guest.get('/api/gurdwaras?q=Nanaksar&status=active,needs_verification')).data.total, 0, 'never public before review');
  const list = await admin.get('/api/admin/gurdwara-submissions?status=pending');
  const item = list.data.items.find((s) => s.id === sub.data.id);
  assert.ok(item);
  assert.equal((await member.post(`/api/admin/gurdwara-submissions/${item.id}/review`, { decision: 'approve' })).status, 403);
  assert.equal((await admin.post(`/api/admin/gurdwara-submissions/${item.id}/review`, { decision: 'request_changes' })).status, 422, 'a note is required');
  await admin.post(`/api/admin/gurdwara-submissions/${item.id}/review`, { decision: 'request_changes', note: 'Please add the postal address' });
  const mine = await member.get('/api/me/gurdwara-submissions');
  assert.equal(mine.data.items[0].status, 'changes_requested');
  assert.equal(mine.data.items[0].reviewNote, 'Please add the postal address');
  const resub = await member.patch(`/api/gurdwaras/submissions/${item.id}`, { address: '9 Fixture Street, Testton T1T 1T1' });
  assert.equal(resub.data.submission.status, 'pending');
  const approveNoSource = await admin.post(`/api/admin/gurdwara-submissions/${item.id}/review`, { decision: 'approve', verify: true });
  assert.equal(approveNoSource.status, 422, 'verifying needs a reviewer-checked source');
  const approved = await admin.post(`/api/admin/gurdwara-submissions/${item.id}/review`, {
    decision: 'approve', verify: true, record: { facilities: ['langar'], latitude: 43.7, longitude: -79.7 },
    source: { name: 'Gurdwara committee website', url: 'https://example.org/nanaksar', type: 'official_website' },
  });
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  assert.equal(approved.data.submission.status, 'approved');
  const pub = await guest.get('/api/gurdwaras?q=Nanaksar');
  assert.equal(pub.data.total, 1);
  assert.deepEqual(pub.data.items[0].facilities, ['langar']);
  const detail = await guest.get(pub.data.items[0].url.replace('/directory/gurdwaras/', '/api/gurdwaras/by-path/'));
  assert.deepEqual(detail.data.gurdwara.sources.map((s) => s.type).sort(), ['community', 'official_website']);
  assert.ok((await member.get('/api/notifications')).data.items.some((n) => n.type === 'submission_reviewed' && /approved/.test(n.message)));

  // A second suggestion of the same place is caught as a duplicate and merged into the existing record.
  const again = await member.post('/api/gurdwaras/submissions', { name: 'Gurdwara Nanaksar Test Fixture', country: 'Canada', state: 'Testario', city: 'Testton', source: 'Saw it myself', phone: '' });
  assert.ok(again.data.possibleExisting.length >= 1, 'the submitter is shown the existing listing');
  const blocked = await admin.post(`/api/admin/gurdwara-submissions/${again.data.id}/review`, { decision: 'approve' });
  assert.equal(blocked.status, 409);
  const merged = await admin.post(`/api/admin/gurdwara-submissions/${again.data.id}/review`, { decision: 'approve', mergeIntoId: pub.data.items[0].id });
  assert.equal(merged.data.submission.resultGurdwaraId, pub.data.items[0].id);
  assert.equal((await guest.get('/api/gurdwaras?q=Nanaksar')).data.total, 1, 'no duplicate created');
});

test('filters: status, facilities (all must match), services; sorting; distance; pagination 20/50', async () => {
  const store = createGurdwaraStore(srv.db);
  // 120 TEST FIXTURE records in one test-only city, half verified.
  for (let i = 1; i <= 120; i++) {
    const res = store.create({
      name: `Test Fixture Gurdwara ${String(i).padStart(3, '0')}`, country: 'United Kingdom', state: 'Testshire', city: 'Fixtureford',
      latitude: 51.5 + i * 0.01, longitude: -0.1, facilities: i % 2 ? ['langar', 'wheelchair_access'] : ['langar'], services: i % 3 ? ['kirtan'] : ['kirtan', 'katha'],
      status: i % 10 === 0 ? 'temporarily_closed' : 'active',
    }, null);
    if (i % 2 === 0) srv.db.prepare("UPDATE gurdwaras SET verification_status = 'verified' WHERE id = ?").run(res.id);
  }
  const city = '/api/gurdwaras?country=united-kingdom&state=testshire&city=fixtureford';
  const def = await guest.get(city);
  assert.equal(def.data.total, 108, 'default: every active listing, verified or not (120 − 12 temporarily closed)');
  assert.equal(def.data.items.length, 20);
  assert.equal(def.data.pages, 6);
  assert.equal((await guest.get(city + '&pageSize=50')).data.items.length, 50);
  assert.equal((await guest.get(city + '&pageSize=50&page=3')).data.items.length, 8, 'the last page holds the rest');
  // Walking every page reaches every record exactly once.
  const seen = new Set();
  for (let page = 1; page <= 6; page++) (await guest.get(city + '&page=' + page)).data.items.forEach((x) => seen.add(x.id));
  assert.equal(seen.size, 108);
  assert.equal((await guest.get(city + '&status=verified')).data.total, 48, 'verified only: 60 verified − 12 temporarily closed');
  assert.equal((await guest.get(city + '&pageSize=1000')).data.items.length, 20, 'unsupported sizes fall back to 20');
  assert.equal((await guest.get(city + '&status=active,temporarily_closed')).data.total, 120);
  assert.equal((await guest.get(city + '&status=active,temporarily_closed,verified')).data.total, 60);
  assert.equal((await guest.get(city + '&status=temporarily_closed,needs_verification')).data.total, 12);
  assert.equal((await guest.get(city + '&status=active,temporarily_closed,needs_verification&facilities=langar,wheelchair_access')).data.total, 60, 'facilities: every selected one must match');
  assert.equal((await guest.get(city + '&status=active,temporarily_closed,needs_verification&services=katha')).data.total, 40);
  const names = (await guest.get(city + '&sort=name')).data.items.map((x) => x.name);
  assert.deepEqual(names, [...names].sort());
  const near = await guest.get(city + '&sort=distance&lat=51.5&lng=-0.1');
  assert.equal(near.data.sort, 'distance');
  const dists = near.data.items.map((x) => x.distanceKm);
  assert.deepEqual(dists, [...dists].sort((a, b) => a - b));
  assert.ok(dists[0] > 0 && dists[0] < 3);
  assert.equal(near.headers.get('cache-control'), 'no-store', 'location-based answers are never cached');
  assert.equal((await guest.get(city + '&sort=distance')).data.sort, 'name', '"closest" needs a location');
  const radius = await guest.get(city + '&sort=distance&lat=51.5&lng=-0.1&radius=10');
  assert.ok(radius.data.items.every((x) => x.distanceKm <= 10));
});

test('bulk import: dry run report, then import (never auto-verified)', async () => {
  const csv = [
    'name,country,state,city,address,latitude,longitude,phone,website,facilities,services,source_name,source_url',
    'Test Fixture Import Gurdwara One,Australia,Test Wales,Testney,1 Import Rd,-33.8,151.2,,https://import-one.example,langar;parking,kirtan,Import list,https://example.org/list',
    '"Test Fixture Import Gurdwara, Two",Australia,Test Wales,Testney,"2 ""Quoted"" Rd",,,,,,,,',
    'Gurdwara Test Fixture Singh Sabha,India,Testland Pradesh,Testpur,,,,,,,,,',
    'X,,,,,,,,not-a-url,,,,',
  ].join('\n');
  const dry = await admin.post('/api/admin/gurdwaras/import', { format: 'csv', content: csv, dryRun: true });
  assert.equal(dry.status, 200, JSON.stringify(dry.data));
  assert.deepEqual([dry.data.report.imported, dry.data.report.duplicates, dry.data.report.invalid], [2, 1, 1]);
  assert.equal((await guest.get('/api/gurdwaras?q=Import&status=active,needs_verification')).data.total, 0, 'dry run writes nothing');
  const real = await admin.post('/api/admin/gurdwaras/import', { format: 'csv', content: csv, dryRun: false });
  assert.equal(real.data.report.imported, 2);
  assert.equal(real.data.report.needsVerification, 2);
  assert.equal((await guest.get('/api/gurdwaras?q=Import&status=verified')).data.total, 0, 'imported records are not verified');
  assert.ok((await guest.get('/api/gurdwaras?q=Import')).data.items.every((x) => x.verification === 'needs_verification'), 'listed, marked as needing verification');
  const two = await guest.get('/api/gurdwaras?q=Two&status=active,needs_verification');
  assert.equal(two.data.items[0].name, 'Test Fixture Import Gurdwara, Two');
  assert.equal(two.data.items[0].address, '2 "Quoted" Rd');
  const json = await admin.post('/api/admin/gurdwaras/import', { format: 'json', content: JSON.stringify([{ id: String(raipurId), phone: '+91 00000 00009' }]), dryRun: false });
  assert.equal(json.data.report.updated, 1);
  assert.equal((await admin.get(`/api/admin/gurdwaras/${raipurId}`)).data.gurdwara.phone, '+91 00000 00009');
  assert.equal((await member.post('/api/admin/gurdwaras/import', { format: 'csv', content: csv })).status, 403);
});

test('admin: edit with audit history, status change, archive/restore, stats', async () => {
  const e = await admin.patch(`/api/admin/gurdwaras/${raipurId}`, { opening_hours: 'Daily 4:00–21:00', services: ['kirtan', 'katha'] });
  assert.equal(e.data.gurdwara.openingHours, 'Daily 4:00–21:00');
  const h = e.data.gurdwara.history[0];
  assert.ok(h.changes.opening_hours && h.changes.services);
  const s = await admin.post(`/api/admin/gurdwaras/${raipurId}/status`, { status: 'temporarily_closed' });
  assert.equal(s.data.gurdwara.status, 'temporarily_closed');
  assert.equal((await guest.get('/api/gurdwaras?q=Testpur')).data.total, 0, 'closed records leave the default listing');
  await admin.post(`/api/admin/gurdwaras/${raipurId}/status`, { status: 'active' });
  const stats = (await admin.get('/api/admin/gurdwaras/stats')).data;
  assert.ok(stats.total > 100 && stats.needsVerification > 50 && stats.archived === 1);
  assert.equal((await member.get('/api/admin/gurdwaras/stats')).status, 403);
});

test('scale: 10,000+ records stay fast (server-side search, filters, distance, pagination)', async () => {
  const store = createGurdwaraStore(srv.db);
  const db = srv.db;
  const insert = db.prepare(`INSERT INTO gurdwaras (name, slug, country_id, state_region_id, city_id, latitude, longitude, status, verification_status, name_norm)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'verified', ?)`);
  const fac = db.prepare("INSERT INTO gurdwara_facilities (gurdwara_id, facility_key) VALUES (?, 'langar')");
  const fts = db.prepare('INSERT INTO gurdwaras_fts (rowid, name, official_name, also_known_as, address, postal_code, city, state, country) VALUES (?, ?, \'\', \'\', \'\', \'\', ?, ?, ?)');
  db.exec('BEGIN');
  const country = db.prepare("SELECT id, name FROM countries WHERE code = 'US'").get();
  for (let s = 0; s < 20; s++) {
    const st = db.prepare('INSERT INTO states_regions (country_id, name, slug) VALUES (?, ?, ?)').run(country.id, `Test State ${s}`, `test-state-${s}`);
    for (let ci = 0; ci < 10; ci++) {
      const city = db.prepare('INSERT INTO cities (country_id, state_region_id, name, slug) VALUES (?, ?, ?, ?)').run(country.id, st.lastInsertRowid, `Test City ${s}-${ci}`, `test-city-${s}-${ci}`);
      for (let k = 0; k < 52; k++) {
        const name = `Test Fixture Scale Gurdwara ${s}-${ci}-${k}`;
        const info = insert.run(name, `scale-${k}`, country.id, st.lastInsertRowid, city.lastInsertRowid, 30 + s * 0.5 + k * 0.001, -100 + ci * 0.5, name.toLowerCase());
        if (k % 2) fac.run(info.lastInsertRowid);
        fts.run(info.lastInsertRowid, name, `Test City ${s}-${ci}`, `Test State ${s}`, country.name);
      }
    }
  }
  db.exec('COMMIT');
  const total = db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n;
  assert.ok(total > 10000, `${total} records`);
  const cases = {
    'default first page': '/api/gurdwaras',
    'name search': '/api/gurdwaras?q=' + encodeURIComponent('Scale Gurdwara 7-3'),
    'country + state + city': '/api/gurdwaras?country=united-states&state=test-state-5&city=test-city-5-5',
    'facility filter': '/api/gurdwaras?facilities=langar&country=united-states',
    'closest (whole country)': '/api/gurdwaras?country=united-states&sort=distance&lat=35&lng=-98',
    'near me within 50 km': '/api/gurdwaras?sort=distance&lat=35&lng=-98&radius=50',
    'recently updated, page 200': '/api/gurdwaras?sort=updated&page=200',
    'locations (states)': '/api/gurdwaras/locations?country=united-states',
  };
  const timings = {};
  for (const [label, url] of Object.entries(cases)) {
    await guest.get(url); // warm
    const { r, ms: t } = await ms(() => guest.get(url));
    assert.equal(r.status, 200, label);
    if (r.data.items) assert.ok(r.data.items.length <= 20, 'never more than one page');
    timings[label] = Math.round(t);
    assert.ok(t < 500, `${label} took ${Math.round(t)} ms`);
  }
  console.log(`      ${total} records — response times (ms):`, JSON.stringify(timings));
  assert.ok(store.search({ country: 'united-states', state: 'test-state-5', city: 'test-city-5-5', pageSize: 50 }).total === 52);
});

test('migration: Gurdwaras in the old generic directory move to the new tables', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  registerFunctions(db);
  MIGRATIONS.slice(0, 4).forEach((m) => db.exec(m));
  db.prepare(`INSERT INTO entries (type, slug, title, summary, data, country, city, publish_status, verification_status, source, references_json, last_verified_at)
    VALUES ('gurdwara', 'old', 'Old Directory Test Gurdwara', 'From the old directory', ?, 'India', 'Testpur', 'published', 'verified', 'Old source', ?, '2026-01-01')`)
    .run(JSON.stringify({ country: 'India', city: 'Testpur', phone: '123 4567', timings: '5–9' }), JSON.stringify([{ label: 'Ref', url: 'https://example.org/ref' }]));
  db.prepare("INSERT INTO entries (type, slug, title, publish_status) VALUES ('website', 'site', 'A website', 'published')").run();
  MIGRATIONS[4](db);
  MIGRATIONS[5](db); // 6 rebuilds the search index (with district)
  const g = db.prepare('SELECT g.*, co.code FROM gurdwaras g JOIN countries co ON co.id = g.country_id').all();
  assert.equal(g.length, 1);
  assert.equal(g[0].code, 'IN');
  assert.equal(g[0].verification_status, 'verified');
  assert.equal(g[0].opening_hours, '5–9');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gurdwara_sources').get().n, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM entries WHERE type = 'gurdwara'").get().n, 0, 'one directory, not two');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM entries WHERE type = 'website'").get().n, 1, 'other entries untouched');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gurdwaras_fts WHERE gurdwaras_fts MATCH 'old*'").get().n, 1);
});
