/* ==========================================================================
   Submissions, guest contributions, moderation and homepage banners — API
   tests (npm test). Runs the real server against a throwaway database; every
   record here ("Test Fixture …", "QA …") exists only in that database.

   Regression for "admin submissions appear, regular users' don't": an admin,
   two regular members and a visitor without an account each submit; the
   moderation queues must show all of them, correctly attributed.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';

let srv;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-submissions-test-'));
const quiet = { info() {}, warn() {}, error: console.error };

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet });
  base = srv.url;
  const insert = srv.db.prepare('INSERT INTO users (email, username, name, password_hash, role) VALUES (?, ?, ?, ?, ?)');
  insert.run('admin@test.local', 'admin', 'Admin Singh', await hashPassword('admin-password-1'), 'admin');
  insert.run('mod@test.local', 'moder', 'Moderator Kaur', await hashPassword('moder-password-1'), 'moderator');
});
after(() => { srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

/** A client with its own cookie jar; `ip` sets X-Forwarded-For (only trusted when trustProxy is on). */
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
const admin = client();
const mod = client();
const userA = client();
const userB = client();
const guest = client();
const resetGuestLimits = () => srv.db.prepare("DELETE FROM rate_limits WHERE key LIKE 'guest-submission%'").run();

const suggestion = (name, extra = {}) => ({ name, country: 'CA', state: 'Testario', city: 'Fixtureton', address: '1 Test Rd', source: 'https://example.org/' + encodeURIComponent(name), ...extra });

test('setup: staff sign in, two members sign up', async () => {
  assert.equal((await admin.post('/api/auth/login', { identifier: 'admin', password: 'admin-password-1' })).status, 200);
  assert.equal((await mod.post('/api/auth/login', { identifier: 'moder', password: 'moder-password-1' })).status, 200);
  assert.equal((await userA.post('/api/auth/signup', { name: 'Member A', username: 'membera', email: 'a@test.local', password: 'member-password-a' })).status, 200);
  assert.equal((await userB.post('/api/auth/signup', { name: 'Member B', username: 'memberb', email: 'b@test.local', password: 'member-password-b' })).status, 200);
});

const refs = {};
test('admin, member A, member B and a guest each suggest a Gurdwara; all are saved', async () => {
  for (const [who, c] of [['admin', admin], ['a', userA], ['b', userB]]) {
    const r = await c.post('/api/gurdwaras/submissions', suggestion(`Test Fixture Gurdwara ${who}`));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.match(r.data.reference, /^G-[A-Z0-9]{6}$/);
    refs[who] = r.data;
  }
  const g = await guest.post('/api/gurdwaras/submissions', suggestion('Test Fixture Gurdwara guest', { guestName: 'Visitor Singh', guestEmail: 'Visitor@Example.org' }));
  assert.equal(g.status, 200, JSON.stringify(g.data));
  assert.match(g.data.reference, /^G-[A-Z0-9]{6}$/);
  refs.guest = g.data;
  const row = srv.db.prepare('SELECT submitter_id, is_guest, guest_name, guest_email FROM gurdwara_submissions WHERE id = ?').get(g.data.id);
  assert.deepEqual({ ...row }, { submitter_id: null, is_guest: 1, guest_name: 'Visitor Singh', guest_email: 'visitor@example.org' }, 'no invented account for a guest');
});

test('the moderation queue shows all four, correctly attributed; a moderator sees them too', async () => {
  for (const c of [admin, mod]) {
    const q = await c.get('/api/admin/gurdwara-submissions?status=pending');
    assert.equal(q.status, 200);
    assert.equal(q.data.total, 4, 'every pending suggestion, whoever sent it');
    const by = Object.fromEntries(q.data.items.map((s) => [s.name, s]));
    assert.equal(by['Test Fixture Gurdwara admin'].submitter.username, 'admin');
    assert.equal(by['Test Fixture Gurdwara a'].submitter.username, 'membera');
    assert.equal(by['Test Fixture Gurdwara b'].submitter.username, 'memberb');
    assert.equal(by['Test Fixture Gurdwara guest'].submitter, undefined);
    assert.equal(by['Test Fixture Gurdwara guest'].guest, true);
    assert.equal(by['Test Fixture Gurdwara guest'].guestEmail, 'visitor@example.org', 'reviewers can follow up');
  }
  const guests = await admin.get('/api/admin/gurdwara-submissions?from=guest');
  assert.equal(guests.data.total, 1);
  const search = await admin.get('/api/admin/gurdwara-submissions?q=' + refs.b.reference);
  assert.equal(search.data.total, 1, 'searchable by reference');
  const dash = await admin.get('/api/admin/dashboard');
  assert.equal(dash.data.counts.pendingGurdwaraSubmissions, 4);
  assert.ok(dash.data.recentSubmissions.some((s) => s.queue === 'gurdwara' && s.guest));
});

