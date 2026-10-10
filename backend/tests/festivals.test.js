/* ==========================================================================
   Sikh Festivals & Important Days — date rules (shared/festivals.js) and the
   API (routes/festivals.js), driven over HTTP like the browser does.
   Dates are built relative to the real "today" so the tests never go stale.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';
import {
  todayIn, addDays, occurrenceStatus, occurrencesOf, nextVerifiedOccurrence, verificationGaps, selectHomeCards,
  isInternalPath, destinationError, weekdayOf,
} from '../../shared/festivals.js';

/* ---------- pure date rules */

test('status: today, ongoing, upcoming and past — inclusive day boundaries', () => {
  const t = '2026-04-14';
  assert.equal(occurrenceStatus({ start: t, end: t }, t), 'today');
  assert.equal(occurrenceStatus({ start: '2026-04-13', end: '2026-04-15' }, t), 'ongoing');
  assert.equal(occurrenceStatus({ start: '2026-04-12', end: t }, t), 'ongoing', 'last day of a period is still on');
  assert.equal(occurrenceStatus({ start: '2026-04-15', end: '2026-04-15' }, t), 'upcoming');
  assert.equal(occurrenceStatus({ start: '2026-04-13', end: '2026-04-13' }, t), 'past', 'yesterday is never "today"');
});

test('"today" follows the site timezone at midnight, not the server clock', () => {
  // 18:29 UTC is 23:59 in India; 18:30 UTC is already the next day there.
  assert.equal(todayIn('Asia/Kolkata', new Date('2026-04-13T18:29:00Z')), '2026-04-13');
  assert.equal(todayIn('Asia/Kolkata', new Date('2026-04-13T18:30:00Z')), '2026-04-14');
  assert.equal(weekdayOf('2026-04-14'), 'Tuesday');
});

test('annual fixed dates recur; 29 February only in leap years; multi-day spans cross year ends', () => {
  const fixed = { scheduleType: 'annual_fixed', fixedMonth: 2, fixedDay: 29, durationDays: 1, ruleVerified: true };
  assert.deepEqual(occurrencesOf(fixed, [2027, 2028]).map((o) => o.start), ['2028-02-29']);
  const span = { scheduleType: 'annual_fixed', fixedMonth: 12, fixedDay: 30, durationDays: 4, ruleVerified: true };
  const occ = nextVerifiedOccurrence(span, '2027-01-02');
  assert.deepEqual([occ.start, occ.end], ['2026-12-30', '2027-01-02'], 'a period that began last year is still ongoing');
  assert.equal(nextVerifiedOccurrence({ ...span, ruleVerified: false }, '2027-01-02'), null, 'an unverified rule is never shown');
});

test('annual verified dates are never copied from a previous year', () => {
  const o = { scheduleType: 'annual_verified', dates: [{ startDate: '2026-11-05', endDate: '2026-11-05', verification: 'verified' }] };
  assert.equal(nextVerifiedOccurrence(o, '2026-11-06'), null, 'no 2027 date has been verified, so nothing is shown');
  assert.deepEqual(verificationGaps(o, '2026-11-06'), [2027]);
  assert.deepEqual(verificationGaps(o, '2026-06-01'), [2027], 'this year is verified; next year is flagged');
  const unverified = { scheduleType: 'annual_verified', dates: [{ startDate: '2026-11-05', endDate: '2026-11-05', verification: 'unverified' }] };
  assert.equal(nextVerifiedOccurrence(unverified, '2026-06-01'), null);
  assert.deepEqual(verificationGaps(unverified, '2026-06-01'), [2026, 2027]);
});

test('home selection: happening now first, advance windows, same-day entries, fallback', () => {
  const t = '2026-04-14';
  const mk = (slug, start, end, extra = {}) => ({ slug, title: slug, summary: '', priority: 0, advanceDays: 30, featured: false, destinationType: 'detail',
    scheduleType: 'annual_verified', dates: [{ startDate: start, endDate: end || start, verification: 'verified' }], ...extra });
  const { items, fallback } = selectHomeCards([
    mk('later', '2026-05-01'),
    mk('far', '2026-09-01'),
    mk('now-a', t), mk('now-b', t),
    mk('period', '2026-04-10', '2026-04-20'),
    mk('gone', '2026-04-13'),
  ], t);
  assert.equal(fallback, false);
  assert.deepEqual(items.map((c) => c.slug), ['now-a', 'now-b', 'period', 'later']);
  assert.deepEqual(items.map((c) => c.status), ['today', 'today', 'ongoing', 'upcoming']);
  assert.equal(items[0].href, '/festivals/now-a');
  const fb = selectHomeCards([mk('far', '2026-09-01'), mk('gone', '2026-04-13')], t);
  assert.equal(fb.fallback, true);
  assert.deepEqual(fb.items.map((c) => c.slug), ['far'], 'the next verified date is offered when nothing is near');
  assert.deepEqual(selectHomeCards([], t), { items: [], fallback: true });
});

