/* ==========================================================================
   Sikhify — utils/observanceHero.js
   A large, light "observance" banner for the current or next festival /
   important day: a gold eyebrow (Today's observance · Coming up in N days),
   the occasion split into a small kicker and a big name ("Parkash Purab of" /
   "Sri Guru Ram Das Ji" / "Fourth Sikh Guru"), the date with its Nanakshahi
   date, the summary, and a button to learn about the Guru Sahib.

   Pictures are real: the related Guru's historical artwork (a museum painting,
   data/guruArtwork.js) in an arched frame, over the site's licensed photo of
   Sri Harmandir Sahib. "ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ" is real text, not an image.
   Used by the homepage banner carousel and the /festivals page.

   `card` is the festival card shape (shared/festivals.js cardOf): only
   published observances with a verified date ever reach this.
   ========================================================================== */
import GURUS from '../data/gurus.js';
import { guruImageHtml } from './images.js';
import { festivalDateLabel } from './festivalCard.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
const ORDINAL = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

// Photo: the Golden Temple reflected at dusk — by Henlynn, Pexels (same licensed photo as the homepage hero).
const SCENE = 'https://images.pexels.com/photos/7433983/pexels-photo-7433983.jpeg?auto=compress&cs=tinysrgb';
const sceneImg = `<img class="obs-hero-scene" src="${SCENE}&w=1280" srcset="${SCENE}&w=768 768w, ${SCENE}&w=1280 1280w, ${SCENE}&w=1600 1600w" sizes="(min-width: 900px) 65vw, 100vw" alt="" loading="lazy" decoding="async">`;
const CAL = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/></svg>';
const BOOK = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z"/><path d="M12 6.5v13"/></svg>';
const FLORAL = '<svg class="obs-hero-floral" aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1"><path d="M40 190c10-40 30-60 60-70M60 190c0-30 20-55 50-62"/><path d="M100 120c-12-8-30-6-38 6 12 8 30 6 38-6Z"/><path d="M110 128c4-14 18-24 32-20-4 14-18 24-32 20Z"/><circle cx="58" cy="150" r="14"/><path d="M58 136c-6-10-2-20 0-24 2 4 6 14 0 24ZM72 150c10-6 20-2 24 0-4 2-14 6-24 0ZM58 164c6 10 2 20 0 24-2-4-6-14 0-24ZM44 150c-10 6-20 2-24 0 4-2 14-6 24 0Z"/><path d="M20 120c14 2 26 12 30 26"/></svg>';

/** "Parkash Purab of Sri Guru Ram Das Ji" → { kicker: "Parkash Purab of", name: "Sri Guru Ram Das Ji" }. */
function splitTitle(title) {
  const m = /^(.{3,40}?\bof)\s+(.+)$/i.exec(title);
  return m && m[2].length >= 6 ? { kicker: m[1], name: m[2] } : { kicker: '', name: title };
}

/** The current or next observance to feature (today/ongoing first, then the nearest date). */
export function pickObservance(cards) {
  const rank = (c) => ({ today: 0, ongoing: 1 }[c.status] ?? 2);
  return [...(cards || [])].sort((a, b) => rank(a) - rank(b) || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))[0] || null;
}

/**
 * `over` (all optional) — a homepage banner's own wording and picture, set in
 * Admin → Homepage banners; anything left empty uses the festival's own text:
 *   title, eyebrow, kicker, subtitle, gurmukhi, summary, image {url, alt}, cta {label, url}.
 * A custom picture replaces the Guru Sahib's painting and the Sri Harmandir Sahib photo.
 */
