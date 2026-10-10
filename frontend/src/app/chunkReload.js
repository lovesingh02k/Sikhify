/* ==========================================================================
   Sikhify — app/chunkReload.js
   A page's code is downloaded the first time it is opened. If the site was
   updated (a new deploy, or the dev server restarted) while a tab was open,
   the old tab asks for files that no longer exist and the page fails with
   "Failed to fetch dynamically imported module". Reloading fetches the new
   version — so we do that once, automatically, instead of showing an error.
   A per-page guard (sessionStorage, 30 s) stops a reload loop when the visitor
   really is offline: the second failure shows the normal error screen.
   ========================================================================== */
const KEY = 'sikhify:chunk-reload';
const WINDOW_MS = 30000;

export function isChunkLoadError(error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i
    .test(String((error && (error.message || error.name)) || error || ''));
}

/** Reloads the page once for this URL; returns false if it already tried (or is offline). */
export function reloadOnceForNewVersion() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const here = window.location.pathname + window.location.search;
  try {
    const last = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (last && last.path === here && Date.now() - last.at < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, JSON.stringify({ path: here, at: Date.now() }));
  } catch { /* storage unavailable: still try once */ }
  window.location.reload();
  return true;
}

/** Vite fires this when a lazy page (or its CSS) fails to load. */
export function installChunkReload() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
