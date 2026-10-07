/* Group members. Group admins/moderators approve requests and remove or ban members; only group admins change roles. */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { groupService } from '../../services/community/index.js';
import { formatDate, toast } from '../../utils/format.js';
import { GROUP_ROLE_LABELS } from '../../../../shared/roles.js';

export default function GroupMembers() {
  const { slug } = useParams();
  const { user } = useAuth();
  const state = useAsync(async () => {
    const group = await groupService.get(slug);
    const res = await groupService.members(group.id);
    return { group, ...res };
  }, [slug]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const g = state.data && state.data.group;
  useReactPage(g ? `Members — ${g.name} — Sikhify.in` : 'Members — Sikhify.in', undefined, { noindex: true });

  const act = (fn, msg) => { setBusy(true); fn().then(() => { toast(msg); state.reload(); }).catch((err) => toast(err.message, 'error')).finally(() => { setBusy(false); setConfirm(null); }); };

  return (
    <CommunityLayout title={g ? `${g.name} — members` : 'Members'}
      crumbs={[{ label: 'Community', to: '/community' }, { label: 'Groups', to: '/community/groups' }, ...(g ? [{ label: g.name, to: `/community/groups/${g.slug}` }] : []), { label: 'Members' }]}>
      <AsyncView state={state} errorTitle="Members couldn't be shown">
        {({ group, items, viewer }) => {
          const pending = items.filter((m) => m.status === 'pending');
          const active = items.filter((m) => m.status === 'active');
          const banned = items.filter((m) => m.status === 'banned');
          const row = (m) => {
            const self = user && m.user.id === user.id;
            return (
              <li key={m.user.id} className="flex flex-wrap items-center gap-3 py-3" style={{ borderTop: '1px solid var(--line)' }}>
                <Link to={`/community/profile/${m.user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar user={m.user} size={38} />
                  <span className="min-w-0"><span className="sk-post-author block">{m.user.name}{self ? ' (you)' : ''}</span><span className="sk-card-meta block" style={{ marginTop: 0 }}>@{m.user.username} · joined {formatDate(m.joinedAt)}</span></span>
                </Link>
                <span className={`sk-pill sk-pill-${m.role === 'member' ? 'member' : m.role === 'admin' ? 'admin' : 'moderator'}`}>{GROUP_ROLE_LABELS[m.role]}</span>
                {!self && m.status === 'pending' && viewer.canApproveMembers ? (
                  <span className="flex gap-2">
                    <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" disabled={busy} onClick={() => act(() => groupService.updateMember(group.id, m.user.id, { status: 'active' }), `${m.user.name} approved`)}>Approve</button>
                    <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => act(() => groupService.removeMember(group.id, m.user.id), 'Request declined')}>Decline</button>
                  </span>
                ) : null}
                {!self && m.status === 'active' && viewer.canManage ? (
                  <label className="flex items-center gap-2 sk-card-meta" style={{ marginTop: 0 }}>
                    <span className="sr-only">Role for {m.user.name}</span>
                    <select className="sk-select sk-select-sm" value={m.role} disabled={busy} onChange={(e) => act(() => groupService.updateMember(group.id, m.user.id, { role: e.target.value }), 'Role updated')}>
                      <option value="member">Member</option><option value="moderator">Group Moderator</option><option value="admin">Group Admin</option>
                    </select>
                  </label>
                ) : null}
                {!self && m.status === 'active' && viewer.canApproveMembers && (viewer.canManage || m.role === 'member') ? (
                  <span className="flex gap-2">
                    <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => setConfirm({ m, action: 'remove' })}>Remove</button>
                    <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" disabled={busy} onClick={() => setConfirm({ m, action: 'ban' })}>Ban</button>
                  </span>
                ) : null}
                {m.status === 'banned' && viewer.canApproveMembers ? (
                  <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => act(() => groupService.removeMember(group.id, m.user.id), 'Ban lifted')}>Lift ban</button>
                ) : null}
              </li>
            );
          };
          return (
            <>
              {viewer.canApproveMembers ? (
                <section className="sk-card" aria-labelledby="pending">
                  <h2 className="sk-card-title" id="pending">Requests to join ({pending.length})</h2>
                  {pending.length ? <ul className="mt-2">{pending.map(row)}</ul> : <p className="sk-card-meta">No pending requests.</p>}
                </section>
              ) : null}
              <section className="sk-card" aria-labelledby="active">
                <h2 className="sk-card-title" id="active">Members ({active.length})</h2>
                {active.length ? <ul className="mt-2">{active.map(row)}</ul> : <Empty title="No members yet" />}
              </section>
              {banned.length ? (
                <section className="sk-card" aria-labelledby="banned">
                  <h2 className="sk-card-title" id="banned">Banned ({banned.length})</h2>
                  <ul className="mt-2">{banned.map(row)}</ul>
                </section>
              ) : null}
              <ConfirmDialog open={!!confirm} danger={confirm && confirm.action === 'ban'} busy={busy}
                title={confirm ? `${confirm.action === 'ban' ? 'Ban' : 'Remove'} ${confirm.m.user.name}?` : ''}
                confirmLabel={confirm && confirm.action === 'ban' ? 'Ban from group' : 'Remove'}
                message={confirm && confirm.action === 'ban' ? 'They will be removed and cannot rejoin unless the ban is lifted.' : 'They can join again later (or request to, for private groups).'}
                onCancel={() => setConfirm(null)}
                onConfirm={() => (confirm.action === 'ban'
                  ? act(() => groupService.updateMember(group.id, confirm.m.user.id, { status: 'banned' }), 'Member banned')
                  : act(() => groupService.removeMember(group.id, confirm.m.user.id), 'Member removed'))} />
            </>
          );
        }}
      </AsyncView>
    </CommunityLayout>
  );
}
