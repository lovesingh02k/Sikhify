/* ==========================================================================
   Sikhify API — lib/gurdwaraStore.js
   All database access for the Global Gurdwara Directory: server-side search
   (FTS5 + indexed filters + distance), record shapes, writes with an audit
   trail, duplicate detection and bulk import. Routes stay thin.
   ========================================================================== */
import { transaction } from '../db/database.js';
import { findOrCreateCountry, findOrCreateState, findOrCreateCity, uniqueSlug, reindex } from '../db/gurdwaraSchema.js';
import {
  STATUS_KEYS, DEFAULT_STATUS_FILTER, FACILITY_KEYS, SERVICE_KEYS, SOURCE_TYPE_KEYS, PAGE_SIZES, DESIGNATION_KEYS,
  normalizeName, phoneDigits, websiteHost, distanceKm, validateGurdwara, SEARCH_VARIANTS,
} from '../../../shared/gurdwaras.js';

/** Imported (not uploaded) photos must come from Wikimedia Commons, with their author and licence. */
const COMMONS_IMAGE = /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/\S+$/;
/** Fields an import row may explicitly empty with `clear: [...]` (e.g. a wrong coordinate copied between records). */
const CLEARABLE = ['established_year', 'latitude', 'longitude', 'website', 'phone', 'email', 'address', 'postal_code', 'opening_hours'];

const BASE_FROM = `FROM gurdwaras g
  JOIN cities ci ON ci.id = g.city_id
  JOIN states_regions st ON st.id = g.state_region_id
  JOIN countries co ON co.id = g.country_id`;
const COLS = `g.*, ci.name AS city_name, ci.slug AS city_slug, st.name AS state_name, st.slug AS state_slug,
  co.name AS country_name, co.slug AS country_slug, co.code AS country_code`;

export const gurdwaraUrl = (r) => `/directory/gurdwaras/${r.country_slug}/${r.state_slug}/${r.city_slug}/${r.slug}`;

/**
 * "golden temp" → '"golden"* "temp"*' (every word must match, as a prefix).
 * Spelling variants match each other: "gurudwara" also finds "Gurdwara …".
 */
