/* ==========================================================================
   Festival / important-day editor: details, scheduling and per-year verified
   dates, destination, homepage settings and a live preview of the homepage
   card (the same markup visitors get). Save as draft, publish, unpublish and
   (Master Admin) delete. The server re-validates everything.
   ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import ImagePicker from '../../components/community/ImagePicker.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, TextArea, Select, Checkbox, FormError } from '../../components/ui/Form.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { festivalCardHtml } from '../../utils/festivalCard.js';
import { formatDateTime, toast } from '../../utils/format.js';
import { gapLabel } from './FestivalsList.jsx';
import GURUS from '../../data/gurus.js';
import { CONTENT_TYPES } from '../../../../shared/contentTypes.js';
import {
  SCHEDULE_TYPES, CALENDAR_TYPES, CATEGORIES, DESTINATION_TYPES, todayIn, yearOf, cardOf, nextVerifiedOccurrence, occurrencesOf,
  verificationGaps, destinationError,
} from '../../../../shared/festivals.js';

const TYPE_PATHS = Object.values(CONTENT_TYPES).map((t) => t.path);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const opts = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));
const EMPTY = {
  title: '', slug: '', category: 'gurpurab', summary: '', description: '', significance: '', imageUrl: '',
  scheduleType: 'annual_verified', calendarType: 'nanakshahi', fixedMonth: '', fixedDay: '', durationDays: '1',
  ruleVerified: false, ruleSourceName: '', ruleSourceUrl: '', ruleNotes: '',
  relatedGuru: '', relatedTopic: '', destinationType: 'detail', destinationPath: '', destinationUrl: '',
  showOnHome: true, featured: false, priority: '0', advanceDays: '30', dates: [],
};
const blankDate = (startDate = '') => ({ startDate, endDate: '', verification: 'unverified', sourceName: '', sourceUrl: '', notes: '' });

function toForm(o) {
  const out = {};
  for (const k of Object.keys(EMPTY)) {
    const v = o[k];
    out[k] = typeof EMPTY[k] === 'boolean' ? !!v : Array.isArray(EMPTY[k]) ? (v || []).map((d) => ({ ...d })) : v === null || v === undefined ? '' : String(v);
  }
  return out;
}

/** Sikhify pages a card can open (searchable through the input's suggestions). */
function usePageOptions() {
  const [events, setEvents] = useState([]);
  useEffect(() => { import('../../data/history.js').then((m) => setEvents(m.history)).catch(() => {}); }, []);
  return useMemo(() => [
    ['/sikh-history', 'Sikh History'], ['/learn-sikhism', 'Learn Sikhism'], ['/gurbani', 'Gurbani'], ['/nitnem', 'Nitnem'], ['/hukamnama', 'Hukamnama'],
    ['/rehat-maryada', 'Rehat Maryada'], ['/faq', 'FAQ'], ['/sikh-media', 'Kirtan & Katha'], ['/gurus', 'The Ten Gurus'], ['/festivals', 'Festivals & Important Days'],
    ['/directory', 'Directory'], ['/directory/gurdwaras', 'Gurdwara Directory'],
    ...GURUS.map((g) => [`/gurus/${g.id}`, `Sri ${g.name}`]),
    ...Object.values(CONTENT_TYPES).map((t) => [`/${t.path}`, t.plural]),
    ...events.map((e) => [`/sikh-history#event=${e.id}`, `History · ${e.year} — ${e.title}`]),
  ], [events]);
}

