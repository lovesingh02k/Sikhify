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
   ========================================================================== */
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';

let pathChangedClientSide = false;

/** Called by <App> on every render: remembers whether the path changed without a page load. */
export function useTrackClientNavigation() {
  const { pathname } = useLocation();
  const first = useRef(pathname);
  if (pathname !== first.current) pathChangedClientSide = true;
}

export const needsFreshDocument = () => pathChangedClientSide;

/** Path prefixes rendered by React pages (safe for client-side <Link>). */
const REACT_PREFIXES = ['/community', '/admin', '/login', '/signup', '/forgot-password', '/reset-password', '/directory', '/gurus', '/media/', '/submit', '/image-credits'];

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
