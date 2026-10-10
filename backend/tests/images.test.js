/* ==========================================================================
   Image optimisation (lib/images.js) and the upload endpoint: real images from
   the repo plus generated edge cases. Prints a before/after size table.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { optimizeImage, MAX_SIDE } from '../src/lib/images.js';
import { sniff } from '../src/routes/uploads.js';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';
import { LIMITS } from '../../shared/community.js';

const repo = (p) => fileURLToPath(new URL('../../' + p, import.meta.url));
const run = (buf, purpose = 'post') => optimizeImage(buf, { purpose, sniffedMime: sniff(buf).mime });
const report = [];
/** Peak signal-to-noise ratio between two equal-length RGBA buffers (∞ when identical; ≥ 40 dB is visually lossless). */
/** Differences a viewer could see: alpha anywhere, colour wherever a pixel isn't fully transparent. */
const visibleDiff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] !== b[i + 3]) n++; else if (a[i + 3] > 0 && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) n++; } return n; };
const psnrOf = (a, b) => { let se = 0; for (let i = 0; i < a.length; i++) se += (a[i] - b[i]) ** 2; const mse = se / a.length; return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse); };
const row = (name, r) => report.push({ name, before: r.inputBytes, after: r.bytes, saved: `${(100 * (1 - r.bytes / r.inputBytes)).toFixed(1)}%`, strategy: r.strategy, size: `${r.width}×${r.height}` });

/* A transparent logo-like graphic: a gold disc on a fully transparent background. */
const logo = () => sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: Buffer.from('<svg width="600" height="600"><circle cx="300" cy="300" r="220" fill="#F0A93B"/><rect x="250" y="80" width="100" height="440" fill="#0F2242"/></svg>'), top: 0, left: 0 }])
  .png().toBuffer();

test('real photos/artwork (as the browser now uploads them: JPEG 0.92) → WebP, smaller, same size, decodes', async () => {
  for (const p of ['frontend/src/assets/images/history/harmandir-sahib-carpenter-1854-640.jpg', 'frontend/src/assets/images/gurbani/illuminated-folio-480.jpg', 'frontend/src/assets/images/gurus/guru-nanak-dev-ji-480.jpg']) {
    const asUploaded = await sharp(fs.readFileSync(repo(p))).jpeg({ quality: 92 }).toBuffer();
    const r = await run(asUploaded);
    row(path.basename(p) + ' (q92 upload)', r);
    const m = await sharp(r.buffer).metadata();
    const src = await sharp(asUploaded).metadata();
    assert.equal(m.format, 'webp', r.strategy);
    const [a, b] = await Promise.all([sharp(asUploaded).ensureAlpha().raw().toBuffer(), sharp(r.buffer).ensureAlpha().raw().toBuffer()]);
    report[report.length - 1].psnr = psnrOf(a, b).toFixed(1) + ' dB';
    assert.ok(psnrOf(a, b) >= 35, 'visually close to the upload');
    assert.deepEqual([m.width, m.height], [src.width, src.height], 'no resize needed, no upscaling');
    assert.ok(r.bytes < asUploaded.length, `${p}: ${r.bytes} < ${asUploaded.length}`);
  }
});

test('a larger camera-style photo (2400×1800, JPEG 0.92) is resized to the purpose limit and much smaller', async () => {
  const big = await sharp(fs.readFileSync(repo('frontend/src/assets/images/gurbani/illuminated-folio-480.jpg'))).resize(2400, 1800, { fit: 'fill' }).jpeg({ quality: 92 }).toBuffer();
  const r = await run(big, 'post');
  row('2400×1800 photo (q92) → post', r);
  assert.equal(Math.max(r.width, r.height), MAX_SIDE.post);
  assert.equal(Math.round(r.width / r.height * 100), Math.round(2400 / 1800 * 100), 'aspect ratio kept');
  const avatar = await run(big, 'avatar');
  row('2400×1800 photo (q92) → avatar', avatar);
  assert.equal(Math.max(avatar.width, avatar.height), MAX_SIDE.avatar);
});

