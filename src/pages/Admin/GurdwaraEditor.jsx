/* ==========================================================================
   /admin/gurdwaras/new and /admin/gurdwaras/:id — edit one Gurdwara:
   details, coordinates (map picker), facilities & services, status,
   verification (needs a source), archive, sources, photos and history.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/admin/AdminKit.jsx';
import { RecordFields, SourceFields, DuplicateList, EMPTY_RECORD, toRecord, recordBody } from '../../components/gurdwaras/AdminBits.jsx';
import { StatusBadge, GurdwaraImage } from '../../components/gurdwaras/GurdwaraBits.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { TextInput, TextArea, FormError, Checkbox } from '../../components/ui/Form.jsx';
import { ErrorState, Loading } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { uploadService } from '../../services/community/index.js';
import { SOURCE_TYPES, STATUSES } from '../../../shared/gurdwaras.js';
import { formatDateTime, toast } from '../../utils/format.js';

const describe = (changes) => Object.entries(changes || {}).map(([k, v]) => {
  const field = k.replace(/_/g, ' ');
  if (v && typeof v === 'object' && 'to' in v) return `${field}: ${Array.isArray(v.to) ? v.to.join(', ') || 'none' : v.to ?? '—'}`;
  return `${field}: ${typeof v === 'string' ? v : JSON.stringify(v)}`;
}).join(' · ');

function Sources({ g, onChange }) {
  const [src, setSrc] = useState({ name: '', url: '', type: 'official_website', notes: '' });
  const [st, setSt] = useState({ busy: false, error: null, fields: {} });
  const add = (e) => {
    e.preventDefault();
    setSt({ busy: true, error: null, fields: {} });
    gurdwaraService.admin.addSource(g.id, src)
      .then((next) => { onChange(next); setSrc({ name: '', url: '', type: 'official_website', notes: '' }); setSt({ busy: false, error: null, fields: {} }); toast('Source added'); })
      .catch((err) => setSt({ busy: false, error: err, fields: err.fields || {} }));
  };
  const remove = (id) => gurdwaraService.admin.removeSource(id).then(onChange).catch((err) => setSt({ busy: false, error: err, fields: {} }));
  return (
    <section className="sk-card" aria-labelledby="src-h">
      <h3 className="sk-card-title" id="src-h">Sources</h3>
      <p className="sk-card-meta">Where these details come from. A record needs at least one source before it can be verified.</p>
      {g.sources.length ? (
        <ul className="sk-gsources mt-3">
          {g.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start justify-between gap-2">
              <span>
                {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> : s.name}
                <span className="sk-card-meta"> — {SOURCE_TYPES[s.type]}{s.verifiedAt ? ' · checked' : ''}{s.notes ? ` · ${s.notes}` : ''}</span>
              </span>
              <button type="button" className="sk-link-btn" onClick={() => remove(s.id)} aria-label={`Remove source ${s.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <p className="sk-card-text mt-2">No sources yet.</p>}
      <form className="sk-form mt-4" onSubmit={add} noValidate>
        <FormError error={st.error} />
        <SourceFields value={src} onChange={setSrc} errors={st.fields} />
        <div><button type="submit" className="sk-btn sk-btn-sm" disabled={st.busy || !src.name}>Add source</button></div>
      </form>
    </section>
  );
}

function Photos({ g, onChange }) {
  const [meta, setMeta] = useState({ alt: '', credit: '', license: '', sourceUrl: '', isPrimary: false });
  const [file, setFile] = useState(null);
  const [st, setSt] = useState({ busy: false, error: null, fields: {} });
  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setSt({ busy: true, error: null, fields: {} });
    try {
      // A display copy (max 1600 px) and a small thumbnail (480 px) for cards — both resized in the browser.
      const full = await uploadService.imageSized(file, 'gurdwara', 1600);
      const thumb = await uploadService.imageSized(file, 'gurdwara', 480);
      const next = await gurdwaraService.admin.addImage(g.id, { ...meta, url: full.url, thumbUrl: thumb.url, width: full.width, height: full.height });
      onChange(next);
      setFile(null);
      setMeta({ alt: '', credit: '', license: '', sourceUrl: '', isPrimary: false });
      setSt({ busy: false, error: null, fields: {} });
      toast('Photo added');
    } catch (err) { setSt({ busy: false, error: err, fields: err.fields || {} }); }
  }
  const act = (p) => p.then(onChange).catch((err) => setSt({ busy: false, error: err, fields: {} }));
  return (
    <section className="sk-card" aria-labelledby="img-h">
      <h3 className="sk-card-title" id="img-h">Photos</h3>
      <p className="sk-card-meta">Only photos you have permission to use — your own, the Gurdwara committee&apos;s with permission, or openly licensed. Never stock or generated images.</p>
      {g.images.length ? (
        <ul className="sk-gphotos mt-3">
          {g.images.map((img) => (
            <li key={img.id}>
              <GurdwaraImage image={img} name={g.name} sizes="200px" />
              <p className="sk-gcredit">{img.isPrimary ? <strong>Main photo · </strong> : null}{img.credit} · {img.license}</p>
              <div className="flex flex-wrap gap-3">
                {!img.isPrimary ? <button type="button" className="sk-link-btn" onClick={() => act(gurdwaraService.admin.updateImage(img.id, { isPrimary: true }))}>Make main</button> : null}
                <button type="button" className="sk-link-btn" onClick={() => act(gurdwaraService.admin.removeImage(img.id))}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="sk-card-text mt-2">No photos yet — the directory shows a Sikhify placeholder.</p>}
      <form className="sk-form mt-4" onSubmit={upload} noValidate>
        <FormError error={st.error} />
        <label className="sk-btn sk-btn-sm" style={{ alignSelf: 'flex-start' }}>
          <Icon name="image" size={14} />{file ? file.name : 'Choose photo…'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <div className="sk-form-grid">
          <TextInput className="sk-span-2" label="Alt text" required value={meta.alt} onChange={(e) => setMeta({ ...meta, alt: e.target.value })} error={st.fields.alt} help="What the photo shows, e.g. “White main building of the Gurdwara with the Nishan Sahib”." />
          <TextInput label="Credit" required value={meta.credit} onChange={(e) => setMeta({ ...meta, credit: e.target.value })} error={st.fields.credit} />
          <TextInput label="Licence / permission" required value={meta.license} onChange={(e) => setMeta({ ...meta, license: e.target.value })} error={st.fields.license} />
          <TextInput className="sk-span-2" label="Source link" type="url" value={meta.sourceUrl} onChange={(e) => setMeta({ ...meta, sourceUrl: e.target.value })} error={st.fields.sourceUrl} />
        </div>
        <Checkbox label="Use as the main photo" checked={meta.isPrimary} onChange={(v) => setMeta({ ...meta, isPrimary: v })} />
        <div><button type="submit" className="sk-btn sk-btn-sm" disabled={!file || st.busy}>{st.busy ? 'Uploading…' : 'Upload photo'}</button></div>
      </form>
    </section>
  );
}

function Verification({ g, onChange }) {
  const [note, setNote] = useState('');
  const [st, setSt] = useState({ busy: false, error: null });
  const run = (p) => { setSt({ busy: true, error: null }); p.then((next) => { onChange(next); setNote(''); setSt({ busy: false, error: null }); }).catch((err) => setSt({ busy: false, error: err })); };
  const verified = g.verification === 'verified';
  return (
    <section className="sk-card" aria-labelledby="ver-h">
      <h3 className="sk-card-title" id="ver-h">Verification</h3>
      <div className="mt-2"><StatusBadge status={g.status} verification={g.verification} />{verified ? <span className="sk-gstatus sk-gstatus-active ml-1"><Icon name="check" size={12} />Verified</span> : null}</div>
      <p className="sk-card-meta">{verified ? `Verified ${g.verifiedAt ? formatDateTime(g.verifiedAt) : ''}` : 'Not public by default until verified.'}</p>
      <FormError error={st.error} />
      <TextArea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} help="What you checked (kept in the verification log)." />
      <div className="flex flex-wrap gap-2 mt-2">
        {verified ? <button type="button" className="sk-btn sk-btn-sm" disabled={st.busy} onClick={() => run(gurdwaraService.admin.verify(g.id, false, note))}>Mark as needs verification</button>
          : <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" disabled={st.busy || !g.sources.length} onClick={() => run(gurdwaraService.admin.verify(g.id, true, note))}>Verify</button>}
      </div>
      {!verified && !g.sources.length ? <p className="sk-form-help">Add a source first.</p> : null}
      {g.verificationLog && g.verificationLog.length ? (
        <ul className="sk-glog mt-3">{g.verificationLog.map((v, i) => <li key={i}><strong>{v.action}</strong> — {v.actor || 'system'}, {formatDateTime(v.at)}{v.note ? `: ${v.note}` : ''}</li>)}</ul>
      ) : null}
    </section>
  );
}

export default function GurdwaraEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const loaded = useAsync(() => (isNew ? null : gurdwaraService.admin.get(id)), [id]);
  const countries = useAsync(() => gurdwaraService.countries(), []);
  const [g, setG] = useState(null);
  const [form, setForm] = useState(EMPTY_RECORD);
  const [st, setSt] = useState({ busy: false, error: null, fields: {} });
  const [dupes, setDupes] = useState([]);
  const [confirmArchive, setConfirmArchive] = useState(false);
  usePageMeta(`${isNew ? 'Add a Gurdwara' : g ? g.name : 'Gurdwara'} — Sikhify Admin`, undefined, { noindex: true });

  useEffect(() => { if (loaded.data) { setG(loaded.data); setForm(toRecord(loaded.data)); } }, [loaded.data]);
  const apply = (next) => { setG(next); setForm(toRecord(next)); };

  async function save(e, force = false) {
    if (e) e.preventDefault();
    setSt({ busy: true, error: null, fields: {} });
    try {
      if (isNew) {
        const created = await gurdwaraService.admin.create({ ...recordBody(form), force });
        toast('Gurdwara added — it needs verification before it is public');
        navigate(`/admin/gurdwaras/${created.id}`, { replace: true });
        return;
      }
      let next = await gurdwaraService.admin.update(g.id, recordBody(form));
      if (form.status !== g.status) next = await gurdwaraService.admin.setStatus(g.id, form.status);
      apply(next);
      setSt({ busy: false, error: null, fields: {} });
      toast('Saved');
    } catch (err) {
      if (err.code === 'possible_duplicates') setDupes(err.fields.duplicates);
      setSt({ busy: false, error: err, fields: err.fields || {} });
      setTimeout(() => document.querySelector('[aria-invalid="true"], .sk-form-banner')?.scrollIntoView({ block: 'center' }), 0);
    }
  }
  const archive = (archived) => gurdwaraService.admin.archive(g.id, archived).then((next) => { apply(next); setConfirmArchive(false); toast(archived ? 'Archived' : 'Restored'); })
    .catch((err) => { setConfirmArchive(false); setSt({ busy: false, error: err, fields: {} }); });

  if (!isNew && loaded.error) return <ErrorState error={loaded.error} title="This Gurdwara couldn’t be loaded" onRetry={loaded.reload}><Link className="sk-btn sk-btn-sm" to="/admin/gurdwaras">Back to the directory</Link></ErrorState>;
  if (!isNew && !g) return <Loading rows={4} />;

  return (
    <>
      <AdminHeader title={isNew ? 'Add a Gurdwara' : g.name}
        sub={isNew ? 'New records start as “needs verification”. Add a source and verify to make them public.' : <>{[g.city.name, g.state.name, g.country.name].join(', ')}{g.archivedAt ? ' · Archived' : ''}</>}
        actions={<><Link className="sk-btn" to="/admin/gurdwaras">← All records</Link>{!isNew && !g.archivedAt ? <Link className="sk-btn" to={g.url} target="_blank">View ↗</Link> : null}</>} />
      <div className="sk-geditor">
        <form className="sk-card sk-form" onSubmit={save} noValidate aria-label="Gurdwara details">
          <FormError error={st.error} />
          {dupes.length ? (
            <>
              <DuplicateList items={dupes} candidate={form} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="sk-btn sk-btn-sm" onClick={() => save(null, true)} disabled={st.busy}>It’s a different Gurdwara — create anyway</button>
              </div>
            </>
          ) : null}
          <RecordFields value={form} onChange={setForm} errors={st.fields} countries={countries.data || []} />
          <div className="sk-form-actions">
            <button type="submit" className="sk-btn sk-btn-gold" disabled={st.busy}>{st.busy ? 'Saving…' : isNew ? 'Add Gurdwara' : 'Save changes'}</button>
            {!isNew && form.status !== g.status ? <span className="sk-card-meta" style={{ marginTop: 0 }}>Status will change to {STATUSES[form.status].label}.</span> : null}
          </div>
        </form>
        {!isNew ? (
          <div className="sk-stack">
            <Verification g={g} onChange={apply} />
            <Sources g={g} onChange={apply} />
            <Photos g={g} onChange={apply} />
            <section className="sk-card" aria-labelledby="arc-h">
              <h3 className="sk-card-title" id="arc-h">{g.archivedAt ? 'Archived' : 'Archive'}</h3>
              <p className="sk-card-meta">{g.archivedAt ? 'Hidden from the directory. Restore it to make it visible again.' : 'Hides the record everywhere (e.g. a duplicate or an entry added in error). Use “Permanently Closed” for a Gurdwara that has closed.'}</p>
              {g.archivedAt ? <button type="button" className="sk-btn sk-btn-sm mt-3" onClick={() => archive(false)}>Restore</button>
                : <button type="button" className="sk-btn sk-btn-danger sk-btn-sm mt-3" onClick={() => setConfirmArchive(true)}>Archive</button>}
            </section>
            <section className="sk-card" aria-labelledby="hist-h">
              <h3 className="sk-card-title" id="hist-h">History</h3>
              {g.history && g.history.length ? (
                <ul className="sk-glog mt-2">{g.history.map((h, i) => <li key={i}><strong>{h.action}</strong> — {h.actor || 'system'}, {formatDateTime(h.at)}{Object.keys(h.changes || {}).length ? <span className="block sk-card-meta">{describe(h.changes)}</span> : null}</li>)}</ul>
              ) : <p className="sk-card-meta">No changes recorded.</p>}
            </section>
          </div>
        ) : null}
      </div>
      <ConfirmDialog open={confirmArchive} title="Archive this Gurdwara?" message="It will disappear from the public directory. You can restore it later." confirmLabel="Archive" danger
        onConfirm={() => archive(true)} onCancel={() => setConfirmArchive(false)} />
    </>
  );
}