export function observanceHeroHtml(card, { headingLevel = 2, over = {} } = {}) {
  const h = `h${headingLevel}`;
  const guru = card.relatedGuru ? GURUS.find((g) => g.id === card.relatedGuru) : null;
  const split = splitTitle(over.title || card.title);
  const kicker = over.kicker || split.kicker;
  const name = split.name;
  const aboutGuru = guru && name.includes(guru.name.replace(/^Guru /, ''));
  const sub = over.subtitle || (guru ? (aboutGuru ? `${ORDINAL[guru.number]} Sikh Guru` : `Sri ${guru.name} · ${ORDINAL[guru.number]} Sikh Guru`) : '');
  const eyebrow = over.eyebrow || (card.status === 'today' ? "Today's observance" : card.status === 'ongoing' ? 'Being observed now' : card.daysUntil === 1 ? 'Tomorrow' : `Coming up · in ${card.daysUntil} days`);
  const summary = over.summary || card.summary;
  const gm = String(over.gurmukhi || 'ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ').trim();
  const gmLines = gm.includes(' ') ? [gm.slice(0, gm.indexOf(' ')), gm.slice(gm.indexOf(' ') + 1)] : [gm];
  const custom = over.image && over.image.url ? over.image : null;
  const portrait = custom ? ''
    : guru ? `<figure class="obs-hero-portrait">${guruImageHtml(guru, { sizes: '(min-width: 900px) 300px, 45vw' })}</figure>`
      : card.imageUrl ? `<figure class="obs-hero-portrait"><img src="${esc(card.imageUrl)}" alt="" loading="lazy" decoding="async"></figure>` : '';
  const art = custom
    ? `<div class="obs-hero-art is-custom"><img class="obs-hero-scene" src="${esc(custom.url)}" alt="${esc(custom.alt || '')}" loading="lazy" decoding="async"></div>`
    : `<div class="obs-hero-art" aria-hidden="true">${sceneImg}</div>`;
  const ext = card.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const safe = (u) => (/^\/(?!\/)/.test(u) || /^https:\/\//i.test(u) ? u : '');
  const ctaHref = over.cta && over.cta.url ? safe(over.cta.url) : '';
  const ctaExt = /^https:/i.test(ctaHref) ? ' target="_blank" rel="noopener noreferrer"' : '';
  const actions = ctaHref
    ? `<a class="obs-hero-btn" href="${esc(ctaHref)}"${ctaExt}>${BOOK}<span>${esc(over.cta.label)}</span><span class="obs-hero-arrow" aria-hidden="true">→</span></a>` +
      `<a class="obs-hero-link" href="${esc(card.href)}"${ext}>Explore this day</a>`
    : guru
      ? `<a class="obs-hero-btn" href="/gurus/${esc(guru.id)}">${BOOK}<span>Learn about Sri ${esc(guru.name)}</span><span class="obs-hero-arrow" aria-hidden="true">→</span></a>` +
        `<a class="obs-hero-link" href="${esc(card.href)}"${ext}>Explore this day</a>`
      : `<a class="obs-hero-btn" href="${esc(card.href)}"${ext}>${BOOK}<span>Explore this day</span><span class="obs-hero-arrow" aria-hidden="true">→</span></a>`;
  return `<article class="obs-hero${portrait ? '' : ' no-portrait'}${custom ? ' has-custom' : ''}" aria-label="${esc(over.title || card.title)}">` +
    art +
    `<span class="khanda-mark obs-hero-khanda k1" aria-hidden="true"></span><span class="khanda-mark obs-hero-khanda k2" aria-hidden="true"></span>${FLORAL}` +
    // With the admin's own picture (which may carry its own Gurmukhi), the line is drawn only if they typed one.
    (!custom || over.gurmukhi ? `<p class="obs-hero-gurmukhi" lang="pa" aria-hidden="true">${gmLines.map(esc).join('<br>')}<span class="obs-hero-flourish"></span></p>` : '') +
    portrait +
    `<div class="obs-hero-body">` +
    `<p class="obs-hero-eyebrow"><span class="khanda-mark obs-hero-eyebrow-mark" aria-hidden="true"></span><span class="obs-hero-rule" aria-hidden="true"></span>${esc(eyebrow)}<span class="obs-hero-rule" aria-hidden="true"></span></p>` +
    (kicker ? `<p class="obs-hero-kicker">${esc(kicker)}</p>` : '') +
    `<${h} class="obs-hero-title">${esc(name)}</${h}>` +
    (sub ? `<p class="obs-hero-sub">${esc(sub)}</p>` : '') +
    `<p class="obs-hero-date">${CAL}<time datetime="${esc(card.start)}">${esc(festivalDateLabel(card.start, card.end))}</time>` +
    (card.nanakshahi ? `<span class="obs-hero-sep" aria-hidden="true"></span><span>${esc(card.nanakshahi)} (Nanakshahi)</span>` : '') + `</p>` +
    (summary ? `<p class="obs-hero-text">${esc(summary)}</p>` : '') +
    `<div class="obs-hero-actions">${actions}</div>` +
    `</div></article>`;
}