test('the site icons (PNG graphics) are stored losslessly — never degraded', async () => {
  for (const p of ['frontend/public/icon-512.png', 'frontend/public/icon-192.png', 'frontend/public/apple-touch-icon.png', 'frontend/public/favicon-32.png']) {
    const buf = fs.readFileSync(repo(p));
    const r = await run(buf);
    row(path.basename(p), r);
    if (r.mime === 'image/webp') {
      assert.match(r.strategy, /lossless/, 'graphics never take the lossy photo path');
      const [a, b] = await Promise.all([sharp(buf).ensureAlpha().raw().toBuffer(), sharp(r.buffer).ensureAlpha().raw().toBuffer()]);
      if (/^webp lossless/.test(r.strategy)) assert.equal(visibleDiff(a, b), 0, `${p}: every visible pixel unchanged`);
      else {
        const psnr = psnrOf(a, b);
        report[report.length - 1].psnr = psnr.toFixed(1) + ' dB';
        assert.ok(psnr >= 40, `${p}: near-lossless PSNR ${psnr.toFixed(1)} dB`);
      }
    }
    assert.ok(r.bytes <= buf.length);
  }
});

test('transparency is preserved exactly', async () => {
  const buf = await logo();
  const r = await run(buf);
  row('transparent logo (PNG)', r);
  assert.equal(r.mime, 'image/webp');
  const { data, info } = await sharp(r.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  assert.equal(data[3], 0, 'the corner stays fully transparent');
  const centre = (300 * info.width + 300) * 4;
  assert.equal(data[centre + 3], 255, 'the logo stays fully opaque');
});

test('EXIF orientation is applied and all metadata (incl. GPS) removed', async () => {
  const src = await sharp(fs.readFileSync(repo('frontend/src/assets/images/history/harmandir-sahib-carpenter-1854-640.jpg')))
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'test' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '31/1 37/1 12/1' } } }).jpeg({ quality: 92 }).toBuffer();
  const before = await sharp(src).metadata();
  assert.equal(before.orientation, 6); assert.ok(before.exif);
  const r = await run(src);
  const m = await sharp(r.buffer).metadata();
  assert.deepEqual([m.width, m.height], [before.height, before.width], 'rotated 90° as the camera intended');
  assert.ok(!m.exif && !m.orientation, 'no EXIF / GPS left');
});

test('already-optimised images are kept byte-for-byte (no second lossy pass)', async () => {
  const webp = await sharp(fs.readFileSync(repo('frontend/src/assets/images/gurus/guru-nanak-dev-ji-480.jpg'))).webp({ quality: 80 }).toBuffer();
  const r = await run(webp);
  row('optimised WebP (q80)', r);
  assert.equal(r.strategy, 'kept: already optimised');
  assert.ok(r.buffer.equals(webp));
});

test('small images are never upscaled', async () => {
  const tiny = await sharp(fs.readFileSync(repo('frontend/public/favicon-32.png'))).png().toBuffer();
  const r = await run(tiny, 'group-cover');
  assert.deepEqual([r.width, r.height], [32, 32]);
});

test('animated GIFs are validated and kept', async () => {
  const twoFrames = await sharp([await sharp({ create: { width: 40, height: 40, channels: 3, background: '#F0A93B' } }).png().toBuffer(),
    await sharp({ create: { width: 40, height: 40, channels: 3, background: '#0F2242' } }).png().toBuffer()], { join: { animated: true } }).gif().toBuffer();
  const meta = await sharp(twoFrames, { animated: true }).metadata();
  assert.equal(meta.pages, 2);
  const r = await run(twoFrames);
  assert.equal(r.strategy, 'kept: animated GIF');
  assert.ok(r.buffer.equals(twoFrames));
});

