/* ==========================================================================
   Sikhify — utils/images.js
   Image helpers shared by React components and the original pages' DOM
   controllers (which render HTML strings), so both behave identically:
   responsive srcset/sizes, explicit width/height (no layout shift), lazy
   loading below the fold, async decoding, and a fallback when a file fails.
   ========================================================================== */
import { guruArtwork } from '../data/guruArtwork.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- YouTube thumbnails (served by YouTube; always JPEG — WebP isn't available for every video) */
export function youTubeThumb(id) {
  const base = `https://i.ytimg.com/vi/${encodeURIComponent(id)}`;
  return {
    src: `${base}/mqdefault.jpg`,
    srcSet: `${base}/mqdefault.jpg 320w, ${base}/hqdefault.jpg 480w`,
    width: 320,
    height: 180,
  };
}

/** <img> markup for a YouTube thumbnail inside a 16:9 frame (alt is empty: the link text names the video). */
export function youTubeThumbHtml(id, { sizes = '(min-width: 1024px) 380px, (min-width: 640px) 46vw, 92vw', alt = '' } = {}) {
  const t = youTubeThumb(id);
  return `<img src="${esc(t.src)}" srcset="${esc(t.srcSet)}" sizes="${esc(sizes)}" width="${t.width}" height="${t.height}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}

/* ---------- Ten Gurus: museum artwork, or a symbolic emblem */
const GURMUKHI_NUMERALS = ['੦', '੧', '੨', '੩', '੪', '੫', '੬', '੭', '੮', '੯', '੧੦'];
export const gurmukhiNumeral = (n) => GURMUKHI_NUMERALS[n] || String(n);

/** Symbolic fallback: Guru number, Gurmukhi numeral and Ik Onkar — never an invented portrait. */
export function guruEmblemHtml(guru, { size = 'md' } = {}) {
  return `<span class="sk-guru-emblem sk-guru-emblem-${size}" role="img" aria-label="Symbol for ${esc(guru.name)}, Guru ${guru.number} of 10">` +
    `<span class="sk-guru-emblem-ek" aria-hidden="true">ੴ</span><span class="sk-guru-emblem-num" aria-hidden="true">${gurmukhiNumeral(guru.number)}</span></span>`;
}

/**
 * <picture> for a Guru's artwork (WebP srcset + JPEG fallback), or the emblem.
 * `priority` loads eagerly (above-the-fold heroes only).
 */
export function guruImageHtml(guru, { sizes = '160px', priority = false, className = '' } = {}) {
  const art = guruArtwork(guru.id);
  if (!art) return guruEmblemHtml(guru);
  return `<picture class="sk-guru-art ${esc(className)}">` +
    `<source type="image/webp" srcset="${esc(art.webpSrcSet)}" sizes="${esc(sizes)}">` +
    `<img src="${esc(art.fallbackSrc)}" width="${art.width}" height="${art.height}" alt="${esc(art.alt)}" ` +
    `${priority ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-guru-fallback="${esc(guru.number)}" data-guru-name="${esc(guru.name)}"></picture>`;
}

/**
 * One delegated listener: if an artwork file fails to load, swap in the symbolic
 * emblem instead of leaving a broken image. (Error events don't bubble; capture does.)
 */
export function installImageFallbacks() {
  if (window.__sikhifyImageFallbacks) return;
  window.__sikhifyImageFallbacks = true;
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.dataset.guruFallback) return;
    const pic = img.closest('picture') || img;
    pic.outerHTML = guruEmblemHtml({ number: Number(img.dataset.guruFallback), name: img.dataset.guruName || 'this Guru' });
  }, true);
}
