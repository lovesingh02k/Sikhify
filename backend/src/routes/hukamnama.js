/* ==========================================================================
   Sikhify API — routes/hukamnama.js
   The canonical daily Hukamnama. At most one record can be *published* for a
   date (enforced by a partial unique index). The homepage card and the
   Hukamnama page both read the published record through the same service
   (src/services/hukamnama/hukamnamaService.js); when no record has been
   published for a date, the site falls back to the live BaniDB feed.

   "Today" is the date in India (Asia/Kolkata), where the Hukamnama is taken.
   Every change is kept in hukamnama_revisions (the History view).
   ========================================================================== */
import { HttpError, badRequest, notFound, str, int, oneOf } from '../lib/http.js';
import { transaction } from '../db/database.js';
import { todayInIndia, isIsoDate } from '../lib/util.js';
import { isHttpUrl } from '../../../shared/contentTypes.js';

const TEXT_FIELDS = ['gurmukhi', 'transliteration', 'punjabi', 'hindi', 'english'];

export default function register(router, { db, logModeration }) {
  function publicShape(r) {
    if (!r) return null;
    return {
      id: r.id, date: r.date, ang: r.ang, raag: r.raag, writer: r.writer,
      gurmukhi: r.gurmukhi, transliteration: r.transliteration, punjabi: r.punjabi, hindi: r.hindi, english: r.english,
      audioUrl: r.audio_url, kathaUrl: r.katha_url, source: r.source, publishedAt: r.published_at, updatedAt: r.updated_at,
    };
  }
  function adminShape(r) {
    return {
      ...publicShape(r), status: r.status, createdAt: r.created_at,
      createdBy: r.created_by_name || null, updatedBy: r.updated_by_name || null,
    };
  }
  const ADMIN_SELECT = `SELECT h.*, cu.name AS created_by_name, uu.name AS updated_by_name FROM hukamnamas h
    LEFT JOIN users cu ON cu.id = h.created_by LEFT JOIN users uu ON uu.id = h.updated_by`;
  const getAdmin = (id) => db.prepare(`${ADMIN_SELECT} WHERE h.id = ?`).get(id);

  /* ---------- public */
  const published = (date) => db.prepare("SELECT * FROM hukamnamas WHERE date = ? AND status = 'published'").get(date);

  // A missing record is a normal answer (the site then uses BaniDB), so it is 200 + null, not 404.
  router.get('/api/hukamnama/today', () => {
    const date = todayInIndia();
    return { date, hukamnama: publicShape(published(date)) };
  });
  router.get('/api/hukamnama/date/:date', (c) => {
    if (!isIsoDate(c.params.date)) throw badRequest('Use a YYYY-MM-DD date');
    return { date: c.params.date, hukamnama: publicShape(published(c.params.date)) };
  });
  router.get('/api/hukamnama/recent', (c) => {
    const limit = int(c.query.get('limit'), { min: 1, max: 60, fallback: 14 });
    const rows = db.prepare("SELECT * FROM hukamnamas WHERE status = 'published' AND date <= ? ORDER BY date DESC LIMIT ?").all(todayInIndia(), limit);
    return { items: rows.map(publicShape) };
  });

  /* ---------- admin */
  function clean(body, existing) {
    const out = {};
    const fields = {};
    const src = { ...(existing || {}), ...body };
    out.date = str(src.date, { max: 10 });
    if (!isIsoDate(out.date)) fields.date = 'Choose a valid date';
    const angRaw = src.ang === '' || src.ang === null || src.ang === undefined ? null : src.ang;
    out.ang = angRaw === null ? null : int(angRaw, { fallback: NaN });
    if (out.ang !== null && !(out.ang >= 1 && out.ang <= 1430)) fields.ang = 'Ang must be between 1 and 1430';
    out.raag = str(src.raag, { max: 120 });
    out.writer = str(src.writer, { max: 120 });
    for (const f of TEXT_FIELDS) out[f] = str(src[f], { max: 20000 }).replace(/\r\n/g, '\n');
    out.audio_url = str(src.audioUrl ?? src.audio_url, { max: 500 });
    out.katha_url = str(src.kathaUrl ?? src.katha_url, { max: 500 });
    if (out.audio_url && !isHttpUrl(out.audio_url)) fields.audioUrl = 'Must be a full http(s):// link';
    if (out.katha_url && !isHttpUrl(out.katha_url)) fields.kathaUrl = 'Must be a full http(s):// link';
    out.source = str(src.source, { max: 300 });
    return { out, fields };
  }
  function publishErrors(r) {
    const fields = {};
    if (!r.ang) fields.ang = 'Ang is required to publish';
    if (!r.gurmukhi.trim()) fields.gurmukhi = 'The Gurmukhi text is required to publish';
    if (!r.source.trim()) fields.source = 'Name the source (e.g. “Sri Harmandir Sahib, Amritsar — SGPC”) to publish';
    if (!r.english.trim() && !r.punjabi.trim() && !r.hindi.trim()) fields.english = 'Add at least one meaning (Punjabi, Hindi or English) to publish';
    return fields;
  }
  function snapshot(id, action, actorId) {
    const r = db.prepare('SELECT * FROM hukamnamas WHERE id = ?').get(id);
    db.prepare('INSERT INTO hukamnama_revisions (hukamnama_id, action, snapshot, actor_id) VALUES (?, ?, ?, ?)').run(id, action, JSON.stringify(publicShape(r) && { ...publicShape(r), status: r.status }), actorId);
  }
  function setPublished(record, user, replace) {
    const other = db.prepare("SELECT id FROM hukamnamas WHERE date = ? AND status = 'published' AND id != ?").get(record.date, record.id);
    if (other && !replace) throw new HttpError(409, `Another Hukamnama is already published for ${record.date}. Publishing this one will archive it.`, { code: 'published_exists' });
    const now = new Date().toISOString();
    if (other) {
      db.prepare("UPDATE hukamnamas SET status = 'archived', updated_by = ?, updated_at = ? WHERE id = ?").run(user.id, now, other.id);
      snapshot(other.id, 'archived (replaced)', user.id);
    }
    db.prepare("UPDATE hukamnamas SET status = 'published', published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(now, user.id, now, record.id);
  }

  router.get('/api/admin/hukamnamas', (c) => {
    c.require('content.manage');
    const where = [];
    const params = [];
    const status = oneOf(c.query.get('status'), ['draft', 'published', 'archived']);
    if (status) { where.push('h.status = ?'); params.push(status); }
    const from = c.query.get('from'), to = c.query.get('to');
    if (isIsoDate(from)) { where.push('h.date >= ?'); params.push(from); }
    if (isIsoDate(to)) { where.push('h.date <= ?'); params.push(to); }
    const q = str(c.query.get('q'), { max: 100 });
    if (q) {
      where.push('(h.gurmukhi LIKE ? OR h.english LIKE ? OR h.transliteration LIKE ? OR h.raag LIKE ? OR h.writer LIKE ? OR h.source LIKE ? OR CAST(h.ang AS TEXT) = ?)');
      params.push(...Array(6).fill(`%${q}%`), q);
    }
    const page = int(c.query.get('page'), { min: 1, max: 1000, fallback: 1 });
    const total = db.prepare(`SELECT COUNT(*) AS n FROM hukamnamas h ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...params).n;
    const rows = db.prepare(`${ADMIN_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY h.date DESC, h.updated_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    return { items: rows.map(adminShape), total, page, pages: Math.max(1, Math.ceil(total / 25)), today: todayInIndia() };
  });

  router.get('/api/admin/hukamnamas/:id', (c) => {
    c.require('content.manage');
    const r = getAdmin(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Hukamnama not found');
    const history = db.prepare(`SELECT hr.id, hr.action, hr.snapshot, hr.created_at, u.name AS actor FROM hukamnama_revisions hr
      LEFT JOIN users u ON u.id = hr.actor_id WHERE hr.hukamnama_id = ? ORDER BY hr.id DESC`).all(r.id)
      .map((h) => ({ id: h.id, action: h.action, actor: h.actor, createdAt: h.created_at, snapshot: JSON.parse(h.snapshot) }));
    return { hukamnama: adminShape(r), history };
  });

  router.post('/api/admin/hukamnamas', (c) => {
    const user = c.require('content.manage');
    const { out, fields } = clean(c.body);
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    const id = transaction(db, () => {
      const info = db.prepare(`INSERT INTO hukamnamas (date, ang, raag, writer, gurmukhi, transliteration, punjabi, hindi, english, audio_url, katha_url, source, status, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`).run(out.date, out.ang, out.raag, out.writer, out.gurmukhi, out.transliteration, out.punjabi, out.hindi, out.english, out.audio_url, out.katha_url, out.source, user.id, user.id);
      const newId = Number(info.lastInsertRowid);
      snapshot(newId, 'created', user.id);
      if (c.body.publish) {
        const pe = publishErrors(out);
        if (Object.keys(pe).length) throw badRequest('Saved fields are not complete enough to publish', pe);
        setPublished({ id: newId, date: out.date }, user, !!c.body.replace);
        snapshot(newId, 'published', user.id);
      }
      return newId;
    });
    logModeration(user.id, 'hukamnama.create', 'hukamnama', id, out.date);
    return { hukamnama: adminShape(getAdmin(id)) };
  });

  router.patch('/api/admin/hukamnamas/:id', (c) => {
    const user = c.require('content.manage');
    const r = db.prepare('SELECT * FROM hukamnamas WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Hukamnama not found');
    const existing = { ...r, audioUrl: r.audio_url, kathaUrl: r.katha_url };
    const { out, fields } = clean(c.body, existing);
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    if (r.status === 'published') {
      const pe = publishErrors(out);
      if (Object.keys(pe).length) throw badRequest('A published Hukamnama must stay complete — unpublish it first to save an incomplete version', pe);
      if (out.date !== r.date && db.prepare("SELECT 1 FROM hukamnamas WHERE date = ? AND status = 'published' AND id != ?").get(out.date, r.id)) {
        throw new HttpError(409, `Another Hukamnama is already published for ${out.date}`);
      }
    }
    transaction(db, () => {
      db.prepare(`UPDATE hukamnamas SET date = ?, ang = ?, raag = ?, writer = ?, gurmukhi = ?, transliteration = ?, punjabi = ?, hindi = ?, english = ?,
        audio_url = ?, katha_url = ?, source = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
        .run(out.date, out.ang, out.raag, out.writer, out.gurmukhi, out.transliteration, out.punjabi, out.hindi, out.english, out.audio_url, out.katha_url, out.source, user.id, new Date().toISOString(), r.id);
      snapshot(r.id, 'updated', user.id);
    });
    return { hukamnama: adminShape(getAdmin(r.id)) };
  });

  router.post('/api/admin/hukamnamas/:id/status', (c) => {
    const user = c.require('content.manage');
    const r = db.prepare('SELECT * FROM hukamnamas WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Hukamnama not found');
    const status = oneOf(c.body.status, ['draft', 'published', 'archived']);
    if (!status) throw badRequest('Unknown status');
    transaction(db, () => {
      if (status === 'published') {
        const pe = publishErrors(r);
        if (Object.keys(pe).length) throw badRequest('Complete these fields before publishing', pe);
        setPublished(r, user, !!c.body.replace);
      } else {
        db.prepare('UPDATE hukamnamas SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(status, user.id, new Date().toISOString(), r.id);
      }
      snapshot(r.id, status === 'published' ? 'published' : status === 'draft' ? (r.status === 'published' ? 'unpublished' : 'restored to draft') : 'archived', user.id);
    });
    logModeration(user.id, 'hukamnama.' + status, 'hukamnama', r.id, r.date);
    return { hukamnama: adminShape(getAdmin(r.id)) };
  });

  router.delete('/api/admin/hukamnamas/:id', (c) => {
    const user = c.require('content.delete');
    const r = db.prepare('SELECT * FROM hukamnamas WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Hukamnama not found');
    if (r.status === 'published') throw new HttpError(409, 'Unpublish this Hukamnama before deleting it');
    db.prepare('DELETE FROM hukamnamas WHERE id = ?').run(r.id);
    logModeration(user.id, 'hukamnama.delete', 'hukamnama', r.id, r.date);
    return { ok: true };
  });
}
