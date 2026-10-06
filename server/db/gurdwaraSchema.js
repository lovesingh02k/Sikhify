/* ==========================================================================
   Sikhify API — db/gurdwaraSchema.js
   Migration 5: the Global Gurdwara Directory as a relational module.

     countries → states_regions → cities → gurdwaras
     gurdwara_facilities / gurdwara_services   (many-to-many with lookup tables)
     gurdwara_images · gurdwara_sources        (provenance)
     gurdwara_verification · gurdwara_updates  (audit trail)
     gurdwara_submissions                      (community suggestions, pending review)
     gurdwaras_fts                             (full-text search, kept in sync by the store)

   Seeds only factual reference data: the ISO 3166 country list (names from
   the ICU data built into Node) and the facility/service vocabularies. No
   Gurdwara records are created. Any Gurdwaras previously stored in the
   generic `entries` table are moved here so there is one directory, not two.
   ========================================================================== */
import { FACILITIES, SERVICES, normalizeName, phoneDigits, websiteHost } from '../../shared/gurdwaras.js';
import { distanceKm } from '../../shared/gurdwaras.js';

export function registerFunctions(db) {
  // Used to sort and filter by distance inside SQL.
  db.function('distance_km', { deterministic: true }, (lat1, lng1, lat2, lng2) => {
    const d = distanceKm(lat1, lng1, lat2, lng2);
    return d === null ? null : d;
  });
}

const SCHEMA = `
CREATE TABLE countries (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE states_regions (
  id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (country_id, slug)
);
CREATE TABLE cities (
  id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  state_region_id INTEGER NOT NULL REFERENCES states_regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (state_region_id, slug)
);
CREATE INDEX cities_country ON cities(country_id);

CREATE TABLE gurdwaras (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  official_name TEXT NOT NULL DEFAULT '',
  also_known_as TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  country_id INTEGER NOT NULL REFERENCES countries(id),
  state_region_id INTEGER NOT NULL REFERENCES states_regions(id),
  city_id INTEGER NOT NULL REFERENCES cities(id),
  address TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  programs TEXT NOT NULL DEFAULT '',
  opening_hours TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','temporarily_closed','permanently_closed')),
  verification_status TEXT NOT NULL DEFAULT 'needs_verification' CHECK (verification_status IN ('verified','needs_verification')),
  established_year INTEGER,
  management_organization TEXT NOT NULL DEFAULT '',
  name_norm TEXT NOT NULL DEFAULT '',
  phone_digits TEXT NOT NULL DEFAULT '',
  website_host TEXT NOT NULL DEFAULT '',
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  UNIQUE (city_id, slug)
);
-- Public listing: verified/active first, then by place; partial index skips archived rows.
CREATE INDEX gurdwaras_public ON gurdwaras(verification_status, status, country_id, state_region_id, city_id) WHERE archived_at IS NULL;
CREATE INDEX gurdwaras_name ON gurdwaras(name COLLATE NOCASE);
CREATE INDEX gurdwaras_updated ON gurdwaras(updated_at DESC);
CREATE INDEX gurdwaras_lat ON gurdwaras(latitude);
CREATE INDEX gurdwaras_lng ON gurdwaras(longitude);
CREATE INDEX gurdwaras_name_norm ON gurdwaras(name_norm);
CREATE INDEX gurdwaras_phone ON gurdwaras(phone_digits) WHERE phone_digits != '';
CREATE INDEX gurdwaras_host ON gurdwaras(website_host) WHERE website_host != '';

CREATE TABLE facilities (key TEXT PRIMARY KEY, label TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE services (key TEXT PRIMARY KEY, label TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE gurdwara_facilities (
  gurdwara_id INTEGER NOT NULL REFERENCES gurdwaras(id) ON DELETE CASCADE,
  facility_key TEXT NOT NULL REFERENCES facilities(key),
  PRIMARY KEY (gurdwara_id, facility_key)
);
CREATE INDEX gurdwara_facilities_key ON gurdwara_facilities(facility_key, gurdwara_id);
CREATE TABLE gurdwara_services (
  gurdwara_id INTEGER NOT NULL REFERENCES gurdwaras(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL REFERENCES services(key),
  PRIMARY KEY (gurdwara_id, service_key)
);
CREATE INDEX gurdwara_services_key ON gurdwara_services(service_key, gurdwara_id);

CREATE TABLE gurdwara_images (
  id INTEGER PRIMARY KEY,
  gurdwara_id INTEGER NOT NULL REFERENCES gurdwaras(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumb_url TEXT NOT NULL DEFAULT '',
  width INTEGER, height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX gurdwara_images_g ON gurdwara_images(gurdwara_id, is_primary DESC, sort);

CREATE TABLE gurdwara_sources (
  id INTEGER PRIMARY KEY,
  gurdwara_id INTEGER NOT NULL REFERENCES gurdwaras(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'other',
  notes TEXT NOT NULL DEFAULT '',
  verified_at TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX gurdwara_sources_g ON gurdwara_sources(gurdwara_id);

CREATE TABLE gurdwara_verification (
  id INTEGER PRIMARY KEY,
  gurdwara_id INTEGER NOT NULL REFERENCES gurdwaras(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX gurdwara_verification_g ON gurdwara_verification(gurdwara_id, id DESC);
CREATE TABLE gurdwara_updates (
  id INTEGER PRIMARY KEY,
  gurdwara_id INTEGER NOT NULL REFERENCES gurdwaras(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes TEXT NOT NULL DEFAULT '{}',
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX gurdwara_updates_g ON gurdwara_updates(gurdwara_id, id DESC);

CREATE TABLE gurdwara_submissions (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'new' CHECK (kind IN ('new','update')),
  gurdwara_id INTEGER REFERENCES gurdwaras(id) ON DELETE SET NULL,
  submitter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','changes_requested','approved','rejected')),
  review_note TEXT NOT NULL DEFAULT '',
  reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  result_gurdwara_id INTEGER REFERENCES gurdwaras(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at TEXT
);
CREATE INDEX gurdwara_submissions_status ON gurdwara_submissions(status, created_at DESC);
CREATE INDEX gurdwara_submissions_user ON gurdwara_submissions(submitter_id);

CREATE VIRTUAL TABLE gurdwaras_fts USING fts5(
  name, official_name, also_known_as, address, postal_code, city, state, country,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);
`;

