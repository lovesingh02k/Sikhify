/* ==========================================================================
   Sikhify — utils/festivalCard.js
   One festival card's markup, shared by the homepage section (homeController),
   the /festivals page and the admin preview, so the preview is exactly what
   visitors see. `card` is the shape from shared/festivals.js (cardOf).
   ========================================================================== */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

const fmt = (iso, opts) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
};

/** "Tuesday, 14 April 2026", or "14 – 16 April 2026" / "30 Dec 2026 – 2 Jan 2027" for a period. */
export function festivalDateLabel(start, end) {
  if (!end || end === start) return fmt(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = sameYear && start.slice(5, 7) === end.slice(5, 7);
  const from = fmt(start, sameMonth ? { day: 'numeric' } : sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  return `${from} – ${fmt(end, { day: 'numeric', month: sameMonth ? 'long' : 'short', year: 'numeric' })}`;
}

/** The status pill: Today, Ongoing (until …), Tomorrow, or In N days. */
export function festivalStatusLabel(card) {
  if (card.status === 'today') return 'Today';
  if (card.status === 'ongoing') return `Ongoing · until ${fmt(card.end, { day: 'numeric', month: 'short' })}`;
  if (card.daysUntil === 1) return 'Tomorrow';
  return `Upcoming · in ${card.daysUntil} days`;
}

const CAL = '<svg class="fest-card-cal" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

/**
 * One festival card. Options:
 *   wide  the homepage layout — a picture on the left (the observance's image,
 *         else `art(card)`, e.g. the related Guru's historical artwork, else the Khanda);
 *   art   (card) => picture HTML, or '' for none.
 */
export function festivalCardHtml(card, { wide = false, art } = {}) {
  const ext = card.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const when = festivalDateLabel(card.start, card.end);
  let pic = '';
  if (card.imageUrl) pic = `<img src="${esc(card.imageUrl)}" alt="" width="320" height="320" loading="lazy" decoding="async">`;
  else if (wide && typeof art === 'function') pic = art(card) || '';
  if (wide && !pic) pic = '<span class="khanda-mark fest-card-khanda" aria-hidden="true"></span>';
  return `<a class="fest-card${wide ? ' fest-card-wide' : ''} is-${esc(card.status)}${card.featured ? ' is-featured' : ''}" href="${esc(card.href)}"${ext}>` +
    (pic ? `<span class="fest-card-img">${pic}</span>` : '') +
    '<span class="fest-card-body">' +
    `<span class="fest-status">${esc(festivalStatusLabel(card))}</span>` +
    `<span class="fest-card-title">${esc(card.title)}</span>` +
    `<time class="fest-card-date" datetime="${esc(card.start)}">${wide ? CAL : ''}${esc(when)}</time>` +
    (card.summary ? `<span class="fest-card-text">${esc(card.summary)}</span>` : '') +
    `<span class="fest-card-cta">Explore this day${card.external ? ' ↗' : ' →'}${card.external ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</span>` +
    '</span></a>';
}
