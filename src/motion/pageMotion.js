/* ==========================================================================
   Sikhify.in — motion/pageMotion.js
   Page-level motion for every route:
   • hero entrance (home hero or the shared .page-hero), sequenced with a timeline
   • scroll reveals for cards and section blocks (ScrollTrigger.batch)
   • content the page controllers render later (search, filters, lazy data)
     is picked up by a MutationObserver and revealed the same way
   • in-place content swaps (lesson view, Bani reader, Hukamnama card) fade in
   Everything lives inside gsap.matchMedia(), so prefers-reduced-motion users
   get no movement at all and every tween, trigger, split and observer is
   reverted by the returned cleanup function.

   Accessibility: reveals animate opacity only — never visibility — so content
   stays reachable by keyboard and screen readers, and focusing an element that
   has not been revealed yet reveals it immediately.
   ========================================================================== */
import { gsap, ScrollTrigger, SplitText, MEDIA, EASE } from './gsap.js';

/** Blocks revealed as they scroll into view (static markup and controller-rendered). */
const REVEAL = [
  '.dashboard-grid > *',
  '.content-cards-grid > *',
  '.newsletter-row',
  '.sk-toolbar',
  '.sk-card',
  '.sk-timeline-item',
  '.sk-era-head',
  '.sk-acc',
  '.sk-collapse',
  '.sk-empty',
  '.sk-note',
  '.sk-official',
  '.guru-strip',
  '.sk-section-title',
  '.sk-section-sub',
  'main .sk-eyebrow',
  '[data-motion="reveal"]',
].join(', ');

/** Containers whose content is swapped in place: the container fades, children don't stagger. */
const SWAP = '#learn-lesson, #gb-detail, #media-artist, [data-bani-reader], [data-hk-card], [data-lines]';

/** Never touched by the reveal system. */
const SKIP = '.page-hero, .hero-section, [data-motion="off"]';

const FOOTER = '.site-footer .footer-grid > *, .site-footer .footer-bottom';

/**
 * Starts motion for the current page. Call after the page markup is in the DOM
 * (useLayoutEffect) and before page controllers render, so their output is observed.
 * @param {{ hero?: boolean }} [options] hero: false when a page runs its own entrance.
 * @returns {() => void} cleanup
 */
export function startPageMotion({ hero = true } = {}) {
  const main = document.getElementById('main-content');
  if (!main) return () => {};

  const mm = gsap.matchMedia();
  mm.add(MEDIA.motion, (context) => {
    const startedAt = performance.now();
    const seen = new WeakSet();
    let triggers = [];

    /* ---------- Header: subtle elevated state once the page scrolls */
    const header = document.querySelector('.site-header');
    if (header) {
      ScrollTrigger.create({
        start: 12,
        end: 'max',
        toggleClass: { targets: header, className: 'is-scrolled' },
      });
    }

    /* ---------- Hero entrance */
    if (hero) {
      if (main.querySelector('.hero-section')) homeHero(main);
      else if (main.querySelector('.page-hero')) pageHero(main.querySelector('.page-hero'));
    }

    /* ---------- Scroll reveals */
    function collect(root) {
      const out = [];
      const consider = (el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (el.closest(SKIP)) return;
        const parent = el.parentElement;
        // Nested blocks ride along with their revealed ancestor or swapped container.
        if (parent && (parent.closest(REVEAL) || parent.closest(SWAP))) return;
        out.push(el);
      };
      if (root.matches?.(REVEAL)) consider(root);
      root.querySelectorAll?.(REVEAL).forEach(consider);
      return out;
    }

    function reveal(batch, quick) {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: quick ? 0.45 : 0.8,
        ease: EASE.out,
        overwrite: true,
        clearProps: 'opacity,transform',
        stagger: {
          each: Math.min(0.08, 0.6 / batch.length),
          onComplete() { this.targets()[0]?.removeAttribute('data-reveal'); },
        },
      });
      // Card images settle into place as their card arrives.
      const imgs = batch.flatMap((el) => [...el.querySelectorAll('.content-card img, .sk-media-thumb img')]);
      if (imgs.length) gsap.fromTo(imgs, { scale: 1.12 }, { scale: 1, duration: 1.2, ease: EASE.soft, clearProps: 'transform' });
    }

    function watch(elements) {
      if (!elements.length) return;
      // Re-renders driven by the visitor (search, filters) move less and faster than the first paint.
      const quick = performance.now() - startedAt > 1200;
      elements.forEach((el) => el.setAttribute('data-reveal', ''));
      gsap.set(elements, { opacity: 0, y: quick ? 12 : 28 });
      triggers.push(...ScrollTrigger.batch(elements, {
        start: 'top 92%',
        once: true,
        interval: 0.06,
        batchMax: 12,
        onEnter: (batch) => reveal(batch, quick),
      }));
    }

    function prune() {
      triggers = triggers.filter((t) => {
        if (t.trigger && t.trigger.isConnected) return true;
        t.kill();
        return false;
      });
    }

    watch(collect(main));
    watch([...document.querySelectorAll(FOOTER)].filter((el) => !seen.has(el) && (seen.add(el), true)));

    // Content in the last few pixels of the page can't scroll up to the trigger line:
    // reveal whatever is still pending and on screen once the page is scrolled to the end.
    ScrollTrigger.create({
      start: () => ScrollTrigger.maxScroll(window) - 4,
      end: 'max',
      onEnter: () => {
        const pending = [...document.querySelectorAll('[data-reveal]')].filter((el) => el.getBoundingClientRect().top < innerHeight);
        if (pending.length) reveal(pending, true);
      },
    });

    /* ---------- In-place swaps */
    function fadeSwap(el) {
      gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: EASE.soft, overwrite: 'auto', clearProps: 'opacity,transform' });
    }

    /* ---------- Watch for controller-rendered content */
    const added = new Set();
    const swapped = new Set();
    let frame = 0;
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 180);
    };
    // Wrapped so tweens and triggers created later (from the observer) are still recorded and reverted.
    const flush = context.add(null, () => {
      frame = 0;
      prune();
      swapped.forEach(fadeSwap);
      const fresh = [];
      added.forEach((node) => { if (node.isConnected) fresh.push(...collect(node)); });
      added.clear();
      swapped.clear();
      watch(fresh);
      scheduleRefresh();
    });
    const observer = new MutationObserver((records) => {
      let relevant = false;
      for (const r of records) {
        if (r.type === 'attributes') { relevant = true; continue; }
        let elementAdded = false;
        r.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          elementAdded = true;
          if (n.matches(REVEAL) || n.querySelector(REVEAL)) added.add(n);
        });
        if (!elementAdded) continue; // text-only updates (audio timers, counters)
        relevant = true;
        if (r.target.matches?.(SWAP) && performance.now() - startedAt > 400) swapped.add(r.target);
      }
      if (relevant && !frame) frame = requestAnimationFrame(flush);
    });
    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });

    /* ---------- Never keep focused content invisible */
    const onFocusIn = (e) => {
      const el = e.target.closest?.('[data-reveal]');
      if (!el) return;
      gsap.to(el, { opacity: 1, y: 0, duration: 0.2, overwrite: true, clearProps: 'opacity,transform' });
      el.removeAttribute('data-reveal');
    };
    const onBeforePrint = () => {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        gsap.set(el, { clearProps: 'opacity,transform' });
        el.removeAttribute('data-reveal');
      });
    };
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('beforeprint', onBeforePrint);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(refreshTimer);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('beforeprint', onBeforePrint);
      triggers.forEach((t) => t.kill());
      document.querySelectorAll('[data-reveal]').forEach((el) => el.removeAttribute('data-reveal'));
    };
  });

  return () => mm.revert();
}

