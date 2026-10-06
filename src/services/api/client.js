/* ==========================================================================
   Sikhify — services/api/client.js
   The single HTTP client for the Sikhify API (same origin, under /api).
   • Sends the session cookie and the CSRF header the server requires.
   • Errors carry `kind` (the STATUS keys in status/messages.js), `status`,
     a visitor-friendly `message` and per-field `fields` for forms.
   • If the site is hosted without the API (static hosting), requests fail
     with kind "unavailable" — callers show an honest state or fall back.
   ========================================================================== */
import { statusKind } from '../../status/messages.js';

const TIMEOUT = 15000;
let apiMissing = false;

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'server', code, fields } = {}) {
    super(message);
    this.status = status;
    this.kind = kind;
    this.code = code;
    this.fields = fields || null;
  }
}

const KIND_BY_STATUS = { 401: 'unauthorized', 403: 'forbidden', 404: 'notFound', 408: 'timeout', 429: 'rateLimited', 502: 'server', 503: 'server', 504: 'timeout' };

export async function api(method, path, body, { timeout = TIMEOUT, signal } = {}) {
  if (apiMissing) throw new ApiError('The Sikhify community service is not available on this server.', { kind: 'unavailable' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-Sikhify-Request': '1' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (signal && signal.aborted) throw err;
    const kind = err.name === 'AbortError' ? 'timeout' : statusKind(err);
    throw new ApiError(kind === 'timeout' ? 'The request timed out. Please try again.' : "We couldn't reach the server. Check your connection and try again.", { kind });
  } finally {
    clearTimeout(timer);
  }

  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    // Static hosting answers /api/* with the HTML app shell (or a proxy error page).
    if (res.ok || res.status === 404) apiMissing = true;
    throw new ApiError('The Sikhify community service is not available on this server.', { kind: 'unavailable', status: res.status });
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const e = (data && data.error) || {};
    throw new ApiError(e.message || 'Something went wrong. Please try again.', {
      status: res.status, code: e.code, fields: e.fields, kind: KIND_BY_STATUS[res.status] || (res.status >= 500 ? 'server' : 'invalid'),
    });
  }
  return data;
}

export const get = (path, opts) => api('GET', path, undefined, opts);
export const post = (path, body = {}, opts) => api('POST', path, body, opts);
export const patch = (path, body = {}, opts) => api('PATCH', path, body, opts);
export const del = (path, opts) => api('DELETE', path, undefined, opts);

/** Builds a query string, skipping empty values. */
export function qs(params) {
  const p = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
}

export const isApiUnavailable = (err) => !!err && err.kind === 'unavailable';
