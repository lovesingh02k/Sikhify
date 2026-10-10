/* ==========================================================================
   Sikhify — app/navigation.js
   Two kinds of pages live in one router:
   • Legacy pages (Home, Learn, Gurbani, Nitnem, Hukamnama, History, Rehat,
     FAQ, Media…) render HTML that their controllers wire up imperatively,
     assuming a fresh document — exactly as on the original site.
   • React pages (Community, Admin, Directory, Gurus, video pages, auth).

   React pages navigate between themselves client-side. Anything that would
   show a legacy page after a client-side path change reloads the document
   instead, so legacy controllers always start clean (no duplicate listeners).
   Hash-only changes (#artist=…, #date=…) never count as a path change.

   Scroll policy
   • A different page opened client-side (PUSH/REPLACE) starts at the top.
   • Back/forward (POP) is left to the browser's own scroll restoration.
   • Same-page URL changes (?query, #hash, Gurdwara place paths) keep their position.
   • Hash targets (#event=…, #artist=…, #comment-…) are revealed by each page
     after that reset, so nothing overrides them.
   • A legacy page reloaded for a fresh document starts at the top: a plain
     reload would restore the previous page's offset (often its footer).
   • The visitor's own reload / back-forward returns to their offset once the
     page's content exists (restoreDocumentScroll), not a clamped one.
   • Initial deep-link positioning (#topic=…, #artist=…) lands at once: a smooth
     glide started during load would be cut short by ScrollTrigger's refresh.
   ========================================================================== */
import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

let pathChangedClientSide = false;

/** Called by <App> on every render: remembers whether the path changed without a page load. */
export function useTrackClientNavigation() {
  const { pathname } = useLocation();
  const first = useRef(pathname);
  if (pathname !== first.current) pathChangedClientSide = true;
}

export const needsFreshDocument = () => pathChangedClientSide;

/** Runs `fn` with the CSS smooth-scroll glide off, so any scrolling it does lands at once. */
export function withInstantScroll(fn) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  const before = window.scrollY;
  root.style.scrollBehavior = 'auto';
  try { return fn(); } finally {
    root.style.scrollBehavior = previous;
    // Announce the jump now, not at the next frame: ScrollTrigger caches the scroll position
    // until a scroll event, and a refresh in between (e.g. on window load) would put the old one back.
    if (window.scrollY !== before) document.dispatchEvent(new Event('scroll', { bubbles: true }));
  }
}

/** Jumps to the top without the smooth-scroll glide (a new page simply starts there). */
export const scrollToTopInstantly = () => withInstantScroll(() => window.scrollTo(0, 0));

/**
 * Resets the scroll position when `pageKey` changes through a link or redirect.
 * Rendered before the routes, so it runs before the new page's layout effects:
 * ScrollTriggers and hash handlers always start from the top, never from the
 * previous page's offset.
 */
export function RouteScrollReset({ pageKey }) {
  const type = useNavigationType();
  const last = useRef(pageKey);
  useLayoutEffect(() => {
    if (last.current === pageKey) return;
    last.current = pageKey;
    pendingRestore = null; // a reload's offset belongs to the page that was reloaded
    settle();
    if (type !== 'POP') scrollToTopInstantly();
  }, [pageKey, type]);
  return null;
}

/**
 * Reloads the current URL as a fresh document that opens at the top: the browser
 * saves the offset at unload and restores it on reload, so drop to the top first.
 */
export function reloadAsFreshDocument() {
  reloadingFresh = true;
  scrollToTopInstantly();
  window.location.reload();
}

/* ---------- Reload / back-forward into a fresh document
   The browser restores the saved offset while the lazy page is still a loader,
   so it is clamped to that short document (or lost). The offset is remembered
   at unload and re-applied once, as soon as the page's own content is in place. */
const SCROLL_MEMORY = 'sikhify:scroll';
let pendingRestore = null;
let restoring = false;
let stopFollowing = null;
let reloadingFresh = false;

function readMemory() {
  try { return JSON.parse(sessionStorage.getItem(SCROLL_MEMORY)) || {}; } catch { return {}; }
}

/** Ends the restoring phase: the site's smooth scrolling and the browser's own restoration apply again. */
function settle() {
  if (stopFollowing) { stopFollowing(); stopFollowing = null; }
  if (!restoring) return;
  restoring = false;
  document.documentElement.style.scrollBehavior = '';
  // Back/forward between in-app pages (history entries made by the router) is the browser's job again.
  try { history.scrollRestoration = 'auto'; } catch { /* unsupported */ }
}