/** ISO 3166-1 alpha-2 codes that ICU names but which aren't countries/territories. */
const NOT_COUNTRIES = new Set(['AA', 'AC', 'CP', 'CQ', 'DG', 'EA', 'EU', 'EZ', 'IC', 'TA', 'UN', 'ZZ']);

export function countryList() {
  const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  const out = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (NOT_COUNTRIES.has(code) || code[0] === 'Q' || (code[0] === 'X' && code !== 'XK')) continue;
      let name;
      try { name = names.of(code); } catch { name = undefined; }
      if (name && name !== code) out.push({ code, name });
    }
  }
  return out;
}

export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'place';

export function migrateGurdwaraDirectory(db) {
  db.exec(SCHEMA);

  const insC = db.prepare('INSERT OR IGNORE INTO countries (code, name, slug) VALUES (?, ?, ?)');
  for (const c of countryList()) insC.run(c.code, c.name, slugify(c.name));
  FACILITIES.forEach((f, i) => db.prepare('INSERT INTO facilities (key, label, sort) VALUES (?, ?, ?)').run(f.key, f.label, i));
  SERVICES.forEach((sv, i) => db.prepare('INSERT INTO services (key, label, sort) VALUES (?, ?, ?)').run(sv.key, sv.label, i));

  /* Move Gurdwaras from the generic directory (if any) — nothing is invented or verified by this step. */
  const old = db.prepare("SELECT * FROM entries WHERE type = 'gurdwara'").all();
  for (const e of old) {
    let d = {};
    try { d = JSON.parse(e.data || '{}'); } catch { d = {}; }
    const country = findOrCreateCountry(db, e.country || d.country || 'Unknown');
    const state = findOrCreateState(db, country.id, e.state || d.state || e.district || e.city || d.city || 'Unknown');
    const city = findOrCreateCity(db, country.id, state.id, e.city || d.city || 'Unknown');
    const extras = [['History', d.history], ['Langar', d.langar], ['Accommodation', d.accommodation], ['Parking', d.parking], ['Accessibility', d.accessibility]]
      .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
    const info = db.prepare(`INSERT INTO gurdwaras (name, slug, country_id, state_region_id, city_id, address, phone, email, website, description, opening_hours,
        status, verification_status, name_norm, phone_digits, website_host, archived_at, created_at, updated_at, created_by, updated_by, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      e.title, uniqueSlug(db, city.id, e.title), country.id, state.id, city.id, d.address || '', d.phone || '', d.email || '', d.website || '',
      [e.summary, e.body, extras].filter(Boolean).join('\n\n'), d.timings || '',
      e.verification_status === 'verified' && e.publish_status === 'published' ? 'verified' : 'needs_verification',
      normalizeName(e.title), phoneDigits(d.phone), websiteHost(d.website), e.publish_status === 'archived' ? e.updated_at : null,
      e.created_at, e.updated_at, e.created_by, e.updated_by, e.last_verified_at);
    const gid = Number(info.lastInsertRowid);
    let refs = [];
    try { refs = JSON.parse(e.references_json || '[]'); } catch { refs = []; }
    if (e.source) db.prepare('INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_type, verified_at) VALUES (?, ?, ?, ?)').run(gid, e.source, 'other', e.last_verified_at);
    for (const r of refs) db.prepare('INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type, verified_at) VALUES (?, ?, ?, ?, ?)').run(gid, r.label || r.url, r.url, 'other', e.last_verified_at);
    db.prepare("INSERT INTO gurdwara_updates (gurdwara_id, action, changes) VALUES (?, 'migrated', ?)").run(gid, JSON.stringify({ fromEntryId: e.id }));
    // (search index entries are built by migration 6, which recreates the index)
  }
  if (old.length) db.prepare("DELETE FROM entries WHERE type = 'gurdwara'").run();

  /* Pending generic "Gurdwara" submissions move to the dedicated review queue. */
  for (const s of db.prepare("SELECT * FROM submissions WHERE kind = 'gurdwara' AND status = 'pending'").all()) {
    let d = {};
    try { d = JSON.parse(s.data || '{}'); } catch { d = {}; }
    db.prepare(`INSERT INTO gurdwara_submissions (kind, submitter_id, name, country, state, city, address, website, phone, details, source, created_at)
      VALUES ('new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s.submitter_id, d.title || s.title, d.country || '', d.state || d.district || '', d.city || '',
      d.address || '', d.website || '', d.phone || '', [d.summary, s.message].filter(Boolean).join('\n\n'), s.source, s.created_at);
    db.prepare("UPDATE submissions SET status = 'approved', review_note = 'Moved to the Gurdwara Directory review queue' WHERE id = ?").run(s.id);
  }
}

/* ---------- location helpers (also used by the store) */
export function findOrCreateCountry(db, nameOrCode) {
  const v = String(nameOrCode || '').trim();
  const row = db.prepare('SELECT * FROM countries WHERE code = ? OR name = ? COLLATE NOCASE OR slug = ?').get(v.toUpperCase(), v, slugify(v));
  if (row) return row;
  const info = db.prepare('INSERT INTO countries (code, name, slug) VALUES (NULL, ?, ?)').run(v, slugify(v));
  return db.prepare('SELECT * FROM countries WHERE id = ?').get(Number(info.lastInsertRowid));
}
export function findOrCreateState(db, countryId, name) {
  const v = String(name || '').trim();
  const row = db.prepare('SELECT * FROM states_regions WHERE country_id = ? AND (slug = ? OR name = ? COLLATE NOCASE)').get(countryId, slugify(v), v);
  if (row) return row;
  const info = db.prepare('INSERT INTO states_regions (country_id, name, slug) VALUES (?, ?, ?)').run(countryId, v, slugify(v));
  return db.prepare('SELECT * FROM states_regions WHERE id = ?').get(Number(info.lastInsertRowid));
}
export function findOrCreateCity(db, countryId, stateId, name) {
  const v = String(name || '').trim();
  const row = db.prepare('SELECT * FROM cities WHERE state_region_id = ? AND (slug = ? OR name = ? COLLATE NOCASE)').get(stateId, slugify(v), v);
  if (row) return row;
  const info = db.prepare('INSERT INTO cities (country_id, state_region_id, name, slug) VALUES (?, ?, ?, ?)').run(countryId, stateId, v, slugify(v));
  return db.prepare('SELECT * FROM cities WHERE id = ?').get(Number(info.lastInsertRowid));
}
export function uniqueSlug(db, cityId, name, exceptId = null) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; db.prepare('SELECT 1 FROM gurdwaras WHERE city_id = ? AND slug = ? AND id IS NOT ?').get(cityId, slug, exceptId); n++) slug = `${base}-${n}`;
  return slug;
}

