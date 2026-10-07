#!/usr/bin/env node
/* ==========================================================================
   Sikhify — build a source-backed Gurdwara dataset from Wikidata.

     npm run gurdwaras:fetch-wikidata [-- --out path/to/file.json]

   Queries the public Wikidata Query Service for every item that is an
   instance of "gurdwara" (Q337986) and writes one JSON record per Gurdwara
   containing ONLY values that Wikidata states: name, official name,
   coordinates, street address, postal code, phone, website, inception year,
   and the place hierarchy (country → first-level region → district → city).
   Anything Wikidata doesn't state is left empty — nothing is guessed.
   Every record carries its source (the Wikidata item, and the English
   Wikipedia article when there is one). Wikidata content is CC0.

   The output is input for `npm run gurdwaras:import`. Imported records are
   "needs verification" until an admin checks and verifies them.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // backend/
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
const OUT = path.resolve(ROOT, arg('--out', 'seed/gurdwaras/wikidata-gurdwaras.json'));
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'SikhifyDirectoryImport/1.0 (https://sikhify.in; Gurdwara directory import)';

async function sparql(query) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(ENDPOINT + '?query=' + encodeURIComponent(query), { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA } });
    if (res.ok) return (await res.json()).results.bindings;
    if (attempt === 3) throw new Error(`Wikidata query failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }
  return [];
}
const v = (b, k) => (b[k] ? b[k].value : '');
const qid = (uri) => uri.replace('http://www.wikidata.org/entity/', '');

const GURDWARA = 'wd:Q337986';
const CORE = `
SELECT ?g ?gLabel ?cc ?coord ?website ?phone ?address ?postal ?inception ?official ?article ?loc ?useLabel ?dissolved WHERE {
  ?g wdt:P31/wdt:P279* ${GURDWARA} .
  OPTIONAL { ?g wdt:P17 ?c . ?c wdt:P297 ?cc }
  OPTIONAL { ?g wdt:P625 ?coord }
  OPTIONAL { ?g wdt:P856 ?website }
  OPTIONAL { ?g wdt:P1329 ?phone }
  OPTIONAL { ?g wdt:P6375 ?address }
  OPTIONAL { ?g wdt:P281 ?postal }
  OPTIONAL { ?g wdt:P571 ?inception }
  OPTIONAL { ?g wdt:P1448 ?official }
  OPTIONAL { ?g wdt:P131 ?loc }
  OPTIONAL { ?g wdt:P5817 ?use }
  OPTIONAL { ?g wdt:P576 ?dissolved }
  OPTIONAL { ?article schema:about ?g ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,pa,hi,ur". }
}`;
// Every administrative area above a Gurdwara, with what kind of area it is.
const AREAS = `
SELECT DISTINCT ?a ?aLabel ?parent ?iso ?acc ?isState ?isDistrict ?isSettlement WHERE {
  ?g wdt:P31/wdt:P279* ${GURDWARA} . ?g wdt:P131+ ?a .
  OPTIONAL { ?a wdt:P131 ?parent }
  OPTIONAL { ?a wdt:P300 ?iso }
  OPTIONAL { ?a wdt:P17 ?ac . ?ac wdt:P297 ?acc }
  BIND(EXISTS { ?a wdt:P31/wdt:P279* wd:Q10864048 } AS ?isState)
  BIND(EXISTS { ?a wdt:P31/wdt:P279* wd:Q1149652 } AS ?isDistrict)
  BIND(EXISTS { ?a wdt:P31/wdt:P279* wd:Q486972 } AS ?isSettlement)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}`;

console.log('Querying Wikidata…');
const [core, areaRows] = [await sparql(CORE), await sparql(AREAS)];

const areas = new Map();
for (const b of areaRows) {
  const id = qid(v(b, 'a'));
  const a = areas.get(id) || { id, name: v(b, 'aLabel'), parents: [], countries: [], iso: '', isState: false, isDistrict: false, isSettlement: false };
  if (b.parent) a.parents.push(qid(v(b, 'parent')));
  if (b.iso && !a.iso) a.iso = v(b, 'iso');
  if (b.acc && !a.countries.includes(v(b, 'acc'))) a.countries.push(v(b, 'acc'));
  a.isState ||= v(b, 'isState') === 'true';
  a.isDistrict ||= v(b, 'isDistrict') === 'true' || /\bdistrict\b/i.test(a.name);
  a.isSettlement ||= v(b, 'isSettlement') === 'true';
  areas.set(id, a);
}
const realName = (a) => a && !/^Q\d+$/.test(a.name);

/** Walk up "located in" from the Gurdwara's own area: nearest settlement = city, first district, first first-level region = state. */
function place(startIds, cc) {
  // Only follow areas in the Gurdwara's own country (some areas list historical parents across borders).
  const inCountry = (a) => a && (!a.countries.length || a.countries.includes(cc));
  const out = { city: null, district: null, state: null };
  let ids = startIds;
  const seen = new Set();
  for (let depth = 0; depth < 12 && ids.length; depth++) {
    const a = ids.map((id) => areas.get(id)).find(inCountry);
    if (!a || seen.has(a.id)) break;
    seen.add(a.id);
    if (a.isState) { out.state = a; break; }
    if (a.isDistrict && !out.district) out.district = a;
    else if (a.isSettlement && !out.city && !out.district) out.city = a;
    ids = a.parents;
  }
  return out;
}

