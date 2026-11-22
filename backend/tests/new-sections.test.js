/* ==========================================================================
   Blog, Downloads and Kids (quizzes, photos, downloadable pictures, video
   uploads) — over HTTP against a throwaway database, like api.test.js.
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-sections-'));
const quiet = { info() {}, warn() {}, error: console.error };

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet, publicUrl: 'http://test.local', blobToken: '' });
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
    return { status: res.status, data: await res.json().catch(() => null) };
  }
  return { get: (u) => call('GET', u), post: (u, b = {}) => call('POST', u, b), patch: (u, b = {}) => call('PATCH', u, b) };
}

const admin = client();
const member = client();
const guest = client();
const png = async () => 'data:image/png;base64,' + (await sharp({ create: { width: 40, height: 30, channels: 3, background: { r: 240, g: 169, b: 59 } } }).png().toBuffer()).toString('base64');

test('sign in', async () => {
  assert.equal((await admin.post('/api/auth/login', { identifier: 'admin@test.local', password: 'admin-password-1' })).status, 200);
  assert.equal((await member.post('/api/auth/signup', { name: 'Member Kaur', username: 'member', email: 'member@test.local', password: 'member-password' })).status, 200);
});

test('blog: staff upload a cover, publish with the default source, and the post is public without a verification step', async () => {
  assert.equal((await member.post('/api/uploads', { purpose: 'blog', dataUrl: await png() })).status, 403);
  const up = await admin.post('/api/uploads', { purpose: 'blog', dataUrl: await png() });
  assert.equal(up.status, 200);
  const body = `Intro paragraph.\n\n## A heading\n\n![A caption](${up.data.url})\n\nMore text.`;
  const made = await admin.post('/api/admin/entries', {
    type: 'blog', title: 'What Vaisakhi means', summary: 'A short read.', body, image_url: up.data.url,
    category: 'History', published_date: '2026-04-14', author: 'Admin Singh', reading_time: '3', tags: 'Vaisakhi\nKhalsa',
    source: 'Sikhify', references: '', publishStatus: 'published', verificationStatus: 'verified',
  });
  assert.equal(made.status, 200, JSON.stringify(made.data));
  assert.equal(made.data.entry.imageUrl, up.data.url);
  const pub = await guest.get('/api/entries?type=blog');
  assert.equal(pub.data.items.length, 1);
  assert.deepEqual(pub.data.items[0].fields.tags, ['Vaisakhi', 'Khalsa']);
  const one = await guest.get('/api/entries/blog/' + pub.data.items[0].slug);
  assert.equal(one.data.entry.body, body);
  // A cover that isn't a Sikhify upload path or an http(s) link is refused.
  const bad = await admin.post('/api/admin/entries', { type: 'blog', title: 'x', category: 'History', published_date: '2026-04-14', author: 'A', image_url: '/uploads/../../etc/passwd' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.error.fields.image_url);
});

test('downloads: a Drive link is required, new categories are allowed and become filters', async () => {
  const noLink = await admin.post('/api/admin/entries', { type: 'download', title: 'Japji Sahib PDF', category: 'Gutkas & Banis' });
  assert.equal(noLink.status, 422);
  assert.ok(noLink.data.error.fields.drive_url);
  for (const [title, category] of [['Japji Sahib PDF', 'Gutkas & Banis'], ['Gurpurab card', 'Greeting cards']]) {
    const r = await admin.post('/api/admin/entries', {
      type: 'download', title, category, drive_url: 'https://drive.google.com/file/d/abc123/view', file_type: 'PDF', file_size: '2 MB',
      source: 'Sikhify', publishStatus: 'published', verificationStatus: 'verified',
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  const facets = await guest.get('/api/entries/facets?type=download');
  assert.deepEqual(facets.data.categories.map((c) => c.value), ['Greeting cards', 'Gutkas & Banis']);
  const filtered = await guest.get('/api/entries?type=downloads&category=' + encodeURIComponent('Greeting cards'));
  assert.equal(filtered.data.items.length, 1);
  assert.equal(filtered.data.items[0].fields.drive_url, 'https://drive.google.com/file/d/abc123/view');
});

test('kids: quizzes are checked, photos upload, pictures can be marked downloadable', async () => {
  const empty = await admin.post('/api/admin/entries', { type: 'kids', title: 'Gurus quiz', kind: 'Quiz', quiz: [] });
  assert.equal(empty.data.error.fields.quiz, 'Add at least one question to the quiz');
  const noAnswer = await admin.post('/api/admin/entries', { type: 'kids', title: 'Gurus quiz', kind: 'Quiz', quiz: [{ question: 'First Guru?', options: ['Nanak', 'Gobind'] }] });
  assert.match(noAnswer.data.error.fields.quiz, /choose the right answer/);
  const quiz = await admin.post('/api/admin/entries', {
    type: 'kids', title: 'Gurus quiz', kind: 'Quiz', source: 'Sikhify', publishStatus: 'published',
    quiz: [{ question: 'Who was the first Sikh Guru?', options: ['Guru Nanak Dev Ji', '', 'Guru Gobind Singh Ji'], answer: 0 }],
  });
  assert.equal(quiz.status, 200, JSON.stringify(quiz.data));
  assert.deepEqual(quiz.data.entry.fields.quiz, [{ question: 'Who was the first Sikh Guru?', options: ['Guru Nanak Dev Ji', 'Guru Gobind Singh Ji'], answer: 0 }]);

  const photo = await admin.post('/api/uploads', { purpose: 'kids', dataUrl: await png() });
  assert.equal(photo.status, 200);
  const page = await admin.post('/api/admin/entries', {
    type: 'kids', title: 'Khanda colouring page', kind: 'Colouring page', summary: 'Print and colour.', image_url: photo.data.url,
    photos: photo.data.url, downloadable: true, source: 'Sikhify', publishStatus: 'published',
  });
  assert.equal(page.status, 200, JSON.stringify(page.data));
  assert.equal(page.data.entry.fields.downloadable, true);
  assert.deepEqual(page.data.entry.fields.photos, [photo.data.url]);
  // "Download image" links (?download=1) are sent as attachments, so browsers and the Android app save them.
  const shown = await fetch(base + photo.data.url);
  assert.equal(shown.headers.get('content-disposition'), null);
  const saved = await fetch(base + photo.data.url + '?download=1');
  assert.equal(saved.status, 200);
  assert.match(saved.headers.get('content-disposition'), /^attachment; filename="sikhify-[a-f0-9]{32}\.(webp|png)"$/);
  // Only quizzes are listed under the Quiz category; the rest stay in stories.
  assert.equal((await guest.get('/api/entries?type=kids&category=Quiz')).data.items.length, 1);
  // Video files must be Sikhify Blob uploads, not any link.
  const badVideo = await admin.post('/api/admin/entries', { type: 'kids', title: 'Video', kind: 'Story', video_files: 'https://example.com/v.mp4' });
  assert.ok(badVideo.data.error.fields.video_files);
});

test('countries use today’s ISO codes (Germany is DE, not the retired DD), so imports by code find them', async () => {
  const code = (slug) => srv.db.prepare('SELECT code FROM countries WHERE slug = ?').get(slug).code;
  assert.equal(code('germany'), 'DE');
  assert.equal(code('myanmar-burma'), 'MM');
  assert.equal(code('united-kingdom'), 'GB');
  assert.equal(srv.db.prepare("SELECT COUNT(*) AS n FROM countries WHERE code IN ('DD', 'BU', 'UK', 'YU')").get().n, 0);
});

test('video upload tokens: staff only, and switched off without a Blob store', async () => {
  assert.equal((await member.post('/api/uploads/video-token', { contentType: 'video/mp4', size: 1000 })).status, 403);
  const off = await admin.post('/api/uploads/video-token', { contentType: 'video/mp4', size: 1000 });
  assert.equal(off.status, 503);
  assert.match(off.data.error.message, /not set up/);
});