/** Keeps the full-text index in step with a record (call after every insert/update). */
/**
 * Migration 6 — district, a stable external reference for imports (so re-importing a source
 * updates its records instead of duplicating them), ISO region codes, a place index, and a
 * search index that also covers the district.
 */
export function migrateGurdwaraDirectoryV2(db) {
  db.exec(`
    ALTER TABLE gurdwaras ADD COLUMN district TEXT NOT NULL DEFAULT '';
    ALTER TABLE gurdwaras ADD COLUMN external_ref TEXT;
    CREATE UNIQUE INDEX gurdwaras_external_ref ON gurdwaras(external_ref) WHERE external_ref IS NOT NULL;
    CREATE INDEX gurdwaras_place ON gurdwaras(country_id, state_region_id, city_id);
    CREATE INDEX gurdwaras_status ON gurdwaras(status, verification_status);
    ALTER TABLE states_regions ADD COLUMN code TEXT;
    CREATE INDEX states_regions_code ON states_regions(code);
    DROP TABLE gurdwaras_fts;
    CREATE VIRTUAL TABLE gurdwaras_fts USING fts5(
      name, official_name, also_known_as, address, postal_code, city, district, state, country,
      tokenize = 'unicode61 remove_diacritics 2',
      prefix = '2 3'
    );
  `);
  for (const { id } of db.prepare('SELECT id FROM gurdwaras').all()) reindex(db, id);
}

export function reindex(db, id) {
  db.prepare('DELETE FROM gurdwaras_fts WHERE rowid = ?').run(id);
  const r = db.prepare(`SELECT g.id, g.name, g.official_name, g.also_known_as, g.address, g.postal_code, g.district, ci.name AS city, st.name AS state, co.name AS country
    FROM gurdwaras g JOIN cities ci ON ci.id = g.city_id JOIN states_regions st ON st.id = g.state_region_id JOIN countries co ON co.id = g.country_id WHERE g.id = ?`).get(id);
  if (r) db.prepare('INSERT INTO gurdwaras_fts (rowid, name, official_name, also_known_as, address, postal_code, city, district, state, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(r.id, r.name, r.official_name, r.also_known_as, r.address, r.postal_code, r.city, r.district, r.state, r.country);
}
