/* ==========================================================================
   Sikh Festivals & Important Days — verify dates against the SGPC calendar.

   Source: the official SGPC Nanakshahi Calendar 558 (Chet 2026 – Phagun 2027),
   https://sgpc.net/storage/2026/03/Calender_2026-1.pdf. Each date below was read
   from that PDF (the Nanakshahi day, and the Gregorian date printed in its cell).

   For each observance listed in SGPC_DATES:
     - an existing date row on that day is marked VERIFIED with the source;
     - a missing one is added as VERIFIED;
     - other unverified date rows are left alone (their notes say why).
   An observance in draft is then PUBLISHED only when it has an upcoming verified
   date and passes the same publish rules as the admin editor (lib/observances.js).
   Anything not in SGPC_DATES (e.g. the Nanakshahi new year 2027, which falls in
   calendar 559, not yet published) is not touched.

     node backend/scripts/verify-observances-sgpc.js                              dry run
     node backend/scripts/verify-observances-sgpc.js --apply --actor <master-admin email>
     node backend/scripts/verify-observances-sgpc.js --rollback backend/backups/<file>.json
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction } from '../src/db/database.js';
import { observanceShape, publishErrors } from '../src/lib/observances.js';

const SOURCE_NAME = 'SGPC Nanakshahi Calendar 558 (2026–27)';
const SOURCE_URL = 'https://sgpc.net/storage/2026/03/Calender_2026-1.pdf';

/** slug → [Gregorian date, Nanakshahi date as printed by SGPC] */
export const SGPC_DATES = {
  'parkash-purab-guru-nanak-dev-ji': ['2026-11-24', '9 Maghar'],
  'parkash-purab-guru-ram-das-ji': ['2026-10-27', '11 Katak'],
  'parkash-purab-guru-hargobind-sahib-ji': ['2026-06-30', '16 Harh'],
  'parkash-purab-guru-har-rai-ji': ['2027-02-19', '7 Phagun'],
  'parkash-purab-guru-gobind-singh-ji': ['2027-01-15', '2 Magh'],
  'gurgaddi-divas-sri-guru-granth-sahib-ji': ['2026-11-11', '26 Katak'],
  'shaheedi-purab-guru-tegh-bahadur-ji': ['2026-12-14', '29 Maghar'],
  'shaheedi-bhai-mati-das-bhai-sati-das-bhai-dyala-ji': ['2026-12-13', '28 Maghar'],
  'shaheedi-vadde-sahibzade': ['2026-12-23', '8 Poh'],
  'shaheedi-chhote-sahibzade-mata-gujri-ji': ['2026-12-28', '13 Poh'],
  'shaheedi-baba-deep-singh-ji': ['2026-11-15', '30 Katak'],
  'shaheedi-bhai-mani-singh-ji': ['2026-07-09', '25 Harh'],
  'bandi-chhor-divas': ['2026-11-08', '23 Katak'],
  'maghi-sri-muktsar-sahib': ['2027-01-14', '1 Magh'],
  'saka-nankana-sahib': ['2027-02-21', '9 Phagun'],
};

