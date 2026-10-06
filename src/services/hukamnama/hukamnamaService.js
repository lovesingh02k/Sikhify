/* ==========================================================================
   Sikhify — hukamnamaService
   The one place the site gets a Hukamnama. The homepage card and the
   Hukamnama page both call getHukamnama(), so they always show the same text.

   Order of sources for a date:
     1. The record published by a Sikhify admin (/admin/hukamnama), if any.
     2. Otherwise the live BaniDB feed (the site's original behaviour), with the
        SGPC's official daily recordings.

   Both are normalized to one shape:
     { date, ang, raag, writer, lines: [{ g, t, pa, hi, en }], blocks,
       audioUrl, kathaUrl, source, origin: 'sikhify' | 'banidb' }
   `blocks` holds meanings that are not line-by-line (for admin records whose
   meaning lines don't match the Gurmukhi lines one-to-one).
   ========================================================================== */
import { get } from '../api/client.js';
import { fetchJson } from '../../status/messages.js';
import H from '../../data/hukamnama.js';

const HEADING = /^(ੴ|.*ਮਹਲਾ|.*ਮਃ|ਸਲੋਕ|ਰਾਗੁ)/;

const parts = (s) => { const p = s.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** SGPC official recording URL for a date ({d} → DDMMYY). */
export function sgpcAudioUrl(kind, date) {
  const p = parts(date);
  return H.audio[kind].replace('{d}', String(p.d).padStart(2, '0') + String(p.m).padStart(2, '0') + String(p.y).slice(2));
}

/** BaniDB writes names phonetically ("Guru Amar Daas Ji"); show the usual spellings. */
function writerName(name) {
  return String(name || '')
    .replace(/Daas/g, 'Das').replace(/Raam/g, 'Ram').replace(/Bahaadur/g, 'Bahadur')
    .replace(/Kabeer/g, 'Kabir').replace(/Ravi Das/g, 'Ravidas').replace(/Fareed/g, 'Farid').replace(/Naam Dev/g, 'Namdev');
}

function fromBaniDb(json) {
  const g = json.date.gregorian;
  const date = iso(g.year, g.month, g.date);
  const shabads = json.shabads.map((s) => ({
    ang: s.shabadInfo.pageNo,
    raag: s.shabadInfo.raag && s.shabadInfo.raag.english,
    writer: writerName(s.shabadInfo.writer && s.shabadInfo.writer.english),
    lines: s.verses.map((v) => {
      const tr = v.translation || {};
      return { g: v.verse.unicode, t: (v.transliteration || {}).english, pa: tr.pu && tr.pu.ss && tr.pu.ss.unicode, hi: tr.hi && tr.hi.ss, en: tr.en && (tr.en.bdb || tr.en.ssk) };
    }),
  }));
  return {
    date,
    ang: shabads[0].ang,
    raag: shabads[0].raag || '',
    writer: shabads[0].writer || '',
    lines: shabads.flatMap((s) => s.lines),
    blocks: {},
    audioUrl: sgpcAudioUrl('hukamnama', date),
    kathaUrl: sgpcAudioUrl('katha', date),
    source: 'Sri Harmandir Sahib, Amritsar — text and meanings via BaniDB; audio published by the SGPC',
    origin: 'banidb',
  };
}

/** Admin record → the same shape. Meanings are matched to lines only when the counts line up. */
export function fromRecord(r) {
  const split = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const g = split(r.gurmukhi);
  const cols = { t: split(r.transliteration), pa: split(r.punjabi), hi: split(r.hindi), en: split(r.english) };
  const aligned = (arr) => arr.length === g.length;
  const blocks = {};
  for (const [k, arr] of Object.entries(cols)) if (arr.length && !aligned(arr)) blocks[k] = arr.join('\n');
  const lines = g.map((gl, i) => {
    const line = { g: gl };
    for (const [k, arr] of Object.entries(cols)) if (aligned(arr)) line[k] = arr[i];
    return line;
  });
  return {
    date: r.date, ang: r.ang, raag: r.raag || '', writer: r.writer || '', lines, blocks,
    audioUrl: r.audioUrl || '', kathaUrl: r.kathaUrl || '', source: r.source || '', origin: 'sikhify',
    updatedAt: r.updatedAt,
  };
}

/** The first line of the shabad itself (skipping Raag / Mahala headings). */
export function firstLines(h, n = 2) {
  const body = h.lines.filter((l) => !HEADING.test(l.g));
  return (body.length ? body : h.lines).slice(0, n);
}

const BANIDB = H.api;

/** The BaniDB Hukamnama for a date only (no Sikhify record) — used to prefill the admin editor. */
export async function fetchFromBaniDb(date) {
  const url = date === 'today' ? `${BANIDB}/today` : `${BANIDB}/${parts(date).y}/${parts(date).m}/${parts(date).d}`;
  const json = await fetchJson(url, { timeout: 12000 });
  if (!json.shabads || !json.shabads.length) {
    const none = new Error('BaniDB has no Hukamnama for this date');
    none.kind = 'notFound';
    throw none;
  }
  return fromBaniDb(json);
}

export const hukamnamaService = {
  /** `date` is "today" or YYYY-MM-DD. Rejects with an error carrying `kind` (e.g. notFound). */
  async getHukamnama(date = 'today') {
    try {
      const d = await get(date === 'today' ? '/api/hukamnama/today' : `/api/hukamnama/date/${date}`, { timeout: 6000 });
      if (d.hukamnama) return fromRecord(d.hukamnama);
    } catch {
      /* API unavailable or slow — use BaniDB */
    }
    return fetchFromBaniDb(date);
  },
  sgpcAudioUrl,
  archiveStart: H.archiveStart,
  officialUrl: H.officialUrl,
};
