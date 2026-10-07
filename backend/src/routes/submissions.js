/* ==========================================================================
   Sikhify API — routes/submissions.js
   "Submit / Update Information". Flow:
     user → submission (pending) → moderator/admin review
       → rejected (with a note), or
       → approved: a draft record is created for a final check, or
       → published: the reviewer verified it and published it in one step.
   Nothing a member submits is ever published automatically. Corrections and
   "incorrect information" reports point at an existing page; the reviewer
   applies the fix in the editor and then marks the submission approved.
   ========================================================================== */
import { HttpError, badRequest, notFound, str, int, oneOf } from '../lib/http.js';
import { parseJson, transaction } from '../db/database.js';
import { CONTENT_TYPES, validateContent, isHttpUrl } from '../../../shared/contentTypes.js';
import { SUBMISSION_KINDS, SUBMISSION_STATUSES } from '../../../shared/community.js';
import { getYouTubeVideoId } from '../../../shared/youtube.js';
import { publicUser } from '../lib/serialize.js';

export default function register(router, deps) {
  const { db, settings, rate, notify, logModeration } = deps;

  function shape(r) {
    return {
      id: r.id, kind: r.kind, kindLabel: (SUBMISSION_KINDS[r.kind] || {}).label || r.kind, title: r.title,
      data: parseJson(r.data, {}), message: r.message, source: r.source, targetUrl: r.target_url, targetEntryId: r.target_entry_id,
      status: r.status, reviewNote: r.review_note, resultType: r.result_type, resultId: r.result_id,
      createdAt: r.created_at, reviewedAt: r.reviewed_at,
      submitter: r.submitter_username ? publicUser({ id: r.submitter_id, username: r.submitter_username, name: r.submitter_name, avatar_url: r.submitter_avatar, role: r.submitter_role }) : null,
      reviewer: r.reviewer_name || null,
    };
  }
  const SELECT = `SELECT s.*, su.username AS submitter_username, su.name AS submitter_name, su.avatar_url AS submitter_avatar, su.role AS submitter_role, ru.name AS reviewer_name
    FROM submissions s LEFT JOIN users su ON su.id = s.submitter_id LEFT JOIN users ru ON ru.id = s.reviewer_id`;

  router.post('/api/submissions', (c) => {
    const user = c.require('submission.create');
    if (!settings.get('submissions_open')) throw new HttpError(403, 'Submissions are paused right now. Please try again later.');
    rate('submission', 'submission:' + user.id);
    const kind = oneOf(c.body.kind, Object.keys(SUBMISSION_KINDS));
    if (!kind) throw badRequest('Choose what you are submitting');
    const def = SUBMISSION_KINDS[kind];
    const message = str(c.body.message, { max: 5000 });
    const source = str(c.body.source, { max: 500 });
    const fields = {};
    let data = {};
    let title = '';
    let targetUrl = '';

    if (def.creates && def.creates !== 'media_artist') {
      const v = validateContent(def.creates, c.body.data || {}, { getVideoId: getYouTubeVideoId });
      Object.assign(fields, v.errors);
      data = v.data;
      title = data.title || '';
    } else if (def.creates === 'media_artist') {
      const d = c.body.data || {};
      data = {
        name: str(d.name, { max: 120 }), category: str(d.category, { max: 60 }), location: str(d.location, { max: 120 }),
        description: str(d.description, { max: 3000 }), videos: String(d.videos || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20),
      };
      if (data.name.length < 2) fields.name = 'Name is required';
      if (data.description.length < 10) fields.description = 'Add a short description';
      const bad = data.videos.find((u) => !getYouTubeVideoId(u));
      if (bad) fields.videos = `Not a YouTube video link: “${bad.slice(0, 60)}”`;
      title = data.name;
    } else {
      targetUrl = str(c.body.targetUrl, { max: 500 });
      if (!targetUrl) fields.targetUrl = 'Which page or record is this about?';
      if (message.length < 10) fields.message = 'Describe what is wrong and what it should say';
      title = str(c.body.title, { max: 200 }) || targetUrl;
    }
    if (!source) fields.source = 'Tell us where this information comes from (a link or a reference)';
    else if (/^https?:/i.test(source) && !isHttpUrl(source)) fields.source = 'That link is not valid';
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);

    const targetEntryId = int(c.body.targetEntryId, { fallback: null });
    const info = db.prepare('INSERT INTO submissions (kind, submitter_id, target_entry_id, target_url, title, data, message, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(kind, user.id, targetEntryId && db.prepare('SELECT 1 FROM entries WHERE id = ?').get(targetEntryId) ? targetEntryId : null, targetUrl, title.slice(0, 200), JSON.stringify(data), message, source);
    return { submission: shape(db.prepare(`${SELECT} WHERE s.id = ?`).get(Number(info.lastInsertRowid))) };
  });

  router.get('/api/me/submissions', (c) => {
    const me = c.requireUser();
    return { items: db.prepare(`${SELECT} WHERE s.submitter_id = ? ORDER BY s.created_at DESC LIMIT 100`).all(me.id).map(shape) };
  });

  /* ---------- review */
  router.get('/api/admin/submissions', (c) => {
    c.require('submission.review');
    const status = oneOf(c.query.get('status'), SUBMISSION_STATUSES);
    const kind = oneOf(c.query.get('kind'), Object.keys(SUBMISSION_KINDS));
    const where = [];
    const params = [];
    if (status) { where.push('s.status = ?'); params.push(status); }
    if (kind) { where.push('s.kind = ?'); params.push(kind); }
    const page = int(c.query.get('page'), { min: 1, max: 1000, fallback: 1 });
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM submissions s ${w}`).get(...params).n;
    const items = db.prepare(`${SELECT} ${w} ORDER BY CASE s.status WHEN 'pending' THEN 0 ELSE 1 END, s.created_at DESC LIMIT 25 OFFSET ?`).all(...params, (page - 1) * 25).map(shape);
    return { items, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
  });

  router.post('/api/admin/submissions/:id/review', (c) => {
    const user = c.require('submission.review');
    const s = db.prepare('SELECT * FROM submissions WHERE id = ?').get(int(c.params.id, { fallback: 0 }));
    if (!s) throw notFound('Submission not found');
    if (s.status !== 'pending') throw new HttpError(409, 'This submission has already been reviewed');
    const decision = oneOf(c.body.decision, ['approve', 'publish', 'reject']);
    if (!decision) throw badRequest('Choose approve, publish or reject');
    const note = str(c.body.note, { max: 1000 });
    if (decision === 'reject' && note.length < 3) throw badRequest('Please fix the highlighted fields', { note: 'Tell the submitter why (they will see this note)' });
    const def = SUBMISSION_KINDS[s.kind] || {};
    const data = parseJson(s.data, {});
    let resultType = '';
    let resultId = '';
    let status = decision === 'reject' ? 'rejected' : decision === 'publish' ? 'published' : 'approved';

    transaction(db, () => {
      if (decision !== 'reject' && def.creates && def.creates !== 'media_artist') {
        // The reviewer may have corrected fields in the review form.
        const input = { ...data, ...(c.body.data || {}), source: c.body.source ?? s.source, references: c.body.references ?? (/^https?:/i.test(s.source) ? `Submitted source | ${s.source}` : '') };
        const publish = decision === 'publish';
        resultId = String(deps.createEntry(def.creates, input, user, { publishStatus: publish ? 'published' : 'draft', verificationStatus: publish ? 'verified' : 'needs_review' }));
        resultType = 'entry';
      } else if (decision !== 'reject' && def.creates === 'media_artist') {
        const input = { ...data, ...(c.body.data || {}) };
        const id = deps.createMediaArtist({ name: input.name, category: input.category, location: input.location, description: input.description, status: 'draft', references: /^https?:/i.test(s.source) ? `Submitted source | ${s.source}` : '' });
        for (const url of input.videos || []) {
          const vid = getYouTubeVideoId(url);
          if (vid && !db.prepare('SELECT 1 FROM media_videos WHERE id = ?').get(vid)) {
            db.prepare("INSERT INTO media_videos (id, artist_id, title, status) VALUES (?, ?, ?, 'draft')").run(vid, id, `Video ${vid} — add the real title before publishing`);
          }
        }
        resultType = 'media_artist';
        resultId = id;
        status = 'approved'; // artists always get a final edit in /admin/media before publishing
      }
      db.prepare('UPDATE submissions SET status = ?, reviewer_id = ?, review_note = ?, reviewed_at = ?, result_type = ?, result_id = ? WHERE id = ?')
        .run(status, user.id, note, new Date().toISOString(), resultType, resultId, s.id);
    });
    logModeration(user.id, 'submission.' + status, 'submission', s.id, note);
    notify(s.submitter_id, {
      type: 'submission_reviewed', actorId: user.id, link: '/submit#mine',
      message: status === 'rejected' ? `Your submission “${s.title}” was not accepted: ${note}`
        : status === 'published' ? `Your submission “${s.title}” was verified and published. Thank you!`
          : `Your submission “${s.title}” was approved and is being prepared for publishing. Thank you!`,
    });
    return { submission: shape(db.prepare(`${SELECT} WHERE s.id = ?`).get(s.id)) };
  });
}
