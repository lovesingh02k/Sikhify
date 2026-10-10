/* Sikhify admin — the sidebar menu (shared by AdminLayout and the page headers). */
/* [path, label, icon, capability, exact match, pending-count key] */
export const NAV = [
  ['Overview', [
    ['/admin', 'Dashboard', 'dashboard', 'admin.access', true],
  ]],
  ['Review & moderation', [
    ['/admin/submissions', 'Submissions', 'inbox', 'submission.review', false, 'submissions'],
    ['/admin/reports', 'Reports', 'flag', 'community.moderate', false, 'reports'],
    ['/admin/posts', 'Posts', 'message', 'community.moderate'],
    ['/admin/comments', 'Comments', 'message', 'community.moderate'],
    ['/admin/groups', 'Groups', 'users', 'community.moderate'],
  ]],
  ['Gurdwara Directory', [
    ['/admin/gurdwaras', 'Gurdwaras', 'pin', 'content.manage'],
  ]],
  ['Homepage & content', [
    ['/admin/banners', 'Homepage banners', 'image', 'content.manage'],
    ['/admin/hukamnama', 'Hukamnama', 'book', 'content.manage'],
    ['/admin/festivals', 'Festivals & Days', 'calendar', 'content.manage'],
    ['/admin/media', 'Gurbani media', 'youtube', 'content.manage'],
    ['/admin/events', 'Events', 'calendar', 'content.manage'],
    ['/admin/personalities', 'Personalities', 'user', 'content.manage'],
    ['/admin/news', 'News', 'external', 'content.manage'],
    ['/admin/content', 'All directory content', 'globe', 'content.manage', true],
  ]],
  ['People & settings', [
    ['/admin/users', 'Users', 'users', 'admin.access'],
    ['/admin/analytics', 'Analytics', 'chart', 'analytics.view'],
    ['/admin/settings', 'Settings', 'sliders', 'admin.access'],
  ]],
];

/** Each section's colour (sidebar group), used for the page header's icon tile. */
const GROUP_TONE = { Overview: 'navy', 'Review & moderation': 'blue', 'Gurdwara Directory': 'green', 'Homepage & content': 'amber', 'People & settings': 'purple' };

/** The menu entry for a path (most specific match), with its group and tone — or null. */
export function adminSection(pathname) {
  let best = null;
  for (const [group, items] of NAV) {
    for (const [to, label, icon, , end] of items) {
      const hit = end ? pathname === to : pathname === to || pathname.startsWith(to + '/');
      if (hit && (!best || to.length > best.to.length)) best = { to, label, icon, group, tone: GROUP_TONE[group] || 'navy' };
    }
  }
  if (!best) { // sub-pages of an exact-match entry (e.g. /admin/content/new) still belong to it
    for (const [group, items] of NAV) for (const [to, label, icon] of items) {
      if (to !== '/admin' && pathname.startsWith(to + '/') && (!best || to.length > best.to.length)) best = { to, label, icon, group, tone: GROUP_TONE[group] || 'navy' };
    }
  }
  return best;
}
