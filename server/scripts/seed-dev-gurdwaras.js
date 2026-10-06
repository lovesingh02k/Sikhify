#!/usr/bin/env node
/* ==========================================================================
   DEVELOPMENT FIXTURES for the Gurdwara Directory — NOT REAL GURDWARAS.

     NODE_ENV=development npm run gurdwaras:dev-fixtures            add 60 fixtures
     NODE_ENV=development npm run gurdwaras:dev-fixtures -- --remove remove them all

   For exercising the UI (paging, filters, distance, map) before real,
   source-backed data is available. Every fixture:
     • is named "[DEV FIXTURE] …" and lives in "Fixture State …" / "Fixture City …",
     • has external_ref "fixture:…" and a source that says it is not real,
     • uses .example websites and no phone numbers.
   The script refuses to run unless NODE_ENV=development, and a production
   server never serves fixture records even if they exist in its database.
   Prefer a separate database for fixtures: SIKHIFY_DB_PATH=server/data/dev-fixtures.db
   ========================================================================== */
import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';
import { createGurdwaraStore, FIXTURE_REF } from '../lib/gurdwaraStore.js';

if (process.env.NODE_ENV !== 'development') {
  console.error('Refusing to run: development fixtures need NODE_ENV=development (they are not real Gurdwaras).');
  process.exit(1);
}
const config = loadConfig();
const db = openDatabase(config.dbPath);

if (process.argv.includes('--remove')) {
  const ids = db.prepare(`SELECT id FROM gurdwaras WHERE external_ref LIKE '${FIXTURE_REF}%'`).all().map((r) => r.id);
  for (const id of ids) {
    db.prepare('DELETE FROM gurdwaras_fts WHERE rowid = ?').run(id);
    db.prepare('DELETE FROM gurdwaras WHERE id = ?').run(id);
  }
  db.exec(`DELETE FROM cities WHERE name LIKE 'Fixture City %' AND id NOT IN (SELECT city_id FROM gurdwaras);
    DELETE FROM states_regions WHERE name LIKE 'Fixture State %' AND id NOT IN (SELECT state_region_id FROM gurdwaras);`);
  console.log(`Removed ${ids.length} development fixtures.`);
  process.exit(0);
}

const store = createGurdwaraStore(db);
const PLACES = [
  ['IN', 'Fixture State North', 'Fixture City One', 30.0, 76.0],
  ['IN', 'Fixture State North', 'Fixture City Two', 30.4, 76.6],
  ['IN', 'Fixture State Central', 'Fixture City Three', 21.0, 81.0],
  ['CA', 'Fixture State West', 'Fixture City Four', 49.0, -123.0],
  ['GB', 'Fixture State South', 'Fixture City Five', 51.4, -0.5],
];
const FAC = [['langar'], ['langar', 'parking'], ['langar', 'wheelchair_access'], ['langar', 'accommodation']];
const SVC = [['kirtan'], ['kirtan', 'katha'], ['punjabi_classes'], ['kirtan', 'gurmat_classes']];
const rows = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1;
  const [country, state, city, lat, lng] = PLACES[i % PLACES.length];
  return {
    external_ref: `${FIXTURE_REF}${n}`,
    name: `[DEV FIXTURE] Gurdwara ${String(n).padStart(2, '0')}`,
    country, state, city,
    address: `${n} Fixture Road`,
    // Every third fixture has no coordinates, to exercise lists and maps without them.
    latitude: n % 3 === 0 ? null : lat + (n % 7) * 0.02, longitude: n % 3 === 0 ? null : lng + (n % 5) * 0.03,
    website: `https://fixture-${n}.example`,
    description: 'Development fixture for testing the directory UI. Not a real Gurdwara.',
    status: n % 11 === 0 ? 'temporarily_closed' : 'active',
    facilities: FAC[n % FAC.length], services: SVC[n % SVC.length],
    sources: [{ name: 'Development fixture — not a real Gurdwara', type: 'other' }],
  };
});
const report = store.importRows(rows, null, { dryRun: false });
// Fixtures are marked verified so the default (verified-only) listing can be exercised.
const now = new Date().toISOString();
db.prepare(`UPDATE gurdwaras SET verification_status = 'verified', verified_at = ? WHERE external_ref LIKE '${FIXTURE_REF}%' AND external_ref NOT IN (?, ?, ?)`)
  .run(now, `${FIXTURE_REF}6`, `${FIXTURE_REF}12`, `${FIXTURE_REF}18`);
console.log(`Development fixtures: ${report.imported} added, ${report.updated + report.unchanged} already present. Remove with --remove.`);