test('members and guests cannot use the moderation API', async () => {
  assert.equal((await userA.get('/api/admin/gurdwara-submissions')).status, 403);
  assert.equal((await guest.get('/api/admin/gurdwara-submissions')).status, 401);
  assert.equal((await userA.post(`/api/admin/gurdwara-submissions/${refs.b.id}/review`, { decision: 'approve' })).status, 403);
  assert.equal((await guest.post(`/api/admin/submissions/1/review`, { decision: 'approve' })).status, 401);
  assert.equal((await userB.get('/api/admin/dashboard')).status, 403);
});

test('pending suggestions are never public; approval publishes; a second review is refused', async () => {
  assert.equal((await guest.get('/api/gurdwaras?q=Fixture')).data.total, 0, 'nothing public before review');
  const ok = await admin.post(`/api/admin/gurdwara-submissions/${refs.a.id}/review`, { decision: 'approve', note: '' });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.submission.status, 'approved');
  const pub = await guest.get('/api/gurdwaras?q=Fixture');
  assert.equal(pub.data.total, 1, 'the approved record is listed');
  assert.equal(pub.data.items[0].verification, 'needs_verification', 'approval alone does not mark it verified');
  assert.equal((await guest.get('/api/gurdwaras?q=Fixture&status=verified')).data.total, 0);
  const again = await admin.post(`/api/admin/gurdwara-submissions/${refs.a.id}/review`, { decision: 'reject', note: 'dup' });
  assert.equal(again.status, 409, 'cannot be processed twice');
  const notif = await userA.get('/api/notifications');
  assert.ok(notif.data.items.some((n) => /approved/.test(n.message)), 'the member is notified');
});

test('rejection needs a note and removes nothing else', async () => {
  const noNote = await admin.post(`/api/admin/gurdwara-submissions/${refs.guest.id}/review`, { decision: 'reject' });
  assert.equal(noNote.status, 422);
  const before = srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n;
  const rej = await admin.post(`/api/admin/gurdwara-submissions/${refs.guest.id}/review`, { decision: 'reject', note: 'Could not confirm this address' });
  assert.equal(rej.data.submission.status, 'rejected');
  assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwaras').get().n, before);
  assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwara_submissions').get().n, 4, 'the submission itself is kept');
});

test('"Submit / Update Information": members and guests; queue, search, publish', async () => {
  resetGuestLimits();
  const data = { title: 'Test Fixture Website', url: 'https://fixture.example.org', summary: 'A test website listing for the directory.', category: 'Learning' };
  const m = await userB.post('/api/submissions', { kind: 'website', data, source: 'https://fixture.example.org/about' });
  assert.equal(m.status, 200, JSON.stringify(m.data));
  assert.match(m.data.submission.reference, /^S-/);
  const g = await guest.post('/api/submissions', { kind: 'incorrect', targetUrl: '/gurus', message: 'A date on this page looks wrong to me.', source: 'A history book, page 12', guestName: 'Reader' });
  assert.equal(g.status, 200, JSON.stringify(g.data));
  assert.deepEqual(Object.keys(g.data.submission).sort(), ['createdAt', 'id', 'kind', 'kindLabel', 'reference', 'status', 'title'], 'guests get only their reference and status back');
  const q = await mod.get('/api/admin/submissions?status=pending');
  assert.equal(q.data.total, 2);
  assert.ok(q.data.items.some((s) => s.guest && s.guestName === 'Reader'));
  assert.ok(q.data.items.some((s) => s.submitter && s.submitter.username === 'memberb'));
  assert.equal((await mod.get('/api/admin/submissions?from=guest')).data.total, 1);
  assert.equal((await mod.get('/api/admin/submissions?q=Fixture%20Website')).data.total, 1);
  const pub = await admin.post(`/api/admin/submissions/${m.data.submission.id}/review`, { decision: 'publish', note: '' });
  assert.equal(pub.status, 200, JSON.stringify(pub.data));
  assert.equal(pub.data.submission.status, 'published');
  const listed = await guest.get('/api/entries?type=website');
  assert.ok(listed.data.items.some((i) => i.title === 'Test Fixture Website'), 'published to the public directory');
});

