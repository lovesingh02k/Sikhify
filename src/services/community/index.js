/* ==========================================================================
   Sikhify — community services: users/profiles, posts, comments, groups,
   notifications, reports and image uploads.
   ========================================================================== */
import { get, post, patch, del, qs } from '../api/client.js';

export const userService = {
  profile: (username) => get(`/api/users/${encodeURIComponent(username)}`).then((d) => d.profile),
  search: (q) => get('/api/users' + qs({ q })).then((d) => d.items),
  updateProfile: (input) => patch('/api/me/profile', input).then((d) => d.user),
  activity: () => get('/api/me/activity').then((d) => d.items),
};

export const postService = {
  /** scope: feed · discover · saved · group:<id|slug> · user:<username>; cursor from the previous page's `next`. */
  list: (scope, cursor = {}) => get('/api/posts' + qs({ scope, ...cursor })),
  get: (id) => get(`/api/posts/${id}`).then((d) => d.post),
  create: (input) => post('/api/posts', input).then((d) => d.post),
  update: (id, input) => patch(`/api/posts/${id}`, input).then((d) => d.post),
  remove: (id) => del(`/api/posts/${id}`),
  react: (id, type) => post(`/api/posts/${id}/reaction`, { type }).then((d) => d.post),
  save: (id, saved) => post(`/api/posts/${id}/save`, { saved }).then((d) => d.post),
  share: (id) => post(`/api/posts/${id}/share`),
  moderate: (id, action, note) => post(`/api/posts/${id}/moderate`, { action, note }).then((d) => d.post),
};

export const commentService = {
  list: (postId) => get(`/api/posts/${postId}/comments`).then((d) => d.items),
  create: (postId, body, parentId) => post(`/api/posts/${postId}/comments`, { body, parentId }),
  update: (id, body) => patch(`/api/comments/${id}`, { body }).then((d) => d.items),
  remove: (id) => del(`/api/comments/${id}`).then((d) => d.items),
  like: (id, liked) => post(`/api/comments/${id}/like`, { liked }).then((d) => d.items),
  moderate: (id, action) => post(`/api/comments/${id}/moderate`, { action }).then((d) => d.items),
};

export const groupService = {
  list: (params) => get('/api/groups' + qs(params)).then((d) => d.items),
  get: (idOrSlug) => get(`/api/groups/${encodeURIComponent(idOrSlug)}`).then((d) => d.group),
  create: (input) => post('/api/groups', input).then((d) => d.group),
  update: (id, input) => patch(`/api/groups/${id}`, input).then((d) => d.group),
  remove: (id) => del(`/api/groups/${id}`),
  join: (id) => post(`/api/groups/${id}/join`).then((d) => d.group),
  leave: (id) => post(`/api/groups/${id}/leave`).then((d) => d.group),
  members: (id) => get(`/api/groups/${id}/members`),
  updateMember: (id, userId, input) => patch(`/api/groups/${id}/members/${userId}`, input),
  removeMember: (id, userId) => del(`/api/groups/${id}/members/${userId}`),
};

export const notificationService = {
  list: (params) => get('/api/notifications' + qs(params)),
  unreadCount: () => get('/api/notifications/unread-count').then((d) => d.unread),
  markRead: (ids) => post('/api/notifications/read', { ids }),
  markAllRead: () => post('/api/notifications/read', { all: true }),
};

export const reportService = {
  create: (targetType, targetId, reason, details) => post('/api/reports', { targetType, targetId, reason, details }),
};

/* ---------- uploads: images are resized in the browser before upload */
const MAX_SIDE = { avatar: 512, post: 1600, 'group-cover': 1600 };

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image')); };
    img.src = url;
  });
}

async function toDataUrl(file, purpose, maxSide) {
  return (await encode(file, purpose, maxSide)).dataUrl;
}

async function encode(file, purpose, maxSide) {
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) throw new Error('Choose a PNG, JPEG, WebP or GIF image');
  if (file.type === 'image/gif') {
    if (file.size > 3 * 1024 * 1024) throw new Error('GIFs must be 3 MB or smaller');
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ dataUrl: r.result, width: null, height: null });
      r.onerror = () => reject(new Error('That file could not be read'));
      r.readAsDataURL(file);
    });
  }
  const img = await loadImage(file);
  const max = maxSide || MAX_SIDE[purpose] || 1600;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.86), width: canvas.width, height: canvas.height };
}

export const uploadService = {
  /** Resizes and uploads an image; resolves to its /uploads/… URL. */
  async image(file, purpose) {
    const dataUrl = await toDataUrl(file, purpose);
    return post('/api/uploads', { purpose, dataUrl }, { timeout: 60000 }).then((d) => d.url);
  },
  /** Uploads a resized copy (longest side `maxSide`); resolves to { url, width, height }. */
  async imageSized(file, purpose, maxSide) {
    const { dataUrl, width, height } = await encode(file, purpose, maxSide);
    const url = await post('/api/uploads', { purpose, dataUrl }, { timeout: 60000 }).then((d) => d.url);
    return { url, width, height };
  },
};
