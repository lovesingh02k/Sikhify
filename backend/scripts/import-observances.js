/* ==========================================================================
   Sikhify — import Sikh Festivals & Important Days from a seed file
     npm run observances:import                         dry run of backend/seed/observances/observances.json
     npm run observances:import -- --apply              write (new records are drafts)
     npm run observances:import -- path/to/file.json --apply --by admin@example.com

   Seed file: { "retrieved": "YYYY-MM-DD", "sources": { key: { name, url } },
   "records": [ { slug, title, category, summary, description, significance,
   relatedGuru, relatedTopic, featured, priority, …, "dates": [ { startDate,
   endDate?, sources: [key…], notes } ] } ].

   Rules
   • Every record passes the admin editor's validation (lib/observances.js).
   • New records are created as drafts; the importer never publishes,
     unpublishes or changes a record's status.
   • Every imported date is "unverified", citing the sources it came from. An
     admin confirms it (SGPC Jantri) and marks it verified in /admin/festivals;
     only verified dates are ever shown publicly.
   • Re-running is safe. Records are matched by slug:
       – an imported record nobody has edited is refreshed from the file;
       – a record an admin has edited, or created in the admin, is left as is;
       – a date is added only for a year that has no date row yet, so a
         verified or corrected date is never changed or duplicated.
   • Writes to the same database as the site: Turso/libSQL when
     SIKHIFY_DATABASE_URL is set, otherwise the local SQLite file. A dry run
     does all the work inside a transaction and rolls it back.
   ========================================================================== */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDatabaseForConfig, transaction, describeDatabase } from '../src/db/database.js';
import {
  cleanObservance, observanceShape, dateShape, contentHash, COLUMNS, columnValues,
} from '../src/lib/observances.js';
import { todayIn, verificationGaps, yearOf } from '../../shared/festivals.js';

const DEFAULT_FILE = fileURLToPath(new URL('../seed/observances/observances.json', import.meta.url));
const DEFAULTS = {
  scheduleType: 'annual_verified', calendarType: 'nanakshahi', durationDays: 1, advanceDays: 30,
  destinationType: 'detail', showOnHome: true, featured: false, priority: 0,
};
const ROLLBACK = Symbol('dry run');

/** Seed date → an unverified date row citing its sources. */
function toDateRow(d, sources, retrieved) {
  const cited = (d.sources || []).map((k) => {
    if (!sources[k]) throw new Error(`unknown source "${k}"`);
    return sources[k];
  });
  if (!cited.length) throw new Error(`date ${d.startDate} has no source`);
  const others = cited.slice(1).map((s) => `${s.name} — ${s.url}`);
  return {
    startDate: d.startDate,
    endDate: d.endDate || d.startDate,
    verification: 'unverified',
    sourceName: cited[0].name,
    sourceUrl: cited[0].url,
    notes: [d.notes, others.length ? `Also listed by: ${others.join('; ')}.` : '',
      `Imported ${retrieved} as an unverified candidate — confirm against the SGPC Nanakshahi Jantri before marking it verified.`]
      .filter(Boolean).join(' '),
  };
}

/**
 * Imports `data` (a parsed seed file) into `db`. With dryRun nothing is kept.
 * Returns { inserted, updated, unchanged, kept, invalid, datesAdded, datesSkipped, needVerification, rows }.
 */
