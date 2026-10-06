/* ==========================================================================
   Sikhify API — routes/admin.js
   Staff-only endpoints. Every number returned here is counted from the
   database at request time — there are no stored or estimated statistics.
   ========================================================================== */
import { HttpError, badRequest, notFound, forbidden, str, int, oneOf } from '../lib/http.js';
import { adminUser, AUTHOR_COLUMNS, authorFrom } from '../lib/serialize.js';
import { SITE_ROLES, USER_STATUSES, can } from '../../shared/roles.js';
import { parseJson } from '../db/database.js';
import { todayInIndia } from '../lib/util.js';

export default function register(router, deps) {
  const { db, settings, notify, logModeration } = deps;
  const count = (sql, ...p) => db.prepare(sql).get(...p).n;
  const pageOf = (c) => int(c.query.get('page'), { min: 1, max: 10000, fallback: 1 });

  /* ---------- dashboard */
  router.get('/api/admin/dashboard', (c) => {
    c.require('admin.access');
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const today = todayInIndia();
    const todays = db.prepare("SELECT id, status, updated_at FROM hukamnamas WHERE date = ? ORDER BY CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END LIMIT 1").get(today);
    return {
      counts: {
        users: count('SELECT COUNT(*) AS n FROM users'),
        newUsers7d: count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', since7),
        posts: count('SELECT COUNT(*) AS n FROM posts'),
        comments: count('SELECT COUNT(*) AS n FROM comments'),
        groups: count('SELECT COUNT(*) AS n FROM groups'),
        pendingReports: count("SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'"),
        pendingSubmissions: count("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'"),
        mediaArtists: count("SELECT COUNT(*) AS n FROM media_artists WHERE status = 'published'"),
        mediaVideos: count("SELECT COUNT(*) AS n FROM media_videos WHERE status = 'published'"),
        entriesPublished: count("SELECT COUNT(*) AS n FROM entries WHERE publish_status = 'published'"),
        entriesNeedingReview: count("SELECT COUNT(*) AS n FROM entries WHERE verification_status IN ('pending','needs_review')"),
        upcomingEvents: count("SELECT COUNT(*) AS n FROM entries WHERE type = 'event' AND publish_status = 'published' AND sort_date >= ?", today),
        hukamnamasPublished: count("SELECT COUNT(*) AS n FROM hukamnamas WHERE status = 'published'"),
      },
      today,
      todaysHukamnama: todays ? { id: todays.id, status: todays.status, updatedAt: todays.updated_at } : null,
      recentActivity: db.prepare(`SELECT m.action, m.target_type, m.target_id, m.note, m.created_at, u.name AS actor FROM moderation_log m
        LEFT JOIN users u ON u.id = m.actor_id ORDER BY m.id DESC LIMIT 12`).all()
        .map((r) => ({ action: r.action, targetType: r.target_type, targetId: r.target_id, note: r.note, at: r.created_at, actor: r.actor })),
    };
  });

  /* ---------- users */
  router.get('/api/admin/users', (c) => {
    c.require('admin.access');
    const where = [];
    const params = [];
    const q = str(c.query.get('q'), { max: 100 });
    if (q) { where.push('(u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const role = oneOf(c.query.get('role'), SITE_ROLES);
    if (role) { where.push('u.role = ?'); params.push(role); }
    const status = oneOf(c.query.get('status'), USER_STATUSES);
    if (status) { where.push('u.status = ?'); params.push(status); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const page = pageOf(c);
    const total = count(`SELECT COUNT(*) AS n FROM users u ${w}`, ...params);
    const rows = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id) AS post_count FROM users u ${w} ORDER BY u.created_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    // Email addresses are visible to Master Admins only.
    const showEmail = can(c.user, 'user.manage');
    const items = rows.map((u) => { const a = adminUser(u); if (!showEmail) delete a.email; return a; });
    return { items, total, page, pages: Math.max(1, Math.ceil(total / 25)), canManage: showEmail };
  });

  router.patch('/api/admin/users/:id', (c) => {
    const me = c.require('user.manage');
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!target) throw notFound('User not found');
    if (target.id === me.id) throw forbidden('You cannot change your own role or status');
    const role = c.body.role !== undefined ? oneOf(c.body.role, SITE_ROLES) : null;
    const status = c.body.status !== undefined ? oneOf(c.body.status, USER_STATUSES) : null;
    if (c.body.role !== undefined && !role) throw badRequest('Unknown role');
    if (c.body.status !== undefined && !status) throw badRequest('Unknown status');
    const note = str(c.body.note, { max: 500 });
    if (target.role === 'admin' && role && role !== 'admin' && count("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'") <= 1) {
      throw new HttpError(409, 'Sikhify needs at least one active Master Admin');
    }
    db.prepare('UPDATE users SET role = ?, status = ?, updated_at = ? WHERE id = ?').run(role || target.role, status || target.status, new Date().toISOString(), target.id);
    if (status === 'banned') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
    if (role && role !== target.role) {
      logModeration(me.id, 'user.role', 'user', target.id, `${target.role} → ${role}`);
      notify(target.id, { type: 'system', actorId: me.id, message: `Your Sikhify role is now ${role === 'admin' ? 'Master Admin' : role === 'moderator' ? 'Moderator' : 'User'}` });
    }
    if (status && status !== target.status) {
      logModeration(me.id, 'user.' + status, 'user', target.id, note);
      if (status === 'suspended') notify(target.id, { type: 'moderation', actorId: me.id, message: 'Your account has been suspended — you can read but not post' + (note ? ': ' + note : '') });
      if (status === 'active') notify(target.id, { type: 'moderation', actorId: me.id, message: 'Your account has been reinstated' });
    }
    const row = db.prepare('SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id) AS post_count FROM users u WHERE u.id = ?').get(target.id);
    return { user: adminUser(row) };
  });

  /** Issues a one-hour password reset link (for when email isn't configured). */
  router.post('/api/admin/users/:id/reset-link', (c) => {
    const me = c.require('user.manage');
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!target) throw notFound('User not found');
    logModeration(me.id, 'user.reset_link', 'user', target.id);
    return { link: router.createResetLink(target.id), expiresInMinutes: 60 };
  });

  /* ---------- posts & comments (moderation queues) */
  router.get('/api/admin/posts', (c) => {
    c.require('community.moderate');
    const status = oneOf(c.query.get('status'), ['published', 'hidden']);
    const q = str(c.query.get('q'), { max: 100 });
    const where = [];
    const params = [];
    if (status) { where.push('p.status = ?'); params.push(status); }
    if (q) { where.push('(p.body LIKE ? OR u.name LIKE ? OR u.username LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const page = pageOf(c);
    const total = count(`SELECT COUNT(*) AS n FROM posts p JOIN users u ON u.id = p.author_id ${w}`, ...params);
    const rows = db.prepare(`SELECT p.*, ${AUTHOR_COLUMNS}, g.name AS group_name, g.slug AS group_slug,
        (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'post' AND r.target_id = p.id AND r.status = 'pending') AS open_reports,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count
      FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN groups g ON g.id = p.group_id ${w} ORDER BY p.created_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    return {
      items: rows.map((r) => ({
        id: r.id, author: authorFrom(r), body: r.body, images: parseJson(r.images, []), status: r.status, createdAt: r.created_at,
        group: r.group_name ? { name: r.group_name, slug: r.group_slug } : null, openReports: r.open_reports, commentCount: r.comment_count,
      })),
      total, page, pages: Math.max(1, Math.ceil(total / 25)),
    };
  });

  router.get('/api/admin/comments', (c) => {
    c.require('community.moderate');
    const status = oneOf(c.query.get('status'), ['published', 'hidden']);
    const q = str(c.query.get('q'), { max: 100 });
    const where = [];
    const params = [];
    if (status) { where.push('cm.status = ?'); params.push(status); }
    if (q) { where.push('(cm.body LIKE ? OR u.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const page = pageOf(c);
    const total = count(`SELECT COUNT(*) AS n FROM comments cm JOIN users u ON u.id = cm.author_id ${w}`, ...params);
    const rows = db.prepare(`SELECT cm.*, ${AUTHOR_COLUMNS},
        (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'comment' AND r.target_id = cm.id AND r.status = 'pending') AS open_reports
      FROM comments cm JOIN users u ON u.id = cm.author_id ${w} ORDER BY cm.created_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    return {
      items: rows.map((r) => ({ id: r.id, postId: r.post_id, author: authorFrom(r), body: r.body, status: r.status, createdAt: r.created_at, openReports: r.open_reports })),
      total, page, pages: Math.max(1, Math.ceil(total / 25)),
    };
  });

  /* ---------- groups */
  router.get('/api/admin/groups', (c) => {
    c.require('community.moderate');
    const q = str(c.query.get('q'), { max: 100 });
    const status = oneOf(c.query.get('status'), ['active', 'suspended']);
    const where = [];
    const params = [];
    if (q) { where.push('g.name LIKE ?'); params.push(`%${q}%`); }
    if (status) { where.push('g.status = ?'); params.push(status); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = db.prepare(`SELECT g.*, u.name AS creator_name, u.username AS creator_username,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active') AS member_count,
        (SELECT COUNT(*) FROM posts p WHERE p.group_id = g.id) AS post_count
      FROM groups g LEFT JOIN users u ON u.id = g.created_by ${w} ORDER BY g.created_at DESC LIMIT 100`).all(...params);
    return {
      items: rows.map((g) => ({
        id: g.id, slug: g.slug, name: g.name, category: g.category, privacy: g.privacy, status: g.status, createdAt: g.created_at,
        memberCount: g.member_count, postCount: g.post_count, creator: g.creator_name ? { name: g.creator_name, username: g.creator_username } : null,
      })),
    };
  });

  router.post('/api/admin/groups/:id/status', (c) => {
    const me = c.require('community.moderate');
    const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!g) throw notFound('Group not found');
    const status = oneOf(c.body.status, ['active', 'suspended']);
    if (!status) throw badRequest('Unknown status');
    db.prepare('UPDATE groups SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), g.id);
    logModeration(me.id, 'group.' + status, 'group', g.id, str(c.body.note, { max: 500 }));
    for (const a of db.prepare("SELECT user_id FROM group_members WHERE group_id = ? AND role = 'admin'").all(g.id)) {
      notify(a.user_id, { type: 'moderation', actorId: me.id, link: `/community/groups/${g.slug}`, message: `${g.name} was ${status === 'suspended' ? 'suspended' : 'reinstated'} by Sikhify moderators` });
    }
    return { ok: true };
  });

  /* ---------- reports */
  router.get('/api/admin/reports', (c) => {
    c.require('community.moderate');
    const status = oneOf(c.query.get('status'), ['pending', 'resolved', 'dismissed']);
    const page = pageOf(c);
    const w = status ? 'WHERE r.status = ?' : '';
    const params = status ? [status] : [];
    const total = count(`SELECT COUNT(*) AS n FROM reports r ${w}`, ...params);
    const rows = db.prepare(`SELECT r.*, ru.name AS reporter_name, ru.username AS reporter_username, mu.name AS resolver_name FROM reports r
      LEFT JOIN users ru ON ru.id = r.reporter_id LEFT JOIN users mu ON mu.id = r.resolved_by ${w}
      ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25);
    const link = (r) => {
      if (r.target_type === 'post') return `/community/post/${r.target_id}`;
      if (r.target_type === 'comment') { const cm = db.prepare('SELECT post_id FROM comments WHERE id = ?').get(r.target_id); return cm ? `/community/post/${cm.post_id}#comment-${r.target_id}` : null; }
      if (r.target_type === 'user') { const u = db.prepare('SELECT username FROM users WHERE id = ?').get(r.target_id); return u ? `/community/profile/${u.username}` : null; }
      const g = db.prepare('SELECT slug FROM groups WHERE id = ?').get(r.target_id); return g ? `/community/groups/${g.slug}` : null;
    };
    return {
      items: rows.map((r) => ({
        id: r.id, targetType: r.target_type, targetId: r.target_id, targetPreview: r.target_preview, targetLink: link(r),
        reason: r.reason, details: r.details, status: r.status, resolution: r.resolution, createdAt: r.created_at, resolvedAt: r.resolved_at,
        reporter: r.reporter_name ? { name: r.reporter_name, username: r.reporter_username } : null, resolvedBy: r.resolver_name,
      })),
      total, page, pages: Math.max(1, Math.ceil(total / 25)),
    };
  });

  /**
   * Resolve or dismiss. `action` applies to the reported item:
   * none · hide (post/comment) · delete (post/comment) · suspend_user · suspend_group
   */
  router.post('/api/admin/reports/:id/resolve', (c) => {
    const me = c.require('community.moderate');
    const r = db.prepare('SELECT * FROM reports WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!r) throw notFound('Report not found');
    if (r.status !== 'pending') throw new HttpError(409, 'This report has already been handled');
    const outcome = oneOf(c.body.outcome, ['resolved', 'dismissed']);
    if (!outcome) throw badRequest('Choose resolve or dismiss');
    const action = outcome === 'dismissed' ? 'none' : oneOf(c.body.action, ['none', 'hide', 'delete', 'suspend_user', 'suspend_group'], 'none');
    const note = str(c.body.note, { max: 500 });
    const now = new Date().toISOString();

    if (action === 'hide' || action === 'delete') {
      if (!['post', 'comment'].includes(r.target_type)) throw badRequest('Only posts and comments can be hidden or deleted');
      const table = r.target_type === 'post' ? 'posts' : 'comments';
      const row = db.prepare(`SELECT author_id FROM ${table} WHERE id = ?`).get(r.target_id);
      if (row) {
        if (action === 'hide') db.prepare(`UPDATE ${table} SET status = 'hidden' WHERE id = ?`).run(r.target_id);
        else db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(r.target_id);
        notify(row.author_id, { type: 'moderation', actorId: me.id, message: `Your ${r.target_type} was ${action === 'hide' ? 'hidden' : 'removed'} after a report (${r.reason})` });
      }
    } else if (action === 'suspend_user') {
      if (!c.user || c.user.role !== 'admin') throw forbidden('Only Master Admins can suspend accounts');
      const uid = r.target_type === 'user' ? r.target_id
        : r.target_type === 'post' ? (db.prepare('SELECT author_id FROM posts WHERE id = ?').get(r.target_id) || {}).author_id
          : r.target_type === 'comment' ? (db.prepare('SELECT author_id FROM comments WHERE id = ?').get(r.target_id) || {}).author_id : null;
      const target = uid && db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
      if (target && target.role !== 'admin') {
        db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(uid);
        notify(uid, { type: 'moderation', actorId: me.id, message: 'Your account has been suspended after a report — you can read but not post' });
      }
    } else if (action === 'suspend_group') {
      if (r.target_type !== 'group') throw badRequest('Only groups can be suspended');
      db.prepare("UPDATE groups SET status = 'suspended' WHERE id = ?").run(r.target_id);
    }
    // Resolve every open report about the same item at once.
    const affected = db.prepare("SELECT id, reporter_id FROM reports WHERE target_type = ? AND target_id = ? AND status = 'pending'").all(r.target_type, r.target_id);
    db.prepare("UPDATE reports SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ? WHERE target_type = ? AND target_id = ? AND status = 'pending'")
      .run(outcome, [action !== 'none' ? action : '', note].filter(Boolean).join(' — '), me.id, now, r.target_type, r.target_id);
    for (const a of affected) {
      notify(a.reporter_id, { type: 'report_resolved', actorId: me.id, message: outcome === 'resolved' ? 'Thank you — a report you made has been reviewed and action was taken.' : 'Thank you — a report you made has been reviewed. No action was needed.' });
    }
    logModeration(me.id, `report.${outcome}.${action}`, r.target_type, r.target_id, note);
    return { ok: true, affected: affected.length };
  });

  router.get('/api/admin/moderation-log', (c) => {
    c.require('admin.access');
    const page = pageOf(c);
    const rows = db.prepare(`SELECT m.*, u.name AS actor FROM moderation_log m LEFT JOIN users u ON u.id = m.actor_id ORDER BY m.id DESC LIMIT 50 OFFSET ?`).all((page - 1) * 50);
    return { items: rows.map((r) => ({ id: r.id, action: r.action, targetType: r.target_type, targetId: r.target_id, note: r.note, at: r.created_at, actor: r.actor })) };
  });

  /* ---------- analytics (counted from real rows) */
  router.get('/api/admin/analytics', (c) => {
    c.require('analytics.view');
    const days = 30;
    const start = new Date(Date.now() - (days - 1) * 864e5);
    const startIso = start.toISOString().slice(0, 10);
    const daily = (table, col = 'created_at') => {
      const rows = db.prepare(`SELECT substr(${col}, 1, 10) AS d, COUNT(*) AS n FROM ${table} WHERE substr(${col}, 1, 10) >= ? GROUP BY d`).all(startIso);
      const map = Object.fromEntries(rows.map((r) => [r.d, r.n]));
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10);
        return { date: d, value: map[d] || 0 };
      });
    };
    return {
      rangeDays: days,
      signups: daily('users'),
      posts: daily('posts'),
      comments: daily('comments'),
      reactions: daily('post_reactions'),
      reportsByStatus: db.prepare('SELECT status AS label, COUNT(*) AS value FROM reports GROUP BY status').all(),
      submissionsByStatus: db.prepare('SELECT status AS label, COUNT(*) AS value FROM submissions GROUP BY status').all(),
      usersByRole: db.prepare('SELECT role AS label, COUNT(*) AS value FROM users GROUP BY role').all(),
      topGroups: db.prepare(`SELECT g.name AS label, g.slug, (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active') AS value
        FROM groups g WHERE g.status = 'active' ORDER BY value DESC LIMIT 5`).all(),
      entriesByType: db.prepare("SELECT type AS label, COUNT(*) AS value FROM entries WHERE publish_status = 'published' GROUP BY type ORDER BY value DESC").all(),
      activeUsers30d: count('SELECT COUNT(*) AS n FROM users WHERE last_login_at >= ?', start.toISOString()),
    };
  });

  /* ---------- settings (each one is enforced by the API) */
  router.get('/api/admin/settings', (c) => {
    c.require('admin.access');
    return { settings: settings.all() };
  });
  router.patch('/api/admin/settings', (c) => {
    const me = c.require('settings.manage');
    const fields = {};
    for (const [key, def] of Object.entries(settings.DEFAULTS)) {
      if (c.body[key] === undefined) continue;
      if (typeof def === 'boolean') settings.set(key, !!c.body[key]);
      else {
        const v = str(c.body[key], { max: 500 });
        settings.set(key, v);
      }
      logModeration(me.id, 'settings.update', 'settings', null, key);
    }
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    return { settings: settings.all() };
  });

  /** Public, non-sensitive settings the community UI needs. */
  router.get('/api/settings/public', () => {
    const s = settings.all();
    return { registrationOpen: s.registration_open, communityReadOnly: s.community_read_only, submissionsOpen: s.submissions_open, communityNotice: s.community_notice };
  });
}
