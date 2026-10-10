/* Sikhify — adminService: every staff-only API call. The server enforces roles on each one. */
import { get, post, patch, del, qs } from '../api/client.js';

export const adminService = {
  dashboard: () => get('/api/admin/dashboard'),
  analytics: () => get('/api/admin/analytics'),
  moderationLog: (page) => get('/api/admin/moderation-log' + qs({ page })),

  users: (params) => get('/api/admin/users' + qs(params)),
  updateUser: (id, input) => patch(`/api/admin/users/${id}`, input).then((d) => d.user),
  resetLink: (id) => post(`/api/admin/users/${id}/reset-link`),

  posts: (params) => get('/api/admin/posts' + qs(params)),
  comments: (params) => get('/api/admin/comments' + qs(params)),
  groups: (params) => get('/api/admin/groups' + qs(params)).then((d) => d.items),
  setGroupStatus: (id, status, note) => post(`/api/admin/groups/${id}/status`, { status, note }),

  reports: (params) => get('/api/admin/reports' + qs(params)),
  resolveReport: (id, input) => post(`/api/admin/reports/${id}/resolve`, input),

  submissions: (params) => get('/api/admin/submissions' + qs(params)),
  gurdwaraSubmissions: (params) => get('/api/admin/gurdwara-submissions' + qs(params)),

  banners: () => get('/api/admin/banners'),
  banner: (id) => get(`/api/admin/banners/${id}`).then((d) => d.banner),
  createBanner: (input) => post('/api/admin/banners', input).then((d) => d.banner),
  updateBanner: (id, input) => patch(`/api/admin/banners/${id}`, input).then((d) => d.banner),
  setBannerStatus: (id, status) => post(`/api/admin/banners/${id}/status`, { status }).then((d) => d.banner),
  reorderBanners: (ids) => post('/api/admin/banners/reorder', { ids }).then((d) => d.items),
  deleteBanner: (id) => del(`/api/admin/banners/${id}`),
  reviewSubmission: (id, input) => post(`/api/admin/submissions/${id}/review`, input).then((d) => d.submission),

  hukamnamas: (params) => get('/api/admin/hukamnamas' + qs(params)),
  hukamnama: (id) => get(`/api/admin/hukamnamas/${id}`),
  createHukamnama: (input) => post('/api/admin/hukamnamas', input).then((d) => d.hukamnama),
  updateHukamnama: (id, input) => patch(`/api/admin/hukamnamas/${id}`, input).then((d) => d.hukamnama),
  setHukamnamaStatus: (id, status, replace) => post(`/api/admin/hukamnamas/${id}/status`, { status, replace }).then((d) => d.hukamnama),
  deleteHukamnama: (id) => del(`/api/admin/hukamnamas/${id}`),

  festivals: (params) => get('/api/admin/festivals' + qs(params)),
  festival: (id) => get(`/api/admin/festivals/${id}`),
  createFestival: (input) => post('/api/admin/festivals', input).then((d) => d.observance),
  updateFestival: (id, input) => patch(`/api/admin/festivals/${id}`, input).then((d) => d.observance),
  setFestivalStatus: (id, status) => post(`/api/admin/festivals/${id}/status`, { status }).then((d) => d.observance),
  deleteFestival: (id) => del(`/api/admin/festivals/${id}`),

  media: () => get('/api/admin/media'),
  createArtist: (input) => post('/api/admin/media/artists', input).then((d) => d.artist),
  updateArtist: (id, input) => patch(`/api/admin/media/artists/${id}`, input).then((d) => d.artist),
  deleteArtist: (id) => del(`/api/admin/media/artists/${id}`),
  addVideo: (artistId, input) => post(`/api/admin/media/artists/${artistId}/videos`, input).then((d) => d.video),
  updateVideo: (id, input) => patch(`/api/admin/media/videos/${id}`, input).then((d) => d.video),
  deleteVideo: (id) => del(`/api/admin/media/videos/${id}`),
  addCategory: (name) => post('/api/admin/media/categories', { name }).then((d) => d.categories),
  lookupYouTube: (url) => get('/api/admin/media/oembed' + qs({ url })),

  entries: (params) => get('/api/admin/entries' + qs(params)),
  entry: (id) => get(`/api/admin/entries/${id}`).then((d) => d.entry),
  createEntry: (input) => post('/api/admin/entries', input).then((d) => d.entry),
  updateEntry: (id, input) => patch(`/api/admin/entries/${id}`, input).then((d) => d.entry),
  verifyEntry: (id, status) => post(`/api/admin/entries/${id}/verify`, { status }).then((d) => d.entry),
  deleteEntry: (id) => del(`/api/admin/entries/${id}`),

  settings: () => get('/api/admin/settings').then((d) => d.settings),
  system: () => get('/api/admin/system'),
  updateSettings: (input) => patch('/api/admin/settings', input).then((d) => d.settings),
};
