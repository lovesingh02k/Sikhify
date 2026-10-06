/* The Sikhify Admin Panel frame: navigation filtered by the signed-in role. The API enforces the same rules. */
import { NavLink, Outlet } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { ROLE_LABELS } from '../../../shared/roles.js';

const NAV = [
  ['Overview', [
    ['/admin', 'Dashboard', 'dashboard', 'admin.access', true],
    ['/admin/analytics', 'Analytics', 'chart', 'analytics.view'],
  ]],
  ['Community', [
    ['/admin/users', 'Users', 'users', 'admin.access'],
    ['/admin/reports', 'Reports', 'flag', 'community.moderate'],
    ['/admin/posts', 'Posts', 'message', 'community.moderate'],
    ['/admin/comments', 'Comments', 'message', 'community.moderate'],
    ['/admin/groups', 'Groups', 'users', 'community.moderate'],
  ]],
  ['Content', [
    ['/admin/hukamnama', 'Hukamnama', 'book', 'content.manage'],
    ['/admin/media', 'Media', 'youtube', 'content.manage'],
    ['/admin/submissions', 'Submissions', 'inbox', 'submission.review'],
    ['/admin/content', 'All content', 'globe', 'content.manage', true],
    ['/admin/gurdwaras', 'Gurdwaras', 'pin', 'content.manage'],
    ['/admin/events', 'Events', 'calendar', 'content.manage'],
    ['/admin/personalities', 'Personalities', 'user', 'content.manage'],
    ['/admin/news', 'News', 'external', 'content.manage'],
  ]],
  ['System', [
    ['/admin/settings', 'Settings', 'sliders', 'admin.access'],
  ]],
];

export default function AdminLayout() {
  useReactPage('Admin — Sikhify', 'Sikhify administration.', { noindex: true, motion: false });
  const { user, can } = useAuth();
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Admin' }]} eyebrow={`Admin · ${ROLE_LABELS[user.role]}`} title={<>Sikhify <span className="gold">Admin</span></>}
        sub="Manage the daily Hukamnama, media, the directory, submissions and the community." />
      <div className="sk-container sk-section" data-motion="off">
        <div className="sk-app">
          <nav className="sk-sidenav" aria-label="Admin">
            {NAV.map(([group, items]) => {
              const visible = items.filter(([, , , cap]) => can(cap));
              if (!visible.length) return null;
              return [
                <p key={group} className="sk-sidenav-label">{group}</p>,
                ...visible.map(([to, label, icon, , end]) => <NavLink key={to} to={to} end={!!end}><Icon name={icon} size={18} />{label}</NavLink>),
              ];
            })}
          </nav>
          <div className="min-w-0 sk-stack"><Outlet /></div>
        </div>
      </div>
    </main>
  );
}
