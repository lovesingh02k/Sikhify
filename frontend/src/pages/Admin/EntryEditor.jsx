/* Create / edit a directory record with its sources, verification and publishing status. */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import SchemaFields, { toFormValues } from '../../components/common/SchemaFields.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { Select, TextInput, TextArea, FormError, Checkbox } from '../../components/ui/Form.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import ImagePicker from '../../components/community/ImagePicker.jsx';
import VideoUploader from '../../components/admin/VideoUploader.jsx';
import QuizBuilder from '../../components/admin/QuizBuilder.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { CONTENT_TYPES, VERIFICATION_STATUSES, VERIFICATION_LABELS, UPLOAD_PATH_RE } from '../../../../shared/contentTypes.js';
import { formatDateTime, toast } from '../../utils/format.js';

const lines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

/** Kids stories: upload a cover image, photos and video files instead of pasting links. */
function KidsMedia({ values, setValues, errors, onBusy }) {
  const set = (name, list) => setValues((v) => ({ ...v, [name]: list.join('\n') }));
  const cover = values.image_url || '';
  return (
    <section className="sk-card sk-step" aria-labelledby="kids-media-h">
      <header className="sk-step-head"><Icon name="image" size={18} /><div><h3 className="sk-step-title" id="kids-media-h">Photos &amp; videos</h3><p className="sk-step-hint">Upload pictures and video files from your computer or phone. They appear on the story’s page.</p></div></header>
      <div className="sk-stack" style={{ gap: '1.1rem' }}>
        <div>
          <p className="sk-form-label">Cover image</p>
          <ImagePicker value={UPLOAD_PATH_RE.test(cover) ? [cover] : []} max={1} purpose="kids" label="Upload cover image" onBusy={onBusy('cover')}
            onChange={(urls) => setValues((v) => ({ ...v, image_url: urls[0] || '' }))} />
          {errors.image_url ? <p className="sk-form-error">{errors.image_url}</p> : null}
        </div>
        <div>
          <p className="sk-form-label">Photos</p>
          <ImagePicker value={lines(values.photos)} max={12} purpose="kids" label="Upload photos" onBusy={onBusy('photos')} onChange={(urls) => set('photos', urls)} />
          {errors.photos ? <p className="sk-form-error">{errors.photos}</p> : null}
        </div>
        <div>
          <p className="sk-form-label">Videos</p>
          <VideoUploader onBusy={onBusy('videos')} value={lines(values.video_files)} onChange={(urls) => set('video_files', urls)} />
          {errors.video_files ? <p className="sk-form-error">{errors.video_files}</p> : null}
        </div>
        <Checkbox label="Let visitors download the pictures" checked={!!values.downloadable}
          help="Shows a “Download image” button for the cover image and each photo — good for colouring pages and printables."
          onChange={(checked) => setValues((v) => ({ ...v, downloadable: checked }))} />
      </div>
    </section>
  );
}

const linksToText = (refs) => (refs || []).map((r) => (r.label && r.label !== r.url ? `${r.label} | ${r.url}` : r.url)).join('\n');

