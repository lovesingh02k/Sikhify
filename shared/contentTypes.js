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
  { name: 'image_url', label: 'Image URL', kind: 'url', upload: true, help: 'A direct https:// link to the image file itself (not a Google Drive, Google Photos, Instagram or Facebook page). Only use an image you have permission to publish.' },
  { name: 'image_credit', label: 'Image credit', kind: 'text', max: 300, help: 'Who made the image and its licence, e.g. “Photo: A. Singh, CC BY-SA 4.0, via Wikimedia Commons”.' },
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
  // (backend/src/routes/gurdwaras.js, /directory/gurdwaras). They are not a generic entry type.
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
  blog: {
    label: 'Blog post', plural: 'Blog', path: 'blog', group: 'Learn', ownContent: true,
    description: 'Articles on Sikhism, lifestyle, spirituality, history and more.',
    sort: 'published_date',
    fields: [
      { name: 'category', label: 'Category', kind: 'select', required: true, options: ['Sikhism', 'Spirituality', 'History', 'Lifestyle', 'Gurbani', 'Community', 'Other'] },
      { name: 'published_date', label: 'Published on', kind: 'date', required: true },
      { name: 'author', label: 'Author', kind: 'text', required: true, max: 200 },
      { name: 'reading_time', label: 'Reading time (minutes)', kind: 'number' },
      { name: 'tags', label: 'Tags', kind: 'list', help: 'One tag per line.' },
      VIDEOS,
    ],
  },
  // Files Sikhify shares (kept on Google Drive or similar): the record holds the link, not the file.
  download: {
    label: 'Download', plural: 'Downloads', path: 'downloads', group: 'Resources', ownContent: true,
    description: 'Free resources to download — wallpapers, Gutkas and Banis, calendars, posters and activities for children.',
    fields: [
      { name: 'category', label: 'Category', kind: 'select', custom: true, required: true, options: ['Wallpapers', 'Gutkas & Banis', 'Books', 'Calendars', 'Posters', 'Kids activities', 'Audio', 'Other'],
        help: 'Pick one, or choose “+ New category…” to make your own.' },
      { name: 'drive_url', label: 'Download link', kind: 'url', required: true, help: 'Your Google Drive (or other) link. In Drive, set sharing to “Anyone with the link”.' },
      { name: 'file_type', label: 'File type', kind: 'select', options: ['PDF', 'Image', 'Audio', 'Video', 'ZIP', 'Document', 'Other'] },
      { name: 'file_size', label: 'File size', kind: 'text', max: 40, help: 'e.g. “2.4 MB”.' },
      { name: 'language', label: 'Language', kind: 'text', max: 80 },
    ],
  },
  // The Sikh Store: orders are taken on WhatsApp (shared/store.js). Its group is not a directory group,
  // so products stay out of the directory hub.
  product: {
    label: 'Product', plural: 'Sikh Store', path: 'sikh-store', group: 'Store', ownContent: true,
    description: 'Kara, Gutka Sahib, Khanda pendants and more. Choose a product and order directly on WhatsApp.',
    fields: [
      { name: 'category', label: 'Category', kind: 'select', custom: true, required: true, options: ['Kara', 'Gutka Sahib & Books', 'Khanda & Pendants', 'Dastar & Clothing', 'Home & Gifts', 'Kids', 'Other'],
        help: 'Pick one, or choose “+ New category…” to make your own.' },
      { name: 'price', label: 'Price (₹)', kind: 'number', required: true, min: 0 },
      { name: 'availability', label: 'Availability', kind: 'select', required: true, options: ['In stock', 'Out of stock'] },
      { name: 'mrp', label: 'MRP before discount (₹)', kind: 'number', min: 0, help: 'Optional. Shown crossed out when it is higher than the price.' },
      { name: 'variants', label: 'Sizes / options', kind: 'list', help: 'The buyer picks one, e.g. “Small”, “Medium”.' },
      // Filled by the upload buttons in the admin editor (not shown as a text field).
      { name: 'photos', label: 'Photos', kind: 'list', upload: 'photos' },
    ],
  },
  kids: {
    label: 'Kids resource', plural: 'Kids — Learn Sikhi', path: 'kids', group: 'Learn',
    description: 'Stories, Sakhis, Sikh heroes, values, Gurmukhi, quizzes and educational videos for children.',
    fields: [
      { name: 'kind', label: 'Kind', kind: 'select', required: true, options: ['Story', 'Sakhi', 'Guru', 'Sikh hero', 'Values', 'Gurmukhi', 'Quiz', 'Flashcards', 'Educational video', 'Colouring page', 'Picture / printable'] },
      { name: 'age_group', label: 'Age group', kind: 'select', options: ['3–5', '6–8', '9–12', '13+'] },
      VIDEOS,
      // Filled by the upload buttons in the admin editor (not shown as text fields).
      { name: 'photos', label: 'Photos', kind: 'list', upload: 'photos' },
      { name: 'video_files', label: 'Uploaded videos', kind: 'list', upload: 'videos' },
      { name: 'downloadable', label: 'Let visitors download the pictures', kind: 'boolean', upload: 'option' },
      { name: 'quiz', label: 'Quiz questions', kind: 'quiz', help: 'Built with the quiz builder when Kind is “Quiz”.' },
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
/** An image uploaded to Sikhify (routes/uploads.js names files YYYY/MM/<random hex>.<ext>). */
export const UPLOAD_PATH_RE = /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(?:webp|jpg|png|gif)$/;
/** A video uploaded to Sikhify's Vercel Blob store (routes/uploads.js names it videos/YYYY/MM/<random hex>.<ext>). */
export const VIDEO_URL_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/videos\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(?:mp4|webm|mov)$/;
export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isHttpUrl(v) {
  if (typeof v !== 'string' || !URL_RE.test(v.trim())) return false;
  try { const u = new URL(v.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

/** Sites whose share links open a page, not the picture, so they never show as an image. */
const PAGE_HOSTS = /(^|\.)(drive\.google\.com|photos\.google\.com|photos\.app\.goo\.gl|instagram\.com|facebook\.com|fb\.com|fb\.watch|whatsapp\.com|wa\.me)$/i;

/** Why a pasted image link would not show on the site ('' when it is fine). */
export function imageLinkProblem(url) {
  let u;
  try { u = new URL(String(url).trim()); } catch { return ''; }
  // The site only loads secure images: an http:// picture is blocked by the browser.
  if (u.protocol === 'http:') return 'Use an https:// image link, or upload the photo';
  if (PAGE_HOSTS.test(u.hostname)) return 'This link opens a page, not the image file. Upload the photo instead';
  return '';
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
export const QUIZ_LIMITS = { questions: 30, options: 4, question: 300, option: 150 };

/**
 * Quiz questions from the admin quiz builder: [{ question, options: [2–4], answer: index }].
 * Accepts the array or its JSON text. Returns { questions } or { error } (a message for the form).
 */
export function parseQuiz(value) {
  let list = value;
  if (typeof list === 'string') {
    if (!list.trim()) return { questions: [] };
    try { list = JSON.parse(list); } catch { return { error: 'The quiz could not be read — please add the questions again' }; }
  }
  if (list === undefined || list === null) return { questions: [] };
  if (!Array.isArray(list)) return { error: 'The quiz could not be read — please add the questions again' };
  if (list.length > QUIZ_LIMITS.questions) return { error: `A quiz can have at most ${QUIZ_LIMITS.questions} questions` };
  const questions = [];
  for (const [i, raw] of list.entries()) {
    const n = i + 1;
    const question = String((raw && raw.question) || '').trim();
    // Empty answer boxes are dropped; the right answer keeps pointing at the same text.
    const typed = (Array.isArray(raw && raw.options) ? raw.options : []).map((o) => String(o || '').trim());
    const options = typed.filter(Boolean);
    const picked = Number(raw && raw.answer);
    const answer = Number.isInteger(picked) && typed[picked] ? typed.slice(0, picked).filter(Boolean).length : -1;
    if (!question) return { error: `Question ${n}: write the question` };
    if (question.length > QUIZ_LIMITS.question) return { error: `Question ${n} is too long (${QUIZ_LIMITS.question} characters at most)` };
    if (options.length < 2) return { error: `Question ${n}: add at least two answers` };
    if (options.length > QUIZ_LIMITS.options) return { error: `Question ${n}: at most ${QUIZ_LIMITS.options} answers` };
    if (options.some((o) => o.length > QUIZ_LIMITS.option)) return { error: `Question ${n}: an answer is too long (${QUIZ_LIMITS.option} characters at most)` };
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return { error: `Question ${n}: choose the right answer` };
    questions.push({ question, options, answer });
  }
  return { questions };
}

export function validateContent(type, input, { getVideoId } = {}) {
  const errors = {};
  const data = {};
  if (!CONTENT_TYPES[type]) return { data, errors: { type: 'Unknown content type' } };
  for (const f of fieldsFor(type)) {
    let v = input ? input[f.name] : undefined;
    if (f.kind === 'boolean') { data[f.name] = !!v; continue; }
    if (f.kind === 'quiz') {
      const { questions, error } = parseQuiz(v);
      if (error) errors[f.name] = error;
      else if (questions.length) data[f.name] = questions;
      continue;
    }
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
        const bad = items.find((u) => !isHttpUrl(u) && !UPLOAD_PATH_RE.test(u));
        if (bad) errors[f.name] = 'Each line must be an http(s) image URL';
        else if (items.length) data[f.name] = items;
      } else if (f.upload === 'videos') {
        const bad = items.find((u) => !VIDEO_URL_RE.test(u));
        if (bad) errors[f.name] = 'Upload videos with the Upload video button';
        else if (items.length) data[f.name] = items;
      } else if (items.length) data[f.name] = items.map((s) => s.slice(0, 500));
      if (f.required && !items.length) errors[f.name] = `${f.label} is required`;
      continue;
    }
    v = v === undefined || v === null ? '' : String(v).trim();
    if (!v) { if (f.required) errors[f.name] = `${f.label} is required`; continue; }
    if (f.max && v.length > f.max) { errors[f.name] = `${f.label} must be ${f.max} characters or fewer`; continue; }
    if (f.kind === 'url' && !isHttpUrl(v) && !(f.upload && UPLOAD_PATH_RE.test(v))) { errors[f.name] = `${f.label} must be a full http(s):// link`; continue; }
    if (f.name === 'image_url' && !UPLOAD_PATH_RE.test(v)) {
      const problem = imageLinkProblem(v);
      if (problem) { errors[f.name] = problem; continue; }
    }
    if (f.kind === 'email' && !EMAIL_RE.test(v)) { errors[f.name] = 'Enter a valid email address'; continue; }
    if (f.kind === 'date' && !DATE_RE.test(v)) { errors[f.name] = 'Use the date picker (YYYY-MM-DD)'; continue; }
    if (f.kind === 'time' && !TIME_RE.test(v)) { errors[f.name] = 'Use HH:MM'; continue; }
    if (f.kind === 'number' && !Number.isFinite(Number(v))) { errors[f.name] = `${f.label} must be a number`; continue; }
    if (f.kind === 'number' && f.min !== undefined && Number(v) < f.min) { errors[f.name] = `${f.label} must be ${f.min} or more`; continue; }
    if (f.kind === 'select' && f.options && !f.custom && !f.options.includes(v)) { errors[f.name] = `Choose one of the listed options`; continue; }
    data[f.name] = f.kind === 'number' ? Number(v) : v;
  }
  if (data.kind === 'Quiz' && fieldsFor(type).some((f) => f.kind === 'quiz') && !data.quiz && !errors.quiz) errors.quiz = 'Add at least one question to the quiz';
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
