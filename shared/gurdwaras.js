/* ==========================================================================
   Sikhify — shared/gurdwaras.js
   Definitions for the Global Gurdwara Directory, shared by the browser and the
   API server: statuses, facilities, services, source types, the normalizers
   used for duplicate detection, and record validation.
   ========================================================================== */

/** Operating status of a Gurdwara. */
export const STATUSES = {
  active: { label: 'Active', tone: 'good' },
  temporarily_closed: { label: 'Temporarily Closed', tone: 'warning' },
  permanently_closed: { label: 'Permanently Closed', tone: 'muted' },
};
export const STATUS_KEYS = Object.keys(STATUSES);

/** Verification of the record itself (separate from whether the Gurdwara is open). */
export const VERIFICATION = {
  verified: { label: 'Verified' },
  needs_verification: { label: 'Needs Verification' },
};
export const VERIFICATION_KEYS = Object.keys(VERIFICATION);

/** Public status filter: the three operating statuses plus "include unverified records". */
export const STATUS_FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'temporarily_closed', label: 'Temporarily Closed' },
  { key: 'permanently_closed', label: 'Permanently Closed' },
  { key: 'needs_verification', label: 'Needs Verification' },
];
export const DEFAULT_STATUS_FILTER = ['active'];

export const FACILITIES = [
  { key: 'langar', label: 'Langar', icon: 'langar' },
  { key: 'parking', label: 'Parking', icon: 'parking' },
  { key: 'wheelchair_access', label: 'Wheelchair Access', icon: 'wheelchair' },
  { key: 'accommodation', label: 'Accommodation', icon: 'bed' },
];
export const SERVICES = [
  { key: 'kirtan', label: 'Kirtan' },
  { key: 'katha', label: 'Katha' },
  { key: 'punjabi_classes', label: 'Punjabi Classes' },
  { key: 'gurmat_classes', label: 'Gurmat Classes' },
  { key: 'akhand_path', label: 'Akhand Path' },
  { key: 'anand_karaj', label: 'Anand Karaj' },
];
export const FACILITY_KEYS = FACILITIES.map((f) => f.key);
export const SERVICE_KEYS = SERVICES.map((s) => s.key);

/**
 * Significance of a Gurdwara, set only from a cited source: the five Takhts, and
 * Gurdwaras connected with the Gurus or major events of Sikh history. Most records have none.
 */
export const DESIGNATIONS = {
  takht: { label: 'Panj Takht', short: 'Takht' },
  historic: { label: 'Historic Gurdwara', short: 'Historic' },
};
export const DESIGNATION_KEYS = Object.keys(DESIGNATIONS);

export const SOURCE_TYPES = {
  official_website: 'Official Gurdwara website',
  sikh_institution: 'Official Sikh institution',
  sgpc: 'SGPC or recognised Sikh organisation',
  local_organization: 'Local Sikh organisation',
  government: 'Reliable local / government source',
  mapping: 'Verified mapping information',
  open_data: 'Open data (Wikidata / Wikipedia)',
  community: 'Community submission',
  other: 'Other',
};
export const SOURCE_TYPE_KEYS = Object.keys(SOURCE_TYPES);

/** Quick-access suggestions on the search page (the full list always comes from the database). */
export const QUICK_COUNTRY_CODES = ['IN', 'CA', 'GB', 'US', 'AU', 'MY'];

export const PAGE_SIZES = [20, 50];

/** Common spellings of the same word, so a search for one finds the others. */
export const SEARCH_VARIANTS = [
  ['gurdwara', 'gurudwara', 'gurdwaara', 'gurudwaara', 'gurduara', 'gurdawara'],
  ['sri', 'shri', 'shree'],
  ['sahib', 'saheb', 'sahab'],
];

/* ---------- normalizers (duplicate detection) */
const NAME_NOISE = /\b(gurdwara|gurudwara|gurudwaara|gurduara|sri|shri|shree|sahib|saheb|ji|the|of)\b/g;

