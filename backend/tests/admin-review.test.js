/* ==========================================================================
   Admin review safeguards — API tests (npm test). Throwaway database only.
   • Bulk verification needs an explicit confirmation and a cited source per
     record; it can never mark "everything" verified.
   • Evidence preview is read-only, staff-only and capped.
   • Admin record filters (state, district, origin, missing information).
   • Server configuration status: Master Admins only, and no secret values.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';
import { createGurdwaraStore } from '../src/lib/gurdwaraStore.js';
import { assessWikidata } from '../src/lib/gurdwaraEvidence.js';

let srv;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-admin-review-'));
const quiet = { info() {}, warn() {}, error: console.error };
const SECRET = 'super-secret-resend-key-123';

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet, resendApiKey: SECRET, mailFrom: 'Sikhify <no-reply@example.org>', publicUrl: 'https://example.org' });
  base = srv.url;
  const ins = srv.db.prepare('INSERT INTO users (email, username, name, password_hash, role) VALUES (?, ?, ?, ?, ?)');
  ins.run('admin@test.local', 'admin', 'Admin Singh', await hashPassword('admin-password-1'), 'admin');
  ins.run('mod@test.local', 'moder', 'Mod Kaur', await hashPassword('moder-password-1'), 'moderator');
  ins.run('user@test.local', 'member', 'Member Singh', await hashPassword('member-password-1'), 'user');
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
    const text = await res.text();
    return { status: res.status, text, data: (() => { try { return JSON.parse(text); } catch { return null; } })() };
  }
  return { get: (u) => call('GET', u), post: (u, b = {}) => call('POST', u, b) };
}
const admin = client();
const mod = client();
const member = client();
const guest = client();
let ids = [];

test('setup: sign in; test records (some with a cited source, one without)', async () => {
  assert.equal((await admin.post('/api/auth/login', { identifier: 'admin', password: 'admin-password-1' })).status, 200);
  assert.equal((await mod.post('/api/auth/login', { identifier: 'moder', password: 'moder-password-1' })).status, 200);
  assert.equal((await member.post('/api/auth/login', { identifier: 'member', password: 'member-password-1' })).status, 200);
  const store = createGurdwaraStore(srv.db);
  const rows = [
    { external_ref: 'osm:node/1', name: 'Test Fixture Gurdwara Bilaspur', country_code: 'IN', state: 'Chhattisgarh', state_code: 'IN-CG', city: 'Bilaspur', district: 'Bilaspur', latitude: 22.08, longitude: 82.15, sources: [{ name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/1', type: 'open_data' }] },
    { external_ref: 'osm:node/2', name: 'Test Fixture Gurdwara Korba', country_code: 'IN', state: 'Chhattisgarh', state_code: 'IN-CG', city: 'Korba', district: 'Korba', full_address: 'Test Road', sources: [{ name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/2', type: 'open_data' }] },
  ];
  const r = store.importRows(rows, null, { dryRun: false });
  assert.equal(r.imported, 2);
  const noSource = store.create({ name: 'Test Fixture Gurdwara No Source', country: 'IN', state: 'Chhattisgarh', city: 'Raigarh' }, null);
  srv.db.prepare("INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type) VALUES (?, 'A visitor said so', '', 'community')").run(noSource.id);
  ids = srv.db.prepare('SELECT id FROM gurdwaras ORDER BY id').all().map((x) => x.id);
  assert.equal(ids.length, 3);
});

test('admin filters: state, district, origin and missing information', async () => {
  const st = (await admin.get('/api/admin/gurdwaras?country=india&state=chhattisgarh')).data;
  assert.equal(st.total, 3);
  assert.equal((await admin.get('/api/admin/gurdwaras?district=Korba')).data.total, 1);
  assert.equal((await admin.get('/api/admin/gurdwaras?origin=osm')).data.total, 2);
  assert.equal((await admin.get('/api/admin/gurdwaras?origin=manual')).data.total, 1);
  assert.equal((await admin.get('/api/admin/gurdwaras?missing=coordinates')).data.total, 2);
  assert.equal((await admin.get('/api/admin/gurdwaras?missing=source')).data.total, 1, 'a community note is not a cited source');
  const item = st.items.find((x) => x.name.endsWith('Korba'));
  assert.equal(item.origin, 'osm');
  assert.equal(item.hasAddress, true);
  assert.equal(item.hasCoordinates, false);
});

test('bulk verification: confirmation required, cited source required, never "everything"', async () => {
  const noConfirm = await admin.post('/api/admin/gurdwaras/verify-bulk', { ids, note: 'checked the sources' });
  assert.equal(noConfirm.status, 400, 'no confirmation → nothing happens');
  const empty = await admin.post('/api/admin/gurdwaras/verify-bulk', { confirm: true, note: 'checked the sources', ids: [] });
  assert.equal(empty.status, 400, 'there is no "verify all" request');
  const tooMany = await admin.post('/api/admin/gurdwaras/verify-bulk', { confirm: true, note: 'checked the sources', ids: Array.from({ length: 101 }, (_, i) => i + 1) });
  assert.equal(tooMany.status, 400);
  assert.equal((await member.post('/api/admin/gurdwaras/verify-bulk', { confirm: true, note: 'checked', ids })).status, 403);
  assert.equal((await guest.post('/api/admin/gurdwaras/verify-bulk', { confirm: true, note: 'checked', ids })).status, 401);
  const ok = await admin.post('/api/admin/gurdwaras/verify-bulk', { confirm: true, note: 'Checked each OpenStreetMap entry', ids });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.verified, 2);
  assert.deepEqual(ok.data.skipped.map((x) => x.reason), ['no cited source with a link']);
  const counts = srv.db.prepare('SELECT verification_status v, COUNT(*) n FROM gurdwaras GROUP BY 1 ORDER BY 1').all().map((r) => `${r.v}:${r.n}`);
  assert.deepEqual(counts, ['needs_verification:1', 'verified:2']);
  const log = srv.db.prepare('SELECT note FROM gurdwara_verification WHERE gurdwara_id = ?').get(ids[0]);
  assert.equal(log.note, 'Checked each OpenStreetMap entry', 'the reviewer’s note is kept');
});

test('evidence preview: staff only, capped, read-only; non-Wikidata records need a person', async () => {
  assert.equal((await member.post('/api/admin/gurdwaras/evidence-preview', { ids })).status, 403);
  assert.equal((await admin.post('/api/admin/gurdwaras/evidence-preview', { ids: Array.from({ length: 51 }, (_, i) => i + 1) })).status, 400);
  const before = srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwara_verification').get().n;
  const p = await admin.post('/api/admin/gurdwaras/evidence-preview', { ids: [ids[2]] });
  assert.equal(p.status, 200);
  assert.equal(p.data.items[0].meets, false);
  assert.equal(p.data.items[0].manual, true);
  assert.ok(p.data.items[0].reasons.includes('no cited source with a link'));
  assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwara_verification').get().n, before, 'preview writes nothing');
});

test('Wikidata evidence rules', () => {
  const rec = { qid: 'Q1', name: 'Gurdwara Test Sahib', latitude: 22, longitude: 82 };
  const entity = (over = {}) => ({ id: 'Q1', labels: { en: { value: 'Gurdwara Test Sahib' } }, aliases: {}, sitelinks: { enwiki: { site: 'enwiki', title: 'Gurdwara Test Sahib' } },
    claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q337986' } } } }], P625: [{ mainsnak: { datavalue: { value: { latitude: 22.001, longitude: 82.001 } } } }] }, ...over });
  assert.equal(assessWikidata(rec, entity()).meets, true);
  assert.equal(assessWikidata(rec, { missing: '' }).meets, false);
  assert.ok(assessWikidata(rec, entity({ sitelinks: {} })).reasons.some((r) => /corroborate/.test(r)), 'Wikidata alone is not enough');
  assert.ok(assessWikidata(rec, entity({ labels: { en: { value: 'Something Else' } } })).reasons.includes('name differs from Wikidata'));
  assert.ok(assessWikidata({ ...rec, latitude: 23 }, entity()).reasons.some((r) => /km from Wikidata/.test(r)));
  assert.ok(assessWikidata({ ...rec, latitude: null, longitude: null }, entity()).reasons.includes('no coordinates to confirm the location'));
});

test('server configuration status: Master Admins only, never a secret value', async () => {
  assert.equal((await guest.get('/api/admin/system')).status, 401);
  assert.equal((await member.get('/api/admin/system')).status, 403);
  assert.equal((await mod.get('/api/admin/system')).status, 403, 'moderators see only the explanation');
  const r = await admin.get('/api/admin/system');
  assert.equal(r.status, 200);
  const email = r.data.items.find((x) => x.key === 'email');
  assert.equal(email.ok, true);
  assert.ok(!r.text.includes(SECRET), 'the email key is never sent');
  assert.ok(!/auth_token|password_hash|token/i.test(JSON.stringify(r.data.items.map((x) => x.value))), 'no credential values');
  assert.equal(r.data.items.find((x) => x.key === 'publicUrl').value, 'https://example.org');
  for (const url of ['/api/settings/public', '/api/health']) assert.ok(!(await guest.get(url)).text.includes(SECRET));
});

test('reject: staff only, needs a reason, unpublishes the record and keeps the reason', async () => {
  const id = ids[1];
  assert.equal((await member.post(`/api/admin/gurdwaras/${id}/reject`, { note: 'Not a gurdwara' })).status, 403);
  assert.equal((await admin.post(`/api/admin/gurdwaras/${id}/reject`, { note: 'no' })).status, 422, 'a reason is required');
  const r = await admin.post(`/api/admin/gurdwaras/${id}/reject`, { note: 'Could not be located on the ground' });
  assert.equal(r.status, 200);
  assert.ok(r.data.gurdwara.archivedAt);
  assert.equal(r.data.gurdwara.verification, 'needs_verification');
  assert.equal(r.data.gurdwara.verificationLog[0].action, 'rejected');
  assert.equal((await guest.get('/api/gurdwaras?q=Korba')).data.total, 0, 'no longer public');
  await admin.post(`/api/admin/gurdwaras/${id}/archive`, { archived: false }); // "Restore" undoes it
  assert.equal((await guest.get('/api/gurdwaras?q=Korba')).data.total, 1);
});

test('merge: moves sources, photos and facilities into the kept record, archives the duplicate, deletes nothing', async () => {
  const store = createGurdwaraStore(srv.db);
  const keep = ids[0];
  const dup = store.create({ name: 'Test Fixture Gurdwara Bilaspur Sahib', country: 'IN', state: 'Chhattisgarh', city: 'Bilaspur', facilities: ['langar', 'parking'] }, null).id;
  srv.db.prepare("INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type) VALUES (?, 'Mappls', 'https://www.mappls.com/test', 'other')").run(dup);
  srv.db.prepare("INSERT INTO gurdwara_images (gurdwara_id, url, alt, credit, license, is_primary) VALUES (?, 'https://upload.wikimedia.org/x.jpg', 'Test photo of the Gurdwara', 'Someone', 'CC BY 4.0', 1)").run(dup);
  assert.equal((await member.post(`/api/admin/gurdwaras/${dup}/merge`, { intoId: keep })).status, 403);
  assert.equal((await admin.post(`/api/admin/gurdwaras/${dup}/merge`, { intoId: dup })).status, 400);
  const before = srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n;
  const m = await admin.post(`/api/admin/gurdwaras/${dup}/merge`, { intoId: keep, note: 'Two spellings of one Gurdwara' });
  assert.equal(m.status, 200, JSON.stringify(m.data));
  assert.deepEqual(m.data.moved, { sources: 1, images: 1, facilities: 2, services: 0 });
  assert.ok(m.data.merged.archivedAt, 'duplicate archived');
  assert.ok(m.data.kept.sources.some((s) => s.url === 'https://www.mappls.com/test'));
  assert.equal(m.data.kept.images.length, 1);
  assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n, before, 'nothing deleted');
  assert.ok(m.data.merged.verificationLog.some((l) => l.action === 'merged' && l.note.includes(`#${keep}`)));
  assert.equal((await admin.post(`/api/admin/gurdwaras/${dup}/merge`, { intoId: keep })).status, 409, 'cannot merge twice');
});
