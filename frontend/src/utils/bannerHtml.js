/* ==========================================================================
   Sikhify — utils/bannerHtml.js
   Markup for a homepage banner, shared by the homepage (controllers/
   homeController.js) and the admin preview, so the preview is exactly what
   visitors will see. Every value is escaped; links are limited to site paths
   and https:// URLs (the API validates the same rules).

   Look: a navy panel with the text on the left (gold "Faith • Knowledge •
   Seva" line, a serif title, the description and a gold pill button), the
   photo or video poster fading in from the right, a faint Khanda watermark
   and a gold flourish. In a title, *words between asterisks* are shown in gold.
   On narrow screens the picture sits on top and the text below.

   Several live banners become a carousel (bannerCarouselHtml +
   wireBannerCarousel): swipe, dots, arrow keys, auto-advance that pauses on
   hover, focus, a hidden tab or an open video, and never runs under reduced motion.

   Video: the poster is a thumbnail. Only pressing play loads the privacy-
   enhanced embed (youtube-nocookie.com), in a pop-up player — so nothing heavy
   loads with the homepage and nothing plays without the visitor.
   ========================================================================== */
import { isYouTubeVideoId, youTubeEmbedUrl, youTubeWatchUrl } from '../../../shared/youtube.js';
import { observanceHeroHtml } from './observanceHero.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeHref = (url) => (/^\/(?!\/)/.test(url) || /^https:\/\//i.test(url) ? url : '');
/** Escaped title; *text* becomes gold. Asterisks are otherwise kept as typed. */
const titleHtml = (t) => esc(t).replace(/\*([^*]{1,80})\*/g, '<span class="home-banner-gold">$1</span>');
const plainTitle = (t) => String(t ?? '').replace(/\*([^*]{1,80})\*/g, '$1');

const PLAY = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const SWIRL = '<svg class="home-banner-swirl" aria-hidden="true" viewBox="0 0 220 160" fill="none"><path d="M-10 150C40 120 70 60 150 40" stroke="currentColor" stroke-width="1.2"/><path d="M-10 160C50 128 90 78 175 62" stroke="currentColor" stroke-width="0.8" opacity=".7"/><path d="M-10 140C30 112 52 40 120 18" stroke="currentColor" stroke-width="0.8" opacity=".55"/><path d="M0 160C60 140 120 110 200 104" stroke="currentColor" stroke-width="0.6" opacity=".45"/></svg>';

export function bannerHtml(b, { headingLevel = 2 } = {}) {
  // A festival / important-day banner: the light observance design, from the festival's verified date.
  if (b.observance) {
    return observanceHeroHtml(b.observance, { headingLevel, over: { ...(b.options || {}), title: b.title, summary: b.description, image: b.image, cta: b.cta } });
  }
  const h = `h${headingLevel}`;
  const video = isYouTubeVideoId(b.youtubeId) ? b.youtubeId : null;
  const title = plainTitle(b.title);
  let media = '';
  if (video) {
    const poster = b.image
      ? `<img src="${esc(b.image.url)}" alt="" loading="lazy" decoding="async">`
      : `<img src="https://i.ytimg.com/vi/${video}/hqdefault.jpg" srcset="https://i.ytimg.com/vi/${video}/hqdefault.jpg 480w, https://i.ytimg.com/vi/${video}/sddefault.jpg 640w" sizes="(min-width: 900px) 760px, 100vw" alt="" loading="lazy" decoding="async">`;
    media = `<div class="home-banner-media">${poster}</div>`;
  } else if (b.image) {
    media = `<div class="home-banner-media"><img src="${esc(b.image.url)}" alt="${esc(b.image.alt)}" decoding="async"></div>`;
  }
  const href = b.cta ? safeHref(b.cta.url) : '';
  const external = /^https:/i.test(href);
  const newTab = '<span class="sr-only"> (opens in a new tab)</span>';
  const ctaLink = href ? `<a class="home-banner-cta${video ? ' is-ghost' : ''}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(b.cta.label)}<span class="home-banner-cta-arrow" aria-hidden="true">→</span>${external ? newTab : ''}</a>` : '';
  const actions = video
    ? `<button type="button" class="home-banner-cta" data-banner-play="${video}" data-banner-title="${esc(title)}"><span class="home-banner-cta-play">${PLAY}</span>Watch video<span class="home-banner-cta-arrow" aria-hidden="true">→</span></button>` +
      ctaLink + `<a class="home-banner-watch" href="${esc(youTubeWatchUrl(video))}" target="_blank" rel="noopener noreferrer">On YouTube${newTab}</a>`
    : ctaLink;
  return `<article class="home-banner ${video ? 'is-video' : 'is-image'}${media ? '' : ' no-media'}" aria-label="${esc(title)}">${media}` +
    `<span class="khanda-mark home-banner-khanda" aria-hidden="true"></span>${SWIRL}` +
    `<div class="home-banner-body"><p class="home-banner-eyebrow">Faith <span aria-hidden="true">•</span> Knowledge <span aria-hidden="true">•</span> Seva</p>` +
    `<${h} class="home-banner-title">${titleHtml(b.title)}</${h}>` +
    (b.description ? `<p class="home-banner-text">${esc(b.description)}</p>` : '') +
    (actions ? `<div class="home-banner-actions">${actions}</div>` : '') +
    `</div></article>`;
}

