/* A member's profile: about, groups, posts — and, for the person themselves, saved posts and activity. */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import PostList from '../../components/community/PostList.jsx';
import ReportDialog from '../../components/community/ReportDialog.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { AsyncView, Empty, Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { userService } from '../../services/community/index.js';
import { formatDate, relativeTime } from '../../utils/format.js';
import { ROLE_LABELS, GROUP_ROLE_LABELS } from '../../../../shared/roles.js';
import { REACTIONS } from '../../../../shared/community.js';

function Activity() {
  const state = useAsync(() => userService.activity(), []);
  if (state.loading) return <Loading rows={1} />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data.length) return <Empty title="No activity yet" text="Your comments and reactions will be listed here (only you can see this)." />;
  return (
    <ul className="sk-card flex flex-col gap-3">
      {state.data.map((a, i) => (
        <li key={i} style={{ borderTop: i ? '1px solid var(--line)' : 'none', paddingTop: i ? '0.75rem' : 0 }}>
          <Link to={a.link} className="block">
            <span className="sk-card-meta block" style={{ marginTop: 0 }}>{a.kind === 'comment' ? 'You commented' : `You reacted ${REACTIONS[a.reaction] ? REACTIONS[a.reaction].emoji : ''}`} · {relativeTime(a.at)}{a.status === 'hidden' ? ' · hidden by a moderator' : ''}</span>
            <span className="sk-card-text block" style={{ marginTop: 2 }}>{a.text.length > 160 ? a.text.slice(0, 160) + '…' : a.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const state = useAsync(() => userService.profile(username), [username]);
  const [tab, setTab] = useState('posts');
  const [reporting, setReporting] = useState(false);
  const p = state.data;
  useReactPage(p ? `${p.name} (@${p.username}) — Sikhify community` : 'Profile — Sikhify community', p && p.bio ? p.bio : undefined);
  const tabs = [['posts', 'Posts'], ['about', 'About'], ['groups', 'Groups'], ...(p && p.isSelf ? [['saved', 'Saved'], ['activity', 'Activity']] : [])];

  return (
    <CommunityLayout title={p ? p.name : 'Profile'} crumbs={[{ label: 'Community', to: '/community' }, { label: p ? p.name : 'Profile' }]} eyebrow="Community · Member">
      <AsyncView state={state} errorTitle={state.error && state.error.kind === 'notFound' ? 'Member not found' : undefined}>
        {(profile) => (
          <>
            <section className="sk-card sk-profile" aria-labelledby="profile-name">
              <div className="sk-profile-cover" aria-hidden="true"><span className="khanda-mark sk-profile-cover-mark" /></div>
              <div className="sk-profile-top">
                <span className="sk-profile-avatar"><Avatar user={profile} size={104} /></span>
                <div className="min-w-0 flex-1 sk-profile-id">
                  <h2 className="sk-profile-name" id="profile-name">
                    {profile.name}
                    {profile.role !== 'user' ? <span className={`sk-pill sk-pill-${profile.role}`}>{ROLE_LABELS[profile.role]}</span> : null}
                    {profile.status !== 'active' ? <span className="sk-pill sk-pill-suspended">{profile.status}</span> : null}
                  </h2>
                  <p className="sk-profile-handle">@{profile.username}</p>
                </div>
                <div className="sk-profile-actions">
                  {profile.isSelf ? <Link className="sk-btn sk-btn-sm sk-btn-gold" to="/community/settings"><Icon name="edit" size={14} />Edit profile</Link> : null}
                  {profile.isSelf ? <Link className="sk-btn sk-btn-sm" to="/community/settings"><Icon name="settings" size={14} />Settings</Link> : null}
                  {user && !profile.isSelf ? <button type="button" className="sk-btn sk-btn-sm" onClick={() => setReporting(true)}><Icon name="flag" size={14} />Report</button> : null}
                </div>
              </div>
              {profile.bio ? <p className="sk-profile-bio">{profile.bio}</p> : profile.isSelf ? <p className="sk-profile-bio is-empty">Add a short bio in <Link className="panel-view-all" to="/community/settings">Settings</Link> so the Sangat knows a little about you.</p> : null}
              {profile.location || profile.interests.length ? (
                <ul className="sk-profile-chips" aria-label="Location and interests">
                  {profile.location ? <li className="is-place"><Icon name="pin" size={13} />{profile.location}</li> : null}
                  {profile.interests.map((i) => <li key={i}>{i}</li>)}
                </ul>
              ) : null}
              <dl className="sk-profile-stats">
                <div><dt>Posts</dt><dd>{profile.counts.posts}</dd></div>
                <div><dt>Comments</dt><dd>{profile.counts.comments}</dd></div>
                <div><dt>Groups</dt><dd>{profile.groups.length}</dd></div>
                <div><dt>Joined</dt><dd className="is-date">{formatDate(profile.joinedAt, { day: undefined })}</dd></div>
              </dl>
            </section>

            <div className="sk-tabs sk-profile-tabs" role="tablist" aria-label="Profile sections">
              {tabs.map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                  {l}{k === 'posts' && profile.counts.posts ? <span className="sk-tab-count">{profile.counts.posts}</span> : k === 'groups' && profile.groups.length ? <span className="sk-tab-count">{profile.groups.length}</span> : null}
                </button>
              ))}
            </div>

            {tab === 'posts' ? <PostList scope={`user:${profile.username}`} empty={<Empty icon="message" title="No posts yet" text={profile.isSelf ? 'Share something with the Sangat from the community feed.' : `${profile.name} hasn't posted anything visible to you yet.`} />} /> : null}
            {tab === 'saved' ? <PostList scope="saved" empty={<Empty icon="bookmark" title="No saved posts" text="Use Save on any post to keep it here. Only you can see your saved posts." />} /> : null}
            {tab === 'activity' ? <Activity /> : null}
            {tab === 'about' ? (
              <section className="sk-card">
                <dl className="sk-dl">
                  <dt>Name</dt><dd>{profile.name}</dd>
                  <dt>Username</dt><dd>@{profile.username}</dd>
                  <dt>Joined</dt><dd>{formatDate(profile.joinedAt)}</dd>
                  {profile.location ? <><dt>Location</dt><dd>{profile.location}</dd></> : null}
                  <dt>Bio</dt><dd>{profile.bio || <span className="sk-card-meta">Not added</span>}</dd>
                  <dt>Interests</dt><dd>{profile.interests.length ? profile.interests.join(', ') : <span className="sk-card-meta">Not added</span>}</dd>
                </dl>
                {profile.isSelf ? <p className="sk-card-meta mt-4">Your email is never shown. Your location is shown only if you choose to share it in Settings.</p> : null}
              </section>
            ) : null}
            {tab === 'groups' ? (
              profile.groups.length ? (
                <ul className="sk-card flex flex-col gap-2">
                  {profile.groups.map((g) => (
                    <li key={g.id} className="flex justify-between gap-3">
                      <Link className="sk-post-author" to={`/community/groups/${g.slug}`}>{g.name}{g.privacy === 'private' ? ' 🔒' : ''}</Link>
                      <span className="sk-card-meta" style={{ marginTop: 0 }}>{GROUP_ROLE_LABELS[g.role]}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty icon="users" title="No public groups" />
            ) : null}
            <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="user" targetId={profile.id} label="member" />
          </>
        )}
      </AsyncView>
    </CommunityLayout>
  );
}
