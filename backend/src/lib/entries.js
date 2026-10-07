/* ==========================================================================
   Sikhify API — lib/entries.js
   Turns knowledge-directory input into `entries` table columns. Used by the
   admin/submission routes (routes/entries.js) and the seed importer
   (scripts/import-directory.js), so every record — typed in the admin, sent
   by the community or loaded from a seed file — passes the same validation
   from shared/contentTypes.js.
   ========================================================================== */
import { HttpError, badRequest } from './http.js';
import { parseJson } from '../db/database.js';
import { CONTENT_TYPES, validateContent, validateSources } from '../../../shared/contentTypes.js';
import { getYouTubeVideoId } from '../../../shared/youtube.js';

const categoryFieldOf = (type) => (CONTENT_TYPES[type].fields.find((f) => f.kind === 'select') || {}).name;
const COMMON = ['title', 'summary', 'body', 'image_url'];

/** Validates input for `type`; returns column values. Throws 422 with field errors. */
export function cleanEntry(type, input) {
  const { data, errors } = validateContent(type, input, { getVideoId: getYouTubeVideoId });
  const src = validateSources(input);
  Object.assign(errors, src.errors);
  if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields', errors);
  const fields = {};
  for (const [k, v] of Object.entries(data)) if (!COMMON.includes(k)) fields[k] = v;
  const t = CONTENT_TYPES[type];
  return {
    title: data.title, summary: data.summary || '', body: data.body || '', image_url: data.image_url || '',
    data: JSON.stringify(fields),
    country: fields.country || '', state: fields.state || '', district: fields.district || '', city: fields.city || '',
    category: fields[categoryFieldOf(type)] || '',
    sort_date: t.sort ? fields[t.sort] || '' : '',
    source: src.source, references_json: JSON.stringify(src.references),
  };
}

/** Nothing is published without a source or reference, and never once rejected. */
export function assertPublishable(row) {
  const refs = parseJson(row.references_json, []);
  if (!row.source && !refs.length) throw badRequest('Add a source or at least one reference before publishing', { source: 'Required to publish' });
  if (row.verification_status === 'rejected') throw new HttpError(409, 'Rejected records cannot be published');
}
