/* ==========================================================================
   Sikhify API — lib/observances.js
   Sikh Festivals & Important Days: row shapes, validation and writes, shared
   by the admin API (routes/festivals.js) and the importer
   (scripts/import-observances.js), so both apply exactly the same rules.
   ========================================================================== */
import crypto from 'node:crypto';
import { badRequest, str, int, oneOf } from './http.js';
import { slugify } from './util.js';
import { CONTENT_TYPES } from '../../../shared/contentTypes.js';
import {
  SCHEDULE_TYPES, CALENDAR_TYPES, CATEGORIES, DESTINATION_TYPES, GURU_IDS, MAX_SPAN_DAYS, MAX_ADVANCE_DAYS,
  isIsoDate, daysBetween, yearOf, isInternalPath, isExternalUrl, destinationError,
} from '../../../shared/festivals.js';

export const TYPE_PATHS = Object.values(CONTENT_TYPES).map((t) => t.path);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;
const isImageUrl = (v) => isExternalUrl(v) || /^\/uploads\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp|gif)$/i.test(v);
const bool = (v) => v === true || v === 1 || v === '1' || v === 'true';

/* ---------- row ↔ shape */
export function dateShape(r) {
  return {
    id: r.id, startDate: r.start_date, endDate: r.end_date, year: yearOf(r.start_date), verification: r.verification,
    sourceName: r.source_name, sourceUrl: r.source_url, notes: r.notes,
    verifiedBy: r.verified_by_name || null, verifiedAt: r.verified_at,
  };
}
export function observanceShape(r, dates) {
  return {
    id: r.id, slug: r.slug, title: r.title, category: r.category, summary: r.summary, description: r.description, significance: r.significance,
    scheduleType: r.schedule_type, calendarType: r.calendar_type,
    fixedMonth: r.fixed_month, fixedDay: r.fixed_day, durationDays: r.duration_days,
    ruleVerified: !!r.rule_verified, ruleSourceName: r.rule_source_name, ruleSourceUrl: r.rule_source_url, ruleNotes: r.rule_notes,
    imageUrl: r.image_url, relatedGuru: r.related_guru, relatedTopic: r.related_topic,
    destinationType: r.destination_type, destinationPath: r.destination_path, destinationUrl: r.destination_url,
    status: r.status, showOnHome: !!r.show_on_home, featured: !!r.featured, priority: r.priority, advanceDays: r.advance_days,
    createdAt: r.created_at, updatedAt: r.updated_at, publishedAt: r.published_at,
    dates,
  };
}

/* ---------- validation (the admin editor's rules) */

