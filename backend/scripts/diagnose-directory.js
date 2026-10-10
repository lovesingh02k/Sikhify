#!/usr/bin/env node
/* ==========================================================================
   Sikhify — Directory diagnostic (read-only: never writes to any database)

     npm run directory:diagnose                         database the site uses + local API/site checks
     npm run directory:diagnose -- --db local           force backend/data/sikhify.db
     npm run directory:diagnose -- --api https://your-site.vercel.app   check a deployed API
     npm run directory:diagnose -- --no-http            database counts only

   The database is chosen exactly like the server chooses it:
   SIKHIFY_DATABASE_URL set → Turso/libSQL, otherwise the local SQLite file.
   Prints the provider and hostname only — never the URL's token.
   ========================================================================== */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, schemaVersion } from '../src/db/database.js';
import { CONTENT_TYPES } from '../../shared/contentTypes.js';

/** The Panj Takht, by the slugs the curated historic dataset uses. */
export const PANJ_TAKHT = [
  ['sri-akal-takht-sahib', 'Sri Akal Takht Sahib'],
  ['takht-sri-kesgarh-sahib', 'Takht Sri Kesgarh Sahib'],
  ['takht-sri-patna-sahib', 'Takht Sri Patna Sahib'],
  ['takht-sri-hazur-sahib', 'Takht Sri Hazur Sahib'],
  ['takht-sri-damdama-sahib', 'Takht Sri Damdama Sahib'],
];

/** Real counts from the database. Public = what /api/gurdwaras lists by default (active, not archived — verified or awaiting verification). */
export function directoryCounts(db) {
  const n = (sql, ...p) => Number(db.prepare(sql).get(...p).n || 0);
  const live = "archived_at IS NULL AND (external_ref IS NULL OR external_ref NOT LIKE 'fixture:%')";
  const gurdwaras = {
    total: n('SELECT COUNT(*) AS n FROM gurdwaras'),
    public: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND status = 'active'`),
    publicVerified: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND status = 'active' AND verification_status = 'verified'`),
    active: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND status = 'active'`),
    verified: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND verification_status = 'verified'`),
    needsVerification: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND verification_status = 'needs_verification'`),
    archived: n('SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NOT NULL'),
    fixtures: n("SELECT COUNT(*) AS n FROM gurdwaras WHERE external_ref LIKE 'fixture:%'"),
    takht: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND designation = 'takht'`),
    historic: n(`SELECT COUNT(*) AS n FROM gurdwaras WHERE ${live} AND designation = 'historic'`),
    withImages: n(`SELECT COUNT(*) AS n FROM gurdwaras g WHERE ${live} AND EXISTS (SELECT 1 FROM gurdwara_images i WHERE i.gurdwara_id = g.id)`),
  };
  gurdwaras.withoutImages = gurdwaras.total - gurdwaras.archived - gurdwaras.fixtures - gurdwaras.withImages;
  const panjTakht = PANJ_TAKHT.map(([slug, name]) => {
    const r = db.prepare(`SELECT g.status, g.verification_status, g.designation, g.archived_at, g.latitude,
        (SELECT COUNT(*) FROM gurdwara_images i WHERE i.gurdwara_id = g.id) AS images
      FROM gurdwaras g WHERE g.slug = ? ORDER BY g.archived_at IS NOT NULL, g.id LIMIT 1`).get(slug);
    return {
      name, found: !!r,
      public: !!r && !r.archived_at && r.status === 'active',
      designation: r ? r.designation : '', images: r ? Number(r.images) : 0, coordinates: !!r && r.latitude !== null,
    };
  });
  const entries = Object.entries(CONTENT_TYPES).map(([type, t]) => ({
    type, label: t.plural,
    total: n('SELECT COUNT(*) AS n FROM entries WHERE type = ?', type),
    published: n("SELECT COUNT(*) AS n FROM entries WHERE type = ? AND publish_status = 'published'", type),
    verified: n("SELECT COUNT(*) AS n FROM entries WHERE type = ? AND verification_status = 'verified'", type),
    archived: n("SELECT COUNT(*) AS n FROM entries WHERE type = ? AND publish_status = 'archived'", type),
    withImages: n("SELECT COUNT(*) AS n FROM entries WHERE type = ? AND image_url != ''", type),
  }));
  return { gurdwaras, panjTakht, entries };
}

