/* ==========================================================================
   Sikhify API — routes/gurdwaras.js   (Global Gurdwara Directory)

   Public (no sign-in):
     GET  /api/gurdwaras                      search + filters + sort + pagination (server-side)
     GET  /api/gurdwaras/meta                 facilities, services, statuses, quick countries
     GET  /api/gurdwaras/locations            countries → states → cities that have records
     GET  /api/gurdwaras/place                display names for a country/state/city path
     GET  /api/gurdwaras/by-path/:co/:st/:ci/:slug   full detail + nearby
   Members:
     POST /api/gurdwaras/submissions          suggest a Gurdwara / an update (→ pending)
     GET  /api/me/gurdwara-submissions        my suggestions and their review status
     PATCH /api/gurdwaras/submissions/:id     resubmit after "changes requested"
   Staff (content.manage / submission.review): /api/admin/gurdwaras…

   Public listings show only ACTIVE + VERIFIED records unless the visitor asks
   for other statuses. Archived records are never public. A visitor's location
   is used only to sort the current request; it is never stored or logged.
   ========================================================================== */
import { HttpError, badRequest, notFound, forbidden, str, int, oneOf } from '../lib/http.js';
import { createGurdwaraStore, parseCsv, gurdwaraUrl, ftsQuery } from '../lib/gurdwaraStore.js';
import { transaction, isRemoteDatabase } from '../db/database.js';
import { can } from '../../shared/roles.js';
import {
  FACILITIES, SERVICES, STATUSES, STATUS_FILTERS, SOURCE_TYPES, QUICK_COUNTRY_CODES, PAGE_SIZES, STATUS_KEYS,
} from '../../shared/gurdwaras.js';

const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

