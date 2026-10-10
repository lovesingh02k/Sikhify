/* ==========================================================================
   Sikhify API — lib/gurdwaraEvidence.js
   The evidence rules used before a Gurdwara record is marked VERIFIED, shared by
   the admin "Review & verify" preview (routes/gurdwaras.js) and the bulk audit
   script (scripts/audit-gurdwara-verification.js). Read-only: nothing here writes.

   A record imported from Wikidata ("wikidata:Q…") meets the rules when ALL hold:
     1. the Wikidata item exists and was not merged/redirected;
     2. it is an instance of gurdwara (P31 = Q337986);
     3. its label or an alias matches the stored name (spelling-normalised);
     4. its coordinates are within 2 km of the stored ones (both must exist);
     5. it is independently corroborated by one of:
        • a Wikipedia article about it,
        • an official website (P856) that actually responds,
        • a reliable map listing: an OpenStreetMap Sikh place of worship
          (tagged religion=sikh, linked to the same Wikidata item, or named as a
          Gurdwara) within 300 m of the Wikidata location,
        • a photograph of it on Wikimedia Commons (its Wikidata image, P18) whose
          own camera geotag is within 300 m of that location — someone was there.
   Any other record (OpenStreetMap import, staff-created, community) needs a
   person: the preview lists its sources and what is missing, and never marks it
   as meeting the rules on its own.
   ========================================================================== */
import { normalizeName, distanceKm } from '../../../shared/gurdwaras.js';

export const GURDWARA_QID = 'Q337986';
export const MAX_KM = 2;
export const OSM_RADIUS_M = 300;
const UA = 'SikhifyDirectoryAudit/1.0 (https://sikhify.in; verification of directory records)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const GURDWARA_NAME = /gur[ue]?\s?dw?a+r[ae]|gurudwara|gurdwara|singh\s*sabha|sikh\s*temple|गुरुद्वारा|गुरूद्वारा|गुरद्वारा|ਗੁਰਦੁਆਰਾ|ਗੁਰਦਵਾਰਾ/i;
const NO_CORROBORATION = 'no Wikipedia article or official website to corroborate it';
const claimValues = (e, p) => ((e.claims || {})[p] || []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);

export async function fetchWikidataEntities(qids, { fetchImpl = fetch } = {}) {
  const out = {};
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const url = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', ids: batch.join('|'), props: 'labels|aliases|claims|sitelinks|info', format: 'json', redirects: 'no' });
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) }).catch(() => ({ ok: false, status: 0 }));
      if (res.ok) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (!res.ok) throw new Error(`Wikidata could not be reached (${res.status || 'network'})`);
    Object.assign(out, (await res.json()).entities || {});
  }
  return out;
}

/** Rules 1–5 (Wikipedia / website part) for one Wikidata-imported record. `rec`: { qid, name, latitude, longitude }. */
export function assessWikidata(rec, entity) {
  const reasons = [];
  const evidence = { wikidata: `https://www.wikidata.org/wiki/${rec.qid}` };
  if (!entity || entity.missing !== undefined) return { meets: false, reasons: ['Wikidata item no longer exists'], evidence };
  if (entity.redirects || (entity.id && entity.id !== rec.qid)) return { meets: false, reasons: [`Wikidata item was merged into ${entity.id || 'another item'}`], evidence };
  if (!claimValues(entity, 'P31').map((v) => v.id).includes(GURDWARA_QID)) reasons.push('Wikidata does not describe it as a gurdwara');
  const names = [...Object.values(entity.labels || {}).map((l) => l.value), ...Object.values(entity.aliases || {}).flat().map((a) => a.value)];
  const mine = normalizeName(rec.name);
  if (!names.some((n) => { const t = normalizeName(n); return t && (t === mine || t.includes(mine) || mine.includes(t)); })) reasons.push('name differs from Wikidata');
  const coord = claimValues(entity, 'P625')[0];
  if (!coord || rec.latitude === null || rec.longitude === null) reasons.push('no coordinates to confirm the location');
  else {
    const d = distanceKm(rec.latitude, rec.longitude, coord.latitude, coord.longitude);
    evidence.distanceKm = Math.round(d * 100) / 100;
    evidence.coord = { lat: coord.latitude, lon: coord.longitude };
    if (d > MAX_KM) reasons.push(`stored location is ${d.toFixed(1)} km from Wikidata's`);
  }
  const wikis = Object.values(entity.sitelinks || {}).filter((s) => /wiki$/.test(s.site) && !/^(commons|species|meta|wikidata)wiki$/.test(s.site));
  const wp = wikis.find((s) => s.site === 'enwiki') || wikis[0];
  const website = claimValues(entity, 'P856')[0];
  const photo = claimValues(entity, 'P18')[0];
  if (photo) evidence.photoFile = photo;
  if (wp) evidence.wikipedia = `https://${wp.site.replace(/wiki$/, '').replace(/_/g, '-')}.wikipedia.org/wiki/${encodeURIComponent(wp.title.replace(/ /g, '_'))}`;
  if (website) evidence.website = website;
  if (!wp && !website) reasons.push(NO_CORROBORATION);
  return { meets: reasons.length === 0, reasons, evidence };
}

