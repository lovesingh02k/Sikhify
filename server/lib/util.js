/* Sikhify API — lib/util.js: small shared helpers. */

/** YYYY-MM-DD for "today" in India (the Hukamnama is taken at Sri Harmandir Sahib, Amritsar). */
export function todayInIndia(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function slugify(s, max = 80) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '') || 'item';
}

/** Returns a slug unique within `exists(slug)` by appending -2, -3… */
export function uniqueSlug(base, exists) {
  let slug = slugify(base);
  let n = 2;
  while (exists(slug)) slug = `${slugify(base, 74)}-${n++}`;
  return slug;
}

export function excerpt(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
