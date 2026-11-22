/* The Sikh Store over HTTP against a throwaway database: staff manage products, the public sees published ones. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { startServer } from '../src/index.js';
import { hashPassword } from '../src/lib/security.js';

let srv;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-store-'));
const quiet = { info() {}, warn() {}, error: console.error };

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'test.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet, publicUrl: 'http://test.local', blobToken: '' });
  srv.db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('admin@test.local', 'admin', 'Admin Singh', ?, 'admin')").run(await hashPassword('admin-password-1'));
});
after(() => { srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(srv.url + url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-Sikhify-Request': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const s of res.headers.getSetCookie()) { const [pair] = s.split(';'); cookie = /=$/.test(pair) ? '' : pair; }
    return { status: res.status, data: await res.json().catch(() => null) };
  };
}

const admin = client();
const member = client();
const guest = client();
const png = async () => 'data:image/png;base64,' + (await sharp({ create: { width: 40, height: 30, channels: 3, background: { r: 240, g: 169, b: 59 } } }).png().toBuffer()).toString('base64');
const product = (extra = {}) => ({ type: 'product', title: 'Steel Kara', summary: 'Sarbloh Kara.', category: 'Kara', price: '499', mrp: '599', availability: 'In stock', variants: 'Small\nMedium', source: 'Sikhify', verificationStatus: 'verified', publishStatus: 'published', ...extra });

test('sign in', async () => {
  assert.equal((await admin('POST', '/api/auth/login', { identifier: 'admin@test.local', password: 'admin-password-1' })).status, 200);
  assert.equal((await member('POST', '/api/auth/signup', { name: 'Member Kaur', username: 'member', email: 'member@test.local', password: 'member-password' })).status, 200);
});

test('only staff can upload product photos or add products', async () => {
  assert.equal((await member('POST', '/api/uploads', { purpose: 'product', dataUrl: await png() })).status, 403);
  assert.equal((await member('POST', '/api/admin/entries', product())).status, 403);
});

test('a published product is public with its price, options and photos; a draft is not', async () => {
  const up = await admin('POST', '/api/uploads', { purpose: 'product', dataUrl: await png() });
  assert.equal(up.status, 200);
  const made = await admin('POST', '/api/admin/entries', product({ image_url: up.data.url, photos: up.data.url }));
  assert.equal(made.status, 200, JSON.stringify(made.data));
  assert.equal((await admin('POST', '/api/admin/entries', product({ title: 'Hidden Draft', publishStatus: 'draft' }))).status, 200);

  const list = await guest('GET', '/api/entries?type=product');
  assert.deepEqual(list.data.items.map((p) => p.title), ['Steel Kara']);
  const p = list.data.items[0];
  assert.equal(p.url, '/sikh-store/steel-kara');
  assert.equal(p.category, 'Kara');
  assert.equal(p.fields.price, 499);
  assert.deepEqual(p.fields.variants, ['Small', 'Medium']);
  assert.deepEqual(p.fields.photos, [up.data.url]);
  assert.equal((await guest('GET', '/api/entries/sikh-store/steel-kara')).data.entry.title, 'Steel Kara');
  assert.deepEqual((await guest('GET', '/api/entries/facets?type=product')).data.categories.map((c) => c.value), ['Kara']);
});

test('a negative price is refused', async () => {
  const bad = await admin('POST', '/api/admin/entries', product({ title: 'Bad price', price: '-5' }));
  assert.ok(bad.status >= 400 && bad.status < 500);
});

test('staff can upload a photo for an event; members cannot', async () => {
  assert.equal((await member('POST', '/api/uploads', { purpose: 'entry', dataUrl: await png() })).status, 403);
  const up = await admin('POST', '/api/uploads', { purpose: 'entry', dataUrl: await png() });
  assert.equal(up.status, 200);
  const made = await admin('POST', '/api/admin/entries', { type: 'event', title: 'Gurpurab Samagam', event_type: 'Gurpurab', start_date: '2099-11-24', venue: 'Gurdwara Sahib', city: 'Bhilai', official_source: 'https://www.sikhify.in', image_url: up.data.url, source: 'Sikhify', verificationStatus: 'verified', publishStatus: 'published' });
  assert.equal(made.status, 200, JSON.stringify(made.data));
  const list = await guest('GET', '/api/entries?type=event&when=upcoming');
  assert.equal(list.data.items[0].imageUrl, up.data.url);
});