const byItem = new Map();
for (const b of core) {
  const id = qid(v(b, 'g'));
  const r = byItem.get(id) || { id, label: v(b, 'gLabel'), cc: '', coord: '', website: '', phone: '', address: '', postal: '', inception: '', official: '', article: '', locs: [], use: '', dissolved: '' };
  for (const [k, key] of [['cc', 'cc'], ['coord', 'coord'], ['website', 'website'], ['phone', 'phone'], ['address', 'address'], ['postal', 'postal'], ['inception', 'inception'], ['official', 'official'], ['article', 'article'], ['use', 'useLabel'], ['dissolved', 'dissolved']]) {
    if (!r[k] && b[key]) r[k] = v(b, key);
  }
  if (b.loc) { const l = qid(v(b, 'loc')); if (!r.locs.includes(l)) r.locs.push(l); }
  byItem.set(id, r);
}

const retrieved = new Date().toISOString().slice(0, 10);
const records = [];
const skipped = [];
for (const r of byItem.values()) {
  const why = [];
  if (!realName({ name: r.label })) why.push('no name');
  if (!r.cc) why.push('no country');
  const p = place(r.locs, r.cc);
  // City: nearest settlement; otherwise the district (Wikidata often places Gurdwaras directly in a district).
  const cityArea = p.city || p.district;
  if (!realName(cityArea)) why.push('no city/district');
  if (!realName(p.state)) why.push('no state/region');
  if (why.length) { skipped.push({ id: r.id, name: r.label, why: why.join(', ') }); continue; }
  const m = r.coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  const year = r.inception.match(/^\+?(\d{4})-/);
  const closed = r.dissolved || /destroy|demolish|ruin|closed|former|abandon/i.test(r.use);
  const sources = [{ name: `Wikidata (${r.id})`, url: `https://www.wikidata.org/wiki/${r.id}`, type: 'open_data', notes: `Retrieved ${retrieved} from the Wikidata Query Service (CC0).` }];
  if (r.article) sources.push({ name: 'Wikipedia', url: r.article, type: 'open_data', notes: `English Wikipedia article linked from ${r.id}.` });
  records.push({
    external_ref: `wikidata:${r.id}`,
    name: r.label,
    official_name: r.official && r.official !== r.label ? r.official : '',
    country: r.cc,
    state: p.state.name,
    state_code: p.state.iso || '',
    district: p.district ? p.district.name.replace(/\s+district$/i, '') : '',
    city: cityArea.name.replace(/\s+district$/i, ''),
    address: r.address || '',
    postal_code: r.postal || '',
    latitude: m ? Number(m[2]) : null,
    longitude: m ? Number(m[1]) : null,
    phone: r.phone || '',
    website: /^https?:\/\//i.test(r.website) ? r.website : '',
    established_year: year && Number(year[1]) >= 1469 && Number(year[1]) <= new Date().getFullYear() ? Number(year[1]) : null,
    status: closed ? 'permanently_closed' : 'active',
    sources,
  });
}
records.sort((a, b) => a.country.localeCompare(b.country) || a.state.localeCompare(b.state) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  source: 'Wikidata — items that are an instance of “gurdwara” (Q337986)',
  license: 'CC0 1.0 (Wikidata)',
  retrieved,
  note: 'Only values stated in Wikidata. Empty fields are unknown. Imported records stay “needs verification” until an admin verifies them.',
  skipped,
  records,
}, null, 2) + '\n');
const count = (f) => records.filter(f).length;
console.log(`Wrote ${records.length} records to ${path.relative(ROOT, OUT)} (${skipped.length} skipped — see "skipped" in the file).`);
console.log(`  India: ${count((r) => r.country === 'IN')} · with coordinates: ${count((r) => r.latitude !== null)} · with phone: ${count((r) => r.phone)} · with website: ${count((r) => r.website)}`);
