/* ==========================================================================
   Sikhify — shared/community.js
   Constants and limits for the community features, shared by browser and API.
   ========================================================================== */

export const GROUP_CATEGORIES = [
  'Sikh Youth', 'Seva', 'Education', 'Gurmat', 'Kirtan', 'Local Sangat',
  'Professionals', 'Events', 'Sports', 'Family', 'Other',
];

export const REACTIONS = {
  like: { label: 'Like', emoji: '👍' },
  support: { label: 'Support', emoji: '🙏' },
  insightful: { label: 'Insightful', emoji: '💡' },
};
export const REACTION_TYPES = Object.keys(REACTIONS);

export const REPORT_REASONS = [
  'Spam', 'Harassment', 'Hate speech', 'Disrespect to Gurbani or the Gurus',
  'False information', 'Inappropriate content', 'Other',
];
export const REPORT_TARGETS = ['post', 'comment', 'user', 'group'];

export const LIMITS = {
  postBody: 5000,
  postImages: 4,
  commentBody: 2000,
  bio: 500,
  name: 80,
  groupName: 80,
  groupDescription: 300,
  groupAbout: 5000,
  reportDetails: 1000,
  uploadBytes: 3 * 1024 * 1024,
  // Total stored (optimised) image bytes per account. Staff who manage directory/festival photos get more.
  uploadQuotaBytes: 50 * 1024 * 1024,
  uploadQuotaBytesStaff: 1024 * 1024 * 1024,
  interests: 12,
};

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_.]{1,28})[a-z0-9]$/;
export const PASSWORD_MIN = 8;

/** What people can send through "Submit / Update Information". */
export const SUBMISSION_KINDS = {
  event: { label: 'An event', creates: 'event' },
  personality: { label: 'A Sikh personality', creates: 'personality' },
  kirtani: { label: 'A Kirtani / Jatha / Katha Vachak', creates: 'media_artist' },
  website: { label: 'A Sikh website', creates: 'website' },
  app: { label: 'A Sikh app', creates: 'app' },
  book: { label: 'A book or research resource', creates: 'book' },
  organization: { label: 'An organization', creates: 'organization' },
  correction: { label: 'A correction to existing information', creates: null },
  incorrect: { label: 'Report incorrect information', creates: null },
  // Requests about personal data (see /privacy-policy): access, correction, deletion. Needs no page or source.
  privacy: { label: 'A privacy or data request', creates: null, privacy: true },
};
export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'published'];

export const NOTIFICATION_TYPES = [
  'reaction', 'comment', 'reply', 'group_join_request', 'group_join_approved',
  'group_role', 'moderation', 'report_resolved', 'submission_reviewed', 'submission_received', 'system',
];
