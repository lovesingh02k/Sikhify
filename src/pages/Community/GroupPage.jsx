import { useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import PostComposer from '../../components/community/PostComposer.jsx';
import PostList from '../../components/community/PostList.jsx';
import ReportDialog from '../../components/community/ReportDialog.jsx';
import RichText from '../../components/common/RichText.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { groupService } from '../../services/community/index.js';
import { formatDate, plural, toast, shareLink } from '../../utils/format.js';
import { GROUP_ROLE_LABELS } from '../../../shared/roles.js';

function GroupHeader({ group, setGroup }) {
  const { user } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reporting, setReporting] = useState(false);
  const v = group.viewer;
  const run = (fn, msg) => { setBusy(true); fn().then((g) => { setGroup(g); if (msg) toast(msg); }).catch((err) => toast(err.message, 'error')).finally(() => setBusy(false)); };

  return (
    <section className="sk-card" aria-labelledby="group-name">
      <div className="sk-cover" style={group.coverUrl ? { backgroundImage: `url("${group.coverUrl}")` } : undefined} aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-3 mt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1">
            <span className="sk-badge">{group.category}</span>
            <span className="sk-badge sk-badge-muted">{group.privacy === 'private' ? <><Icon name="lock" size={10} />Private group</> : <><Icon name="globe" size={10} />Public group</>}</span>
            {group.status === 'suspended' ? <span className="sk-pill sk-pill-suspended">Suspended by moderators</span> : null}
          </div>
          <h2 className="sk-section-title mt-2" id="group-name">{group.name}</h2>
          <p className="sk-card-text">{group.description}</p>
          <p className="sk-card-meta">
            <Link className="panel-view-all" to={`/community/groups/${group.slug}/members`}>{plural(group.memberCount, 'member')}</Link> · {plural(group.postCount, 'post')}
            {group.location ? ` · ${group.location}` : ''} · created {formatDate(group.createdAt)}
          </p>
          {v.isMember ? <p className="sk-card-meta">You are {v.role === 'member' ? 'a member' : `a ${GROUP_ROLE_LABELS[v.role]}`}.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!user ? <Link className="sk-btn sk-btn-gold" to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign in to join</Link> : null}
          {v.canJoin ? (
            <button type="button" className="sk-btn sk-btn-gold" disabled={busy} onClick={() => run(() => groupService.join(group.id), group.privacy === 'private' ? 'Request sent to the group admins' : `You joined ${group.name}`)}>
              <Icon name="plus" size={15} />{group.privacy === 'private' ? 'Request to join' : 'Join group'}
            </button>
          ) : null}
          {v.isPending ? <button type="button" className="sk-btn" disabled={busy} onClick={() => run(() => groupService.leave(group.id), 'Request cancelled')}>Cancel request</button> : null}
          {v.isMember ? <button type="button" className="sk-btn" disabled={busy} onClick={() => setConfirm(true)}>Leave group</button> : null}
          {v.canManage ? <Link className="sk-btn" to={`/community/groups/${group.slug}/settings`}><Icon name="settings" size={15} />Settings</Link> : null}
          {v.canApproveMembers ? <Link className="sk-btn" to={`/community/groups/${group.slug}/members`}><Icon name="users" size={15} />Manage members</Link> : null}
          <button type="button" className="sk-btn" onClick={() => shareLink({ title: `${group.name} — Sikhify community`, text: group.description, url: window.location.href })}><Icon name="share" size={15} />Share</button>
          {user && !v.isMember ? <button type="button" className="sk-btn" onClick={() => setReporting(true)}><Icon name="flag" size={15} />Report</button> : null}
        </div>
      </div>
      <ConfirmDialog open={confirm} title={`Leave ${group.name}?`} confirmLabel="Leave group" busy={busy}
        message={group.privacy === 'private' ? 'To rejoin a private group you will need to be approved again.' : 'You can join again at any time.'}
        onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); run(() => groupService.leave(group.id), `You left ${group.name}`); }} />
      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="group" targetId={group.id} label="group" />
    </section>
  );
}

export default function GroupPage() {
  const { slug } = useParams();
  const state = useAsync(() => groupService.get(slug), [slug]);
  const [tab, setTab] = useState('posts');
  const list = useRef(null);
  const g = state.data;
  useReactPage(g ? `${g.name} — Groups — Sikhify.in` : 'Group — Sikhify.in', g ? g.description : undefined);

  return (
    <CommunityLayout title={g ? g.name : 'Group'} crumbs={[{ label: 'Community', to: '/community' }, { label: 'Groups', to: '/community/groups' }, { label: g ? g.name : '…' }]} eyebrow="Community · Group">
      <AsyncView state={state} errorTitle="This group isn't available">
        {(group) => {
          const locked = group.privacy === 'private' && !group.viewer.isMember && !group.viewer.canModerate;
          return (
            <>
              <GroupHeader group={group} setGroup={state.setData} />
              <div className="sk-tabs" role="tablist" aria-label="Group sections">
                <button type="button" role="tab" aria-selected={tab === 'posts'} onClick={() => setTab('posts')}>Posts</button>
                <button type="button" role="tab" aria-selected={tab === 'about'} onClick={() => setTab('about')}>About</button>
              </div>
              {tab === 'about' ? (
                <section className="sk-card" role="tabpanel" aria-label="About">
                  {group.about ? <RichText text={group.about} /> : <p className="sk-card-meta">The group admins haven&apos;t written an About section yet.</p>}
                </section>
              ) : locked ? (
                <Empty icon="lock" title="This is a private group" text={group.viewer.isPending ? 'Your request to join is waiting for a group admin.' : 'Only members can see its posts. Request to join above.'} />
              ) : (
                <div role="tabpanel" aria-label="Posts" className="sk-stack">
                  {group.viewer.canPost ? <PostComposer groupId={group.id} groupName={group.name} onCreated={(p) => list.current?.prepend(p)} /> : null}
                  <PostList ref={list} scope={`group:${group.id}`} empty={<Empty icon="message" title="No posts in this group yet" text={group.viewer.canPost ? 'Start the conversation.' : 'Join the group to post.'} />} />
                </div>
              )}
            </>
          );
        }}
      </AsyncView>
    </CommunityLayout>
  );
}