export default function FestivalEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  usePageMeta(`${id ? 'Edit' : 'New'} observance — Sikhify Admin`, undefined, { noindex: true });
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [load, setLoad] = useState({ loading: !!id, error: null });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const [confirm, setConfirm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const pages = usePageOptions();
  const today = todayIn();

  const fetchRecord = () => adminService.festival(id).then((d) => {
    setRecord(d.observance);
    setForm(toForm(d.observance));
    setDirty(false);
    setLoad({ loading: false, error: null });
  }).catch((error) => setLoad({ loading: false, error }));
  useEffect(() => { if (id) fetchRecord(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const set = (k) => (e) => change({ [k]: e.target.value });
  const setDate = (i, patch) => change({ dates: form.dates.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const fe = state.fields;

  // The record as the shared rules see it (numbers instead of input strings), for the preview and live checks.
  const model = {
    ...form, slug: form.slug || 'preview', fixedMonth: Number(form.fixedMonth), fixedDay: Number(form.fixedDay), durationDays: Number(form.durationDays) || 1,
    priority: Number(form.priority) || 0, advanceDays: Number(form.advanceDays),
    dates: form.dates.filter((d) => d.startDate).map((d) => ({ ...d, endDate: d.endDate || d.startDate })),
  };
  const gaps = verificationGaps(model, today);
  const liveDestError = destinationError(model, TYPE_PATHS);
  const next = nextVerifiedOccurrence(model, today);
  const anyOcc = next || occurrencesOf(model, [yearOf(today), yearOf(today) + 1]).find((o) => o.end >= today);
  const preview = anyOcc ? festivalCardHtml(cardOf({ ...model, title: form.title || 'Untitled observance' }, anyOcc, today)) : '';

  async function save({ publish = false } = {}) {
    setState({ busy: true, error: null, fields: {} });
    try {
      let saved;
      if (id) {
        saved = await adminService.updateFestival(id, form);
        if (publish) saved = await adminService.setFestivalStatus(id, 'published');
      } else saved = await adminService.createFestival({ ...form, publish });
      toast(publish ? 'Published — it is now live' : 'Saved');
      setState({ busy: false, error: null, fields: {} });
      setDirty(false);
      if (!id) navigate(`/admin/festivals/${saved.id}`, { replace: true });
      else fetchRecord();
    } catch (err) { setState({ busy: false, error: err, fields: err.fields || {} }); }
  }
  async function unpublish() {
    setState({ busy: true, error: null, fields: {} });
    try {
      await adminService.setFestivalStatus(id, 'draft');
      toast('Unpublished — it no longer appears on the site');
      setState({ busy: false, error: null, fields: {} });
      fetchRecord();
    } catch (err) { setState({ busy: false, error: err, fields: err.fields || {} }); }
  }

  if (load.loading) return <Loading rows={3} />;
  if (load.error) return <ErrorState error={load.error} />;
  const status = record ? record.status : 'new';
  const nextYear = yearOf(today) + 1;

  return (
    <>
      <AdminHeader
        title={record ? record.title : 'New observance'}
        sub={record ? <><Pill value={record.status} /> · updated {formatDateTime(record.updatedAt)}{record.updatedBy ? ` by ${record.updatedBy}` : ''}{record.publishedAt ? ` · published ${formatDateTime(record.publishedAt)}` : ''}</> : 'Saved as a draft until you publish it.'}
        actions={<><Link className="sk-btn" to="/admin/festivals">All observances</Link>{status === 'published' ? <a className="sk-btn" href={record.external ? record.href : `/festivals/${record.slug}`} target="_blank" rel="noopener noreferrer">View live ↗</a> : null}</>} />

      <form className="sk-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <FormError error={state.error} />

        <section className="sk-card sk-form sk-step" aria-labelledby="basics-h">
          <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">1</span><div><h3 className="sk-step-title" id="basics-h">Name &amp; short description</h3><p className="sk-step-hint">This is what people see on the festival card.</p></div></header>
          <div className="sk-form-grid">
            <TextInput label="Name" required value={form.title} onChange={set('title')} error={fe.title} help="e.g. Parkash Purab of Sri Guru Nanak Dev Ji" />
            <Select label="Category" value={form.category} options={opts(CATEGORIES)} onChange={set('category')} />
          </div>
          <TextInput label="Short description" required maxLength={280} value={form.summary} onChange={set('summary')} error={fe.summary} help={`Shown on the card. ${280 - form.summary.length} characters left.`} />
          <details className="sk-step-more" open={!!(fe.slug || fe.imageUrl) || undefined}>
          <summary>More: full page text, picture, web address</summary>
          <div className="sk-stack mt-3" style={{ gap: '0.9rem' }}>
          <TextArea label="Full description" rows={5} value={form.description} onChange={set('description')} help="For the observance's own page. Leave a blank line between paragraphs." />
          <TextArea label="Historical significance" rows={5} value={form.significance} onChange={set('significance')} help="Only what reliable sources support." />
          <div>
            <ImagePicker value={form.imageUrl.startsWith('/uploads/') ? [form.imageUrl] : []} max={1} purpose="festival" label="Upload an image"
              onChange={(urls) => change({ imageUrl: urls[0] || '' })} />
            <TextInput label="…or an image link (optional)" type="url" value={form.imageUrl.startsWith('/uploads/') ? '' : form.imageUrl} onChange={set('imageUrl')} error={fe.imageUrl}
              help="Only images you have the right to use. Uploads are optimised automatically (resized and compressed, quality kept)." />
          </div>
          <TextInput label="Web address (slug)" value={form.slug} onChange={set('slug')} error={fe.slug} help={`Made from the name if left empty: /festivals/${form.slug || '…'}`} />
          </div>
          </details>
        </section>

        <section className="sk-card sk-form sk-step" aria-labelledby="when-h">
          <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">2</span><div><h3 className="sk-step-title" id="when-h">Date</h3><p className="sk-step-hint">Add the date and where you checked it. Only checked (verified) dates appear on the site.</p></div></header>
          <div className="sk-form-grid">
            <Select label="Scheduling" value={form.scheduleType} options={opts(SCHEDULE_TYPES)} onChange={set('scheduleType')} error={fe.scheduleType} />
            <Select label="Calendar" value={form.calendarType} options={opts(CALENDAR_TYPES)} onChange={set('calendarType')} error={fe.calendarType} />
          </div>
          {form.scheduleType === 'annual_fixed' ? (
            <>
              <p className="sk-card-meta" style={{ marginTop: 0 }}>Use this only when the observance falls on the same Gregorian date every year in the calendar you follow. If the date moves, choose “date verified each year”.</p>
              <div className="sk-form-grid">
                <Select label="Month" value={form.fixedMonth} placeholder="Choose" options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={set('fixedMonth')} />
                <TextInput label="Day" type="number" min="1" max="31" value={form.fixedDay} onChange={set('fixedDay')} error={fe.fixedDay} />
                <TextInput label="Length (days)" type="number" min="1" max="60" value={form.durationDays} onChange={set('durationDays')} error={fe.durationDays} />
              </div>
              <Checkbox label="I have checked this fixed date against the source below" checked={form.ruleVerified} onChange={(v) => change({ ruleVerified: v })} help="Unverified dates are never shown on the site." />
              <div className="sk-form-grid">
                <TextInput label="Source" value={form.ruleSourceName} onChange={set('ruleSourceName')} error={fe.ruleSourceName} help="e.g. the calendar or announcement you checked" />
                <TextInput label="Source link" type="url" value={form.ruleSourceUrl} onChange={set('ruleSourceUrl')} error={fe.ruleSourceUrl} />
              </div>
              <TextArea label="Verification notes" rows={2} value={form.ruleNotes} onChange={set('ruleNotes')} />
            </>
          ) : (
            <>
              <p className="sk-card-meta" style={{ marginTop: 0 }}>
                {form.scheduleType === 'one_time' ? 'One date (it may span several days).' : 'Enter the date for each year once it has been announced or checked. Last year’s date is never reused.'}
              </p>
              {fe.dates ? <p className="sk-form-error" role="alert">{fe.dates}</p> : null}
              {form.dates.map((d, i) => (
                <fieldset key={d.id || `new-${i}`} className="sk-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <legend className="sk-form-label">{d.startDate ? `${yearOf(d.startDate)}` : 'New date'}{d.verifiedBy ? ` · verified by ${d.verifiedBy}` : ''}</legend>
                  <div className="sk-form-grid">
                    <TextInput label="Start date" type="date" required value={d.startDate} onChange={(e) => setDate(i, { startDate: e.target.value })} error={fe[`dates.${i}.startDate`]} />
                    <TextInput label="End date (if several days)" type="date" value={d.endDate === d.startDate ? '' : d.endDate} min={d.startDate || undefined} onChange={(e) => setDate(i, { endDate: e.target.value })} error={fe[`dates.${i}.endDate`]} />
                    <Select label="Verification" value={d.verification} options={[{ value: 'unverified', label: 'Not verified — hidden from the site' }, { value: 'verified', label: 'Verified against a source' }]} onChange={(e) => setDate(i, { verification: e.target.value })} />
                  </div>
                  <div className="sk-form-grid">
                    <TextInput label="Source" value={d.sourceName} onChange={(e) => setDate(i, { sourceName: e.target.value })} error={fe[`dates.${i}.sourceName`]} help="Required to mark the date verified" />
                    <TextInput label="Source link" type="url" value={d.sourceUrl} onChange={(e) => setDate(i, { sourceUrl: e.target.value })} error={fe[`dates.${i}.sourceUrl`]} />
                  </div>
                  <TextInput label="Notes" value={d.notes} onChange={(e) => setDate(i, { notes: e.target.value })} />
                  <button type="button" className="sk-link-btn" onClick={() => change({ dates: form.dates.filter((_, j) => j !== i) })}>Remove this date</button>
                </fieldset>
              ))}
              {form.scheduleType !== 'one_time' || !form.dates.length ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="sk-btn sk-btn-sm" onClick={() => change({ dates: [...form.dates, blankDate()] })}><Icon name="plus" size={14} />Add a date</button>
                  {form.scheduleType === 'annual_verified' && !form.dates.some((d) => d.startDate && yearOf(d.startDate) === nextYear) ? (
                    <button type="button" className="sk-btn sk-btn-sm" onClick={() => change({ dates: [...form.dates, blankDate(`${nextYear}-01-01`)] })}>Add the {nextYear} date</button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
          {gaps.length ? <p className="sk-note" role="note"><Icon name="alert" size={16} /><span>Needs verification: {gapLabel(gaps)}. Until then nothing is shown for {gaps.length === 1 ? 'it' : 'them'}.</span></p> : null}
        </section>

        <section className="sk-card sk-form sk-step" aria-labelledby="dest-h">
          <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">3</span><div><h3 className="sk-step-title" id="dest-h">Guru Sahib &amp; link</h3><p className="sk-step-hint">The related Guru Sahib adds their painting to the card.</p></div></header>
          <Select label="Related Guru" value={form.relatedGuru} placeholder="None" options={GURUS.map((g) => ({ value: g.id, label: `Sri ${g.name}` }))} onChange={set('relatedGuru')} error={fe.relatedGuru} />
          <details className="sk-step-more" open={!!(fe.destinationPath || fe.destinationUrl || fe.relatedTopic) || form.destinationType !== 'detail' || undefined}>
          <summary>Change where the card opens (usually not needed)</summary>
          <div className="sk-stack mt-3" style={{ gap: '0.9rem' }}>
          <Select label="Destination" value={form.destinationType} options={opts(DESTINATION_TYPES)} onChange={set('destinationType')} />
          {form.destinationType === 'internal' ? (
            <TextInput label="Sikhify page" list="sk-fest-pages" value={form.destinationPath} onChange={set('destinationPath')} error={fe.destinationPath || (form.destinationPath ? liveDestError : '')}
              placeholder="Start typing: a Guru, a history event, a page…" help="Pick from the suggestions, e.g. /gurus/guru-nanak-dev-ji or /sikh-history#event=…" />
          ) : null}
          {form.destinationType === 'external' ? (
            <TextInput label="Website address" type="url" value={form.destinationUrl} onChange={set('destinationUrl')} error={fe.destinationUrl || (form.destinationUrl ? liveDestError : '')} help="Opens in a new tab." />
          ) : null}
          {form.destinationType === 'detail' ? <p className="sk-card-meta" style={{ marginTop: 0 }}>The card opens this observance&apos;s own page, built from the details above.</p> : null}
          <div className="sk-form-grid">
            <TextInput label="Related history topic" list="sk-fest-pages" value={form.relatedTopic} onChange={set('relatedTopic')} error={fe.relatedTopic} help="Optional — a Sikhify page, e.g. /sikh-history#event=…" />
          </div>
          </div>
          </details>
          <datalist id="sk-fest-pages">{pages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</datalist>
        </section>

        <section className="sk-card sk-form sk-step" aria-labelledby="home-h">
          <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">4</span><div><h3 className="sk-step-title" id="home-h">Homepage</h3><p className="sk-step-hint">The homepage shows the two nearest days automatically.</p></div></header>
          <div className="sk-form-grid">
            <Checkbox label="Show on the homepage" checked={form.showOnHome} onChange={(v) => change({ showOnHome: v })} />
            <Checkbox label="Highlight the card" checked={form.featured} onChange={(v) => change({ featured: v })} help="Gives the card a highlighted look." />
          </div>
          <details className="sk-step-more" open={!!fe.advanceDays || undefined}>
          <summary>Timing</summary>
          <div className="sk-form-grid mt-3">
            <TextInput label="Show from (days before)" type="number" min="0" max="366" value={form.advanceDays} onChange={set('advanceDays')} error={fe.advanceDays} help="How early the card appears before the date." />
            <TextInput label="Priority" type="number" min="-100" max="100" value={form.priority} onChange={set('priority')} help="Kept for reference — the homepage now always shows the nearest dates first." />
          </div>
          </details>
          <div>
            <p className="sk-form-label">Card preview</p>
            {preview ? (
              <>
                <div className="fest-preview" dangerouslySetInnerHTML={{ __html: preview }} />
                {!next ? <p className="sk-card-meta">Preview only: this date is not verified, so the card is not shown on the site.</p> : null}
              </>
            ) : <p className="sk-card-meta">Add a current or upcoming date to preview the card.</p>}
          </div>
        </section>

        <div className="sk-card flex flex-wrap items-center gap-2" style={{ position: 'sticky', bottom: '0.75rem', zIndex: 5 }}>
          <button type="submit" className="sk-btn" disabled={state.busy}>{status === 'published' ? 'Save changes (stays live)' : 'Save draft'}</button>
          {status !== 'published' ? <button type="button" className="sk-btn sk-btn-gold" disabled={state.busy} onClick={() => save({ publish: true })}><Icon name="check" size={15} />Publish</button> : null}
          {status === 'published' ? <button type="button" className="sk-btn" disabled={state.busy || dirty} title={dirty ? 'Save or discard your changes first' : undefined} onClick={() => setConfirm('unpublish')}>Unpublish</button> : null}
          {record && status !== 'published' && can('content.delete') ? <button type="button" className="sk-btn sk-btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirm('delete')}>Delete</button> : null}
          {dirty ? <span className="sk-card-meta" style={{ marginTop: 0 }} role="status">Unsaved changes</span> : null}
        </div>
      </form>

      <ConfirmDialog open={confirm === 'unpublish'} title="Unpublish this observance?" confirmLabel="Unpublish"
        message="It goes back to draft and disappears from the homepage and /festivals." onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); unpublish(); }} />
      <ConfirmDialog open={confirm === 'delete'} danger title="Delete this observance?" confirmLabel="Delete"
        message="The record and all its dates are deleted permanently."
        onCancel={() => setConfirm(null)} onConfirm={() => adminService.deleteFestival(id).then(() => { toast('Deleted'); navigate('/admin/festivals'); }).catch((err) => { setConfirm(null); toast(err.message, 'error'); })} />
    </>
  );
}
