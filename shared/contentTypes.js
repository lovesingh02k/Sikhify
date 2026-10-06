/* ==========================================================================
   Sikhify — shared/contentTypes.js
   The knowledge-platform directory: one schema per content type. The same
   definitions drive the admin editor, the "Submit / Update Information" form,
   the public directory pages and the API server's validation, so a field is
   added in exactly one place.

   Every record also has the common fields below (title, summary, body, image,
   sources) and the verification fields (status, source, references, last
   verified, last updated). Nothing here is content: records are created by
   admins or by approved community submissions.

   Field kinds: text · textarea · url · email · tel · date · time · number ·
   select (options) · boolean · list (one item per line) ·
   links ("Label | https://…" per line) · youtube (one YouTube URL per line)
   ========================================================================== */

export const VERIFICATION_STATUSES = ['pending', 'verified', 'needs_review', 'rejected'];
export const VERIFICATION_LABELS = { pending: 'Pending', verified: 'Verified', needs_review: 'Needs review', rejected: 'Rejected' };
export const PUBLISH_STATUSES = ['draft', 'published', 'archived'];

/** Fields every content type has. */
export const COMMON_FIELDS = [
  { name: 'title', label: 'Name / title', kind: 'text', required: true, max: 200 },
  { name: 'summary', label: 'Short summary', kind: 'textarea', max: 600, help: 'One or two sentences shown on cards and in search.' },
  { name: 'body', label: 'Full description', kind: 'textarea', max: 20000, rows: 8 },
  { name: 'image_url', label: 'Image URL', kind: 'url', help: 'Only use an image you have permission to publish.' },
];

const COUNTRY = { name: 'country', label: 'Country', kind: 'text', max: 80 };
const STATE = { name: 'state', label: 'State / province', kind: 'text', max: 80 };
const DISTRICT = { name: 'district', label: 'District', kind: 'text', max: 80 };
const CITY = { name: 'city', label: 'City / town', kind: 'text', max: 80 };
const MAP = { name: 'map_url', label: 'Map link', kind: 'url', help: 'A Google Maps / OpenStreetMap link to the exact place.' };
const WEBSITE = { name: 'website', label: 'Official website', kind: 'url' };
const VIDEOS = { name: 'videos', label: 'YouTube videos', kind: 'youtube', help: 'One YouTube link per line. Videos play inside Sikhify.' };

