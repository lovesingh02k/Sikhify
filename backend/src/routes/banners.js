/* ==========================================================================
   Sikhify API — routes/banners.js   (homepage banners)

   Public:
     GET  /api/banners/home              published banners inside their date window, in display order
   Staff (content.manage; deleting needs content.delete):
     GET    /api/admin/banners           every banner, with its live/scheduled/expired/draft state
     GET    /api/admin/banners/:id
     POST   /api/admin/banners           create (saved as a draft unless status = published)
     PATCH  /api/admin/banners/:id       edit
     POST   /api/admin/banners/:id/status   { status: draft | published }
     POST   /api/admin/banners/reorder   { ids: [...] } — display order, first = top
     DELETE /api/admin/banners/:id

   A banner has a title and an image and/or a YouTube video, plus an optional
   description and call to action — or it features a festival / important day
   (observanceId): it then shows that published observance with its next
   VERIFIED date, and is hidden from the homepage while it has none (e.g. once
   the day has passed), so no stale date is ever shown. Images come only from the site's own
   uploader (purpose "banner": validated, re-encoded); videos are stored as a
   YouTube ID and played through the privacy-enhanced embed, never autoplayed.
   ========================================================================== */
import { badRequest, notFound, str, int, oneOf } from '../lib/http.js';
import { parseJson } from '../db/database.js';
import { transaction } from '../db/database.js';
import { getYouTubeVideoId } from '../../../shared/youtube.js';
import { dateShape, observanceShape } from '../lib/observances.js';
import { SITE_TIMEZONE, todayIn, nextVerifiedOccurrence, cardOf } from '../../../shared/festivals.js';