test('destinations: only real Sikhify pages or http(s) links', () => {
  for (const ok of ['/', '/sikh-history#event=1699-khalsa', '/gurus/guru-nanak-dev-ji', '/festivals/vaisakhi', '/events/some-event', '/directory/gurdwaras/india/punjab']) {
    assert.ok(isInternalPath(ok, ['events']), ok);
  }
  for (const bad of ['//evil.example', '/gurus/not-a-guru', '/no-such-page', 'javascript:alert(1)', '/a b', '']) {
    assert.ok(!isInternalPath(bad, ['events']), bad);
  }
  assert.equal(destinationError({ destinationType: 'external', destinationUrl: 'javascript:alert(1)' }), 'Must be a full http(s):// link');
  assert.equal(destinationError({ destinationType: 'detail', slug: 'x' }), '');
});

/* ---------- API */

let srv;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-festivals-'));
const quiet = { info() {}, warn() {}, error: console.error };
const today = todayIn();

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet, publicUrl: 'http://test.local' });
  base = srv.url;
  const hash = await hashPassword('password-1234');
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('fadmin@test.local', 'fadmin', 'Festival Admin', ?, 'admin')").run(hash);
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('fuser@test.local', 'fuser', 'Plain Member', ?, 'user')").run(hash);
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
    return { status: res.status, data: await res.json().catch(() => null) };
  }
  return { get: (u) => call('GET', u), post: (u, b = {}) => call('POST', u, b), patch: (u, b = {}) => call('PATCH', u, b), del: (u) => call('DELETE', u) };
}
const admin = client();
const member = client();
const guest = client();
const verified = (start, end) => ({ startDate: start, endDate: end || start, verification: 'verified', sourceName: 'Test source (admin-checked)' });

test('sign in', async () => {
  assert.equal((await admin.post('/api/auth/login', { identifier: 'fadmin', password: 'password-1234' })).status, 200);
  assert.equal((await member.post('/api/auth/login', { identifier: 'fuser', password: 'password-1234' })).status, 200);
});

test('admin endpoints are enforced on the server', async () => {
  assert.equal((await guest.get('/api/admin/festivals')).status, 401);
  assert.equal((await member.get('/api/admin/festivals')).status, 403);
  assert.equal((await member.post('/api/admin/festivals', { title: 'X' })).status, 403);
});

test('validation: dates, verification sources, destinations', async () => {
  const r = await admin.post('/api/admin/festivals', {
    title: 'Bad entry', scheduleType: 'annual_verified', calendarType: 'nanakshahi', durationDays: 1, advanceDays: 30,
    destinationType: 'internal', destinationPath: '/no-such-page',
    dates: [{ startDate: '2026-02-30' }, { startDate: today, endDate: addDays(today, -1) }, { startDate: addDays(today, 3), verification: 'verified' }],
  });
  assert.equal(r.status, 422);
  const f = r.data.error.fields;
  assert.ok(f.destinationPath && f['dates.0.startDate'] && f['dates.1.endDate'] && f['dates.2.sourceName'], JSON.stringify(f));
});