export function ftsQuery(q) {
  const terms = String(q || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return terms.slice(0, 8).map((t) => {
    const group = SEARCH_VARIANTS.find((g) => g.includes(t));
    return group ? `(${group.map((x) => `"${x}"*`).join(' OR ')})` : `"${t.replace(/"/g, '')}"*`;
  }).join(' AND ');
}

/** Development fixtures are stored with external_ref "fixture:…" (see scripts/seed-dev-gurdwaras.js). */
export const FIXTURE_REF = 'fixture:';

/**
 * hideFixtures: production passes true, so development fixture records can never
 * appear publicly even if a fixture seed was run against the wrong database.
 */
export function createGurdwaraStore(db, { hideFixtures = false, remote = false } = {}) {
  const NOT_FIXTURE = hideFixtures ? `(g.external_ref IS NULL OR g.external_ref NOT LIKE '${FIXTURE_REF}%')` : '1';
  /* ---------- shapes */
  function relations(ids) {
    const out = Object.fromEntries(ids.map((id) => [id, { facilities: [], services: [], image: null }]));
    if (!ids.length) return out;
    const ph = ids.map(() => '?').join(',');
    for (const r of db.prepare(`SELECT gurdwara_id, facility_key FROM gurdwara_facilities WHERE gurdwara_id IN (${ph})`).all(...ids)) out[r.gurdwara_id].facilities.push(r.facility_key);
    for (const r of db.prepare(`SELECT gurdwara_id, service_key FROM gurdwara_services WHERE gurdwara_id IN (${ph})`).all(...ids)) out[r.gurdwara_id].services.push(r.service_key);
    for (const r of db.prepare(`SELECT * FROM gurdwara_images WHERE gurdwara_id IN (${ph}) ORDER BY is_primary DESC, sort, id`).all(...ids)) {
      if (!out[r.gurdwara_id].image) out[r.gurdwara_id].image = imageShape(r);
    }
    return out;
  }
  const imageShape = (r) => ({ id: r.id, url: r.url, thumbUrl: r.thumb_url || r.url, width: r.width, height: r.height, alt: r.alt, credit: r.credit, license: r.license, sourceUrl: r.source_url, isPrimary: !!r.is_primary });

  function cardShape(r, rel, origin) {
    const d = origin && r.latitude !== null ? distanceKm(origin.lat, origin.lng, r.latitude, r.longitude) : null;
    return {
      id: r.id, name: r.name, slug: r.slug, url: gurdwaraUrl(r),
      status: r.status, verification: r.verification_status, designation: r.designation || '', alsoKnownAs: r.also_known_as,
      address: r.address, postalCode: r.postal_code, phone: r.phone,
      city: { name: r.city_name, slug: r.city_slug }, state: { name: r.state_name, slug: r.state_slug },
      country: { name: r.country_name, slug: r.country_slug, code: r.country_code },
      latitude: r.latitude, longitude: r.longitude,
      distanceKm: d === null ? null : Math.round(d * 10) / 10,
      facilities: rel.facilities, services: rel.services, image: rel.image, updatedAt: r.updated_at,
      summary: summaryOf(r.description),
    };
  }
  /** The description's first sentence(s), up to ~200 characters, for cards. */
  function summaryOf(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= 200) return t;
    const cut = t.slice(0, 200);
    const end = cut.lastIndexOf('. ');
    return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
  }

  /* ---------- public search */
  function search(p) {
    // Place, facility, service, text and radius conditions; status/verification are added after,
    // so an empty result can report what else matches (e.g. listings awaiting verification).
    const where = ['g.archived_at IS NULL', NOT_FIXTURE];
    const params = [];
    // Default listing: ACTIVE + VERIFIED only. Other statuses only when the visitor asks for them.
    const statuses = (p.statuses || []).filter((s) => STATUS_KEYS.includes(s));
    const includeUnverified = (p.statuses || []).includes('needs_verification');
    const ops = statuses.length ? statuses : (includeUnverified ? STATUS_KEYS : DEFAULT_STATUS_FILTER);
    for (const [col, v] of [['co.slug', p.country], ['st.slug', p.state], ['ci.slug', p.city]]) {
      if (v) { where.push(`${col} = ?`); params.push(v); }
    }
    // designation: 'takht' | 'historic' | 'any' (Takhts and historic Gurdwaras together)
    if (p.designation === 'any') where.push("g.designation != ''");
    else if (DESIGNATION_KEYS.includes(p.designation)) { where.push('g.designation = ?'); params.push(p.designation); }
    for (const f of (p.facilities || []).filter((x) => FACILITY_KEYS.includes(x))) {
      where.push('EXISTS (SELECT 1 FROM gurdwara_facilities gf WHERE gf.gurdwara_id = g.id AND gf.facility_key = ?)');
      params.push(f);
    }
    for (const sv of (p.services || []).filter((x) => SERVICE_KEYS.includes(x))) {
      where.push('EXISTS (SELECT 1 FROM gurdwara_services gs WHERE gs.gurdwara_id = g.id AND gs.service_key = ?)');
      params.push(sv);
    }
    const match = ftsQuery(p.q);
    if (match) { where.push('g.id IN (SELECT rowid FROM gurdwaras_fts WHERE gurdwaras_fts MATCH ?)'); params.push(match); }
    const origin = Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null;
    const needsJsDistance = remote && origin && (p.radiusKm || p.sort === 'distance');
    if (origin && p.radiusKm) {
      // Bounding box first (uses the latitude/longitude indexes). Local SQLite
      // also applies the exact UDF in SQL; remote Turso/libSQL calculates the
      // final distance in JavaScript because remote libSQL does not expose UDFs.
      const dLat = p.radiusKm / 111;
      const dLng = p.radiusKm / (111 * Math.max(0.1, Math.cos((origin.lat * Math.PI) / 180)));
      where.push('g.latitude BETWEEN ? AND ? AND g.longitude BETWEEN ? AND ?');
      params.push(origin.lat - dLat, origin.lat + dLat, origin.lng - dLng, origin.lng + dLng);
      if (!remote) {
        where.push('distance_km(?, ?, g.latitude, g.longitude) <= ?');
        params.push(origin.lat, origin.lng, p.radiusKm);
      }
    }
    const filterWhere = where.join(' AND ');
    const filterParams = [...params];
    where.push(`g.status IN (${ops.map(() => '?').join(',')})`);
    params.push(...ops);
    if (!includeUnverified) where.push("g.verification_status = 'verified'");
    // Distance sorting only orders results; records without coordinates stay in the list (last).
    let order = 'g.name COLLATE NOCASE, g.id';
    const orderParams = [];
    const sort = p.sort === 'distance' && origin ? 'distance' : p.sort === 'updated' ? 'updated' : 'name';
    if (sort === 'distance' && !remote) { order = 'g.latitude IS NULL, distance_km(?, ?, g.latitude, g.longitude), g.name COLLATE NOCASE'; orderParams.push(origin.lat, origin.lng); }
    if (sort === 'updated') order = 'g.updated_at DESC, g.id DESC';
    const pageSize = PAGE_SIZES.includes(p.pageSize) ? p.pageSize : PAGE_SIZES[0];
    const page = Math.max(1, Math.min(p.page || 1, 5000));
    const w = where.join(' AND ');
    let total = db.prepare(`SELECT COUNT(*) AS n ${BASE_FROM} WHERE ${w}`).get(...params).n;
    let rows;
    if (needsJsDistance) {
      rows = db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE ${w} ORDER BY ${order}`).all(...params, ...orderParams);
      if (p.radiusKm) rows = rows.filter((r) => r.latitude !== null && r.longitude !== null && distanceKm(origin.lat, origin.lng, r.latitude, r.longitude) <= p.radiusKm);
      total = rows.length;
      if (sort === 'distance') {
        rows.sort((a, b) => {
          const da = a.latitude === null || a.longitude === null ? Infinity : distanceKm(origin.lat, origin.lng, a.latitude, a.longitude);
          const dbv = b.latitude === null || b.longitude === null ? Infinity : distanceKm(origin.lat, origin.lng, b.latitude, b.longitude);
          return da - dbv || String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }) || a.id - b.id;
        });
      }
      rows = rows.slice((page - 1) * pageSize, page * pageSize);
    } else {
      rows = db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, ...orderParams, pageSize, (page - 1) * pageSize);
    }
    const rel = relations(rows.map((r) => r.id));
    const out = { items: rows.map((r) => cardShape(r, rel[r.id], origin)), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), sort };
    if (!total) {
      // Nothing shown — say whether matching records exist but are hidden by the status/verification filter.
      const hidden = db.prepare(`SELECT
          SUM(CASE WHEN g.verification_status != 'verified' THEN 1 ELSE 0 END) AS needs,
          SUM(CASE WHEN g.verification_status = 'verified' AND g.status NOT IN (${ops.map(() => '?').join(',')}) THEN 1 ELSE 0 END) AS other
        ${BASE_FROM} WHERE ${filterWhere}`).get(...ops, ...filterParams);
      out.alsoMatching = { needsVerification: includeUnverified ? 0 : hidden.needs || 0, otherStatuses: hidden.other || 0 };
    }
    out.debug = { where: where.join(' AND '), params: params.length };
    return out;
  }

  /** Countries / states / cities that have records, with counts of verified, open listings. */
  function locations({ country, state } = {}) {
    const vis = `g.archived_at IS NULL AND ${NOT_FIXTURE}`;
    const verifiedCount = "SUM(CASE WHEN g.verification_status = 'verified' AND g.status = 'active' THEN 1 ELSE 0 END)";
    const out = {
      countries: db.prepare(`SELECT co.code, co.name, co.slug, ${verifiedCount} AS count, COUNT(*) AS total FROM gurdwaras g JOIN countries co ON co.id = g.country_id
        WHERE ${vis} GROUP BY co.id ORDER BY co.name`).all(),
    };
    if (country) {
      out.states = db.prepare(`SELECT st.name, st.slug, ${verifiedCount} AS count, COUNT(*) AS total FROM gurdwaras g JOIN states_regions st ON st.id = g.state_region_id
        JOIN countries co ON co.id = g.country_id WHERE ${vis} AND co.slug = ? GROUP BY st.id ORDER BY st.name`).all(country);
    }
    if (country && state) {
      out.cities = db.prepare(`SELECT ci.name, ci.slug, ${verifiedCount} AS count, COUNT(*) AS total FROM gurdwaras g JOIN cities ci ON ci.id = g.city_id
        JOIN states_regions st ON st.id = g.state_region_id JOIN countries co ON co.id = g.country_id
        WHERE ${vis} AND co.slug = ? AND st.slug = ? GROUP BY ci.id ORDER BY ci.name`).all(country, state);
    }
    return out;
  }

  function placeNames({ country, state, city }) {
    const out = {};
    if (country) out.country = db.prepare('SELECT code, name, slug FROM countries WHERE slug = ?').get(country) || null;
    if (state && out.country) out.state = db.prepare('SELECT st.name, st.slug FROM states_regions st JOIN countries co ON co.id = st.country_id WHERE co.slug = ? AND st.slug = ?').get(country, state) || null;
    if (city && out.state) out.city = db.prepare(`SELECT ci.name, ci.slug FROM cities ci JOIN states_regions st ON st.id = ci.state_region_id JOIN countries co ON co.id = ci.country_id
      WHERE co.slug = ? AND st.slug = ? AND ci.slug = ?`).get(country, state, city) || null;
    return out;
  }

  /* ---------- detail */
  function row(id) { return db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE g.id = ?`).get(id); }
  function rowByPath(country, state, city, slug) {
    return db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE co.slug = ? AND st.slug = ? AND ci.slug = ? AND g.slug = ? AND ${NOT_FIXTURE}`).get(country, state, city, slug);
  }
  function detailShape(r, { admin = false } = {}) {
    const rel = relations([r.id])[r.id];
    const base = cardShape(r, rel, null);
    const images = db.prepare('SELECT * FROM gurdwara_images WHERE gurdwara_id = ? ORDER BY is_primary DESC, sort, id').all(r.id).map(imageShape);
    const sources = db.prepare('SELECT * FROM gurdwara_sources WHERE gurdwara_id = ? ORDER BY id').all(r.id)
      .map((s) => ({ id: s.id, name: s.source_name, url: s.source_url, type: s.source_type, notes: s.notes, verifiedAt: s.verified_at }));
    const out = {
      ...base,
      officialName: r.official_name, alsoKnownAs: r.also_known_as, district: r.district, email: r.email, website: r.website,
      description: r.description, programs: r.programs, openingHours: r.opening_hours,
      establishedYear: r.established_year, managementOrganization: r.management_organization,
      images, sources, verifiedAt: r.verified_at, createdAt: r.created_at,
    };
    if (admin) {
      out.archivedAt = r.archived_at;
      out.externalRef = r.external_ref;
      out.history = db.prepare(`SELECT u.action, u.changes, u.created_at, us.name AS actor FROM gurdwara_updates u LEFT JOIN users us ON us.id = u.actor_id
        WHERE u.gurdwara_id = ? ORDER BY u.id DESC LIMIT 100`).all(r.id).map((h) => ({ action: h.action, changes: JSON.parse(h.changes || '{}'), at: h.created_at, actor: h.actor }));
      out.verificationLog = db.prepare(`SELECT v.action, v.note, v.created_at, us.name AS actor FROM gurdwara_verification v LEFT JOIN users us ON us.id = v.actor_id
        WHERE v.gurdwara_id = ? ORDER BY v.id DESC`).all(r.id).map((h) => ({ action: h.action, note: h.note, at: h.created_at, actor: h.actor }));
    }
    return out;
  }
  function nearby(r, limit = 6) {
    if (r.latitude === null) return [];
    const res = search({ lat: r.latitude, lng: r.longitude, radiusKm: 100, sort: 'distance', pageSize: 20 });
    return res.items.filter((x) => x.id !== r.id).slice(0, limit);
  }

  /* ---------- duplicates */
  const tokens = (s) => new Set(String(s || '').split(' ').filter(Boolean));
  function similarity(a, b) {
    const A = tokens(a), B = tokens(b);
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return inter / (A.size + B.size - inter);
  }

  /** Records that may be the same Gurdwara as `candidate` (any of: name in the same city, phone, website, ~150 m). */
  function findDuplicates(candidate, { excludeId = null, limit = 5 } = {}) {
    const nn = normalizeName(candidate.name);
    const pd = phoneDigits(candidate.phone);
    const wh = websiteHost(candidate.website);
    const rows = new Map();
    const add = (list) => list.forEach((r) => rows.set(r.id, r));
    const notSelf = excludeId ? ' AND g.id != ' + Number(excludeId) : '';
    if (candidate.city && candidate.country) {
      const country = db.prepare('SELECT id FROM countries WHERE code = ? OR name = ? COLLATE NOCASE OR slug = ?').get(String(candidate.country).toUpperCase(), candidate.country, String(candidate.country).toLowerCase());
      if (country) add(db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE g.country_id = ? AND (ci.name = ? COLLATE NOCASE)${notSelf} LIMIT 200`).all(country.id, candidate.city));
    }
    if (nn) add(db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE g.name_norm = ?${notSelf} LIMIT 20`).all(nn));
    if (pd) add(db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE g.phone_digits = ?${notSelf} LIMIT 20`).all(pd));
    if (wh) add(db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE g.website_host = ?${notSelf} LIMIT 20`).all(wh));
    const lat = Number(candidate.latitude), lng = Number(candidate.longitude);
    if (candidate.latitude !== null && candidate.latitude !== undefined && candidate.latitude !== '' && Number.isFinite(lat) && Number.isFinite(lng)) {
      add(db.prepare(`SELECT ${COLS} ${BASE_FROM} WHERE g.latitude BETWEEN ? AND ? AND g.longitude BETWEEN ? AND ?${notSelf} LIMIT 50`).all(lat - 0.003, lat + 0.003, lng - 0.004, lng + 0.004));
    }
    const out = [];
    for (const r of rows.values()) {
      const reasons = [];
      let score = 0;
      const sameCity = candidate.city && String(r.city_name).toLowerCase() === String(candidate.city).toLowerCase();
      const sim = similarity(nn, r.name_norm);
      if (nn && r.name_norm === nn) { reasons.push('Same name'); score = Math.max(score, sameCity ? 0.95 : 0.6); }
      else if (sim >= 0.5 && sameCity) { reasons.push('Similar name in the same city'); score = Math.max(score, 0.5 + sim * 0.4); }
      if (pd && r.phone_digits === pd) { reasons.push('Same phone number'); score = Math.max(score, 0.85); }
      if (wh && r.website_host === wh) { reasons.push('Same website'); score = Math.max(score, 0.85); }
      if (Number.isFinite(lat) && r.latitude !== null) {
        const d = distanceKm(lat, lng, r.latitude, r.longitude);
        if (d !== null && d <= 0.15) { reasons.push(`${Math.round(d * 1000)} m away`); score = Math.max(score, 0.7) + 0.1; }
      }
      if (reasons.length && score >= 0.6) out.push({ id: r.id, name: r.name, url: gurdwaraUrl(r), city: r.city_name, state: r.state_name, country: r.country_name, address: r.address, phone: r.phone, website: r.website, status: r.status, verification: r.verification_status, archived: !!r.archived_at, score: Math.min(1, Math.round(score * 100) / 100), reasons });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Pairs of existing records that look like the same Gurdwara (for the admin dashboard). */
  function duplicatePairs(limit = 100) {
    const pairs = db.prepare(`
      SELECT a.id AS a, b.id AS b, 'Same name in the same city' AS reason FROM gurdwaras a JOIN gurdwaras b ON b.city_id = a.city_id AND b.name_norm = a.name_norm AND b.id > a.id
        WHERE a.archived_at IS NULL AND b.archived_at IS NULL AND a.name_norm != ''
      UNION SELECT a.id, b.id, 'Same phone number' FROM gurdwaras a JOIN gurdwaras b ON b.phone_digits = a.phone_digits AND b.id > a.id
        WHERE a.phone_digits != '' AND a.archived_at IS NULL AND b.archived_at IS NULL
      UNION SELECT a.id, b.id, 'Same website' FROM gurdwaras a JOIN gurdwaras b ON b.website_host = a.website_host AND b.id > a.id
        WHERE a.website_host != '' AND a.archived_at IS NULL AND b.archived_at IS NULL
      LIMIT ?`).all(limit);
    const byPair = new Map();
    for (const p of pairs) {
      const k = `${p.a}-${p.b}`;
      if (!byPair.has(k)) byPair.set(k, { a: p.a, b: p.b, reasons: [] });
      byPair.get(k).reasons.push(p.reason);
    }
    return [...byPair.values()].map((p) => ({ ...p, a: brief(p.a), b: brief(p.b) }));
  }
  function brief(id) {
    const r = row(id);
    return r && { id: r.id, name: r.name, city: r.city_name, country: r.country_name, phone: r.phone, website: r.website, url: gurdwaraUrl(r), verification: r.verification_status };
  }

  /* ---------- writes (every change is logged in gurdwara_updates) */
  function setRelations(id, facilities, services) {
    db.prepare('DELETE FROM gurdwara_facilities WHERE gurdwara_id = ?').run(id);
    db.prepare('DELETE FROM gurdwara_services WHERE gurdwara_id = ?').run(id);
    for (const f of facilities) db.prepare('INSERT INTO gurdwara_facilities (gurdwara_id, facility_key) VALUES (?, ?)').run(id, f);
    for (const sv of services) db.prepare('INSERT INTO gurdwara_services (gurdwara_id, service_key) VALUES (?, ?)').run(id, sv);
  }
  function placeIds(data) {
    const country = findOrCreateCountry(db, data.country);
    const state = findOrCreateState(db, country.id, data.state);
    const city = findOrCreateCity(db, country.id, state.id, data.city);
    return { country, state, city };
  }
  const FIELDS = ['name', 'official_name', 'also_known_as', 'district', 'address', 'postal_code', 'latitude', 'longitude', 'phone', 'email', 'website', 'description', 'programs', 'opening_hours', 'established_year', 'management_organization', 'designation'];

  function create(input, user, { status = 'active', note = 'created' } = {}) {
    const { data, errors } = validateGurdwara(input);
    if (Object.keys(errors).length) return { errors };
    return transaction(db, () => {
      const { country, state, city } = placeIds(data);
      const info = db.prepare(`INSERT INTO gurdwaras (${FIELDS.join(', ')}, slug, country_id, state_region_id, city_id, status, verification_status, name_norm, phone_digits, website_host, created_by, updated_by)
        VALUES (${FIELDS.map(() => '?').join(', ')}, ?, ?, ?, ?, ?, 'needs_verification', ?, ?, ?, ?, ?)`).run(
        ...FIELDS.map((f) => data[f] ?? null), uniqueSlug(db, city.id, data.name), country.id, state.id, city.id,
        STATUS_KEYS.includes(input.status) ? input.status : status,
        normalizeName(data.name), phoneDigits(data.phone), websiteHost(data.website), user ? user.id : null, user ? user.id : null);
      const id = Number(info.lastInsertRowid);
      setRelations(id, data.facilities, data.services);
      reindex(db, id);
      db.prepare('INSERT INTO gurdwara_updates (gurdwara_id, action, changes, actor_id) VALUES (?, ?, ?, ?)').run(id, note, JSON.stringify({ name: data.name }), user ? user.id : null);
      return { id };
    });
  }

  function update(id, input, user, { note = 'updated' } = {}) {
    const before = row(id);
    if (!before) return { notFound: true };
    const merged = {
      ...Object.fromEntries(FIELDS.map((f) => [f, before[f]])), country: before.country_name, state: before.state_name, city: before.city_name,
      facilities: relations([id])[id].facilities, services: relations([id])[id].services, ...input,
    };
    const { data, errors } = validateGurdwara(merged);
    if (Object.keys(errors).length) return { errors };
    return transaction(db, () => {
      const { country, state, city } = placeIds(data);
      const changes = {};
      for (const f of FIELDS) if ((before[f] ?? null) !== (data[f] ?? null)) changes[f] = { from: before[f], to: data[f] };
      if (city.id !== before.city_id) changes.place = { from: `${before.city_name}, ${before.state_name}, ${before.country_name}`, to: `${data.city}, ${data.state}, ${data.country}` };
      const slug = city.id !== before.city_id || data.name !== before.name ? uniqueSlug(db, city.id, data.name, id) : before.slug;
      db.prepare(`UPDATE gurdwaras SET ${FIELDS.map((f) => `${f} = ?`).join(', ')}, slug = ?, country_id = ?, state_region_id = ?, city_id = ?,
          name_norm = ?, phone_digits = ?, website_host = ?, updated_by = ?, updated_at = ? WHERE id = ?`).run(
        ...FIELDS.map((f) => data[f] ?? null), slug, country.id, state.id, city.id,
        normalizeName(data.name), phoneDigits(data.phone), websiteHost(data.website), user ? user.id : null, new Date().toISOString(), id);
      const relBefore = relations([id])[id];
      if (input.facilities !== undefined || input.services !== undefined) {
        setRelations(id, data.facilities, data.services);
        if (relBefore.facilities.join() !== data.facilities.join()) changes.facilities = { from: relBefore.facilities, to: data.facilities };
        if (relBefore.services.join() !== data.services.join()) changes.services = { from: relBefore.services, to: data.services };
      }
      reindex(db, id);
      if (Object.keys(changes).length) db.prepare('INSERT INTO gurdwara_updates (gurdwara_id, action, changes, actor_id) VALUES (?, ?, ?, ?)').run(id, note, JSON.stringify(changes), user ? user.id : null);
      return { id, changes };
    });
  }

  function log(id, action, changes, user) {
    db.prepare('INSERT INTO gurdwara_updates (gurdwara_id, action, changes, actor_id) VALUES (?, ?, ?, ?)').run(id, action, JSON.stringify(changes || {}), user ? user.id : null);
  }

  function addSource(id, input, user) {
    const name = String(input.name || input.source_name || '').trim().slice(0, 300);
    const url = String(input.url || input.source_url || '').trim().slice(0, 500);
    const type = SOURCE_TYPE_KEYS.includes(input.type || input.source_type) ? (input.type || input.source_type) : 'other';
    const fields = {};
    if (name.length < 2) fields.sourceName = 'Name the source';
    if (url && !/^https?:\/\/\S+$/i.test(url)) fields.sourceUrl = 'Use a full link starting with https://';
    if (Object.keys(fields).length) return { errors: fields };
    const info = db.prepare('INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type, notes, verified_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, url, type, String(input.notes || '').slice(0, 1000), input.verified ? new Date().toISOString() : null, user ? user.id : null);
    log(id, 'source added', { source: name }, user);
    return { id: Number(info.lastInsertRowid) };
  }

  function stats() {
    const n = (sql, ...p) => db.prepare(sql).get(...p).n;
    return {
      total: n('SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NULL'),
      active: n("SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NULL AND status = 'active'"),
      verified: n("SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NULL AND verification_status = 'verified'"),
      needsVerification: n("SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NULL AND verification_status = 'needs_verification'"),
      archived: n('SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NOT NULL'),
      pendingSubmissions: n("SELECT COUNT(*) AS n FROM gurdwara_submissions WHERE status = 'pending'"),
      possibleDuplicates: duplicatePairs(1000).length,
      countries: n('SELECT COUNT(DISTINCT country_id) AS n FROM gurdwaras WHERE archived_at IS NULL'),
    };
  }

  /* ---------- bulk import (CSV / JSON) — nothing imported is marked verified */

  /** Accepts the documented column names and common aliases; unknown values stay empty. */
  function importInput(raw) {
    const input = { ...raw };
    if (!input.country && raw.country_code) input.country = raw.country_code;
    if (!input.address && raw.full_address) input.address = raw.full_address;
    const sources = Array.isArray(raw.sources) ? raw.sources.filter((s) => s && (s.name || s.source_name)) : [];
    if (raw.source_name) {
      sources.push({
        name: raw.source_name, url: raw.source_url, type: raw.source_type,
        notes: [raw.source_notes, raw.source_verified_at ? `Source dated ${raw.source_verified_at} (per the import file)` : ''].filter(Boolean).join(' · '),
      });
    }
    const ref = String(raw.external_ref || '').trim().slice(0, 200) || null;
    return { input, sources, ref, stateCode: String(raw.state_code || '').trim().toUpperCase().slice(0, 12) };
  }
  function addMissingSources(id, sources, user) {
    const have = db.prepare('SELECT source_name, source_url FROM gurdwara_sources WHERE gurdwara_id = ?').all(id);
    let added = 0;
    for (const s of sources) {
      const url = String(s.url || s.source_url || '');
      const name = String(s.name || s.source_name || '');
      if (have.some((h) => (url && h.source_url === url) || (!url && h.source_name === name))) continue;
      if (!addSource(id, { name, url, type: s.type || s.source_type, notes: s.notes }, user).errors) added++;
    }
    return added;
  }
  /** Adds Wikimedia Commons photos (with author, licence and file page) the record doesn't have yet. */
  function addMissingImages(id, images, user) {
    let added = 0;
    for (const img of Array.isArray(images) ? images : []) {
      const url = String(img.url || '').trim();
      const credit = String(img.credit || '').trim().slice(0, 300);
      const license = String(img.license || '').trim().slice(0, 200);
      const sourceUrl = String(img.source_url || img.sourceUrl || '').trim().slice(0, 500);
      if (!COMMONS_IMAGE.test(url) || credit.length < 2 || license.length < 2 || !/^https:\/\/commons\.wikimedia\.org\/\S+$/.test(sourceUrl)) continue;
      if (db.prepare('SELECT 1 FROM gurdwara_images WHERE gurdwara_id = ? AND (url = ? OR source_url = ?)').get(id, url, sourceUrl)) continue;
      const thumb = String(img.thumb_url || img.thumbUrl || '');
      const first = !db.prepare('SELECT 1 FROM gurdwara_images WHERE gurdwara_id = ?').get(id);
      db.prepare(`INSERT INTO gurdwara_images (gurdwara_id, url, thumb_url, width, height, alt, credit, license, source_url, is_primary, sort, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM gurdwara_images WHERE gurdwara_id = ?), ?)`).run(
        id, url, COMMONS_IMAGE.test(thumb) ? thumb : '', Number.isInteger(img.width) ? img.width : null, Number.isInteger(img.height) ? img.height : null,
        String(img.alt || '').slice(0, 300), credit, license, sourceUrl, first ? 1 : 0, id, user ? user.id : null);
      log(id, 'image added', { credit, license }, user);
      added++;
    }
    return added;
  }

  /**
   * Marks records verified (each needs at least one source). The note says what was checked and is
   * kept in every record's verification log. Used by the admin bulk action and the import script.
   */
  function verify(ids, user, note) {
    const now = new Date().toISOString();
    const verified = [];
    const skipped = [];
    transaction(db, () => {
      for (const id of ids) {
        const r = row(id);
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
    return { verified, skipped };
  }

  function setStateCode(id, code) {
    if (code) db.prepare("UPDATE states_regions SET code = ? WHERE id = (SELECT state_region_id FROM gurdwaras WHERE id = ?) AND (code IS NULL OR code = '')").run(code, id);
  }

  /**
   * Rows with an `external_ref` (e.g. "wikidata:Q2375435") are matched to the record imported
   * from that source before, so running an import again updates instead of duplicating.
   * Rows with an `id` update that record. Other rows are checked for duplicates first.
   */
  function importRows(rows, user, { dryRun = true } = {}) {
    const report = { total: rows.length, imported: 0, updated: 0, unchanged: 0, duplicates: 0, invalid: 0, needsVerification: 0, rows: [] };
    const seenInFile = new Map();
    const run = () => {
      rows.forEach((raw, i) => {
        const line = i + 2; // header is line 1
        const { input, sources, ref, stateCode } = importInput(raw);
        const fileKey = ref || `${normalizeName(input.name)}|${String(input.city || '').toLowerCase()}|${String(input.country || '').toLowerCase()}`;
        if (input.name && seenInFile.has(fileKey)) {
          report.duplicates++; report.rows.push({ line, result: 'duplicate', name: input.name, message: `Same Gurdwara as line ${seenInFile.get(fileKey)} of this file` });
          return;
        }
        seenInFile.set(fileKey, line);
        const existing = ref ? db.prepare('SELECT id FROM gurdwaras WHERE external_ref = ?').get(ref) : null;
        if (existing) {
          const before = row(existing.id);
          const patch = Object.fromEntries(Object.entries(input).filter(([k, v]) => !['id', 'external_ref', 'sources', 'status', 'state_code', 'country_code', 'full_address', 'images', 'clear'].includes(k) && !k.startsWith('source_') && v !== '' && v !== null && v !== undefined));
          // Empty values never overwrite; a row clears a field only by naming it in `clear`.
          for (const k of Array.isArray(raw.clear) ? raw.clear : []) if (CLEARABLE.includes(k)) patch[k] = null;
          const { errors } = validateGurdwara({ ...patch, name: patch.name || before.name, country: patch.country || before.country_code || before.country_name, state: patch.state || before.state_name, city: patch.city || before.city_name });
          if (Object.keys(errors).length) { report.invalid++; report.rows.push({ line, result: 'invalid', name: input.name, message: Object.values(errors).join('; ') }); return; }
          let changed = false;
          if (!dryRun) {
            const res = update(existing.id, patch, user, { note: 'updated by import' });
            if (res.errors) { report.invalid++; report.rows.push({ line, result: 'invalid', name: input.name, message: Object.values(res.errors).join('; ') }); return; }
            changed = Object.keys(res.changes || {}).length > 0;
            changed = addMissingSources(existing.id, sources, user) > 0 || changed;
            changed = addMissingImages(existing.id, raw.images, user) > 0 || changed;
            setStateCode(existing.id, stateCode);
            if (changed && before.verification_status === 'verified') {
              // Source data changed under a verified record: it needs a person to check it again.
              db.prepare("UPDATE gurdwaras SET verification_status = 'needs_verification' WHERE id = ?").run(existing.id);
              db.prepare('INSERT INTO gurdwara_verification (gurdwara_id, action, note, actor_id) VALUES (?, ?, ?, ?)').run(existing.id, 'marked needs verification', 'Re-imported source data changed this record', user ? user.id : null);
            }
          }
          if (dryRun || changed) { report.updated++; report.rows.push({ line, result: 'updated', id: existing.id, name: before.name }); } else { report.unchanged++; report.rows.push({ line, result: 'unchanged', id: existing.id, name: before.name }); }
          return;
        }
        if (raw.id && /^\d+$/.test(String(raw.id))) {
          const exists = row(Number(raw.id));
          if (!exists) { report.invalid++; report.rows.push({ line, result: 'invalid', message: `No Gurdwara with id ${raw.id}` }); return; }
          if (!dryRun) {
            const res = update(Number(raw.id), Object.fromEntries(Object.entries(input).filter(([k, v]) => k !== 'id' && v !== '' && v !== undefined)), user, { note: 'updated by import' });
            if (res.errors) { report.invalid++; report.rows.push({ line, result: 'invalid', message: Object.values(res.errors).join('; ') }); return; }
          } else {
            const { errors } = validateGurdwara({ ...input, name: input.name || exists.name, country: input.country || exists.country_name, state: input.state || exists.state_name, city: input.city || exists.city_name });
            if (Object.keys(errors).length) { report.invalid++; report.rows.push({ line, result: 'invalid', message: Object.values(errors).join('; ') }); return; }
          }
          report.updated++; report.rows.push({ line, result: 'updated', id: Number(raw.id), name: exists.name });
          return;
        }
        const { errors } = validateGurdwara(input);
        if (Object.keys(errors).length) { report.invalid++; report.rows.push({ line, result: 'invalid', name: input.name, message: Object.values(errors).join('; ') }); return; }
        const dups = findDuplicates(input, { limit: 1 });
        if (dups.length && dups[0].score >= 0.85) { report.duplicates++; report.rows.push({ line, result: 'duplicate', name: input.name, matchId: dups[0].id, matchName: dups[0].name, reasons: dups[0].reasons }); return; }
        if (!dryRun) {
          const res = create(input, user, { note: 'imported' });
          if (res.errors) { report.invalid++; report.rows.push({ line, result: 'invalid', name: input.name, message: Object.values(res.errors).join('; ') }); return; }
          if (ref) db.prepare('UPDATE gurdwaras SET external_ref = ? WHERE id = ?').run(ref, res.id);
          addMissingSources(res.id, sources, user);
          addMissingImages(res.id, raw.images, user);
          setStateCode(res.id, stateCode);
          report.rows.push({ line, result: 'imported', id: res.id, name: input.name });
        } else report.rows.push({ line, result: 'imported', name: input.name });
        report.imported++;
        report.needsVerification++;
      });
    };
    if (dryRun) run(); else transaction(db, run);
    report.rows = report.rows.slice(0, 500);
    return report;
  }

  return { search, locations, placeNames, row, rowByPath, detailShape, nearby, findDuplicates, duplicatePairs, create, update, log, addSource, verify, stats, importRows, gurdwaraUrl, relations };
}

/* ---------- CSV (RFC 4180: quoted fields, escaped quotes, newlines in quotes) */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}
