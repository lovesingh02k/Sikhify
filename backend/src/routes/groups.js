/* ==========================================================================
   Sikhify API — routes/groups.js
   Groups, membership and group-level roles. A Group Admin controls only the
   groups where they hold the admin role; site moderators can suspend any
   group; only Master Admins (or the group's admins) delete one.
   ========================================================================== */
import { HttpError, badRequest, notFound, forbidden, str, int, oneOf } from '../lib/http.js';
import { publicUser } from '../lib/serialize.js';
import { transaction } from '../db/database.js';
import { can, groupAbilities, GROUP_ROLES } from '../../../shared/roles.js';
import { GROUP_CATEGORIES, LIMITS } from '../../../shared/community.js';
import { uniqueSlug } from '../lib/util.js';

export default function register(router, { db, notify, logModeration, rate, settings }) {
  const membershipOf = (groupId, userId) => (userId ? db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId) : null);
  const memberCount = (groupId) => db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ? AND status = 'active'").get(groupId).n;

  function shape(g, viewer) {
    const m = viewer ? membershipOf(g.id, viewer.id) : null;
    const ab = groupAbilities(viewer, m);
    return {
      id: g.id, slug: g.slug, name: g.name, description: g.description, about: g.about, category: g.category,
      privacy: g.privacy, coverUrl: g.cover_url, location: g.location, status: g.status, createdAt: g.created_at,
      memberCount: g.member_count ?? memberCount(g.id),
      postCount: db.prepare("SELECT COUNT(*) AS n FROM posts WHERE group_id = ? AND status = 'published'").get(g.id).n,
      viewer: { ...ab, canJoin: !!viewer && !m && can(viewer, 'post.create') && g.status === 'active' },
    };
  }

  function findGroup(idOrSlug, viewer) {
    const g = db.prepare('SELECT * FROM groups WHERE id = ? OR slug = ?').get(int(idOrSlug, { fallback: 0 }), String(idOrSlug));
    if (!g) throw notFound('Group not found');
    if (g.status !== 'active' && !can(viewer, 'community.moderate')) {
      const m = viewer ? membershipOf(g.id, viewer.id) : null;
      if (!(m && m.role === 'admin')) throw notFound('This group is not available');
    }
    return g;
  }

  function cleanGroupInput(body, { partial = false } = {}) {
    const out = {};
    const fields = {};
    if (!partial || body.name !== undefined) {
      out.name = str(body.name, { max: LIMITS.groupName + 1 });
      if (out.name.length < 3) fields.name = 'Group name must be at least 3 characters';
      if (out.name.length > LIMITS.groupName) fields.name = `Up to ${LIMITS.groupName} characters`;
    }
    if (!partial || body.description !== undefined) {
      out.description = str(body.description, { max: LIMITS.groupDescription + 1 });
      if (out.description.length > LIMITS.groupDescription) fields.description = `Up to ${LIMITS.groupDescription} characters`;
      if (!partial && out.description.length < 10) fields.description = 'Describe the group in at least 10 characters';
    }
    if (body.about !== undefined) out.about = str(body.about, { max: LIMITS.groupAbout });
    if (!partial || body.category !== undefined) {
      out.category = oneOf(body.category, GROUP_CATEGORIES);
      if (!out.category) fields.category = 'Choose a category';
    }
    if (!partial || body.privacy !== undefined) {
      out.privacy = oneOf(body.privacy, ['public', 'private']);
      if (!out.privacy) fields.privacy = 'Choose public or private';
    }
    if (body.location !== undefined) out.location = str(body.location, { max: 120 });
    if (body.coverUrl !== undefined) {
      const cover = str(body.coverUrl, { max: 300 });
      if (cover && !(cover.startsWith('/uploads/') && db.prepare("SELECT 1 FROM uploads WHERE path = ? AND purpose = 'group-cover'").get(cover.slice(9)))) {
        fields.coverUrl = 'Upload the cover image with the uploader';
      }
      out.cover_url = cover;
    }
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    return out;
  }

  router.get('/api/groups', (c) => {
    const viewer = c.user;
    const q = str(c.query.get('q'), { max: 100 });
    const category = oneOf(c.query.get('category'), GROUP_CATEGORIES);
    const mine = c.query.get('mine') === '1';
    const where = [];
    const params = [];
    if (!can(viewer, 'community.moderate')) where.push("g.status = 'active'");
    if (q) { where.push('(g.name LIKE ? OR g.description LIKE ? OR g.location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (category) { where.push('g.category = ?'); params.push(category); }
    if (mine) {
      const me = c.requireUser();
      where.push("EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = ? AND gm.status IN ('active','pending'))");
      params.push(me.id);
    }
    const rows = db.prepare(`SELECT g.*, (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active') AS member_count
      FROM groups g ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY member_count DESC, g.created_at DESC LIMIT 100`).all(...params);
    return { items: rows.map((g) => shape(g, viewer)) };
  });

  router.get('/api/groups/:id', (c) => ({ group: shape(findGroup(c.params.id, c.user), c.user) }));

  router.post('/api/groups', (c) => {
    const user = c.require('group.create');
    if (settings.get('community_read_only') && !can(user, 'community.moderate')) throw new HttpError(403, 'The community is read-only right now.');
    rate('group', 'group:' + user.id);
    const input = cleanGroupInput(c.body);
    const slug = uniqueSlug(input.name, (s) => !!db.prepare('SELECT 1 FROM groups WHERE slug = ?').get(s));
    const id = transaction(db, () => {
      const info = db.prepare(`INSERT INTO groups (slug, name, description, about, category, privacy, location, cover_url, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(slug, input.name, input.description, input.about || '', input.category, input.privacy, input.location || '', input.cover_url || '', user.id);
      const gid = Number(info.lastInsertRowid);
      db.prepare("INSERT INTO group_members (group_id, user_id, role, status) VALUES (?, ?, 'admin', 'active')").run(gid, user.id);
      return gid;
    });
    return { group: shape(db.prepare('SELECT * FROM groups WHERE id = ?').get(id), user) };
  });

  router.patch('/api/groups/:id', (c) => {
    const user = c.requireUser();
    const g = findGroup(c.params.id, user);
    if (!groupAbilities(user, membershipOf(g.id, user.id)).canManage) throw forbidden('Only this group’s admins can change its settings');
    const input = cleanGroupInput(c.body, { partial: true });
    const sets = Object.keys(input);
    if (sets.length) {
      db.prepare(`UPDATE groups SET ${sets.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...sets.map((k) => input[k]), new Date().toISOString(), g.id);
    }
    return { group: shape(db.prepare('SELECT * FROM groups WHERE id = ?').get(g.id), user) };
  });

  router.delete('/api/groups/:id', (c) => {
    const user = c.requireUser();
    const g = findGroup(c.params.id, user);
    if (!groupAbilities(user, membershipOf(g.id, user.id)).canDelete) throw forbidden('Only this group’s admins can delete it');
    db.prepare('DELETE FROM groups WHERE id = ?').run(g.id);
    logModeration(user.id, 'group.delete', 'group', g.id, g.name);
    return { ok: true };
  });

  /* ---------- membership */
  router.post('/api/groups/:id/join', (c) => {
    const user = c.require('post.create');
    const g = findGroup(c.params.id, user);
    if (g.status !== 'active') throw forbidden('This group is suspended');
    const m = membershipOf(g.id, user.id);
    if (m) {
      if (m.status === 'banned') throw forbidden('You cannot join this group');
      return { group: shape(g, user) };
    }
    const status = g.privacy === 'public' ? 'active' : 'pending';
    db.prepare("INSERT INTO group_members (group_id, user_id, role, status) VALUES (?, ?, 'member', ?)").run(g.id, user.id, status);
    if (status === 'pending') {
      for (const a of db.prepare("SELECT user_id FROM group_members WHERE group_id = ? AND role IN ('admin','moderator') AND status = 'active'").all(g.id)) {
        notify(a.user_id, { type: 'group_join_request', actorId: user.id, link: `/community/groups/${g.slug}/members`, message: `${user.name} asked to join ${g.name}` });
      }
    }
    return { group: shape(g, user) };
  });

  router.post('/api/groups/:id/leave', (c) => {
    const user = c.requireUser();
    const g = findGroup(c.params.id, user);
    const m = membershipOf(g.id, user.id);
    if (!m || m.status === 'banned') return { group: shape(g, user) };
    if (m.role === 'admin' && m.status === 'active') {
      const admins = db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ? AND role = 'admin' AND status = 'active'").get(g.id).n;
      if (admins <= 1) throw new HttpError(409, 'You are the only admin. Make another member an admin before leaving.');
    }
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(g.id, user.id);
    return { group: shape(g, user) };
  });

  router.get('/api/groups/:id/members', (c) => {
    const viewer = c.user;
    const g = findGroup(c.params.id, viewer);
    const ab = groupAbilities(viewer, viewer ? membershipOf(g.id, viewer.id) : null);
    if (g.privacy === 'private' && !ab.isMember && !can(viewer, 'community.moderate')) throw forbidden('Members of private groups are only visible to members');
    const statuses = ab.canApproveMembers ? "('active','pending','banned')" : "('active')";
    const rows = db.prepare(`SELECT gm.role AS group_role, gm.status AS member_status, gm.joined_at, u.* FROM group_members gm JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ? AND gm.status IN ${statuses} AND (u.status != 'banned' OR ?)
      ORDER BY CASE gm.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, CASE gm.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, gm.joined_at`).all(g.id, ab.canApproveMembers ? 1 : 0);
    return {
      items: rows.map((r) => ({ user: publicUser(r), role: r.group_role, status: r.member_status, joinedAt: r.joined_at })),
      viewer: ab,
    };
  });

  /** Approve / reject requests, ban, change group roles. */
  router.patch('/api/groups/:id/members/:userId', (c) => {
    const user = c.requireUser();
    const g = findGroup(c.params.id, user);
    const ab = groupAbilities(user, membershipOf(g.id, user.id));
    const targetId = int(c.params.userId, { fallback: 0 });
    const m = membershipOf(g.id, targetId);
    if (!m) throw notFound('That person is not in this group');
    const status = c.body.status !== undefined ? oneOf(c.body.status, ['active', 'banned']) : null;
    const role = c.body.role !== undefined ? oneOf(c.body.role, GROUP_ROLES) : null;
    if (c.body.status !== undefined && !status) throw badRequest('Unknown status');
    if (c.body.role !== undefined && !role) throw badRequest('Unknown role');

    if (role) {
      if (!ab.canManage) throw forbidden('Only group admins can change roles');
      if (m.role === 'admin' && role !== 'admin') {
        const admins = db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ? AND role = 'admin' AND status = 'active'").get(g.id).n;
        if (admins <= 1) throw new HttpError(409, 'A group needs at least one admin');
      }
    }
    if (status) {
      if (!ab.canApproveMembers) throw forbidden();
      if (targetId === user.id) throw badRequest('You cannot change your own membership status');
      // Group moderators cannot ban admins or other moderators.
      if (status === 'banned' && !ab.canManage && m.role !== 'member') throw forbidden('Only group admins can ban moderators or admins');
    }
    const nextStatus = status || m.status;
    const nextRole = status === 'banned' ? 'member' : role || m.role;
    db.prepare('UPDATE group_members SET role = ?, status = ? WHERE group_id = ? AND user_id = ?').run(nextRole, nextStatus, g.id, targetId);

    if (m.status === 'pending' && nextStatus === 'active') notify(targetId, { type: 'group_join_approved', actorId: user.id, link: `/community/groups/${g.slug}`, message: `Your request to join ${g.name} was approved` });
    if (role && role !== m.role) notify(targetId, { type: 'group_role', actorId: user.id, link: `/community/groups/${g.slug}`, message: `You are now ${role === 'admin' ? 'an admin' : role === 'moderator' ? 'a moderator' : 'a member'} of ${g.name}` });
    if (status === 'banned') logModeration(user.id, 'group.ban_member', 'group', g.id, `user ${targetId}`);
    return { ok: true };
  });

  router.delete('/api/groups/:id/members/:userId', (c) => {
    const user = c.requireUser();
    const g = findGroup(c.params.id, user);
    const ab = groupAbilities(user, membershipOf(g.id, user.id));
    const targetId = int(c.params.userId, { fallback: 0 });
    const m = membershipOf(g.id, targetId);
    if (!m) return { ok: true };
    if (!ab.canApproveMembers) throw forbidden();
    if (m.role !== 'member' && !ab.canManage) throw forbidden('Only group admins can remove moderators or admins');
    if (m.role === 'admin') {
      const admins = db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ? AND role = 'admin' AND status = 'active'").get(g.id).n;
      if (admins <= 1) throw new HttpError(409, 'A group needs at least one admin');
    }
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(g.id, targetId);
    return { ok: true };
  });
}