let a; let b; let draft;
test('create, publish and select by date (multiple on one day, multi-day, unpublished hidden)', async () => {
  const base = { scheduleType: 'annual_verified', calendarType: 'nanakshahi', durationDays: 1, advanceDays: 30, summary: 'A short description.' };
  a = (await admin.post('/api/admin/festivals', { ...base, title: 'Alpha Day', publish: true, dates: [verified(today)] })).data.observance;
  b = (await admin.post('/api/admin/festivals', { ...base, title: 'Beta Period', publish: true, destinationType: 'internal', destinationPath: '/sikh-history', dates: [verified(addDays(today, -2), addDays(today, 2))] })).data.observance;
  const c = (await admin.post('/api/admin/festivals', { ...base, title: 'Gamma Day', publish: true, dates: [verified(today)] })).data.observance;
  draft = (await admin.post('/api/admin/festivals', { ...base, title: 'Draft Day', dates: [verified(today)] })).data.observance;
  await admin.post('/api/admin/festivals', { ...base, title: 'Unverified Day', publish: true, dates: [{ startDate: addDays(today, 1) }] });
  assert.equal(a.status, 'published');
  assert.equal(a.slug, 'alpha-day');
  assert.ok(c && draft);

  const home = (await guest.get('/api/festivals/home')).data;
  assert.equal(home.today, today);
  // The homepage shows two cards: the nearest days (today's first).
  assert.deepEqual(home.items.map((i) => i.slug), ['alpha-day', 'gamma-day']);
  assert.equal(home.items.find((i) => i.slug === 'alpha-day').status, 'today');
  const list = (await guest.get('/api/festivals')).data.items;
  assert.equal(list.find((i) => i.slug === 'beta-period').next.status, 'ongoing');
  assert.equal(list.find((i) => i.slug === 'beta-period').href, '/sikh-history');
  assert.equal((await guest.get('/api/festivals/draft-day')).status, 404, 'drafts are never public');
  const detail = (await guest.get('/api/festivals/unverified-day')).data.observance;
  assert.equal(detail.next, null, 'an unverified date is not presented as confirmed');
  assert.equal(JSON.stringify(detail).includes('notes'), false);
});

test('admin dashboard counts and flags', async () => {
  const d = (await admin.get('/api/admin/festivals')).data;
  assert.equal(d.stats.published, 4);
  assert.equal(d.stats.draft, 1);
  assert.ok(d.stats.ongoing >= 3);
  assert.ok(d.stats.needsVerification >= 1);
  const flagged = (await admin.get('/api/admin/festivals?view=needs_verification')).data.items.map((i) => i.slug);
  assert.ok(flagged.includes('unverified-day'));
});

test('editing a date or destination changes the public result without code', async () => {
  const moved = await admin.patch(`/api/admin/festivals/${a.id}`, { dates: [{ ...verified(addDays(today, 10)), id: a.dates[0].id }], destinationType: 'internal', destinationPath: '/gurus/guru-nanak-dev-ji' });
  assert.equal(moved.status, 200, JSON.stringify(moved.data));
  assert.equal(moved.data.observance.dates[0].verifiedBy, 'Festival Admin');
  const pub = (await guest.get('/api/festivals')).data.items.find((i) => i.slug === 'alpha-day');
  assert.equal(pub.next.status, 'upcoming');
  assert.equal(pub.next.daysUntil, 10);
  assert.equal(pub.href, '/gurus/guru-nanak-dev-ji');
});

test('unpublish hides it; published records cannot be deleted; delete needs confirmation-level rights', async () => {
  assert.equal((await admin.post(`/api/admin/festivals/${b.id}/status`, { status: 'draft' })).status, 200);
  assert.ok(!(await guest.get('/api/festivals')).data.items.some((i) => i.slug === 'beta-period'));
  assert.equal((await admin.del(`/api/admin/festivals/${a.id}`)).status, 409);
  assert.equal((await member.del(`/api/admin/festivals/${draft.id}`)).status, 403);
  assert.equal((await admin.del(`/api/admin/festivals/${draft.id}`)).status, 200);
  assert.equal((await admin.get(`/api/admin/festivals/${draft.id}`)).status, 404);
});

test('a published record cannot be saved without a valid destination', async () => {
  const r = await admin.patch(`/api/admin/festivals/${a.id}`, { destinationType: 'external', destinationUrl: 'not a url' });
  assert.equal(r.status, 422);
  assert.ok(r.data.error.fields.destinationUrl);
});

