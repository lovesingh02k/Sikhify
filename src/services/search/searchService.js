/* ==========================================================================
   Sikhify — searchService
   The site-wide search overlay (controllers/coreController.js) indexes the
   bundled content. This adds the records that live in the database — the
   knowledge directory, published Hukamnamas, public community groups and
   posts — and the live Media catalogue. If the API isn't reachable the
   overlay still searches everything bundled with the site.
   ========================================================================== */
import { get, qs } from '../api/client.js';

let remote = null;

export const searchService = {
  /** Resolves to { media, records } or null when the API is unavailable. */
  remoteIndex() {
    if (!remote) remote = get('/api/search/index', { timeout: 8000 }).catch(() => null);
    return remote;
  },
  /** Live Gurdwara Directory matches (server-side search; verified listings only). Resolves to [] when unavailable. */
  gurdwaras(q) {
    return get('/api/gurdwaras' + qs({ q, pageSize: 20 }), { timeout: 6000 }).then((d) => d.items.slice(0, 5)).catch(() => []);
  },
};