/** "Gurdwara Sri Guru Singh Sabha Sahib (Raipur)" → "guru singh sabha raipur" */
export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9਀-੿\s]/g, ' ')
    .replace(NAME_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function phoneDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 7 ? d.slice(-10) : '';
}
/** Hosts shared by many unrelated sites: compare host + first path segment there (facebook.com/gurdwarax). */
const SHARED_HOSTS = new Set(['facebook.com', 'm.facebook.com', 'fb.com', 'instagram.com', 'sites.google.com', 'google.com', 'maps.google.com',
  'linktr.ee', 'youtube.com', 'twitter.com', 'x.com', 'wordpress.com', 'blogspot.com', 'wixsite.com', 'tiktok.com', 'linkedin.com']);
export function websiteHost(url) {
  try {
    const u = new URL(String(url || '').trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (!SHARED_HOSTS.has(host) && !/\.(wixsite|wordpress|blogspot)\.com$/.test(host)) return host;
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first ? `${host}/${first.toLowerCase()}` : '';
  } catch { return ''; }
}

/** Great-circle distance in km. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined || Number.isNaN(Number(v)))) return null;
  const R = 6371;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* ---------- validation of an editable record */
const URL_RE = /^https?:\/\/[^\s]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);

/**
 * Cleans a record from a form, import row or submission.
 * Returns { data, errors }. Location is given by names (country by code or name).
 */
export function validateGurdwara(input, { requireLocation = true } = {}) {
  const errors = {};
  const data = {
    name: s(input.name, 200),
    official_name: s(input.official_name ?? input.officialName, 300),
    also_known_as: s(input.also_known_as ?? input.alsoKnownAs, 300),
    country: s(input.country, 100),
    state: s(input.state, 100),
    city: s(input.city, 100),
    district: s(input.district, 100),
    address: s(input.address, 500),
    postal_code: s(input.postal_code ?? input.postalCode, 30),
    phone: s(input.phone, 60),
    email: s(input.email, 200),
    website: s(input.website, 300),
    description: s(input.description, 10000),
    programs: s(input.programs, 3000),
    opening_hours: s(input.opening_hours ?? input.openingHours, 1000),
    management_organization: s(input.management_organization ?? input.managementOrganization, 300),
  };
  if (data.name.length < 3) errors.name = 'Enter the Gurdwara’s name';
  if (requireLocation) {
    if (!data.country) errors.country = 'Choose the country';
    if (!data.state) errors.state = 'Enter the state, province or region';
    if (!data.city) errors.city = 'Enter the city or town';
  }
  if (data.website && !URL_RE.test(data.website)) errors.website = 'Use a full link starting with https://';
  if (data.email && !EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address';

  const year = input.established_year ?? input.establishedYear;
  if (year !== undefined && year !== null && String(year).trim() !== '') {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1469 || y > new Date().getFullYear()) errors.established_year = 'Enter a year between 1469 and this year';
    else data.established_year = y;
  } else data.established_year = null;

  const lat = input.latitude, lng = input.longitude;
  const hasLat = lat !== undefined && lat !== null && String(lat).trim() !== '';
  const hasLng = lng !== undefined && lng !== null && String(lng).trim() !== '';
  if (hasLat || hasLng) {
    const la = Number(lat), lo = Number(lng);
    if (!hasLat || !hasLng || !Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
      errors.coordinates = 'Latitude must be −90 to 90 and longitude −180 to 180 (both or neither)';
    } else { data.latitude = Math.round(la * 1e6) / 1e6; data.longitude = Math.round(lo * 1e6) / 1e6; }
  } else { data.latitude = null; data.longitude = null; }

  const list = (v, allowed) => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[,;|]/)).map((x) => String(x).trim()).filter((x) => allowed.includes(x)))];
  const designation = String(input.designation ?? '').trim();
  data.designation = DESIGNATION_KEYS.includes(designation) ? designation : '';
  data.facilities = list(input.facilities, FACILITY_KEYS);
  data.services = list(input.services, SERVICE_KEYS);
  return { data, errors };
}
