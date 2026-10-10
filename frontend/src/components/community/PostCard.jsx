/* ==========================================================================
   One community post. Every button calls the API and shows the server's
   answer; buttons a viewer isn't allowed to use are not shown (and the API
   refuses them anyway).
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar.jsx';
import Icon from '../ui/Icon.jsx';
import RichText from '../common/RichText.jsx';
import CommentSection from './CommentSection.jsx';
import ReportDialog from './ReportDialog.jsx';
import ImagePicker from './ImagePicker.jsx';
import { ConfirmDialog } from '../ui/Dialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { postService } from '../../services/community/index.js';
import { relativeTime, formatDateTime, toast, shareLink } from '../../utils/format.js';
import { REACTIONS, LIMITS } from '../../../../shared/community.js';
import { ROLE_LABELS } from '../../../../shared/roles.js';
import { feedImage } from '../../utils/images.js';

function Menu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  if (!items.length) return null;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="sk-icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Post options" onClick={() => setOpen((o) => !o)}><Icon name="more" /></button>
      {open ? (
        <div className="sk-menu" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? 'is-danger' : undefined} onClick={() => { setOpen(false); it.onClick(); }}>
              <Icon name={it.icon} size={16} />{it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function PostCard({ post: initial, onRemoved, showComments = false, linkToPost = true }) {
  const { user, can } = useAuth();
  const [post, setPost] = useState(initial);
  const [comments, setComments] = useState(showComments);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ body: initial.body, images: initial.images });
  const [reporting, setReporting] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setPost(initial); }, [initial]);

  const permalink = `${window.location.origin}/community/post/${post.id}`;
  const act = async (fn) => {
    setBusy(true);
    try { const p = await fn(); if (p) setPost(p); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const needLogin = () => toast('Sign in to do that', 'error');

  const react = (type) => {
    if (!can('reaction.create')) return user ? toast("Your account can't react right now", 'error') : needLogin();
    return act(() => postService.react(post.id, post.myReaction === type ? null : type));
  };
  const share = async () => {
    await shareLink({ title: `Post by ${post.author.name} — Sikhify`, text: post.body.slice(0, 120), url: permalink });
    postService.share(post.id).then((r) => setPost((p) => ({ ...p, shareCount: r.shareCount }))).catch(() => {});
  };

  const items = [];
  if (post.canEdit) items.push({ label: 'Edit post', icon: 'edit', onClick: () => { setDraft({ body: post.body, images: post.images }); setEditing(true); } });
  items.push({ label: 'Copy link', icon: 'link', onClick: () => navigator.clipboard?.writeText(permalink).then(() => toast('Link copied'), () => toast("Couldn't copy — please copy manually", 'error')) });
  if (post.canModerate && post.author.id !== (user && user.id)) {
    items.push(post.status === 'hidden'
      ? { label: 'Restore post', icon: 'eye', onClick: () => act(() => postService.moderate(post.id, 'restore')) }
      : { label: 'Hide post', icon: 'eyeOff', onClick: () => setConfirm('hide') });
  }
  if (post.canDelete) items.push({ label: 'Delete post', icon: 'trash', danger: true, onClick: () => setConfirm('delete') });
  if (user && user.id !== post.author.id) items.push({ label: 'Report post', icon: 'flag', onClick: () => setReporting(true) });

  const long = post.body.length > 600 && !expanded && !showComments;
  return (
    <article className="sk-card" aria-labelledby={`post-${post.id}-author`}>
      <header className="sk-post-head">
        <Link to={`/community/profile/${post.author.username}`} tabIndex={-1} aria-hidden="true"><Avatar user={post.author} size={44} /></Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2">
            <Link id={`post-${post.id}-author`} className="sk-post-author" to={`/community/profile/${post.author.username}`}>{post.author.name}</Link>
            {post.author.role !== 'user' ? <span className={`sk-pill sk-pill-${post.author.role}`}>{ROLE_LABELS[post.author.role]}</span> : null}
            {post.group ? <span className="sk-card-meta" style={{ marginTop: 0 }}>in <Link className="panel-view-all" to={`/community/groups/${post.group.slug}`}>{post.group.name}</Link></span> : null}
          </p>
          <p className="sk-card-meta" style={{ marginTop: 0 }}>
            {linkToPost ? <Link to={`/community/post/${post.id}`}><time dateTime={post.createdAt} title={formatDateTime(post.createdAt)}>{relativeTime(post.createdAt)}</time></Link>
              : <time dateTime={post.createdAt} title={formatDateTime(post.createdAt)}>{relativeTime(post.createdAt)}</time>}
            {post.editedAt ? ' · edited' : ''}
            {post.group && post.group.privacy === 'private' ? <> · <Icon name="lock" size={11} /> Private group</> : null}
          </p>
        </div>
        <Menu items={items} />
      </header>

      {post.status === 'hidden' ? (
        <p className="sk-notice" role="note"><strong>Hidden by a moderator</strong> — only you and moderators can see this post.{post.moderationNote ? ` Note: ${post.moderationNote}` : ''}</p>
      ) : null}

      {editing ? (
        <form className="mt-3" onSubmit={(e) => { e.preventDefault(); act(async () => { const p = await postService.update(post.id, draft); setEditing(false); return p; }); }}>
          <label className="sr-only" htmlFor={`edit-${post.id}`}>Edit post</label>
          <textarea id={`edit-${post.id}`} className="sk-form-input sk-form-textarea" rows={4} maxLength={LIMITS.postBody} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div className="mt-2"><ImagePicker value={draft.images} onChange={(images) => setDraft({ ...draft, images })} /></div>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="sk-btn sk-btn-sm sk-btn-gold" disabled={busy || !draft.body.trim()}>Save</button>
            <button type="button" className="sk-btn sk-btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <RichText text={long ? post.body.slice(0, 600) + '…' : post.body} />
          {long ? <button type="button" className="sk-link-btn mt-1" onClick={() => setExpanded(true)}>Read more</button> : null}
          {post.images.length ? (
            <div className={`sk-post-images${post.images.length === 1 ? ' is-single' : ''}`}>
              {post.images.map((src, i) => {
                const img = feedImage(src);
                return <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={img.src} srcSet={img.srcSet} sizes={post.images.length === 1 ? '(min-width: 768px) 640px, 100vw' : '(min-width: 768px) 320px, 50vw'} alt={`Image ${i + 1} of ${post.images.length} in ${post.author.name}'s post`} loading="lazy" decoding="async" /><span className="sr-only"> (opens the full-size image)</span></a>;
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="sk-post-stats">
        {post.reactionCount ? <span>{Object.entries(post.reactions).map(([k, n]) => `${REACTIONS[k] ? REACTIONS[k].emoji : ''} ${n}`).join('  ')}</span> : null}
        {post.commentCount ? <button type="button" className="sk-link-btn" style={{ fontSize: 'inherit', color: 'inherit' }} onClick={() => setComments(true)}>{post.commentCount} comment{post.commentCount === 1 ? '' : 's'}</button> : null}
        {post.shareCount ? <span>{post.shareCount} share{post.shareCount === 1 ? '' : 's'}</span> : null}
      </div>

      <div className="sk-post-actions">
        <div className="flex flex-wrap" role="group" aria-label="React">
          {Object.entries(REACTIONS).map(([type, r]) => (
            <button key={type} type="button" className="sk-action" aria-pressed={post.myReaction === type} disabled={busy} onClick={() => react(type)}>
              <span aria-hidden="true">{r.emoji}</span>{r.label}
            </button>
          ))}
        </div>
        <button type="button" className="sk-action" aria-expanded={comments} onClick={() => setComments((v) => !v)}><Icon name="message" size={16} />Comment</button>
        <button type="button" className="sk-action" onClick={share}><Icon name="share" size={16} />Share</button>
        <button type="button" className="sk-action" aria-pressed={post.saved} disabled={busy}
          onClick={() => (can('post.save') ? act(() => postService.save(post.id, !post.saved)).then(() => toast(post.saved ? 'Removed from saved posts' : 'Saved')) : needLogin())}>
          <Icon name="bookmark" size={16} />{post.saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {comments ? <CommentSection post={post} onCount={(n) => setPost((p) => ({ ...p, commentCount: n }))} /> : null}

      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="post" targetId={post.id} label="post" />
      <ConfirmDialog open={confirm === 'delete'} title="Delete this post?" danger confirmLabel="Delete"
        message={post.author.id === (user && user.id) ? 'Your post, its comments and reactions will be removed permanently.' : 'This removes the post for everyone and notifies its author.'}
        busy={busy} onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); setBusy(true); postService.remove(post.id).then(() => { toast('Post deleted'); onRemoved?.(post.id); }).catch((err) => toast(err.message, 'error')).finally(() => setBusy(false)); }} />
      <ConfirmDialog open={confirm === 'hide'} title="Hide this post?" confirmLabel="Hide post"
        message="Hidden posts are visible only to their author and moderators. The author is notified." busy={busy}
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); act(() => postService.moderate(post.id, 'hide')); }} />
    </article>
  );
}
