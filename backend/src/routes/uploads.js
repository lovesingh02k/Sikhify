/* ==========================================================================
   Sikhify API — routes/uploads.js
   Image uploads (profile photos, post images, group covers, Gurdwara and
   festival photos). The browser resizes images before sending them as a data
   URL. The server trusts nothing it is told: the type is detected from the
   file's own bytes (PNG, JPEG, WebP, GIF only), the size is capped, and files
   get random names. SVG and other active formats are never accepted.

   Every image is then optimised (lib/images.js) before it is stored: decoded
   under pixel/time limits, oriented, stripped of metadata, resized to what its
   purpose needs and re-encoded (usually WebP) — only the optimised bytes are
   kept. A file that can't be processed is rejected, never stored as it came.
   Each account has a storage quota, counted on the stored (optimised) bytes.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { badRequest, HttpError, oneOf } from '../lib/http.js';
import { optimizeImage, ImageError, THUMB_WIDTH, variantPath } from '../lib/images.js';
import { LIMITS } from '../../../shared/community.js';
import { can } from '../../../shared/roles.js';

const PURPOSES = ['avatar', 'post', 'group-cover', 'gurdwara', 'festival', 'banner'];
/** Photos for the directory, festival pages and homepage banners are added by staff only. */
const STAFF_PURPOSES = ['gurdwara', 'festival', 'banner'];

export function sniff(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { mime: 'image/png', ext: 'png' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.length > 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return { mime: 'image/gif', ext: 'gif' };
  return null;
}

export const quotaFor = (user) => (can(user, 'content.manage') ? LIMITS.uploadQuotaBytesStaff : LIMITS.uploadQuotaBytes);

export default function register(router, { db, config, rate, log }) {
  router.post('/api/uploads', async (c) => {
    const user = c.require('upload.create');
    rate('upload', 'upload:' + user.id);
    const purpose = oneOf(c.body.purpose, PURPOSES);
    if (!purpose) throw badRequest('Unknown upload purpose');
    if (STAFF_PURPOSES.includes(purpose) && !can(user, 'content.manage')) throw new HttpError(403, "You don't have permission to do that");
    const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(c.body.dataUrl || ''));
    if (!m) throw badRequest('Send the image as a data URL');
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) throw badRequest('The image is empty');
    if (buf.length > LIMITS.uploadBytes) throw new HttpError(413, `Images must be ${Math.round(LIMITS.uploadBytes / 1048576)} MB or smaller`);
    const type = sniff(buf);
    if (!type) throw badRequest('Only PNG, JPEG, WebP or GIF images can be uploaded');

    let image;
    try {
      image = await optimizeImage(buf, { purpose, sniffedMime: type.mime });
    } catch (err) {
      if (err instanceof ImageError) throw badRequest(err.message);
      log.error('[uploads] image processing failed', err && err.message);
      throw new HttpError(422, "This image couldn't be processed. Please try a different image.");
    }

    // Feed photos also get a display-size variant for the feed (made from the original upload, not from
    // the re-encoded copy, so it is compressed once). Opening the photo shows the full-size image.
    let thumb = null;
    if (purpose === 'post' && Math.max(image.width, image.height) > THUMB_WIDTH && image.mime !== 'image/gif') {
      try { thumb = await optimizeImage(buf, { purpose: 'post-thumb', sniffedMime: type.mime }); } catch (err) {
        log.warn?.('[uploads] feed preview could not be made; the full image will be used', err && err.message);
      }
    }

    const used = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS n FROM uploads WHERE owner_id = ?').get(user.id).n;
    const quota = quotaFor(user);
    if (used + image.bytes + (thumb ? thumb.bytes : 0) > quota) {
      throw new HttpError(413, `Your image storage is full (${Math.round(quota / 1048576)} MB). Remove some older images and try again.`);
    }

    const now = new Date();
    const rel = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(16).toString('hex')}.${image.ext}`;
    if (!config.databaseUrl) {
      const file = path.join(config.uploadDir, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, image.buffer, { flag: 'wx' });
    }
    db.prepare('INSERT INTO uploads (owner_id, path, mime, bytes, purpose, data, optimized_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(user.id, rel, image.mime, image.bytes, purpose, image.buffer, now.toISOString());
    if (thumb) {
      const thumbRel = variantPath(rel);
      if (!config.databaseUrl) fs.writeFileSync(path.join(config.uploadDir, thumbRel), thumb.buffer, { flag: 'wx' });
      db.prepare('INSERT INTO uploads (owner_id, path, mime, bytes, purpose, data, optimized_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(user.id, thumbRel, thumb.mime, thumb.bytes, 'post-thumb', thumb.buffer, now.toISOString());
    }
    return {
      url: '/uploads/' + rel, width: image.width, height: image.height, bytes: image.bytes, originalBytes: image.inputBytes,
      ...(thumb ? { thumbUrl: '/uploads/' + variantPath(rel), thumbWidth: thumb.width, thumbHeight: thumb.height, thumbBytes: thumb.bytes } : {}),
    };
  }, { upload: true });

  /** How much of the quota the signed-in member has used. */
  router.get('/api/uploads/usage', (c) => {
    const user = c.requireUser();
    const row = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS bytes, COUNT(*) AS files FROM uploads WHERE owner_id = ?').get(user.id);
    return { bytes: row.bytes, files: row.files, quota: quotaFor(user) };
  });
}
