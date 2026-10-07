import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../ui/Avatar.jsx';
import Icon from '../ui/Icon.jsx';
import ImagePicker from './ImagePicker.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { postService, groupService } from '../../services/community/index.js';
import { LIMITS } from '../../../../shared/community.js';

/** "Share with the Sangat" — create a post (optionally in a group, with up to 4 images). */
export default function PostComposer({ onCreated, groupId, groupName }) {
  const { user, can } = useAuth();
  const location = useLocation();
  const [body, setBody] = useState('');
  const [images, setImages] = useState([]);
  const [target, setTarget] = useState(groupId ? String(groupId) : '');
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || groupId) return;
    groupService.list({ mine: 1 }).then((list) => setGroups(list.filter((g) => g.viewer.canPost))).catch(() => {});
  }, [user, groupId]);

  if (!user) {
    return (
      <div className="sk-card flex flex-wrap items-center justify-between gap-3">
        <p className="sk-card-text" style={{ marginTop: 0 }}>Sign in to share with the Sangat, comment and join groups.</p>
        <div className="flex gap-2">
          <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link>
          <Link className="sk-btn sk-btn-sm" to={`/signup?next=${encodeURIComponent(location.pathname)}`}>Join</Link>
        </div>
      </div>
    );
  }
  if (!can('post.create')) {
    return <div className="sk-notice" role="note">Your account can't post right now{user.status === 'suspended' ? ' because it is suspended' : ''}. You can still read and save posts.</div>;
  }

  async function submit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    try {
      const post = await postService.create({ body, images, groupId: target ? Number(target) : undefined });
      setBody('');
      setImages([]);
      onCreated?.(post);
    } catch (err) {
      setError((err.fields && err.fields.body) || err.message);
    } finally {
      setBusy(false);
    }
  }

  const left = LIMITS.postBody - body.length;
  return (
    <form className="sk-card" onSubmit={submit} aria-label="Create a post" data-motion="off">
      <div className="flex gap-3 items-start">
        <Avatar user={user} size={42} />
        <div className="flex-1 min-w-0">
          <label htmlFor="composer" className="sr-only">Write a post</label>
          <textarea id="composer" className="sk-form-input sk-form-textarea" rows={3} maxLength={LIMITS.postBody} value={body}
            placeholder={groupName ? `Share something with ${groupName}…` : 'Share something with the Sangat…'} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-2"><ImagePicker value={images} onChange={setImages} onBusy={setUploading} /></div>
          {error ? <p className="sk-form-error" role="alert">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            {!groupId && groups.length ? (
              <label className="flex items-center gap-2 sk-card-meta" style={{ marginTop: 0 }}>
                <span>Post to</span>
                <select className="sk-select sk-select-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Everyone (public)</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.privacy === 'private' ? ' (private)' : ''}</option>)}
                </select>
              </label>
            ) : <span className="sk-card-meta" style={{ marginTop: 0 }}>{groupName ? `Posting in ${groupName}` : 'Visible to everyone'}</span>}
            <div className="flex items-center gap-3">
              {left < 300 ? <span className="sk-card-meta" style={{ marginTop: 0 }} aria-live="polite">{left} left</span> : null}
              <button type="submit" className="sk-btn sk-btn-gold sk-btn-sm" disabled={busy || uploading || !body.trim()}>
                <Icon name="message" size={15} />{busy ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
