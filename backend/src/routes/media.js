/* ==========================================================================
   Sikhify API — routes/media.js
   Sikh Media: Kirtan / Katha / Dhadi artists and their YouTube videos.
   GET /api/media returns exactly the shape of shared/data/media.js, so the
   existing Media page and site search work with either source.
   ========================================================================== */
import { HttpError, badRequest, notFound, str, int, oneOf } from '../lib/http.js';
import { parseJson, transaction } from '../db/database.js';
import { getYouTubeVideoId, isYouTubeVideoId } from '../../../shared/youtube.js';
import { parseLinks, isHttpUrl } from '../../../shared/contentTypes.js';
import { slugify } from '../lib/util.js';

export default function register(router, deps) {
  const { db, logModeration } = deps;
  function artistShape(a, videos, { admin = false } = {}) {
    return {
      id: a.id, name: a.name, sortName: a.sort_name, category: a.category,
      ...(a.location ? { location: a.location } : {}),
      description: a.description, keywords: parseJson(a.keywords, []),
      style: a.style, officialLinks: parseJson(a.official_links, []), references: parseJson(a.references_json, []),
      videos: videos.map((v) => ({ id: v.id, title: v.title, channel: v.channel, ...(v.description ? { description: v.description } : {}), ...(v.duration_seconds ? { durationSeconds: v.duration_seconds } : {}), ...(admin ? { status: v.status, sort: v.sort } : {}) })),
      ...(admin ? { status: a.status, updatedAt: a.updated_at } : {}),
    };
  }

  function catalog({ admin = false } = {}) {
    const categories = db.prepare('SELECT name FROM media_categories ORDER BY sort, name').all().map((r) => r.name);
    const artists = db.prepare(`SELECT * FROM media_artists ${admin ? '' : "WHERE status = 'published'"} ORDER BY sort_name`).all();
    const videos = db.prepare(`SELECT * FROM media_videos ${admin ? '' : "WHERE status = 'published'"} ORDER BY sort, created_at`).all();
    const byArtist = {};
    for (const v of videos) (byArtist[v.artist_id] ||= []).push(v);
    return {
      categories,
      artists: artists
        .map((a) => artistShape(a, byArtist[a.id] || [], { admin }))
        .filter((a) => admin || a.videos.length > 0),
    };
  }

  deps.mediaCatalog = catalog;
  router.get('/api/media', () => catalog());

  router.get('/api/media/videos/:id', (c) => {
    if (!isYouTubeVideoId(c.params.id)) throw notFound('Video not found');
    const v = db.prepare(`SELECT v.* FROM media_videos v JOIN media_artists a ON a.id = v.artist_id
      WHERE v.id = ? AND v.status = 'published' AND a.status = 'published'`).get(c.params.id);
    if (!v) throw notFound('Video not found');
    const a = db.prepare('SELECT * FROM media_artists WHERE id = ?').get(v.artist_id);
    const fromArtist = db.prepare("SELECT * FROM media_videos WHERE artist_id = ? AND status = 'published' AND id != ? ORDER BY sort LIMIT 8").all(a.id, v.id);
    const fromCategory = db.prepare(`SELECT v.*, a.name AS artist_name, a.id AS a_id FROM media_videos v JOIN media_artists a ON a.id = v.artist_id
      WHERE a.category = ? AND a.id != ? AND v.status = 'published' AND a.status = 'published' ORDER BY random() LIMIT 6`).all(a.category, a.id);
    return {
      video: { id: v.id, title: v.title, channel: v.channel, description: v.description },
      artist: artistShape(a, []),
      related: [
        ...fromArtist.map((x) => ({ id: x.id, title: x.title, channel: x.channel, artist: { id: a.id, name: a.name } })),
        ...fromCategory.map((x) => ({ id: x.id, title: x.title, channel: x.channel, artist: { id: x.a_id, name: x.artist_name } })),
      ],
    };
  });

  /* ---------- admin */
  router.get('/api/admin/media', (c) => {
    c.require('content.manage');
    return catalog({ admin: true });
  });

  function cleanArtist(body, { partial = false } = {}) {
    const out = {};
    const fields = {};
    const has = (k) => !partial || body[k] !== undefined;
    if (has('name')) { out.name = str(body.name, { max: 120 }); if (out.name.length < 2) fields.name = 'Name is required'; }
    if (has('sortName')) out.sort_name = str(body.sortName, { max: 120 });
    if (has('category')) {
      out.category = str(body.category, { max: 60 });
      if (!db.prepare('SELECT 1 FROM media_categories WHERE name = ?').get(out.category)) fields.category = 'Choose a category';
    }
    if (has('location')) out.location = str(body.location, { max: 120 });
    if (has('description')) { out.description = str(body.description, { max: 3000 }); if (!partial && out.description.length < 10) fields.description = 'Add a short, factual description'; }
    if (has('keywords')) out.keywords = JSON.stringify((Array.isArray(body.keywords) ? body.keywords : String(body.keywords || '').split(',')).map((k) => str(k, { max: 40 })).filter(Boolean).slice(0, 20));
    if (has('style')) out.style = str(body.style, { max: 300 });
    if (has('officialLinks')) {
      const links = parseLinks(body.officialLinks);
      if (links.some((l) => !isHttpUrl(l.url))) fields.officialLinks = 'Each line must be “Label | https://…”';
      out.official_links = JSON.stringify(links.slice(0, 20));
    }
    if (has('references')) {
      const refs = parseLinks(body.references);
      if (refs.some((l) => !isHttpUrl(l.url))) fields.references = 'Each line must be “Label | https://…”';
      out.references_json = JSON.stringify(refs.slice(0, 20));
    }
    if (has('status')) { out.status = oneOf(body.status, ['draft', 'published', 'archived']); if (!out.status) fields.status = 'Unknown status'; }
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    if (out.name && !out.sort_name) out.sort_name = out.name.replace(/^(Bhai|Bibi|Giani|Dr\.?|Dhadi|Sant|Prof\.?)\s+/i, '');
    return out;
  }

  /** Creates an artist from cleaned input; also used when a Kirtani submission is approved. */
  function createArtist(input) {
    let id = slugify(input.name);
    for (let n = 2; db.prepare('SELECT 1 FROM media_artists WHERE id = ?').get(id); n++) id = `${slugify(input.name)}-${n}`;
    db.prepare(`INSERT INTO media_artists (id, name, sort_name, category, location, description, keywords, style, official_links, references_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.name, input.sort_name, input.category, input.location || '', input.description, input.keywords || '[]', input.style || '', input.official_links || '[]', input.references_json || '[]', input.status || 'draft');
    return id;
  }
  deps.createMediaArtist = (body) => createArtist(cleanArtist(body));

  router.post('/api/admin/media/artists', (c) => {
    const user = c.require('content.manage');
    const id = createArtist(cleanArtist(c.body));
    logModeration(user.id, 'media.artist.create', 'media_artist', null, id);
    return { artist: artistShape(db.prepare('SELECT * FROM media_artists WHERE id = ?').get(id), [], { admin: true }) };
  });
  router.patch('/api/admin/media/artists/:id', (c) => {
    const user = c.require('content.manage');
    const a = db.prepare('SELECT * FROM media_artists WHERE id = ?').get(c.params.id);
    if (!a) throw notFound('Artist not found');
    const input = cleanArtist(c.body, { partial: true });
    const keys = Object.keys(input);
    if (keys.length) db.prepare(`UPDATE media_artists SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...keys.map((k) => input[k]), new Date().toISOString(), a.id);
    logModeration(user.id, 'media.artist.update', 'media_artist', null, a.id);
    const videos = db.prepare('SELECT * FROM media_videos WHERE artist_id = ? ORDER BY sort').all(a.id);
    return { artist: artistShape(db.prepare('SELECT * FROM media_artists WHERE id = ?').get(a.id), videos, { admin: true }) };
  });

  router.delete('/api/admin/media/artists/:id', (c) => {
    const user = c.require('content.delete');
    const info = db.prepare('DELETE FROM media_artists WHERE id = ?').run(c.params.id);
    if (!info.changes) throw notFound('Artist not found');
    logModeration(user.id, 'media.artist.delete', 'media_artist', null, c.params.id);
    return { ok: true };
  });

  function cleanVideo(body, { partial = false } = {}) {
    const out = {};
    const fields = {};
    const has = (k) => !partial || body[k] !== undefined;
    if (!partial) {
      out.id = getYouTubeVideoId(str(body.url, { max: 300 }));
      if (!out.id) fields.url = 'Paste a YouTube link (watch?v=, youtu.be/, embed/ or shorts/)';
    }
    if (has('title')) { out.title = str(body.title, { max: 200 }); if (!out.title) fields.title = 'Title is required'; }
    if (has('channel')) out.channel = str(body.channel, { max: 120 });
    if (has('description')) out.description = str(body.description, { max: 3000 });
    if (has('status')) { out.status = oneOf(body.status, ['draft', 'published', 'archived']) || 'published'; }
    if (body.sort !== undefined) out.sort = int(body.sort, { min: 0, max: 10000, fallback: 0 });
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    return out;
  }

  router.post('/api/admin/media/artists/:id/videos', (c) => {
    const user = c.require('content.manage');
    const a = db.prepare('SELECT * FROM media_artists WHERE id = ?').get(c.params.id);
    if (!a) throw notFound('Artist not found');
    const v = cleanVideo(c.body);
    const existing = db.prepare('SELECT v.artist_id, a.name FROM media_videos v JOIN media_artists a ON a.id = v.artist_id WHERE v.id = ?').get(v.id);
    if (existing) throw new HttpError(409, `This video is already listed under ${existing.name}`);
    const sort = db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM media_videos WHERE artist_id = ?').get(a.id).n;
    db.prepare('INSERT INTO media_videos (id, artist_id, title, channel, description, sort, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(v.id, a.id, v.title, v.channel || '', v.description || '', sort, v.status || 'published');
    logModeration(user.id, 'media.video.create', 'media_video', null, v.id);
    return { video: db.prepare('SELECT * FROM media_videos WHERE id = ?').get(v.id) };
  });

  router.patch('/api/admin/media/videos/:id', (c) => {
    const user = c.require('content.manage');
    const v = db.prepare('SELECT * FROM media_videos WHERE id = ?').get(c.params.id);
    if (!v) throw notFound('Video not found');
    const input = cleanVideo(c.body, { partial: true });
    const keys = Object.keys(input);
    if (keys.length) db.prepare(`UPDATE media_videos SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...keys.map((k) => input[k]), new Date().toISOString(), v.id);
    logModeration(user.id, 'media.video.update', 'media_video', null, v.id);
    return { video: db.prepare('SELECT * FROM media_videos WHERE id = ?').get(v.id) };
  });

  router.delete('/api/admin/media/videos/:id', (c) => {
    const user = c.require('content.manage');
    const info = db.prepare('DELETE FROM media_videos WHERE id = ?').run(c.params.id);
    if (!info.changes) throw notFound('Video not found');
    logModeration(user.id, 'media.video.delete', 'media_video', null, c.params.id);
    return { ok: true };
  });

  router.post('/api/admin/media/categories', (c) => {
    c.require('content.manage');
    const name = str(c.body.name, { max: 60 });
    if (name.length < 2) throw badRequest('Please fix the highlighted fields', { name: 'Category name is required' });
    const sort = db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM media_categories').get().n;
    db.prepare('INSERT INTO media_categories (name, sort) VALUES (?, ?)').run(name, sort);
    return { categories: db.prepare('SELECT name FROM media_categories ORDER BY sort').all().map((r) => r.name) };
  });

  /** Looks up a YouTube link's real title and channel (and confirms it exists) via YouTube oEmbed. */
  router.get('/api/admin/media/oembed', async (c) => {
    c.require('content.manage');
    const id = getYouTubeVideoId(str(c.query.get('url'), { max: 300 }));
    if (!id) throw badRequest('Paste a YouTube link (watch?v=, youtu.be/, embed/ or shorts/)');
    let res;
    try {
      res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`, { signal: AbortSignal.timeout(8000) });
    } catch {
      throw new HttpError(502, 'YouTube could not be reached — enter the title and channel manually');
    }
    if (res.status === 401 || res.status === 403) return { id, embeddable: false, title: '', channel: '', message: 'YouTube reports that this video cannot be embedded (or is private).' };
    if (res.status === 404 || res.status === 400) throw new HttpError(404, 'YouTube has no public video with that ID');
    if (!res.ok) throw new HttpError(502, 'YouTube lookup failed — enter the title and channel manually');
    const data = await res.json();
    return { id, embeddable: true, title: String(data.title || ''), channel: String(data.author_name || '') };
  });
}
