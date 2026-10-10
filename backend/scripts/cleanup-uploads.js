/* ==========================================================================
   Sikhify — find (and, only when asked, remove) uploaded images nothing uses
     npm run uploads:cleanup                         dry run: list unused uploads and their size
     npm run uploads:cleanup -- --min-age-days 30    only uploads older than 30 days (default 7)
     npm run uploads:cleanup -- --apply              delete them (a copy of each is saved first)

   "Used" means referenced anywhere in the database — every text column of every
   table is scanned for /uploads/… (lib/uploadRefs.js): profile photos, group
   covers, post images, Gurdwara photos, festival images, directory records and
   anything added later. Recent uploads are never removed (a form may be about
   to save them). With --apply, every file is first written to
   backend/upload-backups/<timestamp>/ (restore by uploading it again).
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase } from '../src/db/database.js';
import { findUploadReferences } from '../src/lib/uploadRefs.js';

export function unusedUploads(db, { minAgeDays = 7, now = Date.now() } = {}) {
  const refs = findUploadReferences(db);
  const cutoff = new Date(now - minAgeDays * 864e5).toISOString();
  return db.prepare('SELECT id, owner_id, path, bytes, purpose, created_at FROM uploads WHERE created_at < ? ORDER BY id').all(cutoff)
    .filter((u) => !refs.has(u.path));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--min-age-days');
  const minAgeDays = i > -1 ? Number(args[i + 1]) : 7;
  const config = loadConfig();
  console.log(`[uploads] database: ${describeDatabase(config).label}`);
  const db = await openDatabaseForConfig(config);
  const list = unusedUploads(db, { minAgeDays });
  const total = list.reduce((n, u) => n + u.bytes, 0);
  for (const u of list) console.log(`  #${u.id} ${u.path} ${u.bytes} bytes (${u.purpose}, ${u.created_at.slice(0, 10)})`);
  console.log(`[uploads] ${list.length} unused upload(s) older than ${minAgeDays} days, ${(total / 1048576).toFixed(2)} MB`);
  if (args.includes('--apply') && list.length) {
    const dir = path.join(BACKEND_ROOT, 'upload-backups', new Date().toISOString().replace(/[:.]/g, '-'));
    for (const u of list) {
      const row = db.prepare('SELECT data FROM uploads WHERE id = ?').get(u.id);
      const local = path.join(config.uploadDir, u.path);
      const bytes = row && row.data ? Buffer.from(row.data) : fs.existsSync(local) ? fs.readFileSync(local) : null;
      if (bytes) { fs.mkdirSync(path.dirname(path.join(dir, u.path)), { recursive: true }); fs.writeFileSync(path.join(dir, u.path), bytes); }
      db.prepare('DELETE FROM uploads WHERE id = ?').run(u.id);
      if (fs.existsSync(local)) fs.rmSync(local);
    }
    console.log(`[uploads] deleted ${list.length}; copies saved in ${dir}`);
  } else if (list.length) console.log('[uploads] DRY RUN — nothing deleted (add --apply)');
  db.close();
}
