/* ==========================================================================
   API integration tests — run with `npm test`.
   Starts the real server on a random port with a throwaway database and
   drives it over HTTP, the same way the browser does (cookies, CSRF header).
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';

let srv;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-test-'));
const quiet = { info() {}, warn() {}, error: console.error };

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet, publicUrl: 'http://test.local' });
  base = srv.url;
  // The first Master Admin is created the same way as `npm run admin:create`.
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('admin@test.local', 'admin', 'Admin Singh', ?, 'admin')").run(await hashPassword('admin-password-1'));
});
after(() => { srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

/** A browser-like client with its own cookie jar. */
function client() {
  let cookie = '';
  async function call(method, url, body, headers = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-Sikhify-Request': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie();
    for (const s of set) {
      const [pair] = s.split(';');
      cookie = /=$/.test(pair) ? '' : pair;
    }
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }
  return {
    get: (u) => call('GET', u),
    post: (u, b = {}, h) => call('POST', u, b, h),
    patch: (u, b = {}) => call('PATCH', u, b),
    del: (u) => call('DELETE', u),
    raw: call,
  };
}

const guest = client();
const alice = client();
const bob = client();
const admin = client();
const mod = client();

test('signup validates input and creates a session', async () => {
  const bad = await alice.post('/api/auth/signup', { name: 'A', username: 'X', email: 'nope', password: '123' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.error.fields.username && bad.data.error.fields.email && bad.data.error.fields.password);

  const ok = await alice.post('/api/auth/signup', { name: 'Alice Kaur', username: 'alice', email: 'alice@test.local', password: 'alice-password' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.username, 'alice');
  assert.equal(ok.data.user.role, 'user');
  assert.equal(ok.data.user.permissions['admin.access'], false);
  const me = await alice.get('/api/auth/me');
  assert.equal(me.data.user.email, 'alice@test.local');

  const dupe = await bob.post('/api/auth/signup', { name: 'Bob', username: 'alice', email: 'alice@test.local', password: 'bob-password' });
  assert.equal(dupe.status, 422);
  const b = await bob.post('/api/auth/signup', { name: 'Bob Singh', username: 'bob', email: 'bob@test.local', password: 'bob-password' });
  assert.equal(b.status, 200);
  await mod.post('/api/auth/signup', { name: 'Mod Kaur', username: 'modk', email: 'mod@test.local', password: 'mod-password' });
});

test('mutations without the CSRF header are refused', async () => {
  const r = await alice.raw('POST', '/api/posts', { body: 'x' }, { 'X-Sikhify-Request': '' });
  assert.equal(r.status, 403);
});

test('login, logout and wrong passwords', async () => {
  const wrong = await admin.post('/api/auth/login', { identifier: 'admin', password: 'wrong-password' });
  assert.equal(wrong.status, 401);
  const ok = await admin.post('/api/auth/login', { identifier: 'admin@test.local', password: 'admin-password-1' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.permissions['admin.access'], true);
  const tmpClient = client();
  await tmpClient.post('/api/auth/login', { identifier: 'bob', password: 'bob-password' });
  assert.equal((await tmpClient.get('/api/auth/me')).data.user.username, 'bob');
  await tmpClient.post('/api/auth/logout');
  assert.equal((await tmpClient.get('/api/auth/me')).data.user, null);
});

test('guests and users cannot reach admin endpoints; admin can promote a moderator', async () => {
  assert.equal((await guest.get('/api/admin/dashboard')).status, 401);
  assert.equal((await alice.get('/api/admin/dashboard')).status, 403);
  assert.equal((await alice.get('/api/admin/users')).status, 403);
  const users = await admin.get('/api/admin/users?q=modk');
  const modId = users.data.items[0].id;
  const promote = await admin.patch(`/api/admin/users/${modId}`, { role: 'moderator' });
  assert.equal(promote.data.user.role, 'moderator');
  // moderators can moderate but not manage users
  assert.equal((await mod.get('/api/admin/dashboard')).status, 200);
  const modUsers = await mod.get('/api/admin/users');
  assert.equal(modUsers.status, 200);
  assert.equal(modUsers.data.items[0].email, undefined, 'moderators must not see emails');
  assert.equal((await mod.patch(`/api/admin/users/${modId}`, { role: 'admin' })).status, 403);
});

let postId;
test('posts: create, read as guest, edit own, cannot edit others', async () => {
  assert.equal((await guest.post('/api/posts', { body: 'hi' })).status, 401);
  const empty = await alice.post('/api/posts', { body: '   ' });
  assert.equal(empty.status, 422);
  const p = await alice.post('/api/posts', { body: 'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh! <script>alert(1)</script>' });
  assert.equal(p.status, 200);
  postId = p.data.post.id;
  assert.equal(p.data.post.canEdit, true);
  const feed = await guest.get('/api/posts?scope=feed');
  assert.ok(feed.data.items.some((x) => x.id === postId));
  const asGuest = feed.data.items.find((x) => x.id === postId);
  assert.equal(asGuest.canEdit, false);
  assert.equal(asGuest.author.email, undefined);
  assert.equal((await bob.patch(`/api/posts/${postId}`, { body: 'hijack' })).status, 403);
  const edit = await alice.patch(`/api/posts/${postId}`, { body: 'Edited post body' });
  assert.equal(edit.data.post.body, 'Edited post body');
  assert.ok(edit.data.post.editedAt);
});

test('reactions, saves, shares and notifications', async () => {
  const r = await bob.post(`/api/posts/${postId}/reaction`, { type: 'support' });
  assert.equal(r.data.post.reactions.support, 1);
  assert.equal(r.data.post.myReaction, 'support');
  const switched = await bob.post(`/api/posts/${postId}/reaction`, { type: 'like' });
  assert.deepEqual(switched.data.post.reactions, { like: 1 });
  const removed = await bob.post(`/api/posts/${postId}/reaction`, { type: null });
  assert.equal(removed.data.post.reactionCount, 0);
  assert.equal((await bob.post(`/api/posts/${postId}/reaction`, { type: 'bogus' })).status, 400);

  const saved = await bob.post(`/api/posts/${postId}/save`, { saved: true });
  assert.equal(saved.data.post.saved, true);
  const list = await bob.get('/api/posts?scope=saved');
  assert.deepEqual(list.data.items.map((x) => x.id), [postId]);
  await bob.post(`/api/posts/${postId}/save`, { saved: false });
  assert.equal((await bob.get('/api/posts?scope=saved')).data.items.length, 0);

  const share = await guest.post(`/api/posts/${postId}/share`);
  assert.equal(share.data.shareCount, 1);

  const n = await alice.get('/api/notifications');
  assert.ok(n.data.items.some((x) => x.type === 'reaction' && /Bob Singh/.test(x.message)));
  assert.ok(n.data.unread >= 1);
  const read = await alice.post('/api/notifications/read', { all: true });
  assert.equal(read.data.unread, 0);
});

test('comments: threaded replies, edit/delete own, likes, notifications', async () => {
  const c1 = await bob.post(`/api/posts/${postId}/comments`, { body: 'Beautiful, thank you' });
  assert.equal(c1.status, 200);
  const commentId = c1.data.commentId;
  const reply = await alice.post(`/api/posts/${postId}/comments`, { body: 'Thank you Bhai Ji', parentId: commentId });
  const replyId = reply.data.commentId;
  // A reply to a reply attaches to the root comment (one level of threading).
  const nested = await bob.post(`/api/posts/${postId}/comments`, { body: 'Ji', parentId: replyId });
  const root = nested.data.items.find((x) => x.id === commentId);
  assert.equal(root.replies.length, 2);

  assert.equal((await alice.patch(`/api/comments/${commentId}`, { body: 'hijack' })).status, 403);
  const edited = await bob.patch(`/api/comments/${commentId}`, { body: 'Beautiful — thank you' });
  assert.equal(edited.data.items[0].body, 'Beautiful — thank you');
  const liked = await alice.post(`/api/comments/${commentId}/like`, { liked: true });
  assert.equal(liked.data.items[0].likeCount, 1);

  const bn = await bob.get('/api/notifications');
  assert.ok(bn.data.items.some((x) => x.type === 'reply'));
  const an = await alice.get('/api/notifications');
  assert.ok(an.data.items.some((x) => x.type === 'comment'));

  // Only the comment's author or a moderator can delete it — not the post's author.
  assert.equal((await alice.del(`/api/comments/${commentId}`)).status, 403);
  assert.equal((await bob.del(`/api/comments/${commentId}`)).status, 200);
});

test('groups: public join/leave, private approval, group-admin scope', async () => {
  const bad = await alice.post('/api/groups', { name: 'x', description: 'short', category: 'Nope', privacy: 'secret' });
  assert.equal(bad.status, 422);
  const pub = await alice.post('/api/groups', { name: 'Seva Volunteers', description: 'Organising seva in our city', category: 'Seva', privacy: 'public' });
  assert.equal(pub.data.group.viewer.role, 'admin');
  const gid = pub.data.group.id;
  const joined = await bob.post(`/api/groups/${gid}/join`);
  assert.equal(joined.data.group.viewer.isMember, true);
  const gp = await bob.post('/api/posts', { body: 'Hello group', groupId: gid });
  assert.equal(gp.data.post.group.id, gid);
  const left = await bob.post(`/api/groups/${gid}/leave`);
  assert.equal(left.data.group.viewer.isMember, false);
  assert.equal((await bob.post('/api/posts', { body: 'not a member', groupId: gid })).status, 403);
  // The only admin cannot leave.
  assert.equal((await alice.post(`/api/groups/${gid}/leave`)).status, 409);

  const priv = await alice.post('/api/groups', { name: 'Gurmat Study Circle', description: 'A private study circle', category: 'Gurmat', privacy: 'private' });
  const pid = priv.data.group.id;
  await alice.post('/api/posts', { body: 'Private group post', groupId: pid });
  assert.equal((await guest.get(`/api/posts?scope=group:${pid}`)).status, 403);
  const req = await bob.post(`/api/groups/${pid}/join`);
  assert.equal(req.data.group.viewer.isPending, true);
  assert.equal((await bob.get(`/api/posts?scope=group:${pid}`)).status, 403);
  // Bob (not a group admin) cannot approve himself or edit the group.
  const bobId = (await bob.get('/api/auth/me')).data.user.id;
  assert.equal((await bob.patch(`/api/groups/${pid}/members/${bobId}`, { status: 'active' })).status, 403);
  assert.equal((await bob.patch(`/api/groups/${pid}`, { name: 'Taken over' })).status, 403);
  const members = await alice.get(`/api/groups/${pid}/members`);
  const bobRow = members.data.items.find((m) => m.user.username === 'bob');
  assert.equal(bobRow.status, 'pending');
  await alice.patch(`/api/groups/${pid}/members/${bobRow.user.id}`, { status: 'active' });
  const visible = await bob.get(`/api/posts?scope=group:${pid}`);
  assert.equal(visible.data.items.length, 1);
  assert.ok((await bob.get('/api/notifications')).data.items.some((x) => x.type === 'group_join_approved'));
  // Private-group posts never appear in the public feed.
  assert.ok(!(await guest.get('/api/posts?scope=feed')).data.items.some((x) => x.body === 'Private group post'));
});

test('reports and moderation', async () => {
  const p = await bob.post('/api/posts', { body: 'Spammy post buy now' });
  const pid = p.data.post.id;
  const rep = await alice.post('/api/reports', { targetType: 'post', targetId: pid, reason: 'Spam', details: 'advertising' });
  assert.equal(rep.status, 200);
  assert.equal((await alice.post('/api/reports', { targetType: 'post', targetId: pid, reason: 'Spam' })).status, 409);
  assert.equal((await alice.get('/api/admin/reports')).status, 403);
  const list = await mod.get('/api/admin/reports?status=pending');
  const report = list.data.items.find((r) => r.targetId === pid);
  assert.ok(report);
  const res = await mod.post(`/api/admin/reports/${report.id}/resolve`, { outcome: 'resolved', action: 'hide', note: 'spam' });
  assert.equal(res.status, 200);
  // Hidden: gone for everyone except the author and staff.
  assert.equal((await guest.get(`/api/posts/${pid}`)).status, 404);
  assert.equal((await bob.get(`/api/posts/${pid}`)).data.post.status, 'hidden');
  assert.ok((await alice.get('/api/notifications')).data.items.some((x) => x.type === 'report_resolved'));
});

test('suspended users can read but not post; banned users cannot sign in', async () => {
  const users = await admin.get('/api/admin/users?q=bob');
  const bobId = users.data.items[0].id;
  await admin.patch(`/api/admin/users/${bobId}`, { status: 'suspended' });
  assert.equal((await bob.post('/api/posts', { body: 'still here' })).status, 403);
  assert.equal((await bob.get('/api/posts?scope=feed')).status, 200);
  await admin.patch(`/api/admin/users/${bobId}`, { status: 'banned' });
  assert.equal((await bob.get('/api/auth/me')).data.user, null);
  const relog = client();
  assert.equal((await relog.post('/api/auth/login', { identifier: 'bob', password: 'bob-password' })).status, 403);
  await admin.patch(`/api/admin/users/${bobId}`, { status: 'active' });
  await bob.post('/api/auth/login', { identifier: 'bob', password: 'bob-password' });
});

test('Hukamnama: draft → publish → public read → unpublish → archive, with history', async () => {
  const today = (await guest.get('/api/hukamnama/today')).data;
  assert.equal(today.hukamnama, null, 'nothing published yet → client falls back to BaniDB');
  assert.equal((await alice.post('/api/admin/hukamnamas', { date: today.date })).status, 403);

  const draft = await admin.post('/api/admin/hukamnamas', { date: today.date, ang: 633, gurmukhi: 'ਜੋ ਨਰੁ ਦੁਖ ਮੈ ਦੁਖੁ ਨਹੀ ਮਾਨੈ ॥' });
  assert.equal(draft.data.hukamnama.status, 'draft');
  const id = draft.data.hukamnama.id;
  assert.equal((await guest.get('/api/hukamnama/today')).data.hukamnama, null, 'drafts are never public');

  const incomplete = await admin.post(`/api/admin/hukamnamas/${id}/status`, { status: 'published' });
  assert.equal(incomplete.status, 422);
  assert.ok(incomplete.data.error.fields.source && incomplete.data.error.fields.english);

  await admin.patch(`/api/admin/hukamnamas/${id}`, { english: 'That man who, in the midst of pain, does not feel pain…', source: 'Sri Harmandir Sahib, Amritsar (SGPC)', audioUrl: 'javascript:alert(1)' })
    .then((r) => assert.equal(r.status, 422, 'non-http audio URLs are rejected'));
  await admin.patch(`/api/admin/hukamnamas/${id}`, { english: 'That man who, in the midst of pain, does not feel pain…', source: 'Sri Harmandir Sahib, Amritsar (SGPC)' });
  const pub = await admin.post(`/api/admin/hukamnamas/${id}/status`, { status: 'published' });
  assert.equal(pub.data.hukamnama.status, 'published');

  const live = (await guest.get('/api/hukamnama/today')).data.hukamnama;
  assert.equal(live.ang, 633);
  assert.equal((await guest.get(`/api/hukamnama/date/${today.date}`)).data.hukamnama.id, id);

  // A second record for the same date needs explicit replacement.
  const second = await admin.post('/api/admin/hukamnamas', { date: today.date, ang: 1, gurmukhi: 'ੴ', english: 'One', source: 'Test' });
  const conflict = await admin.post(`/api/admin/hukamnamas/${second.data.hukamnama.id}/status`, { status: 'published' });
  assert.equal(conflict.status, 409);
  await admin.post(`/api/admin/hukamnamas/${second.data.hukamnama.id}/status`, { status: 'archived' });

  const unpub = await admin.post(`/api/admin/hukamnamas/${id}/status`, { status: 'draft' });
  assert.equal(unpub.data.hukamnama.status, 'draft');
  assert.equal((await guest.get('/api/hukamnama/today')).data.hukamnama, null);
  await admin.post(`/api/admin/hukamnamas/${id}/status`, { status: 'archived' });
  const detail = await admin.get(`/api/admin/hukamnamas/${id}`);
  assert.deepEqual(detail.data.history.map((h) => h.action).reverse(), ['created', 'updated', 'published', 'unpublished', 'archived']);
  const filtered = await admin.get(`/api/admin/hukamnamas?status=archived&from=${today.date}&to=${today.date}`);
  assert.equal(filtered.data.items.length, 2);
  // Moderators manage content too; users never.
  assert.equal((await mod.get('/api/admin/hukamnamas')).status, 200);
});

test('media: catalog seeded from data/media.js; admin adds a video by URL', async () => {
  const cat = (await guest.get('/api/media')).data;
  assert.equal(cat.artists.length, 24);
  assert.ok(cat.categories.includes('Kirtan'));
  const anyVideo = cat.artists[0].videos[0].id;
  const detail = await guest.get(`/api/media/videos/${anyVideo}`);
  assert.equal(detail.data.artist.id, cat.artists[0].id);
  assert.equal((await guest.get('/api/media/videos/not-an-id')).status, 404);

  const artistId = cat.artists[0].id;
  assert.equal((await alice.post(`/api/admin/media/artists/${artistId}/videos`, { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'x' })).status, 403);
  const badUrl = await admin.post(`/api/admin/media/artists/${artistId}/videos`, { url: 'https://example.com/video', title: 'x' });
  assert.equal(badUrl.status, 422);
  const dupe = await admin.post(`/api/admin/media/artists/${artistId}/videos`, { url: `https://www.youtube.com/shorts/${anyVideo}`, title: 'dupe' });
  assert.equal(dupe.status, 409);
  const add = await admin.post(`/api/admin/media/artists/${artistId}/videos`, { url: 'https://youtube.com/embed/AAAAAAAAAAA', title: 'Test video', channel: 'Test', status: 'draft' });
  assert.equal(add.data.video.id, 'AAAAAAAAAAA');
  // Drafts are not public.
  assert.ok(!(await guest.get('/api/media')).data.artists[0].videos.some((v) => v.id === 'AAAAAAAAAAA'));
  await admin.del('/api/admin/media/videos/AAAAAAAAAAA');
});

test('directory entries: validation, source required to publish, public visibility', async () => {
  const bad = await admin.post('/api/admin/entries', { type: 'organization', title: '', org_type: '', website: 'not a url' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.error.fields.title && bad.data.error.fields.org_type && bad.data.error.fields.website);
  const noSource = await admin.post('/api/admin/entries', { type: 'website', title: 'Example', url: 'https://example.org', category: 'Gurbani', publishStatus: 'published' });
  assert.equal(noSource.status, 422);
  const ok = await admin.post('/api/admin/entries', { type: 'website', title: 'Example', url: 'https://example.org', category: 'Gurbani', publishStatus: 'published', verificationStatus: 'verified', references: 'Official site | https://example.org' });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.entry.verification.lastVerifiedAt);
  const pub = await guest.get('/api/entries?type=websites');
  assert.equal(pub.data.items.length, 1);
  const one = await guest.get(`/api/entries/website/${ok.data.entry.slug}`);
  assert.equal(one.data.entry.fields.url, 'https://example.org');
  const draft = await admin.post('/api/admin/entries', { type: 'event', title: 'Draft event', event_type: 'Samagam', start_date: '2030-01-01', venue: 'Hall', city: 'Delhi', official_source: 'https://example.org/e' });
  assert.equal((await guest.get(`/api/entries/event/${draft.data.entry.slug}`)).status, 404);
  assert.equal((await guest.get('/api/entries/summary')).data.counts.website, 1);
  await admin.del(`/api/admin/entries/${ok.data.entry.id}`);
});

test('submissions: pending → review → published, never auto-published', async () => {
  const bad = await alice.post('/api/submissions', { kind: 'organization', data: { title: 'Test Seva Society' } });
  assert.equal(bad.status, 422);
  const sub = await alice.post('/api/submissions', { kind: 'organization', source: 'https://example.org/org', data: { title: 'Test Seva Society', org_type: 'Charity / Seva', website: 'https://example.org/org', country: 'India', city: 'Amritsar' } });
  assert.equal(sub.data.submission.status, 'pending');
  assert.equal((await guest.get('/api/entries?type=organization')).data.items.length, 0);
  assert.equal((await alice.post(`/api/admin/submissions/${sub.data.submission.id}/review`, { decision: 'publish' })).status, 403);
  const rejectNoNote = await mod.post(`/api/admin/submissions/${sub.data.submission.id}/review`, { decision: 'reject' });
  assert.equal(rejectNoNote.status, 422);
  const reviewed = await mod.post(`/api/admin/submissions/${sub.data.submission.id}/review`, { decision: 'publish', note: 'Checked against the source' });
  assert.equal(reviewed.data.submission.status, 'published');
  const list = await guest.get('/api/entries?type=organization&q=Seva');
  assert.equal(list.data.items[0].title, 'Test Seva Society');
  const facets = await guest.get('/api/entries/facets?type=organization');
  assert.deepEqual(facets.data.categories, [{ value: 'Charity / Seva', n: 1 }]);
  assert.ok((await alice.get('/api/notifications')).data.items.some((x) => x.type === 'submission_reviewed'));
  assert.equal((await alice.get('/api/me/submissions')).data.items[0].status, 'published');
});

test('uploads accept real images only', async () => {
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
  const ok = await alice.post('/api/uploads', { purpose: 'avatar', dataUrl: png });
  assert.equal(ok.status, 200);
  assert.match(ok.data.url, /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.png$/);
  const fake = 'data:image/png;base64,' + Buffer.from('<svg onload=alert(1)>').toString('base64');
  assert.equal((await alice.post('/api/uploads', { purpose: 'avatar', dataUrl: fake })).status, 400);
  const prof = await alice.patch('/api/me/profile', { avatarUrl: ok.data.url, bio: 'Learning Gurmukhi', location: 'Toronto', showLocation: false });
  assert.equal(prof.data.user.avatarUrl, ok.data.url);
  // Bob cannot use Alice's upload as his avatar.
  assert.equal((await bob.patch('/api/me/profile', { avatarUrl: ok.data.url })).status, 422);
  // Location is private unless shared.
  assert.equal((await guest.get('/api/users/alice')).data.profile.location, '');
  const img = await fetch(base + ok.data.url);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
});

test('search index contains only public database records', async () => {
  const idx = (await guest.get('/api/search/index')).data;
  assert.equal(idx.media.artists.length, 24);
  assert.ok(idx.records.some((r) => r.type === 'Organization' && r.title === 'Test Seva Society'));
  assert.ok(idx.records.some((r) => r.type === 'Group' && r.title === 'Seva Volunteers'));
  assert.ok(!idx.records.some((r) => r.title === 'Gurmat Study Circle'), 'private groups are not indexed');
  assert.ok(!idx.records.some((r) => /Private group post|Spammy/.test(r.title)), 'private and hidden posts are not indexed');
});

test('settings are enforced: closed registration, read-only community', async () => {
  assert.equal((await mod.patch('/api/admin/settings', { registration_open: false })).status, 403);
  await admin.patch('/api/admin/settings', { registration_open: false, community_read_only: true });
  const c = client();
  assert.equal((await c.post('/api/auth/signup', { name: 'New Person', username: 'newp', email: 'new@test.local', password: 'new-password' })).status, 403);
  assert.equal((await alice.post('/api/posts', { body: 'read only?' })).status, 403);
  assert.equal((await mod.post('/api/posts', { body: 'Staff can still post announcements' })).status, 200);
  await admin.patch('/api/admin/settings', { registration_open: true, community_read_only: false });
});

test('password reset: token works once and signs out other sessions', async () => {
  const users = await admin.get('/api/admin/users?q=alice');
  const link = (await admin.post(`/api/admin/users/${users.data.items[0].id}/reset-link`)).data.link;
  const token = new URL(link).searchParams.get('token');
  const r = await guest.post('/api/auth/reset-password', { token, password: 'new-alice-password' });
  assert.equal(r.status, 200);
  assert.equal((await guest.post('/api/auth/reset-password', { token, password: 'again-password' })).status, 400);
  assert.equal((await alice.get('/api/auth/me')).data.user, null, 'old sessions are revoked');
  assert.equal((await alice.post('/api/auth/login', { identifier: 'alice', password: 'new-alice-password' })).status, 200);
  const forgot = await guest.post('/api/auth/forgot-password', { email: 'nobody@test.local' });
  assert.equal(forgot.status, 200, 'same answer whether or not the account exists');
});

test('analytics are computed from real rows', async () => {
  const a = (await admin.get('/api/admin/analytics')).data;
  assert.equal(a.signups.length, 30);
  assert.equal(a.signups.reduce((s, d) => s + d.value, 0), 4, 'admin + alice + bob + mod');
  const dash = (await admin.get('/api/admin/dashboard')).data;
  assert.equal(dash.counts.users, 4);
});
