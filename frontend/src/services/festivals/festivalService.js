/* Sikhify — festivalService: Sikh Festivals & Important Days (public reads; published, verified dates only). */
import { get } from '../api/client.js';

export const festivalService = {
  home: () => get('/api/festivals/home'),
  list: () => get('/api/festivals'),
  get: (slug) => get(`/api/festivals/${encodeURIComponent(slug)}`),
};
