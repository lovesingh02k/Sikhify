/* ==========================================================================
   Hukamnama editor: create, edit, save as draft, preview, publish, unpublish,
   archive, restore and (Master Admin) delete — with the full change history.
   "Fill from BaniDB" prefills the form from the same live source the site
   already uses, for review before publishing; nothing is published until an
   admin presses Publish.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import HukamnamaPreview from '../../components/hukamnama/HukamnamaPreview.jsx';
import Dialog, { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, TextArea, FormError } from '../../components/ui/Form.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { fetchFromBaniDb, sgpcAudioUrl } from '../../services/hukamnama/hukamnamaService.js';
import { formatDate, formatDateTime, toast } from '../../utils/format.js';

const EMPTY = { date: '', ang: '', raag: '', writer: '', gurmukhi: '', transliteration: '', punjabi: '', hindi: '', english: '', audioUrl: '', kathaUrl: '', source: '' };
const lineCount = (s) => String(s || '').split('\n').filter((l) => l.trim()).length;

function toForm(h) {
  const out = {};
  for (const k of Object.keys(EMPTY)) out[k] = h[k] === null || h[k] === undefined ? '' : String(h[k]);
  return out;
}

export default function HukamnamaEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  usePageMeta(`${id ? 'Edit' : 'New'} Hukamnama — Sikhify Admin`, undefined, { noindex: true });
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, date: params.get('date') || '' });
  const [load, setLoad] = useState({ loading: !!id, error: null });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);

  const fetchRecord = () => adminService.hukamnama(id).then((d) => {
    setRecord(d.hukamnama);
    setHistory(d.history);
    setForm(toForm(d.hukamnama));
    setDirty(false);
    setLoad({ loading: false, error: null });
  }).catch((error) => setLoad({ loading: false, error }));
  useEffect(() => { if (id) fetchRecord(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setDirty(true); };

  async function save({ publish = false, replace = false } = {}) {
    setState({ busy: true, error: null, fields: {} });
    try {
      let saved;
      if (id) {
        saved = await adminService.updateHukamnama(id, form);
        if (publish) saved = await adminService.setHukamnamaStatus(id, 'published', replace);
      } else {
        saved = await adminService.createHukamnama({ ...form, publish, replace });
      }
      toast(publish ? 'Published — it is now live on the site' : 'Saved');
      setState({ busy: false, error: null, fields: {} });
      setDirty(false);
      if (!id) navigate(`/admin/hukamnama/${saved.id}`, { replace: true });
      else fetchRecord();
    } catch (err) {
      if (err.code === 'published_exists') { setState({ busy: false, error: null, fields: {} }); setConfirm({ kind: 'replace', message: err.message }); return; }
      setState({ busy: false, error: err, fields: err.fields || {} });
    }
  }

  async function setStatus(status) {
    setState({ busy: true, error: null, fields: {} });
    try {
      await adminService.setHukamnamaStatus(id, status);
      toast(status === 'draft' ? (record.status === 'published' ? 'Unpublished — the site falls back to BaniDB for this date' : 'Restored to draft') : 'Archived');
      setState({ busy: false, error: null, fields: {} });
      fetchRecord();
    } catch (err) { setState({ busy: false, error: err, fields: err.fields || {} }); }
  }

  async function fillFromBaniDb() {
    if (!form.date) { setState({ ...state, fields: { date: 'Choose the date first' } }); return; }
    setState({ ...state, busy: true, error: null });
    try {
      const h = await fetchFromBaniDb(form.date);
      const col = (k) => h.lines.map((l) => l[k] || '').join('\n');
      setForm({
        ...form, ang: String(h.ang || ''), raag: h.raag, writer: h.writer,
        gurmukhi: col('g'), transliteration: col('t'), punjabi: col('pa'), hindi: col('hi'), english: col('en'),
        audioUrl: h.audioUrl, kathaUrl: h.kathaUrl, source: 'Sri Harmandir Sahib, Amritsar — text and meanings via BaniDB; audio published by the SGPC',
      });
      setDirty(true);
      toast('Filled from BaniDB — review before publishing');
      setState({ busy: false, error: null, fields: {} });
    } catch (err) {
      setState({ busy: false, error: { message: err.kind === 'notFound' ? `BaniDB has no Hukamnama for ${formatDate(form.date)}.` : "BaniDB couldn't be reached. Enter the text manually or try again." }, fields: {} });
    }
  }

  if (load.loading) return <Loading rows={3} />;
  if (load.error) return <ErrorState error={load.error} />;

  const g = lineCount(form.gurmukhi);
  const misaligned = ['transliteration', 'punjabi', 'hindi', 'english'].filter((k) => lineCount(form[k]) && lineCount(form[k]) !== g);
  const status = record ? record.status : 'new';

  return (
    <>
      <AdminHeader
        title={record ? `Hukamnama — ${formatDate(record.date, { weekday: 'long' })}` : 'New Hukamnama'}
        sub={record ? <><Pill value={record.status} /> · created {formatDateTime(record.createdAt)}{record.createdBy ? ` by ${record.createdBy}` : ''} · updated {formatDateTime(record.updatedAt)}{record.updatedBy ? ` by ${record.updatedBy}` : ''}{record.publishedAt ? ` · published ${formatDateTime(record.publishedAt)}` : ''}</> : 'Saved as a draft until you publish it.'}
        actions={<><Link className="sk-btn" to="/admin/hukamnama">All Hukamnamas</Link>{status === 'published' ? <a className="sk-btn" href={`/hukamnama#date=${record.date}`} target="_blank" rel="noopener noreferrer">View live ↗</a> : null}</>} />

      <form className="sk-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <FormError error={state.error} />
        <section className="sk-card sk-form">
          <div className="sk-form-grid">
            <TextInput label="Date" type="date" required value={form.date} onChange={set('date')} error={state.fields.date} help="The day this Hukamnama is for (India time)." />
            <TextInput label="Ang" type="number" min="1" max="1430" value={form.ang} onChange={set('ang')} error={state.fields.ang} help="Page of the Sri Guru Granth Sahib Ji (1–1430)." />
            <TextInput label="Raag" value={form.raag} onChange={set('raag')} />
            <TextInput label="Bani of" value={form.writer} onChange={set('writer')} help="e.g. Guru Arjan Dev Ji" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="sk-btn sk-btn-sm" disabled={state.busy} onClick={fillFromBaniDb}><Icon name="upload" size={14} />Fill from BaniDB for this date</button>
            <span className="sk-card-meta" style={{ marginTop: 0 }}>Replaces the text fields below with BaniDB&apos;s Hukamnama for the chosen date.</span>
          </div>
        </section>

        <section className="sk-card sk-form" aria-labelledby="text-h">
          <h3 className="sk-card-title" id="text-h">Text</h3>
          <p className="sk-card-meta" style={{ marginTop: 0 }}>Put one line of Gurbani per line. When a translation has the same number of lines, each line&apos;s meaning appears under it; otherwise it is shown as a paragraph.</p>
          <TextArea label="Gurmukhi" required rows={8} value={form.gurmukhi} onChange={set('gurmukhi')} error={state.fields.gurmukhi} lang="pa" className="font-gurmukhi" help={`${g} line${g === 1 ? '' : 's'}`} />
          <TextArea label="Transliteration" rows={6} value={form.transliteration} onChange={set('transliteration')} help={`${lineCount(form.transliteration)} lines`} />
          <TextArea label="Punjabi meaning" rows={6} value={form.punjabi} onChange={set('punjabi')} lang="pa" help={`${lineCount(form.punjabi)} lines`} />
          <TextArea label="Hindi meaning" rows={6} value={form.hindi} onChange={set('hindi')} lang="hi" help={`${lineCount(form.hindi)} lines`} />
          <TextArea label="English meaning" rows={6} value={form.english} onChange={set('english')} error={state.fields.english} help={`${lineCount(form.english)} lines`} />
          {misaligned.length ? <p className="sk-note" role="note"><Icon name="alert" size={16} /><span>{misaligned.join(', ')} {misaligned.length === 1 ? 'has' : 'have'} a different number of lines from the Gurmukhi, so {misaligned.length === 1 ? 'it' : 'they'} will be shown as a paragraph.</span></p> : null}
        </section>

        <section className="sk-card sk-form" aria-labelledby="audio-h">
          <h3 className="sk-card-title" id="audio-h">Audio &amp; source</h3>
          <div className="sk-form-grid">
            <TextInput label="Hukamnama audio URL" type="url" value={form.audioUrl} onChange={set('audioUrl')} error={state.fields.audioUrl} />
            <TextInput label="Katha audio URL" type="url" value={form.kathaUrl} onChange={set('kathaUrl')} error={state.fields.kathaUrl} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="sk-btn sk-btn-sm" disabled={!form.date}
              onClick={() => { setForm({ ...form, audioUrl: sgpcAudioUrl('hukamnama', form.date), kathaUrl: sgpcAudioUrl('katha', form.date) }); setDirty(true); }}>
              Use the SGPC official recordings for this date
            </button>
            {form.audioUrl ? <audio controls preload="none" src={form.audioUrl} style={{ height: 36 }} aria-label="Check the Hukamnama audio" /> : null}
          </div>
          <TextInput label="Source" required value={form.source} onChange={set('source')} error={state.fields.source} help="Where this Hukamnama was taken from, e.g. “Sri Harmandir Sahib, Amritsar (SGPC)”." />
        </section>

        <div className="sk-card flex flex-wrap items-center gap-2" style={{ position: 'sticky', bottom: '0.75rem', zIndex: 5 }}>
          <button type="submit" className="sk-btn" disabled={state.busy}>{status === 'published' ? 'Save changes (stays live)' : 'Save draft'}</button>
          <button type="button" className="sk-btn" onClick={() => setPreview(true)}><Icon name="eye" size={15} />Preview</button>
          {status !== 'published' ? <button type="button" className="sk-btn sk-btn-gold" disabled={state.busy} onClick={() => save({ publish: true })}><Icon name="check" size={15} />Publish</button> : null}
          {status === 'published' ? <button type="button" className="sk-btn" disabled={state.busy || dirty} title={dirty ? 'Save or discard your changes first' : undefined} onClick={() => setConfirm({ kind: 'unpublish' })}>Unpublish</button> : null}
          {status === 'draft' ? <button type="button" className="sk-btn" disabled={state.busy || dirty} onClick={() => setStatus('archived')}>Archive</button> : null}
          {status === 'archived' ? <button type="button" className="sk-btn" disabled={state.busy} onClick={() => setStatus('draft')}>Restore to draft</button> : null}
          {record && status !== 'published' && can('content.delete') ? <button type="button" className="sk-btn sk-btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirm({ kind: 'delete' })}>Delete</button> : null}
          {dirty ? <span className="sk-card-meta" style={{ marginTop: 0 }} role="status">Unsaved changes</span> : null}
        </div>
      </form>

      {record ? (
        <section className="sk-card" aria-labelledby="history-h">
          <h3 className="sk-card-title" id="history-h"><Icon name="history" size={16} /> History</h3>
          <ol className="mt-3 flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem' }}>
                <span><strong style={{ textTransform: 'capitalize' }}>{h.action}</strong> <span className="sk-card-meta">by {h.actor || '—'} · {formatDateTime(h.createdAt)}</span></span>
                <button type="button" className="sk-link-btn" onClick={() => setSnapshot(h)}>View this version</button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <Dialog open={preview} onClose={() => setPreview(false)} title="Preview" wide><HukamnamaPreview record={form} /></Dialog>
      <Dialog open={!!snapshot} onClose={() => setSnapshot(null)} title={snapshot ? `Version: ${snapshot.action} · ${formatDateTime(snapshot.createdAt)}` : ''} wide>
        {snapshot ? (
          <>
            <HukamnamaPreview record={snapshot.snapshot} />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="sk-btn" onClick={() => { setForm(toForm(snapshot.snapshot)); setDirty(true); setSnapshot(null); toast('Version loaded into the form — save to keep it'); }}>Load into the form</button>
            </div>
          </>
        ) : null}
      </Dialog>
      <ConfirmDialog open={!!confirm && confirm.kind === 'replace'} title="Replace the published Hukamnama?" confirmLabel="Publish and archive the other"
        message={confirm ? `${confirm.message}` : ''} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); save({ publish: true, replace: true }); }} />
      <ConfirmDialog open={!!confirm && confirm.kind === 'unpublish'} title="Unpublish this Hukamnama?" confirmLabel="Unpublish"
        message="It goes back to draft. For this date the site will show the BaniDB Hukamnama instead." onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setStatus('draft'); }} />
      <ConfirmDialog open={!!confirm && confirm.kind === 'delete'} danger title="Delete this Hukamnama record?" confirmLabel="Delete"
        message="The record and its history are deleted permanently. Prefer Archive to keep it."
        onCancel={() => setConfirm(null)} onConfirm={() => adminService.deleteHukamnama(id).then(() => { toast('Deleted'); navigate('/admin/hukamnama'); }).catch((err) => { setConfirm(null); toast(err.message, 'error'); })} />
    </>
  );
}
