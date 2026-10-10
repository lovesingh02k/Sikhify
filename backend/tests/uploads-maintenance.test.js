/* ==========================================================================
   Upload maintenance: the reference scanner, the cleanup dry run, and the
   resumable, reversible optimisation of images uploaded before optimisation.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openDatabase } from '../src/db/database.js';
import { findUploadReferences } from '../src/lib/uploadRefs.js';
import { unusedUploads } from '../scripts/cleanup-uploads.js';
import { optimizeUploads, rollbackUploads } from '../scripts/optimize-uploads.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-upm-'));
const db = openDatabase(path.join(tmp, 'm.db'));
const repo = (p) => fileURLToPath(new URL('../../' + p, import.meta.url));
const old = '2026-01-01T00:00:00.000Z';

// Legacy uploads as the old client made them (JPEG 0.86), referenced from different places.
const legacyJpeg = await sharp(fs.readFileSync(repo('frontend/src/assets/images/gurbani/illuminated-folio-480.jpg'))).resize(1200).jpeg({ quality: 86 }).toBuffer();
db.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar_url) VALUES (1, 'u@t.l', 'u1', 'U', 'x', '/uploads/2026/01/avatar.jpg')").run();
const add = (p, purpose, data = legacyJpeg) => db.prepare('INSERT INTO uploads (owner_id, path, mime, bytes, purpose, data, created_at) VALUES (1, ?, ?, ?, ?, ?, ?)').run(p, 'image/jpeg', data.length, purpose, data, old);
add('2026/01/avatar.jpg', 'avatar');
add('2026/01/post-a.jpg', 'post');
add('2026/01/orphan.jpg', 'post');
db.prepare("INSERT INTO posts (author_id, body, images) VALUES (1, 'hi', ?)").run(JSON.stringify(['/uploads/2026/01/post-a.jpg']));
db.prepare("INSERT INTO uploads (owner_id, path, mime, bytes, purpose, data) VALUES (1, '2026/10/fresh.jpg', 'image/jpeg', 3, 'post', x'FFD8FF')").run();

test('references are found in plain and JSON columns', () => {
  const refs = findUploadReferences(db);
  assert.deepEqual(refs.get('2026/01/avatar.jpg'), ['users.avatar_url#1']);
  assert.ok(refs.get('2026/01/post-a.jpg')[0].startsWith('posts.images#'));
  assert.ok(!refs.has('2026/01/orphan.jpg'));
});

test('cleanup lists only old, unreferenced uploads (nothing is deleted by the dry run)', () => {
  assert.deepEqual(unusedUploads(db, { minAgeDays: 7 }).map((u) => u.path), ['2026/01/orphan.jpg']);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM uploads').get().n, 4);
});

test('optimising existing uploads: dry run, apply, resume, rollback', async () => {
  const before = db.prepare('SELECT id, path, data FROM uploads ORDER BY id').all();
  const dry = await optimizeUploads(db, {});
  assert.equal(dry.optimised, 3);
  assert.ok(dry.after < dry.before, `${dry.before} → ${dry.after}`);
  assert.deepEqual(db.prepare('SELECT data FROM uploads ORDER BY id').all().map((r) => Buffer.from(r.data).length), before.map((r) => Buffer.from(r.data).length), 'dry run wrote nothing');

  const part = await optimizeUploads(db, { apply: true, limit: 2 });
  assert.equal(part.checked, 2);
  const rest = await optimizeUploads(db, { apply: true });
  assert.equal(rest.checked, 2, 'the second run continues where the first stopped');
  assert.equal((await optimizeUploads(db, { apply: true })).checked, 0, 'nothing left to do');

  const avatar = db.prepare("SELECT mime, bytes, data FROM uploads WHERE path = '2026/01/avatar.jpg'").get();
  assert.equal(avatar.mime, 'image/webp', 'same path/URL, new bytes and type');
  assert.ok(avatar.bytes < legacyJpeg.length);
  assert.equal((await sharp(Buffer.from(avatar.data)).metadata()).width, 512, 'avatars are resized to what they need');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM upload_originals').get().n, 3);

  assert.equal(rollbackUploads(db), 3);
  const restored = db.prepare('SELECT id, data FROM uploads ORDER BY id').all();
  restored.forEach((r, i) => assert.ok(Buffer.from(r.data).equals(Buffer.from(before[i].data)), 'byte-for-byte original'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM upload_originals').get().n, 0);
});

test('cleanup', () => { db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
