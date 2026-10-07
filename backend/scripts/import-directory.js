/* ==========================================================================
   Sikhify — import knowledge-directory records from seed files
     npm run directory:import                         dry run of backend/seed/directory/*.json
     npm run directory:import -- --apply              import as drafts (admins publish)
     npm run directory:import -- --apply --publish    import and publish
     npm run directory:import -- path/to/file.json --apply --by admin@example.com

   A seed file is { "type": "<content type>", "retrieved": "YYYY-MM-DD",
   "records": [ { ...fields from shared/contentTypes.js, "source": "...",
   "references": [{ "label": "...", "url": "https://…" }] } ] }.

   Every record passes the same validation as the admin editor and must have a
   source or reference. Imported records are never marked verified — that is a
   person's decision in /admin/content — so public pages show them as
   "Pending" until an admin verifies them.

   Re-running is safe: records are matched by type + slug. A record nobody has
   edited since it was imported is updated from the file; a record a person
   has edited or verified in the admin is left exactly as it is.

   Writes to the same database as the site: Turso/libSQL when
   SIKHIFY_DATABASE_URL is set, otherwise the local SQLite file.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDatabaseForConfig, transaction, parseJson, describeDatabase } from '../src/db/database.js';
import { cleanEntry, assertPublishable } from '../src/lib/entries.js';
import { slugify } from '../src/lib/util.js';
import { CONTENT_TYPES } from '../../shared/contentTypes.js';

const SEED_DIR = fileURLToPath(new URL('../seed/directory/', import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : undefined; };
const fileArgs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--by');
const apply = flag('apply');
const publish = flag('publish');

/** Reads seed files; returns [{ file, type, records }]. Exported shape is also used by tests. */
export function readSeedFiles(files) {
  return files.map((file) => {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!CONTENT_TYPES[parsed.type]) throw new Error(`${path.basename(file)}: unknown content type "${parsed.type}"`);
    if (!Array.isArray(parsed.records)) throw new Error(`${path.basename(file)}: "records" must be an array`);
    return { file, type: parsed.type, records: parsed.records };
  });
}

/** Seed JSON → the form-shaped input cleanEntry expects (references as "Label | url" lines). */
export function toInput(record) {
  const refs = Array.isArray(record.references)
    ? record.references.map((r) => (typeof r === 'string' ? r : `${r.label || r.url} | ${r.url}`)).join('\n')
    : record.references || '';
  return { ...record, references: refs };
}

const COMPARE = ['title', 'summary', 'body', 'image_url', 'data', 'country', 'state', 'district', 'city', 'category', 'sort_date', 'source', 'references_json'];

/**
 * Imports `sets` into `db`. Returns a report; with dryRun nothing is written.
 * `user` (optional) is recorded as the creator.
 */
