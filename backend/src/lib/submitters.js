/* ==========================================================================
   Sikhify API — lib/submitters.js
   Who is sending a public submission ("Submit / Update Information" and
   "Suggest a Gurdwara"), shared by both routes.

   • Signed-in members submit as themselves (suspended accounts cannot).
   • Visitors without an account may submit too. They can leave a name and an
     email for follow-up (both optional); nothing is invented for them, and the
     row's submitter_id stays NULL. Their raw IP address is never stored — it is
     used only for rate limits and, hashed, inside the duplicate fingerprint.
   • A hidden "honeypot" field that people never see catches simple bots: the
     route answers as if it worked but stores nothing.
   • The same submission sent again within a day (same person or address, same
     content) is refused with the reference of the first one.
   • Every stored submission gets a short reference (e.g. S-7K2M9Q) to quote.
   Nothing here publishes anything: every submission waits for review.
   ========================================================================== */
import crypto from 'node:crypto';
import { HttpError, badRequest, str } from './http.js';
import { can } from '../../../shared/roles.js';

const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I — easy to read out
export const HONEYPOT_FIELD = 'company_website';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function newReference(prefix) {
  const bytes = crypto.randomBytes(6);
  return `${prefix}-${[...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('')}`;
}

/** Stable hash of what was submitted and by whom (normalised: case, spacing). */
export function fingerprint(identity, parts) {
  const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(identity + '\n' + parts.map(norm).join('\n')).digest('hex');
}

/**
 * Decides who is submitting and checks the matching limits.
 *
 * Only SAVED submissions count towards the submission limits: the limits are checked here (peek) and
 * counted by `commit()`, which the route calls after the row is stored. A form sent back with a
 * validation error never uses up a submission. A separate, generous per-address limit on attempts
 * (`rate('guestAttempt')`) still stops floods of junk requests.
 * @returns {{ userId: number|null, guestName: string, guestEmail: string, identity: string, spam: boolean, commit: () => void }}
 */
export function resolveSubmitter(c, { rate, settings, limits }) {
  if (!settings.get('submissions_open')) throw new HttpError(403, 'Submissions are paused right now. Please try again later.');
  const spam = !!str(c.body[HONEYPOT_FIELD], { max: 200 });
  const counters = [];
  const check = (name, key) => {
    const r = limits[name].peek(key);
    if (!r.ok) throw new HttpError(429, `You have sent the most submissions allowed for now — thank you! Please try again in ${Math.max(1, Math.ceil(r.retryAfter / 60))} minute(s).`);
    counters.push([name, key]);
  };
  const commit = () => { for (const [name, key] of counters) limits[name].hit(key); };
  if (c.user) {
    const user = c.require('submission.create');
    // Staff who review submissions are never limited (they often enter many corrections at once).
    if (!can(user, 'submission.review')) check('submission', 'submission:' + user.id);
    return { userId: user.id, guestName: '', guestEmail: '', identity: 'user:' + user.id, spam, commit };
  }
  rate('guestAttempt', 'guest-attempt:' + c.ip);
  check('guestSubmission', 'guest-submission:' + c.ip);
  check('guestSubmissionDaily', 'guest-submission-day:' + c.ip);
  const guestName = str(c.body.guestName, { max: 80 });
  const guestEmail = str(c.body.guestEmail, { max: 200 }).toLowerCase();
  if (guestEmail && !EMAIL_RE.test(guestEmail)) throw badRequest('Please fix the highlighted fields', { guestEmail: 'That email address doesn’t look right — or leave it empty' });
  const ipHash = crypto.createHash('sha256').update('sikhify-guest:' + c.ip).digest('hex').slice(0, 32);
  return { userId: null, guestName, guestEmail, identity: 'guest:' + ipHash, spam, commit };
}

/** Refuses a submission identical to one the same submitter sent in the last 24 hours. */
export function rejectDuplicate(db, table, fp) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const prev = db.prepare(`SELECT reference FROM ${table} WHERE fingerprint = ? AND created_at >= ? ORDER BY id DESC LIMIT 1`).get(fp, since);
  if (prev) {
    throw new HttpError(409, `You already sent this${prev.reference ? ` (reference ${prev.reference})` : ''}. It is waiting for review — there is no need to send it again.`, { code: 'duplicate_submission' });
  }
}
