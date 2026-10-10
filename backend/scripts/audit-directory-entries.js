/* ==========================================================================
   Directory entries — evidence check for records whose main claim is that a
   service exists at a link: apps (store listing), websites (the site itself)
   and organizations (their official website).

   An entry of those types is marked VERIFIED only when its own link and every
   reference link answer (HTTP 2xx after redirects). Personalities, heritage
   sites, books and every other type make factual claims (dates, history,
   authorship) that need a person to read the sources: they are reported, not
   verified. Publication is never changed.

     node backend/scripts/audit-directory-entries.js                       dry run
     node backend/scripts/audit-directory-entries.js --apply --actor <master-admin email>
     node backend/scripts/audit-directory-entries.js --rollback backend/backups/<file>.json
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction, parseJson } from '../src/db/database.js';

const LINK_TYPES = { app: 'store_url', website: 'url', organization: 'website' };
const UA = 'Mozilla/5.0 (compatible; SikhifyDirectoryAudit/1.0; +https://sikhify.in)';
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (n) => process.argv.includes('--' + n);

async function responds(url) {
  for (const method of ['HEAD', 'GET']) {
    const ok = await fetch(url, { method, redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) }).then((r) => r.ok).catch(() => false);
    if (ok) return true;
  }
  return false;
}

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[entries] database: ${describeDatabase(config).label}`);
  if (arg('rollback')) {
    const b = JSON.parse(fs.readFileSync(path.resolve(arg('rollback')), 'utf8'));
    transaction(db, () => { for (const r of b.rows) db.prepare('UPDATE entries SET verification_status = ?, last_verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(r.verification_status, r.last_verified_at, r.updated_by, r.updated_at, r.id); });
    console.log(`[entries] rolled back ${b.rows.length} entries`);
    return;
  }
  const rows = db.prepare("SELECT * FROM entries WHERE verification_status IN ('pending','needs_review') ORDER BY type, id").all();
  const ok = [];
  const manual = {};
  const failed = [];
  for (const e of rows) {
    const field = LINK_TYPES[e.type];
    if (!field) { manual[e.type] = (manual[e.type] || 0) + 1; continue; }
    const data = parseJson(e.data, {});
    const links = [...new Set([data[field], ...parseJson(e.references_json, []).map((r) => r.url)].filter((u) => /^https?:\/\//.test(u || '')))];
    if (!links.length) { failed.push({ id: e.id, title: e.title, why: 'no link to check' }); continue; }
    const dead = [];
    for (const u of links) if (!(await responds(u))) dead.push(u);
    if (dead.length) failed.push({ id: e.id, title: e.title, why: 'link did not respond: ' + dead.join(', ') });
    else ok.push({ ...e, links });
  }
  console.log(`[entries] pending: ${rows.length}`);
  console.log(`[entries] link-checked and verifiable (${Object.keys(LINK_TYPES).join(', ')}): ${ok.length}`);
  for (const f of failed) console.log(`         stays pending: #${f.id} ${f.title} — ${f.why}`);
  for (const [t, n] of Object.entries(manual)) console.log(`         needs a person to check the facts (${t}): ${n}`);
  if (!flag('apply')) { console.log('[entries] dry run — nothing was changed.'); return; }
  const actor = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND role = 'admin' AND status = 'active'").get(String(arg('actor') || ''));
  if (!actor) throw new Error('--apply needs --actor <email of an active Master Admin>');
  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `entries-verification-${now.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify({ appliedAt: now, rows: ok.map((e) => ({ id: e.id, verification_status: e.verification_status, last_verified_at: e.last_verified_at, updated_by: e.updated_by, updated_at: e.updated_at })) }, null, 2));
  transaction(db, () => {
    for (const e of ok) {
      db.prepare("UPDATE entries SET verification_status = 'verified', last_verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(now, actor.id, now, e.id);
      db.prepare('INSERT INTO moderation_log (actor_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)').run(actor.id, 'entry.verify.verified', 'entry', e.id, `Link check: ${e.links.join(' , ')} answered`.slice(0, 1000));
    }
  });
  console.log(`[entries] applied: ${ok.length} verified. Rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[entries] failed:', err.message); process.exit(1); });