/** Called once at boot, before the first render. */
export function settleScrollRestoration() {
  const type = performance.getEntriesByType?.('navigation')[0]?.type;
  if (type === 'reload' || type === 'back_forward') {
    // The browser's own restoration would glide under html { scroll-behavior: smooth }:
    // keep scrolling instant until the page is positioned (or the visitor takes over).
    restoring = true;
    document.documentElement.style.scrollBehavior = 'auto';
    // …and it would restore the old offset while the page is still a short loader, which clamps the
    // view to the bottom — the footer showed for a moment (seconds on a slow load) before the content
    // arrived and the page jumped. The site restores the offset itself, once there is room for it.
    try { history.scrollRestoration = 'manual'; } catch { /* unsupported */ }
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((t) => window.addEventListener(t, settle, { once: true, passive: true, capture: true }));
    const y = readMemory()[window.location.href];
    // An explicit #target is positioned by the page itself.
    if (typeof y === 'number' && window.location.hash.length < 2) pendingRestore = y;
  }
  window.addEventListener('pagehide', () => {
    // The browser restores a page's offset according to the setting saved with the entry being left,
    // so it has to be "manual" now — setting it after the next load is too late. That load then
    // starts at the top and restoreDocumentScroll() moves once, when the content is there.
    try { history.scrollRestoration = 'manual'; } catch { /* unsupported */ }
    const memory = readMemory();
    delete memory[window.location.href]; // re-added last, so the 30 most recent pages are kept
    // 0 is stored too: the browser's own saved offset can lag a scroll made just before unload.
    // A fresh-document reload always means the top (the outgoing page's last ScrollTrigger
    // refresh may still put its old offset back while the reload is pending).
    memory[window.location.href] = reloadingFresh ? 0 : Math.round(window.scrollY);
    const recent = Object.entries(memory).slice(-30);
    try { sessionStorage.setItem(SCROLL_MEMORY, JSON.stringify(Object.fromEntries(recent))); } catch { /* storage blocked */ }
  });
}

/**
 * Page hooks call this once the page's content is in the DOM.
 * The remembered offset is applied in ONE move, only when the page is tall enough to show it.
 * Until then the view stays where it is (the top): never clamped to the bottom of a half-loaded
 * page, which is what made the footer flash up. If the page never gets that tall (its content
 * changed), the nearest position is used after a short wait.
 */
export function restoreDocumentScroll() {
  const y = pendingRestore;
  pendingRestore = null;
  if (y === null || y <= 0) { settle(); return; }
  const room = () => document.documentElement.scrollHeight - window.innerHeight >= y - 1;
  const jump = (to) => withInstantScroll(() => window.scrollTo(0, to));
  if (room() || typeof ResizeObserver === 'undefined') { jump(y); settle(); return; }
  // Content is still loading: wait for it to grow (or for the visitor to scroll, tap or type).
  const observer = new ResizeObserver(() => { if (room()) { jump(y); settle(); } });
  const timer = setTimeout(() => {
    // The page didn't grow that far (e.g. fewer results now): go as close as it allows.
    if (restoring) { jump(Math.min(y, Math.max(0, document.documentElement.scrollHeight - window.innerHeight))); settle(); }
  }, 3000);
  stopFollowing = () => { observer.disconnect(); clearTimeout(timer); };
  observer.observe(document.body);
}

/** Path prefixes rendered by React pages (safe for client-side <Link>). */
const REACT_PREFIXES = ['/community', '/admin', '/login', '/signup', '/forgot-password', '/reset-password', '/directory', '/gurus', '/media/', '/submit', '/image-credits', '/about', '/festivals'];

export function isReactRoute(href, reactTypePaths = []) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const path = href.split(/[?#]/)[0];
  if (REACT_PREFIXES.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p.endsWith('/') ? p : p + '/'))) return true;
  return reactTypePaths.some((p) => path === '/' + p || path.startsWith('/' + p + '/'));
}

/* Site chrome (header search, theme toggle, mobile menu) is wired once per document. */
export function markChromeReady() {
  const was = !!window.__sikhifyChromeReady;
  window.__sikhifyChromeReady = true;
  return was;
}