test('validation, duplicates, spam and rate limits for guests', async () => {
  resetGuestLimits();
  const badEmail = await guest.post('/api/gurdwaras/submissions', suggestion('Test Fixture Email', { guestEmail: 'not-an-email' }));
  assert.equal(badEmail.status, 422);
  assert.ok(badEmail.data.error.fields.guestEmail);
  const missing = await guest.post('/api/gurdwaras/submissions', { name: 'Te' });
  assert.equal(missing.status, 422);
  assert.ok(missing.data.error.fields.country && missing.data.error.fields.source);

  const first = await guest.post('/api/gurdwaras/submissions', suggestion('Test Fixture Twice'));
  assert.equal(first.status, 200);
  const dup = await guest.post('/api/gurdwaras/submissions', suggestion('Test Fixture Twice'));
  assert.equal(dup.status, 409, 'the same submission again is refused');
  assert.ok(dup.data.error.message.includes(first.data.reference), 'and points to the first one');
  const memberDup = await userA.post('/api/gurdwaras/submissions', suggestion('Test Fixture Twice'));
  assert.equal(memberDup.status, 200, 'another person may send the same place');

  const before = srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwara_submissions').get().n;
  const bot = await guest.post('/api/gurdwaras/submissions', suggestion('Test Fixture Bot', { company_website: 'http://spam.example' }));
  assert.equal(bot.status, 200, 'bots are not told they were caught');
  assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM gurdwara_submissions').get().n, before, 'but nothing is stored');

  resetGuestLimits();
  const codes = [];
  for (let i = 0; i < 32; i++) codes.push((await guest.post('/api/gurdwaras/submissions', suggestion(`Test Fixture Flood ${i}`))).status);
  assert.deepEqual(codes, [...Array(30).fill(200), 429, 429], '30 per hour per address');

  srv.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('submissions_open', 'false')").run();
  assert.equal((await guest.post('/api/submissions', { kind: 'website' })).status, 403, 'pausing submissions applies to guests too');
  srv.db.prepare("DELETE FROM settings WHERE key = 'submissions_open'").run();
});

/* ---------------------------------------------------------------- banners */
let imageUrl;
test('banner images: staff-only upload purpose', async () => {
  const jpg = await sharp({ create: { width: 1200, height: 675, channels: 3, background: { r: 120, g: 30, b: 30 } } }).jpeg({ quality: 90 }).toBuffer();
  const dataUrl = 'data:image/jpeg;base64,' + jpg.toString('base64');
  assert.equal((await userA.post('/api/uploads', { purpose: 'banner', dataUrl })).status, 403);
  const up = await admin.post('/api/uploads', { purpose: 'banner', dataUrl });
  assert.equal(up.status, 200, JSON.stringify(up.data));
  imageUrl = up.data.url;
});

