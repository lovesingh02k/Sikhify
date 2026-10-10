/* ==========================================================================
   Sikhify API — app.js
   Builds the request handler: API routes under /api, uploaded images under
   /uploads, and (in production) the built Vite site from frontend/dist/ with the
   single-page-app fallback.

   Security model
   • Sessions: opaque random token in an HttpOnly, SameSite=Lax cookie; only
     its SHA-256 hash is stored. Authorization is decided here, server-side,
     from the database — never from anything the browser stores.
   • CSRF: every state-changing request must carry X-Sikhify-Request: 1 and a
     JSON body. Browsers cannot send that header cross-site without a CORS
     preflight, which this server never approves.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRouter, HttpError, sendJson, readBody, parseCookies, serializeCookie, unauthorized, forbidden } from './lib/http.js';
import { hashToken } from './lib/security.js';
import { createSharedLimiter } from './lib/rateLimit.js';
import { can } from '../../shared/roles.js';
import { parseJson, isRemoteDatabase, schemaVersion } from './db/database.js';
import { SITE_SECURITY_HEADERS } from '../../shared/securityHeaders.js';

import registerAuth from './routes/auth.js';
import registerUsers from './routes/users.js';
import registerPosts from './routes/posts.js';
import registerGroups from './routes/groups.js';
import registerNotifications from './routes/notifications.js';
import registerReports from './routes/reports.js';
import registerUploads from './routes/uploads.js';
import registerHukamnama from './routes/hukamnama.js';
import registerMedia from './routes/media.js';
import registerEntries from './routes/entries.js';
import registerSubmissions from './routes/submissions.js';
import registerAdmin from './routes/admin.js';
import registerSearch from './routes/search.js';
import registerGurdwaras from './routes/gurdwaras.js';
import registerFestivals from './routes/festivals.js';
import registerBanners from './routes/banners.js';

export const SESSION_COOKIE = 'sk_session';
const JSON_LIMIT = 200 * 1024;
const UPLOAD_LIMIT = 6 * 1024 * 1024; // base64 of a 3 MB image plus JSON overhead

const SETTINGS_DEFAULTS = {
  registration_open: true,
  community_read_only: false,
  submissions_open: true,
  community_notice: '',
};

export function createApp({ db, config, mailer, log = console }) {
  const router = createRouter();
  // Safe diagnostics only: which kind of database and its schema version (no hostnames, URLs or tokens).
  router.get('/api/health', () => ({ ok: true, service: 'sikhify-api', database: { provider: isRemoteDatabase(db) ? 'Turso/libSQL' : 'local SQLite', schemaVersion: schemaVersion(db) } }));
  // Stored in the database, so every serverless instance shares the same counters (lib/rateLimit.js).
  const limiter = (name, windowMs, max) => createSharedLimiter(db, { name, windowMs, max, log });
  const limits = {
    auth: limiter('auth', 15 * 60 * 1000, 20),
    reset: limiter('reset', 60 * 60 * 1000, 5),
    resetEmail: limiter('reset-email', 60 * 60 * 1000, 3),
    // Login: failures per account+IP and per IP, plus a looser account-wide cap. A wrong password from
    // one address can't lock the account for everyone else (see routes/auth.js).
    loginIp: limiter('login-ip', 15 * 60 * 1000, 30),
    loginFailIdIp: limiter('login-fail-id-ip', 15 * 60 * 1000, 10),
    loginFailId: limiter('login-fail-id', 60 * 60 * 1000, 100),
    post: limiter('post', 60 * 60 * 1000, 30),
    comment: limiter('comment', 60 * 60 * 1000, 120),
    report: limiter('report', 24 * 60 * 60 * 1000, 40),
    submission: limiter('submission', 24 * 60 * 60 * 1000, 200),
    // Visitors without an account, per IP address: saved submissions (a short burst limit and a daily cap —
    // counted only when a submission is stored), plus a generous cap on attempts of any kind.
    guestSubmission: limiter('guest-submission', 60 * 60 * 1000, 30),
    guestSubmissionDaily: limiter('guest-submission-day', 24 * 60 * 60 * 1000, 100),
    guestAttempt: limiter('guest-attempt', 60 * 60 * 1000, 300),
    upload: limiter('upload', 60 * 60 * 1000, 60),
    group: limiter('group', 24 * 60 * 60 * 1000, 10),
  };

  /* ---------- helpers shared by route modules */
  const settings = {
    get(key) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? parseJson(row.value, SETTINGS_DEFAULTS[key]) : SETTINGS_DEFAULTS[key];
    },
    all() {
      const out = { ...SETTINGS_DEFAULTS };
      for (const r of db.prepare('SELECT key, value FROM settings').all()) if (r.key in out) out[r.key] = parseJson(r.value, out[r.key]);
      return out;
    },
    set(key, value) {
      db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, JSON.stringify(value), new Date().toISOString());
    },
    DEFAULTS: SETTINGS_DEFAULTS,
  };

  function notify(userId, { type, actorId = null, message, link = '' }) {
    if (!userId || userId === actorId) return;
    db.prepare('INSERT INTO notifications (user_id, type, actor_id, message, link) VALUES (?, ?, ?, ?, ?)').run(userId, type, actorId, message.slice(0, 300), link);
  }
  /**
   * Notifies every active staff member who has `capability` (e.g. everyone who reviews
   * submissions). The person who caused it is not notified about their own action.
   */
  function notifyStaff(capability, { type, actorId = null, message, link = '' }) {
    try {
      for (const u of db.prepare("SELECT id, role, status FROM users WHERE role IN ('moderator','admin') AND status = 'active'").all()) {
        if (can(u, capability)) notify(Number(u.id), { type, actorId, message, link });
      }
    } catch (err) {
      log.error?.('[notify] staff notification failed', err && err.message); // never fails the visitor's request
    }
  }
  function logModeration(actorId, action, targetType, targetId, note = '') {
    db.prepare('INSERT INTO moderation_log (actor_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)').run(actorId, action, targetType, targetId, String(note).slice(0, 1000));
  }
  function rate(limiter, key) {
    const r = limits[limiter].hit(key);
    if (!r.ok) throw new HttpError(429, `Too many attempts — please wait ${Math.ceil(r.retryAfter / 60)} minute(s) and try again`);
  }

  const deps = { db, config, mailer, log, settings, notify, notifyStaff, logModeration, rate, limits };
  [registerAuth, registerUsers, registerPosts, registerGroups, registerNotifications, registerReports, registerUploads,
    registerHukamnama, registerMedia, registerEntries, registerSubmissions, registerAdmin, registerSearch, registerGurdwaras, registerFestivals, registerBanners]
    .forEach((register) => register(router, deps));

  function loadSession(req) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return { user: null, session: null };
    const row = db.prepare(`SELECT s.token_hash, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).get(hashToken(token));
    if (!row) return { user: null, session: null, clear: true };
    if (row.expires_at <= new Date().toISOString() || row.status === 'banned') {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash);
      return { user: null, session: null, clear: true };
    }
    const { token_hash, expires_at, ...user } = row;
    return { user, session: { tokenHash: token_hash, expiresAt: expires_at } };
  }

  function clientIp(req) {
    if (config.trustProxy) {
      const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if (fwd) return fwd;
    }
    return req.socket.remoteAddress || 'unknown';
  }

  async function handleApi(req, res, url) {
    const cookies = [];
    try {
      const match = router.match(req.method, url.pathname);
      if (!match) throw new HttpError(404, 'Not found');
      if (match.methodNotAllowed) throw new HttpError(405, 'Method not allowed');

      const mutating = req.method !== 'GET' && req.method !== 'HEAD';
      if (mutating && req.headers['x-sikhify-request'] !== '1') throw forbidden('Request blocked (missing request header)');

      let body = {};
      if (mutating) {
        const raw = await readBody(req, match.route.opts.upload ? UPLOAD_LIMIT : JSON_LIMIT);
        if (raw.length) {
          if (!/application\/json/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Send JSON');
          try { body = JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'Malformed JSON'); }
          if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
        }
      }

      const auth = loadSession(req);
      if (auth.clear) cookies.push(serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: config.cookieSecure }));
      const c = {
        req, res, url,
        params: match.params,
        query: url.searchParams,
        body,
        user: auth.user,
        session: auth.session,
        ip: clientIp(req),
        setCookie: (s) => cookies.push(s),
        requireUser() {
          if (!auth.user) throw unauthorized();
          return auth.user;
        },
        require(capability) {
          if (!auth.user) throw unauthorized();
          if (!can(auth.user, capability)) {
            if (auth.user.status === 'suspended') throw forbidden('Your account is suspended, so this action is unavailable');
            throw forbidden();
          }
          return auth.user;
        },
      };
      const result = await match.route.handler(c);
      const status = result && result.__status ? result.__status : 200;
      const data = result && result.__status ? result.data : result;
      sendJson(res, status, data === undefined ? { ok: true } : data, cookies.length ? { 'Set-Cookie': cookies } : {});
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: { code: err.code, message: err.message, fields: err.fields } }, cookies.length ? { 'Set-Cookie': cookies } : {});
      } else if (err && /UNIQUE constraint failed/.test(err.message)) {
        sendJson(res, 409, { error: { code: 'conflict', message: 'That already exists' } });
      } else {
        log.error('[api] unexpected error', req.method, url.pathname, err);
        sendJson(res, 500, { error: { code: 'server', message: 'Something went wrong on our side. Please try again.' } });
      }
    }
  }

  /* ---------- static: uploads + built site */
  const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  };
  /** `site`: the built site's own files get the site security headers (uploads set their own). */
  function serveFile(res, file, { cache = 'no-cache', method = 'GET', site = false } = {}) {
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    res.writeHead(200, {
      ...(site ? SITE_SECURITY_HEADERS : {}),
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    if (method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }
  function safeJoin(base, rel) {
    const p = path.resolve(base, '.' + path.posix.normalize('/' + rel));
    return p.startsWith(path.resolve(base) + path.sep) ? p : null;
  }
  function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

  return async function handler(req, res) {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }

    if (pathname === '/api' || pathname.startsWith('/api/')) return handleApi(req, res, url);

    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }

    if (pathname.startsWith('/uploads/')) {
      let rel = pathname.slice('/uploads/'.length);
      let stored = db.prepare('SELECT mime, bytes, data FROM uploads WHERE path = ?').get(rel);
      // A display-size variant ("….w960.webp", see routes/uploads.js) that was never made — the image was
      // already small, or it predates variants — is answered with the original image.
      const variant = /^(.+)\.w\d+\.webp$/.exec(rel);
      if (!stored && variant) {
        const base = db.prepare('SELECT path FROM uploads WHERE path LIKE ? AND path NOT LIKE ? ORDER BY id LIMIT 1').get(variant[1] + '.%', '%.w%.webp');
        if (base) { rel = base.path; stored = db.prepare('SELECT mime, bytes, data FROM uploads WHERE path = ?').get(rel); }
      }
      if (stored && stored.data) {
        const buf = Buffer.isBuffer(stored.data) ? stored.data : Buffer.from(stored.data);
        res.writeHead(200, {
          'Content-Type': stored.mime,
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        });
        if (req.method === 'HEAD') return res.end();
        return res.end(buf);
      }
      const file = safeJoin(config.uploadDir, rel);
      if (file && /\.(png|jpe?g|webp|gif)$/i.test(file) && isFile(file)) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
        return serveFile(res, file, { cache: 'public, max-age=31536000, immutable', method: req.method });
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    if (config.serveStatic) {
      const file = safeJoin(config.distDir, pathname);
      if (file && isFile(file)) {
        return serveFile(res, file, { cache: pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', method: req.method, site: true });
      }
      const index = path.join(config.distDir, 'index.html');
      if (isFile(index)) return serveFile(res, index, { method: req.method, site: true });
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  };
}

/** Returns a non-200 status with data from a handler. */
export const withStatus = (status, data) => ({ __status: status, data });