export const CONTENT_TYPES = {
  // Gurdwaras have their own relational module: the Global Gurdwara Directory
  // (server/routes/gurdwaras.js, /directory/gurdwaras). They are not a generic entry type.
  event: {
    label: 'Event', plural: 'Events', path: 'events', group: 'Community',
    description: 'Gurpurabs, Nagar Kirtans, Samagams, Kirtan Darbars and educational events.',
    sort: 'start_date',
    fields: [
      { name: 'event_type', label: 'Event type', kind: 'select', required: true, options: ['Gurpurab', 'Nagar Kirtan', 'Samagam', 'Kirtan Darbar', 'Akhand Paath', 'Amrit Sanchar', 'Conference', 'Educational event', 'Other'] },
      { name: 'start_date', label: 'Date', kind: 'date', required: true },
      { name: 'end_date', label: 'End date', kind: 'date' },
      { name: 'start_time', label: 'Time', kind: 'time' },
      { name: 'venue', label: 'Venue', kind: 'text', required: true, max: 200 },
      { name: 'organizer', label: 'Organizer', kind: 'text', max: 200 },
      { ...CITY, required: true }, COUNTRY, MAP,
      { name: 'contact', label: 'Contact', kind: 'text', max: 200 },
      { name: 'registration_url', label: 'Registration link', kind: 'url' },
      { name: 'livestream_url', label: 'Livestream link', kind: 'url' },
      { name: 'official_source', label: 'Official source', kind: 'url', required: true, help: 'Where this event was announced.' },
    ],
  },
  personality: {
    label: 'Personality', plural: 'Sikh Personalities', path: 'personalities', group: 'People',
    description: 'Historical personalities, Shaheeds, scholars, writers, artists and community figures.',
    fields: [
      { name: 'category', label: 'Category', kind: 'select', required: true, options: ['Historical personality', 'Shaheed', 'Sikh women', 'Scholar', 'Writer', 'Historian', 'Musician', 'Soldier', 'Scientist', 'Athlete', 'Artist', 'Entrepreneur', 'Social worker', 'Other'] },
      { name: 'born', label: 'Born', kind: 'text', max: 80 },
      { name: 'died', label: 'Died', kind: 'text', max: 80 },
      { name: 'era', label: 'Era', kind: 'text', max: 80 },
      { name: 'timeline', label: 'Timeline', kind: 'list', help: 'One entry per line, e.g. “1699 — …”.' },
      { name: 'contribution', label: 'Contribution', kind: 'textarea', max: 5000, rows: 4 },
      { name: 'books', label: 'Books', kind: 'list' },
      { name: 'related_people', label: 'Related people', kind: 'list' },
      VIDEOS,
    ],
  },
  organization: {
    label: 'Organization', plural: 'Organizations', path: 'organizations', group: 'Community',
    description: 'Sikh institutions, charities, educational bodies and community organizations.',
    fields: [
      { name: 'org_type', label: 'Type', kind: 'select', required: true, options: ['Religious', 'Charity / Seva', 'Educational', 'Advocacy', 'Cultural', 'Media', 'Other'] },
      COUNTRY, CITY, { ...WEBSITE, required: true },
      { name: 'founded', label: 'Founded', kind: 'text', max: 40 },
    ],
  },
  website: {
    label: 'Website', plural: 'Sikh Websites', path: 'websites', group: 'Resources',
    description: 'Useful Sikh websites — Gurbani, learning, history and community.',
    fields: [
      { name: 'url', label: 'Official URL', kind: 'url', required: true },
      { name: 'category', label: 'Category', kind: 'select', required: true, options: ['Gurbani', 'Learning', 'History', 'Kirtan & Katha', 'News', 'Community', 'Other'] },
      { name: 'language', label: 'Language', kind: 'text', max: 80 },
      COUNTRY,
    ],
  },
  app: {
    label: 'App', plural: 'Sikh Apps', path: 'apps', group: 'Resources',
    description: 'Apps for Gurbani, Nitnem, learning Gurmukhi and more.',
    fields: [
      { name: 'platform', label: 'Platform', kind: 'select', required: true, options: ['Android', 'iOS', 'Android & iOS', 'Web', 'Desktop'] },
      { name: 'category', label: 'Category', kind: 'select', required: true, options: ['Gurbani', 'Nitnem', 'Learning', 'Gurmukhi', 'Kirtan', 'Kids', 'Other'] },
      { name: 'store_url', label: 'Official store link', kind: 'url', required: true },
      WEBSITE,
    ],
  },
  book: {
    label: 'Book / research', plural: 'Books & Research', path: 'books', group: 'Resources',
    description: 'Books, research papers and Sikh Studies resources — linked to legitimate sources only.',
    fields: [
      { name: 'kind', label: 'Kind', kind: 'select', required: true, options: ['Book', 'Research paper', 'Thesis', 'Journal article'] },
      { name: 'authors', label: 'Author(s)', kind: 'text', required: true, max: 300 },
      { name: 'publisher', label: 'Publisher', kind: 'text', max: 200 },
      { name: 'year', label: 'Year', kind: 'text', max: 20 },
      { name: 'isbn', label: 'ISBN / DOI', kind: 'text', max: 60 },
      { name: 'subject', label: 'Subject', kind: 'select', options: ['Sikh Studies', 'History', 'Gurbani', 'Philosophy', 'Architecture', 'Diaspora', 'Language', 'Other'] },
      { name: 'language', label: 'Language', kind: 'text', max: 80 },
      { name: 'url', label: 'Where to find it', kind: 'url', help: 'Publisher, library or official page. Never upload copyrighted books.' },
    ],
  },
  heritage: {
    label: 'Heritage site', plural: 'Sikh Heritage', path: 'heritage', group: 'Places',
    description: 'Historical Gurdwaras, battle sites, forts, birthplaces, museums and monuments.',
    fields: [
      { name: 'site_type', label: 'Site type', kind: 'select', required: true, options: ['Historical Gurdwara', 'Battle site', 'Fort', 'Guru birthplace', 'Martyrdom site', 'Museum', 'Archive', 'Monument'] },
      COUNTRY, STATE, CITY, MAP,
      { name: 'period', label: 'Period', kind: 'text', max: 120 },
      { name: 'timeline', label: 'Timeline', kind: 'list' },
    ],
  },
  news: {
    label: 'News', plural: 'News', path: 'news', group: 'Community',
    description: 'Community news, Gurdwara announcements, institutional, heritage, education and research updates — always with a source.',
    sort: 'news_date',
    fields: [
      { name: 'category', label: 'Category', kind: 'select', required: true, options: ['Community news', 'Gurdwara announcement', 'Institutional update', 'Heritage', 'Education', 'Research'] },
      { name: 'news_date', label: 'Date', kind: 'date', required: true },
      { name: 'source_name', label: 'Source', kind: 'text', required: true, max: 200 },
      { name: 'source_url', label: 'Source link', kind: 'url', required: true },
      { name: 'author', label: 'Author', kind: 'text', max: 200 },
    ],
  },
  kids: {
    label: 'Kids resource', plural: 'Kids — Learn Sikhi', path: 'kids', group: 'Learn',
    description: 'Stories, Sakhis, Sikh heroes, values, Gurmukhi, quizzes and educational videos for children.',
    fields: [
      { name: 'kind', label: 'Kind', kind: 'select', required: true, options: ['Story', 'Sakhi', 'Guru', 'Sikh hero', 'Values', 'Gurmukhi', 'Quiz', 'Flashcards', 'Educational video'] },
      { name: 'age_group', label: 'Age group', kind: 'select', options: ['3–5', '6–8', '9–12', '13+'] },
      VIDEOS,
    ],
  },
};

