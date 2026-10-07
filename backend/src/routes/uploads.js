/* ==========================================================================
   Sikhify API — routes/uploads.js
   Image uploads (profile photos, post images, group covers). The browser
   resizes images before sending them as a data URL. The server trusts nothing
   it is told: the type is detected from the file's own bytes (PNG, JPEG,
   WebP, GIF only), the size is capped, and files get random names. SVG and
   other active formats are never accepted.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { badRequest, HttpError, oneOf } from '../lib/http.js';
import { LIMITS } from '../../../shared/community.js';
import { can } from '../../../shared/roles.js';

const PURPOSES = ['avatar', 'post', 'group-cover', 'gurdwara'];

function sniff(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { mime: 'image/png', ext: 'png' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.length > 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return { mime: 'image/gif', ext: 'gif' };
  return null;
}

export default function register(router, { db, config, rate }) {
  router.post('/api/uploads', (c) => {
    const user = c.require('upload.create');
    rate('upload', 'upload:' + user.id);
    const purpose = oneOf(c.body.purpose, PURPOSES);
    if (!purpose) throw badRequest('Unknown upload purpose');
    // Directory photos are added by staff only (each needs a credit and licence).
    if (purpose === 'gurdwara' && !can(user, 'content.manage')) throw new HttpError(403, "You don't have permission to do that");
    const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(c.body.dataUrl || ''));
    if (!m) throw badRequest('Send the image as a data URL');
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) throw badRequest('The image is empty');
    if (buf.length > LIMITS.uploadBytes) throw new HttpError(413, `Images must be ${Math.round(LIMITS.uploadBytes / 1048576)} MB or smaller`);
    const type = sniff(buf);
    if (!type) throw badRequest('Only PNG, JPEG, WebP or GIF images can be uploaded');

    const now = new Date();
    const rel = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
    if (!config.databaseUrl) {
      const file = path.join(config.uploadDir, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buf, { flag: 'wx' });
    }
    db.prepare('INSERT INTO uploads (owner_id, path, mime, bytes, purpose, data) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, rel, type.mime, buf.length, purpose, buf);
    return { url: '/uploads/' + rel };
  }, { upload: true });
}
