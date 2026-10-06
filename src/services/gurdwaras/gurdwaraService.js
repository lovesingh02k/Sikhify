/* Sikhify — gurdwaraService: the Global Gurdwara Directory API (public, member and staff calls). */
import { get, post, patch, del, qs } from '../api/client.js';

export const gurdwaraService = {
  /** Server-side search: { q, country, state, city, status[], facilities[], services[], sort, lat, lng, radius, page, pageSize } */
  search(p = {}) {
    return get('/api/gurdwaras' + qs({
      q: p.q, country: p.country, state: p.state, city: p.city,
      status: (p.status || []).join(','), facilities: (p.facilities || []).join(','), services: (p.services || []).join(','),
      sort: p.sort, lat: p.lat, lng: p.lng, radius: p.radius, page: p.page, pageSize: p.pageSize,
    }));
  },
  meta: () => get('/api/gurdwaras/meta'),
  locations: (country, state) => get('/api/gurdwaras/locations' + qs({ country, state })),
  countries: () => get('/api/gurdwaras/countries').then((d) => d.items),
  place: (p) => get('/api/gurdwaras/place' + qs(p)),
  detail: (country, state, city, slug) => get(`/api/gurdwaras/by-path/${[country, state, city, slug].map(encodeURIComponent).join('/')}`),

  suggest: (input) => post('/api/gurdwaras/submissions', input),
  mySuggestions: () => get('/api/me/gurdwara-submissions').then((d) => d.items),
  resubmit: (id, input) => patch(`/api/gurdwaras/submissions/${id}`, input).then((d) => d.submission),

  admin: {
    stats: () => get('/api/admin/gurdwaras/stats'),
    list: (p) => get('/api/admin/gurdwaras' + qs(p)),
    get: (id) => get(`/api/admin/gurdwaras/${id}`).then((d) => d.gurdwara),
    create: (input) => post('/api/admin/gurdwaras', input).then((d) => d.gurdwara),
    update: (id, input) => patch(`/api/admin/gurdwaras/${id}`, input).then((d) => d.gurdwara),
    setStatus: (id, status) => post(`/api/admin/gurdwaras/${id}/status`, { status }).then((d) => d.gurdwara),
    verify: (id, verified, note) => post(`/api/admin/gurdwaras/${id}/verify`, { verified, note }).then((d) => d.gurdwara),
    verifyBulk: (ids, note) => post('/api/admin/gurdwaras/verify-bulk', { ids, note }),
    archive: (id, archived) => post(`/api/admin/gurdwaras/${id}/archive`, { archived }).then((d) => d.gurdwara),
    addSource: (id, input) => post(`/api/admin/gurdwaras/${id}/sources`, input).then((d) => d.gurdwara),
    removeSource: (sourceId) => del(`/api/admin/gurdwara-sources/${sourceId}`).then((d) => d.gurdwara),
    addImage: (id, input) => post(`/api/admin/gurdwaras/${id}/images`, input).then((d) => d.gurdwara),
    updateImage: (imageId, input) => patch(`/api/admin/gurdwara-images/${imageId}`, input).then((d) => d.gurdwara),
    removeImage: (imageId) => del(`/api/admin/gurdwara-images/${imageId}`).then((d) => d.gurdwara),
    checkDuplicates: (p) => get('/api/admin/gurdwaras/check-duplicates' + qs(p)).then((d) => d.items),
    duplicatePairs: () => get('/api/admin/gurdwaras/duplicates').then((d) => d.items),
    importFile: (format, content, dryRun) => post('/api/admin/gurdwaras/import', { format, content, dryRun }, { timeout: 120000 }),
    submissions: (p) => get('/api/admin/gurdwara-submissions' + qs(p)),
    review: (id, input) => post(`/api/admin/gurdwara-submissions/${id}/review`, input).then((d) => d.submission),
  },
};

/* ---------- links that open in the visitor's own maps app (no API key needed) */
export function directionsUrl(g) {
  if (g.latitude !== null && g.latitude !== undefined) return `https://www.google.com/maps/dir/?api=1&destination=${g.latitude},${g.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([g.name, g.address, g.city && g.city.name, g.country && g.country.name].filter(Boolean).join(', '))}`;
}
export function openInMapsUrl(g) {
  if (g.latitude !== null && g.latitude !== undefined) return `https://www.openstreetmap.org/?mlat=${g.latitude}&mlon=${g.longitude}#map=17/${g.latitude}/${g.longitude}`;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent([g.name, g.address, g.city && g.city.name, g.country && g.country.name].filter(Boolean).join(', '))}`;
}
export function placeLabel(g) {
  return [g.city && g.city.name, g.state && g.state.name, g.country && g.country.name].filter(Boolean).join(', ');
}
export function formatDistance(km) {
  if (km === null || km === undefined) return '';
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}
