/* ==========================================================================
   Sikhify — content services: the knowledge directory and submissions.
   One generic entryService covers every content type in
   shared/contentTypes.js; the named services below are the same calls
   pre-bound to a type, for readability where a page deals with one type.
   ========================================================================== */
import { get, post, qs } from '../api/client.js';

export const entryService = {
  list: (type, params = {}) => get('/api/entries' + qs({ type, ...params })),
  facets: (type, params = {}) => get('/api/entries/facets' + qs({ type, ...params })),
  get: (type, slug) => get(`/api/entries/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`).then((d) => d.entry),
  summary: () => get('/api/entries/summary').then((d) => d.counts),
};

const bound = (type) => ({
  list: (params) => entryService.list(type, params),
  facets: (params) => entryService.facets(type, params),
  get: (slug) => entryService.get(type, slug),
});
export const eventService = bound('event');
export const personalityService = bound('personality');
export const newsService = bound('news');

export const submissionService = {
  create: (input) => post('/api/submissions', input).then((d) => d.submission),
  mine: () => get('/api/me/submissions').then((d) => d.items),
};
