/* ==========================================================================
   Sikhify API — lib/http.js
   A small router on node:http (no framework dependency): path params, JSON
   bodies with size limits, cookies, typed errors and security headers.
   ========================================================================== */

export class HttpError extends Error {
  constructor(status, message, { code, fields } = {}) {
    super(message);
    this.status = status;
    this.code = code || ({ 400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 409: 'conflict', 413: 'too_large', 422: 'invalid', 429: 'rate_limited' }[status] || 'error');
    this.fields = fields;
  }
}
export const badRequest = (msg, fields) => new HttpError(fields ? 422 : 400, msg, { fields });
export const notFound = (what = 'Not found') => new HttpError(404, what);
export const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);
export const unauthorized = (msg = 'Please sign in to continue') => new HttpError(401, msg);

export function createRouter() {
  const routes = [];
  const add = (method) => (pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handler, opts });
  };
  return {
    get: add('GET'), post: add('POST'), patch: add('PATCH'), put: add('PUT'), delete: add('DELETE'),
    match(method, pathname) {
      let pathMatched = false;
      for (const r of routes) {
        const m = r.re.exec(pathname);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== method) continue;
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { route: r, params };
      }
      return pathMatched ? { methodNotAllowed: true } : null;
    },
  };
}

export function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* malformed cookie */ }
  });
  return out;
}

export function serializeCookie(name, value, { maxAge, httpOnly = true, secure = false, sameSite = 'Lax', path = '/' } = {}) {
  let s = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge !== undefined) s += `; Max-Age=${Math.floor(maxAge)}`;
  if (httpOnly) s += '; HttpOnly';
  if (secure) s += '; Secure';
  return s;
}

export function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'That request is too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

export function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data === undefined ? null : data);
  res.writeHead(status, { ...API_HEADERS, ...extraHeaders, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

/* ---------- small input helpers used by route handlers */
export function str(v, { max = 1000, trim = true } = {}) {
  if (v === undefined || v === null) return '';
  let s = String(v);
  if (trim) s = s.trim();
  // Strip control characters except newline and tab.
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return s.length > max ? s.slice(0, max) : s;
}
export function int(v, { min = -Infinity, max = Infinity, fallback = null } = {}) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
export function oneOf(v, list, fallback = null) {
  return list.includes(v) ? v : fallback;
}
