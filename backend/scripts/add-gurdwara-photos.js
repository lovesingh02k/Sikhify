/* ==========================================================================
   Gurdwara photos from Wikimedia Commons — real, freely licensed photographs
   of that very Gurdwara; never a photo of a different place, never a generated
   image. For each listed record without a photo, sources are tried in order:

     1. wikidata   the image Wikidata records for the Gurdwara's own item (P18);
     2. category   a photo in the Gurdwara's own Commons category (P373);
     3. wikipedia  the lead photo of the Gurdwara's Wikipedia article (a sitelink
                   of its Wikidata item) — only if the file name says it is a
                   Gurdwara or names this Gurdwara;
     4. nearby     a Commons photo geotagged within 100 m of the record's map
                   location whose FILE NAME says it is a Gurdwara or
                   names this Gurdwara (not just its town) (works for records that are
                   not on Wikidata too).

   Every candidate must be a JPEG/PNG/WebP photo (no maps, logos, flags or
   diagrams), under a free licence (Creative Commons, public domain, CC0, GFDL),
   and its 1280 px and 500 px renditions must answer with an image before use.
   The credit, licence and Commons file page are stored with the photo (shown
   on the record page). Records with no usable photo keep the Khanda placeholder.
   Every existing photo URL is also checked; broken ones are reported.

   Usage (repository root; database from backend/.env):
     node backend/scripts/add-gurdwara-photos.js                 dry run: report only
     node backend/scripts/add-gurdwara-photos.js --apply         add photos (one transaction; rollback file in backend/backups/)
     node backend/scripts/add-gurdwara-photos.js --rollback backend/backups/<file>.json
   Options: --report <file.json>, --skip-existing-check
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, BACKEND_ROOT } from '../src/config.js';
import { openDatabaseForConfig, describeDatabase, transaction } from '../src/db/database.js';
import { fetchWikidataEntities } from '../src/lib/gurdwaraEvidence.js';

const UA = 'SikhifyDirectoryPhotos/1.1 (https://sikhify.in; Gurdwara directory photos with attribution)';
const FREE = /^(cc[ -]|cc0|public domain|pd|gfdl|attribution)/i;
const NOT_A_PHOTO = /\b(map|locator|location|logo|flag|seal|emblem|diagram|plan|svg|icon|signature|coat of arms)\b/i;
// The FILE NAME must say it is a Gurdwara (a town called "…Sahib" or a description that merely mentions one nearby is not enough).
const GURDWARA_WORD = /gurd[uw]?w?a+ra|gurudwara|guru[ _-]?dwara|guru[ _-]?duara|ਗੁਰਦੁਆਰਾ|गुरुद्वारा|गुरूद्वारा/i;
const GENERIC = new Set(['gurdwara', 'gurudwara', 'sahib', 'sri', 'shri', 'singh', 'sabha', 'guru', 'nanak', 'darbar', 'the', 'and', 'ji', 'temple', 'sikh']);
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i !== -1 ? process.argv[i + 1] : undefined; };
const flag = (n) => process.argv.includes('--' + n);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
const fold = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Distinctive words of a Gurdwara's name (not "Gurdwara", "Sahib", "Singh"…, nor its city). */
const nameWords = (name, city) => { const c = new Set(fold(city).split(/[^a-z0-9]+/)); return fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !GENERIC.has(w) && !c.has(w)); };
/** Does the file name say it shows a Gurdwara, or name this Gurdwara? */
function namesThePlace(fileName, name, city) {
  const t = fold(fileName);
  return GURDWARA_WORD.test(fileName) || nameWords(name, city).some((w) => t.includes(w));
}

async function api(host, params) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', ...params }), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await pause(1500 * (attempt + 1));
  }
  return {};
}

async function isImage(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Range: 'bytes=0-2047' }, signal: AbortSignal.timeout(20000) });
    return (r.status === 200 || r.status === 206) && /^image\//.test(r.headers.get('content-type') || '');
  } catch { return false; }
}

