/* Sikhify API — routes/users.js: public profiles, own profile, activity. */
import { badRequest, notFound, str } from '../lib/http.js';
import { profileUser, selfUser, publicUser } from '../lib/serialize.js';
import { can } from '../../../shared/roles.js';
import { LIMITS } from '../../../shared/community.js';

export default function register(router, { db }) {
  router.get('/api/users/:username', (c) => {
    const u = db.prepare('SELECT * FROM users WHERE username = ?').get(c.params.username);
    const staff = can(c.user, 'community.moderate');
    if (!u || (u.status === 'banned' && !staff)) throw notFound('Member not found');
    const isSelf = !!c.user && c.user.id === u.id;
    // Only groups the viewer is allowed to see.
    const groups = db.prepare(`SELECT g.id, g.slug, g.name, g.privacy, gm.role FROM group_members gm JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = ? AND gm.status = 'active' AND g.status = 'active' AND (g.privacy = 'public' OR ?) ORDER BY g.name`).all(u.id, isSelf || staff ? 1 : 0);
    const counts = db.prepare(`SELECT
        (SELECT COUNT(*) FROM posts p LEFT JOIN groups g ON g.id = p.group_id WHERE p.author_id = ? AND p.status = 'published' AND (p.group_id IS NULL OR g.privacy = 'public')) AS posts,
        (SELECT COUNT(*) FROM comments WHERE author_id = ? AND status = 'published') AS comments`).get(u.id, u.id);
    return { profile: { ...profileUser(u, { isSelf, isStaff: staff }), groups, counts, isSelf } };
  });

  /** Recent activity — only the person themselves can see it. */
  router.get('/api/me/activity', (c) => {
    const me = c.requireUser();
    const comments = db.prepare(`SELECT c.id, c.post_id, c.body, c.created_at, c.status FROM comments c WHERE c.author_id = ? ORDER BY c.created_at DESC LIMIT 20`).all(me.id);
    const reactions = db.prepare(`SELECT r.post_id, r.type, r.created_at, substr(p.body, 1, 120) AS post_excerpt FROM post_reactions r JOIN posts p ON p.id = r.post_id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 20`).all(me.id);
    const items = [
      ...comments.map((x) => ({ kind: 'comment', at: x.created_at, text: x.body, link: `/community/post/${x.post_id}#comment-${x.id}`, status: x.status })),
      ...reactions.map((x) => ({ kind: 'reaction', at: x.created_at, text: x.post_excerpt, reaction: x.type, link: `/community/post/${x.post_id}` })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30);
    return { items };
  });

  router.patch('/api/me/profile', (c) => {
    const me = c.requireUser();
    const b = c.body;
    const sets = {};
    const fields = {};
    if (b.name !== undefined) {
      sets.name = str(b.name, { max: LIMITS.name + 1 });
      if (sets.name.length < 2 || sets.name.length > LIMITS.name) fields.name = `2–${LIMITS.name} characters`;
    }
    if (b.bio !== undefined) {
      sets.bio = str(b.bio, { max: LIMITS.bio + 1 });
      if (sets.bio.length > LIMITS.bio) fields.bio = `Up to ${LIMITS.bio} characters`;
    }
    if (b.location !== undefined) sets.location = str(b.location, { max: 120 });
    if (b.showLocation !== undefined) sets.show_location = b.showLocation ? 1 : 0;
    if (b.interests !== undefined) {
      if (!Array.isArray(b.interests)) fields.interests = 'Interests must be a list';
      else {
        const list = [...new Set(b.interests.map((s) => str(s, { max: 40 })).filter(Boolean))];
        if (list.length > LIMITS.interests) fields.interests = `Up to ${LIMITS.interests} interests`;
        sets.interests = JSON.stringify(list);
      }
    }
    if (b.avatarUrl !== undefined) {
      const url = str(b.avatarUrl, { max: 300 });
      if (url && !(url.startsWith('/uploads/') && db.prepare("SELECT 1 FROM uploads WHERE path = ? AND owner_id = ? AND purpose = 'avatar'").get(url.slice(9), me.id))) {
        fields.avatarUrl = 'Upload your photo with the uploader';
      }
      sets.avatar_url = url;
    }
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    const keys = Object.keys(sets);
    if (keys.length) db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...keys.map((k) => sets[k]), new Date().toISOString(), me.id);
    return { user: selfUser(db.prepare('SELECT * FROM users WHERE id = ?').get(me.id)) };
  });

  /** Member directory search (public info only). */
  router.get('/api/users', (c) => {
    const q = str(c.query.get('q'), { max: 60 });
    if (q.length < 2) return { items: [] };
    const rows = db.prepare(`SELECT * FROM users WHERE status != 'banned' AND (name LIKE ? OR username LIKE ?) ORDER BY name LIMIT 20`).all(`%${q}%`, `%${q}%`);
    return { items: rows.map(publicUser) };
  });
}
