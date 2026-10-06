/* ==========================================================================
   Sikhify API — routes/posts.js
   Feed, posts, reactions, saves, shares and threaded comments.
   Visibility is decided in SQL for every query (see visibleSql):
   • hidden posts/comments: only their author and site moderators see them
   • private-group posts: only active members (and site moderators)
   • suspended groups and banned authors: hidden from everyone but staff
   ========================================================================== */
import { HttpError, badRequest, notFound, forbidden, str, int, oneOf } from '../lib/http.js';
import { AUTHOR_COLUMNS, authorFrom } from '../lib/serialize.js';
import { parseJson, transaction } from '../db/database.js';
import { can, groupAbilities } from '../../shared/roles.js';
import { LIMITS, REACTION_TYPES } from '../../shared/community.js';
import { excerpt } from '../lib/util.js';

const PAGE = 20;

export default function register(router, deps) {
  const { db, settings, notify, logModeration, rate } = deps;

  const isStaffMod = (user) => can(user, 'community.moderate');
  const membershipOf = (groupId, userId) => (groupId && userId ? db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId) : null);

  function visibleSql(viewer) {
    if (isStaffMod(viewer)) return { sql: '1=1', params: [] };
    const uid = viewer ? viewer.id : -1;
    return {
      sql: `(p.status = 'published' OR p.author_id = ?) AND u.status != 'banned'
        AND (p.group_id IS NULL OR (g.status = 'active' AND (g.privacy = 'public'
          OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p.group_id AND gm.user_id = ? AND gm.status = 'active'))))`,
      params: [uid, uid],
    };
  }

  const SELECT = `SELECT p.*, ${AUTHOR_COLUMNS}, g.name AS group_name, g.slug AS group_slug, g.privacy AS group_privacy,
      (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id AND cm.status = 'published') AS comment_count,
      (SELECT r.type FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS my_reaction,
      EXISTS (SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = ?) AS is_saved
    FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN groups g ON g.id = p.group_id`;

  function reactionCounts(ids) {
    const out = {};
    if (!ids.length) return out;
    const rows = db.prepare(`SELECT post_id, type, COUNT(*) AS n FROM post_reactions WHERE post_id IN (${ids.map(() => '?').join(',')}) GROUP BY post_id, type`).all(...ids);
    for (const r of rows) (out[r.post_id] ||= {})[r.type] = r.n;
    return out;
  }

  function shape(rows, viewer) {
    const counts = reactionCounts(rows.map((r) => r.id));
    const memberships = {};
    return rows.map((r) => {
      let gAbilities = null;
      if (r.group_id && viewer) {
        memberships[r.group_id] ??= membershipOf(r.group_id, viewer.id) || null;
        gAbilities = groupAbilities(viewer, memberships[r.group_id]);
      }
      const isAuthor = !!viewer && viewer.id === r.author_id;
      const canModerate = isStaffMod(viewer) || !!(gAbilities && gAbilities.canModerate);
      const reactions = counts[r.id] || {};
      return {
        id: r.id,
        author: authorFrom(r),
        group: r.group_id ? { id: r.group_id, slug: r.group_slug, name: r.group_name, privacy: r.group_privacy } : null,
        body: r.body,
        images: parseJson(r.images, []),
        status: r.status,
        moderationNote: isAuthor || canModerate ? r.moderation_note : '',
        createdAt: r.created_at,
        editedAt: r.edited_at,
        reactions,
        reactionCount: Object.values(reactions).reduce((a, b) => a + b, 0),
        myReaction: r.my_reaction || null,
        commentCount: r.comment_count,
        shareCount: r.share_count,
        saved: !!r.is_saved,
        canEdit: isAuthor && can(viewer, 'post.create'),
        canDelete: isAuthor || canModerate,
        canModerate,
      };
    });
  }

  function loadPost(id, viewer) {
    const v = visibleSql(viewer);
    const uid = viewer ? viewer.id : -1;
    const row = db.prepare(`${SELECT} WHERE p.id = ? AND ${v.sql}`).get(uid, uid, id, ...v.params);
    return row ? shape([row], viewer)[0] : null;
  }
  deps.loadPost = loadPost;

  /** Raw row + whether the viewer can see it (for actions). */
  function requireVisiblePost(id, viewer) {
    const post = loadPost(int(id, { min: 1, fallback: 0 }), viewer);
    if (!post) throw notFound('This post is not available');
    return post;
  }

  function cursorClause(before) {
    if (!before) return { sql: '', params: [] };
    const [at, id] = String(before).split('|');
    if (!at || !Number.isFinite(Number(id))) return { sql: '', params: [] };
    return { sql: ' AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))', params: [at, at, Number(id)] };
  }

  /* ---------- feed / lists */
  router.get('/api/posts', (c) => {
    const viewer = c.user;
    const uid = viewer ? viewer.id : -1;
    const scope = str(c.query.get('scope'), { max: 100 }) || 'feed';
    const v = visibleSql(viewer);
    const where = [v.sql];
    const params = [...v.params];
    let order = 'p.created_at DESC, p.id DESC';
    let join = '';
    let usesCursor = true;

    if (scope === 'feed') {
      if (viewer) {
        where.push(`(p.group_id IS NULL OR g.privacy = 'public' OR p.group_id IN (SELECT group_id FROM group_members WHERE user_id = ? AND status = 'active'))`);
        params.push(uid);
      } else where.push(`(p.group_id IS NULL OR g.privacy = 'public')`);
    } else if (scope === 'discover') {
      where.push(`(p.group_id IS NULL OR g.privacy = 'public') AND p.status = 'published' AND p.created_at >= ?`);
      params.push(new Date(Date.now() - 30 * 864e5).toISOString());
      order = `((SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id) + 2 * (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id AND cm.status = 'published') + p.share_count) DESC, p.created_at DESC`;
      usesCursor = false;
    } else if (scope.startsWith('group:')) {
      const group = db.prepare('SELECT * FROM groups WHERE id = ? OR slug = ?').get(int(scope.slice(6), { fallback: 0 }), scope.slice(6));
      if (!group) throw notFound('Group not found');
      const m = viewer ? membershipOf(group.id, viewer.id) : null;
      if (!isStaffMod(viewer) && (group.status !== 'active' || (group.privacy === 'private' && !(m && m.status === 'active')))) {
        throw forbidden(group.status !== 'active' ? 'This group is suspended' : 'Join this private group to see its posts');
      }
      where.push('p.group_id = ?');
      params.push(group.id);
    } else if (scope.startsWith('user:')) {
      const target = db.prepare('SELECT id FROM users WHERE username = ?').get(scope.slice(5));
      if (!target) throw notFound('Member not found');
      where.push('p.author_id = ?');
      params.push(target.id);
    } else if (scope === 'saved') {
      const me = c.requireUser();
      join = ' JOIN saved_posts sp ON sp.post_id = p.id AND sp.user_id = ' + Number(me.id);
      order = 'sp.created_at DESC, p.id DESC';
      usesCursor = false;
    } else throw badRequest('Unknown feed');

    const page = int(c.query.get('page'), { min: 1, max: 500, fallback: 1 });
    const cur = usesCursor ? cursorClause(c.query.get('before')) : { sql: '', params: [] };
    const sql = `${SELECT.replace('LEFT JOIN groups g ON g.id = p.group_id', 'LEFT JOIN groups g ON g.id = p.group_id' + join)}
      WHERE ${where.join(' AND ')}${cur.sql} ORDER BY ${order} LIMIT ? OFFSET ?`;
    const rows = db.prepare(sql).all(uid, uid, ...params, ...cur.params, PAGE + 1, usesCursor ? 0 : (page - 1) * PAGE);
    const more = rows.length > PAGE;
    const items = shape(rows.slice(0, PAGE), viewer);
    const last = items[items.length - 1];
    return {
      items,
      next: more ? (usesCursor ? { before: `${last.createdAt}|${last.id}` } : { page: page + 1 }) : null,
    };
  });

  router.get('/api/posts/:id', (c) => ({ post: requireVisiblePost(c.params.id, c.user) }));

  /* ---------- create / edit / delete */
  function cleanImages(input, userId) {
    if (input === undefined) return [];
    if (!Array.isArray(input)) throw badRequest('Images must be a list');
    if (input.length > LIMITS.postImages) throw badRequest(`Attach at most ${LIMITS.postImages} images`);
    return input.map((url) => {
      const path = String(url || '').replace(/^\/uploads\//, '');
      const own = db.prepare("SELECT 1 FROM uploads WHERE path = ? AND owner_id = ? AND purpose = 'post'").get(path, userId);
      if (!own) throw badRequest('One of the images was not uploaded by you');
      return '/uploads/' + path;
    });
  }
  function assertWritable(user) {
    if (settings.get('community_read_only') && !isStaffMod(user)) throw new HttpError(403, 'The community is read-only right now. Please try again later.');
  }

  router.post('/api/posts', (c) => {
    const user = c.require('post.create');
    assertWritable(user);
    rate('post', 'post:' + user.id);
    const body = str(c.body.body, { max: LIMITS.postBody + 1 });
    if (!body) throw badRequest('Please fix the highlighted fields', { body: 'Write something to post' });
    if (body.length > LIMITS.postBody) throw badRequest('Please fix the highlighted fields', { body: `Posts can be up to ${LIMITS.postBody} characters` });
    const images = cleanImages(c.body.images, user.id);
    let groupId = null;
    if (c.body.groupId) {
      const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(int(c.body.groupId, { fallback: 0 }));
      if (!group || group.status !== 'active') throw badRequest('That group is not available');
      if (!groupAbilities(user, membershipOf(group.id, user.id)).canPost) throw forbidden('Join the group to post in it');
      groupId = group.id;
    }
    const info = db.prepare('INSERT INTO posts (author_id, group_id, body, images) VALUES (?, ?, ?, ?)').run(user.id, groupId, body, JSON.stringify(images));
    return { post: loadPost(Number(info.lastInsertRowid), user) };
  });

  router.patch('/api/posts/:id', (c) => {
    const user = c.require('post.create');
    const post = requireVisiblePost(c.params.id, user);
    if (post.author.id !== user.id) throw forbidden('You can only edit your own posts');
    const body = str(c.body.body, { max: LIMITS.postBody + 1 });
    if (!body) throw badRequest('Please fix the highlighted fields', { body: 'A post cannot be empty' });
    if (body.length > LIMITS.postBody) throw badRequest('Please fix the highlighted fields', { body: `Posts can be up to ${LIMITS.postBody} characters` });
    const images = c.body.images === undefined ? post.images : cleanImages(c.body.images, user.id);
    const now = new Date().toISOString();
    db.prepare('UPDATE posts SET body = ?, images = ?, updated_at = ?, edited_at = ? WHERE id = ?').run(body, JSON.stringify(images), now, now, post.id);
    return { post: loadPost(post.id, user) };
  });

  router.delete('/api/posts/:id', (c) => {
    const user = c.requireUser();
    const post = requireVisiblePost(c.params.id, user);
    if (!post.canDelete) throw forbidden();
    transaction(db, () => {
      db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
      if (post.author.id !== user.id) {
        logModeration(user.id, 'post.delete', 'post', post.id, excerpt(post.body, 200));
        notify(post.author.id, { type: 'moderation', actorId: user.id, message: 'A moderator removed your post: “' + excerpt(post.body, 60) + '”' });
      }
    });
    return { ok: true };
  });

  router.post('/api/posts/:id/moderate', (c) => {
    const user = c.requireUser();
    const post = requireVisiblePost(c.params.id, user);
    if (!post.canModerate) throw forbidden();
    const action = oneOf(c.body.action, ['hide', 'restore']);
    if (!action) throw badRequest('Choose hide or restore');
    const note = str(c.body.note, { max: 500 });
    db.prepare('UPDATE posts SET status = ?, moderation_note = ? WHERE id = ?').run(action === 'hide' ? 'hidden' : 'published', action === 'hide' ? note : '', post.id);
    logModeration(user.id, 'post.' + action, 'post', post.id, note);
    notify(post.author.id, {
      type: 'moderation', actorId: user.id, link: `/community/post/${post.id}`,
      message: action === 'hide' ? 'Your post was hidden by a moderator' + (note ? ': ' + note : '') : 'Your post was restored by a moderator',
    });
    return { post: loadPost(post.id, user) };
  });

  /* ---------- reactions, saves, shares */
  router.post('/api/posts/:id/reaction', (c) => {
    const user = c.require('reaction.create');
    const post = requireVisiblePost(c.params.id, user);
    const type = c.body.type === null ? null : oneOf(c.body.type, REACTION_TYPES);
    if (c.body.type !== null && !type) throw badRequest('Unknown reaction');
    const existing = db.prepare('SELECT type FROM post_reactions WHERE post_id = ? AND user_id = ?').get(post.id, user.id);
    if (!type) db.prepare('DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?').run(post.id, user.id);
    else {
      db.prepare(`INSERT INTO post_reactions (post_id, user_id, type) VALUES (?, ?, ?)
        ON CONFLICT(post_id, user_id) DO UPDATE SET type = excluded.type`).run(post.id, user.id, type);
      if (!existing) notify(post.author.id, { type: 'reaction', actorId: user.id, link: `/community/post/${post.id}`, message: `${user.name} reacted to your post` });
    }
    return { post: loadPost(post.id, user) };
  });

  router.post('/api/posts/:id/save', (c) => {
    const user = c.require('post.save');
    const post = requireVisiblePost(c.params.id, user);
    if (c.body.saved === false) db.prepare('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?').run(user.id, post.id);
    else db.prepare('INSERT OR IGNORE INTO saved_posts (user_id, post_id) VALUES (?, ?)').run(user.id, post.id);
    return { post: loadPost(post.id, user) };
  });

  router.post('/api/posts/:id/share', (c) => {
    const post = requireVisiblePost(c.params.id, c.user);
    rate('comment', 'share:' + c.ip + ':' + post.id);
    db.prepare('UPDATE posts SET share_count = share_count + 1 WHERE id = ?').run(post.id);
    return { shareCount: post.shareCount + 1 };
  });

  /* ---------- comments */
  function commentAbilities(viewer, comment, post) {
    const isAuthor = !!viewer && viewer.id === comment.author_id;
    return {
      canEdit: isAuthor && can(viewer, 'comment.create'),
      canDelete: isAuthor || post.canModerate,
      canModerate: post.canModerate,
    };
  }
  function listComments(post, viewer) {
    const uid = viewer ? viewer.id : -1;
    const staff = post.canModerate;
    const rows = db.prepare(`SELECT c.*, ${AUTHOR_COLUMNS},
        (SELECT COUNT(*) FROM comment_reactions cr WHERE cr.comment_id = c.id) AS like_count,
        EXISTS (SELECT 1 FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.user_id = ?) AS liked
      FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ? AND (c.status = 'published' OR c.author_id = ? OR ?) AND (u.status != 'banned' OR ?)
      ORDER BY c.created_at ASC, c.id ASC`).all(uid, post.id, uid, staff ? 1 : 0, staff ? 1 : 0);
    const byId = {};
    const roots = [];
    for (const r of rows) {
      const item = {
        id: r.id, postId: r.post_id, parentId: r.parent_id, author: authorFrom(r), body: r.body, status: r.status,
        createdAt: r.created_at, editedAt: r.edited_at, likeCount: r.like_count, liked: !!r.liked,
        ...commentAbilities(viewer, r, post), replies: [],
      };
      byId[r.id] = item;
      if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].replies.push(item);
      else if (!r.parent_id) roots.push(item);
    }
    return roots;
  }
  function requireComment(id, viewer) {
    const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(int(id, { fallback: 0 }));
    if (!row) throw notFound('Comment not found');
    const post = requireVisiblePost(row.post_id, viewer);
    if (row.status !== 'published' && !post.canModerate && !(viewer && viewer.id === row.author_id)) throw notFound('Comment not found');
    return { row, post };
  }

  router.get('/api/posts/:id/comments', (c) => {
    const post = requireVisiblePost(c.params.id, c.user);
    return { items: listComments(post, c.user) };
  });

  router.post('/api/posts/:id/comments', (c) => {
    const user = c.require('comment.create');
    assertWritable(user);
    rate('comment', 'comment:' + user.id);
    const post = requireVisiblePost(c.params.id, user);
    if (post.status !== 'published') throw forbidden('Comments are closed on hidden posts');
    if (post.group && !isStaffMod(user)) {
      const ab = groupAbilities(user, membershipOf(post.group.id, user.id));
      if (post.group.privacy === 'private' && !ab.isMember) throw forbidden('Join the group to comment');
      if (ab.isBanned) throw forbidden('You cannot comment in this group');
    }
    const body = str(c.body.body, { max: LIMITS.commentBody + 1 });
    if (!body) throw badRequest('Please fix the highlighted fields', { body: 'Write a comment' });
    if (body.length > LIMITS.commentBody) throw badRequest('Please fix the highlighted fields', { body: `Comments can be up to ${LIMITS.commentBody} characters` });
    let parentId = null;
    let parent = null;
    if (c.body.parentId) {
      parent = db.prepare('SELECT * FROM comments WHERE id = ? AND post_id = ?').get(int(c.body.parentId, { fallback: 0 }), post.id);
      if (!parent) throw badRequest('The comment you replied to no longer exists');
      parentId = parent.parent_id || parent.id; // one level of threading
    }
    const info = db.prepare('INSERT INTO comments (post_id, author_id, parent_id, body) VALUES (?, ?, ?, ?)').run(post.id, user.id, parentId, body);
    const link = `/community/post/${post.id}#comment-${info.lastInsertRowid}`;
    notify(post.author.id, { type: 'comment', actorId: user.id, link, message: `${user.name} commented on your post: “${excerpt(body, 60)}”` });
    if (parent && parent.author_id !== post.author.id) notify(parent.author_id, { type: 'reply', actorId: user.id, link, message: `${user.name} replied to your comment: “${excerpt(body, 60)}”` });
    return { items: listComments(loadPost(post.id, user), user), commentId: Number(info.lastInsertRowid) };
  });

  router.patch('/api/comments/:id', (c) => {
    const user = c.require('comment.create');
    const { row, post } = requireComment(c.params.id, user);
    if (row.author_id !== user.id) throw forbidden('You can only edit your own comments');
    const body = str(c.body.body, { max: LIMITS.commentBody + 1 });
    if (!body || body.length > LIMITS.commentBody) throw badRequest('Please fix the highlighted fields', { body: body ? `Comments can be up to ${LIMITS.commentBody} characters` : 'A comment cannot be empty' });
    const now = new Date().toISOString();
    db.prepare('UPDATE comments SET body = ?, updated_at = ?, edited_at = ? WHERE id = ?').run(body, now, now, row.id);
    return { items: listComments(post, user) };
  });

  router.delete('/api/comments/:id', (c) => {
    const user = c.requireUser();
    const { row, post } = requireComment(c.params.id, user);
    const ab = commentAbilities(user, row, post);
    if (!ab.canDelete) throw forbidden();
    db.prepare('DELETE FROM comments WHERE id = ?').run(row.id);
    if (row.author_id !== user.id) {
      logModeration(user.id, 'comment.delete', 'comment', row.id, excerpt(row.body, 200));
      notify(row.author_id, { type: 'moderation', actorId: user.id, message: 'A moderator removed your comment: “' + excerpt(row.body, 60) + '”' });
    }
    return { items: listComments(post, user) };
  });

  router.post('/api/comments/:id/moderate', (c) => {
    const user = c.requireUser();
    const { row, post } = requireComment(c.params.id, user);
    if (!post.canModerate) throw forbidden();
    const action = oneOf(c.body.action, ['hide', 'restore']);
    if (!action) throw badRequest('Choose hide or restore');
    db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(action === 'hide' ? 'hidden' : 'published', row.id);
    logModeration(user.id, 'comment.' + action, 'comment', row.id, str(c.body.note, { max: 500 }));
    if (action === 'hide') notify(row.author_id, { type: 'moderation', actorId: user.id, link: `/community/post/${post.id}`, message: 'Your comment was hidden by a moderator' });
    return { items: listComments(post, user) };
  });

  router.post('/api/comments/:id/like', (c) => {
    const user = c.require('reaction.create');
    const { row, post } = requireComment(c.params.id, user);
    if (c.body.liked === false) db.prepare('DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ?').run(row.id, user.id);
    else {
      const info = db.prepare('INSERT OR IGNORE INTO comment_reactions (comment_id, user_id) VALUES (?, ?)').run(row.id, user.id);
      if (info.changes) notify(row.author_id, { type: 'reaction', actorId: user.id, link: `/community/post/${post.id}#comment-${row.id}`, message: `${user.name} liked your comment` });
    }
    return { items: listComments(post, user) };
  });
}
