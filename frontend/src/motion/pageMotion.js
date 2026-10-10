/* ==========================================================================
   Sikhify.in — motion/pageMotion.js
   Page-level motion for every route:
   • hero entrance (home hero or the shared .page-hero), sequenced with a timeline
   • scroll reveals for cards and section blocks (IntersectionObserver — it needs no
     scroll handler and no position cache, so a reveal can't go stale when content
     above it loads, and nothing is left invisible)
   • content the page controllers render later (search, filters, lazy data)
     is picked up by a MutationObserver and revealed the same way
   • in-place content swaps (lesson view, Bani reader, Hukamnama card) fade in
   Everything lives inside gsap.matchMedia(), so prefers-reduced-motion users
   get no movement at all and every tween, trigger, split and observer is
   reverted by the returned cleanup function.

   Low-power devices (Save-Data, ≤ 2 GB memory, or a phone with ≤ 4 cores) skip the
   scroll reveals and the hero parallax: content is simply there.

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
/** Phones and tablets that would stutter on scroll-linked work. */
function lowPowerDevice() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  if (nav.connection && nav.connection.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return !!coarse && typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
}

export function startPageMotion({ hero = true } = {}) {
  const main = document.getElementById('main-content');
  if (!main) return () => {};
  const lite = lowPowerDevice();

  const mm = gsap.matchMedia();
  mm.add(MEDIA.motion, (context) => {
    const startedAt = performance.now();
    const seen = new WeakSet();

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
      if (main.querySelector('.hero-section')) homeHero(main, { parallax: !lite });
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
    }

    // Elements entering the viewport together are revealed together (staggered). The observer works
    // from live layout, so content that moves (images loading, results arriving) is still revealed.
    // Recorded in the matchMedia context, so a page change reverts tweens still running.
    const revealIn = context.add(null, (batch, quick) => { for (let i = 0; i < batch.length; i += 12) reveal(batch.slice(i, i + 12), quick); });
    const quickOf = new WeakMap();
    const pending = new Set(); // observed, not yet revealed
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      if (!batch.length) return;
      batch.forEach((el) => { io.unobserve(el); pending.delete(el); });
      revealIn(batch, batch.some((el) => quickOf.get(el)));
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });

    function watch(elements) {
      if (!elements.length || !io || lite) return;
      // Re-renders driven by the visitor (search, filters) move less and faster than the first paint.
      const quick = performance.now() - startedAt > 1200;
      elements.forEach((el) => { el.setAttribute('data-reveal', ''); quickOf.set(el, quick); });
      gsap.set(elements, { opacity: 0, y: quick ? 10 : 20 });
      elements.forEach((el) => { pending.add(el); io.observe(el); });
    }

    watch(collect(main));
    watch([...document.querySelectorAll(FOOTER)].filter((el) => !seen.has(el) && (seen.add(el), true)));

    /* ---------- In-place swaps */
    function fadeSwap(el) {
      gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: EASE.soft, overwrite: 'auto', clearProps: 'opacity,transform' });
    }

    /* ---------- Watch for controller-rendered content */
    const added = new Set();
    const swapped = new Set();
    let frame = 0;
    // The few remaining ScrollTriggers (header state, hero parallax) need fresh positions after the page
    // height changes — but a refresh forces a full layout, so it runs at most once per quiet 250 ms, never
    // per mutation. "Safe" (true): deferred until any scroll in progress has ended, so a smooth scroll
    // (deep link, "back to top", pagination) is never frozen halfway.
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(true), 250);
    };
    // Wrapped so tweens created later (from the observer) are still recorded and reverted.
    const flush = context.add(null, () => {
      frame = 0;
      // Stop observing elements React has removed (search results replaced, filters changed).
      pending.forEach((el) => { if (!el.isConnected) { io.unobserve(el); pending.delete(el); } });
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
      if (io) io.disconnect();
      clearTimeout(refreshTimer);
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('beforeprint', onBeforePrint);
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

/** Adds a from() tween only when there is something to animate (GSAP warns about empty targets). */
function fromIfAny(tl, targets, vars, at) {
  const list = targets && targets.length !== undefined ? targets : targets ? [targets] : [];
  if (list.length) tl.from(list, vars, at);
}

function homeHero(main, { parallax = true } = {}) {
  const hero = main.querySelector('.hero-section');
  const bg = hero.querySelector('.hero-bg-image');
  const tl = gsap.timeline({ defaults: { ease: EASE.out } });
  // (No scale-in on the photograph: on phones it read as the page zooming by itself.)
  fromIfAny(tl, hero.querySelector('.hero-overlay'), { opacity: 0.55, duration: 1.4, ease: EASE.soft }, 0);
  revealLines(hero.querySelector('.hero-title'), { delay: 0.15 });
  fromIfAny(tl, hero.querySelectorAll('.hero-subtitle, .hero-content .flex > a'), { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.55);

  const quick = main.querySelector('.quicklinks-card');
  if (quick) {
    tl.from(quick, { y: 40, opacity: 0, duration: 0.9 }, 0.7);
    fromIfAny(tl, quick.querySelectorAll('.quicklink-item'), { y: 14, opacity: 0, duration: 0.6, stagger: 0.05 }, 0.85);
  }

  // Gentle depth: the photograph drifts slower than the page (skipped on low-power devices).
  if (bg && parallax) {
    gsap.to(bg, {
      yPercent: 14,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  }
}

function pageHero(ph) {
  const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: 0.7 } });
  fromIfAny(tl, ph.querySelectorAll('.breadcrumbs li, .page-hero-eyebrow'), { y: 12, opacity: 0, stagger: 0.05 }, 0.05);
  revealLines(ph.querySelector('.page-hero-title'), { delay: 0.1 });
  fromIfAny(tl, ph.querySelectorAll('.page-hero-sub'), { y: 16, opacity: 0 }, 0.35);
  fromIfAny(tl, ph.querySelectorAll('.sk-progress-card, .page-subnav > *, [data-motion="hero-item"]'), { y: 14, opacity: 0, stagger: 0.05 }, 0.45);
}