let bannerId;
test('banners: validation, draft is not public, publish shows it, schedule and expiry respected', async () => {
  assert.deepEqual((await guest.get('/api/banners/home')).data.items, [], 'no banner: nothing to show');
  const bad = await admin.post('/api/admin/banners', { title: 'x', youtube: 'https://vimeo.com/1', ctaLabel: 'Go', ctaUrl: 'javascript:alert(1)', imageUrl: '/uploads/not-ours.webp' });
  assert.equal(bad.status, 422);
  assert.deepEqual(Object.keys(bad.data.error.fields).sort(), ['ctaUrl', 'imageAlt', 'imageUrl', 'title', 'youtube']);
  assert.equal((await userA.post('/api/admin/banners', { title: 'Nope' })).status, 403);

  const draft = await admin.post('/api/admin/banners', { title: 'QA Gurpurab banner', description: 'Join the Kirtan.', imageUrl, imageAlt: 'Illuminated Gurdwara', youtube: 'https://youtu.be/SC1gipmk214', ctaLabel: 'Festivals', ctaUrl: '/festivals' });
  assert.equal(draft.status, 200, JSON.stringify(draft.data));
  bannerId = draft.data.banner.id;
  assert.equal(draft.data.banner.state, 'draft');
  assert.equal(draft.data.banner.youtubeId, 'SC1gipmk214');
  assert.deepEqual((await guest.get('/api/banners/home')).data.items, [], 'drafts are never public');

  await admin.post(`/api/admin/banners/${bannerId}/status`, { status: 'published' });
  const live = (await guest.get('/api/banners/home')).data.items;
  assert.equal(live.length, 1);
  assert.deepEqual(live[0].cta, { label: 'Festivals', url: '/festivals' });
  assert.equal(live[0].status, undefined, 'public shape has no admin fields');

  const future = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  await admin.patch(`/api/admin/banners/${bannerId}`, { startsAt: future });
  assert.equal((await guest.get('/api/banners/home')).data.items.length, 0, 'scheduled for later: not yet');
  assert.equal((await admin.get(`/api/admin/banners/${bannerId}`)).data.banner.state, 'scheduled');
  await admin.patch(`/api/admin/banners/${bannerId}`, { startsAt: '2020-01-01', endsAt: '2020-02-01' });
  assert.equal((await guest.get('/api/banners/home')).data.items.length, 0, 'ended: gone');
  assert.equal((await admin.patch(`/api/admin/banners/${bannerId}`, { startsAt: '2026-05-02', endsAt: '2026-05-01' })).status, 422, 'end before start');
  await admin.patch(`/api/admin/banners/${bannerId}`, { startsAt: '', endsAt: '' });
  assert.equal((await guest.get('/api/banners/home')).data.items.length, 1);

  await admin.post(`/api/admin/banners/${bannerId}/status`, { status: 'draft' });
  assert.equal((await guest.get('/api/banners/home')).data.items.length, 0, 'unpublished: gone');
});

test('banners: display order and deletion (Master Admin only)', async () => {
  const second = await admin.post('/api/admin/banners', { title: 'QA second banner', youtube: 'SC1gipmk214', status: 'published' });
  await admin.post(`/api/admin/banners/${bannerId}/status`, { status: 'published' });
  assert.deepEqual((await guest.get('/api/banners/home')).data.items.map((b) => b.title), ['QA second banner', 'QA Gurpurab banner'], 'a new banner goes to the top');
  const re = await admin.post('/api/admin/banners/reorder', { ids: [bannerId, second.data.banner.id] });
  assert.equal(re.status, 200);
  assert.deepEqual((await guest.get('/api/banners/home')).data.items.map((b) => b.title), ['QA Gurpurab banner', 'QA second banner']);
  assert.equal((await admin.post('/api/admin/banners/reorder', { ids: [bannerId] })).status, 400, 'every banner must be listed');
  assert.equal((await mod.del(`/api/admin/banners/${bannerId}`)).status, 403, 'moderators can edit but not delete');
  assert.equal((await admin.del(`/api/admin/banners/${bannerId}`)).status, 200);
  assert.deepEqual((await guest.get('/api/banners/home')).data.items.map((b) => b.title), ['QA second banner']);
});

