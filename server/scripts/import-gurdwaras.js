#!/usr/bin/env node
/* ==========================================================================
   Import Gurdwaras from a CSV or JSON file into the directory database.

     npm run gurdwaras:import -- <file>                      dry run (nothing saved)
     npm run gurdwaras:import -- <file> --apply              import
     npm run gurdwaras:import -- <file> --apply --by admin@example.com

   The bundled source-backed dataset (built by `npm run gurdwaras:fetch-wikidata`):
     npm run gurdwaras:import -- server/seed/gurdwaras/wikidata-gurdwaras.json --apply

   Every imported record is "needs verification": it is not shown in the
   public directory until an admin has checked it against its sources and
   verified it (/admin/gurdwaras → Records → Needs verification).
   Rows with `external_ref` update the record imported from that source
   before, so running the same import again never creates duplicates.

   JSON: an array of rows, or { records: [...] }. Columns / keys:
     external_ref, name, official_name, country (ISO code or name) | country_code,
     state, state_code, district, city, address | full_address, postal_code,
     latitude, longitude, phone, email, website, description, established_year,
     status, facilities, services,
     source_name, source_url, source_type, source_notes, source_verified_at
     (or `sources`: [{ name, url, type, notes }])
   Unknown values stay empty — never fill them with guesses.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';
import { createGurdwaraStore, parseCsv } from '../lib/gurdwaraStore.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--by');
if (!file) {
  console.error('Usage: npm run gurdwaras:import -- <file.csv|file.json> [--apply] [--by admin-email]');
  process.exit(1);
}
const abs = path.resolve(file);
if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1); }

const text = fs.readFileSync(abs, 'utf8');
let rows;
try {
  if (/\.json$/i.test(abs)) {
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed : parsed.records;
  } else rows = parseCsv(text);
} catch (e) {
  console.error(`Could not read ${path.basename(abs)}: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(rows) || !rows.length) { console.error('The file has no rows.'); process.exit(1); }

const config = loadConfig();
const db = openDatabase(config.dbPath);
let user = null;
if (opt('by')) {
  user = db.prepare("SELECT id, name, role FROM users WHERE email = ? COLLATE NOCASE AND role IN ('admin', 'moderator')").get(opt('by'));
  if (!user) { console.error(`No admin or moderator with the email ${opt('by')}.`); process.exit(1); }
}
const apply = flag('apply');
const store = createGurdwaraStore(db);

console.log(`${apply ? 'Importing' : 'Dry run of'} ${rows.length} rows from ${path.relative(process.cwd(), abs)} into ${path.relative(process.cwd(), config.dbPath)}…`);
const report = store.importRows(rows, user, { dryRun: !apply });

console.log(`
  ${apply ? 'Imported' : 'Would import'}:  ${report.imported}
  ${apply ? 'Updated' : 'Would update'}:   ${report.updated}
  Unchanged:       ${report.unchanged}
  Duplicates:      ${report.duplicates}
  Invalid:         ${report.invalid}
  Needs verification (new): ${report.needsVerification}`);
const problems = report.rows.filter((r) => r.result === 'invalid' || r.result === 'duplicate');
if (problems.length) {
  console.log('\nRows not imported:');
  for (const r of problems.slice(0, 50)) console.log(`  line ${r.line}: ${r.result} — ${r.name || ''}${r.matchName ? ` (matches #${r.matchId} ${r.matchName})` : ''}${r.message ? ` — ${r.message}` : ''}`);
  if (problems.length > 50) console.log(`  … and ${problems.length - 50} more`);
}
if (!apply) console.log('\nNothing was saved. Run again with --apply to import.');
else console.log('\nImported records need verification before they appear publicly: /admin/gurdwaras → Records → Verification: Needs verification.');
