/* ==========================================================================
   Database recovery point: writes every table of the configured database
   (local SQLite or Turso/libSQL) to one JSON file in backend/backups/.
   Read-only on the database. BLOB columns are stored as base64.

     node backend/scripts/backup-database.js            → backend/backups/db-<time>.json
     node backend/scripts/backup-database.js --out x.json

   Keep the file private (it contains account emails and password hashes).
   For Turso, a `turso db shell <db> .dump` or a dashboard restore point is
   an additional, platform-level recovery option.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, schemaVersion } from '../src/db/database.js';

const i = process.argv.indexOf('--out');
const config = loadConfig();
const db = await openDatabaseForConfig(config);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' ORDER BY name").all().map((t) => t.name);
const out = { createdAt: new Date().toISOString(), database: describeDatabase(config).label, schemaVersion: schemaVersion(db), tables: {} };
let rows = 0;
for (const t of tables) {
  out.tables[t] = db.prepare(`SELECT * FROM "${t}"`).all().map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Uint8Array || Buffer.isBuffer(v) ? { $base64: Buffer.from(v).toString('base64') } : v])));
  rows += out.tables[t].length;
}
const file = i > -1 ? path.resolve(process.argv[i + 1]) : path.join(BACKEND_ROOT, 'backups', `db-${out.createdAt.replace(/[:.]/g, '-')}.json`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out));
console.log(`[backup] ${tables.length} tables, ${rows} rows from ${out.database} (schema ${out.schemaVersion}) → ${file} (${(fs.statSync(file).size / 1048576).toFixed(1)} MB)`);