const MAX_PUBLIC = 5;
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** '' → null; a date or date-time → ISO string (a bare date means the start of that day, UTC). */
function toIso(v) {
  const s = str(v, { max: 40 });
  if (!s) return null;
  if (!DATE_RE.test(s)) return undefined;
  const d = new Date(s.length === 10 ? s + 'T00:00:00Z' : s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function bannerState(r, now = new Date().toISOString()) {
  if (r.status !== 'published') return 'draft';
  if (r.starts_at && r.starts_at > now) return 'scheduled';
  if (r.ends_at && r.ends_at <= now) return 'expired';
  return 'live';
}

export default function register(router, deps) {
  const { db, logModeration } = deps;

  /** The festival card for a banner's observance: published, with a current or upcoming verified date — else null. */
  function observanceCard(id) {
    if (!id) return null;
    const r = db.prepare("SELECT * FROM observances WHERE id = ? AND status = 'published'").get(id);
    if (!r) return null;
    const dates = db.prepare('SELECT * FROM observance_dates WHERE observance_id = ? ORDER BY start_date').all(id).map(dateShape);
    const o = observanceShape(r, dates);
    const t = todayIn(SITE_TIMEZONE);
    const occ = nextVerifiedOccurrence(o, t);
    return occ ? cardOf(o, occ, t) : null;
  }

  /** A festival banner's optional wording (empty values are left out: the festival's own text is used). */
  const OPTION_LIMITS = { eyebrow: 60, kicker: 60, subtitle: 80, gurmukhi: 60 };
  const optionsOf = (r) => {
    const o = parseJson(r.options, {}) || {};
    return Object.fromEntries(Object.keys(OPTION_LIMITS).map((k) => [k, str(o[k], { max: OPTION_LIMITS[k] })]).filter(([, v]) => v));
  };
  const publicShape = (r, card = observanceCard(r.observance_id)) => ({
    id: r.id, title: r.title, description: r.description, observance: card, options: r.observance_id ? optionsOf(r) : {},
    image: r.image_url ? { url: r.image_url, alt: r.image_alt } : null,
    youtubeId: r.youtube_id || null,
    cta: r.cta_label && r.cta_url ? { label: r.cta_label, url: r.cta_url } : null,
  });
  const adminShape = (r) => {
    const card = observanceCard(r.observance_id);
    const o = r.observance_id ? db.prepare('SELECT id, slug, title, status FROM observances WHERE id = ?').get(r.observance_id) : null;
    return {
    ...publicShape(r, card), status: r.status, state: bannerState(r), sort: r.sort,
    observanceId: r.observance_id || null, observanceTitle: o ? o.title : '',
    // Shown to staff: why a festival banner is not on the homepage even though it is published.
    observanceProblem: !r.observance_id ? '' : !o ? 'The festival was deleted' : o.status !== 'published' ? 'The festival is not published' : !card ? 'The festival has no upcoming verified date' : '',
    imageUrl: r.image_url, imageAlt: r.image_alt, ctaLabel: r.cta_label, ctaUrl: r.cta_url,
    startsAt: r.starts_at, endsAt: r.ends_at, createdAt: r.created_at, updatedAt: r.updated_at, publishedAt: r.published_at,
  };
  };

  /** Validates an admin's input. Returns { values, errors } with errors keyed by form field. */
  function clean(body, existing = {}) {
    const pick = (k, fallback) => (body[k] !== undefined ? body[k] : fallback);
    const errors = {};
    const title = str(pick('title', existing.title), { max: 120 });
    if (title.length < 3) errors.title = 'Give the banner a title (at least 3 characters)';
    const description = str(pick('description', existing.description), { max: 400 });

    // A festival banner: the observance supplies the picture and the date.
    const observanceId = int(pick('observanceId', existing.observance_id), { fallback: null }) || null;
    if (observanceId && !db.prepare("SELECT 1 FROM observances WHERE id = ? AND status = 'published'").get(observanceId)) errors.observanceId = 'Choose a published festival or important day';

    const optIn = body.options && typeof body.options === 'object' ? body.options : parseJson(existing.options, {}) || {};
    const options = JSON.stringify(Object.fromEntries(Object.keys(OPTION_LIMITS).map((k) => [k, str(optIn[k], { max: OPTION_LIMITS[k] })]).filter(([, v]) => v)));

    const imageUrl = str(pick('imageUrl', existing.image_url), { max: 300 });
    const imageAlt = str(pick('imageAlt', existing.image_alt), { max: 200 });
    if (imageUrl) {
      const owned = imageUrl.startsWith('/uploads/') && db.prepare("SELECT 1 FROM uploads WHERE path = ? AND purpose = 'banner'").get(imageUrl.slice(9));
      if (!owned) errors.imageUrl = 'Upload the image with the uploader on this page';
      if (imageAlt.length < 5) errors.imageAlt = 'Describe the image for people using screen readers';
    }

    const videoInput = str(pick('youtube', existing.youtube_id), { max: 300 });
    let youtubeId = '';
    if (videoInput) {
      youtubeId = getYouTubeVideoId(videoInput) || '';
      if (!youtubeId) errors.youtube = 'Paste a YouTube video link (youtube.com/watch?v=… or youtu.be/…)';
    }
    if (!imageUrl && !videoInput && !observanceId) errors.imageUrl = 'Add an image, a YouTube video, or both';

    const ctaLabel = str(pick('ctaLabel', existing.cta_label), { max: 40 });
    const ctaUrl = str(pick('ctaUrl', existing.cta_url), { max: 500 });
    if (ctaLabel && !ctaUrl) errors.ctaUrl = 'Where should the button go?';
    if (ctaUrl && !ctaLabel) errors.ctaLabel = 'Give the button a short label';
    if (ctaUrl && !(/^\/(?!\/)[^\s]*$/.test(ctaUrl) || /^https:\/\/[^\s/]+\.[^\s]+$/i.test(ctaUrl))) {
      errors.ctaUrl = 'Use a page on Sikhify (starting with /) or a full https:// link';
    }

    const startsAt = toIso(pick('startsAt', existing.starts_at));
    const endsAt = toIso(pick('endsAt', existing.ends_at));
    if (startsAt === undefined) errors.startsAt = 'Use a valid date';
    if (endsAt === undefined) errors.endsAt = 'Use a valid date';
    if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = 'The end must be after the start';

    return {
      errors,
      values: { observance_id: observanceId, options, title, description, image_url: imageUrl, image_alt: imageUrl ? imageAlt : '', youtube_id: youtubeId, cta_label: ctaLabel, cta_url: ctaUrl, starts_at: startsAt || null, ends_at: endsAt || null },
    };
  }

  const byId = (id) => db.prepare('SELECT * FROM home_banners WHERE id = ?').get(int(id, { fallback: 0 }));
  const requireBanner = (id) => { const r = byId(id); if (!r) throw notFound('Banner not found'); return r; };

  /* ---------------------------------------------------------------- public */
  router.get('/api/banners/home', (c) => {
    const now = new Date().toISOString();
    const rows = db.prepare(`SELECT * FROM home_banners WHERE status = 'published'
      AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?)
      ORDER BY sort, id`).all(now, now);
    c.res.setHeader('Cache-Control', 'public, max-age=60');
    // A festival banner whose festival has no current/upcoming verified date is left out.
    const items = rows.map((r) => publicShape(r)).filter((b, i) => !rows[i].observance_id || b.observance).slice(0, MAX_PUBLIC);
    return { items };
  });

  /* ---------------------------------------------------------------- staff */
  router.get('/api/admin/banners', (c) => {
    c.require('content.manage');
    return { items: db.prepare('SELECT * FROM home_banners ORDER BY sort, id').all().map(adminShape), maxPublic: MAX_PUBLIC };
  });

  router.get('/api/admin/banners/:id', (c) => {
    c.require('content.manage');
    return { banner: adminShape(requireBanner(c.params.id)) };
  });

  router.post('/api/admin/banners', (c) => {
    const user = c.require('content.manage');
    const { values, errors } = clean(c.body);
    if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields', errors);
    const status = oneOf(c.body.status, ['draft', 'published'], 'draft');
    const now = new Date().toISOString();
    // A new banner goes to the top, so it is never silently below the homepage limit.
    const sort = db.prepare('SELECT COALESCE(MIN(sort), 1) - 1 AS n FROM home_banners').get().n;
    const info = db.prepare(`INSERT INTO home_banners (observance_id, options, title, description, image_url, image_alt, youtube_id, cta_label, cta_url, starts_at, ends_at, status, sort, created_by, updated_by, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(values.observance_id, values.options, values.title, values.description, values.image_url, values.image_alt, values.youtube_id,
      values.cta_label, values.cta_url, values.starts_at, values.ends_at, status, sort, user.id, user.id, status === 'published' ? now : null);
    const id = Number(info.lastInsertRowid);
    logModeration(user.id, 'banner.create', 'banner', id, `${values.title} (${status})`);
    return { banner: adminShape(byId(id)) };
  });

  router.patch('/api/admin/banners/:id', (c) => {
    const user = c.require('content.manage');
    const r = requireBanner(c.params.id);
    const { values, errors } = clean(c.body, r);
    if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields', errors);
    db.prepare(`UPDATE home_banners SET observance_id = ?, options = ?, title = ?, description = ?, image_url = ?, image_alt = ?, youtube_id = ?, cta_label = ?, cta_url = ?, starts_at = ?, ends_at = ?,
      updated_by = ?, updated_at = ? WHERE id = ?`).run(values.observance_id, values.options, values.title, values.description, values.image_url, values.image_alt, values.youtube_id,
      values.cta_label, values.cta_url, values.starts_at, values.ends_at, user.id, new Date().toISOString(), r.id);
    logModeration(user.id, 'banner.update', 'banner', r.id, values.title);
    return { banner: adminShape(byId(r.id)) };
  });

  router.post('/api/admin/banners/:id/status', (c) => {
    const user = c.require('content.manage');
    const r = requireBanner(c.params.id);
    const status = oneOf(c.body.status, ['draft', 'published']);
    if (!status) throw badRequest('Choose draft or published');
    if (status === 'published') {
      // Re-check: a banner saved before an image was removed elsewhere must still be complete.
      const { errors } = clean({}, r);
      if (Object.keys(errors).length) throw badRequest('Complete the banner before publishing it', errors);
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE home_banners SET status = ?, published_at = CASE WHEN ? = \'published\' THEN COALESCE(published_at, ?) ELSE published_at END, updated_by = ?, updated_at = ? WHERE id = ?')
      .run(status, status, now, user.id, now, r.id);
    logModeration(user.id, status === 'published' ? 'banner.publish' : 'banner.unpublish', 'banner', r.id, r.title);
    return { banner: adminShape(byId(r.id)) };
  });

  router.post('/api/admin/banners/reorder', (c) => {
    const user = c.require('content.manage');
    const ids = [...new Set((Array.isArray(c.body.ids) ? c.body.ids : []).map((x) => int(x, { fallback: 0 })).filter(Boolean))];
    const all = db.prepare('SELECT id FROM home_banners').all().map((r) => Number(r.id));
    if (ids.length !== all.length || !ids.every((id) => all.includes(id))) throw badRequest('Send every banner id once, in the new order');
    transaction(db, () => ids.forEach((id, i) => db.prepare('UPDATE home_banners SET sort = ? WHERE id = ?').run(i, id)));
    logModeration(user.id, 'banner.reorder', 'banner', null, ids.join(','));
    return { items: db.prepare('SELECT * FROM home_banners ORDER BY sort, id').all().map(adminShape) };
  });

  router.delete('/api/admin/banners/:id', (c) => {
    const user = c.require('content.delete');
    const r = requireBanner(c.params.id);
    db.prepare('DELETE FROM home_banners WHERE id = ?').run(r.id);
    logModeration(user.id, 'banner.delete', 'banner', r.id, r.title);
    return { ok: true };
  });
}
