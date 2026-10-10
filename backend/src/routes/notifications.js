/* Sikhify API — routes/notifications.js */
import { int } from '../lib/http.js';
import { AUTHOR_COLUMNS, authorFrom } from '../lib/serialize.js';

export default function register(router, { db }) {
  router.get('/api/notifications', (c) => {
    const me = c.requireUser();
    const unreadOnly = c.query.get('unread') === '1';
    const before = int(c.query.get('before'), { fallback: null });
    const limit = int(c.query.get('limit'), { min: 1, max: 30, fallback: 30 }); // e.g. 1 for the pop-up of the newest one
    const rows = db.prepare(`SELECT n.*, ${AUTHOR_COLUMNS} FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
      WHERE n.user_id = ? ${unreadOnly ? 'AND n.read_at IS NULL' : ''} ${before ? 'AND n.id < ?' : ''}
      ORDER BY n.id DESC LIMIT ?`).all(me.id, ...(before ? [before] : []), limit + 1);
    const items = rows.slice(0, limit).map((r) => ({
      id: r.id, type: r.type, message: r.message, link: r.link, read: !!r.read_at, createdAt: r.created_at, actor: authorFrom(r),
    }));
    return { items, next: rows.length > limit ? { before: items[items.length - 1].id } : null, unread: unreadCount(me.id) };
  });

  const unreadCount = (uid) => db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(uid).n;

  router.get('/api/notifications/unread-count', (c) => {
    if (!c.user) return { unread: 0 };
    return { unread: unreadCount(c.user.id) };
  });

  router.post('/api/notifications/read', (c) => {
    const me = c.requireUser();
    const now = new Date().toISOString();
    if (c.body.all) db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(now, me.id);
    else if (Array.isArray(c.body.ids)) {
      const ids = c.body.ids.map((x) => int(x, { fallback: 0 })).filter(Boolean).slice(0, 100);
      if (ids.length) db.prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`).run(now, me.id, ...ids);
    }
    return { unread: unreadCount(me.id) };
  });
}
