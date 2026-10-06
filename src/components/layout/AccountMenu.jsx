/* ==========================================================================
   Sikhify — AccountMenu (rendered into the header's account area)
   Guests: "Sign In". Members: notifications bell (unread count, refreshed every
   minute while the tab is visible) and a profile menu. Staff also get "Admin".
   ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationService } from '../../services/community/index.js';
import Avatar from '../ui/Avatar.jsx';
import Icon from '../ui/Icon.jsx';
import SiteLink from '../common/SiteLink.jsx';

/** Shared unread count: the notifications page dispatches `sikhify:notifications` after reading. */
function useUnreadCount(user) {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    if (!user) { setUnread(0); return; }
    notificationService.unreadCount().then(setUnread).catch(() => {});
  }, [user]);
  useEffect(() => {
    refresh();
    if (!user) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const onChange = (e) => { if (e.detail && typeof e.detail.unread === 'number') setUnread(e.detail.unread); else refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('sikhify:notifications', onChange);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); document.removeEventListener('sikhify:notifications', onChange); };
  }, [user, refresh]);
  return unread;
}

function signOut(logout) {
  logout().finally(() => {
    // A full load resets every page that showed member-only data.
    window.location.assign('/');
  });
}

export default function AccountMenu() {
  const { user, can, logout } = useAuth();
  const unread = useUnreadCount(user);
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
      <SiteLink className="header-icon-btn sk-notif-btn" to="/community/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
        <Icon name="bell" size={18} />
        {unread ? <span className="sk-notif-dot" aria-hidden="true">{unread > 99 ? '99+' : unread}</span> : null}
      </SiteLink>
      <div ref={wrap} style={{ position: 'relative' }}>
        <button type="button" className="sk-account-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${user.name}`} onClick={() => setOpen((o) => !o)}>
          <Avatar user={user} size={34} />
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
  const { user, can, logout } = useAuth();
  const unread = useUnreadCount(user);
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