export default function EntryEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [entry, setEntry] = useState(null);
  const [type, setType] = useState(CONTENT_TYPES[params.get('type')] ? params.get('type') : '');
  // A new Kids record can start as a quiz (/admin/content/new?type=kids&kind=Quiz).
  const [values, setValues] = useState(() => (params.get('kind') === 'Quiz' && params.get('type') === 'kids' ? { kind: 'Quiz' } : {}));
  const [meta, setMeta] = useState({ source: '', references: '', publishStatus: 'draft', verificationStatus: 'pending' });
  const [load, setLoad] = useState({ loading: !!id, error: null });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const [confirm, setConfirm] = useState(false);
  // Uploads still running (cover, photos, videos): saving now would leave them out, so Save waits.
  const [uploads, setUploads] = useState({});
  const uploading = Object.values(uploads).some(Boolean);
  const onBusy = (key) => (busy) => setUploads((u) => ({ ...u, [key]: busy }));
  usePageMeta(`${id ? 'Edit' : 'New'} record — Sikhify Admin`, undefined, { noindex: true });

  useEffect(() => {
    if (!id) return;
    adminService.entry(id).then((e) => {
      setEntry(e);
      setType(e.type);
      setValues(toFormValues(e.type, e.fields, { title: e.title, summary: e.summary, body: e.body, image_url: e.imageUrl }));
      setMeta({ source: e.verification.source, references: linksToText(e.verification.references), publishStatus: e.publishStatus, verificationStatus: e.verification.status });
      setLoad({ loading: false, error: null });
    }).catch((error) => setLoad({ loading: false, error }));
  }, [id]);

  async function save(e) {
    e.preventDefault();
    if (uploading) return;
    setState({ busy: true, error: null, fields: {} });
    try {
      // Sikhify's own content (downloads) has no outside source to check: it is "from Sikhify" and verified.
      const own = CONTENT_TYPES[type] && CONTENT_TYPES[type].ownContent;
      const payload = { ...values, ...meta, type, ...(own ? { source: meta.source || 'Sikhify', verificationStatus: 'verified' } : {}) };
      const saved = id ? await adminService.updateEntry(id, payload) : await adminService.createEntry(payload);
      toast('Saved');
      setEntry(saved);
      setState({ busy: false, error: null, fields: {} });
      if (!id) navigate(`/admin/content/${saved.id}`, { replace: true });
    } catch (err) {
      setState({ busy: false, error: err, fields: err.fields || {} });
    }
  }
  const verify = (status) => adminService.verifyEntry(id, status).then((e) => { setEntry(e); setMeta((m) => ({ ...m, verificationStatus: e.verification.status, publishStatus: e.publishStatus })); toast(`Marked ${VERIFICATION_LABELS[status].toLowerCase()}`); }).catch((err) => toast(err.message, 'error'));

  if (type === 'blog') return <Navigate to={id ? `/admin/blog/${id}` : '/admin/blog/new'} replace />;
  if (load.loading) return <Loading rows={2} />;
  if (load.error) return <ErrorState error={load.error} />;
  const t = CONTENT_TYPES[type];

  return (
    <>
      <AdminHeader title={entry ? entry.title : `New ${t ? t.label.toLowerCase() : 'record'}`}
        sub={entry ? <>{t.label} · <Pill value={entry.publishStatus} /> · <Pill value={entry.verification.status} label={VERIFICATION_LABELS[entry.verification.status]} /> · updated {formatDateTime(entry.verification.updatedAt)}{entry.updatedBy ? ` by ${entry.updatedBy}` : ''}</> : 'Only publish information you can support with a source.'}
        actions={entry ? <><Link className="sk-btn" to={entry.url} target="_blank">{entry.publishStatus === 'published' ? 'View' : 'Preview'} ↗</Link><Link className="sk-btn" to={`/admin/${['gurdwara', 'event', 'personality', 'news', 'kids', 'download', 'product'].includes(type) ? (type === 'news' ? 'news' : t.path) : 'content'}`}>Back to list</Link></> : null} />
      <form className="sk-form" onSubmit={save} noValidate>
        <FormError error={state.error} />
        {!id ? (
          <div className="sk-card sk-step">
            <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">1</span><div><h3 className="sk-step-title">What are you adding?</h3><p className="sk-step-hint">Pick the kind of record — the form below changes to match.</p></div></header>
            <Select label="Content type" required value={type} placeholder="Choose…" options={Object.entries(CONTENT_TYPES).map(([value, x]) => ({ value, label: x.label }))} onChange={(e) => setType(e.target.value)} />
          </div>
        ) : null}
        {t ? (
          <>
            {type === 'kids' ? <KidsMedia values={values} setValues={setValues} errors={state.fields} onBusy={onBusy} /> : null}
            {type === 'download' ? (
              <section className="sk-card sk-step" aria-labelledby="dl-media-h">
                <header className="sk-step-head"><Icon name="image" size={18} /><div><h3 className="sk-step-title" id="dl-media-h">Preview image</h3><p className="sk-step-hint">A picture of the file (e.g. the wallpaper or the cover), shown on its card. Optional.</p></div></header>
                <ImagePicker value={UPLOAD_PATH_RE.test(values.image_url || '') ? [values.image_url] : []} max={1} purpose="download" label="Upload preview image" onBusy={onBusy('preview')}
                  onChange={(urls) => setValues((v) => ({ ...v, image_url: urls[0] || '' }))} />
              </section>
            ) : null}
            {!['kids', 'download', 'product'].includes(type) ? (
              <section className="sk-card sk-step" aria-labelledby="entry-media-h">
                <header className="sk-step-head"><Icon name="image" size={18} /><div><h3 className="sk-step-title" id="entry-media-h">Photo</h3><p className="sk-step-hint">Upload a photo from your computer or phone. Optional. You can also paste an image link under “More details”.</p></div></header>
                <ImagePicker value={UPLOAD_PATH_RE.test(values.image_url || '') ? [values.image_url] : []} max={1} purpose="entry" label="Upload photo" onBusy={onBusy('cover')}
                  onChange={(urls) => setValues((v) => ({ ...v, image_url: urls[0] || '' }))} />
                {state.fields.image_url ? <p className="sk-form-error">{state.fields.image_url}</p> : null}
              </section>
            ) : null}
            {type === 'product' ? (
              <section className="sk-card sk-step" aria-labelledby="product-media-h">
                <header className="sk-step-head"><Icon name="image" size={18} /><div><h3 className="sk-step-title" id="product-media-h">Product photos</h3><p className="sk-step-hint">The main photo is shown on the store page. Add more photos for the product’s own page.</p></div></header>
                <div className="sk-stack" style={{ gap: '1.1rem' }}>
                  <div>
                    <p className="sk-form-label">Main photo</p>
                    <ImagePicker value={UPLOAD_PATH_RE.test(values.image_url || '') ? [values.image_url] : []} max={1} purpose="product" label="Upload main photo" onBusy={onBusy('cover')}
                      onChange={(urls) => setValues((v) => ({ ...v, image_url: urls[0] || '' }))} />
                    {state.fields.image_url ? <p className="sk-form-error">{state.fields.image_url}</p> : null}
                  </div>
                  <div>
                    <p className="sk-form-label">More photos</p>
                    <ImagePicker value={lines(values.photos)} max={8} purpose="product" label="Upload photos" onBusy={onBusy('photos')}
                      onChange={(urls) => setValues((v) => ({ ...v, photos: urls.join('\n') }))} />
                    {state.fields.photos ? <p className="sk-form-error">{state.fields.photos}</p> : null}
                  </div>
                </div>
              </section>
            ) : null}
            <section className="sk-card sk-step"><header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">{id ? 1 : 2}</span><div><h3 className="sk-step-title">Details</h3><p className="sk-step-hint">Fill in the starred fields; everything else is optional.</p></div></header><SchemaFields type={type} values={values} onChange={setValues} errors={state.fields} foldOptional /></section>
            {type === 'kids' ? (
              <section className="sk-card sk-step" aria-labelledby="quiz-h">
                <header className="sk-step-head"><Icon name="check" size={18} /><div><h3 className="sk-step-title" id="quiz-h">Quiz</h3>
                  <p className="sk-step-hint">{values.kind === 'Quiz' ? 'Add questions and tick the right answer for each. Children see if they are right straight away.' : 'To make a quiz, set “Kind” to Quiz in the details above.'}</p></div></header>
                {values.kind === 'Quiz'
                  ? <QuizBuilder value={values.quiz} onChange={(quiz) => setValues((v) => ({ ...v, quiz }))} error={state.fields.quiz} />
                  : <button type="button" className="sk-btn sk-btn-sm" onClick={() => setValues((v) => ({ ...v, kind: 'Quiz' }))}><Icon name="plus" size={14} />Make this a quiz</button>}
              </section>
            ) : null}
            {t.ownContent ? (
              <section className="sk-card sk-form sk-step">
                <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">{id ? 2 : 3}</span><div><h3 className="sk-step-title">Publishing</h3><p className="sk-step-hint">Drafts are visible to staff only. Choose Published to show it on the site.</p></div></header>
                <Select label="Publishing" value={meta.publishStatus} options={[{ value: 'draft', label: 'Draft (staff only)' }, { value: 'published', label: 'Published (public)' }, { value: 'archived', label: 'Archived (hidden)' }]} onChange={(e) => setMeta({ ...meta, publishStatus: e.target.value })} />
              </section>
            ) : (
            <section className="sk-card sk-form sk-step">
              <header className="sk-step-head"><span className="sk-step-num" aria-hidden="true">{id ? 2 : 3}</span><div><h3 className="sk-step-title">Where it came from &amp; publishing</h3><p className="sk-step-hint">Add a source link so others can check it, then choose whether it is public.</p></div></header>
              <div className="sk-form-grid">
                <TextInput className="sk-span-2" label="Source" value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} error={state.fields.source} help="Where this information was confirmed (organization, official site, publication)." />
                <TextArea className="sk-span-2" label="References" rows={3} value={meta.references} onChange={(e) => setMeta({ ...meta, references: e.target.value })} error={state.fields.references} help="One per line: Label | https://…" />
                <Select label="Verification" value={meta.verificationStatus} options={VERIFICATION_STATUSES.map((v) => ({ value: v, label: VERIFICATION_LABELS[v] }))} onChange={(e) => setMeta({ ...meta, verificationStatus: e.target.value })} />
                <Select label="Publishing" value={meta.publishStatus} options={[{ value: 'draft', label: 'Draft (staff only)' }, { value: 'published', label: 'Published (public)' }, { value: 'archived', label: 'Archived (hidden)' }]} onChange={(e) => setMeta({ ...meta, publishStatus: e.target.value })}
                  help="Publishing requires a source or at least one reference." />
              </div>
              {entry ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="sk-card-meta" style={{ marginTop: 0 }}>{entry.verification.lastVerifiedAt ? `Last verified ${formatDateTime(entry.verification.lastVerifiedAt)}` : 'Never verified'}</span>
                  <button type="button" className="sk-btn sk-btn-sm" onClick={() => verify('verified')}>Re-checked today — mark verified</button>
                  <button type="button" className="sk-btn sk-btn-sm" onClick={() => verify('needs_review')}>Flag: needs review</button>
                </div>
              ) : null}
            </section>
            )}
            <div className="sk-form-actions">
              <button type="submit" className="sk-btn sk-btn-gold" disabled={state.busy || uploading}>{state.busy ? 'Saving…' : uploading ? 'Uploading…' : 'Save'}</button>
              {entry && can('content.delete') ? <button type="button" className="sk-btn sk-btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirm(true)}>Delete permanently</button> : null}
            </div>
          </>
        ) : null}
      </form>
      <ConfirmDialog open={confirm} danger title="Delete this record permanently?" confirmLabel="Delete" message="Prefer Archive if it might be needed again. Deleting cannot be undone."
        onCancel={() => setConfirm(false)} onConfirm={() => adminService.deleteEntry(id).then(() => { toast('Deleted'); navigate('/admin/content'); }).catch((err) => toast(err.message, 'error'))} />
    </>
  );
}
