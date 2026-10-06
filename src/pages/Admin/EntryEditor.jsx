/* Create / edit a directory record with its sources, verification and publishing status. */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import SchemaFields, { toFormValues } from '../../components/common/SchemaFields.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { Select, TextInput, TextArea, FormError } from '../../components/ui/Form.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { CONTENT_TYPES, VERIFICATION_STATUSES, VERIFICATION_LABELS } from '../../../shared/contentTypes.js';
import { formatDateTime, toast } from '../../utils/format.js';

const linksToText = (refs) => (refs || []).map((r) => (r.label && r.label !== r.url ? `${r.label} | ${r.url}` : r.url)).join('\n');

export default function EntryEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [entry, setEntry] = useState(null);
  const [type, setType] = useState(CONTENT_TYPES[params.get('type')] ? params.get('type') : '');
  const [values, setValues] = useState({});
  const [meta, setMeta] = useState({ source: '', references: '', publishStatus: 'draft', verificationStatus: 'pending' });
  const [load, setLoad] = useState({ loading: !!id, error: null });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const [confirm, setConfirm] = useState(false);
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
    setState({ busy: true, error: null, fields: {} });
    try {
      const payload = { ...values, ...meta, type };
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

  if (load.loading) return <Loading rows={2} />;
  if (load.error) return <ErrorState error={load.error} />;
  const t = CONTENT_TYPES[type];

  return (
    <>
      <AdminHeader title={entry ? entry.title : `New ${t ? t.label.toLowerCase() : 'record'}`}
        sub={entry ? <>{t.label} · <Pill value={entry.publishStatus} /> · <Pill value={entry.verification.status} label={VERIFICATION_LABELS[entry.verification.status]} /> · updated {formatDateTime(entry.verification.updatedAt)}{entry.updatedBy ? ` by ${entry.updatedBy}` : ''}</> : 'Only publish information you can support with a source.'}
        actions={entry ? <><Link className="sk-btn" to={entry.url} target="_blank">{entry.publishStatus === 'published' ? 'View' : 'Preview'} ↗</Link><Link className="sk-btn" to={`/admin/${['gurdwara', 'event', 'personality', 'news'].includes(type) ? (type === 'news' ? 'news' : t.path) : 'content'}`}>Back to list</Link></> : null} />
      <form className="sk-form" onSubmit={save} noValidate>
        <FormError error={state.error} />
        {!id ? (
          <div className="sk-card">
            <Select label="Content type" required value={type} placeholder="Choose…" options={Object.entries(CONTENT_TYPES).map(([value, x]) => ({ value, label: x.label }))} onChange={(e) => setType(e.target.value)} />
          </div>
        ) : null}
        {t ? (
          <>
            <section className="sk-card"><h3 className="sk-card-title mb-4">Details</h3><SchemaFields type={type} values={values} onChange={setValues} errors={state.fields} /></section>
            <section className="sk-card sk-form">
              <h3 className="sk-card-title">Sources &amp; verification</h3>
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
            <div className="sk-form-actions">
              <button type="submit" className="sk-btn sk-btn-gold" disabled={state.busy}>{state.busy ? 'Saving…' : 'Save'}</button>
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
