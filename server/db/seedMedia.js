/* ==========================================================================
   Sikhify API — db/seedMedia.js
   On the first start, imports the existing, verified Sikh Media catalogue
   (src/data/media.js — every video ID checked against YouTube oEmbed) into the
   database. After that the database is the source of truth and admins manage
   artists and videos from /admin/media; the bundled file remains only as the
   offline fallback for static hosting.
   ========================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT } from '../config.js';
import { transaction } from './database.js';

export async function seedMediaIfEmpty(db, log = () => {}) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM media_categories').get();
  if (n > 0) return false;

  // data/media.js is a browser module that writes to window.SikhifyData.
  const hadWindow = 'window' in globalThis;
  if (!hadWindow) globalThis.window = {};
  let media;
  try {
    const mod = await import(pathToFileURL(path.join(ROOT, 'src/data/media.js')).href);
    media = mod.default;
  } finally {
    if (!hadWindow) delete globalThis.window;
  }
  if (!media || !Array.isArray(media.artists)) return false;

  transaction(db, () => {
    const cat = db.prepare('INSERT INTO media_categories (name, sort) VALUES (?, ?)');
    media.categories.forEach((c, i) => cat.run(c, i));
    const artist = db.prepare(`INSERT INTO media_artists (id, name, sort_name, category, location, description, keywords, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'published')`);
    const video = db.prepare(`INSERT OR IGNORE INTO media_videos (id, artist_id, title, channel, sort, status) VALUES (?, ?, ?, ?, ?, 'published')`);
    for (const a of media.artists) {
      artist.run(a.id, a.name, a.sortName, a.category, a.location || '', a.description || '', JSON.stringify(a.keywords || []));
      a.videos.forEach((v, i) => video.run(v.id, a.id, v.title, v.channel || '', i));
    }
  });
  log(`Imported ${media.artists.length} media artists from src/data/media.js`);
  return true;
}
