/* ==========================================================================
   Gurdwara Directory — evidence audit for records imported from Wikidata.

   For every listed (not archived) record that still "needs verification" and
   came from Wikidata (external_ref "wikidata:Q…"), the item is fetched live
   from Wikidata and the record is marked VERIFIED only when it meets the rules
   in src/lib/gurdwaraEvidence.js (a gurdwara on Wikidata, same name, same place,
   and corroborated by a Wikipedia article or an official website that responds).

   Everything else stays "needs verification", with the reason in the report.
   Nothing is deleted, unpublished or invented; publication (archived or not)
   is never changed — verification and publication are separate questions.

   Usage (from the repository root; uses the database configured in backend/.env):
     node backend/scripts/audit-gurdwara-verification.js                 dry run: report only, writes nothing
     node backend/scripts/audit-gurdwara-verification.js --apply --actor admin@example.com
          backs up the affected rows to backend/backups/, then updates them in one transaction
     node backend/scripts/audit-gurdwara-verification.js --rollback backend/backups/<file>.json
          restores exactly the rows changed by that run
   Options: --report <file.json> (write the full report), --limit <n> (only the first n records)

   The applying admin is recorded as the verifier, and each record's verification
   log keeps the evidence (Wikidata item, distance, corroborating link).
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction } from '../src/db/database.js';
import { checkEvidence } from '../src/lib/gurdwaraEvidence.js';

const arg = (name) => { const i = process.argv.indexOf('--' + name); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (name) => process.argv.includes('--' + name);

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[audit] database: ${describeDatabase(config).label}`);

  if (arg('rollback')) {
    const file = path.resolve(arg('rollback'));
    const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
    transaction(db, () => {
      for (const r of backup.rows) {
        db.prepare('UPDATE gurdwaras SET verification_status = ?, verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?')
          .run(r.before.verification_status, r.before.verified_by, r.before.verified_at, r.before.updated_by, r.before.updated_at, r.id);
        for (const id of r.insertedLogIds || []) db.prepare('DELETE FROM gurdwara_verification WHERE id = ?').run(id);
        for (const id of r.insertedSourceIds || []) db.prepare('DELETE FROM gurdwara_sources WHERE id = ?').run(id);
        db.prepare('UPDATE gurdwara_sources SET verified_at = NULL WHERE gurdwara_id = ? AND verified_at = ?').run(r.id, backup.appliedAt);
      }
    });
    console.log(`[audit] rolled back ${backup.rows.length} records from ${file}`);
    return;
  }

  const limit = Number(arg('limit')) || Infinity;
  const recs = db.prepare(`SELECT g.id, g.name, g.latitude, g.longitude, g.external_ref, g.verification_status, g.verified_by, g.verified_at, g.updated_by, g.updated_at
    FROM gurdwaras g WHERE g.archived_at IS NULL AND g.verification_status = 'needs_verification' AND g.external_ref LIKE 'wikidata:Q%' ORDER BY g.id`).all()
    .slice(0, limit).map((r) => ({ ...r, qid: r.external_ref.slice('wikidata:'.length) }));
  const others = db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NULL AND verification_status = 'needs_verification' AND (external_ref IS NULL OR external_ref NOT LIKE 'wikidata:Q%')").get().n;
  console.log(`[audit] ${recs.length} Wikidata-imported records need verification (${others} other unverified records are left for manual review)`);
  // The same rules as Admin → Gurdwaras → "Review & verify" (lib/gurdwaraEvidence.js).
  const results = (await checkEvidence(recs)).map((r) => ({ id: r.id, name: r.name, qid: recs.find((x) => x.id === r.id).qid, verified: r.meets, reasons: r.reasons, evidence: r.evidence }));
  const ok = results.filter((r) => r.verified);
  const byReason = {};
  for (const r of results) for (const why of r.reasons) byReason[why.replace(/[\d.]+ km/, 'N km')] = (byReason[why.replace(/[\d.]+ km/, 'N km')] || 0) + 1;
  console.log(`[audit] meets every rule → verify: ${ok.length}`);
  console.log(`[audit] stays "needs verification": ${results.length - ok.length}`);
  for (const [why, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`          ${String(n).padStart(4)}  ${why}`);
  if (arg('report')) { fs.writeFileSync(arg('report'), JSON.stringify({ generatedAt: new Date().toISOString(), rules: 'see header of scripts/audit-gurdwara-verification.js', results }, null, 2)); console.log(`[audit] full report: ${arg('report')}`); }

  if (!flag('apply')) { console.log('[audit] dry run — nothing was changed. Re-run with --apply --actor <admin email> to apply.'); return; }
  const actor = db.prepare("SELECT id, name FROM users WHERE email = ? COLLATE NOCASE AND role = 'admin' AND status = 'active'").get(String(arg('actor') || ''));
  if (!actor) throw new Error('--apply needs --actor <email of an active Master Admin> (the person taking responsibility for this verification)');
  if (!ok.length) { console.log('[audit] nothing to apply'); return; }

  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `gurdwara-verification-${now.replace(/[:.]/g, '-')}.json`);
  const before = Object.fromEntries(recs.map((r) => [r.id, r]));
  const backup = { appliedAt: now, actor: actor.id, database: describeDatabase(config).label, rows: [] };
  // The backup is written before anything changes, then completed with the ids of rows this run adds.
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  transaction(db, () => {
    for (const r of ok) {
      const b = before[r.id];
      const row = { id: r.id, before: { verification_status: b.verification_status, verified_by: b.verified_by, verified_at: b.verified_at, updated_by: b.updated_by, updated_at: b.updated_at }, insertedLogIds: [], insertedSourceIds: [] };
      if (r.evidence.wikipedia && !db.prepare('SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ? AND source_url = ?').get(r.id, r.evidence.wikipedia)) {
        row.insertedSourceIds.push(Number(db.prepare("INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type, notes, created_by) VALUES (?, 'Wikipedia', ?, 'open_data', 'Added by the verification audit', ?)").run(r.id, r.evidence.wikipedia, actor.id).lastInsertRowid));
      }
      if (r.evidence.website && !db.prepare('SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ? AND source_url = ?').get(r.id, r.evidence.website)) {
        row.insertedSourceIds.push(Number(db.prepare("INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type, notes, created_by) VALUES (?, 'Official website (per Wikidata P856)', ?, 'official_website', 'Added by the verification audit', ?)").run(r.id, r.evidence.website, actor.id).lastInsertRowid));
      }
      if (r.evidence.osm && !db.prepare('SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ? AND source_url = ?').get(r.id, r.evidence.osm)) {
        row.insertedSourceIds.push(Number(db.prepare("INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type, notes, created_by) VALUES (?, 'OpenStreetMap', ?, 'open_data', ?, ?)").run(r.id, r.evidence.osm, `Sikh place of worship mapped ${r.evidence.osmDistanceM} m from the Wikidata location (© OpenStreetMap contributors, ODbL). Added by the verification audit`, actor.id).lastInsertRowid));
      }
      if (r.evidence.photo && !db.prepare('SELECT 1 FROM gurdwara_sources WHERE gurdwara_id = ? AND source_url = ?').get(r.id, r.evidence.photo)) {
        row.insertedSourceIds.push(Number(db.prepare("INSERT INTO gurdwara_sources (gurdwara_id, source_name, source_url, source_type, notes, created_by) VALUES (?, 'Wikimedia Commons photograph', ?, 'open_data', ?, ?)").run(r.id, r.evidence.photo, `Photo of the Gurdwara whose camera geotag is ${r.evidence.photoDistanceM} m from the Wikidata location. Added by the verification audit`, actor.id).lastInsertRowid));
      }
      db.prepare("UPDATE gurdwaras SET verification_status = 'verified', verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(actor.id, now, actor.id, now, r.id);
      const note = `Evidence audit: ${r.evidence.wikidata} is a gurdwara (P31 Q337986), the name matches, location within ${r.evidence.distanceKm} km; corroborated by ${[r.evidence.wikipedia, r.evidence.website && !r.evidence.websiteDead ? r.evidence.website : '', r.evidence.osm ? `OpenStreetMap listing ${r.evidence.osm} (${r.evidence.osmDistanceM} m away)` : '', r.evidence.photo ? `Commons photograph ${r.evidence.photo} taken ${r.evidence.photoDistanceM} m away` : ''].filter(Boolean).join(' and ')}.`;
      row.insertedLogIds.push(Number(db.prepare("INSERT INTO gurdwara_verification (gurdwara_id, action, note, actor_id) VALUES (?, 'verified', ?, ?)").run(r.id, note, actor.id).lastInsertRowid));
      db.prepare('UPDATE gurdwara_sources SET verified_at = COALESCE(verified_at, ?) WHERE gurdwara_id = ?').run(now, r.id);
      backup.rows.push(row);
    }
    db.prepare('INSERT INTO moderation_log (actor_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)').run(actor.id, 'gurdwara.verify_audit', 'gurdwara', null, `${ok.length} verified by evidence audit; backup ${path.basename(file)}`);
  });
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`[audit] applied: ${ok.length} records verified by ${actor.name}. Backup / rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[audit] failed:', err.message); process.exit(1); });