/* ---------- the seeded observances, through the admin workflow */
test('seeded drafts: invisible until an admin verifies a date and publishes; counts follow', async () => {
  const { importObservances } = await import('../scripts/import-observances.js');
  const seedFile = JSON.parse(fs.readFileSync(new URL('../seed/observances/observances.json', import.meta.url), 'utf8'));
  // A seed date moved to "in 3 days" so the outcome does not depend on the calendar.
  const seedCopy = structuredClone(seedFile);
  const rec = seedCopy.records.find((r) => r.slug === 'parkash-purab-guru-nanak-dev-ji');
  rec.dates[0].startDate = addDays(today, 3);
  const before = (await admin.get('/api/admin/festivals')).data.stats;
  const r = importObservances(srv.db, seedCopy, { dryRun: false });
  assert.equal(r.inserted, seedCopy.records.length);
  const after = (await admin.get('/api/admin/festivals')).data.stats;
  assert.equal(after.draft - before.draft, seedCopy.records.length, 'all imported as drafts');
  assert.equal(after.published, before.published);
  assert.equal(after.needsVerification - before.needsVerification, seedCopy.records.length);
  const pub = async () => (await guest.get('/api/festivals')).data.items.map((i) => i.slug);
  assert.ok(!(await pub()).includes(rec.slug), 'drafts are not public');

  // The admin verifies the date (with a source) and publishes.
  const id = (await admin.get('/api/admin/festivals?q=guru+nanak+dev')).data.items.find((o) => o.slug === rec.slug).id;
  const o = (await admin.get(`/api/admin/festivals/${id}`)).data.observance;
  const verifiedDate = { ...o.dates[0], verification: 'verified', sourceName: 'SGPC Nanakshahi Jantri (checked by admin)' };
  assert.equal((await admin.patch(`/api/admin/festivals/${id}`, { dates: [verifiedDate] })).status, 200);
  assert.equal((await admin.post(`/api/admin/festivals/${id}/status`, { status: 'published' })).status, 200);
  const done = (await admin.get('/api/admin/festivals')).data.stats;
  assert.equal(done.published, after.published + 1);
  assert.equal(done.draft, after.draft - 1);
  assert.equal(done.upcoming, after.upcoming + 1);
  const card = (await guest.get('/api/festivals')).data.items.find((i) => i.slug === rec.slug).next;
  assert.equal(card.status, 'upcoming');
  assert.equal(card.daysUntil, 3);
  // A published record whose other dates are still unverified shows only the verified one.
  const detail = (await guest.get(`/api/festivals/${rec.slug}`)).data.observance;
  assert.deepEqual(detail.verifiedDates.map((d) => d.start), [addDays(today, 3)]);
});

test('Nanakshahi date: only from the standard SGPC note of a verified date; the rest of a note stays private', async () => {
  const { nanakshahiOf } = await import('../../shared/festivals.js');
  assert.equal(nanakshahiOf({ verification: 'verified', notes: '11 Katak in the SGPC Nanakshahi Calendar 558 (checked 2026-10-10).' }), '11 Katak');
  assert.equal(nanakshahiOf({ verification: 'unverified', notes: '11 Katak in the SGPC Nanakshahi Calendar 558' }), '', 'unverified dates show nothing');
  assert.equal(nanakshahiOf({ verification: 'verified', notes: 'Called the Gurdwara office; 11 Katak' }), '', 'free-form notes are never shown');
  assert.equal(nanakshahiOf({ verification: 'verified', notes: '' }), '');
});

test('home selection: nearest date first (featured/priority never jump ahead), short rows topped up', () => {
  const t = '2026-10-10';
  const mk = (slug, start, extra = {}) => ({ slug, title: slug, summary: '', priority: 0, advanceDays: 30, featured: false, destinationType: 'detail',
    scheduleType: 'annual_verified', dates: [{ startDate: start, endDate: start, verification: 'verified' }], ...extra });
  const { items, fallback } = selectHomeCards([
    mk('bandi-chhor', '2026-11-08', { priority: 50, featured: true }),
    mk('ram-das', '2026-10-27'),
    mk('nanak', '2026-11-24'),
    mk('gobind', '2027-01-15'),
    mk('maghi', '2027-01-14'),
  ], t);
  assert.equal(fallback, false);
  assert.deepEqual(items.map((c) => c.slug), ['ram-das', 'bandi-chhor', 'nanak', 'maghi'], '17 days before 29 days; topped up to four in date order');
});

