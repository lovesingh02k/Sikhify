/* ==========================================================================
   Sikhify API — routes/search.js
   Records from the database for the site-wide search overlay. The overlay
   already indexes the bundled content (Gurbani, Learn, History, Rehat, FAQ…);
   this adds everything that lives in the database, in the same record shape:
   { type, title, preview, url, text }.

   Only public data is included: published directory records, published
   Hukamnamas, active public groups and recent posts that are visible to
   everyone. The whole index is a few hundred KB at most at today's scale;
   when it grows, switch to a server-side query (SQLite FTS5).
   ========================================================================== */
import { CONTENT_TYPES } from '../../shared/contentTypes.js';
import { parseJson } from '../db/database.js';
import { excerpt } from '../lib/util.js';

export default function register(router, deps) {
  const { db } = deps;

  router.get('/api/search/index', () => {
    const records = [];
    const add = (type, title, preview, url, text = '') => records.push({ type, title, preview: preview || '', url, text });

    for (const e of db.prepare("SELECT * FROM entries WHERE publish_status = 'published' ORDER BY updated_at DESC LIMIT 3000").all()) {
      const t = CONTENT_TYPES[e.type];
      if (!t) continue;
      const data = parseJson(e.data, {});
      const where = [e.city, e.district, e.state, e.country].filter(Boolean).join(', ');
      add(t.label, e.title, [e.category, where, e.sort_date, e.summary].filter(Boolean).join(' · '), `/${t.path}/${e.slug}`,
        [e.summary, Object.values(data).flat().join(' ')].join(' ').slice(0, 2000));
    }

    for (const h of db.prepare("SELECT * FROM hukamnamas WHERE status = 'published' ORDER BY date DESC LIMIT 400").all()) {
      const first = (h.gurmukhi.split('\n').find((l) => l.trim()) || '').trim();
      add('Hukamnama', `Hukamnama — ${h.date}`, `Ang ${h.ang}${h.writer ? ' · ' + h.writer : ''} · ${first}`, `/hukamnama#date=${h.date}`,
        [h.date, 'ang ' + h.ang, h.raag, h.writer, h.gurmukhi, h.transliteration, h.english].join(' ').slice(0, 2000));
    }

    for (const g of db.prepare("SELECT * FROM groups WHERE status = 'active' AND privacy = 'public' ORDER BY created_at DESC LIMIT 500").all()) {
      add('Group', g.name, `${g.category}${g.location ? ' · ' + g.location : ''} · ${g.description}`, `/community/groups/${g.slug}`, [g.about, 'community group sangat'].join(' '));
    }

    const posts = db.prepare(`SELECT p.id, p.body, u.name FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN groups g ON g.id = p.group_id
      WHERE p.status = 'published' AND u.status = 'active' AND (p.group_id IS NULL OR (g.privacy = 'public' AND g.status = 'active'))
      ORDER BY p.created_at DESC LIMIT 300`).all();
    for (const p of posts) add('Community', excerpt(p.body, 80), `${p.name} · Community post`, `/community/post/${p.id}`, p.body.slice(0, 1500));

    return { media: deps.mediaCatalog(), records };
  });
}