test('rejected: decompression bombs, oversized sides, truncated files and mismatched types', async () => {
  // 20000×20000 of one colour compresses to a few KB but would need ~1.6 GB to decode.
  const bomb = await sharp({ create: { width: 20000, height: 20000, channels: 3, background: '#000' }, limitInputPixels: false }).png({ compressionLevel: 9 }).toBuffer();
  assert.ok(bomb.length < LIMITS.uploadBytes, 'small enough to pass the byte limit');
  await assert.rejects(run(bomb), /too large|too many pixels/i);
  const wide = await sharp({ create: { width: 13000, height: 10, channels: 3, background: '#000' } }).png().toBuffer();
  await assert.rejects(run(wide), /too large/i);
  const jpg = await sharp(fs.readFileSync(repo('frontend/src/assets/images/gurus/guru-nanak-dev-ji-480.jpg'))).jpeg({ quality: 92 }).toBuffer();
  await assert.rejects(run(jpg.subarray(0, Math.floor(jpg.length / 2))), /damaged|couldn't be read/i);
  const png = await logo();
  await assert.rejects(optimizeImage(png, { purpose: 'post', sniffedMime: 'image/jpeg' }), /don't match/i);
});

/* ---------- through the upload API */
let srv; let base; let cookieUser = ''; let cookieAdmin = '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-img-'));
before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'img.db'), uploadDir: path.join(tmp, 'up'), serveStatic: false, log: { info() {}, warn() {}, error() {} }, publicUrl: 'http://test.local' });
  base = srv.url;
  const h = await hashPassword('password-1234');
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('m@test.local', 'imgmember', 'Member', ?, 'user'), ('a@test.local', 'imgadmin', 'Admin', ?, 'admin')").run(h, h);
  const signIn = async (identifier) => {
    const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sikhify-Request': '1' }, body: JSON.stringify({ identifier, password: 'password-1234' }) });
    return r.headers.getSetCookie()[0].split(';')[0];
  };
  cookieUser = await signIn('imgmember');
  cookieAdmin = await signIn('imgadmin');
});
after(() => {
  srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\nImage optimisation — measured sizes (bytes):');
  console.table(report);
});
const upload = (cookie, buf, purpose = 'post') => fetch(base + '/api/uploads', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sikhify-Request': '1', Cookie: cookie },
  body: JSON.stringify({ purpose, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` }),
}).then(async (r) => ({ status: r.status, data: await r.json() }));

test('upload API: stores only the optimised WebP and serves it with the right type', async () => {
  const jpg = await sharp(fs.readFileSync(repo('frontend/src/assets/images/gurbani/illuminated-folio-480.jpg'))).jpeg({ quality: 92 }).toBuffer();
  const r = await upload(cookieUser, jpg);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.match(r.data.url, /\.webp$/);
  assert.ok(r.data.bytes < r.data.originalBytes);
  const stored = srv.db.prepare('SELECT mime, bytes, length(data) AS len, optimized_at FROM uploads WHERE path = ?').get(r.data.url.replace('/uploads/', ''));
  assert.deepEqual([stored.mime, stored.bytes, stored.len], ['image/webp', r.data.bytes, r.data.bytes]);
  assert.ok(stored.optimized_at);
  const served = await fetch(base + r.data.url);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal((await served.arrayBuffer()).byteLength, r.data.bytes);
});

test('upload API: damaged images are rejected and nothing is stored', async () => {
  const before = srv.db.prepare('SELECT COUNT(*) AS n FROM uploads').get().n;
  const jpg = await sharp(fs.readFileSync(repo('frontend/src/assets/images/gurus/guru-nanak-dev-ji-480.jpg'))).jpeg({ quality: 92 }).toBuffer();
  const r = await upload(cookieUser, jpg.subarray(0, 4000));
  assert.equal(r.status, 400);
  assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM uploads').get().n, before);
});

test('upload API: festival photos are staff-only; quotas count stored bytes', async () => {
  const png = await logo();
  assert.equal((await upload(cookieUser, png, 'festival')).status, 403);
  assert.equal((await upload(cookieAdmin, png, 'festival')).status, 200);
  // Fill the member's quota (pretend earlier uploads), then the next upload is refused.
  const member = srv.db.prepare("SELECT id FROM users WHERE username = 'imgmember'").get().id;
  srv.db.prepare("INSERT INTO uploads (owner_id, path, mime, bytes, purpose) VALUES (?, 'quota/filler.webp', 'image/webp', ?, 'post')").run(member, LIMITS.uploadQuotaBytes);
  const r = await upload(cookieUser, png);
  assert.equal(r.status, 413);
  assert.match(r.data.error.message, /storage is full/);
  const usage = await fetch(base + '/api/uploads/usage', { headers: { Cookie: cookieUser } }).then((x) => x.json());
  assert.ok(usage.bytes >= LIMITS.uploadQuotaBytes && usage.quota === LIMITS.uploadQuotaBytes);
});
