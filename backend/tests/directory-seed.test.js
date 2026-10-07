/* Knowledge-directory seed files and importer (scripts/import-directory.js):
   every bundled record validates and is sourced; imports are idempotent,
   never verify anything, and never overwrite a record a person has edited. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/database.js';
import { readSeedFiles, importDirectory } from '../scripts/import-directory.js';

const SEED_DIR = fileURLToPath(new URL('../seed/directory/', import.meta.url));
const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json')).map((f) => path.join(SEED_DIR, f));
const sets = readSeedFiles(files);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sikhify-directory-seed-'));
const dbs = [];
const fresh = (name) => { const d = openDatabase(path.join(tmp, name)); dbs.push(d); return d; };
after(() => { for (const d of dbs) d.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('bundled seed files: every record validates and has a source and http(s) references', () => {
  assert.ok(sets.length > 0);
  const report = importDirectory(fresh('dry.db'), sets, { dryRun: true });
  assert.equal(report.invalid, 0, JSON.stringify(report.rows.filter((r) => r.result === 'invalid'), null, 2));
  assert.equal(report.imported, sets.reduce((n, s) => n + s.records.length, 0));
  for (const { records } of sets) {
    for (const r of records) {
      assert.ok(r.source, `${r.title}: source`);
      assert.ok(Array.isArray(r.references) && r.references.length, `${r.title}: references`);
      for (const ref of r.references) assert.match(ref.url, /^https:\/\//, `${r.title}: ${ref.url}`);
    }
  }
});

test('import: drafts by default, published with publish, never verified; re-running changes nothing', () => {
  const db = fresh('apply.db');
  const first = importDirectory(db, sets, { dryRun: false });
  assert.equal(first.invalid, 0);
  const counts = db.prepare("SELECT publish_status p, verification_status v, COUNT(*) n FROM entries GROUP BY 1, 2").all();
  assert.deepEqual(counts.map((c) => [c.p, c.v]), [['draft', 'pending']]);

  const pub = importDirectory(db, sets, { dryRun: false, publish: true });
  assert.equal(pub.imported, 0);
  assert.equal(pub.updated, first.imported, 'drafts are published, not duplicated');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM entries WHERE publish_status = 'published' AND verification_status = 'pending'").get().n, first.imported);

  const again = importDirectory(db, sets, { dryRun: false, publish: true });
  assert.deepEqual([again.imported, again.updated, again.unchanged], [0, 0, first.imported]);
});

test('import never overwrites a record edited or verified in the admin', () => {
  const db = fresh('edited.db');
  importDirectory(db, sets, { dryRun: false });
  const user = db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES ('a@x.test', 'a', 'A', 'x', 'admin')").run();
  const target = db.prepare('SELECT id, summary FROM entries ORDER BY id LIMIT 1').get();
  db.prepare("UPDATE entries SET summary = 'Edited by an admin', verification_status = 'verified', updated_by = ? WHERE id = ?").run(Number(user.lastInsertRowid), target.id);

  const changed = sets.map((s) => ({ ...s, records: s.records.map((r) => ({ ...r, summary: r.summary + ' (changed in file)' })) }));
  const report = importDirectory(db, changed, { dryRun: false });
  assert.equal(report.kept, 1);
  const row = db.prepare('SELECT summary, verification_status FROM entries WHERE id = ?').get(target.id);
  assert.deepEqual([row.summary, row.verification_status], ['Edited by an admin', 'verified']);
  // Untouched imported records follow the file.
  assert.match(db.prepare('SELECT summary FROM entries WHERE id != ? ORDER BY id LIMIT 1').get(target.id).summary, /\(changed in file\)$/);
});

test('records without a source or reference are rejected', () => {
  const report = importDirectory(fresh('nosource.db'), [{ type: 'website', file: 'x.json', records: [{ title: 'No Source', url: 'https://example.org/', category: 'Other' }] }], { dryRun: true });
  assert.equal(report.invalid, 1);
});