/* ------------------------------------------------------------------------ */

/**
 * Reveals a heading line by line behind a mask. The heading is hidden until it
 * has been split (SplitText waits for web fonts), so it never flashes unstyled.
 */
export function revealLines(el, { delay = 0 } = {}) {
  if (!el) return;
  gsap.set(el, { opacity: 0 });
  try {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        gsap.set(el, { opacity: 1 });
        return gsap.from(self.lines, { yPercent: 110, duration: 1.05, ease: EASE.expo, stagger: 0.1, delay });
      },
    });
  } catch {
    gsap.to(el, { opacity: 1, duration: 0.6, delay });
  }
}

function homeHero(main) {
  const hero = main.querySelector('.hero-section');
  const bg = hero.querySelector('.hero-bg-image');
  const tl = gsap.timeline({ defaults: { ease: EASE.out } });
  if (bg) tl.fromTo(bg, { scale: 1.1 }, { scale: 1, duration: 2.2, ease: EASE.soft }, 0);
  tl.from(hero.querySelector('.hero-overlay'), { opacity: 0.55, duration: 1.4, ease: EASE.soft }, 0);
  revealLines(hero.querySelector('.hero-title'), { delay: 0.15 });
  tl.from(hero.querySelectorAll('.hero-subtitle, .hero-content .flex > a'), { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.55);

  const quick = main.querySelector('.quicklinks-card');
  if (quick) {
    tl.from(quick, { y: 40, opacity: 0, duration: 0.9 }, 0.7);
    tl.from(quick.querySelectorAll('.quicklink-item'), { y: 14, opacity: 0, duration: 0.6, stagger: 0.05 }, 0.85);
  }

  // Gentle depth: the photograph drifts slower than the page.
  if (bg) {
    gsap.to(bg, {
      yPercent: 14,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  }
}

function pageHero(ph) {
  const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: 0.7 } });
  tl.from(ph.querySelectorAll('.breadcrumbs li, .page-hero-eyebrow'), { y: 12, opacity: 0, stagger: 0.05 }, 0.05);
  revealLines(ph.querySelector('.page-hero-title'), { delay: 0.1 });
  tl.from(ph.querySelectorAll('.page-hero-sub'), { y: 16, opacity: 0 }, 0.35);
  tl.from(ph.querySelectorAll('.sk-progress-card, .page-subnav > *, [data-motion="hero-item"]'), { y: 14, opacity: 0, stagger: 0.05 }, 0.45);
}