async function commonsInfo(files) {
  const out = {};
  for (let i = 0; i < files.length; i += 40) {
    const j = await api('commons.wikimedia.org', { action: 'query', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1280', titles: files.slice(i, i + 40).map((f) => 'File:' + f).join('|') });
    const q = j.query || {};
    const norm = Object.fromEntries((q.normalized || []).map((n) => [n.to, n.from]));
    for (const p of Object.values(q.pages || {})) out[(norm[p.title] || p.title).replace(/^File:/, '')] = p.imageinfo ? p.imageinfo[0] : null;
    await pause(300);
  }
  return out;
}

/* ---------- candidate sources (each returns { [recordId]: [{ file, how, needsName }] }) */
async function categoryFiles(recs, entities) {
  const out = {};
  for (const r of recs) {
    const e = entities[r.qid];
    const v = e && e.claims && e.claims.P373 && e.claims.P373[0];
    const cat = v && v.mainsnak.datavalue && v.mainsnak.datavalue.value;
    if (!cat) continue;
    const j = await api('commons.wikimedia.org', { action: 'query', list: 'categorymembers', cmtitle: 'Category:' + cat, cmtype: 'file', cmlimit: '25' });
    out[r.id] = ((j.query && j.query.categorymembers) || []).map((m) => ({ file: m.title.replace(/^File:/, ''), how: 'category', needsName: false, ref: 'Category:' + cat }));
    await pause(200);
  }
  return out;
}

async function wikipediaLeadImages(recs, entities) {
  const out = {};
  const byWiki = {};
  for (const r of recs) {
    const e = entities[r.qid];
    for (const wiki of ['enwiki', 'pawiki', 'hiwiki']) {
      const sl = e && e.sitelinks && e.sitelinks[wiki];
      if (sl) { (byWiki[wiki] = byWiki[wiki] || []).push([r.id, sl.title]); }
    }
  }
  for (const [wiki, pairs] of Object.entries(byWiki)) {
    const host = `${wiki.replace('wiki', '')}.wikipedia.org`;
    for (let i = 0; i < pairs.length; i += 40) {
      const chunk = pairs.slice(i, i + 40);
      const j = await api(host, { action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1', titles: chunk.map((p) => p[1]).join('|') });
      const q = j.query || {};
      const alias = {};
      for (const n of [...(q.normalized || []), ...(q.redirects || [])]) alias[n.to] = alias[n.from] || n.from;
      for (const p of Object.values(q.pages || {})) {
        if (!p.pageimage) continue;
        const orig = alias[p.title] || p.title;
        for (const [id, title] of chunk) if (title === orig || title === p.title) (out[id] = out[id] || []).push({ file: p.pageimage, how: 'wikipedia', needsName: true, ref: `https://${host}/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}` });
      }
      await pause(300);
    }
  }
  return out;
}

async function nearbyFiles(recs) {
  const out = {};
  for (const r of recs) {
    if (r.latitude === null || r.longitude === null) continue;
    const j = await api('commons.wikimedia.org', { action: 'query', list: 'geosearch', gscoord: `${r.latitude}|${r.longitude}`, gsradius: '100', gsnamespace: '6', gslimit: '30' });
    out[r.id] = ((j.query && j.query.geosearch) || []).sort((a, b) => a.dist - b.dist)
      .map((g) => ({ file: g.title.replace(/^File:/, ''), how: 'nearby', needsName: true, distM: Math.round(g.dist) }));
    await pause(200);
  }
  return out;
}

async function main() {
  const config = loadConfig();
  const db = await openDatabaseForConfig(config);
  console.log(`[photos] database: ${describeDatabase(config).label}`);

  if (arg('rollback')) {
    const b = JSON.parse(fs.readFileSync(path.resolve(arg('rollback')), 'utf8'));
    transaction(db, () => { for (const id of b.insertedImageIds) db.prepare('DELETE FROM gurdwara_images WHERE id = ?').run(id); });
    console.log(`[photos] rolled back: ${b.insertedImageIds.length} photos removed`);
    return;
  }

  // 1. Existing photos: do their URLs still work?
  if (!flag('skip-existing-check')) {
    const existing = db.prepare('SELECT id, gurdwara_id, url, thumb_url FROM gurdwara_images').all();
    const broken = [];
    for (const im of existing) if (!(await isImage(im.url)) || (im.thumb_url && !(await isImage(im.thumb_url)))) broken.push(im);
    console.log(`[photos] existing photos checked: ${existing.length}, broken: ${broken.length}`);
    for (const b of broken) console.log(`         broken: image #${b.id} (record ${b.gurdwara_id}) ${b.url}`);
  }

  // 2. Records without a photo, and their candidate files from every source.
  const recs = db.prepare(`SELECT g.id, g.name, g.external_ref, g.latitude, g.longitude, ci.name AS city FROM gurdwaras g JOIN cities ci ON ci.id = g.city_id
    WHERE g.archived_at IS NULL AND NOT EXISTS (SELECT 1 FROM gurdwara_images i WHERE i.gurdwara_id = g.id) ORDER BY g.id`).all()
    .map((r) => ({ ...r, qid: /^wikidata:Q\d+$/.test(r.external_ref || '') ? r.external_ref.slice(9) : null }));
  const wd = recs.filter((r) => r.qid);
  console.log(`[photos] records without a photo: ${recs.length} (${wd.length} on Wikidata, ${recs.filter((r) => r.latitude !== null).length} with map coordinates)`);
  const entities = wd.length ? await fetchWikidataEntities(wd.map((r) => r.qid)) : {};
  const cands = Object.fromEntries(recs.map((r) => [r.id, []]));
  for (const r of wd) {
    const e = entities[r.qid];
    const v = e && e.claims && e.claims.P18 && e.claims.P18.find((c) => c.rank !== 'deprecated');
    if (v && v.mainsnak.datavalue) cands[r.id].push({ file: v.mainsnak.datavalue.value, how: 'wikidata', needsName: false });
  }
  console.log('[photos] looking in Commons categories…');
  for (const [id, list] of Object.entries(await categoryFiles(wd, entities))) cands[id].push(...list);
  console.log('[photos] looking at Wikipedia lead images…');
  for (const [id, list] of Object.entries(await wikipediaLeadImages(wd, entities))) cands[id].push(...list);
  console.log('[photos] looking for geotagged Commons photos nearby…');
  for (const [id, list] of Object.entries(await nearbyFiles(recs))) cands[id].push(...list);

  const info = await commonsInfo([...new Set(Object.values(cands).flat().map((c) => c.file))]);
  const plan = [];
  const none = [];
  const used = new Set(db.prepare('SELECT source_url FROM gurdwara_images WHERE source_url IS NOT NULL').all().map((x) => x.source_url));
  for (const r of recs) {
    let pick = null;
    for (const c of cands[r.id]) {
      const ii = info[c.file];
      if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime || '')) continue;
      if (NOT_A_PHOTO.test(c.file)) continue;
      if ((ii.width || 0) < 400 || (ii.height || 0) < 300) continue;
      const m = ii.extmetadata || {};
      const license = strip(m.LicenseShortName && m.LicenseShortName.value);
      if (!FREE.test(license)) continue;
      const desc = strip(m.ImageDescription && m.ImageDescription.value);
      if (c.needsName && !namesThePlace(c.file, r.name, r.city)) continue;
      if (c.how === 'nearby' && !GURDWARA_WORD.test(c.file)) continue; // nearby: the file name itself must say Gurdwara
      if (used.has(ii.descriptionurl)) continue; // one photo is never reused for two Gurdwaras
      const big = ii.thumburl || ii.url;
      const thumb = ii.thumburl ? ii.thumburl.replace(/\/\d+px-/, '/500px-') : ii.url;
      if (!(await isImage(big)) || !(await isImage(thumb))) continue;
      const alt = (desc.length >= 12 && desc.length <= 200 ? desc : `${r.name}, ${r.city}`).slice(0, 300);
      const credit = (strip(m.Artist && m.Artist.value) || strip(m.Credit && m.Credit.value) || 'Wikimedia Commons contributor').slice(0, 300);
      pick = { gurdwaraId: r.id, name: r.name, how: c.how, distM: c.distM, url: big, thumbUrl: thumb, width: ii.thumbwidth || ii.width, height: ii.thumbheight || ii.height, alt, credit, license, sourceUrl: ii.descriptionurl };
      break;
    }
    if (pick) { plan.push(pick); used.add(pick.sourceUrl); } else none.push(r);
  }
  const byHow = plan.reduce((o, p) => ({ ...o, [p.how]: (o[p.how] || 0) + 1 }), {});
  console.log(`[photos] photos to add: ${plan.length} — ${Object.entries(byHow).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
  console.log(`[photos] no usable free photo found (placeholder stays): ${none.length}`);
  if (arg('report')) fs.writeFileSync(arg('report'), JSON.stringify({ plan, none: none.map((r) => ({ id: r.id, name: r.name, city: r.city, candidates: cands[r.id].length })) }, null, 2));
  if (!flag('apply')) { console.log('[photos] dry run — nothing was changed. Re-run with --apply.'); return; }

  const now = new Date().toISOString();
  const dir = path.join(BACKEND_ROOT, 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `gurdwara-photos-${now.replace(/[:.]/g, '-')}.json`);
  const backup = { appliedAt: now, insertedImageIds: [] };
  transaction(db, () => {
    for (const p of plan) {
      if (db.prepare('SELECT 1 FROM gurdwara_images WHERE gurdwara_id = ?').get(p.gurdwaraId)) continue; // idempotent
      const id = Number(db.prepare(`INSERT INTO gurdwara_images (gurdwara_id, url, thumb_url, width, height, alt, credit, license, source_url, is_primary, sort)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`).run(p.gurdwaraId, p.url, p.thumbUrl, p.width, p.height, p.alt, p.credit, p.license, p.sourceUrl).lastInsertRowid);
      backup.insertedImageIds.push(id);
      db.prepare("INSERT INTO gurdwara_updates (gurdwara_id, action, changes, actor_id) VALUES (?, 'image added', ?, NULL)").run(p.gurdwaraId, JSON.stringify({ source: p.sourceUrl, license: p.license, foundVia: p.how, ...(p.distM !== undefined ? { distanceM: p.distM } : {}) }));
    }
  });
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`[photos] applied: ${backup.insertedImageIds.length} photos added. Rollback file: ${file}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) main().catch((err) => { console.error('[photos] failed:', err.message); process.exit(1); });
