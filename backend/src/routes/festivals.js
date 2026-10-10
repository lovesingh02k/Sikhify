/* ==========================================================================
   Sikhify API — routes/festivals.js
   Sikh Festivals & Important Days. The homepage section, the /festivals pages
   and the admin module all read these records; the date rules (today /
   ongoing / upcoming, verification gaps, destinations) are in shared/festivals.js.

   Public reads return only published records, and only dates marked verified.
   Admins (content.manage) create, edit, publish and verify; deleting needs
   content.delete. "Today" is the site's day (SITE_TIMEZONE), as everywhere else.
   ========================================================================== */
import { HttpError, badRequest, notFound, str, int, oneOf } from '../lib/http.js';
import { transaction } from '../db/database.js';
import {
  TYPE_PATHS, SLUG_RE, dateShape, observanceShape, cleanObservance, publishErrors, failOn, COLUMNS, columnValues, writeDates,
} from '../lib/observances.js';
import {
  SITE_TIMEZONE, CATEGORIES, todayIn, daysBetween, destinationError, destinationOf,
  nextVerifiedOccurrence, occurrenceStatus, verificationGaps, selectHomeCards,
} from '../../../shared/festivals.js';

const PAGE_SIZE = 25;

export default function register(router, { db, logModeration }) {
  const today = () => todayIn(SITE_TIMEZONE);
  const datesFor = (ids) => {
    if (!ids.length) return new Map();
    const rows = db.prepare(`SELECT d.*, u.name AS verified_by_name FROM observance_dates d LEFT JOIN users u ON u.id = d.verified_by
      WHERE d.observance_id IN (${ids.map(() => '?').join(',')}) ORDER BY d.start_date`).all(...ids);
    const map = new Map(ids.map((id) => [id, []]));
    for (const r of rows) map.get(r.observance_id).push(dateShape(r));
    return map;
  };
  const withDates = (rows) => {
    const map = datesFor(rows.map((r) => r.id));
    return rows.map((r) => observanceShape(r, map.get(r.id)));
  };
  const getOne = (id) => {
    const r = db.prepare(`SELECT o.*, cu.name AS created_by_name, uu.name AS updated_by_name FROM observances o
      LEFT JOIN users cu ON cu.id = o.created_by LEFT JOIN users uu ON uu.id = o.updated_by WHERE o.id = ?`).get(id);
    if (!r) return null;
    return { ...withDates([r])[0], createdBy: r.created_by_name || null, updatedBy: r.updated_by_name || null };
  };

  /** Only what a visitor may see: verified dates, no notes or internal fields. */
  function publicShape(o, t) {
    const next = nextVerifiedOccurrence(o, t);
    return {
      slug: o.slug, title: o.title, category: o.category, summary: o.summary, description: o.description, significance: o.significance,
      calendarType: o.calendarType, imageUrl: o.imageUrl, relatedGuru: o.relatedGuru, relatedTopic: o.relatedTopic,
      ...destinationOf(o),
      next: next ? { start: next.start, end: next.end, status: occurrenceStatus(next, t), daysUntil: Math.max(0, daysBetween(t, next.start)), sourceName: next.sourceName || '', sourceUrl: next.sourceUrl || '', nanakshahi: next.nanakshahi || '' } : null,
      verifiedDates: o.scheduleType === 'annual_fixed'
        ? []
        : o.dates.filter((d) => d.verification === 'verified').map((d) => ({ start: d.startDate, end: d.endDate, sourceName: d.sourceName, sourceUrl: d.sourceUrl })),
    };
  }
  /** The admin view adds what needs attention. */
  function adminShape(o, t) {
    const next = nextVerifiedOccurrence(o, t);
    return {
      ...o,
      next: next ? { start: next.start, end: next.end, status: occurrenceStatus(next, t) } : null,
      verificationGaps: verificationGaps(o, t),
      destinationError: destinationError(o, TYPE_PATHS),
      ...destinationOf(o),
    };
  }

  /* ---------- public */
  router.get('/api/festivals/home', () => {
    const t = today();
    const rows = db.prepare("SELECT * FROM observances WHERE status = 'published' AND show_on_home = 1").all();
    // Two cards: the nearest days. When one passes, the next verified date takes its place by itself.
    const { items, fallback } = selectHomeCards(withDates(rows), t, { limit: 2, minCards: 2, fallbackLimit: 2 });
    return { today: t, timeZone: SITE_TIMEZONE, fallback, items };
  });

  router.get('/api/festivals', () => {
    const t = today();
    const items = withDates(db.prepare("SELECT * FROM observances WHERE status = 'published'").all()).map((o) => publicShape(o, t));
    items.sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next && b.next ? (a.next.start < b.next.start ? -1 : a.next.start > b.next.start ? 1 : 0) : 0) || a.title.localeCompare(b.title));
    return { today: t, timeZone: SITE_TIMEZONE, items };
  });

  router.get('/api/festivals/:slug', (c) => {
    const slug = str(c.params.slug, { max: 120 });
    const r = SLUG_RE.test(slug) && db.prepare("SELECT * FROM observances WHERE slug = ? AND status = 'published'").get(slug);
    if (!r) throw notFound('This observance was not found');
    const t = today();
    return { today: t, timeZone: SITE_TIMEZONE, observance: publicShape(withDates([r])[0], t) };
  });

  const slugTaken = (slug, id) => !!db.prepare('SELECT 1 FROM observances WHERE slug = ? AND id != ?').get(slug, id || 0);
  /** An uploaded image must exist (an external https image is checked by format only). */
  const checkImage = (out, fields) => {
    if (out.imageUrl.startsWith('/uploads/') && !db.prepare('SELECT 1 FROM uploads WHERE path = ?').get(out.imageUrl.slice('/uploads/'.length))) {
      fields.imageUrl = 'This uploaded image no longer exists — upload it again';
    }
  };

  /* ---------- admin: endpoints */
  router.get('/api/admin/festivals', (c) => {
    c.require('content.manage');
    const t = today();
    const all = withDates(db.prepare('SELECT * FROM observances ORDER BY updated_at DESC').all()).map((o) => adminShape(o, t));
    const stats = {
      total: all.length,
      published: all.filter((o) => o.status === 'published').length,
      draft: all.filter((o) => o.status === 'draft').length,
      ongoing: all.filter((o) => o.status === 'published' && o.next && o.next.status !== 'upcoming').length,
      upcoming: all.filter((o) => o.status === 'published' && o.next && o.next.status === 'upcoming').length,
      needsVerification: all.filter((o) => o.verificationGaps.length).length,
      invalidDestination: all.filter((o) => o.destinationError).length,
    };
    const q = str(c.query.get('q'), { max: 100 }).toLowerCase();
    const status = oneOf(c.query.get('status'), ['draft', 'published']);
    const category = oneOf(c.query.get('category'), Object.keys(CATEGORIES));
    const view = oneOf(c.query.get('view'), ['ongoing', 'upcoming', 'needs_verification', 'invalid_destination', 'home', 'featured']);
    let items = all.filter((o) => (!status || o.status === status) && (!category || o.category === category)
      && (!q || [o.title, o.slug, o.summary].some((s) => s.toLowerCase().includes(q))));
    if (view === 'ongoing') items = items.filter((o) => o.next && o.next.status !== 'upcoming');
    if (view === 'upcoming') items = items.filter((o) => o.next && o.next.status === 'upcoming');
    if (view === 'needs_verification') items = items.filter((o) => o.verificationGaps.length);
    if (view === 'invalid_destination') items = items.filter((o) => o.destinationError);
    if (view === 'home') items = items.filter((o) => o.showOnHome);
    if (view === 'featured') items = items.filter((o) => o.featured);
    const page = int(c.query.get('page'), { min: 1, max: 1000, fallback: 1 });
    const total = items.length;
    return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), stats, today: t, timeZone: SITE_TIMEZONE };
  });

  router.get('/api/admin/festivals/:id', (c) => {
    c.require('content.manage');
    const o = getOne(int(c.params.id, { fallback: 0 }));
    if (!o) throw notFound('Observance not found');
    return { observance: adminShape(o, today()), today: today() };
  });

  router.post('/api/admin/festivals', (c) => {
    const user = c.require('content.manage');
    const { out, fields } = cleanObservance(c.body);
    if (!fields.slug && slugTaken(out.slug)) fields.slug = 'Another observance already uses this address';
    checkImage(out, fields);
    if (c.body.publish) Object.assign(fields, publishErrors(out, (out.dates || []).length), fields);
    failOn(fields);
    const id = transaction(db, () => {
      const info = db.prepare(`INSERT INTO observances (${COLUMNS.join(', ')}, status, created_by, updated_by, published_at)
        VALUES (${COLUMNS.map(() => '?').join(', ')}, ?, ?, ?, ?)`)
        .run(...columnValues(out), c.body.publish ? 'published' : 'draft', user.id, user.id, c.body.publish ? new Date().toISOString() : null);
      const newId = Number(info.lastInsertRowid);
      if (out.dates) writeDates(db, newId, out.dates, user);
      return newId;
    });
    logModeration(user.id, 'festival.create', 'observance', id, out.title);
    return { observance: adminShape(getOne(id), today()) };
  });

  router.patch('/api/admin/festivals/:id', (c) => {
    const user = c.require('content.manage');
    const current = getOne(int(c.params.id, { fallback: 0 }));
    if (!current) throw notFound('Observance not found');
    const { out, fields } = cleanObservance(c.body, current);
    if (!fields.slug && slugTaken(out.slug, current.id)) fields.slug = 'Another observance already uses this address';
    checkImage(out, fields);
    if (current.status === 'published') {
      const pe = publishErrors(out, (out.dates || current.dates).length);
      if (Object.keys(pe).length) throw badRequest('A published observance must stay complete — unpublish it first to save an incomplete version', { ...pe, ...fields });
    }
    failOn(fields);
    transaction(db, () => {
      db.prepare(`UPDATE observances SET ${COLUMNS.map((k) => `${k} = ?`).join(', ')}, updated_by = ?, updated_at = ? WHERE id = ?`)
        .run(...columnValues(out), user.id, new Date().toISOString(), current.id);
      if (out.dates) writeDates(db, current.id, out.dates, user);
    });
    logModeration(user.id, 'festival.update', 'observance', current.id, out.title);
    return { observance: adminShape(getOne(current.id), today()) };
  });

  router.post('/api/admin/festivals/:id/status', (c) => {
    const user = c.require('content.manage');
    const current = getOne(int(c.params.id, { fallback: 0 }));
    if (!current) throw notFound('Observance not found');
    const status = oneOf(c.body.status, ['draft', 'published']);
    if (!status) throw badRequest('Unknown status');
    if (status === 'published') {
      const pe = publishErrors(current, current.dates.length);
      if (Object.keys(pe).length) throw badRequest('Complete these fields before publishing', pe);
    }
    const now = new Date().toISOString();
    db.prepare(`UPDATE observances SET status = ?, published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END, updated_by = ?, updated_at = ? WHERE id = ?`)
      .run(status, status, now, user.id, now, current.id);
    logModeration(user.id, status === 'published' ? 'festival.publish' : 'festival.unpublish', 'observance', current.id, current.title);
    return { observance: adminShape(getOne(current.id), today()) };
  });

  router.delete('/api/admin/festivals/:id', (c) => {
    const user = c.require('content.delete');
    const current = getOne(int(c.params.id, { fallback: 0 }));
    if (!current) throw notFound('Observance not found');
    if (current.status === 'published') throw new HttpError(409, 'Unpublish this observance before deleting it');
    db.prepare('DELETE FROM observances WHERE id = ?').run(current.id);
    logModeration(user.id, 'festival.delete', 'observance', current.id, current.title);
    return { ok: true };
  });
}
