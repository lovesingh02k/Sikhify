/* Security headers stay consistent: vercel.json carries exactly the shared set,
   and every inline <script> in frontend/index.html is allowed by its hash. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SITE_SECURITY_HEADERS, INLINE_SCRIPT_HASHES } from '../shared/securityHeaders.js';

const read = (rel) => fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

test('vercel.json sends the shared security headers on site routes (not on /api or /uploads)', () => {
  const vercel = JSON.parse(read('../vercel.json'));
  const rule = (vercel.headers || []).find((h) => h.source === '/((?!api/|uploads/).*)');
  assert.ok(rule, 'a headers rule for site routes');
  assert.deepEqual(Object.fromEntries(rule.headers.map((h) => [h.key, h.value])), SITE_SECURITY_HEADERS);
});

test('every inline script in index.html is allowed by the CSP (edit the script → update its hash)', () => {
  const html = read('../frontend/index.html');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  assert.ok(inline.length >= 1);
  assert.deepEqual(inline.filter((h) => !INLINE_SCRIPT_HASHES.includes(h)), []);
  assert.match(SITE_SECURITY_HEADERS['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.doesNotMatch(SITE_SECURITY_HEADERS['Content-Security-Policy'], /script-src[^;]*'unsafe-(inline|eval)'/);
});
