/* ==========================================================================
   Sikhify API — routes/entries.js
   The knowledge directory: Gurdwaras, events, personalities, organizations,
   websites, apps, books/research, heritage sites, news and kids resources.
   Schemas live in shared/contentTypes.js. The public only ever sees records
   with publish_status = 'published'; publishing requires a source or at least
   one reference, so nothing is published without attribution.
   ========================================================================== */
import { HttpError, badRequest, notFound, str, int, oneOf } from '../lib/http.js';
import { parseJson } from '../db/database.js';
import { uniqueSlug, todayInIndia } from '../lib/util.js';
import { can } from '../../shared/roles.js';
import { CONTENT_TYPES, CONTENT_TYPE_KEYS, TYPE_BY_PATH, VERIFICATION_STATUSES, PUBLISH_STATUSES, validateContent, validateSources } from '../../shared/contentTypes.js';
import { getYouTubeVideoId } from '../../shared/youtube.js';

const PAGE = 24;
const categoryFieldOf = (type) => (CONTENT_TYPES[type].fields.find((f) => f.kind === 'select') || {}).name;
const COMMON = ['title', 'summary', 'body', 'image_url'];

export default function register(router, deps) {
  const { db, logModeration } = deps;

  const resolveType = (t) => (CONTENT_TYPES[t] ? t : TYPE_BY_PATH[t] || null);

  function shape(r, { admin = false } = {}) {
    const data = parseJson(r.data, {});
    return {
      id: r.id, type: r.type, slug: r.slug, title: r.title, summary: r.summary, body: r.body, imageUrl: r.image_url,
      fields: data, country: r.country, state: r.state, district: r.district, city: r.city, category: r.category,
      date: r.sort_date || null,
      verification: { status: r.verification_status, source: r.source, references: parseJson(r.references_json, []), lastVerifiedAt: r.last_verified_at, updatedAt: r.updated_at },
      url: `/${CONTENT_TYPES[r.type].path}/${r.slug}`,
      ...(admin ? { publishStatus: r.publish_status, createdAt: r.created_at, createdBy: r.created_by_name || null, updatedBy: r.updated_by_name || null } : {}),
    };
  }

  /** Validates input for `type`; returns column values. Throws 422 with field errors. */
  function clean(type, input) {
    const { data, errors } = validateContent(type, input, { getVideoId: getYouTubeVideoId });
    const src = validateSources(input);
    Object.assign(errors, src.errors);
    if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields', errors);
    const fields = {};
    for (const [k, v] of Object.entries(data)) if (!COMMON.includes(k)) fields[k] = v;
    const t = CONTENT_TYPES[type];
    return {
      title: data.title, summary: data.summary || '', body: data.body || '', image_url: data.image_url || '',
      data: JSON.stringify(fields),
      country: fields.country || '', state: fields.state || '', district: fields.district || '', city: fields.city || '',
      category: fields[categoryFieldOf(type)] || '',
      sort_date: t.sort ? fields[t.sort] || '' : '',
      source: src.source, references_json: JSON.stringify(src.references),
    };
  }

  function assertPublishable(row) {
    const refs = parseJson(row.references_json, []);
    if (!row.source && !refs.length) throw badRequest('Add a source or at least one reference before publishing', { source: 'Required to publish' });
    if (row.verification_status === 'rejected') throw new HttpError(409, 'Rejected records cannot be published');
  }

  /** Shared with submissions: creates an entry and returns its id. */
  function createEntry(type, input, user, { publishStatus = 'draft', verificationStatus = 'pending' } = {}) {
    const row = clean(type, input);
    const slug = uniqueSlug(row.title, (s) => !!db.prepare('SELECT 1 FROM entries WHERE type = ? AND slug = ?').get(type, s));
    const full = { ...row, verification_status: verificationStatus, publish_status: publishStatus };
    if (publishStatus === 'published') assertPublishable(full);
    const info = db.prepare(`INSERT INTO entries (type, slug, title, summary, body, image_url, data, country, state, district, city, category, sort_date,
      publish_status, verification_status, source, references_json, last_verified_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      type, slug, row.title, row.summary, row.body, row.image_url, row.data, row.country, row.state, row.district, row.city, row.category, row.sort_date,
      publishStatus, verificationStatus, row.source, row.references_json, verificationStatus === 'verified' ? new Date().toISOString() : null, user.id, user.id);
    return Number(info.lastInsertRowid);
  }
  deps.createEntry = createEntry;

  /* ---------- public */
  router.get('/api/entries/summary', () => {
    const rows = db.prepare("SELECT type, COUNT(*) AS n FROM entries WHERE publish_status = 'published' GROUP BY type").all();
    const counts = Object.fromEntries(CONTENT_TYPE_KEYS.map((k) => [k, 0]));
    for (const r of rows) if (r.type in counts) counts[r.type] = r.n;
    return { counts };
  });

  router.get('/api/entries/facets', (c) => {
    const type = resolveType(c.query.get('type'));
    if (!type) throw badRequest('Unknown type');
    const base = "type = ? AND publish_status = 'published'";
    const categories = db.prepare(`SELECT category AS value, COUNT(*) AS n FROM entries WHERE ${base} AND category != '' GROUP BY category ORDER BY category`).all(type);
    const levels = {};
    const filter = [];
    const params = [type];
    for (const level of CONTENT_TYPES[type].hierarchy || []) {
      levels[level] = db.prepare(`SELECT ${level} AS value, COUNT(*) AS n FROM entries WHERE ${base}${filter.length ? ' AND ' + filter.join(' AND ') : ''} AND ${level} != '' GROUP BY ${level} ORDER BY ${level}`).all(...params);
      const chosen = str(c.query.get(level), { max: 80 });
      if (!chosen) break;
      filter.push(`${level} = ?`);
      params.push(chosen);
    }
    return { categories, levels };
  });

  router.get('/api/entries', (c) => {
    const type = resolveType(c.query.get('type'));
    if (!type) throw badRequest('Unknown type');
    const where = ["type = ?", "publish_status = 'published'"];
    const params = [type];
    for (const level of ['country', 'state', 'district', 'city']) {
      const v = str(c.query.get(level), { max: 80 });
      if (v) { where.push(`${level} = ?`); params.push(v); }
    }
    const category = str(c.query.get('category'), { max: 80 });
    if (category) { where.push('category = ?'); params.push(category); }
    const q = str(c.query.get('q'), { max: 100 });
    if (q) { where.push('(title LIKE ? OR summary LIKE ? OR city LIKE ? OR data LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    const when = oneOf(c.query.get('when'), ['upcoming', 'past']);
    const today = todayInIndia();
    let order = 'title COLLATE NOCASE';
    if (CONTENT_TYPES[type].sort) {
      if (when === 'upcoming') { where.push('sort_date >= ?'); params.push(today); order = 'sort_date ASC, title'; }
      else if (when === 'past') { where.push('sort_date < ?'); params.push(today); order = 'sort_date DESC, title'; }
      else order = 'sort_date DESC, title';
    }
    const page = int(c.query.get('page'), { min: 1, max: 1000, fallback: 1 });
    const limit = int(c.query.get('limit'), { min: 1, max: PAGE, fallback: PAGE });
    const total = db.prepare(`SELECT COUNT(*) AS n FROM entries WHERE ${where.join(' AND ')}`).get(...params).n;
    const rows = db.prepare(`SELECT * FROM entries WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
    return { items: rows.map((r) => shape(r)), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  });

  router.get('/api/entries/:type/:slug', (c) => {
    const type = resolveType(c.params.type);
    if (!type) throw notFound('Not found');
    const r = db.prepare('SELECT * FROM entries WHERE type = ? AND slug = ?').get(type, c.params.slug);
    const staff = can(c.user, 'content.manage');
    if (!r || (r.publish_status !== 'published' && !staff)) throw notFound('This record is not available');
    return { entry: { ...shape(r), preview: r.publish_status !== 'published' } };
  });

  /* ---------- admin */
  const ADMIN_SELECT = `SELECT e.*, cu.name AS created_by_name, uu.name AS updated_by_name FROM entries e
    LEFT JOIN users cu ON cu.id = e.created_by LEFT JOIN users uu ON uu.id = e.updated_by`;

  router.get('/api/admin/entries', (c) => {
    c.require('content.manage');
    const where = [];
    const params = [];
    const type = resolveType(c.query.get('type'));
    if (type) { where.push('e.type = ?'); params.push(type); }
    const status = oneOf(c.query.get('status'), PUBLISH_STATUSES);
    if (status) { where.push('e.publish_status = ?'); params.push(status); }
    const ver = oneOf(c.query.get('verification'), VERIFICATION_STATUSES);
    if (ver) { where.push('e.verification_status = ?'); params.push(ver); }
    const q = str(c.query.get('q'), { max: 100 });
    if (q) { where.push('(e.title LIKE ? OR e.city LIKE ? OR e.summary LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const page = int(c.query.get('page'), { min: 1, max: 1000, fallback: 1 });
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM entries e ${w}`).get(...params).n;
    const rows = db.prepare(`${ADMIN_SELECT} ${w} ORDER BY e.updated_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    return { items: rows.map((r) => shape(r, { admin: true })), total, page, pages: Math.max(1, Math.ceil(total / 25)) };
  });

  router.get('/api/admin/entries/:id', (c) => {
    c.require('content.manage');
    const r = db.prepare(`${ADMIN_SELECT} WHERE e.id = ?`).get(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Record not found');
    return { entry: shape(r, { admin: true }) };
  });

  router.post('/api/admin/entries', (c) => {
    const user = c.require('content.manage');
    const type = resolveType(c.body.type);
    if (!type) throw badRequest('Choose a content type');
    const publishStatus = oneOf(c.body.publishStatus, PUBLISH_STATUSES, 'draft');
    const verificationStatus = oneOf(c.body.verificationStatus, VERIFICATION_STATUSES, 'pending');
    const id = createEntry(type, c.body, user, { publishStatus, verificationStatus });
    logModeration(user.id, 'entry.create', 'entry', id, type);
    return { entry: shape(db.prepare(`${ADMIN_SELECT} WHERE e.id = ?`).get(id), { admin: true }) };
  });

  router.patch('/api/admin/entries/:id', (c) => {
    const user = c.require('content.manage');
    const existing = db.prepare('SELECT * FROM entries WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!existing) throw notFound('Record not found');
    const row = clean(existing.type, c.body);
    const publishStatus = oneOf(c.body.publishStatus, PUBLISH_STATUSES, existing.publish_status);
    const verificationStatus = oneOf(c.body.verificationStatus, VERIFICATION_STATUSES, existing.verification_status);
    if (publishStatus === 'published') assertPublishable({ ...row, verification_status: verificationStatus });
    const now = new Date().toISOString();
    const verifiedAt = verificationStatus === 'verified' && existing.verification_status !== 'verified' ? now : existing.last_verified_at;
    db.prepare(`UPDATE entries SET title = ?, summary = ?, body = ?, image_url = ?, data = ?, country = ?, state = ?, district = ?, city = ?, category = ?, sort_date = ?,
      source = ?, references_json = ?, publish_status = ?, verification_status = ?, last_verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`).run(
      row.title, row.summary, row.body, row.image_url, row.data, row.country, row.state, row.district, row.city, row.category, row.sort_date,
      row.source, row.references_json, publishStatus, verificationStatus, verifiedAt, user.id, now, existing.id);
    logModeration(user.id, 'entry.update', 'entry', existing.id, existing.type);
    return { entry: shape(db.prepare(`${ADMIN_SELECT} WHERE e.id = ?`).get(existing.id), { admin: true }) };
  });

  /** Marks a record verified (re-checked today), needs review, etc. */
  router.post('/api/admin/entries/:id/verify', (c) => {
    const user = c.require('content.manage');
    const r = db.prepare('SELECT * FROM entries WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Record not found');
    const status = oneOf(c.body.status, VERIFICATION_STATUSES);
    if (!status) throw badRequest('Unknown verification status');
    const now = new Date().toISOString();
    const publish = status === 'rejected' && r.publish_status === 'published' ? 'draft' : r.publish_status;
    db.prepare('UPDATE entries SET verification_status = ?, last_verified_at = ?, publish_status = ?, updated_by = ?, updated_at = ? WHERE id = ?')
      .run(status, status === 'verified' ? now : r.last_verified_at, publish, user.id, now, r.id);
    logModeration(user.id, 'entry.verify.' + status, 'entry', r.id);
    return { entry: shape(db.prepare(`${ADMIN_SELECT} WHERE e.id = ?`).get(r.id), { admin: true }) };
  });

  router.delete('/api/admin/entries/:id', (c) => {
    const user = c.require('content.delete');
    const info = db.prepare('DELETE FROM entries WHERE id = ?').run(int(c.params.id, { fallback: 0 }));
    if (!info.changes) throw notFound('Record not found');
    logModeration(user.id, 'entry.delete', 'entry', int(c.params.id));
    return { ok: true };
  });
}