export async function websiteResponds(url, { fetchImpl = fetch } = {}) {
  return fetchImpl(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) }).then((r) => r.ok).catch(() => false);
}

/**
 * OpenStreetMap places of worship near each point (Overpass, batched). Returns per id the closest Sikh match
 * { url, name, distanceM, linked } or null. If OpenStreetMap can't be reached it throws (records stay pending).
 */
export async function osmSikhNearby(points, { fetchImpl = fetch, batch = 20, pauseMs = 8000 } = {}) {
  const out = {};
  for (let i = 0; i < points.length; i += batch) {
    const group = points.slice(i, i + batch);
    const q = '[out:json][timeout:120];(' + group.map((p) => `nwr(around:${OSM_RADIUS_M},${p.lat},${p.lon})["amenity"="place_of_worship"];nwr(around:${OSM_RADIUS_M},${p.lat},${p.lon})["religion"="sikh"];`).join('') + ');out center tags;';
    let j = null;
    for (let attempt = 0; attempt < 6 && !j; attempt++) {
      const res = await fetchImpl(OVERPASS[attempt % OVERPASS.length], { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(150000) }).catch(() => null);
      if (res && res.ok) { const t = await res.text(); if (t.startsWith('{')) j = JSON.parse(t); }
      if (!j) await new Promise((r) => setTimeout(r, 15000 + 10000 * attempt));
    }
    if (!j) throw new Error('OpenStreetMap could not be reached');
    for (const p of group) {
      let best = null;
      for (const el of j.elements) {
        const t = el.tags || {};
        const lat = el.lat ?? (el.center && el.center.lat);
        const lon = el.lon ?? (el.center && el.center.lon);
        if (lat === undefined) continue;
        const d = distanceKm(p.lat, p.lon, lat, lon) * 1000;
        if (d > OSM_RADIUS_M) continue;
        const linked = !!p.qid && t.wikidata === p.qid;
        const sikh = t.religion === 'sikh' || ['name', 'name:en', 'name:hi', 'name:pa', 'alt_name'].some((k) => t[k] && GURDWARA_NAME.test(t[k]));
        if (!linked && !sikh) continue;
        const score = (linked ? 0 : 1000) + d;
        if (!best || score < best.score) best = { score, url: `https://www.openstreetmap.org/${el.type}/${el.id}`, name: t.name || '', distanceM: Math.round(d), linked };
      }
      out[p.id] = best ? { url: best.url, name: best.name, distanceM: best.distanceM, linked: best.linked } : null;
    }
    if (i + batch < points.length) await new Promise((r) => setTimeout(r, pauseMs));
  }
  return out;
}

/** Camera geotags of Commons files (only files that carry GPS metadata). Returns { file: { lat, lon } }. */
export async function commonsGeotags(files, { fetchImpl = fetch } = {}) {
  const out = {};
  for (let i = 0; i < files.length; i += 40) {
    const titles = files.slice(i, i + 40).map((f) => 'File:' + f);
    const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'extmetadata', iiextmetadatafilter: 'GPSLatitude|GPSLongitude', titles: titles.join('|') });
    const res = await fetchImpl(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }).catch(() => null);
    if (!res || !res.ok) throw new Error('Wikimedia Commons could not be reached');
    const j = await res.json();
    const norm = Object.fromEntries(((j.query && j.query.normalized) || []).map((n) => [n.to, n.from]));
    for (const p of Object.values((j.query && j.query.pages) || {})) {
      const m = p.imageinfo && p.imageinfo[0] && p.imageinfo[0].extmetadata;
      const lat = m && m.GPSLatitude && Number(m.GPSLatitude.value);
      const lon = m && m.GPSLongitude && Number(m.GPSLongitude.value);
      if (Number.isFinite(lat) && Number.isFinite(lon)) out[(norm[p.title] || p.title).replace(/^File:/, '')] = { lat, lon };
    }
  }
  return out;
}

