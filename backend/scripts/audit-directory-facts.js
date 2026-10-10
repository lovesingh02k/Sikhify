/* ==========================================================================
   Directory entries — fact check against the Wikipedia article each entry
   cites (personalities, heritage sites, books, and organizations/websites
   whose own site could not be checked automatically).

   For every pending entry with a Wikipedia reference, the article's text is
   fetched and the entry's key facts must ALL appear in it:
     personality   birth and death years
     book          title, author's surname, publication year
     heritage      town/city, and the years named in its history ("period")
     organization  city, founding year
     website       its name
   Only then is the entry marked VERIFIED, with the matched facts in the log.
   Any fact not found → stays pending, listed in the report for a person.
   Publication is never changed.

     node backend/scripts/audit-directory-facts.js                     dry run
     node backend/scripts/audit-directory-facts.js --apply --actor <master-admin email>
     node backend/scripts/audit-directory-facts.js --rollback backend/backups/<file>.json
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction, parseJson } from '../src/db/database.js';

const UA = 'SikhifyDirectoryAudit/1.0 (https://sikhify.in; fact check of directory entries)';
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (n) => process.argv.includes('--' + n);
const years = (s) => [...new Set(String(s || '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [])];
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** The facts to check for one entry: [label, text that must appear]. */
export function factsFor(e, data) {
  const f = [];
  if (e.type === 'personality') {
    for (const y of years(data.born)) f.push(['born', y]);
    for (const y of years(data.died)) f.push(['died', y]);
  } else if (e.type === 'book') {
    f.push(['title', e.title.replace(/\s*\(.*\)\s*$/, '')]);
    // First author without "(editor)" etc.; a common surname (Singh, Kaur) proves nothing, so the full name is used.
    const first = String(data.authors || '').split(/[,;&]| and /)[0].replace(/\(.*?\)/g, '').trim();
    const surname = first.split(/\s+/).pop();
    if (first) f.push(['author', /^(singh|kaur)$/i.test(surname) ? first : surname]);
    for (const y of years(data.year)) f.push(['year', y]);
  } else if (e.type === 'heritage') {
    if (e.city || data.city) f.push(['place', e.city || data.city]);
    for (const y of years(data.period)) f.push(['year', y]);
  } else if (e.type === 'organization') {
    if (e.city || data.city) f.push(['city', e.city || data.city]);
    for (const y of years(data.founded)) f.push(['founded', y]);
  } else if (e.type === 'website') {
    f.push(['name', e.title]);
  }
  return f;
}

async function articleText(url) {
  const m = /^https:\/\/([a-z-]+)\.wikipedia\.org\/wiki\/(.+)$/.exec(url);
  if (!m) return null;
  const api = `https://${m[1]}.wikipedia.org/w/api.php?` + new URLSearchParams({ action: 'query', format: 'json', prop: 'extracts', explaintext: '1', redirects: '1', titles: decodeURIComponent(m[2]).replace(/_/g, ' ') });
  const j = await (await fetch(api, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })).json();
  const page = Object.values((j.query && j.query.pages) || {})[0];
  return page && page.extract ? page.extract : null;
}

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[facts] database: ${describeDatabase(config).label}`);
  if (arg('rollback')) {
    const b = JSON.parse(fs.readFileSync(path.resolve(arg('rollback')), 'utf8'));
    transaction(db, () => { for (const r of b.rows) db.prepare('UPDATE entries SET verification_status = ?, last_verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(r.verification_status, r.last_verified_at, r.updated_by, r.updated_at, r.id); });
    console.log(`[facts] rolled back ${b.rows.length} entries`);
    return;
  }
  const rows = db.prepare("SELECT * FROM entries WHERE verification_status IN ('pending','needs_review') ORDER BY type, id").all();
  const ok = []; const pending = [];
  for (const e of rows) {
    const data = parseJson(e.data, {});
    const wp = parseJson(e.references_json, []).map((r) => r.url).find((u) => /^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\//.test(u || ''));
    const facts = factsFor(e, data);
    if (!wp) { pending.push({ e, why: 'no Wikipedia reference to check against' }); continue; }
    if (!facts.length) { pending.push({ e, why: 'no checkable facts recorded' }); continue; }
    let text = null;
    try { text = await articleText(wp); } catch { /* network */ }
    if (!text) { pending.push({ e, why: 'the cited article could not be read' }); continue; }
    const hay = ' ' + norm(text) + ' ';
    const missing = facts.filter(([, v]) => !hay.includes(' ' + norm(v) + ' '));
    if (missing.length) pending.push({ e, why: 'not found in the cited article: ' + missing.map(([l, v]) => `${l} "${v}"`).join(', ') });
    else ok.push({ e, wp, facts });
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`[facts] pending entries: ${rows.length}`);
  console.log(`[facts] every fact found in the cited article → verify: ${ok.length}`);
  for (const x of ok) console.log(`         ✓ #${x.e.id} ${x.e.title} — ${x.facts.map(([l, v]) => `${l} ${v}`).join(', ')}`);
  for (const p of pending) console.log(`         stays pending: #${p.e.id} ${p.e.title} — ${p.why}`);
  if (!flag('apply')) { console.log('[facts] dry run — nothing was changed.'); return; }
  const actor = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND role = 'admin' AND status = 'active'").get(String(arg('actor') || ''));
  if (!actor) throw new Error('--apply needs --actor <email of an active Master Admin>');
  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `entries-facts-${now.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify({ appliedAt: now, rows: ok.map(({ e }) => ({ id: e.id, verification_status: e.verification_status, last_verified_at: e.last_verified_at, updated_by: e.updated_by, updated_at: e.updated_at })) }, null, 2));
  transaction(db, () => {
    for (const { e, wp, facts } of ok) {
      db.prepare("UPDATE entries SET verification_status = 'verified', last_verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?").run(now, actor.id, now, e.id);
      db.prepare('INSERT INTO moderation_log (actor_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)')
        .run(actor.id, 'entry.verify.verified', 'entry', e.id, `Fact check against ${wp}: ${facts.map(([l, v]) => `${l} ${v}`).join(', ')} — all found`.slice(0, 1000));
    }
  });
  console.log(`[facts] applied: ${ok.length} verified. Rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[facts] failed:', err.message); process.exit(1); });
