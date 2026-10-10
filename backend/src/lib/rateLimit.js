/* ==========================================================================
   Sikhify API — lib/rateLimit.js
   Fixed-window rate limits stored in the database, so they hold across every
   serverless instance and survive cold starts (an in-memory counter on Vercel
   is per instance and resets often).

   • One atomic statement per hit (INSERT … ON CONFLICT … RETURNING): concurrent
     requests cannot slip past the limit by racing a read and a write.
   • peek() reads a counter without adding to it (e.g. "too many failed logins?").
   • Expired rows are deleted now and then; rows are tiny (key, count, reset_at).
   • If the database is unavailable the limiter falls back to the in-memory one
     (lib/security.js) rather than letting every request through.
   ========================================================================== */
import { createRateLimiter } from './security.js';

/**
 * @param {object} db  the app database
 * @param {{ name: string, windowMs: number, max: number, now?: () => number, log?: object }} opts
 * @returns {{ hit(key): { ok, count, retryAfter }, peek(key): { ok, count, retryAfter }, reset(key): void }}
 */
export function createSharedLimiter(db, { name, windowMs, max, now = Date.now, log = console }) {
  const memory = createRateLimiter({ windowMs, max });
  let warned = false;
  const fallback = (err) => {
    if (!warned) { warned = true; log.error?.(`[rate-limit] ${name}: database unavailable, using in-memory limits`, err && err.message); }
  };
  const k = (key) => `${name}:${key}`.slice(0, 300);
  const result = (count, resetAt, t) => ({ ok: count <= max, count, retryAfter: Math.max(1, Math.ceil((resetAt - t) / 1000)) });

  return {
    max,
    hit(key) {
      const t = now();
      try {
        const row = db.prepare(`INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
          ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
            reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
          RETURNING count, reset_at`).get(k(key), t + windowMs, t, t);
        if (Math.random() < 0.01) db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(t);
        return result(Number(row.count), Number(row.reset_at), t);
      } catch (err) {
        fallback(err);
        const r = memory.hit(k(key));
        return { ok: r.ok, count: null, retryAfter: r.retryAfter };
      }
    },
    /** The current count without adding to it: ok is false once `max` is reached. */
    peek(key) {
      const t = now();
      try {
        const row = db.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ? AND reset_at > ?').get(k(key), t);
        if (!row) return { ok: true, count: 0, retryAfter: 0 };
        const count = Number(row.count);
        return { ok: count < max, count, retryAfter: Math.max(1, Math.ceil((Number(row.reset_at) - t) / 1000)) };
      } catch (err) {
        fallback(err);
        return { ok: true, count: null, retryAfter: 0 };
      }
    },
    reset(key) {
      try { db.prepare('DELETE FROM rate_limits WHERE key = ?').run(k(key)); } catch (err) { fallback(err); }
      memory.reset(k(key));
    },
  };
}