/* ---------------------------------------------------------------- feed images */
test('feed photos: a 960 px display copy is made; the full image is kept; small/old photos fall back', async () => {
  // A detailed 1600×1200 photo-like image (noise), as the browser would send it (JPEG 0.92).
  const raw = Buffer.alloc(1600 * 1200 * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761 >>> 24) ^ (i % 1600);
  const jpg = await sharp(raw, { raw: { width: 1600, height: 1200, channels: 3 } }).blur(1.2).jpeg({ quality: 92 }).toBuffer();
  const up = await userA.post('/api/uploads', { purpose: 'post', dataUrl: 'data:image/jpeg;base64,' + jpg.toString('base64') });
  assert.equal(up.status, 200, JSON.stringify(up.data));
  assert.equal(up.data.width, 1600);
  assert.ok(up.data.thumbUrl && up.data.thumbUrl.endsWith('.w960.webp'));
  assert.equal(up.data.thumbWidth, 960);
  assert.ok(up.data.thumbBytes < up.data.bytes, 'the preview is smaller than the full image');
  const thumb = await fetch(base + up.data.thumbUrl);
  assert.equal(thumb.status, 200);
  assert.equal((await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).width, 960);

  const small = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#335' } }).jpeg().toBuffer();
  const s = await userA.post('/api/uploads', { purpose: 'post', dataUrl: 'data:image/jpeg;base64,' + small.toString('base64') });
  assert.equal(s.data.thumbUrl, undefined, 'no copy for an image that is already small');
  const fallback = await fetch(base + s.data.url.replace(/\.[a-z]+$/, '.w960.webp'));
  assert.equal(fallback.status, 200, 'the variant URL answers with the original');
  assert.equal((await fetch(base + '/uploads/2026/01/nope.w960.webp')).status, 404);
});

test('regression: forms sent back with errors never use up the submission limit', async () => {
  resetGuestLimits();
  // Ten attempts that fail validation (e.g. "What should change?" too short) …
  for (let i = 0; i < 10; i++) {
    const bad = await guest.post('/api/submissions', { kind: 'correction', targetUrl: '/gurbani', message: 'nothing', source: 'love' });
    assert.equal(bad.status, 422, 'validation error, not "too many attempts"');
  }
  // … and the visitor can still send a real submission.
  const good = await guest.post('/api/submissions', { kind: 'correction', targetUrl: '/gurbani', message: 'The meaning of the second line is missing a word.', source: 'Sri Guru Granth Sahib Ji, Ang 1' });
  assert.equal(good.status, 200, JSON.stringify(good.data));
  assert.match(good.data.submission.reference, /^S-/);
});

/* ---------------------------------------------------------------- staff notifications */
test('every new submission notifies the staff who review submissions (not members, not the sender)', async () => {
  resetGuestLimits();
  const newest = async (who) => (await who.get('/api/notifications?limit=1')).data.items[0];
  const s = await guest.post('/api/submissions', { kind: 'website', data: { title: 'QA Notify Website', url: 'https://example.org/notify', summary: 'A Sikh website for the notification test.', category: 'Learning' }, source: 'https://example.org/notify', guestName: 'Harpreet' });
  assert.equal(s.status, 200, JSON.stringify(s.data));
  const ref = s.data.submission.reference;
  for (const staff of [admin, mod]) {
    const n = await newest(staff);
    assert.equal(n.type, 'submission_received');
    assert.ok(n.message.includes(ref) && n.message.includes('Harpreet (visitor)'), n.message);
    assert.equal(n.link, '/admin/submissions');
    assert.equal(n.read, false);
  }
  const member = await newest(userA);
  assert.ok(!member || member.type !== 'submission_received', 'members are not told about other people\'s submissions');

  const g = await guest.post('/api/gurdwaras/submissions', suggestion('QA Notify Gurdwara'));
  assert.equal(g.status, 200, JSON.stringify(g.data));
  const gn = await newest(admin);
  assert.ok(gn.message.includes('QA Notify Gurdwara') && gn.message.includes(g.data.reference), gn.message);
  assert.equal(gn.link, '/admin/gurdwaras?tab=submissions');

  // A staff member sending a submission is not notified about their own.
  const before = (await newest(mod)).id;
  assert.equal((await mod.post('/api/gurdwaras/submissions', suggestion('QA Notify By Moderator'))).status, 200);
  assert.equal((await newest(mod)).id, before);
  assert.ok((await newest(admin)).message.includes('QA Notify By Moderator'), 'the other reviewers are told');
});
