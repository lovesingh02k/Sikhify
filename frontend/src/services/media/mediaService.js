/* ==========================================================================
   Sikhify — mediaService
   The Sikh Media catalogue (artists + YouTube videos). The API's database is
   the source of truth (admins manage it at /admin/media). If the API isn't
   reachable — e.g. the site is deployed as static files only — the verified
   catalogue bundled in shared/data/media.js is used instead, so Media always works.
   ========================================================================== */
import { get } from '../api/client.js';
import { getYouTubeVideoId, youTubeEmbedUrl, youTubeWatchUrl, youTubeThumbnail, isYouTubeVideoId } from '../../../../shared/youtube.js';

let catalogPromise = null;

async function bundled() {
  const mod = await import('../../../../shared/data/media.js');
  return { ...mod.default, origin: 'bundled' };
}

export const mediaService = {
  /** Resolves to { categories, artists, origin: 'api' | 'bundled' } (cached per page). */
  catalog() {
    if (!catalogPromise) {
      catalogPromise = get('/api/media', { timeout: 8000 })
        .then((d) => ({ ...d, origin: 'api' }))
        .catch(() => bundled());
    }
    return catalogPromise;
  },

  /**
   * Makes window.SikhifyData.media the live catalogue before the legacy Media
   * page controller and the site search read it.
   */
  async installCatalog() {
    const cat = await mediaService.catalog();
    window.SikhifyData = window.SikhifyData || {};
    window.SikhifyData.media = { categories: cat.categories, artists: cat.artists };
    return cat;
  },

  /** { video, artist, related } for a YouTube video ID, or null if it isn't in the catalogue. */
  async video(id) {
    if (!isYouTubeVideoId(id)) return null;
    try {
      return await get(`/api/media/videos/${id}`, { timeout: 8000 });
    } catch (err) {
      if (err.kind === 'notFound') return null;
      // API unavailable: answer from the bundled catalogue.
      const cat = await bundled();
      const artist = cat.artists.find((a) => a.videos.some((v) => v.id === id));
      if (!artist) return null;
      const video = artist.videos.find((v) => v.id === id);
      const related = [
        ...artist.videos.filter((v) => v.id !== id).map((v) => ({ ...v, artist: { id: artist.id, name: artist.name } })),
        ...cat.artists.filter((a) => a.category === artist.category && a.id !== artist.id).slice(0, 3)
          .flatMap((a) => a.videos.slice(0, 2).map((v) => ({ ...v, artist: { id: a.id, name: a.name } }))),
      ];
      return { video: { description: '', ...video }, artist: { ...artist, videos: [] }, related };
    }
  },
};

export const youtubeService = { getYouTubeVideoId, youTubeEmbedUrl, youTubeWatchUrl, youTubeThumbnail, isYouTubeVideoId };