export function importObservances(db, data, { dryRun = true, user = null, today = todayIn() } = {}) {
  const report = { inserted: 0, updated: 0, unchanged: 0, kept: 0, invalid: 0, datesAdded: 0, datesSkipped: 0, needVerification: 0, rows: [] };
  const sources = data.sources || {};
  const retrieved = data.retrieved || today;
  const run = () => {
    const seen = new Set();
    for (const [i, record] of (data.records || []).entries()) {
      const at = `#${i + 1} ${record.slug || record.title || ''}`;
      let out; let rows;
      try {
        if (seen.has(record.slug)) throw new Error('slug appears twice in the file');
        seen.add(record.slug);
        rows = (record.dates || []).map((d) => toDateRow(d, sources, retrieved));
        const { dates, ...fieldsOnly } = record; // eslint-disable-line no-unused-vars
        const cleaned = cleanObservance({ ...DEFAULTS, ...fieldsOnly, dates: rows });
        if (Object.keys(cleaned.fields).length) throw new Error(JSON.stringify(cleaned.fields));
        out = cleaned.out;
        if (out.slug !== record.slug) throw new Error(`slug "${record.slug}" is not valid`);
      } catch (e) {
        report.invalid++;
        report.rows.push({ at, result: 'invalid', message: e.message });
        continue;
      }

      const hash = contentHash(out);
      const row = db.prepare('SELECT * FROM observances WHERE slug = ?').get(out.slug);
      let id; let result;
      if (!row) {
        const info = db.prepare(`INSERT INTO observances (${COLUMNS.join(', ')}, status, seed_hash, created_by, updated_by)
          VALUES (${COLUMNS.map(() => '?').join(', ')}, 'draft', ?, ?, ?)`).run(...columnValues(out), hash, user ? user.id : null, user ? user.id : null);
        id = Number(info.lastInsertRowid);
        result = 'inserted';
      } else {
        id = row.id;
        const current = contentHash(observanceShape(row, []));
        if (!row.seed_hash) result = 'kept (created in the admin)';
        else if (current !== row.seed_hash) result = 'kept (edited in the admin)';
        else if (hash === row.seed_hash) result = 'unchanged';
        else {
          db.prepare(`UPDATE observances SET ${COLUMNS.map((k) => `${k} = ?`).join(', ')}, seed_hash = ?, updated_at = ? WHERE id = ?`)
            .run(...columnValues(out), hash, new Date().toISOString(), id);
          result = 'updated';
        }
        // Records made in the admin are never touched — not even their dates.
        if (!row.seed_hash) {
          report.kept++;
          report.rows.push({ at, result });
          continue;
        }
      }
      report[result.startsWith('kept') ? 'kept' : result]++;

      // Dates: only for years without any row (a verified or corrected date always wins).
      const existing = db.prepare('SELECT * FROM observance_dates WHERE observance_id = ?').all(id).map(dateShape);
      const years = new Set(existing.map((d) => d.year));
      const add = out.dates.filter((d) => !years.has(yearOf(d.startDate)));
      report.datesAdded += add.length;
      report.datesSkipped += out.dates.length - add.length;
      for (const d of add) {
        db.prepare(`INSERT INTO observance_dates (observance_id, start_date, end_date, verification, source_name, source_url, notes)
          VALUES (?, ?, ?, 'unverified', ?, ?, ?)`).run(id, d.startDate, d.endDate, d.sourceName, d.sourceUrl, d.notes);
      }

      const after = db.prepare('SELECT * FROM observances WHERE id = ?').get(id);
      const shape = observanceShape(after, db.prepare('SELECT * FROM observance_dates WHERE observance_id = ?').all(id).map(dateShape));
      const gaps = verificationGaps(shape, today);
      if (gaps.length) report.needVerification++;
      report.rows.push({ at, result, status: after.status, datesAdded: add.length, needs: gaps.join(', ') });
    }
    if (dryRun) throw ROLLBACK;
  };
  try { transaction(db, run); } catch (e) { if (e !== ROLLBACK) throw e; }
  return report;
}

/* ---------- CLI */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--by') || DEFAULT_FILE;
  const apply = args.includes('--apply');
  const config = loadConfig();
  console.log(`[observances] database: ${describeDatabase(config).label}`);
  const db = await openDatabaseForConfig(config);
  let user = null;
  const by = opt('by');
  if (by) {
    user = db.prepare('SELECT id, name, role FROM users WHERE email = ? OR username = ?').get(by.toLowerCase(), by.toLowerCase());
    if (!user || !['admin', 'moderator'].includes(user.role)) { console.error(`[observances] --by ${by}: no admin or moderator with that email/username`); process.exit(1); }
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const report = importObservances(db, data, { dryRun: !apply, user });
  for (const r of report.rows) console.log(`  ${r.result.padEnd(28)} ${r.at}${r.status ? ` [${r.status}]` : ''}${r.datesAdded ? ` +${r.datesAdded} date` : ''}${r.needs ? ` — needs verification: ${r.needs}` : ''}${r.message ? ` — ${r.message}` : ''}`);
  console.log(`[observances] ${apply ? 'APPLIED' : 'DRY RUN (nothing written; add --apply)'}: inserted ${report.inserted}, updated ${report.updated}, unchanged ${report.unchanged}, kept ${report.kept}, invalid ${report.invalid}; dates added ${report.datesAdded}, skipped ${report.datesSkipped}; records needing a verified date ${report.needVerification}`);
  const counts = db.prepare("SELECT status, COUNT(*) AS n FROM observances GROUP BY status").all();
  console.log(`[observances] database now has: ${counts.map((c) => `${c.n} ${c.status}`).join(', ') || 'no observances'}${apply ? '' : ' (unchanged by this dry run)'}`);
  db.close();
  if (report.invalid) process.exit(1);
}