const ARROW = (d) => `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

/**
 * One banner on its own, or a carousel of several (then call wireBannerCarousel).
 * `lead`: ready-made slides shown first, as { html, title } — e.g. the
 * festival / important-day banner (utils/observanceHero.js).
 */
export function bannerCarouselHtml(items, { lead = [] } = {}) {
  const all = [...lead, ...items.map((b) => ({ html: bannerHtml(b), title: plainTitle(b.title) }))];
  if (all.length <= 1) return all.map((x) => `<div class="hb-single">${x.html}</div>`).join('');
  const slides = all.map((x, i) => `<div class="hb-slide${i ? '' : ' is-active'}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${all.length}">${x.html}</div>`).join('');
  const dots = all.map((x, i) => `<button type="button" class="hb-dot${i ? '' : ' is-active'}" data-hb-go="${i}" aria-label="Show banner ${i + 1}: ${esc(x.title)}"${i ? '' : ' aria-current="true"'}><span class="hb-dot-fill"></span></button>`).join('');
  return `<div class="hb-carousel" data-hb-carousel role="region" aria-roledescription="carousel" aria-label="Featured" tabindex="0">` +
    `<div class="hb-track" data-hb-track>${slides}</div>` +
    `<div class="hb-controls"><div class="hb-dots">${dots}</div>` +
    `<button type="button" class="hb-arrow" data-hb-step="-1" aria-label="Previous banner">${ARROW('M15 18l-6-6 6-6')}</button>` +
    `<button type="button" class="hb-arrow" data-hb-step="1" aria-label="Next banner">${ARROW('M9 18l6-6-6-6')}</button></div></div>`;
}

const videoOpen = () => !!document.querySelector('dialog.hb-video[open]');

/** Carousel behaviour for the markup above. Returns a cleanup. */
export function wireBannerCarousel(root, { interval = 8000 } = {}) {
  const car = root && root.querySelector('[data-hb-carousel]');
  if (!car) return () => {};
  const track = car.querySelector('[data-hb-track]');
  const slides = [...track.children];
  const dots = [...car.querySelectorAll('[data-hb-go]')];
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let index = 0; let timer = null; let raf = 0;
  let stopped = reduced; let hover = false; let focus = false;
  car.style.setProperty('--hb-interval', interval + 'ms');
  if (reduced) car.classList.add('is-static');

  const mark = (i) => {
    index = i;
    slides.forEach((s, n) => { s.classList.toggle('is-active', n === i); s.inert = n !== i; });
    dots.forEach((d, n) => { d.classList.toggle('is-active', n === i); if (n === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  };
  const paused = () => stopped || hover || focus || document.hidden || videoOpen();
  const schedule = () => {
    clearTimeout(timer);
    car.classList.toggle('is-paused', paused());
    // Restart the active dot's progress fill.
    const fill = dots[index] && dots[index].firstElementChild;
    if (fill) { fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = ''; }
    if (!paused()) timer = setTimeout(() => go(index + 1), interval);
  };
  function go(i, smooth = true) {
    const n = (i + slides.length) % slides.length;
    track.scrollTo({ left: n * track.clientWidth, behavior: smooth && !reduced ? 'smooth' : 'auto' });
    mark(n); schedule();
  }
  const takeOver = () => { stopped = true; car.classList.add('is-static'); };

  const onClick = (e) => {
    const t = e.target.closest && e.target.closest('[data-hb-go],[data-hb-step],[data-banner-play]');
    if (!t) return;
    takeOver(); // the visitor took control: no more auto-advance
    if (t.hasAttribute('data-banner-play')) { setTimeout(schedule); return; }
    go(t.hasAttribute('data-hb-go') ? Number(t.getAttribute('data-hb-go')) : index + Number(t.getAttribute('data-hb-step')));
  };
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const n = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (n !== index && slides[n]) { mark(n); schedule(); }
    });
  };
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); takeOver(); go(index + (e.key === 'ArrowRight' ? 1 : -1));
  };
  const onTouch = () => { takeOver(); schedule(); };
  const enter = () => { hover = true; schedule(); };
  const leave = () => { hover = false; schedule(); };
  const fin = () => { focus = true; schedule(); };
  const fout = (e) => { if (!car.contains(e.relatedTarget)) { focus = false; schedule(); } };
  const onResize = () => track.scrollTo({ left: index * track.clientWidth, behavior: 'auto' });

  car.addEventListener('click', onClick);
  car.addEventListener('keydown', onKey);
  car.addEventListener('pointerenter', enter);
  car.addEventListener('pointerleave', leave);
  car.addEventListener('focusin', fin);
  car.addEventListener('focusout', fout);
  track.addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('touchstart', onTouch, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('sikhify:banner-video', schedule);
  window.addEventListener('resize', onResize);
  mark(0); schedule();
  return () => {
    clearTimeout(timer); cancelAnimationFrame(raf);
    car.removeEventListener('click', onClick);
    car.removeEventListener('keydown', onKey);
    car.removeEventListener('pointerenter', enter);
    car.removeEventListener('pointerleave', leave);
    car.removeEventListener('focusin', fin);
    car.removeEventListener('focusout', fout);
    track.removeEventListener('scroll', onScroll);
    track.removeEventListener('touchstart', onTouch);
    document.removeEventListener('visibilitychange', schedule);
    document.removeEventListener('sikhify:banner-video', schedule);
    window.removeEventListener('resize', onResize);
  };
}

/** Opens the privacy-enhanced YouTube embed in a pop-up player; closing it removes the embed (and stops it). */
function openVideo(id, title, opener) {
  const src = youTubeEmbedUrl(id, { autoplay: '1' }); // the visitor pressed play: starting it is what they asked for
  if (!src) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'hb-video';
  dlg.setAttribute('aria-label', title || 'Video');
  dlg.innerHTML = '<div class="hb-video-box"><button type="button" class="hb-video-close" aria-label="Close video">×</button><div class="hb-video-frame"></div></div>';
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = title || 'YouTube video';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  dlg.querySelector('.hb-video-frame').appendChild(frame);
  const close = () => dlg.close();
  dlg.querySelector('.hb-video-close').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); }); // a click on the backdrop
  dlg.addEventListener('close', () => {
    dlg.remove();
    document.dispatchEvent(new CustomEvent('sikhify:banner-video'));
    if (opener && opener.isConnected) opener.focus();
  });
  document.body.appendChild(dlg);
  dlg.showModal();
  document.dispatchEvent(new CustomEvent('sikhify:banner-video'));
}

/** Click-to-play (one delegated listener per container). Returns a cleanup. */
export function wireBannerPlayers(root) {
  if (!root) return () => {};
  const onClick = (e) => {
    const btn = e.target.closest && e.target.closest('[data-banner-play]');
    if (!btn || !root.contains(btn)) return;
    openVideo(btn.getAttribute('data-banner-play'), btn.getAttribute('data-banner-title'), btn);
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
