/* ==========================================================================
   Gurbani media (Kirtan & Katha) — curation for shorter listening sessions.

   Reference for the intended experience: "Japji Sahib Full Live Path — Bhai
   Manpreet Singh Ji Kanpuri" (youtu.be/SC1gipmk214), 19 min 16 s on YouTube.

   What this does (dry run unless --apply):
   1. Checks every video on YouTube: still available, still embeddable, and
      its real length. Lengths are stored (media_videos.duration_seconds) so
      the site can show them. Unavailable videos are only REPORTED — an admin
      decides what to do; nothing is removed automatically.
   2. Replaces the clips listed in REPLACEMENTS (14–60 second excerpts that
      are not a listening session) with full recordings by the SAME artist,
      each checked on YouTube when this list was written (title, channel,
      length, embeddable). The script re-checks them before applying. The
      original rows are ARCHIVED, not deleted (--rollback restores them).
   3. Orders each artist's videos so sessions of 5–40 minutes come first
      (closest to the reference length first), then longer recordings — no
      long recording is removed; visitors can still play every one.

   Usage (repository root; database from backend/.env):
     node backend/scripts/curate-media.js                 dry run: report only
     node backend/scripts/curate-media.js --apply         check, store lengths, replace clips, re-order
     node backend/scripts/curate-media.js --rollback backend/backups/<file>.json
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction } from '../src/db/database.js';

export const REFERENCE = { id: 'SC1gipmk214', seconds: 1156 };
const SESSION = { min: 5 * 60, max: 40 * 60 };

/* Checked on YouTube on 2026-10-09 (oEmbed title/channel + watch-page length and embeddability). */
export const REPLACEMENTS = [
  { old: 'PD4klxCJ3AE', artist: 'dr-gurnam-singh', reason: '60-second clip', new: { id: 'YsLpPZn6KPg', title: 'Sang Chalat Hai — A Tribute to Bhai Nirmal Singh Ji Khalsa', channel: 'Dr. Gurnam Singh', seconds: 851 } },
  { old: 'AX6LF3ceD-4', artist: 'dr-gurnam-singh', reason: '59-second clip', new: { id: 'rP3kG1wvsUg', title: 'Kahau Kahaa Apni Adhmaee — Raag Todi', channel: 'Gurmat Sangeet Chair Punjabi University Patiala', seconds: 884 } },
  { old: 'iPkn6rtS7kM', artist: 'bhai-onkar-singh-una-wale', reason: '14-second clip (the same channel has the full recording)', new: { id: 'ytDNIGU6qxU', title: 'Gur Ki Murat Man Mein Dhyan — Live Kirtan, Sri Darbar Sahib', channel: 'Sarbat Studio', seconds: 720 } },
  { old: 'nSFPMe04X1M', artist: 'bhai-onkar-singh-una-wale', reason: '27-second clip', new: { id: 'e6k4yYRbZ4s', title: 'Ram Simar Ram Simar', channel: 'Bhai Onkar Singh Una Wale - Topic', seconds: 677 } },
  { old: 'ixReooIwmic', artist: 'bhai-satvinder-singh-harvinder-singh', reason: '60-second clip', new: { id: 'sait64aC5PI', title: 'Doe Kar Jod Kari Benanti', channel: 'Bhai Satwinder Singh (Delhi Wale) | Bhai Harwinder Singh (Delhi Wale) - Topic', seconds: 687 } },
  { old: 'VotV2AbdieA', artist: 'dhadi-tarsem-singh-moranwali', reason: '22-second sarangi clip', new: { id: 'BjTa2AxQ_5o', title: 'Baba Deep Singh Ji Da Prann — Dhadi Vaar', channel: 'RS GURBANI', seconds: 1404 } },
];

