/* ==========================================================================
   Sikhify API — lib/security.js
   Password hashing (scrypt), opaque session tokens (only their SHA-256 hash is
   stored), and in-memory rate limiting.
   ========================================================================== */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +N, r: +r, p: +p, maxmem: PARAMS.maxmem });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

/** A random token for the client and the hash to store server-side. */
export function newToken(bytes = 32) {
  const token = crypto.randomBytes(bytes).toString('base64url');
  return { token, hash: hashToken(token) };
}
export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/**
 * Fixed-window rate limiter kept in memory (per server process).
 * limiter.hit(key) → { ok, retryAfter }
 */
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return {
    hit(key) {
      const now = Date.now();
      let h = hits.get(key);
      if (!h || h.reset <= now) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
      h.count += 1;
      if (hits.size > 50000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      return { ok: h.count <= max, retryAfter: Math.ceil((h.reset - now) / 1000) };
    },
    reset(key) { hits.delete(key); },
  };
}
