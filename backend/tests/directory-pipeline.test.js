/* The whole Directory data pipeline, end to end: the bundled seed files go through the
   real importers into a fresh database, and the public API (over HTTP, like the browser)
   lists them with its default filters. Also: which database a config selects, and that
   tests can never reach the remote (production) database. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../src/index.js';
import { loadConfig } from '../src/config.js';
import { describeDatabase, openDatabaseForConfig, schemaVersion, MIGRATIONS } from '../src/db/database.js';
import { createGurdwaraStore } from '../src/lib/gurdwaraStore.js';
import { importDirectory, readSeedFiles } from '../scripts/import-directory.js';
import { directoryCounts, PANJ_TAKHT } from '../scripts/diagnose-directory.js';
import { CONTENT_TYPES } from '../../shared/contentTypes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seed = (...p) => path.join(here, '../seed', ...p);
const records = (f) => JSON.parse(fs.readFileSync(seed('gurdwaras', f), 'utf8')).records;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-pipeline-'));
const quiet = { info() {}, warn() {}, error: console.error };
let srv;
const getJson = async (url) => {
  const res = await fetch(srv.url + url);
  assert.equal(res.status, 200, url);
  return res.json();
};

before(async () => {
  srv = await startServer({ port: 0, dbPath: path.join(tmp, 'pipeline.db'), uploadDir: path.join(tmp, 'uploads'), serveStatic: false, log: quiet });
  const { db } = srv;
  db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('admin@test.local', 'admin', 'Admin', 'x', 'admin')").run();
  const admin = db.prepare('SELECT id FROM users').get();
  // Same steps as the documented commands (gurdwaras:import, gurdwaras:import-historic --verify, directory:import --publish).
  const store = createGurdwaraStore(db);
  store.importRows(records('wikidata-gurdwaras.json'), null, { dryRun: false });
  const historic = store.importRows(records('india-historic-gurdwaras.json'), admin, { dryRun: false });
  store.verify([...new Set(historic.rows.filter((r) => r.id).map((r) => r.id))], admin, 'Checked against the cited sources (test).');
  const dir = path.join(here, '../seed/directory');
  importDirectory(db, readSeedFiles(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f))), { dryRun: false, publish: true });
});
after(() => { srv.server.close(); srv.db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('tests never use the remote database, even when backend/.env sets one', () => {
  process.env.SIKHIFY_DATABASE_URL ??= 'libsql://example-db.turso.io';
  assert.equal(loadConfig().databaseUrl, '');
  assert.equal(srv.config.databaseUrl, '');
});

test('describeDatabase: local file without a URL, Turso host (never the token) with one', async () => {
  const local = describeDatabase({ databaseUrl: '', dbPath: '/x/sikhify.db' });
  assert.equal(local.provider, 'local SQLite');
  assert.equal(local.remote, false);
  const remote = describeDatabase({ databaseUrl: 'libsql://my-db.aws-ap-south-1.turso.io', databaseAuthToken: 'secret-token', dbPath: '/x' });
  assert.equal(remote.provider, 'Turso/libSQL');
  assert.equal(remote.host, 'my-db.aws-ap-south-1.turso.io');
  assert.ok(!JSON.stringify(remote).includes('secret-token'));
  await assert.rejects(openDatabaseForConfig({ databaseUrl: 'libsql://my-db.turso.io', databaseAuthToken: '' }), /AUTH_TOKEN is not set/);
  await assert.rejects(openDatabaseForConfig({ databaseUrl: 'not a url', databaseAuthToken: 'x' }), /not a valid URL/);
});

test('health reports the database provider and schema version, nothing secret', async () => {
  const h = await getJson('/api/health');
  assert.deepEqual(h.database, { provider: 'local SQLite', schemaVersion: MIGRATIONS.length });
  assert.equal(schemaVersion(srv.db), MIGRATIONS.length);
});

test('GET /api/gurdwaras lists every published seed record; "verified only" lists the 48 verified', async () => {
  const listed = srv.db.prepare("SELECT COUNT(*) AS n FROM gurdwaras WHERE archived_at IS NULL AND status = 'active'").get().n;
  const all = await getJson('/api/gurdwaras?page=1&pageSize=50');
  assert.equal(all.total, listed, 'every published (non-archived) active record is reachable');
  assert.equal(all.pages, Math.ceil(listed / 50));
  const res = await getJson('/api/gurdwaras?page=1&pageSize=10&status=verified');
  assert.equal(res.total, 48, 'the 5 Takhts + 43 historic Gurdwaras are verified');
  assert.equal(res.items.length, 10);
  assert.equal(res.pageSize, 10);
  assert.equal(res.pages, 5);
  for (const g of res.items) {
    assert.equal(g.verification, 'verified');
    assert.equal(g.status, 'active');
    assert.match(g.url, /^\/directory\/gurdwaras\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/);
  }
  const page5 = await getJson('/api/gurdwaras?page=5&pageSize=10&status=verified');
  assert.equal(page5.items.length, 8);
  assert.ok(!page5.items.some((g) => res.items.some((x) => x.id === g.id)), 'pages do not overlap');
  // Unsupported sizes fall back to the default instead of failing.
  assert.equal((await getJson('/api/gurdwaras?pageSize=500')).pageSize, 20);
});

test('designation filters, unverified records on request, search, counts', async () => {
  const takht = await getJson('/api/gurdwaras?designation=takht');
  assert.deepEqual(takht.items.map((g) => g.name).sort(), PANJ_TAKHT.map(([, n]) => n).sort());
  assert.ok(takht.items.every((g) => g.image && g.image.url), 'each Takht has its Commons photo');
  assert.equal((await getJson('/api/gurdwaras?designation=historic')).total, 43);
  assert.equal((await getJson('/api/gurdwaras?status=needs_verification')).total, 307, 'imported, unverified records appear only when asked for');
  const search = await getJson('/api/gurdwaras?q=golden%20temple');
  assert.ok(search.items.some((g) => g.name === 'Sri Harmandir Sahib'));
  const meta = await getJson('/api/gurdwaras/meta');
  assert.equal(meta.totalVerified, 48);
  assert.equal(meta.totalListed, 307);
  assert.deepEqual(meta.designations, { takht: 5, historic: 43 });
});

test('Gurdwara detail by path, with sources and nearby records', async () => {
  const [first] = (await getJson('/api/gurdwaras?designation=takht&q=akal')).items;
  const detail = await getJson('/api/gurdwaras/by-path/' + first.url.split('/').slice(3).join('/'));
  assert.equal(detail.gurdwara.name, 'Sri Akal Takht Sahib');
  assert.equal(detail.gurdwara.designation, 'takht');
  assert.ok(Array.isArray(detail.nearby));
  const missing = await fetch(srv.url + '/api/gurdwaras/by-path/india/punjab/amritsar/no-such-gurdwara');
  assert.equal(missing.status, 404);
});

test('Directory categories: summary counts match the seed files, lists and details work', async () => {
  const { counts } = await getJson('/api/entries/summary');
  for (const f of fs.readdirSync(seed('directory'))) {
    const file = JSON.parse(fs.readFileSync(seed('directory', f), 'utf8'));
    assert.equal(counts[file.type], file.records.length, `${f} → ${file.type}`);
  }
  const list = await getJson('/api/entries?type=heritage');
  assert.equal(list.items.length, counts.heritage);
  const one = await getJson(`/api/entries/heritage/${list.items[0].slug}`);
  assert.equal(one.entry.slug, list.items[0].slug);
});

test('every category: list, every detail (by type key and by URL path), search, pagination', async () => {
  for (const [type, t] of Object.entries(CONTENT_TYPES)) {
    const list = await getJson(`/api/entries?type=${type}`);
    assert.equal(list.total, list.items.length, `${type}: one page holds the seed data`);
    assert.equal((await getJson(`/api/entries?type=${t.path}`)).total, list.total, `${type}: the URL path works as the type`);
    for (const item of list.items) {
      for (const key of [type, t.path]) {
        const { entry } = await getJson(`/api/entries/${key}/${item.slug}`);
        assert.equal(entry.slug, item.slug);
        assert.equal(entry.url, `/${t.path}/${item.slug}`);
        assert.equal(typeof entry.fields, 'object');
        assert.ok(Array.isArray(entry.verification.references));
      }
    }
    if (list.items.length) {
      const word = list.items[0].title.split(' ')[0].toUpperCase(); // search ignores case
      assert.ok((await getJson(`/api/entries?type=${type}&q=${encodeURIComponent(word)}`)).items.some((i) => i.slug === list.items[0].slug), `${type}: search`);
    }
    const paged = await getJson(`/api/entries?type=${type}&limit=2&page=2`);
    assert.equal(paged.total, list.total);
    assert.deepEqual(paged.items.map((i) => i.slug), list.items.slice(2, 4).map((i) => i.slug), `${type}: page 2`);
  }
});

test('regression: /personalities/banda-singh-bahadur loads its real record', async () => {
  const { entry } = await getJson('/api/entries/personalities/banda-singh-bahadur');
  assert.equal(entry.title, 'Banda Singh Bahadur');
  assert.equal(entry.type, 'personality');
  assert.ok(entry.summary.length > 20);
  assert.match(entry.imageUrl, /^https:\/\/upload\.wikimedia\.org\//);
  assert.equal(entry.body, '', 'empty optional fields come back as empty strings, not missing');
});

test('missing or invalid records are 404/400, never 500; drafts stay private', async () => {
  const status = async (u) => (await fetch(srv.url + u)).status;
  assert.equal(await status('/api/entries/personalities/no-such-person'), 404);
  assert.equal(await status('/api/entries/personality/' + encodeURIComponent("'; DROP TABLE entries; --")), 404);
  assert.equal(await status('/api/entries/personality/' + 'x'.repeat(500)), 404);
  assert.equal(await status('/api/entries/not-a-type/anything'), 404);
  assert.equal(await status('/api/entries?type=not-a-type'), 400);
  assert.equal(await status('/api/entries?type=personality&page=abc&limit=-5'), 200);
  srv.db.prepare("UPDATE entries SET publish_status = 'draft' WHERE type = 'book' AND slug = (SELECT slug FROM entries WHERE type = 'book' ORDER BY id LIMIT 1)").run();
  const draft = srv.db.prepare("SELECT slug FROM entries WHERE type = 'book' AND publish_status = 'draft'").get();
  assert.equal(await status(`/api/entries/book/${draft.slug}`), 404, 'a draft is not public');
  assert.ok(!(await getJson('/api/entries?type=book')).items.some((i) => i.slug === draft.slug));
  srv.db.prepare("UPDATE entries SET publish_status = 'published' WHERE type = 'book' AND slug = ?").run(draft.slug);
});

test('diagnostic counts agree with the API', async () => {
  const c = directoryCounts(srv.db);
  assert.equal(c.gurdwaras.public, (await getJson('/api/gurdwaras')).total);
  assert.equal(c.gurdwaras.takht, 5);
  assert.ok(c.panjTakht.every((t) => t.found && t.public));
  const { counts } = await getJson('/api/entries/summary');
  for (const e of c.entries) assert.equal(e.published, counts[e.type], e.type);
});