const arg = (n) => { const i = process.argv.indexOf('--' + n); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (n) => process.argv.includes('--' + n);
const mmss = (s) => (s == null ? '?' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

/** Live check of one video on YouTube. */
export async function checkVideo(id) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { 'User-Agent': 'Mozilla/5.0 (SikhifyMediaCheck)', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    const g = (re) => (re.exec(html) || [])[1];
    const status = g(/"playabilityStatus":\{"status":"([A-Z_]+)"/) || 'UNKNOWN';
    return { ok: status === 'OK', status, seconds: Number(g(/"lengthSeconds":"(\d+)"/)) || null, embeddable: g(/"playableInEmbed":(true|false)/) === 'true' };
  } catch (err) {
    return { ok: false, status: 'CHECK_FAILED', seconds: null, embeddable: null };
  }
}

/** Sort key: listening sessions (5–40 min) first, closest to the reference length first; then longer, then unknown. */
export function sessionRank(seconds) {
  if (!seconds) return 3e6;
  if (seconds >= SESSION.min && seconds <= SESSION.max) return Math.abs(seconds - REFERENCE.seconds);
  return seconds > SESSION.max ? 1e6 + seconds : 2e6 - seconds;
}

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[media] database: ${describeDatabase(config).label}`);

  if (arg('rollback')) {
    const b = JSON.parse(fs.readFileSync(path.resolve(arg('rollback')), 'utf8'));
    transaction(db, () => {
      for (const v of b.videos) db.prepare('UPDATE media_videos SET status = ?, sort = ?, duration_seconds = ?, checked_at = ? WHERE id = ?').run(v.status, v.sort, v.duration_seconds, v.checked_at, v.id);
      for (const id of b.inserted) db.prepare('DELETE FROM media_videos WHERE id = ?').run(id);
    });
    console.log(`[media] rolled back ${b.videos.length} videos, removed ${b.inserted.length} added videos`);
    return;
  }

  const videos = db.prepare(`SELECT v.*, a.name AS artist_name FROM media_videos v JOIN media_artists a ON a.id = v.artist_id ORDER BY a.sort_name, v.sort`).all();
  console.log(`[media] checking ${videos.length} videos on YouTube…`);
  const checks = {};
  for (const v of videos) { checks[v.id] = await checkVideo(v.id); await new Promise((r) => setTimeout(r, 200)); }
  const problems = videos.filter((v) => !checks[v.id].ok || checks[v.id].embeddable === false);
  const long = videos.filter((v) => v.status === 'published' && checks[v.id].seconds > SESSION.max);
  const clips = videos.filter((v) => v.status === 'published' && checks[v.id].seconds && checks[v.id].seconds < 120);
  console.log(`[media] unavailable or not embeddable: ${problems.length}`);
  for (const v of problems) console.log(`         ${v.id} ${checks[v.id].status} embeddable=${checks[v.id].embeddable}  ${v.artist_name} — ${v.title}`);
  console.log(`[media] longer than 40 min (kept, listed after shorter sessions): ${long.length}`);
  console.log(`[media] clips under 2 min: ${clips.length}`);

  const plan = [];
  for (const r of REPLACEMENTS) {
    const old = videos.find((v) => v.id === r.old);
    if (!old || old.status !== 'published') { console.log(`[media] skip ${r.old}: not a published video here`); continue; }
    if (videos.some((v) => v.id === r.new.id)) { console.log(`[media] skip ${r.old}: ${r.new.id} is already in the catalogue`); continue; }
    const chk = await checkVideo(r.new.id);
    if (!chk.ok || !chk.embeddable) { console.log(`[media] skip ${r.old}: replacement ${r.new.id} is not available now (${chk.status})`); continue; }
    plan.push({ ...r, old: old, check: chk });
    console.log(`[media] replace ${r.old} (${mmss(checks[r.old].seconds)}, ${r.reason}) → ${r.new.id} "${r.new.title}" [${r.new.channel}] ${mmss(chk.seconds)}`);
  }

  if (!flag('apply')) { console.log('[media] dry run — nothing was changed. Re-run with --apply.'); return; }
  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `media-curation-${now.replace(/[:.]/g, '-')}.json`);
  const backup = { appliedAt: now, videos: videos.map((v) => ({ id: v.id, status: v.status, sort: v.sort, duration_seconds: v.duration_seconds, checked_at: v.checked_at })), inserted: [] };
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  transaction(db, () => {
    for (const v of videos) if (checks[v.id].seconds) db.prepare('UPDATE media_videos SET duration_seconds = ?, checked_at = ? WHERE id = ?').run(checks[v.id].seconds, now, v.id);
    for (const p of plan) {
      db.prepare("UPDATE media_videos SET status = 'archived', updated_at = ? WHERE id = ?").run(now, p.old.id);
      db.prepare("INSERT INTO media_videos (id, artist_id, title, channel, description, sort, status, duration_seconds, checked_at) VALUES (?, ?, ?, ?, '', ?, 'published', ?, ?)")
        .run(p.new.id, p.old.artist_id, p.new.title, p.new.channel, p.old.sort, p.check.seconds, now);
      backup.inserted.push(p.new.id);
    }
    for (const a of db.prepare('SELECT DISTINCT artist_id FROM media_videos').all()) {
      const list = db.prepare('SELECT id, duration_seconds, sort FROM media_videos WHERE artist_id = ? ORDER BY sort, created_at').all(a.artist_id);
      list.map((v, i) => ({ ...v, i })).sort((x, y) => sessionRank(x.duration_seconds) - sessionRank(y.duration_seconds) || x.i - y.i)
        .forEach((v, i) => db.prepare('UPDATE media_videos SET sort = ? WHERE id = ?').run(i, v.id));
    }
  });
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`[media] applied: lengths stored, ${plan.length} clips replaced (originals archived), artists re-ordered. Rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[media] failed:', err.message); process.exit(1); });