/** Cleans an observance (camelCase input, optionally over `existing`); returns { out, fields }. */
export function cleanObservance(body, existing) {
  const src = { ...(existing || {}), ...body };
  const fields = {};
  const out = {};
  out.title = str(src.title, { max: 140 });
  if (!out.title) fields.title = 'Enter the name of the observance';
  out.slug = str(src.slug, { max: 120 }).toLowerCase() || slugify(out.title, 100);
  if (!SLUG_RE.test(out.slug)) fields.slug = 'Use lowercase letters, numbers and hyphens';
  out.category = oneOf(src.category, Object.keys(CATEGORIES), 'other');
  out.summary = str(src.summary, { max: 280 });
  out.description = str(src.description, { max: 20000 }).replace(/\r\n/g, '\n');
  out.significance = str(src.significance, { max: 20000 }).replace(/\r\n/g, '\n');
  out.scheduleType = oneOf(src.scheduleType, Object.keys(SCHEDULE_TYPES));
  if (!out.scheduleType) fields.scheduleType = 'Choose how this observance is scheduled';
  out.calendarType = oneOf(src.calendarType, Object.keys(CALENDAR_TYPES));
  if (!out.calendarType) fields.calendarType = 'Choose the calendar';

  out.durationDays = int(src.durationDays, { fallback: NaN });
  if (!(out.durationDays >= 1 && out.durationDays <= MAX_SPAN_DAYS)) { fields.durationDays = `Between 1 and ${MAX_SPAN_DAYS} days`; out.durationDays = 1; }
  out.fixedMonth = null; out.fixedDay = null;
  if (out.scheduleType === 'annual_fixed') {
    out.fixedMonth = int(src.fixedMonth, { fallback: NaN });
    out.fixedDay = int(src.fixedDay, { fallback: NaN });
    // 2024 is a leap year, so 29 February is allowed (it occurs only in leap years).
    if (!(out.fixedMonth >= 1 && out.fixedMonth <= 12) || !isIsoDate(`2024-${String(out.fixedMonth).padStart(2, '0')}-${String(out.fixedDay).padStart(2, '0')}`)) {
      fields.fixedDay = 'Choose a valid day and month';
    }
  }
  out.ruleVerified = bool(src.ruleVerified);
  out.ruleSourceName = str(src.ruleSourceName, { max: 200 });
  out.ruleSourceUrl = str(src.ruleSourceUrl, { max: 500 });
  out.ruleNotes = str(src.ruleNotes, { max: 2000 });
  if (out.ruleSourceUrl && !isExternalUrl(out.ruleSourceUrl)) fields.ruleSourceUrl = 'Must be a full http(s):// link';
  if (out.scheduleType === 'annual_fixed' && out.ruleVerified && !out.ruleSourceName && !out.ruleSourceUrl) {
    fields.ruleSourceName = 'Name the source you checked before marking the date verified';
  }

  out.imageUrl = str(src.imageUrl, { max: 500 });
  if (out.imageUrl && !isImageUrl(out.imageUrl)) fields.imageUrl = 'Use an uploaded image or a full http(s):// image link';
  out.relatedGuru = str(src.relatedGuru, { max: 60 });
  if (out.relatedGuru && !GURU_IDS.includes(out.relatedGuru)) fields.relatedGuru = 'Choose one of the Ten Gurus';
  out.relatedTopic = str(src.relatedTopic, { max: 300 });
  if (out.relatedTopic && !isInternalPath(out.relatedTopic, TYPE_PATHS)) fields.relatedTopic = 'Pick a Sikhify page (e.g. /sikh-history#event=…)';

  out.destinationType = oneOf(src.destinationType, Object.keys(DESTINATION_TYPES), 'detail');
  out.destinationPath = str(src.destinationPath, { max: 300 });
  out.destinationUrl = str(src.destinationUrl, { max: 500 });
  const dErr = destinationError(out, TYPE_PATHS);
  if (dErr) fields[out.destinationType === 'external' ? 'destinationUrl' : 'destinationPath'] = dErr;

  out.showOnHome = src.showOnHome === undefined ? true : bool(src.showOnHome);
  out.featured = bool(src.featured);
  out.priority = int(src.priority, { min: -100, max: 100, fallback: 0 });
  out.advanceDays = int(src.advanceDays, { fallback: NaN });
  if (!(out.advanceDays >= 0 && out.advanceDays <= MAX_ADVANCE_DAYS)) { fields.advanceDays = `Between 0 and ${MAX_ADVANCE_DAYS} days`; out.advanceDays = 30; }

  out.dates = null;
  if (Array.isArray(body.dates)) {
    if (body.dates.length > 60) fields.dates = 'Too many dates';
    const seen = new Set();
    out.dates = body.dates.slice(0, 60).map((d, i) => {
      const row = {
        id: int(d && d.id, { fallback: null }),
        startDate: str(d && d.startDate, { max: 10 }),
        endDate: str(d && d.endDate, { max: 10 }),
        verification: oneOf(d && d.verification, ['unverified', 'verified'], 'unverified'),
        sourceName: str(d && d.sourceName, { max: 200 }),
        sourceUrl: str(d && d.sourceUrl, { max: 500 }),
        notes: str(d && d.notes, { max: 2000 }),
      };
      const key = `dates.${i}`;
      if (!isIsoDate(row.startDate)) fields[`${key}.startDate`] = 'Choose a valid date';
      else {
        if (!row.endDate) row.endDate = row.startDate;
        if (!isIsoDate(row.endDate) || row.endDate < row.startDate) fields[`${key}.endDate`] = 'The end date must be on or after the start date';
        else if (daysBetween(row.startDate, row.endDate) + 1 > MAX_SPAN_DAYS) fields[`${key}.endDate`] = `At most ${MAX_SPAN_DAYS} days`;
        if (seen.has(row.startDate)) fields[`${key}.startDate`] = 'This date is listed twice';
        seen.add(row.startDate);
      }
      if (row.sourceUrl && !isExternalUrl(row.sourceUrl)) fields[`${key}.sourceUrl`] = 'Must be a full http(s):// link';
      if (row.verification === 'verified' && !row.sourceName && !row.sourceUrl) fields[`${key}.sourceName`] = 'Name the source you checked before marking this date verified';
      return row;
    });
    if (out.scheduleType === 'one_time' && out.dates.length > 1) fields.dates = 'A one-time observance has a single date (it may span several days)';
  }
  return { out, fields };
}

