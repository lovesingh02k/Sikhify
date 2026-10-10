/* ==========================================================================
   Sikhify — AccountMenu (rendered into the header's account area)
   Guests: "Sign In". Members: notifications bell (unread count, refreshed every
   minute while the tab is visible) and a profile menu. Staff also get "Admin".
   While the session is still being checked neither is shown — a placeholder of the
   same size holds the space, so a signed-in visitor never sees Sign In flash up.
   ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, readSignedInHint } from '../../context/AuthContext.jsx';
import { notificationService } from '../../services/community/index.js';
import Avatar from '../ui/Avatar.jsx';
import Icon from '../ui/Icon.jsx';
import SiteLink from '../common/SiteLink.jsx';
import NotificationPopup from './NotificationPopup.jsx';

/*
 * The last known unread count is remembered for this browser tab (per account), so a page
 * change — many pages load as a full document — shows the badge straight away instead of
 * blinking it out until the request returns. The server's answer then corrects it.
 */
const UNREAD_KEY = 'sikhify:unread';
function readUnread(user) {
  try { const v = JSON.parse(sessionStorage.getItem(UNREAD_KEY)); return v && user && v.uid === user.id ? Number(v.n) || 0 : 0; } catch { return 0; }
}
function writeUnread(user, n) {
  try { if (user) sessionStorage.setItem(UNREAD_KEY, JSON.stringify({ uid: user.id, n })); } catch { /* storage unavailable */ }
}

/** Shared unread count: the notifications page dispatches `sikhify:notifications` after reading. */
function useUnreadCount(user, everyMs = 60000) {
  // Kept with the account it belongs to: when the account becomes known (first paint after the
  // session check), its remembered count is used in that same render — no empty frame.
  const [state, setUnreadState] = useState(() => ({ uid: user ? user.id : null, n: readUnread(user) }));
  const unread = user ? (state.uid === user.id ? state.n : readUnread(user)) : 0;
  const setUnread = useCallback((n) => { setUnreadState({ uid: user ? user.id : null, n }); writeUnread(user, n); }, [user]);
  const refresh = useCallback(() => {
    if (!user) { setUnreadState({ uid: null, n: 0 }); return; }
    notificationService.unreadCount().then(setUnread).catch(() => {});
  }, [user, setUnread]);
  useEffect(() => {
    refresh();
    if (!user) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, everyMs);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const onChange = (e) => { if (e.detail && typeof e.detail.unread === 'number') setUnread(e.detail.unread); else refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('sikhify:notifications', onChange);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); document.removeEventListener('sikhify:notifications', onChange); };
  }, [user, refresh, everyMs, setUnread]);
  return unread;
}

function signOut(logout) {
  logout().finally(() => {
    // A full load resets every page that showed member-only data.
    window.location.assign('/');
  });
}

/** Holds the account area's space while the session check runs (shaped like what will most likely appear). */
function Pending({ mobile = false }) {
  if (mobile) return <span className="sk-account-pending sk-account-pending-mobile" aria-hidden="true" />;
  return readSignedInHint()
    ? <span className="sk-account-pending-row" aria-hidden="true"><span className="sk-account-pending sk-account-pending-icon" /><span className="sk-account-pending sk-account-pending-avatar" /></span>
    : <span className="sk-account-pending sk-account-pending-btn hidden sm:inline-flex" aria-hidden="true" />;
}

export default function AccountMenu() {
  const { user, can, logout, authState } = useAuth();
  // Staff who review submissions hear about new ones sooner (every 30 s while the tab is visible).
  const unread = useUnreadCount(user, user && can('submission.review') ? 30000 : 60000);
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); wrap.current?.querySelector('button')?.focus(); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!user && authState === 'initializing') return <Pending />;
  if (!user) {
    return (
      <SiteLink className="btn-gold-fill hidden sm:inline-flex" to="/login">
        <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14"><circle cx="7" cy="4.5" r="2.5" stroke="#142238" strokeWidth="1.3" /><path d="M2 12.5c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="#142238" strokeWidth="1.3" /></svg>
        Sign In
      </SiteLink>
    );
  }

  const close = () => setOpen(false);
  return (
    <>
      <NotificationPopup user={user} unread={unread} />
      <SiteLink className="header-icon-btn sk-notif-btn" to="/community/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
        <Icon name="bell" size={18} />
        {unread ? <span className="sk-notif-dot" aria-hidden="true">{unread > 99 ? '99+' : unread}</span> : null}
      </SiteLink>
      <div ref={wrap} style={{ position: 'relative' }}>
        <button type="button" className="sk-account-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${user.name}`} onClick={() => setOpen((o) => !o)}>
          <Avatar user={user} size={34} />
          <span className="sk-account-name" aria-hidden="true">{String(user.name || user.username).split(' ')[0]}</span>
          <Icon name="chevron" size={14} className="sk-account-caret" />
        </button>
        {open ? (
          <div className="sk-menu" role="menu" aria-label="Account">
            <div className="sk-menu-head">
              <p className="sk-post-author">{user.name}</p>
              <p className="sk-card-meta" style={{ marginTop: 0 }}>@{user.username}</p>
            </div>
            <SiteLink role="menuitem" to={`/community/profile/${user.username}`} onClick={close}><Icon name="user" size={16} />My profile</SiteLink>
            <SiteLink role="menuitem" to="/community" onClick={close}><Icon name="home" size={16} />Community feed</SiteLink>
            <SiteLink role="menuitem" to="/community/saved" onClick={close}><Icon name="bookmark" size={16} />Saved posts</SiteLink>
            <SiteLink role="menuitem" to="/submit" onClick={close}><Icon name="upload" size={16} />My submissions</SiteLink>
            <SiteLink role="menuitem" to="/community/settings" onClick={close}><Icon name="settings" size={16} />Settings</SiteLink>
            {can('admin.access') ? <SiteLink role="menuitem" to="/admin" onClick={close}><Icon name="shield" size={16} />Admin</SiteLink> : null}
            <button type="button" role="menuitem" onClick={() => signOut(logout)}><Icon name="logout" size={16} />Sign out</button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function closeMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const toggle = document.getElementById('mobile-menu-toggle');
  if (menu) menu.classList.remove('is-open');
  if (toggle) {
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
}

export function MobileAccount() {
  const { user, can, logout, authState } = useAuth();
  const unread = useUnreadCount(user);
  if (!user && authState === 'initializing') return <Pending mobile />;
  if (!user) return <SiteLink className="btn-gold-fill justify-center mt-2" to="/login" onClick={closeMobileMenu}>Sign In</SiteLink>;
  return (
    <div className="sk-mobile-account">
      <SiteLink className="mobile-nav-link" to={`/community/profile/${user.username}`} onClick={closeMobileMenu}>My profile (@{user.username})</SiteLink>
      <SiteLink className="mobile-nav-link" to="/community/notifications" onClick={closeMobileMenu}>Notifications{unread ? ` (${unread})` : ''}</SiteLink>
      <SiteLink className="mobile-nav-link" to="/community/saved" onClick={closeMobileMenu}>Saved posts</SiteLink>
      <SiteLink className="mobile-nav-link" to="/community/settings" onClick={closeMobileMenu}>Settings</SiteLink>
      {can('admin.access') ? <SiteLink className="mobile-nav-link" to="/admin" onClick={closeMobileMenu}>Admin</SiteLink> : null}
      <button type="button" className="mobile-nav-link mobile-nav-toggle" onClick={() => signOut(logout)}>Sign out</button>
    </div>
  );
}
