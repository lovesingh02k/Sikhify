/* ==========================================================================
   Shared rate limits (lib/rateLimit.js), login lockout resistance, the
   constant-time "forgot password" and the proxy default behind Vercel.
   ========================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db/database.js';
import { createSharedLimiter } from '../src/lib/rateLimit.js';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';
import { loadConfig } from '../src/config.js';
import { FORGOT_MIN_MS } from '../src/routes/auth.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-rl-'));
const quiet = { info() {}, warn() {}, error() {} };

test('shared limiter: counts exactly, expires, peeks without counting, resets', () => {
  const db = openDatabase(path.join(tmp, 'unit.db'));
  let now = 1_000_000;
  const lim = createSharedLimiter(db, { name: 't', windowMs: 1000, max: 3, now: () => now, log: quiet });
  assert.deepEqual([1, 2, 3, 4].map(() => lim.hit('a').ok), [true, true, true, false]);
  assert.equal(lim.peek('a').ok, false);
  assert.equal(lim.hit('b').ok, true, 'keys are independent');
  now += 1001;
  assert.equal(lim.peek('a').count, 0, 'the window expired');
  assert.equal(lim.hit('a').count, 1);
  lim.reset('a');
  assert.equal(lim.peek('a').count, 0);
  // Two limiters (= two server instances) share one counter.
  const other = createSharedLimiter(db, { name: 't', windowMs: 1000, max: 3, now: () => now, log: quiet });
  lim.hit('c'); other.hit('c'); lim.hit('c');
  assert.equal(other.hit('c').ok, false, 'instances share the count');
  db.close();
});

test('shared limiter: concurrent hits are all counted', async () => {
  const db = openDatabase(path.join(tmp, 'conc.db'));
  const lim = createSharedLimiter(db, { name: 'c', windowMs: 60_000, max: 50, log: quiet });
  const results = await Promise.all(Array.from({ length: 80 }, () => Promise.resolve().then(() => lim.hit('k'))));
  assert.equal(results.filter((r) => r.ok).length, 50);
  assert.equal(lim.peek('k').count, 80);
  db.close();
});

test('shared limiter: if the database fails it falls back to in-memory limits, not to "allow all"', () => {
  const broken = { prepare() { throw new Error('database offline'); } };
  const lim = createSharedLimiter(broken, { name: 'x', windowMs: 60_000, max: 2, log: quiet });
  assert.deepEqual([1, 2, 3].map(() => lim.hit('k').ok), [true, true, false]);
});

test('behind Vercel the client IP comes from X-Forwarded-For by default; explicit false wins', () => {
  const saved = { VERCEL: process.env.VERCEL, P: process.env.SIKHIFY_TRUST_PROXY };
  process.env.VERCEL = '1'; delete process.env.SIKHIFY_TRUST_PROXY;
  assert.equal(loadConfig().trustProxy, true);
  process.env.SIKHIFY_TRUST_PROXY = 'false';
  assert.equal(loadConfig().trustProxy, false);
  delete process.env.VERCEL; delete process.env.SIKHIFY_TRUST_PROXY;
  assert.equal(loadConfig().trustProxy, false);
  if (saved.VERCEL !== undefined) process.env.VERCEL = saved.VERCEL;
  if (saved.P !== undefined) process.env.SIKHIFY_TRUST_PROXY = saved.P;
});

/* ---------- through the API */
let srv; let base;
before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'api.db'), uploadDir: path.join(tmp, 'up'), serveStatic: false, log: quiet, publicUrl: 'http://test.local', trustProxy: true });
  base = srv.url;
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash) VALUES ('victim@test.local', 'victim', 'Victim', ?)").run(await hashPassword('correct-horse-1'));
});
after(() => { srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const login = (identifier, password, ip) => fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sikhify-Request': '1', 'X-Forwarded-For': ip }, body: JSON.stringify({ identifier, password }),
}).then((r) => r.status);

test('an attacker guessing from one address cannot lock the member out', async () => {
  const attacker = '203.0.113.9';
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push(await login('victim', 'wrong-' + i, attacker));
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
  assert.deepEqual(statuses.slice(10), [429, 429], 'the attacker is stopped after 10 failures');
  assert.equal(await login('victim', 'correct-horse-1', '198.51.100.7'), 200, 'the member signs in from their own address');
  assert.equal(await login('victim', 'correct-horse-1', attacker), 429, 'even the right password is refused from the blocked address until it cools down');
});

test('a successful login clears that address\'s failures', async () => {
  const ip = '198.51.100.20';
  for (let i = 0; i < 9; i++) assert.equal(await login('victim', 'nope', ip), 401);
  assert.equal(await login('victim', 'correct-horse-1', ip), 200);
  for (let i = 0; i < 9; i++) assert.equal(await login('victim', 'nope', ip), 401, `failure ${i + 1} after the reset is allowed`);
});

test('a password reset lifts an account-wide block', async () => {
  // Fill the account-wide failure counter directly (as if from many addresses).
  const lim = createSharedLimiter(srv.db, { name: 'login-fail-id', windowMs: 3_600_000, max: 100, log: quiet });
  for (let i = 0; i < 100; i++) lim.hit('victim');
  assert.equal(await login('victim', 'correct-horse-1', '192.0.2.50'), 429);
  const { token } = (await import('../src/lib/security.js')).newToken();
  const crypto = await import('node:crypto');
  srv.db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, (SELECT id FROM users WHERE username = ?), ?)')
    .run(crypto.createHash('sha256').update(token).digest('hex'), 'victim', new Date(Date.now() + 3600e3).toISOString());
  const r = await fetch(base + '/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sikhify-Request': '1' }, body: JSON.stringify({ token, password: 'new-password-22' }) });
  assert.equal(r.status, 200);
  assert.equal(await login('victim', 'new-password-22', '192.0.2.50'), 200);
});

test('"forgot password" answers the same way, in the same minimum time, with or without an account', async () => {
  const ask = async (email, ip) => {
    const t = performance.now();
    const r = await fetch(base + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sikhify-Request': '1', 'X-Forwarded-For': ip }, body: JSON.stringify({ email }) });
    return { status: r.status, body: await r.json(), ms: performance.now() - t };
  };
  const known = await ask('victim@test.local', '192.0.2.61');
  const unknown = await ask('nobody@test.local', '192.0.2.62');
  assert.equal(known.status, 200); assert.equal(unknown.status, 200);
  assert.deepEqual(known.body, unknown.body);
  for (const r of [known, unknown]) assert.ok(r.ms >= FORGOT_MIN_MS - 5, `took ${r.ms.toFixed(0)}ms`);
  assert.ok(Math.abs(known.ms - unknown.ms) < 250, `timings ${known.ms.toFixed(0)} vs ${unknown.ms.toFixed(0)}`);
  // Per-email cap: the 4th request for one email within the hour is refused (from any address).
  const statuses = [];
  for (const ip of ['192.0.2.70', '192.0.2.71', '192.0.2.72']) statuses.push((await ask('target@test.local', ip)).status);
  assert.deepEqual(statuses, [200, 200, 200]);
  assert.equal((await ask('target@test.local', '192.0.2.73')).status, 429);
});
