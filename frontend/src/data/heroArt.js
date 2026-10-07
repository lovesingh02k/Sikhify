/* ==========================================================================
   Sikhify — data/heroArt.js
   Historical artwork shown in section page headers (desktop/tablet only; on
   phones the header stays text-only so nothing extra is downloaded).
   Public-domain works checked on Wikimedia Commons (2 October 2026);
   optimized copies live in src/assets/images/{history,gurbani}/.
   ========================================================================== */
import dims from '../assets/images/heroes.json';

const urls = import.meta.glob('../assets/images/{history,gurbani}/*.{webp,jpg}', { eager: true, query: '?url', import: 'default' });
const url = (f) => urls[`../assets/images/${f}`];

const WORKS = {
  history: {
    stem: 'history/harmandir-sahib-carpenter-1854',
    sizes: '(min-width: 1280px) 420px, 34vw',
    title: 'The Golden Temple at Amritsar',
    artist: 'William Carpenter',
    date: '1854',
    medium: 'Watercolour on paper',
    institution: 'Victoria and Albert Museum, London',
    institutionUrl: 'https://collections.vam.ac.uk/item/O81952/the-golden-temple-at-amritsar-painting-carpenter-william/',
    alt: 'Watercolour by William Carpenter, 1854 (Victoria and Albert Museum): Sri Harmandir Sahib, Amritsar, across the sacred pool, with the Sangat on the parikrama',
    commons: '1854_Golden_temple_painting_by_William_Carpenter.jpg',
  },
  gurbani: {
    stem: 'gurbani/illuminated-folio',
    sizes: '320px',
    title: 'Illuminated folio of a Guru Granth Sahib manuscript',
    artist: '',
    date: '',
    medium: 'Ink and pigments on paper',
    institution: 'Digitized by the Panjab Digital Library',
    institutionUrl: 'https://www.panjabdigilib.org/',
    alt: 'Illuminated folio of a historical Sri Guru Granth Sahib Ji manuscript: Gurmukhi text in a circular panel within floral borders (digitized by the Panjab Digital Library)',
    commons: 'Beautifully_decorated_illuminated_folio_from_a_Guru_Granth_Sahib_manuscript_digitized_by_the_Panjab_Digital_Library.jpg',
  },
};

export const HERO_ART_KEYS = Object.keys(WORKS);

export function heroArt(key) {
  const w = WORKS[key];
  if (!w) return null;
  const d = dims[w.stem];
  return {
    ...w,
    license: 'Public domain',
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${w.commons}`,
    width: d.width,
    height: d.height,
    webpSrcSet: d.widths.map((x) => `${url(`${w.stem}-${x}.webp`)} ${x}w`).join(', '),
    fallbackSrc: url(`${w.stem}-${d.fallback}.jpg`),
  };
}

/**
 * Framed artwork for a legacy page header. Hidden below 900px (CSS) and lazy, so
 * phones never download it; shown at full strength, never as a faded backdrop.
 */
export function heroArtHtml(key) {
  const a = heroArt(key);
  if (!a) return '';
  const e = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<figure class="page-hero-art page-hero-art-${key}">` +
    `<picture><source type="image/webp" srcset="${e(a.webpSrcSet)}" sizes="${e(a.sizes)}">` +
    `<img src="${e(a.fallbackSrc)}" width="${a.width}" height="${a.height}" alt="${e(a.alt)}" loading="lazy" decoding="async"></picture>` +
    `<figcaption>${e([a.title, [a.artist, a.date].filter(Boolean).join(", ")].filter(Boolean).join(" — "))}. ${e(a.institution)}. <a href="/image-credits">Credits</a></figcaption></figure>`;
}
