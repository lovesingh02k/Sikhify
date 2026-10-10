#!/usr/bin/env node
/* ==========================================================================
   Import Gurdwaras from a CSV or JSON file into the directory database.

     npm run gurdwaras:import -- <file>                      dry run (nothing saved)
     npm run gurdwaras:import -- <file> --apply              import
     npm run gurdwaras:import -- <file> --apply --by admin@example.com

   The bundled source-backed dataset (built by `npm run gurdwaras:fetch-wikidata`):
     npm run gurdwaras:import -- seed/gurdwaras/wikidata-gurdwaras.json --apply

   The curated historic Gurdwaras of India (Panj Takht and major historic sites),
   hand-checked against SGPC / DSGMC / official Takht websites, Wikipedia and Wikidata:
     npm run gurdwaras:import-historic                                         dry run
     npm run gurdwaras:import-historic -- --apply --verify --by admin@example.com

   --verify (needs --apply and --by) marks the file's records verified in the name
   of that admin, with a note in each record's verification log. Use it only for a
   file whose rows have been checked against their sources.

   Every imported record is "needs verification": it is listed publicly with
   that label (never presented as confirmed) until an admin has checked it
   against its sources and verified it (/admin/gurdwaras → Records → Review & verify).
   Rows with `external_ref` update the record imported from that source
   before, so running the same import again never creates duplicates.

   JSON: an array of rows, or { records: [...] }. Columns / keys:
     external_ref, name, official_name, country (ISO code or name) | country_code,
     state, state_code, district, city, address | full_address, postal_code,
     latitude, longitude, phone, email, website, description, established_year,
     status, facilities, services, designation (takht | historic),
     images: [{ url, thumb_url, width, height, alt, credit, license, source_url }]  (Wikimedia Commons only),
     clear: ["latitude", "longitude", …]  (empties those fields on the matched record),
     source_name, source_url, source_type, source_notes, source_verified_at
     (or `sources`: [{ name, url, type, notes }])
   Unknown values stay empty — never fill them with guesses.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { openDatabaseForConfig, isRemoteDatabase, describeDatabase } from '../src/db/database.js';
import { createGurdwaraStore, parseCsv } from '../src/lib/gurdwaraStore.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--by');
if (!file) {
  console.error('Usage: npm run gurdwaras:import -- <file.csv|file.json> [--apply] [--by admin-email] [--verify]');
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
// Same database as the running site: Turso/libSQL when SIKHIFY_DATABASE_URL is set, else the local file.
const db = await openDatabaseForConfig(config);
const dest = describeDatabase(config);
const target = dest.remote ? `TURSO/LIBSQL (${dest.host})` : `LOCAL SQLite (${path.relative(process.cwd(), config.dbPath)})`;
let user = null;
if (opt('by')) {
  user = db.prepare("SELECT id, name, role FROM users WHERE email = ? COLLATE NOCASE AND role IN ('admin', 'moderator')").get(opt('by'));
  if (!user) { console.error(`No admin or moderator with the email ${opt('by')}.`); process.exit(1); }
}
const apply = flag('apply');
const verifyRows = flag('verify');
if (verifyRows && (!apply || !user || user.role !== 'admin')) {
  console.error('--verify needs --apply and --by <admin email>: verification is recorded in the name of the admin who checked the file.');
  process.exit(1);
}
const store = createGurdwaraStore(db, { remote: isRemoteDatabase(db) });

console.log(`Source:      ${path.relative(process.cwd(), abs)}
Destination: ${target}
Mode:        ${apply ? 'APPLY (writes to the destination)' : 'dry run (nothing is saved)'}
Rows read:   ${rows.length}`);
const report = store.importRows(rows, user, { dryRun: !apply });

console.log(`
${apply ? `Imported into ${target}` : `Dry run against ${target}`}
  Rows read:       ${rows.length}
  ${apply ? 'Inserted' : 'Would insert'}:  ${report.imported}
  ${apply ? 'Updated' : 'Would update'}:   ${report.updated}
  Unchanged:       ${report.unchanged}
  Duplicates:      ${report.duplicates}
  Invalid:         ${report.invalid}
  Skipped (duplicates + invalid): ${report.duplicates + report.invalid}
  New records needing verification: ${report.needsVerification}`);
const problems = report.rows.filter((r) => r.result === 'invalid' || r.result === 'duplicate');
if (problems.length) {
  console.log('\nRows not imported:');
  for (const r of problems.slice(0, 50)) console.log(`  line ${r.line}: ${r.result} — ${r.name || ''}${r.matchName ? ` (matches #${r.matchId} ${r.matchName})` : ''}${r.message ? ` — ${r.message}` : ''}`);
  if (problems.length > 50) console.log(`  … and ${problems.length - 50} more`);
}
if (apply && verifyRows) {
  const ids = [...new Set(report.rows.filter((r) => r.id && r.result !== 'invalid' && r.result !== 'duplicate').map((r) => r.id))];
  let retrieved = '';
  try { retrieved = JSON.parse(text).retrieved || ''; } catch { /* CSV */ }
  const res = store.verify(ids, user, `Checked against the sources cited in ${path.basename(abs)}${retrieved ? ` (retrieved ${retrieved})` : ''}.`);
  const reasons = [...new Set(res.skipped.map((x) => x.reason))].join(', ');
  console.log(`  Verified:        ${res.verified.length}${res.skipped.length ? ` (skipped ${res.skipped.length}: ${reasons})` : ''}`);
}
if (!apply) console.log('\nNothing was saved. Run again with --apply to import.');
else if (!verifyRows) console.log('\nImported records are listed publicly as "needs verification" until an admin verifies them: /admin/gurdwaras → Records → Review & verify.');
