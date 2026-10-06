/* ==========================================================================
   Sikhify — shared/youtube.js
   YouTube URL parsing, shared by the browser (Media pages, admin forms) and the
   API server (validating video URLs before they are stored). No network calls.
   ========================================================================== */

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);

/** True for a syntactically valid YouTube video ID (11 URL-safe characters). */
export function isYouTubeVideoId(value) {
  return typeof value === 'string' && ID_RE.test(value);
}

/**
 * Extracts the video ID from any common YouTube URL form, or returns null.
 * Supported: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID,
 * youtube.com/shorts/ID, youtube.com/live/ID, youtube.com/v/ID, the
 * youtube-nocookie.com embed host, and a bare 11-character ID.
 * Nothing is guessed: anything else returns null.
 */
export function getYouTubeVideoId(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (isYouTubeVideoId(raw)) return raw;

  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  let id = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = parts[0] || null;
  } else if (HOSTS.has(host)) {
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v', 'e'].includes(parts[0])) id = parts[1] || null;
    else if (parts.length === 0 && url.searchParams.get('v')) id = url.searchParams.get('v');
  }
  return isYouTubeVideoId(id) ? id : null;
}

/** Privacy-enhanced embed URL (no cookies until the visitor plays the video). */
export function youTubeEmbedUrl(id, params = {}) {
  if (!isYouTubeVideoId(id)) return null;
  const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1', ...params });
  return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
}

export function youTubeWatchUrl(id) {
  return isYouTubeVideoId(id) ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function youTubeThumbnail(id, quality = 'hqdefault') {
  return isYouTubeVideoId(id) ? `https://i.ytimg.com/vi/${id}/${quality}.jpg` : null;
}
