/* ==========================================================================
   Sikhify — shared/festivals.js
   Sikh Festivals & Important Days: the date rules, shared by the API (which
   selects what the homepage shows) and the admin panel (which previews it).

   Scheduling
   • one_time         one dated occurrence (a row in observance_dates).
   • annual_verified  a date entered and verified for each year. Years without
                      a verified row are flagged and never guessed or copied.
   • annual_fixed     the same calendar day every year (e.g. a fixed
                      Nanakshahi date); the rule itself carries the source.

   Only verified dates are ever shown publicly as confirmed. Every date is a
   plain YYYY-MM-DD in the site's timezone, so day boundaries are exact.
   ========================================================================== */

/** The site's day boundary — the same "today" the Hukamnama and events use. */
export const SITE_TIMEZONE = 'Asia/Kolkata';

export const SCHEDULE_TYPES = {
  annual_verified: 'Annual — date verified each year',
  annual_fixed: 'Annual — same calendar date every year',
  one_time: 'One-time',
};
export const CALENDAR_TYPES = {
  nanakshahi: 'Nanakshahi',
  bikrami: 'Bikrami (lunar / solar)',
  gregorian: 'Gregorian',
  other: 'Other / per announcement',
};
export const CATEGORIES = {
  gurpurab: 'Gurpurab',
  shaheedi: 'Shaheedi Purab',
  festival: 'Festival',
  historical: 'Historical day',
  other: 'Other observance',
};
export const DESTINATION_TYPES = {
  detail: 'Its own Sikhify page (/festivals/…)',
  internal: 'An existing Sikhify page',
  external: 'An external website',
};
export const MAX_SPAN_DAYS = 60;
export const MAX_ADVANCE_DAYS = 366;

/** The Ten Guru profile ids (/gurus/:id). */
export const GURU_IDS = [
  'guru-nanak-dev-ji', 'guru-angad-dev-ji', 'guru-amar-das-ji', 'guru-ram-das-ji', 'guru-arjan-dev-ji',
  'guru-hargobind-sahib-ji', 'guru-har-rai-ji', 'guru-har-krishan-ji', 'guru-tegh-bahadur-ji', 'guru-gobind-singh-ji',
];

/* ---------- dates (YYYY-MM-DD strings, compared as UTC days) */

export function todayIn(timeZone = SITE_TIMEZONE, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const toUtc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUtc = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => fromUtc(toUtc(iso) + n * 86400000);
export const daysBetween = (from, to) => Math.round((toUtc(to) - toUtc(from)) / 86400000);
export const yearOf = (iso) => Number(iso.slice(0, 4));

/** The day of the week of a date, e.g. "Monday". */
export const weekdayOf = (iso, locale = 'en-GB') => new Date(toUtc(iso)).toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' });

/* ---------- occurrences */

/**
 * Every occurrence of an observance that falls in `years`.
 * `observance.dates` are its date rows: { startDate, endDate, verification, sourceName, sourceUrl }.
 */
const NANAKSHAHI_NOTE = /^(\d{1,2} (?:Chet|Vaisakh|Jeth|Harh|Sawan|Bhadon|Assu|Katak|Maghar|Poh|Magh|Phagun)) in the SGPC Nanakshahi Calendar/;
/**
 * The Nanakshahi date of a verified date row, e.g. "11 Katak" — read only from the
 * standard note written when a date is checked against the SGPC Nanakshahi
 * calendar (scripts/verify-observances-sgpc.js); '' otherwise. The rest of a
 * note stays private.
 */
export function nanakshahiOf(row) {
  if (!row || row.verification !== 'verified') return '';
  const m = NANAKSHAHI_NOTE.exec(String(row.notes || ''));
  return m ? m[1] : '';
}

export function occurrencesOf(observance, years) {
  if (observance.scheduleType === 'annual_fixed') {
    const { fixedMonth: m, fixedDay: d } = observance;
    const span = Math.max(1, Number(observance.durationDays) || 1);
    return years.flatMap((y) => {
      const start = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (!isIsoDate(start)) return []; // e.g. 29 February outside a leap year
      return [{ start, end: addDays(start, span - 1), verified: !!observance.ruleVerified, sourceName: observance.ruleSourceName, sourceUrl: observance.ruleSourceUrl }];
    });
  }
  return (observance.dates || [])
    .filter((r) => years.includes(yearOf(r.startDate)) || years.includes(yearOf(r.endDate)))
    .map((r) => ({ start: r.startDate, end: r.endDate || r.startDate, verified: r.verification === 'verified', sourceName: r.sourceName, sourceUrl: r.sourceUrl, nanakshahi: nanakshahiOf(r) }));
}

/** today (a one-day observance on this date), ongoing (a multi-day period that includes today), upcoming or past. */
export function occurrenceStatus({ start, end }, today) {
  if (end < today) return 'past';
  if (start > today) return 'upcoming';
  return start === end ? 'today' : 'ongoing';
}

/** The current or next verified occurrence, or null. */
export function nextVerifiedOccurrence(observance, today) {
  const y = yearOf(today);
  return occurrencesOf(observance, [y - 1, y, y + 1, y + 2])
    .filter((o) => o.verified && o.end >= today)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))[0] || null;
}

/**
 * Years that still need a verified date: this year (unless its occurrence is
 * already over) and next year. Only for annual_verified observances; an
 * annual_fixed rule needs verifying once.
 */