export default function register(router, deps) {
  const { db, rate, notify, logModeration, config = {}, log = console } = deps;
  // In production, development fixture records are never served (see scripts/seed-dev-gurdwaras.js).
  const store = createGurdwaraStore(db, { hideFixtures: !!config.production, remote: isRemoteDatabase(db) });
  deps.gurdwaraStore = store;

  /* ---------------------------------------------------------------- public */
  router.get('/api/gurdwaras', (c) => {
    const q = c.query;
    const search = str(q.get('q'), { max: 120 });
    const lat = num(q.get('lat')), lng = num(q.get('lng'));
    const validOrigin = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const res = store.search({
      q: search,
      country: str(q.get('country'), { max: 80 }), state: str(q.get('state'), { max: 80 }), city: str(q.get('city'), { max: 80 }),
      statuses: list(q.get('status')),
      facilities: list(q.get('facilities')), services: list(q.get('services')),
      sort: oneOf(q.get('sort'), ['name', 'distance', 'updated'], 'name'),
      lat: validOrigin ? lat : NaN, lng: validOrigin ? lng : NaN,
      radiusKm: validOrigin ? int(q.get('radius'), { min: 1, max: 20000, fallback: null }) : null,
      page: int(q.get('page'), { min: 1, max: 5000, fallback: 1 }),
      pageSize: int(q.get('pageSize'), { fallback: 20 }),
    });
    const { debug, ...body } = res;
    if (config.debugQueries) {
      // Development aid: the filters, the SQL conditions and the counts. The visitor's location is not logged.
      const used = Object.fromEntries([...q.entries()].filter(([k, v]) => v !== '' && k !== 'lat' && k !== 'lng'));
      log.info?.(`[gurdwaras] GET /api/gurdwaras ${JSON.stringify(used)}${validOrigin ? ' +location' : ''}
  WHERE ${debug.where}
  DB RESULT: total=${res.total} returned=${res.items.length} page=${res.page}/${res.pages}${res.alsoMatching ? ' alsoMatching=' + JSON.stringify(res.alsoMatching) : ''}`);
    }
    // Results depend on the query only, so short-lived shared caching is safe (no personal data).
    c.res.setHeader('Cache-Control', validOrigin ? 'no-store' : 'public, max-age=60');
    return body;
  });

  const notFixture = config.production ? "(g.external_ref IS NULL OR g.external_ref NOT LIKE 'fixture:%')" : '1';
  router.get('/api/gurdwaras/meta', (c) => {
    const quick = QUICK_COUNTRY_CODES.map((code) => db.prepare(`SELECT co.code, co.name, co.slug,
        (SELECT COUNT(*) FROM gurdwaras g WHERE g.country_id = co.id AND g.archived_at IS NULL AND g.status = 'active' AND g.verification_status = 'verified' AND ${notFixture}) AS count
      FROM countries co WHERE co.code = ?`).get(code)).filter(Boolean);
    c.res.setHeader('Cache-Control', 'public, max-age=300');
    return {
      facilities: FACILITIES, services: SERVICES, statusFilters: STATUS_FILTERS, statuses: STATUSES, sourceTypes: SOURCE_TYPES,
      pageSizes: PAGE_SIZES, quickCountries: quick,
      totalVerified: db.prepare(`SELECT COUNT(*) AS n FROM gurdwaras g WHERE archived_at IS NULL AND status = 'active' AND verification_status = 'verified' AND ${notFixture}`).get().n,
      totalListed: db.prepare(`SELECT COUNT(*) AS n FROM gurdwaras g WHERE archived_at IS NULL AND ${notFixture}`).get().n,
    };
  });

  router.get('/api/gurdwaras/locations', (c) => {
    c.res.setHeader('Cache-Control', 'public, max-age=60');
    return store.locations({ country: str(c.query.get('country'), { max: 80 }), state: str(c.query.get('state'), { max: 80 }) });
  });

  router.get('/api/gurdwaras/countries', () => ({
    items: db.prepare('SELECT code, name, slug FROM countries ORDER BY name').all(),
  }));

  router.get('/api/gurdwaras/place', (c) => store.placeNames({
    country: str(c.query.get('country'), { max: 80 }), state: str(c.query.get('state'), { max: 80 }), city: str(c.query.get('city'), { max: 80 }),
  }));

  router.get('/api/gurdwaras/by-path/:country/:state/:city/:slug', (c) => {
    const r = store.rowByPath(c.params.country, c.params.state, c.params.city, c.params.slug);
    if (!r || (r.archived_at && !can(c.user, 'content.manage'))) throw notFound('This Gurdwara is not in the directory');
    return { gurdwara: { ...store.detailShape(r), archived: !!r.archived_at }, nearby: store.nearby(r) };
  });

  /* ---------------------------------------------------------------- community submissions */
  function cleanSubmission(body) {
    const kind = body.kind === 'update' ? 'update' : 'new';
    const out = {
      kind,
      name: str(body.name, { max: 200 }), country: str(body.country, { max: 100 }), state: str(body.state, { max: 100 }), city: str(body.city, { max: 100 }),
      address: str(body.address, { max: 500 }), website: str(body.website, { max: 300 }), phone: str(body.phone, { max: 60 }),
      details: str(body.details, { max: 5000 }), source: str(body.source, { max: 500 }),
    };
    const fields = {};
    if (kind === 'new') {
      if (out.name.length < 3) fields.name = 'Enter the Gurdwara’s name';
      if (!out.country) fields.country = 'Choose the country';
      if (!out.state) fields.state = 'Enter the state, province or region';
      if (!out.city) fields.city = 'Enter the city or town';
    } else if (out.details.length < 10) fields.details = 'Describe what should be updated';
    if (out.website && !/^https?:\/\/\S+$/i.test(out.website)) fields.website = 'Use a full link starting with https://';
    if (out.source.length < 3) fields.source = 'Tell us where this information comes from (a link or reference)';
    return { out, fields };
  }

  router.post('/api/gurdwaras/submissions', (c) => {
    const user = c.require('submission.create');
    if (!deps.settings.get('submissions_open')) throw new HttpError(403, 'Submissions are paused right now. Please try again later.');
    rate('submission', 'gurdwara-submission:' + user.id);
    const { out, fields } = cleanSubmission(c.body);
    let gurdwaraId = null;
    if (out.kind === 'update') {
      gurdwaraId = int(c.body.gurdwaraId, { fallback: 0 });
      const g = store.row(gurdwaraId);
      if (!g || g.archived_at) throw badRequest('That Gurdwara is not in the directory');
      if (!out.name) out.name = g.name;
    }
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    const info = db.prepare(`INSERT INTO gurdwara_submissions (kind, gurdwara_id, submitter_id, name, country, state, city, address, website, phone, details, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(out.kind, gurdwaraId, user.id, out.name, out.country, out.state, out.city, out.address, out.website, out.phone, out.details, out.source);
    // Possible matches are shown to the submitter (public, verified records only) so they can spot an existing listing.
    const possible = out.kind === 'new'
      ? store.findDuplicates(out).filter((d) => !d.archived && d.verification === 'verified').map((d) => ({ name: d.name, url: d.url, city: d.city }))
      : [];
    return { id: Number(info.lastInsertRowid), status: 'pending', possibleExisting: possible };
  });

  const subShape = (r) => ({
    id: r.id, kind: r.kind, gurdwaraId: r.gurdwara_id, name: r.name, country: r.country, state: r.state, city: r.city,
    address: r.address, website: r.website, phone: r.phone, details: r.details, source: r.source, status: r.status,
    reviewNote: r.review_note, resultGurdwaraId: r.result_gurdwara_id, createdAt: r.created_at, updatedAt: r.updated_at, reviewedAt: r.reviewed_at,
    submitter: r.submitter_name ? { name: r.submitter_name, username: r.submitter_username } : undefined,
    reviewer: r.reviewer_name || undefined,
    resultUrl: r.result_gurdwara_id ? (() => { const g = store.row(r.result_gurdwara_id); return g && !g.archived_at ? gurdwaraUrl(g) : null; })() : null,
    targetUrl: r.gurdwara_id ? (() => { const g = store.row(r.gurdwara_id); return g ? gurdwaraUrl(g) : null; })() : null,
  });

  router.get('/api/me/gurdwara-submissions', (c) => {
    const me = c.requireUser();
    return { items: db.prepare('SELECT * FROM gurdwara_submissions WHERE submitter_id = ? ORDER BY id DESC LIMIT 100').all(me.id).map(subShape) };
  });

  router.patch('/api/gurdwaras/submissions/:id', (c) => {
    const me = c.require('submission.create');
    const s = db.prepare('SELECT * FROM gurdwara_submissions WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!s || s.submitter_id !== me.id) throw notFound('Submission not found');
    if (s.status !== 'changes_requested') throw new HttpError(409, 'Only submissions with requested changes can be edited');
    const { out, fields } = cleanSubmission({ ...s, ...c.body, kind: s.kind });
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    db.prepare(`UPDATE gurdwara_submissions SET name = ?, country = ?, state = ?, city = ?, address = ?, website = ?, phone = ?, details = ?, source = ?,
      status = 'pending', updated_at = ? WHERE id = ?`).run(out.name, out.country, out.state, out.city, out.address, out.website, out.phone, out.details, out.source, new Date().toISOString(), s.id);
    return { submission: subShape(db.prepare('SELECT * FROM gurdwara_submissions WHERE id = ?').get(s.id)) };
  });

  /* ---------------------------------------------------------------- staff: records */
  const requireRecord = (id) => {
    const r = store.row(int(id, { fallback: 0 }));
    if (!r) throw notFound('Gurdwara not found');
    return r;
  };
  const adminDetail = (id) => store.detailShape(store.row(id), { admin: true });

  router.get('/api/admin/gurdwaras/stats', (c) => { c.require('content.manage'); return store.stats(); });

  router.get('/api/admin/gurdwaras', (c) => {
    c.require('content.manage');
    const q = c.query;
    const where = [];
    const params = [];
    const archived = q.get('archived') === '1';
    where.push(archived ? 'g.archived_at IS NOT NULL' : 'g.archived_at IS NULL');
    const status = oneOf(q.get('status'), STATUS_KEYS);
    if (status) { where.push('g.status = ?'); params.push(status); }
    const ver = oneOf(q.get('verification'), ['verified', 'needs_verification']);
    if (ver) { where.push('g.verification_status = ?'); params.push(ver); }
    const country = str(q.get('country'), { max: 80 });
    if (country) { where.push('co.slug = ?'); params.push(country); }
    const term = str(q.get('q'), { max: 120 });
    if (term) {
      const match = ftsQuery(term) || '""';
      where.push('(g.id IN (SELECT rowid FROM gurdwaras_fts WHERE gurdwaras_fts MATCH ?) OR g.phone LIKE ?)');
      params.push(match, `%${term}%`);
    }
    const page = int(q.get('page'), { min: 1, max: 5000, fallback: 1 });
    const w = where.join(' AND ');
    const FROM = `FROM gurdwaras g JOIN cities ci ON ci.id = g.city_id JOIN states_regions st ON st.id = g.state_region_id JOIN countries co ON co.id = g.country_id`;
    const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} WHERE ${w}`).get(...params).n;
    const rows = db.prepare(`SELECT g.id, g.name, g.slug, g.status, g.verification_status, g.updated_at, g.archived_at, g.latitude,
        ci.name AS city_name, ci.slug AS city_slug, st.name AS state_name, st.slug AS state_slug, co.name AS country_name, co.slug AS country_slug,
        (SELECT COUNT(*) FROM gurdwara_sources s WHERE s.gurdwara_id = g.id) AS source_count
      ${FROM} WHERE ${w} ORDER BY g.updated_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    return {
      items: rows.map((r) => ({ id: r.id, name: r.name, url: gurdwaraUrl(r), status: r.status, verification: r.verification_status, city: r.city_name, state: r.state_name, country: r.country_name, updatedAt: r.updated_at, archived: !!r.archived_at, hasCoordinates: r.latitude !== null, sourceCount: r.source_count })),
      total, page, pages: Math.max(1, Math.ceil(total / 25)),
    };
  });

  router.get('/api/admin/gurdwaras/check-duplicates', (c) => {
    c.require('content.manage');
    const q = c.query;
    return { items: store.findDuplicates({ name: q.get('name'), city: q.get('city'), country: q.get('country'), phone: q.get('phone'), website: q.get('website'), latitude: q.get('latitude'), longitude: q.get('longitude') }, { excludeId: int(q.get('excludeId'), { fallback: null }) }) };
  });

  router.get('/api/admin/gurdwaras/duplicates', (c) => { c.require('content.manage'); return { items: store.duplicatePairs(200) }; });

  router.get('/api/admin/gurdwaras/:id', (c) => {
    c.require('content.manage');
    const r = requireRecord(c.params.id);
    return { gurdwara: adminDetail(r.id) };
  });

  router.post('/api/admin/gurdwaras', (c) => {
    const user = c.require('content.manage');
    if (!c.body.force) {
      const dups = store.findDuplicates(c.body);
      if (dups.length) throw Object.assign(new HttpError(409, 'Possible existing Gurdwara — compare before creating', { code: 'possible_duplicates' }), { fields: { duplicates: dups } });
    }
    const res = store.create(c.body, user);
    if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
    logModeration(user.id, 'gurdwara.create', 'gurdwara', res.id, c.body.name);
    return { gurdwara: adminDetail(res.id) };
  });

  router.patch('/api/admin/gurdwaras/:id', (c) => {
    const user = c.require('content.manage');
    const r = requireRecord(c.params.id);
    const res = store.update(r.id, c.body, user);
    if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
    return { gurdwara: adminDetail(r.id) };
  });

  router.post('/api/admin/gurdwaras/:id/status', (c) => {
    const user = c.require('content.manage');
    const r = requireRecord(c.params.id);
    const status = oneOf(c.body.status, STATUS_KEYS);
    if (!status) throw badRequest('Unknown status');
    db.prepare('UPDATE gurdwaras SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(status, user.id, new Date().toISOString(), r.id);
    store.log(r.id, 'status changed', { status: { from: r.status, to: status } }, user);
    return { gurdwara: adminDetail(r.id) };
  });

  /** Verify (requires at least one source) or mark as needing verification. */
  /**
   * Verify several records the reviewer has checked (e.g. after an import). Each record still
   * needs at least one source; the reviewer's note is kept in every record's verification log.
   */
  router.post('/api/admin/gurdwaras/verify-bulk', (c) => {
    const user = c.require('content.manage');
    const ids = [...new Set((Array.isArray(c.body.ids) ? c.body.ids : []).map((x) => int(x, { fallback: 0 })).filter(Boolean))];
    if (!ids.length) throw badRequest('Choose at least one record');
    if (ids.length > 100) throw badRequest('Verify at most 100 records at a time');
    const note = str(c.body.note, { max: 1000 });
    if (note.length < 5) throw badRequest('Please fix the highlighted fields', { note: 'Say what you checked (kept in each record’s verification log)' });
    const now = new Date().toISOString();
    const verified = [];
    const skipped = [];
    transaction(db, () => {
      for (const id of ids) {
        const r = store.row(id);
        if (!r) { skipped.push({ id, reason: 'not found' }); continue; }
        if (r.archived_at) { skipped.push({ id, reason: 'archived' }); continue; }
        if (r.verification_status === 'verified') { skipped.push({ id, reason: 'already verified' }); continue; }
        if (!db.prepare('SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ?').get(id)) { skipped.push({ id, reason: 'no source' }); continue; }
        db.prepare("UPDATE gurdwaras SET verification_status = 'verified', verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(user.id, now, user.id, now, id);
        db.prepare('INSERT INTO gurdwara_verification (gurdwara_id, action, note, actor_id) VALUES (?, ?, ?, ?)').run(id, 'verified', note, user.id);
        db.prepare('UPDATE gurdwara_sources SET verified_at = COALESCE(verified_at, ?) WHERE gurdwara_id = ?').run(now, id);
        verified.push(id);
      }
    });
    if (verified.length) logModeration(user.id, 'gurdwara.verify_bulk', 'gurdwara', null, `${verified.length} verified: ${note}`);
    return { verified: verified.length, skipped };
  });

  router.post('/api/admin/gurdwaras/:id/verify', (c) => {
    const user = c.require('content.manage');
    const r = requireRecord(c.params.id);
    const verified = !!c.body.verified;
    const note = str(c.body.note, { max: 1000 });
    if (verified && !db.prepare('SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ?').get(r.id)) {
      throw badRequest('Add at least one source before verifying', { sources: 'A verified Gurdwara needs a source' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE gurdwaras SET verification_status = ?, verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?')
      .run(verified ? 'verified' : 'needs_verification', verified ? user.id : r.verified_by, verified ? now : r.verified_at, user.id, now, r.id);
    db.prepare('INSERT INTO gurdwara_verification (gurdwara_id, action, note, actor_id) VALUES (?, ?, ?, ?)').run(r.id, verified ? 'verified' : 'marked needs verification', note, user.id);
    if (verified) db.prepare('UPDATE gurdwara_sources SET verified_at = COALESCE(verified_at, ?) WHERE gurdwara_id = ?').run(now, r.id);
    logModeration(user.id, verified ? 'gurdwara.verify' : 'gurdwara.unverify', 'gurdwara', r.id, note);
    return { gurdwara: adminDetail(r.id) };
  });

  router.post('/api/admin/gurdwaras/:id/archive', (c) => {
    const user = c.require('content.manage');
    const r = requireRecord(c.params.id);
    const archived = c.body.archived !== false;
    db.prepare('UPDATE gurdwaras SET archived_at = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(archived ? new Date().toISOString() : null, user.id, new Date().toISOString(), r.id);
    store.log(r.id, archived ? 'archived' : 'restored', {}, user);
    logModeration(user.id, archived ? 'gurdwara.archive' : 'gurdwara.restore', 'gurdwara', r.id, r.name);
    return { gurdwara: adminDetail(r.id) };
  });

  router.post('/api/admin/gurdwaras/:id/sources', (c) => {
    const user = c.require('content.manage');
    const r = requireRecord(c.params.id);
    const res = store.addSource(r.id, c.body, user);
    if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
    return { gurdwara: adminDetail(r.id) };
  });

  router.delete('/api/admin/gurdwara-sources/:id', (c) => {
    const user = c.require('content.manage');
    const s = db.prepare('SELECT * FROM gurdwara_sources WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!s) throw notFound('Source not found');
    const g = store.row(s.gurdwara_id);
    const remaining = db.prepare('SELECT COUNT(*) AS n FROM gurdwara_sources WHERE gurdwara_id = ?').get(s.gurdwara_id).n;
    if (g.verification_status === 'verified' && remaining <= 1) throw new HttpError(409, 'A verified Gurdwara must keep at least one source — mark it as needing verification first');
    db.prepare('DELETE FROM gurdwara_sources WHERE id = ?').run(s.id);
    store.log(s.gurdwara_id, 'source removed', { source: s.source_name }, user);
    return { gurdwara: adminDetail(s.gurdwara_id) };
  });

  /* ---------- images (uploaded with the uploader, purpose "gurdwara") */
  const ownedUpload = (url) => typeof url === 'string' && url.startsWith('/uploads/') && db.prepare("SELECT 1 FROM uploads WHERE path = ? AND purpose = 'gurdwara'").get(url.slice(9));

  router.post('/api/admin/gurdwaras/:id/images', (c) => {
    const user = c.require('content.manage');
    const r = requireRecord(c.params.id);
    const b = c.body;
    const fields = {};
    if (!ownedUpload(b.url)) fields.url = 'Upload the image with the uploader';
    if (b.thumbUrl && !ownedUpload(b.thumbUrl)) fields.url = 'Upload the image with the uploader';
    const alt = str(b.alt, { max: 300 });
    if (alt.length < 8) fields.alt = 'Describe what the photo shows (for people using screen readers)';
    const credit = str(b.credit, { max: 300 });
    if (credit.length < 2) fields.credit = 'Who took the photo or owns it?';
    const license = str(b.license, { max: 200 });
    if (license.length < 2) fields.license = 'Licence or permission (e.g. “Taken by Sikhify volunteer”, “CC BY-SA 4.0”, “Permission from the Gurdwara committee”)';
    const sourceUrl = str(b.sourceUrl, { max: 500 });
    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) fields.sourceUrl = 'Use a full link starting with https://';
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    transaction(db, () => {
      if (b.isPrimary) db.prepare('UPDATE gurdwara_images SET is_primary = 0 WHERE gurdwara_id = ?').run(r.id);
      const first = !db.prepare('SELECT 1 FROM gurdwara_images WHERE gurdwara_id = ?').get(r.id);
      db.prepare(`INSERT INTO gurdwara_images (gurdwara_id, url, thumb_url, width, height, alt, credit, license, source_url, is_primary, sort, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM gurdwara_images WHERE gurdwara_id = ?), ?)`)
        .run(r.id, b.url, b.thumbUrl || '', int(b.width, { fallback: null }), int(b.height, { fallback: null }), alt, credit, license, sourceUrl, b.isPrimary || first ? 1 : 0, r.id, user.id);
      store.log(r.id, 'image added', { alt }, user);
    });
    return { gurdwara: adminDetail(r.id) };
  }, { upload: false });

  router.patch('/api/admin/gurdwara-images/:id', (c) => {
    const user = c.require('content.manage');
    const img = db.prepare('SELECT * FROM gurdwara_images WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!img) throw notFound('Image not found');
    transaction(db, () => {
      if (c.body.isPrimary) {
        db.prepare('UPDATE gurdwara_images SET is_primary = 0 WHERE gurdwara_id = ?').run(img.gurdwara_id);
        db.prepare('UPDATE gurdwara_images SET is_primary = 1 WHERE id = ?').run(img.id);
      }
      if (c.body.alt !== undefined) {
        const alt = str(c.body.alt, { max: 300 });
        if (alt.length < 8) throw badRequest('Please fix the highlighted fields', { alt: 'Describe what the photo shows' });
        db.prepare('UPDATE gurdwara_images SET alt = ? WHERE id = ?').run(alt, img.id);
      }
      store.log(img.gurdwara_id, 'image updated', {}, user);
    });
    return { gurdwara: adminDetail(img.gurdwara_id) };
  });

  router.delete('/api/admin/gurdwara-images/:id', (c) => {
    const user = c.require('content.manage');
    const img = db.prepare('SELECT * FROM gurdwara_images WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!img) throw notFound('Image not found');
    db.prepare('DELETE FROM gurdwara_images WHERE id = ?').run(img.id);
    if (img.is_primary) db.prepare('UPDATE gurdwara_images SET is_primary = 1 WHERE id = (SELECT id FROM gurdwara_images WHERE gurdwara_id = ? ORDER BY sort LIMIT 1)').run(img.gurdwara_id);
    store.log(img.gurdwara_id, 'image removed', {}, user);
    return { gurdwara: adminDetail(img.gurdwara_id) };
  });

  /* ---------- bulk import */
  router.post('/api/admin/gurdwaras/import', (c) => {
    const user = c.require('content.manage');
    const format = oneOf(c.body.format, ['csv', 'json']);
    if (!format) throw badRequest('Choose CSV or JSON');
    let rows;
    try {
      rows = format === 'csv' ? parseCsv(String(c.body.content || '')) : JSON.parse(String(c.body.content || '[]'));
    } catch {
      throw badRequest('The file could not be read — check that it is valid ' + format.toUpperCase());
    }
    if (!Array.isArray(rows)) throw badRequest('JSON must be an array of Gurdwara objects');
    if (!rows.length) throw badRequest('The file has no rows');
    if (rows.length > 5000) throw badRequest('Import at most 5,000 rows at a time');
    const dryRun = c.body.dryRun !== false;
    const report = store.importRows(rows, user, { dryRun });
    if (!dryRun) logModeration(user.id, 'gurdwara.import', 'gurdwara', null, `${report.imported} imported, ${report.updated} updated, ${report.duplicates} duplicates, ${report.invalid} invalid`);
    return { dryRun, report };
  }, { upload: true });

  /* ---------------------------------------------------------------- staff: submission review */
  const SUB_SELECT = `SELECT s.*, su.name AS submitter_name, su.username AS submitter_username, ru.name AS reviewer_name FROM gurdwara_submissions s
    LEFT JOIN users su ON su.id = s.submitter_id LEFT JOIN users ru ON ru.id = s.reviewer_id`;

  router.get('/api/admin/gurdwara-submissions', (c) => {
    c.require('submission.review');
    const status = oneOf(c.query.get('status'), ['pending', 'changes_requested', 'approved', 'rejected']);
    const page = int(c.query.get('page'), { min: 1, max: 1000, fallback: 1 });
    const w = status ? 'WHERE s.status = ?' : '';
    const params = status ? [status] : [];
    const total = db.prepare(`SELECT COUNT(*) AS n FROM gurdwara_submissions s ${w}`).get(...params).n;
    const items = db.prepare(`${SUB_SELECT} ${w} ORDER BY CASE s.status WHEN 'pending' THEN 0 ELSE 1 END, s.id DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25)
      .map((r) => ({ ...subShape(r), possibleDuplicates: r.kind === 'new' && r.status === 'pending' ? store.findDuplicates(r) : [] }));
    return { items, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
  });

  /**
   * decision: approve | reject | request_changes
   * approve (new): creates the record from the submission + reviewer's edits (`record`), or links it to an
   *   existing record (`mergeIntoId`). It stays "needs verification" unless the reviewer verifies it with a source.
   * approve (update): applies the reviewer's edits (`record`) to the existing record.
   */
  router.post('/api/admin/gurdwara-submissions/:id/review', (c) => {
    const user = c.require('submission.review');
    if (!can(user, 'content.manage')) throw forbidden();
    const s = db.prepare('SELECT * FROM gurdwara_submissions WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!s) throw notFound('Submission not found');
    if (s.status !== 'pending') throw new HttpError(409, 'This submission has already been reviewed');
    const decision = oneOf(c.body.decision, ['approve', 'reject', 'request_changes']);
    if (!decision) throw badRequest('Choose approve, reject or request changes');
    const note = str(c.body.note, { max: 1000 });
    if (decision !== 'approve' && note.length < 3) throw badRequest('Please fix the highlighted fields', { note: 'Tell the submitter why (they will see this note)' });
    let resultId = null;

    transaction(db, () => {
      if (decision === 'approve') {
        const record = { ...(c.body.record || {}) };
        if (s.kind === 'new') {
          const mergeInto = int(c.body.mergeIntoId, { fallback: 0 });
          if (mergeInto) {
            resultId = requireRecord(mergeInto).id;
            if (Object.keys(record).length) {
              const res = store.update(resultId, record, user, { note: 'updated from submission #' + s.id });
              if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
            }
          } else {
            const input = { name: s.name, country: s.country, state: s.state, city: s.city, address: s.address, website: s.website, phone: s.phone, ...record };
            if (!c.body.force) {
              const dups = store.findDuplicates(input);
              if (dups.length) throw Object.assign(new HttpError(409, 'Possible existing Gurdwara — compare before creating', { code: 'possible_duplicates' }), { fields: { duplicates: dups } });
            }
            const res = store.create(input, user, { note: 'created from submission #' + s.id });
            if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
            resultId = res.id;
          }
        } else {
          resultId = requireRecord(s.gurdwara_id).id;
          const res = store.update(resultId, record, user, { note: 'updated from submission #' + s.id });
          if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
        }
        // The submitter's reference is kept as a community source; it does not verify the record on its own.
        store.addSource(resultId, { name: /^https?:/i.test(s.source) ? 'Community submission' : s.source.slice(0, 300), url: /^https?:\/\/\S+$/i.test(s.source) ? s.source : '', type: 'community', notes: `Submission #${s.id}` }, user);
        if (c.body.source && c.body.source.name) {
          const res = store.addSource(resultId, { ...c.body.source, verified: !!c.body.verify }, user);
          if (res.errors) throw badRequest('Please fix the highlighted fields', res.errors);
        }
        if (c.body.verify) {
          if (!(c.body.source && c.body.source.name) && !db.prepare("SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ? AND source_type != 'community'").get(resultId)) {
            throw badRequest('Add the source you checked before verifying', { source: 'A verified Gurdwara needs a non-community source' });
          }
          const now = new Date().toISOString();
          db.prepare("UPDATE gurdwaras SET verification_status = 'verified', verified_by = ?, verified_at = ? WHERE id = ?").run(user.id, now, resultId);
          db.prepare('INSERT INTO gurdwara_verification (gurdwara_id, action, note, actor_id) VALUES (?, ?, ?, ?)').run(resultId, 'verified', `Reviewed submission #${s.id}. ${note}`.trim(), user.id);
        }
      }
      const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested';
      db.prepare('UPDATE gurdwara_submissions SET status = ?, review_note = ?, reviewer_id = ?, reviewed_at = ?, result_gurdwara_id = ?, updated_at = ? WHERE id = ?')
        .run(status, note, user.id, new Date().toISOString(), resultId, new Date().toISOString(), s.id);
    });

    const updated = db.prepare(`${SUB_SELECT} WHERE s.id = ?`).get(s.id);
    notify(s.submitter_id, {
      type: 'submission_reviewed', actorId: user.id, link: '/directory/gurdwaras/suggest#mine',
      message: updated.status === 'approved' ? `Thank you — your suggestion “${s.name}” was approved.`
        : updated.status === 'rejected' ? `Your suggestion “${s.name}” was not accepted: ${note}`
          : `Please update your suggestion “${s.name}”: ${note}`,
    });
    logModeration(user.id, 'gurdwara_submission.' + updated.status, 'gurdwara_submission', s.id, note);
    return { submission: subShape(updated) };
  });
}