/** Field errors that block publishing (empty when publishable). */
export function publishErrors(o, dateCount) {
  const fields = {};
  if (!o.summary) fields.summary = 'A short description is required to publish';
  const dErr = destinationError(o, TYPE_PATHS);
  if (dErr) fields[o.destinationType === 'external' ? 'destinationUrl' : 'destinationPath'] = dErr;
  if (o.scheduleType !== 'annual_fixed' && !dateCount) fields.dates = 'Add at least one date to publish';
  return fields;
}

export const failOn = (fields, message = 'Please fix the highlighted fields') => { if (Object.keys(fields).length) throw badRequest(message, fields); };

/* ---------- writes */
export const COLUMNS = ['slug', 'title', 'category', 'summary', 'description', 'significance', 'schedule_type', 'calendar_type', 'fixed_month', 'fixed_day', 'duration_days',
  'rule_verified', 'rule_source_name', 'rule_source_url', 'rule_notes', 'image_url', 'related_guru', 'related_topic',
  'destination_type', 'destination_path', 'destination_url', 'show_on_home', 'featured', 'priority', 'advance_days'];
export const columnValues = (o) => [o.slug, o.title, o.category, o.summary, o.description, o.significance, o.scheduleType, o.calendarType, o.fixedMonth, o.fixedDay, o.durationDays,
  o.ruleVerified ? 1 : 0, o.ruleSourceName, o.ruleSourceUrl, o.ruleNotes, o.imageUrl, o.relatedGuru, o.relatedTopic,
  o.destinationType, o.destinationPath, o.destinationUrl, o.showOnHome ? 1 : 0, o.featured ? 1 : 0, o.priority, o.advanceDays];

/**
 * A fingerprint of an observance's editable content (not its dates or status).
 * The importer stores it; if a record's current fingerprint differs, an admin has edited it.
 */
export function contentHash(o) {
  return crypto.createHash('sha256').update(JSON.stringify(columnValues(o))).digest('hex').slice(0, 32);
}

/**
 * Replaces an observance's date rows with `rows` (rows with an id update, rows
 * without are inserted, missing ones are deleted). Who verified a date, and
 * when, is recorded as it becomes verified and cleared when it no longer is.
 */
export function writeDates(db, id, rows, user) {
  const existing = new Map(db.prepare('SELECT * FROM observance_dates WHERE observance_id = ?').all(id).map((r) => [r.id, r]));
  const keep = new Set();
  const now = new Date().toISOString();
  // Delete removed rows first, so a date can move between rows without tripping the unique index.
  for (const r of rows) if (r.id && existing.has(r.id)) keep.add(r.id);
  for (const rid of existing.keys()) if (!keep.has(rid)) db.prepare('DELETE FROM observance_dates WHERE id = ?').run(rid);
  for (const r of rows) {
    const prev = r.id && existing.get(r.id);
    const becameVerified = r.verification === 'verified' && (!prev || prev.verification !== 'verified');
    const verifiedBy = r.verification === 'verified' ? (becameVerified ? (user ? user.id : null) : prev.verified_by) : null;
    const verifiedAt = r.verification === 'verified' ? (becameVerified ? now : prev.verified_at) : null;
    if (prev) {
      db.prepare(`UPDATE observance_dates SET start_date = ?, end_date = ?, verification = ?, source_name = ?, source_url = ?, notes = ?,
        verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?`)
        .run(r.startDate, r.endDate, r.verification, r.sourceName, r.sourceUrl, r.notes, verifiedBy, verifiedAt, now, r.id);
    } else {
      db.prepare(`INSERT INTO observance_dates (observance_id, start_date, end_date, verification, source_name, source_url, notes, verified_by, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, r.startDate, r.endDate, r.verification, r.sourceName, r.sourceUrl, r.notes, verifiedBy, verifiedAt);
    }
  }
}
