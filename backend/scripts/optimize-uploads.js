/* ==========================================================================
   Sikhify — optimise images uploaded before automatic optimisation existed
     npm run uploads:optimize                          dry run: sizes before/after, nothing written
     npm run uploads:optimize -- --apply               optimise (originals kept in upload_originals)
     npm run uploads:optimize -- --apply --limit 100   a batch; re-run to continue (resumable)
     npm run uploads:optimize -- --rollback            restore every original that was replaced
     npm run uploads:optimize -- --purge-originals     after checking the site: drop the kept originals
     npm run uploads:optimize -- --retry-skipped       try unreadable images again on the next run

   Uses the same optimiser as new uploads (src/lib/images.js). URLs never change:
   the row (and its /uploads/… path) stays, only its bytes and type are replaced,
   and the server sends the stored type. Before replacing anything the original is
   copied to upload_originals, so --rollback restores it exactly. Each image is
   done in its own transaction; rows already done (optimized_at) are skipped, so
   an interrupted run simply continues. Images that are no longer referenced
   anywhere are reported but left alone (see uploads:cleanup).

   Writes to the same database as the site: Turso/libSQL when
   SIKHIFY_DATABASE_URL is set, otherwise the local SQLite file.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDatabaseForConfig, transaction, describeDatabase } from '../src/db/database.js';
import { optimizeImage } from '../src/lib/images.js';
import { findUploadReferences } from '../src/lib/uploadRefs.js';
import { sniff } from '../src/routes/uploads.js';

const asBuffer = (d) => (d == null ? null : Buffer.isBuffer(d) ? d : Buffer.from(d));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reads an upload's bytes: the database copy, else the local file. */
function bytesOf(row, uploadDir) {
  const d = asBuffer(row.data);
  if (d && d.length) return d;
  const file = path.join(uploadDir, row.path);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

export async function optimizeUploads(db, { apply = false, limit = Infinity, batch = 25, pauseMs = 0, uploadDir = '', log = () => {} } = {}) {
  const report = { checked: 0, optimised: 0, kept: 0, failed: 0, missing: 0, unreferenced: 0, before: 0, after: 0, rows: [] };
  const refs = findUploadReferences(db);
  let lastId = 0;
  while (report.checked < limit) {
    const rows = db.prepare('SELECT id, path, mime, bytes, purpose, data FROM uploads WHERE optimized_at IS NULL AND id > ? ORDER BY id LIMIT ?')
      .all(lastId, Math.min(batch, limit - report.checked));
    if (!rows.length) break;
    for (const row of rows) {
      lastId = row.id;
      report.checked++;
      const buf = bytesOf(row, uploadDir);
      const used = refs.has(row.path);
      if (!used) report.unreferenced++;
      // Unreadable rows are marked "skipped:<time>" when applying, so a run always finishes (see --retry-skipped).
      const skip = () => { if (apply) db.prepare('UPDATE uploads SET optimized_at = ? WHERE id = ?').run('skipped:' + new Date().toISOString(), row.id); };
      if (!buf) { report.missing++; report.rows.push({ id: row.id, path: row.path, result: 'missing bytes' }); skip(); continue; }
      const type = sniff(buf);
      let out;
      try {
        if (!type) throw new Error('not a supported image');
        out = await optimizeImage(buf, { purpose: row.purpose, sniffedMime: type.mime });
      } catch (err) {
        report.failed++;
        report.rows.push({ id: row.id, path: row.path, result: 'failed: ' + err.message });
        skip();
        continue;
      }
      const changed = !out.buffer.equals(buf);
      report.before += buf.length;
      report.after += changed ? out.bytes : buf.length;
      report[changed ? 'optimised' : 'kept']++;
      report.rows.push({ id: row.id, path: row.path, used, before: buf.length, after: changed ? out.bytes : buf.length, result: changed ? out.strategy : out.strategy });
      if (!apply) continue;
      const now = new Date().toISOString();
      transaction(db, () => {
        if (changed) {
          db.prepare('INSERT OR IGNORE INTO upload_originals (upload_id, mime, bytes, data) VALUES (?, ?, ?, ?)').run(row.id, row.mime, buf.length, buf);
          db.prepare('UPDATE uploads SET data = ?, mime = ?, bytes = ?, optimized_at = ? WHERE id = ?').run(out.buffer, out.mime, out.bytes, now, row.id);
        } else {
          db.prepare('UPDATE uploads SET optimized_at = ? WHERE id = ?').run(now, row.id);
        }
      });
      // Local-file storage: keep the file in step with the database copy.
      if (changed && uploadDir) {
        const file = path.join(uploadDir, row.path);
        if (fs.existsSync(file)) fs.writeFileSync(file, out.buffer);
      }
    }
    log(`… up to upload #${lastId}: ${report.checked} checked`);
    if (pauseMs) await sleep(pauseMs);
  }
  report.lastId = lastId;
  return report;
}

/** Restores every replaced original (or only `ids`). */
export function rollbackUploads(db, { ids = null, uploadDir = '' } = {}) {
  const rows = db.prepare(`SELECT o.*, u.path FROM upload_originals o JOIN uploads u ON u.id = o.upload_id${ids ? ` WHERE o.upload_id IN (${ids.map(() => '?').join(',')})` : ''}`).all(...(ids || []));
  for (const o of rows) {
    transaction(db, () => {
      db.prepare('UPDATE uploads SET data = ?, mime = ?, bytes = ?, optimized_at = NULL WHERE id = ?').run(asBuffer(o.data), o.mime, o.bytes, o.upload_id);
      db.prepare('DELETE FROM upload_originals WHERE upload_id = ?').run(o.upload_id);
    });
    if (uploadDir) { const file = path.join(uploadDir, o.path); if (fs.existsSync(file)) fs.writeFileSync(file, asBuffer(o.data)); }
  }
  return rows.length;
}

/* ---------- CLI */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf('--' + n); return i > -1 ? Number(args[i + 1]) : d; };
  const config = loadConfig();
  console.log(`[uploads] database: ${describeDatabase(config).label}`);
  const db = await openDatabaseForConfig(config);
  const uploadDir = config.databaseUrl ? '' : config.uploadDir;
  if (args.includes('--retry-skipped')) {
    const n = db.prepare("UPDATE uploads SET optimized_at = NULL WHERE optimized_at LIKE 'skipped:%'").run().changes;
    console.log(`[uploads] ${n} skipped upload(s) will be tried again on the next run`);
  } else if (args.includes('--rollback')) {
    console.log(`[uploads] restored ${rollbackUploads(db, { uploadDir })} original(s)`);
  } else if (args.includes('--purge-originals')) {
    const n = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS b FROM upload_originals').get();
    if (!args.includes('--yes')) console.log(`[uploads] ${n.n} kept original(s), ${(n.b / 1048576).toFixed(2)} MB. Add --yes to delete them (rollback is then no longer possible).`);
    else { db.prepare('DELETE FROM upload_originals').run(); console.log(`[uploads] deleted ${n.n} kept original(s)`); }
  } else {
    const apply = args.includes('--apply');
    const r = await optimizeUploads(db, { apply, limit: opt('limit', Infinity), batch: opt('batch', 25), pauseMs: opt('pause-ms', apply ? 100 : 0), uploadDir, log: (m) => console.log('[uploads] ' + m) });
    for (const row of r.rows) console.log(`  #${row.id} ${row.path} ${row.before ?? ''}→${row.after ?? ''} ${row.used === false ? '(unreferenced) ' : ''}${row.result}`);
    const mb = (b) => (b / 1048576).toFixed(2);
    console.log(`[uploads] ${apply ? 'APPLIED' : 'DRY RUN (nothing written; add --apply)'}: checked ${r.checked}, optimised ${r.optimised}, already fine ${r.kept}, failed ${r.failed}, missing ${r.missing}, unreferenced ${r.unreferenced}; ${mb(r.before)} MB → ${mb(r.after)} MB${r.before ? ` (${(100 * (1 - r.after / r.before)).toFixed(1)}% smaller)` : ''}; last id ${r.lastId}`);
  }
  db.close();
}