const arg = (n) => { const i = process.argv.indexOf('--' + n); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (n) => process.argv.includes('--' + n);

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[sgpc] database: ${describeDatabase(config).label}`);

  if (arg('rollback')) {
    const b = JSON.parse(fs.readFileSync(path.resolve(arg('rollback')), 'utf8'));
    transaction(db, () => {
      for (const id of b.insertedDateIds) db.prepare('DELETE FROM observance_dates WHERE id = ?').run(id);
      for (const r of b.dates) db.prepare('UPDATE observance_dates SET verification = ?, source_name = ?, source_url = ?, notes = ?, verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?')
        .run(r.verification, r.source_name, r.source_url, r.notes, r.verified_by, r.verified_at, r.updated_at, r.id);
      for (const r of b.observances) db.prepare('UPDATE observances SET status = ?, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(r.status, r.published_at, r.updated_by, r.updated_at, r.id);
    });
    console.log(`[sgpc] rolled back ${b.dates.length} date rows, ${b.insertedDateIds.length} added rows, ${b.observances.length} observances`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const plan = [];
  for (const [slug, [date, nanakshahi]] of Object.entries(SGPC_DATES)) {
    const o = db.prepare('SELECT * FROM observances WHERE slug = ?').get(slug);
    if (!o) { console.log(`[sgpc] not in the database, skipped: ${slug}`); continue; }
    const rows = db.prepare('SELECT * FROM observance_dates WHERE observance_id = ?').all(o.id);
    const row = rows.find((r) => r.start_date === date);
    const action = !row ? 'add' : row.verification === 'verified' ? 'already verified' : 'verify';
    const others = rows.filter((r) => r.start_date !== date && r.verification !== 'verified');
    const shape = observanceShape(o, []);
    const upcoming = date >= today || rows.some((r) => r.verification === 'verified' && r.end_date >= today);
    const blockers = publishErrors(shape, rows.length + (row ? 0 : 1));
    const publish = o.status === 'draft' && upcoming && !Object.keys(blockers).length;
    plan.push({ o, row, date, nanakshahi, action, others, publish, upcoming, blockers });
  }

  for (const p of plan) {
    console.log(`[sgpc] ${p.o.slug}: ${p.date} (${p.nanakshahi}) → ${p.action}` +
      (p.others.length ? `; other unverified date(s) left as they are: ${p.others.map((r) => r.start_date).join(', ')}` : '') +
      (p.publish ? '; publish' : p.o.status === 'published' ? '; already published' : !p.upcoming ? '; stays draft (date has passed — needs the next calendar)' : `; stays draft (${Object.values(p.blockers).join('; ')})`));
  }
  const toChange = plan.filter((p) => p.action !== 'already verified' || p.publish);
  console.log(`[sgpc] dates to verify/add: ${plan.filter((p) => p.action !== 'already verified').length}; observances to publish: ${plan.filter((p) => p.publish).length}`);
  if (!flag('apply')) { console.log('[sgpc] dry run — nothing was changed.'); return; }
  const actor = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND role = 'admin' AND status = 'active'").get(String(arg('actor') || ''));
  if (!actor) throw new Error('--apply needs --actor <email of an active Master Admin>');
  if (!toChange.length) { console.log('[sgpc] nothing to apply'); return; }

  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `observances-sgpc-${now.replace(/[:.]/g, '-')}.json`);
  const backup = {
    appliedAt: now, database: describeDatabase(config).label, insertedDateIds: [],
    dates: plan.filter((p) => p.action === 'verify').map((p) => p.row),
    observances: plan.filter((p) => p.publish).map(({ o }) => ({ id: o.id, status: o.status, published_at: o.published_at, updated_by: o.updated_by, updated_at: o.updated_at })),
  };
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  transaction(db, () => {
    for (const p of plan) {
      const notes = `${p.nanakshahi} in the SGPC Nanakshahi Calendar 558 (checked ${today}).`;
      if (p.action === 'verify') {
        db.prepare("UPDATE observance_dates SET verification = 'verified', source_name = ?, source_url = ?, notes = ?, verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?")
          .run(SOURCE_NAME, SOURCE_URL, notes, actor.id, now, now, p.row.id);
      } else if (p.action === 'add') {
        backup.insertedDateIds.push(Number(db.prepare(`INSERT INTO observance_dates (observance_id, start_date, end_date, verification, source_name, source_url, notes, verified_by, verified_at)
          VALUES (?, ?, ?, 'verified', ?, ?, ?, ?, ?)`).run(p.o.id, p.date, p.date, SOURCE_NAME, SOURCE_URL, notes, actor.id, now).lastInsertRowid));
      }
      for (const r of p.others) {
        if (!backup.dates.some((d) => d.id === r.id)) backup.dates.push(r);
        const note = `Not confirmed: the SGPC Nanakshahi Calendar 558 gives ${p.date} (${p.nanakshahi}) for this observance.`;
        db.prepare('UPDATE observance_dates SET notes = ?, updated_at = ? WHERE id = ?').run(note, now, r.id);
      }
      if (p.publish) {
        db.prepare("UPDATE observances SET status = 'published', published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(now, actor.id, now, p.o.id);
        db.prepare('INSERT INTO moderation_log (actor_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)').run(actor.id, 'festival.publish', 'observance', p.o.id, `${p.o.title} — date verified against ${SOURCE_NAME}`);
      }
    }
  });
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`[sgpc] applied. Rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[sgpc] failed:', err.message); process.exit(1); });
