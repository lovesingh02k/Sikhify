/* ==========================================================================
   Sikhify API — routes/reports.js
   Anyone signed in can report a post, comment, member or group. Moderators
   resolve reports from /admin/reports (taking action on the content) or
   dismiss them; the reporter is notified either way.
   ========================================================================== */
import { badRequest, notFound, str, int, oneOf, HttpError } from '../lib/http.js';
import { excerpt } from '../lib/util.js';
import { REPORT_REASONS, REPORT_TARGETS, LIMITS } from '../../shared/community.js';

export default function register(router, deps) {
  const { db, rate } = deps;

  /** Text snapshot of the reported item, kept even if it is later deleted. */
  function preview(type, id, viewer) {
    if (type === 'post') {
      const p = deps.loadPost(id, viewer);
      return p && excerpt(`${p.author.name}: ${p.body}`, 200);
    }
    if (type === 'comment') {
      const row = db.prepare('SELECT c.body, c.post_id, u.name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?').get(id);
      return row && deps.loadPost(row.post_id, viewer) ? excerpt(`${row.name}: ${row.body}`, 200) : null;
    }
    if (type === 'user') {
      const u = db.prepare("SELECT name, username FROM users WHERE id = ? AND status != 'banned'").get(id);
      return u && `${u.name} (@${u.username})`;
    }
    if (type === 'group') {
      const g = db.prepare("SELECT name FROM groups WHERE id = ? AND status = 'active'").get(id);
      return g && g.name;
    }
    return null;
  }

  router.post('/api/reports', (c) => {
    const user = c.require('report.create');
    rate('report', 'report:' + user.id);
    const targetType = oneOf(c.body.targetType, REPORT_TARGETS);
    const targetId = int(c.body.targetId, { min: 1, fallback: 0 });
    const reason = oneOf(c.body.reason, REPORT_REASONS);
    const details = str(c.body.details, { max: LIMITS.reportDetails });
    if (!targetType || !targetId) throw badRequest('Unknown item');
    if (!reason) throw badRequest('Please fix the highlighted fields', { reason: 'Choose a reason' });
    if (targetType === 'user' && targetId === user.id) throw badRequest("You can't report yourself");
    const snap = preview(targetType, targetId, user);
    if (!snap) throw notFound('That item is not available');
    const open = db.prepare("SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'").get(user.id, targetType, targetId);
    if (open) throw new HttpError(409, 'You have already reported this. Our moderators will review it.');
    db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, target_preview, reason, details) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, targetType, targetId, snap, reason, details);
    return { ok: true, message: 'Thank you. Our moderators will review this report.' };
  });
}
