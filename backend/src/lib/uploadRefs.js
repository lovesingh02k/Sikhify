/* ==========================================================================
   Sikhify API — lib/uploadRefs.js
   Finds every place an uploaded image is referenced, by scanning every text
   column of every table for "/uploads/…" — so profile photos, group covers,
   post images (JSON lists), Gurdwara photos, festival images, directory
   records (JSON fields) and anything added later are all covered without a
   hand-kept list. Used by the cleanup and optimisation scripts.
   ========================================================================== */

/** Tables that hold no references (or are the uploads themselves). */
const SKIP = new Set(['uploads', 'upload_originals', 'schema_migrations', 'rate_limits', 'sessions', 'password_resets', 'moderation_log']);
const PATH_RE = /\/uploads\/([A-Za-z0-9/_.-]+\.(?:png|jpe?g|webp|gif))/gi;

/** @returns {Map<string, string[]>} upload path (without "/uploads/") → where it is used ("table.column#rowid") */
export function findUploadReferences(db) {
  const refs = new Map();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name).filter((t) => !SKIP.has(t));
  for (const table of tables) {
    const info = db.prepare(`PRAGMA table_info("${table.replace(/"/g, '')}")`).all();
    const cols = info.filter((c) => !c.type || /TEXT|CHAR|CLOB|JSON/i.test(c.type)).map((c) => c.name);
    // Rows are named by their primary key (WITHOUT ROWID tables have no rowid).
    const pk = info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => `"${c.name}"`);
    const rid = pk.length ? pk.join(" || ':' || ") : 'rowid';
    for (const col of cols) {
      const rows = db.prepare(`SELECT ${rid} AS rid, "${col}" AS v FROM "${table}" WHERE "${col}" LIKE '%/uploads/%'`).all();
      for (const r of rows) {
        for (const m of String(r.v).matchAll(PATH_RE)) {
          const where = `${table}.${col}#${r.rid}`;
          // A feed photo's display-size variant (…/abc.w960.webp, routes/uploads.js) lives as long as the photo.
          for (const p of [m[1], m[1].replace(/\.[a-z0-9]+$/i, '.w960.webp')]) {
            if (!refs.has(p)) refs.set(p, []);
            refs.get(p).push(where);
          }
        }
      }
    }
  }
  return refs;
}
