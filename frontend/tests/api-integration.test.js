/* Frontend ↔ API integration: the browser's own service modules (gurdwaraService,
   entryService) talk to a real backend over HTTP, with real seed data imported, and
   get the fields the Directory pages render. Relative /api paths are sent to the test
   server the way the Vite proxy forwards them in development. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../backend/src/index.js';
import { createGurdwaraStore } from '../../backend/src/lib/gurdwaraStore.js';
import { importDirectory, readSeedFiles } from '../../backend/scripts/import-directory.js';
import { gurdwaraService } from '../src/services/gurdwaras/gurdwaraService.js';
import { entryService } from '../src/services/content/contentService.js';

const seedDir = fileURLToPath(new URL('../../backend/seed/', import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-fe-'));
const realFetch = globalThis.fetch;
let srv;

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'fe.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: { info() {}, warn() {}, error: console.error } });
  const { db } = srv;
  db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('admin@test.local', 'admin', 'Admin', 'x', 'admin')").run();
  const admin = db.prepare('SELECT id FROM users').get();
  const store = createGurdwaraStore(db);
  const historic = JSON.parse(fs.readFileSync(path.join(seedDir, 'gurdwaras/india-historic-gurdwaras.json'), 'utf8')).records;
  const report = store.importRows(historic, admin, { dryRun: false });
  store.verify(report.rows.filter((r) => r.id).map((r) => r.id), admin, 'Checked against the cited sources (test).');
  const dir = path.join(seedDir, 'directory');
  importDirectory(db, readSeedFiles(fs.readdirSync(dir).map((f) => path.join(dir, f))), { dryRun: false, publish: true });
  globalThis.fetch = (url, opts) => realFetch(String(url).startsWith('/') ? srv.url + url : url, opts);
});
after(() => { globalThis.fetch = realFetch; srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('Gurdwara search returns the cards the directory renders', async () => {
  const res = await gurdwaraService.search({ page: 1, pageSize: 20 });
  assert.equal(res.total, historic().length);
  const card = res.items[0];
  for (const k of ['id', 'name', 'url', 'city', 'state', 'country', 'status', 'verification', 'designation', 'summary']) assert.ok(k in card, k);
  const takht = await gurdwaraService.search({ designation: 'takht' });
  assert.equal(takht.total, 5);
  assert.ok(takht.items.every((g) => g.image && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(g.image.url || g.image.thumbUrl)));
});

test('meta + detail pages', async () => {
  const meta = await gurdwaraService.meta();
  assert.equal(meta.totalVerified, historic().length);
  const [akal] = (await gurdwaraService.search({ q: 'akal takht' })).items;
  const [, , , country, state, city, slug] = akal.url.split('/');
  const detail = await gurdwaraService.detail(country, state, city, slug);
  assert.equal(detail.gurdwara.name, 'Sri Akal Takht Sahib');
});

test('Directory hub counts come from the API', async () => {
  const counts = await entryService.summary();
  assert.ok(counts.heritage > 0 && counts.personality > 0 && counts.organization > 0);
  const list = await entryService.list('heritage');
  assert.equal(list.items.length, counts.heritage);
});

test('entry detail: a real record loads; a missing one is "notFound" (the page shows its not-available state)', async () => {
  const banda = await entryService.get('personalities', 'banda-singh-bahadur');
  assert.equal(banda.title, 'Banda Singh Bahadur');
  for (const k of ['title', 'summary', 'body', 'imageUrl', 'fields', 'verification', 'url']) assert.ok(k in banda, k);
  await assert.rejects(entryService.get('personalities', 'no-such-person'), (err) => err.kind === 'notFound' && err.status === 404);
});

function historic() {
  return JSON.parse(fs.readFileSync(path.join(seedDir, 'gurdwaras/india-historic-gurdwaras.json'), 'utf8')).records;
}