async function httpCheck(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) return { ok: false, detail: `HTTP ${res.status}, not JSON (is the API deployed there?)` };
    const body = await res.json();
    return { ok: res.ok, body, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e.name === 'TimeoutError' ? 'timed out' : 'not reachable (is it running?)' };
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : undefined; };
  const config = loadConfig(opt('db') === 'local' ? { databaseUrl: '' } : {});
  const dest = describeDatabase(config);
  const db = await openDatabaseForConfig(config);
  const c = directoryCounts(db);
  const pad = (s, w = 22) => String(s).padEnd(w);
  const out = [];
  out.push('=== SIKHIFY DIRECTORY DIAGNOSTIC ===', '');
  out.push('Database:', `  ${dest.provider}`, `  ${dest.remote ? 'host' : 'file'}: ${dest.remote ? dest.host : dest.path}`, `  schema version: ${schemaVersion(db)}`, '');
  const g = c.gurdwaras;
  out.push('Gurdwaras:',
    `  ${pad('Total:')}${g.total}`,
    `  ${pad('Public (listed):')}${g.public}   ← active, not archived — shown by default (cards say which are verified)`,
    `  ${pad('Public + verified:')}${g.publicVerified}   ← shown with the "Verified only" filter`,
    `  ${pad('Active:')}${g.active}`,
    `  ${pad('Verified:')}${g.verified}`,
    `  ${pad('Needs verification:')}${g.needsVerification}   ← listed with a "Needs verification" label`,
    `  ${pad('Archived:')}${g.archived}`,
    `  ${pad('Takht:')}${g.takht}`,
    `  ${pad('Historic:')}${g.historic}`,
    `  ${pad('With images:')}${g.withImages}`,
    `  ${pad('Without images:')}${g.withoutImages}`,
    ...(g.fixtures ? [`  ${pad('Dev fixtures:')}${g.fixtures}   ← never served in production`] : []), '');
  out.push('Panj Takht:');
  for (const t of c.panjTakht) out.push(`  ${t.public ? 'PASS' : 'FAIL'}  ${pad(t.name, 26)}${t.found ? `designation=${t.designation || '-'} images=${t.images} coords=${t.coordinates ? 'yes' : 'no'}${t.public ? '' : ' (not public)'}` : 'missing'}`);
  out.push('');
  for (const e of c.entries) {
    out.push(`${e.label}:`, `  Total: ${e.total}  Published: ${e.published}  Verified: ${e.verified}  Archived: ${e.archived}  With images: ${e.withImages}  Without: ${e.total - e.withImages}`);
  }
  out.push('');

  let failed = c.gurdwaras.public === 0 || c.panjTakht.some((t) => !t.public);
  if (!args.includes('--no-http')) {
    const api = (opt('api') || `http://127.0.0.1:${config.port}`).replace(/\/$/, '');
    out.push(`API (${api}):`);
    const h = await httpCheck(`${api}/api/health`);
    out.push(`  Health:              ${h.ok ? 'PASS' : 'FAIL'}  ${h.detail}${h.body && h.body.database ? ` — ${h.body.database.provider}, schema v${h.body.database.schemaVersion}` : ''}`);
    const gw = await httpCheck(`${api}/api/gurdwaras?page=1&pageSize=10`);
    const gwOk = gw.ok && Array.isArray(gw.body.items) && (gw.body.total > 0 || c.gurdwaras.public === 0);
    out.push(`  Gurdwara endpoint:   ${gwOk ? 'PASS' : 'FAIL'}  ${gw.ok ? `total=${gw.body.total} returned=${gw.body.items.length}` : gw.detail}`);
    const tk = await httpCheck(`${api}/api/gurdwaras?designation=takht`);
    out.push(`  Panj Takht endpoint: ${tk.ok && tk.body.total === 5 ? 'PASS' : 'FAIL'}  ${tk.ok ? `total=${tk.body.total}` : tk.detail}`);
    const sm = await httpCheck(`${api}/api/entries/summary`);
    const published = c.entries.reduce((a, e) => a + e.published, 0);
    const apiPublished = sm.ok ? Object.values(sm.body.counts || {}).reduce((a, b) => a + b, 0) : 0;
    out.push(`  Directory endpoint:  ${sm.ok ? 'PASS' : 'FAIL'}  ${sm.ok ? `published=${apiPublished}` : sm.detail}`);
    // If the API answers with different numbers, it is connected to a different database than this command.
    if (sm.ok && gw.ok && (apiPublished !== published || gw.body.total !== c.gurdwaras.public)) {
      out.push(`  WARNING: the API's counts differ from ${dest.provider} above — the API is using a different database.`);
    }
    failed = failed || !h.ok || !gwOk || !sm.ok;
    if (!opt('api')) {
      const site = await httpCheck('http://localhost:5173/api/health');
      out.push('', 'Frontend (http://localhost:5173 → /api proxy):', `  API connection:      ${site.ok ? 'PASS' : 'FAIL'}  ${site.detail}`);
    }
  }
  out.push('', '=====================================');
  console.log(out.join('\n'));
  db.close();
  process.exitCode = failed ? 1 : 0; // not process.exit(): on Windows that can abort while fetch sockets are closing
}