export function verificationGaps(observance, today) {
  if (observance.scheduleType === 'annual_fixed') return observance.ruleVerified ? [] : ['rule'];
  if (observance.scheduleType === 'one_time') {
    const rows = observance.dates || [];
    return rows.length && rows.every((r) => r.verification === 'verified') ? [] : ['date'];
  }
  const y = yearOf(today);
  const rows = observance.dates || [];
  const gaps = [];
  for (const year of [y, y + 1]) {
    const inYear = rows.filter((r) => yearOf(r.startDate) === year);
    if (year === y && inYear.length && inYear.every((r) => (r.endDate || r.startDate) < today)) continue;
    if (!inYear.some((r) => r.verification === 'verified')) gaps.push(year);
  }
  return gaps;
}

/** Where a card links: its own detail page, an existing Sikhify page, or an external site. */
export function destinationOf(o) {
  if (o.destinationType === 'internal' && o.destinationPath) return { href: o.destinationPath, external: false };
  if (o.destinationType === 'external' && o.destinationUrl) return { href: o.destinationUrl, external: true };
  return { href: `/festivals/${o.slug}`, external: false };
}

/** The public shape of a homepage card. */
export function cardOf(o, occ, today) {
  return {
    slug: o.slug,
    title: o.title,
    summary: o.summary,
    imageUrl: o.imageUrl || '',
    relatedGuru: o.relatedGuru || '',
    nanakshahi: occ.nanakshahi || '',
    start: occ.start,
    end: occ.end,
    weekday: weekdayOf(occ.start),
    status: occurrenceStatus(occ, today),
    daysUntil: Math.max(0, daysBetween(today, occ.start)),
    featured: !!o.featured,
    ...destinationOf(o),
  };
}

/**
 * What the homepage shows. `observances` are published, homepage-visible
 * records with their date rows. Today comes first, then ongoing, then the
 * nearest date (fewest days away first). Records inside their advance window
 * are shown; a row of fewer than `minCards` is topped up with the next verified
 * dates. When nothing falls inside its window, the next few verified dates are
 * shown instead (fallback).
 */
export function selectHomeCards(observances, today, { limit = 8, fallbackLimit = 3, minCards = 4 } = {}) {
  const candidates = [];
  for (const o of observances) {
    const occ = nextVerifiedOccurrence(o, today);
    if (occ) candidates.push({ o, occ, card: cardOf(o, occ, today) });
  }
  // Happening today first, then ongoing, then the nearest date — fewest days away in front.
  const rank = (c) => ({ today: 0, ongoing: 1 }[c.card.status] ?? 2);
  const order = (a, b) => rank(a) - rank(b)
    || (a.occ.start < b.occ.start ? -1 : a.occ.start > b.occ.start ? 1 : 0)
    || a.o.title.localeCompare(b.o.title);
  candidates.sort(order);
  const inWindow = candidates.filter((c) => c.card.status !== 'upcoming' || c.card.daysUntil <= (Number.isFinite(c.o.advanceDays) ? c.o.advanceDays : 30));
  if (inWindow.length) {
    // A short row is topped up with the next verified dates (still in date order).
    const extra = inWindow.length < minCards ? candidates.filter((c) => !inWindow.includes(c)).slice(0, minCards - inWindow.length) : [];
    return { items: [...inWindow, ...extra].sort(order).slice(0, limit).map((c) => c.card), fallback: false };
  }
  return { items: candidates.slice(0, fallbackLimit).map((c) => c.card), fallback: true };
}

/* ---------- destinations */

const LEGACY_PAGES = ['/', '/learn-sikhism', '/gurbani', '/nitnem', '/hukamnama', '/sikh-history', '/rehat-maryada', '/faq', '/sikh-media', '/sitemap'];
const REACT_PAGES = ['/about', '/festivals', '/gurus', '/directory', '/directory/gurdwaras', '/community', '/submit', '/image-credits'];
const SLUG = '[a-z0-9][a-z0-9-]{0,119}';

/**
 * True for a path on this site that a visitor can open: a top-level page, a
 * Guru profile, a festival page, a directory listing or entry, or a video page,
 * optionally with ?query and an app #hash (e.g. /sikh-history#event=…).
 * `typePaths` are the directory content-type paths (shared/contentTypes.js).
 */
export function isInternalPath(path, typePaths = []) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /\s|\\/.test(path) || path.length > 300) return false;
  const m = path.match(/^([^?#]*)(\?[^#]*)?(#[A-Za-z0-9=&_.%-]*)?$/);
  if (!m) return false;
  const p = m[1].length > 1 ? m[1].replace(/\/$/, '') : m[1];
  if (LEGACY_PAGES.includes(p) || REACT_PAGES.includes(p)) return true;
  let g;
  if ((g = p.match(/^\/gurus\/([^/]+)$/))) return GURU_IDS.includes(g[1]);
  if (new RegExp(`^/festivals/${SLUG}$`).test(p)) return true;
  if (new RegExp(`^/media/[A-Za-z0-9_-]{6,20}$`).test(p)) return true;
  if (new RegExp(`^/directory/gurdwaras(/${SLUG}){1,4}$`).test(p)) return true;
  return typePaths.some((t) => p === '/' + t || new RegExp(`^/${t}/${SLUG}$`).test(p));
}

const HTTP_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
export function isExternalUrl(v) {
  if (typeof v !== 'string' || !HTTP_URL.test(v)) return false;
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

/** An error message for an invalid destination, or ''. */
export function destinationError(o, typePaths = []) {
  if (o.destinationType === 'internal') {
    if (!o.destinationPath) return 'Choose the Sikhify page this card opens';
    if (!isInternalPath(o.destinationPath, typePaths)) return 'This is not a page on Sikhify — pick one from the list (e.g. /gurus/guru-nanak-dev-ji)';
  } else if (o.destinationType === 'external') {
    if (!o.destinationUrl) return 'Enter the website address';
    if (!isExternalUrl(o.destinationUrl)) return 'Must be a full http(s):// link';
  } else if (o.destinationType !== 'detail') return 'Choose where the card leads';
  return '';
}
