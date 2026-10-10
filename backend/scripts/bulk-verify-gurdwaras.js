/* ==========================================================================
   Gurdwara Directory — bulk-verify every listed record still marked
   "needs verification", on a Master Admin's decision.

   Unlike scripts/audit-gurdwara-verification.js this does NOT check evidence:
   each record's verification log says plainly that it was verified in bulk at
   the admin's request, so the history stays honest. Archived records and
   publication are not touched.

     node backend/scripts/bulk-verify-gurdwaras.js                               dry run
     node backend/scripts/bulk-verify-gurdwaras.js --apply --actor <master-admin email>
     node backend/scripts/bulk-verify-gurdwaras.js --rollback backend/backups/<file>.json
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction } from '../src/db/database.js';

const arg = (n) => { const i = process.argv.indexOf('--' + n); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (n) => process.argv.includes('--' + n);

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[bulk-verify] database: ${describeDatabase(config).label}`);

  if (arg('rollback')) {
    const b = JSON.parse(fs.readFileSync(path.resolve(arg('rollback')), 'utf8'));
    transaction(db, () => {
      for (const r of b.rows) {
        db.prepare('UPDATE gurdwaras SET verification_status = ?, verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?')
          .run(r.verification_status, r.verified_by, r.verified_at, r.updated_by, r.updated_at, r.id);
      }
      for (const id of b.insertedLogIds) db.prepare('DELETE FROM gurdwara_verification WHERE id = ?').run(id);
    });
    console.log(`[bulk-verify] rolled back ${b.rows.length} records`);
    return;
  }

  const rows = db.prepare(`SELECT id, name, verification_status, verified_by, verified_at, updated_by, updated_at,
      (latitude IS NULL OR longitude IS NULL) AS no_coords
    FROM gurdwaras WHERE archived_at IS NULL AND verification_status = 'needs_verification' ORDER BY id`).all();
  console.log(`[bulk-verify] listed records needing verification: ${rows.length} (${rows.filter((r) => r.no_coords).length} of them without map coordinates)`);
  if (!flag('apply')) { console.log('[bulk-verify] dry run — nothing was changed.'); return; }
  const actor = db.prepare("SELECT id, name FROM users WHERE email = ? COLLATE NOCASE AND role = 'admin' AND status = 'active'").get(String(arg('actor') || ''));
  if (!actor) throw new Error('--apply needs --actor <email of an active Master Admin>');
  if (!rows.length) { console.log('[bulk-verify] nothing to apply'); return; }

  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `gurdwara-bulk-verify-${now.replace(/[:.]/g, '-')}.json`);
  const backup = { appliedAt: now, database: describeDatabase(config).label, rows: rows.map(({ no_coords, name, ...r }) => r), insertedLogIds: [] };
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  const note = 'Bulk-verified at the Master Admin’s request without an individual evidence check (see sources on the record).';
  transaction(db, () => {
    for (const r of rows) {
      db.prepare("UPDATE gurdwaras SET verification_status = 'verified', verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(actor.id, now, actor.id, now, r.id);
      backup.insertedLogIds.push(Number(db.prepare("INSERT INTO gurdwara_verification (gurdwara_id, action, note, actor_id) VALUES (?, 'verified', ?, ?)").run(r.id, note, actor.id).lastInsertRowid));
    }
    db.prepare('INSERT INTO moderation_log (actor_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)').run(actor.id, 'gurdwara.bulk_verify', 'gurdwara', null, `${rows.length} bulk-verified on admin request; backup ${path.basename(file)}`);
  });
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`[bulk-verify] applied: ${rows.length} records verified. Rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[bulk-verify] failed:', err.message); process.exit(1); });