export const CONTENT_TYPE_KEYS = Object.keys(CONTENT_TYPES);
export const TYPE_BY_PATH = Object.fromEntries(CONTENT_TYPE_KEYS.map((k) => [CONTENT_TYPES[k].path, k]));

/** All editable fields for a type: common + type-specific. */
export function fieldsFor(type) {
  const t = CONTENT_TYPES[type];
  return t ? [...COMMON_FIELDS, ...t.fields] : COMMON_FIELDS;
}

/* --------------------------------------------------------------------------
   Validation (used by the server; the browser runs it too for instant feedback)
   -------------------------------------------------------------------------- */
const URL_RE = /^https?:\/\/[^\s]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isHttpUrl(v) {
  if (typeof v !== 'string' || !URL_RE.test(v.trim())) return false;
  try { const u = new URL(v.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

/** "Label | https://…" lines → [{label, url}] (invalid URLs are reported by validate). */
export function parseLinks(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.lastIndexOf('|');
    const label = i === -1 ? '' : line.slice(0, i).trim();
    const url = (i === -1 ? line : line.slice(i + 1)).trim();
    return { label: label || url, url };
  });
}
export function parseList(text) {
  return Array.isArray(text) ? text.map((s) => String(s).trim()).filter(Boolean)
    : String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Cleans and validates `input` against the type's fields.
 * Returns { data, errors } — `data` holds only known fields, normalized:
 * lists → arrays, links → [{label,url}], booleans → true/false.
 * `getVideoId` is injected (shared/youtube.js) to keep this module standalone.
 */
export function validateContent(type, input, { getVideoId } = {}) {
  const errors = {};
  const data = {};
  if (!CONTENT_TYPES[type]) return { data, errors: { type: 'Unknown content type' } };
  for (const f of fieldsFor(type)) {
    let v = input ? input[f.name] : undefined;
    if (f.kind === 'boolean') { data[f.name] = !!v; continue; }
    if (f.kind === 'list' || f.kind === 'youtube') {
      const items = parseList(v);
      if (f.kind === 'youtube') {
        const ids = [];
        for (const item of items) {
          const id = getVideoId ? getVideoId(item) : null;
          if (!id) { errors[f.name] = `Not a YouTube video link: “${item.slice(0, 60)}”`; break; }
          if (!ids.includes(id)) ids.push(id);
        }
        if (ids.length) data[f.name] = ids;
      } else if (f.name === 'photos') {
        const bad = items.find((u) => !isHttpUrl(u));
        if (bad) errors[f.name] = 'Each line must be an http(s) image URL';
        else if (items.length) data[f.name] = items;
      } else if (items.length) data[f.name] = items.map((s) => s.slice(0, 500));
      if (f.required && !items.length) errors[f.name] = `${f.label} is required`;
      continue;
    }
    v = v === undefined || v === null ? '' : String(v).trim();
    if (!v) { if (f.required) errors[f.name] = `${f.label} is required`; continue; }
    if (f.max && v.length > f.max) { errors[f.name] = `${f.label} must be ${f.max} characters or fewer`; continue; }
    if (f.kind === 'url' && !isHttpUrl(v)) { errors[f.name] = `${f.label} must be a full http(s):// link`; continue; }
    if (f.kind === 'email' && !EMAIL_RE.test(v)) { errors[f.name] = 'Enter a valid email address'; continue; }
    if (f.kind === 'date' && !DATE_RE.test(v)) { errors[f.name] = 'Use the date picker (YYYY-MM-DD)'; continue; }
    if (f.kind === 'time' && !TIME_RE.test(v)) { errors[f.name] = 'Use HH:MM'; continue; }
    if (f.kind === 'number' && !Number.isFinite(Number(v))) { errors[f.name] = `${f.label} must be a number`; continue; }
    if (f.kind === 'select' && f.options && !f.options.includes(v)) { errors[f.name] = `Choose one of the listed options`; continue; }
    data[f.name] = f.kind === 'number' ? Number(v) : v;
  }
  return { data, errors };
}

/** Validates the verification block (sources/references). */
export function validateSources(input) {
  const errors = {};
  const source = String((input && input.source) || '').trim();
  const references = parseLinks(input && input.references);
  if (source.length > 300) errors.source = 'Source must be 300 characters or fewer';
  const bad = references.find((r) => !isHttpUrl(r.url));
  if (bad) errors.references = `Reference is not a valid http(s) link: “${bad.url.slice(0, 60)}”`;
  if (references.length > 30) errors.references = 'At most 30 references';
  return { source, references, errors };
}