test('festival banners: chosen in Homepage banners, show the verified date, hide themselves when it has passed', async () => {
  const base = { scheduleType: 'annual_verified', calendarType: 'nanakshahi', durationDays: 1, advanceDays: 30, summary: 'A short description.', relatedGuru: 'guru-ram-das-ji' };
  const soon = (await admin.post('/api/admin/festivals', { ...base, title: 'Parkash Purab of Banner Test Ji', publish: true,
    dates: [{ ...verified(addDays(today, 17)), notes: '11 Katak in the SGPC Nanakshahi Calendar 558 (checked).' }] })).data.observance;
  const past = (await admin.post('/api/admin/festivals', { ...base, title: 'Passed Day', publish: true, dates: [verified(addDays(today, -20))] })).data.observance;
  const unpublished = (await admin.post('/api/admin/festivals', { ...base, title: 'Unpublished Day', dates: [verified(addDays(today, 5))] })).data.observance;

  // A custom banner still needs a picture; a festival banner does not.
  assert.equal((await admin.post('/api/admin/banners', { title: 'No picture', status: 'published' })).status, 422);
  const bad = await admin.post('/api/admin/banners', { title: 'Draft festival', observanceId: unpublished.id, status: 'published' });
  assert.equal(bad.status, 422, 'only a published festival can be chosen');
  assert.ok(bad.data.error.fields.observanceId);

  const live = (await admin.post('/api/admin/banners', { title: 'Gurpurab banner', observanceId: soon.id, status: 'published' })).data.banner;
  const stale = (await admin.post('/api/admin/banners', { title: 'Old banner', observanceId: past.id, status: 'published' })).data.banner;
  assert.equal(stale.observanceProblem, 'The festival has no upcoming verified date', 'staff are told why it is hidden');

  const pub = (await guest.get('/api/banners/home')).data.items;
  const shown = pub.find((x) => x.id === live.id);
  assert.ok(shown && shown.observance, 'the festival banner is on the homepage');
  assert.equal(shown.observance.start, addDays(today, 17));
  assert.equal(shown.observance.nanakshahi, '11 Katak');
  assert.equal(shown.observance.relatedGuru, 'guru-ram-das-ji');
  assert.ok(!pub.some((x) => x.id === stale.id), 'a festival banner whose day has passed is not shown');

  // Removing it is the normal banner workflow.
  assert.equal((await admin.post(`/api/admin/banners/${live.id}/status`, { status: 'draft' })).status, 200);
  assert.ok(!(await guest.get('/api/banners/home')).data.items.some((x) => x.id === live.id));
  assert.equal((await admin.del(`/api/admin/banners/${live.id}`)).status, 200);
  await admin.del(`/api/admin/banners/${stale.id}`);
});

test('homepage festivals: only the two nearest; when one passes the next takes its place', () => {
  const mk = (slug, start) => ({ slug, title: slug, summary: '', priority: 0, advanceDays: 30, featured: false, destinationType: 'detail',
    scheduleType: 'annual_verified', dates: [{ startDate: start, endDate: start, verification: 'verified' }] });
  const all = [mk('ram-das', '2026-10-27'), mk('bandi-chhor', '2026-11-08'), mk('gurgaddi', '2026-11-11'), mk('nanak', '2026-11-24')];
  const opts = { limit: 2, minCards: 2, fallbackLimit: 2 };
  assert.deepEqual(selectHomeCards(all, '2026-10-10', opts).items.map((c) => c.slug), ['ram-das', 'bandi-chhor']);
  assert.deepEqual(selectHomeCards(all, '2026-10-27', opts).items.map((c) => [c.slug, c.status]), [['ram-das', 'today'], ['bandi-chhor', 'upcoming']], 'shown all day on the day itself');
  assert.deepEqual(selectHomeCards(all, '2026-10-28', opts).items.map((c) => c.slug), ['bandi-chhor', 'gurgaddi'], 'the day after, the next one moves up');
  assert.deepEqual(selectHomeCards(all, '2026-11-12', opts).items.map((c) => c.slug), ['nanak'], 'only one left: one card');
});

test('festival banners: optional wording is saved and shown; empty values fall back to the festival', async () => {
  const fest = (await admin.post('/api/admin/festivals', { scheduleType: 'annual_verified', calendarType: 'nanakshahi', durationDays: 1, advanceDays: 30, summary: 'The festival summary.',
    relatedGuru: 'guru-ram-das-ji', title: 'Parkash Purab of Wording Test Ji', publish: true, dates: [verified(addDays(today, 9))] })).data.observance;
  const made = await admin.post('/api/admin/banners', { title: 'Guru Ram Das Ji', observanceId: fest.id, status: 'published',
    options: { kicker: 'Birthday of', subtitle: 'Fourth Sikh Guru', eyebrow: '', gurmukhi: 'ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ', unknown: 'dropped' } });
  assert.equal(made.status, 200, JSON.stringify(made.data));
  const pub = (await guest.get('/api/banners/home')).data.items.find((b) => b.id === made.data.banner.id);
  assert.deepEqual(pub.options, { kicker: 'Birthday of', subtitle: 'Fourth Sikh Guru', gurmukhi: 'ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ' }, 'empty and unknown keys are left out');
  assert.equal(pub.title, 'Guru Ram Das Ji');
  assert.equal(pub.observance.summary, 'The festival summary.', 'the festival text is still there for empty fields');
  // Editing the wording keeps the banner; clearing it goes back to the festival's own text.
  const edited = await admin.patch(`/api/admin/banners/${made.data.banner.id}`, { options: { subtitle: '' } });
  assert.deepEqual(edited.data.banner.options, {});
  await admin.del(`/api/admin/banners/${made.data.banner.id}`);
});
