import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { Loading, ErrorState, Empty } from '../../components/ui/States.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { notificationService } from '../../services/community/index.js';
import { relativeTime, toast } from '../../utils/format.js';

const ICON = { reaction: 'heart', comment: 'message', reply: 'message', group_join_request: 'users', group_join_approved: 'users', group_role: 'shield', moderation: 'shield', report_resolved: 'flag', submission_reviewed: 'upload', submission_received: 'inbox', system: 'bell' };

const announce = (unread) => document.dispatchEvent(new CustomEvent('sikhify:notifications', { detail: { unread } }));

export default function Notifications() {
  useReactPage('Notifications — Sikhify', 'Your Sikhify notifications.', { noindex: true });
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({ items: [], next: null, unread: 0 });
  const [state, setState] = useState({ loading: true, error: null, more: false });

  const load = (before) => {
    setState((s) => ({ ...s, loading: !before, more: !!before, error: null }));
    notificationService.list({ unread: filter === 'unread' ? 1 : undefined, before })
      .then((res) => {
        setData((d) => ({ items: before ? [...d.items, ...res.items] : res.items, next: res.next, unread: res.unread }));
        announce(res.unread);
        setState({ loading: false, error: null, more: false });
      })
      .catch((error) => setState({ loading: false, error, more: false }));
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = (ids) => notificationService.markRead(ids).then((r) => {
    setData((d) => ({ ...d, unread: r.unread, items: d.items.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) }));
    announce(r.unread);
  }).catch(() => {});
  const markAll = () => notificationService.markAllRead().then((r) => {
    setData((d) => ({ ...d, unread: r.unread, items: d.items.map((n) => ({ ...n, read: true })) }));
    announce(r.unread);
    toast('All notifications marked as read');
  }).catch((err) => toast(err.message, 'error'));

  return (
    <CommunityLayout title="Notifications" sub="Reactions, comments, replies, group activity, moderation and system messages.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="sk-chip-row" role="group" aria-label="Show">
          <button type="button" className="sk-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
          <button type="button" className="sk-chip" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread{data.unread ? <span className="sk-count">{data.unread}</span> : null}</button>
        </div>
        <button type="button" className="sk-btn sk-btn-sm" disabled={!data.unread} onClick={markAll}><Icon name="check" size={14} />Mark all as read</button>
      </div>
      {state.loading ? <Loading rows={3} /> : state.error ? <ErrorState error={state.error} onRetry={() => load()} /> : !data.items.length ? (
        <Empty icon="bell" title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} text="When someone reacts, comments, replies, or a moderator reviews something of yours, you'll see it here." />
      ) : (
        <ul className="sk-card" style={{ padding: '0.4rem' }} aria-label="Notifications">
          {data.items.map((n) => {
            const inner = (
              <>
                {n.actor ? <Avatar user={n.actor} size={38} /> : <span className="sk-avatar sk-avatar-initials" style={{ width: 38, height: 38 }} aria-hidden="true"><Icon name={ICON[n.type] || 'bell'} size={16} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ color: 'var(--text)', fontWeight: n.read ? 400 : 600, fontSize: '0.92rem' }}>{n.message}</span>
                  <span className="sk-card-meta block" style={{ marginTop: 2 }}>{relativeTime(n.createdAt)}</span>
                </span>
                {!n.read ? <span className="sk-notif-dot" style={{ position: 'static', minWidth: 10, height: 10, padding: 0 }} aria-label="Unread" /> : null}
              </>
            );
            const cls = 'flex items-start gap-3 p-3 rounded-xl';
            return (
              <li key={n.id} style={{ background: n.read ? 'transparent' : 'var(--surface-2)', borderRadius: 12 }}>
                {n.link ? <Link className={cls} to={n.link} onClick={() => !n.read && markRead([n.id])}>{inner}</Link>
                  : <button type="button" className={cls} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', font: 'inherit', cursor: n.read ? 'default' : 'pointer' }} onClick={() => !n.read && markRead([n.id])}>{inner}</button>}
              </li>
            );
          })}
        </ul>
      )}
      {data.next ? <div className="flex justify-center"><button type="button" className="sk-btn" disabled={state.more} onClick={() => load(data.next.before)}>{state.more ? 'Loading…' : 'Load older'}</button></div> : null}
    </CommunityLayout>
  );
}
