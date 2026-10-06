/* ==========================================================================
   Sikhify.in — status/messages.js
   One copy table for every status the site can show: full-page screens
   (React StatusView) and inline states rendered by the page controllers.
   Messages are written for visitors — never include URLs, stack traces or
   API details here. Developers get details in the console (development only).
   ========================================================================== */

export const STATUS = {
  notFound: {
    code: '404',
    title: 'Page not found',
    text: "The page you're looking for doesn't exist or may have moved. Let's get you back on the path.",
    reason: "This item wasn't found at the source.",
  },
  unauthorized: {
    code: '401',
    title: 'Please sign in to continue',
    text: 'This page is only available to signed-in visitors.',
    reason: 'The source asked for a sign-in before sharing this content.',
  },
  forbidden: {
    code: '403',
    title: "You don't have access to this page",
    text: "This page isn't available to your account. If you think this is a mistake, please try again later.",
    reason: 'The source declined to share this content.',
  },
  server: {
    code: '500',
    title: 'Something went wrong',
    text: 'An unexpected problem stopped this page from loading. Please try again in a moment.',
    reason: 'The source is having trouble right now. Please try again in a little while.',
  },
  network: {
    title: 'Unable to connect',
    text: "We couldn't reach the server. Check your internet connection and try again.",
    reason: 'Unable to connect. Check your internet connection and try again.',
  },
  timeout: {
    title: 'This is taking too long',
    text: 'The request timed out. The service may be busy — please try again.',
    reason: 'The request timed out. The service may be busy — please try again.',
  },
  empty: {
    title: 'No information available yet',
    text: 'There is nothing to show here yet. Please check back soon.',
  },
  loading: {
    title: 'Loading…',
    text: '',
  },
};

/**
 * Maps a failed request (or thrown error) to a STATUS key.
 * Errors from `fetchJson` carry `kind`; anything else is treated by its shape.
 */
export function statusKind(error) {
  if (!error) return 'server';
  if (error.kind && STATUS[error.kind]) return error.kind;
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'timeout';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network';
  if (error instanceof TypeError) return 'network';
  return 'server';
}

const KIND_BY_STATUS = { 401: 'unauthorized', 403: 'forbidden', 404: 'notFound', 408: 'timeout', 504: 'timeout' };

/**
 * fetch() + JSON with a timeout and a classified error (`error.kind`).
 * Keeps the response details on the error for developers; visitors only ever
 * see the STATUS copy for `error.kind`.
 */
export function fetchJson(url, { timeout = 15000, ...init } = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  return fetch(url, controller ? { ...init, signal: controller.signal } : init)
    .then((res) => {
      if (!res.ok) {
        const err = new Error('Request failed with status ' + res.status);
        err.status = res.status;
        err.kind = KIND_BY_STATUS[res.status] || 'server';
        throw err;
      }
      return res.json();
    })
    .catch((error) => {
      if (!error.kind) error.kind = statusKind(error);
      if (import.meta.env.DEV) console.warn('[Sikhify] request failed:', url, error);
      throw error;
    })
    .finally(() => { if (timer) clearTimeout(timer); });
}