/**
 * Evidence for a set of records (rows from the gurdwaras table plus `sources`).
 * opts.osm === false skips the map check (tests, offline).
 * @returns {Promise<Array<{ id, name, meets, reasons[], evidence{}, sources[] }>>}
 */
export async function checkEvidence(rows, opts = {}) {
  const wd = rows.filter((r) => /^wikidata:Q\d+$/.test(r.external_ref || ''));
  let entities = {};
  let wikidataError = null;
  if (wd.length) {
    try { entities = await fetchWikidataEntities(wd.map((r) => r.external_ref.slice(9)), opts); } catch (err) { wikidataError = err.message; }
  }
  const out = [];
  for (const r of rows) {
    const base = { id: r.id, name: r.name, sources: r.sources || [] };
    if (/^wikidata:Q\d+$/.test(r.external_ref || '')) {
      if (wikidataError) { out.push({ ...base, meets: false, reasons: [wikidataError + ' — try again later'], evidence: {} }); continue; }
      const a = assessWikidata({ qid: r.external_ref.slice(9), name: r.name, latitude: r.latitude, longitude: r.longitude }, entities[r.external_ref.slice(9)]);
      if (a.meets && !a.evidence.wikipedia && a.evidence.website && !(await websiteResponds(a.evidence.website, opts))) {
        a.meets = false;
        a.reasons.push(NO_CORROBORATION);
        a.evidence.websiteDead = true;
      }
      out.push({ ...base, ...a });
    } else {
      const reasons = ['not imported from Wikidata — needs a second, independent source checked by a person'];
      if (!(r.sources || []).some((s) => s.url && s.type !== 'community')) reasons.push('no cited source with a link');
      if (r.latitude === null) reasons.push('no coordinates');
      if (!r.address) reasons.push('no address');
      out.push({ ...base, meets: false, manual: true, reasons, evidence: {} });
    }
  }
  // Rule 5 by map listing: records whose only gap is corroboration get an OpenStreetMap check.
  const needOsm = out.filter((x) => !x.manual && x.reasons.length === 1 && x.reasons[0] === NO_CORROBORATION && x.evidence.coord);
  if (needOsm.length && opts.osm !== false) {
    let near = null;
    try {
      near = await osmSikhNearby(needOsm.map((x) => ({ id: x.id, lat: x.evidence.coord.lat, lon: x.evidence.coord.lon, qid: x.evidence.wikidata.split('/').pop() })), opts);
    } catch (err) {
      for (const x of needOsm) x.reasons.push(err.message + ' — try again later');
    }
    if (near) {
      for (const x of needOsm) {
        const m = near[x.id];
        if (m) { x.evidence.osm = m.url; x.evidence.osmDistanceM = m.distanceM; x.evidence.osmLinked = m.linked; x.reasons = []; x.meets = true; } else {
          x.reasons = [x.evidence.websiteDead ? 'its official website did not respond, and no Wikipedia article or OpenStreetMap listing corroborates it' : 'no Wikipedia article, working official website or OpenStreetMap listing to corroborate it'];
        }
      }
    }
  } else {
    for (const x of out) if (x.evidence.websiteDead) x.reasons = x.reasons.map((r) => (r === NO_CORROBORATION ? 'its official website did not respond' : r));
  }
  // Rule 5 by photograph: still uncorroborated, but its Wikidata photo was taken (camera geotag) at the place.
  const needPhoto = out.filter((x) => !x.manual && !x.meets && x.reasons.length === 1 && /corroborat/.test(x.reasons[0]) && x.evidence.coord && x.evidence.photoFile);
  if (needPhoto.length && opts.photos !== false) {
    let tags = null;
    try { tags = await commonsGeotags([...new Set(needPhoto.map((x) => x.evidence.photoFile))], opts); } catch { /* keep pending */ }
    for (const x of needPhoto) {
      const g = tags && tags[x.evidence.photoFile];
      if (!g) continue;
      const d = distanceKm(x.evidence.coord.lat, x.evidence.coord.lon, g.lat, g.lon) * 1000;
      if (d <= OSM_RADIUS_M) {
        x.evidence.photo = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(x.evidence.photoFile.replace(/ /g, '_'));
        x.evidence.photoDistanceM = Math.round(d);
        x.reasons = [];
        x.meets = true;
      }
    }
  }
  return out;
}