export function importDirectory(db, sets, { dryRun = true, publish = false, user = null } = {}) {
  const report = { imported: 0, updated: 0, unchanged: 0, kept: 0, invalid: 0, rows: [] };
  const run = () => {
    for (const { type, records, file } of sets) {
      const seen = new Set();
      records.forEach((record, i) => {
        const at = `${path.basename(file || type)} #${i + 1}`;
        let row;
        try {
          row = cleanEntry(type, toInput(record));
          if (!row.source && !parseJson(row.references_json, []).length) throw new Error('Seed records need a source or a reference');
        } catch (e) {
          report.invalid++;
          report.rows.push({ at, title: record.title, result: 'invalid', message: e.fields ? JSON.stringify(e.fields) : e.message });
          return;
        }
        const slug = slugify(row.title);
        if (seen.has(slug)) { report.invalid++; report.rows.push({ at, title: row.title, result: 'invalid', message: 'Duplicate title in this file' }); return; }
        seen.add(slug);
        const existing = db.prepare('SELECT * FROM entries WHERE type = ? AND slug = ?').get(type, slug);
        if (!existing) {
          const status = publish ? 'published' : 'draft';
          if (status === 'published') assertPublishable({ ...row, verification_status: 'pending' });
          if (!dryRun) {
            db.prepare(`INSERT INTO entries (type, slug, title, summary, body, image_url, data, country, state, district, city, category, sort_date,
              publish_status, verification_status, source, references_json, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`).run(
              type, slug, row.title, row.summary, row.body, row.image_url, row.data, row.country, row.state, row.district, row.city, row.category, row.sort_date,
              status, row.source, row.references_json, user ? user.id : null);
          }
          report.imported++;
          report.rows.push({ at, title: row.title, result: 'imported' });
          return;
        }
        // Edited, verified or rejected by a person in the admin → never overwritten.
        if (existing.updated_by !== null && existing.updated_by !== undefined) {
          report.kept++;
          report.rows.push({ at, title: row.title, result: 'kept', message: 'edited in the admin' });
          return;
        }
        const changed = COMPARE.some((k) => String(existing[k] ?? '') !== String(row[k] ?? ''));
        const nextStatus = publish && existing.publish_status === 'draft' ? 'published' : existing.publish_status;
        if (!changed && nextStatus === existing.publish_status) { report.unchanged++; return; }
        if (!dryRun) {
          db.prepare(`UPDATE entries SET title = ?, summary = ?, body = ?, image_url = ?, data = ?, country = ?, state = ?, district = ?, city = ?, category = ?, sort_date = ?,
            source = ?, references_json = ?, publish_status = ?, updated_at = ? WHERE id = ?`).run(
            row.title, row.summary, row.body, row.image_url, row.data, row.country, row.state, row.district, row.city, row.category, row.sort_date,
            row.source, row.references_json, nextStatus, new Date().toISOString(), existing.id);
        }
        report.updated++;
        report.rows.push({ at, title: row.title, result: 'updated' });
      });
    }
  };
  if (dryRun) run(); else transaction(db, run);
  return report;
}

/* ---------- command line */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const files = (fileArgs.length ? fileArgs.map((f) => path.resolve(f))
    : fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(SEED_DIR, f)));
  for (const f of files) if (!fs.existsSync(f)) { console.error(`File not found: ${f}`); process.exit(1); }
  let sets;
  try { sets = readSeedFiles(files); } catch (e) { console.error(e.message); process.exit(1); }

  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  const dest = describeDatabase(config);
  const target = dest.remote ? `TURSO/LIBSQL (${dest.host})` : `LOCAL SQLite (${path.relative(process.cwd(), config.dbPath)})`;
  let user = null;
  if (opt('by')) {
    user = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND role IN ('admin', 'moderator')").get(opt('by'));
    if (!user) { console.error(`No admin or moderator with the email ${opt('by')}.`); process.exit(1); }
  }
  const total = sets.reduce((n, s) => n + s.records.length, 0);
  console.log(`Source:      ${files.map((f) => path.basename(f)).join(', ')}
Destination: ${target}
Mode:        ${apply ? 'APPLY (writes to the destination)' : 'dry run (nothing is saved)'}${publish ? ', publish' : ', as drafts'}
Rows read:   ${total}`);
  const report = importDirectory(db, sets, { dryRun: !apply, publish, user });
  console.log(`
${apply ? `Imported into ${target}` : `Dry run against ${target}`}
  ${apply ? 'Inserted' : 'Would insert'}:  ${report.imported}
  ${apply ? 'Updated' : 'Would update'}:   ${report.updated}
  Unchanged:       ${report.unchanged}
  Kept (edited in the admin): ${report.kept}
  Invalid (skipped): ${report.invalid}
  Verification:    new records are "pending" (an admin verifies them in /admin/content)`);
  const problems = report.rows.filter((r) => r.result === 'invalid');
  if (problems.length) {
    console.log('\nRecords not imported:');
    for (const r of problems) console.log(`  ${r.at}: ${r.title || '(no title)'} — ${r.message}`);
  }
  console.log(apply
    ? `\nDone. Imported records are "Pending" verification; review and verify them at /admin/content.${publish ? '' : ' They are drafts until published.'}`
    : '\nNothing was saved. Run again with --apply to import.');
  process.exit(problems.length && apply ? 2 : 0);
}
