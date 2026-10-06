/* Threaded comments for a post: create, reply (one level), edit/delete own, like, report, hide (moderators). */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../ui/Avatar.jsx';
import RichText from '../common/RichText.jsx';
import ReportDialog from './ReportDialog.jsx';
import { ConfirmDialog } from '../ui/Dialog.jsx';
import { Spinner, ErrorState } from '../ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { commentService } from '../../services/community/index.js';
import { relativeTime, toast } from '../../utils/format.js';
import { LIMITS } from '../../../shared/community.js';

function CommentForm({ onSubmit, initial = '', placeholder = 'Write a comment…', autoFocus, onCancel, submitLabel = 'Comment' }) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    try { await onSubmit(body); setBody(''); } catch (err) { setError((err.fields && err.fields.body) || err.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="flex-1 min-w-0">
      <textarea className="sk-form-input sk-form-textarea" rows={2} style={{ minHeight: '2.8rem' }} maxLength={LIMITS.commentBody} aria-label={placeholder}
        value={body} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => setBody(e.target.value)} />
      {error ? <p className="sk-form-error" role="alert">{error}</p> : null}
      <div className="flex gap-2 mt-2">
        <button type="submit" className="sk-btn sk-btn-sm sk-btn-gold" disabled={busy || !body.trim()}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel ? <button type="button" className="sk-btn sk-btn-sm" onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}

function Comment({ c, post, onItems, onReply, replyingTo }) {
  const { user, can } = useAuth();
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const run = (p) => p.then(onItems).catch((err) => toast(err.message, 'error'));
  return (
    <div id={`comment-${c.id}`}>
      <div className="sk-comment">
        <Link to={`/community/profile/${c.author.username}`} aria-label={c.author.name}><Avatar user={c.author} size={32} /></Link>
        <div className="min-w-0 flex-1">
          {editing ? (
            <CommentForm initial={c.body} autoFocus submitLabel="Save" onCancel={() => setEditing(false)}
              onSubmit={(body) => commentService.update(c.id, body).then((items) => { onItems(items); setEditing(false); })} />
          ) : (
            <div className="sk-comment-bubble">
              <Link className="sk-post-author" style={{ fontSize: '0.85rem' }} to={`/community/profile/${c.author.username}`}>{c.author.name}</Link>
              {c.status === 'hidden' ? <span className="sk-pill sk-pill-hidden ml-2">Hidden</span> : null}
              <RichText text={c.body} className="mt-1" />
            </div>
          )}
          <div className="sk-comment-tools">
            <time dateTime={c.createdAt}>{relativeTime(c.createdAt)}</time>
            {c.editedAt ? <span>edited</span> : null}
            {can('reaction.create') ? (
              <button type="button" aria-pressed={c.liked} onClick={() => run(commentService.like(c.id, !c.liked))}>{c.liked ? 'Liked' : 'Like'}{c.likeCount ? ` · ${c.likeCount}` : ''}</button>
            ) : c.likeCount ? <span>{c.likeCount} like{c.likeCount === 1 ? '' : 's'}</span> : null}
            {can('comment.create') && post.status === 'published' && onReply ? <button type="button" onClick={() => onReply(replyingTo === c.id ? null : c.id)}>Reply</button> : null}
            {c.canEdit && !editing ? <button type="button" onClick={() => setEditing(true)}>Edit</button> : null}
            {c.canDelete ? <button type="button" onClick={() => setConfirming(true)}>Delete</button> : null}
            {c.canModerate && c.author.id !== (user && user.id) ? (
              <button type="button" onClick={() => run(commentService.moderate(c.id, c.status === 'hidden' ? 'restore' : 'hide'))}>{c.status === 'hidden' ? 'Restore' : 'Hide'}</button>
            ) : null}
            {user && user.id !== c.author.id ? <button type="button" onClick={() => setReporting(true)}>Report</button> : null}
          </div>
        </div>
      </div>
      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="comment" targetId={c.id} label="comment" />
      <ConfirmDialog open={confirming} title="Delete this comment?" message="This can't be undone." confirmLabel="Delete" danger
        onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); run(commentService.remove(c.id)); }} />
    </div>
  );
}

export default function CommentSection({ post, onCount }) {
  const { user, can } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  const load = () => commentService.list(post.id).then((list) => { setItems(list); setError(null); }).catch(setError);
  useEffect(() => { load(); }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (list) => {
    setItems(list);
    onCount?.(list.reduce((n, c) => n + 1 + c.replies.length, 0));
  };

  useEffect(() => {
    if (!items || !location.hash.startsWith('#comment-')) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) { el.scrollIntoView({ block: 'center' }); el.querySelector('.sk-comment-bubble')?.animate?.([{ background: 'rgba(240,169,59,0.25)' }, { background: 'transparent' }], { duration: 2000 }); }
  }, [items, location.hash]);

  return (
    <section className="sk-comments" aria-label="Comments" data-motion="off">
      {error ? <ErrorState error={error} title="Comments couldn't be loaded" onRetry={load} /> : !items ? <Spinner label="Loading comments…" /> : (
        <>
          {items.length === 0 ? <p className="sk-card-meta" style={{ marginTop: 0 }}>No comments yet.</p> : null}
          {items.map((c) => (
            <div key={c.id} className="flex flex-col gap-3">
              <Comment c={c} post={post} onItems={update} onReply={setReplyTo} replyingTo={replyTo} />
              {c.replies.length || replyTo === c.id ? (
                <div className="sk-comment-replies">
                  {c.replies.map((r) => <Comment key={r.id} c={r} post={post} onItems={update} onReply={() => setReplyTo(c.id)} replyingTo={replyTo} />)}
                  {replyTo === c.id ? (
                    <div className="sk-comment">
                      <Avatar user={user} size={28} />
                      <CommentForm autoFocus placeholder={`Reply to ${c.author.name}…`} submitLabel="Reply" onCancel={() => setReplyTo(null)}
                        onSubmit={(body) => commentService.create(post.id, body, c.id).then((res) => { update(res.items); setReplyTo(null); })} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          {post.status !== 'published' ? <p className="sk-card-meta">Comments are closed while this post is hidden.</p>
            : can('comment.create') ? (
              <div className="sk-comment">
                <Avatar user={user} size={32} />
                <CommentForm onSubmit={(body) => commentService.create(post.id, body).then((res) => update(res.items))} />
              </div>
            ) : !user ? (
              <p className="sk-card-meta"><Link className="panel-view-all" to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link> to comment.</p>
            ) : null}
        </>
      )}
    </section>
  );
}
