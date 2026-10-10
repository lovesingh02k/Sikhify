/* ==========================================================================
   Admin — plain-language labels for the staff activity log (moderation_log).
   "banner.publish" → { text: "published a homepage banner", icon, tone }.
   Unknown codes fall back to a readable version of the code itself.
   ========================================================================== */
const OBJECTS = {
  banner: ['a homepage banner', 'image', 'amber'],
  festival: ['a festival', 'calendar', 'amber'],
  gurdwara: ['a Gurdwara', 'pin', 'blue'],
  entry: ['a directory entry', 'globe', 'blue'],
  hukamnama: ['a Hukamnama', 'book', 'amber'],
  'media.artist': ['an artist', 'youtube', 'purple'],
  'media.video': ['a video', 'youtube', 'purple'],
  post: ['a post', 'message', 'green'],
  comment: ['a comment', 'message', 'green'],
  group: ['a group', 'users', 'green'],
  user: ['a user', 'user', 'purple'],
  report: ['a report', 'flag', 'red'],
  submission: ['a submission', 'inbox', 'blue'],
  settings: ['the site settings', 'sliders', 'navy'],
  upload: ['an image', 'upload', 'navy'],
};
const VERBS = {
  create: 'added', update: 'edited', save: 'saved', delete: 'deleted', publish: 'published', unpublish: 'unpublished',
  archive: 'archived', restore: 'restored', verify: 'verified', unverify: 'marked as needing verification', reject: 'rejected',
  merge: 'merged a duplicate into', review: 'reviewed', manage: 'changed', role: 'changed the role of', reset_link: 'created a password-reset link for',
  ban_member: 'removed a member from', reorder: 'reordered',
};
const SPECIAL = {
  'banner.reorder': ['reordered the homepage banners', 'image', 'amber'],
  'gurdwara.import': ['imported Gurdwaras', 'upload', 'blue'],
  'gurdwara.bulk_verify': ['verified Gurdwaras in bulk', 'shield', 'blue'],
  'gurdwara.verify_bulk': ['verified Gurdwaras in bulk', 'shield', 'blue'],
  'gurdwara.verify_audit': ['verified Gurdwaras by evidence audit', 'shield', 'blue'],
  'entry.verify.verified': ['verified a directory entry', 'shield', 'blue'],
  'settings.update': ['updated the site settings', 'sliders', 'navy'],
  'settings.manage': ['updated the site settings', 'sliders', 'navy'],
};

export function activityLabel(action) {
  const code = String(action || '');
  if (SPECIAL[code]) { const [text, icon, tone] = SPECIAL[code]; return { text, icon, tone }; }
  const parts = code.split('.');
  const objKey = OBJECTS[parts.slice(0, 2).join('.')] ? parts.slice(0, 2).join('.') : parts[0];
  const verb = parts[objKey.split('.').length] || '';
  const obj = OBJECTS[objKey];
  if (obj && VERBS[verb]) return { text: `${VERBS[verb]} ${obj[0]}`, icon: obj[1], tone: obj[2] };
  return { text: code.replace(/[._]/g, ' ').trim() || 'did something', icon: obj ? obj[1] : 'history', tone: obj ? obj[2] : 'navy' };
}
