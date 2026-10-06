/* ==========================================================================
   Sikhify — shared/roles.js
   One permission table for the whole platform. The API server enforces it on
   every request; the browser uses the same table only to decide what to show.

   Site roles (users.role):   user · moderator · admin (Master Admin)
   Guest = not signed in.
   Group roles (group_members.role): admin (Group Admin) · moderator · member —
   these apply only inside that one group.
   ========================================================================== */

export const SITE_ROLES = ['user', 'moderator', 'admin'];
export const GROUP_ROLES = ['admin', 'moderator', 'member'];
export const USER_STATUSES = ['active', 'suspended', 'banned'];

export const ROLE_LABELS = {
  guest: 'Guest',
  user: 'User',
  moderator: 'Moderator',
  admin: 'Master Admin',
};
export const GROUP_ROLE_LABELS = { admin: 'Group Admin', moderator: 'Group Moderator', member: 'Member' };

/** capability → site roles that hold it */
const CAPABILITIES = {
  // Community participation (also requires an active account — see `can`).
  'post.create': ['user', 'moderator', 'admin'],
  'comment.create': ['user', 'moderator', 'admin'],
  'reaction.create': ['user', 'moderator', 'admin'],
  'post.save': ['user', 'moderator', 'admin'],
  'report.create': ['user', 'moderator', 'admin'],
  'group.create': ['user', 'moderator', 'admin'],
  'submission.create': ['user', 'moderator', 'admin'],
  'upload.create': ['user', 'moderator', 'admin'],

  // Staff
  'admin.access': ['moderator', 'admin'],
  'community.moderate': ['moderator', 'admin'], // hide/restore posts & comments, resolve reports, suspend groups
  'submission.review': ['moderator', 'admin'],
  'content.manage': ['moderator', 'admin'], // directory entries, media, Hukamnama
  'content.delete': ['admin'], // permanent deletion of content records
  'user.manage': ['admin'], // roles, suspensions, bans
  'settings.manage': ['admin'],
  'analytics.view': ['moderator', 'admin'],
};

/** Capabilities a suspended account keeps (it can still read, save and manage its own data). */
const SUSPENDED_ALLOWED = new Set(['post.save']);

export function can(user, capability) {
  if (!user) return false;
  const roles = CAPABILITIES[capability];
  if (!roles || !roles.includes(user.role)) return false;
  if (user.status === 'active') return true;
  if (user.status === 'suspended') return SUSPENDED_ALLOWED.has(capability);
  return false;
}

export function permissionsFor(user) {
  return Object.fromEntries(Object.keys(CAPABILITIES).map((c) => [c, can(user, c)]));
}

export const isStaff = (user) => can(user, 'admin.access');

/**
 * Group-level abilities. `membership` is the viewer's group_members row (or null).
 * Site moderators/admins can always moderate; only group admins (or site admins)
 * manage the group's settings and members' roles.
 */
export function groupAbilities(user, membership) {
  const active = membership && membership.status === 'active';
  const role = active ? membership.role : null;
  const siteMod = can(user, 'community.moderate');
  const siteAdmin = user && user.role === 'admin' && user.status === 'active';
  return {
    isMember: !!active,
    isPending: !!membership && membership.status === 'pending',
    isBanned: !!membership && membership.status === 'banned',
    role,
    canPost: !!active && can(user, 'post.create'),
    canModerate: siteMod || role === 'admin' || role === 'moderator',
    canApproveMembers: siteMod || role === 'admin' || role === 'moderator',
    canManage: siteAdmin || role === 'admin',
    canDelete: siteAdmin || role === 'admin',
  };
}
