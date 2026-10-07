/* ==========================================================================
   Sikhify API — db/database.js
   Local SQLite uses Node's built-in node:sqlite. Production can switch to
   synchronous libSQL/Turso by setting SIKHIFY_DATABASE_URL and its auth token.
   Schema changes are versioned migrations, applied once, in order.

   The database is the single source of truth for accounts, community content,
   Hukamnama records, media and the knowledge directory.
   ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

import { migrateGurdwaraDirectory, migrateGurdwaraDirectoryV2, registerFunctions } from './gurdwaraSchema.js';

const remoteDatabases = new WeakSet();
const activeTransactions = new WeakSet();

export const MIGRATIONS = [
  /* 1 — accounts, community, moderation */
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
    bio TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    show_location INTEGER NOT NULL DEFAULT 0,
    interests TEXT NOT NULL DEFAULT '[]',
    avatar_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW},
    last_login_at TEXT
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    expires_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    expires_at TEXT NOT NULL,
    used_at TEXT
  );

  CREATE TABLE groups (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Other',
    privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','private')),
    cover_url TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE group_members (
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','moderator','member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','banned')),
    joined_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (group_id, user_id)
  );
  CREATE INDEX group_members_user ON group_members(user_id);

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    images TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
    moderation_note TEXT NOT NULL DEFAULT '',
    share_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW},
    edited_at TEXT
  );
  CREATE INDEX posts_created ON posts(created_at DESC, id DESC);
  CREATE INDEX posts_author ON posts(author_id);
  CREATE INDEX posts_group ON posts(group_id);
  CREATE TABLE post_reactions (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (post_id, user_id)
  );
  CREATE TABLE saved_posts (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (user_id, post_id)
  );
  CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW},
    edited_at TEXT
  );
  CREATE INDEX comments_post ON comments(post_id, created_at);
  CREATE TABLE comment_reactions (
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (comment_id, user_id)
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX notifications_user ON notifications(user_id, created_at DESC);

  CREATE TABLE reports (
    id INTEGER PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post','comment','user','group')),
    target_id INTEGER NOT NULL,
    target_preview TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
    resolution TEXT NOT NULL DEFAULT '',
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    resolved_at TEXT
  );
  CREATE INDEX reports_status ON reports(status, created_at DESC);

  CREATE TABLE moderation_log (
    id INTEGER PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE uploads (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    path TEXT NOT NULL UNIQUE,
    mime TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  );
  `,

  /* 2 — Hukamnama (single canonical record per date once published) */
  `
  CREATE TABLE hukamnamas (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    ang INTEGER,
    raag TEXT NOT NULL DEFAULT '',
    writer TEXT NOT NULL DEFAULT '',
    gurmukhi TEXT NOT NULL DEFAULT '',
    transliteration TEXT NOT NULL DEFAULT '',
    punjabi TEXT NOT NULL DEFAULT '',
    hindi TEXT NOT NULL DEFAULT '',
    english TEXT NOT NULL DEFAULT '',
    audio_url TEXT NOT NULL DEFAULT '',
    katha_url TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW},
    published_at TEXT
  );
  CREATE UNIQUE INDEX hukamnamas_one_published_per_date ON hukamnamas(date) WHERE status = 'published';
  CREATE INDEX hukamnamas_date ON hukamnamas(date DESC);
  CREATE TABLE hukamnama_revisions (
    id INTEGER PRIMARY KEY,
    hukamnama_id INTEGER NOT NULL REFERENCES hukamnamas(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  `,

  /* 3 — Media (Kirtan / Katha artists and their YouTube videos) */
  `
  CREATE TABLE media_categories (
    name TEXT PRIMARY KEY,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE media_artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_name TEXT NOT NULL,
    category TEXT NOT NULL REFERENCES media_categories(name) ON UPDATE CASCADE,
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '[]',
    style TEXT NOT NULL DEFAULT '',
    official_links TEXT NOT NULL DEFAULT '[]',
    references_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE media_videos (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL REFERENCES media_artists(id) ON DELETE CASCADE ON UPDATE CASCADE,
    title TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX media_videos_artist ON media_videos(artist_id, sort);
  `,

  /* 4 — Knowledge directory entries + community submissions */
  `
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL DEFAULT '{}',
    country TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    district TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    sort_date TEXT NOT NULL DEFAULT '',
    publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft','published','archived')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','needs_review','rejected')),
    source TEXT NOT NULL DEFAULT '',
    references_json TEXT NOT NULL DEFAULT '[]',
    last_verified_at TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW},
    UNIQUE (type, slug)
  );
  CREATE INDEX entries_public ON entries(type, publish_status, sort_date);
  CREATE TABLE submissions (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,
    submitter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_entry_id INTEGER REFERENCES entries(id) ON DELETE SET NULL,
    target_url TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL DEFAULT '{}',
    message TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','published')),
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT NOT NULL DEFAULT '',
    result_type TEXT NOT NULL DEFAULT '',
    result_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ${NOW},
    reviewed_at TEXT
  );
  CREATE INDEX submissions_status ON submissions(status, created_at DESC);
  `,

  /* 5 — Global Gurdwara Directory (relational: countries → states → cities → gurdwaras) */
  migrateGurdwaraDirectory,

  /* 6 — Gurdwara Directory: district, external references for imports, region codes, more indexes */
  migrateGurdwaraDirectoryV2,

  /* 7 — Durable image bytes for serverless deployments (Vercel/Turso). */
  `ALTER TABLE uploads ADD COLUMN data BLOB;`,

  /* 8 — Gurdwara Directory: designation (Panj Takht / historic Gurdwara), set only from a cited source */
  `ALTER TABLE gurdwaras ADD COLUMN designation TEXT NOT NULL DEFAULT '';
  CREATE INDEX gurdwaras_designation ON gurdwaras(designation) WHERE designation != '';`,
];

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  registerFunctions(db);
  migrate(db);
  return db;
}

/**
 * Opens the production database. With SIKHIFY_DATABASE_URL set this uses the
 * synchronous libSQL driver, which keeps the existing prepare/get/all/run API
 * while connecting to a remote Turso/libSQL database. Local development keeps
 * using Node's built-in SQLite driver.
 */
export async function openDatabaseForConfig(config) {
  const url = String(config.databaseUrl || '').trim();
  if (!url) return openDatabase(config.dbPath);

  const { default: LibsqlDatabase } = await import('libsql');
  const db = new LibsqlDatabase(url, { authToken: config.databaseAuthToken || undefined });
  remoteDatabases.add(db);
  try { db.exec('PRAGMA foreign_keys = ON;'); } catch { /* remote libSQL may restrict connection pragmas */ }
  migrate(db);
  return db;
}

export const isRemoteDatabase = (db) => remoteDatabases.has(db);

function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => Number(r.version)));
  MIGRATIONS.forEach((step, i) => {
    const version = i + 1;
    if (done.has(version)) return;
    transaction(db, () => {
      // A step is SQL, or a function for migrations that also move or seed data.
      if (typeof step === 'function') step(db); else db.exec(step);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
    });
  });
}

/** Runs fn inside BEGIN/COMMIT, rolling back on any error. Nested calls join the outer transaction. */
export function transaction(db, fn) {
  if (activeTransactions.has(db)) return fn();
  activeTransactions.add(db);
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    activeTransactions.delete(db);
    return out;
  } catch (err) {
    try { db.exec('ROLLBACK'); } finally { activeTransactions.delete(db); }
    throw err;
  }
}

export const nowIso = () => new Date().toISOString();
export const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
