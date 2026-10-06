import { NavLink } from 'react-router-dom';
import PageHero from '../common/PageHero.jsx';
import Icon from '../ui/Icon.jsx';
import { ServiceUnavailable } from '../ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { authService } from '../../services/auth/authService.js';

/** Shared frame for community pages: page hero + side navigation + content. */
export default function CommunityLayout({ title, sub, crumbs, eyebrow = 'Community', children }) {
  const { user, status } = useAuth();
  const settings = useAsync(() => authService.publicSettings().catch(() => null), []);
  const notice = settings.data && settings.data.communityNotice;
  const readOnly = settings.data && settings.data.communityReadOnly;
  const nav = [
    ['/community', 'Feed', 'home', true],
    ['/community/discover', 'Discover', 'compass'],
    ['/community/groups', 'Groups', 'users'],
    ...(user ? [
      ['/community/saved', 'Saved', 'bookmark'],
      ['/community/notifications', 'Notifications', 'bell'],
      [`/community/profile/${user.username}`, 'My profile', 'user'],
      ['/community/settings', 'Settings', 'settings'],
    ] : []),
    ['/submit', 'Submit information', 'upload'],
  ];
  return (
    <main id="main-content">
      <PageHero crumbs={crumbs || [{ label: 'Community', to: '/community' }, { label: title }]} eyebrow={eyebrow} title={title} sub={sub} glyph="ਸੰਗਤ" />
      <div className="sk-container sk-section">
        {status === 'unavailable' ? <ServiceUnavailable /> : (
          <div className="sk-app">
            <nav className="sk-sidenav" aria-label="Community">
              {nav.map(([to, label, icon, end]) => (
                // NavLink sets aria-current="page" on the active link (styled by .sk-sidenav).
                <NavLink key={to} to={to} end={!!end}>
                  <Icon name={icon} size={18} />{label}
                </NavLink>
              ))}
            </nav>
            <div className="min-w-0 sk-stack">
              {notice ? <div className="sk-note" role="note"><Icon name="alert" size={18} /><p>{notice}</p></div> : null}
              {readOnly ? <div className="sk-note" role="note"><Icon name="lock" size={18} /><p>The community is read-only for now — you can read, but new posts and comments are paused.</p></div> : null}
              {children}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
