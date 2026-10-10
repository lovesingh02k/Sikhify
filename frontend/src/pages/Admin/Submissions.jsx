/* ==========================================================================
   /admin/submissions — one inbox for everything the Sangat sends:
   • Gurdwara suggestions ("Suggest a Gurdwara")
   • Other information ("Submit / Update Information": events, personalities,
     Kirtanis, websites, apps, books, organizations, corrections, reports)
   From members and from visitors without an account (marked "Guest").
   Nothing here is published until a reviewer chooses to; a submission can be
   reviewed only once (the API refuses a second decision).
   ========================================================================== */
import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import SchemaFields, { toFormValues } from '../../components/common/SchemaFields.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import { TextArea, TextInput, Select, FormError } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { mediaService } from '../../services/media/mediaService.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { GurdwaraSubmissionsQueue, SubmitterLabel } from './Gurdwaras.jsx';
import { SUBMISSION_KINDS } from '../../../../shared/community.js';
import { relativeTime, toast } from '../../utils/format.js';

function Review({ s, onDone }) {
  const def = SUBMISSION_KINDS[s.kind] || {};
  const creates = def.creates;
  const [data, setData] = useState(() => (creates && creates !== 'media_artist' ? toFormValues(creates, s.data, s.data) : { ...s.data, videos: (s.data.videos || []).join('\n') }));
  const [source, setSource] = useState(s.source);
  const [references, setReferences] = useState(/^https?:/i.test(s.source) ? `Submitted source | ${s.source}` : '');
  const [note, setNote] = useState('');
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const cats = useAsync(() => (creates === 'media_artist' ? mediaService.catalog().then((c) => c.categories) : []), [creates]);

  const decide = (decision) => {
    if (decision === 'reject' && note.trim().length < 3) {
      setState({ busy: false, error: null, fields: { note: 'Tell the submitter why it was not accepted' } });
      return;
    }
    setState({ busy: true, error: null, fields: {} });
    const payload = { decision, note };
    if (creates) payload.data = creates === 'media_artist' ? { ...data, videos: String(data.videos || '').split('\n').map((x) => x.trim()).filter(Boolean) } : data;
    if (creates && creates !== 'media_artist') { payload.source = source; payload.references = references; }
    adminService.reviewSubmission(s.id, payload)
      .then((res) => { toast(res.status === 'rejected' ? 'Submission rejected' : res.status === 'published' ? 'Verified and published' : 'Approved'); onDone(res); })
      .catch((err) => setState({ busy: false, error: err, fields: err.fields || {} }));
  };

  return (
    <div className="sk-form">
      <p><strong>{s.kindLabel}</strong> from <SubmitterLabel s={s} />, {relativeTime(s.createdAt)}{s.reference ? <> · reference <code>{s.reference}</code></> : null}.</p>
      <div className="sk-note"><p><strong>Submitted source:</strong> {/^https?:/i.test(s.source) ? <a className="panel-view-all" href={s.source} target="_blank" rel="noopener noreferrer">{s.source}</a> : s.source}</p></div>
      {s.message ? <p><strong>Message:</strong> <span style={{ whiteSpace: 'pre-line' }}>{s.message}</span></p> : null}
      {!creates ? (
        <p>About: {s.targetUrl.startsWith('/') ? <Link className="panel-view-all" to={s.targetUrl}>{s.targetUrl}</Link> : s.targetUrl}
          {s.targetEntryId ? <> · <Link className="panel-view-all" to={`/admin/content/${s.targetEntryId}`}>Open the record in the editor</Link></> : null}</p>
      ) : null}
      <FormError error={state.error} />
      {creates && creates !== 'media_artist' ? (
        <>
          <p className="sk-card-meta">Check every field against the source. You can correct fields before approving.</p>
          <SchemaFields type={creates} values={data} onChange={setData} errors={state.fields} />
          <div className="sk-form-grid">
            <TextInput label="Source" value={source} onChange={(e) => setSource(e.target.value)} error={state.fields.source} />
            <TextArea label="References" rows={2} value={references} onChange={(e) => setReferences(e.target.value)} error={state.fields.references} help="Label | https://… — one per line." />
          </div>
        </>
      ) : null}
      {creates === 'media_artist' ? (
        <div className="sk-form-grid">
          <TextInput label="Name" value={data.name || ''} onChange={(e) => setData({ ...data, name: e.target.value })} error={state.fields.name} />
          <Select label="Category" value={data.category || ''} placeholder="Choose…" options={cats.data || []} onChange={(e) => setData({ ...data, category: e.target.value })} error={state.fields.category} />
          <TextInput label="Location" value={data.location || ''} onChange={(e) => setData({ ...data, location: e.target.value })} />
          <TextArea className="sk-span-2" label="Description" value={data.description || ''} onChange={(e) => setData({ ...data, description: e.target.value })} error={state.fields.description} />
          <TextArea className="sk-span-2" label="Videos" value={data.videos || ''} onChange={(e) => setData({ ...data, videos: e.target.value })} help="Approving creates a draft artist in Media with these videos as drafts; add their real titles there before publishing." />
        </div>
      ) : null}
      <TextArea label="Note to the submitter" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} error={state.fields.note}
        help={s.guest ? 'Required when rejecting. Guests have no account, so they are not notified — email them if they left an address.' : 'Required when rejecting. The submitter sees this note.'} />
      <div className="sk-admin-actions">
        <button type="button" className="sk-btn sk-btn-danger" disabled={state.busy} onClick={() => decide('reject')}>Reject…</button>
        <span className="sk-admin-actions-gap" />
        <button type="button" className="sk-btn" disabled={state.busy} onClick={() => decide('approve')}>{creates ? 'Approve as draft' : 'Mark as handled'}</button>
        {creates && creates !== 'media_artist' ? <button type="button" className="sk-btn sk-btn-gold" disabled={state.busy} onClick={() => decide('publish')}>{state.busy ? 'Saving…' : 'Verified — publish'}</button> : null}
      </div>
      <p className="sk-card-meta">“Approve as draft” creates an unpublished record for a final edit. “Verified — publish” publishes it now — only after checking it against the source.</p>
    </div>
  );
}

function InformationQueue() {
  const [f, setF] = useState({ status: 'pending', kind: '', from: '', q: '', page: 1 });
  const [q, setQ] = useState('');
  const state = useAsync(() => adminService.submissions(f), [JSON.stringify(f)]);
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="sk-filters">
        <div className="sk-chip-row" role="group" aria-label="Status">
          {['pending', 'approved', 'published', 'rejected', ''].map((s) => (
            <button key={s || 'all'} type="button" className="sk-chip" aria-pressed={f.status === s} onClick={() => setF({ ...f, status: s, page: 1 })}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</button>
          ))}
        </div>
        <Select label="Kind" value={f.kind} placeholder="All kinds" options={Object.entries(SUBMISSION_KINDS).map(([value, k]) => ({ value, label: k.label }))} onChange={(e) => setF({ ...f, kind: e.target.value, page: 1 })} />
        <Select label="From" value={f.from} placeholder="Everyone" options={[{ value: 'member', label: 'Members' }, { value: 'guest', label: 'Guests (no account)' }]} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} />
        <form className="flex items-end gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q: q.trim(), page: 1 }); }}>
          <TextInput label="Search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, message, reference…" />
          <button type="submit" className="sk-btn sk-btn-sm">Search</button>
        </form>
      </div>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap mt-4">
              <table className="sk-table">
                <thead><tr><th scope="col">Submission</th><th scope="col">Kind</th><th scope="col">From</th><th scope="col">Sent</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((s) => (
                    <Fragment key={s.id}>
                      <tr>
                        <td><span className="sk-clip font-semibold">{s.title || '(untitled)'}</span>{s.reference ? <span className="sk-card-meta block"><code>{s.reference}</code></span> : null}</td>
                        <td>{s.kindLabel}</td>
                        <td>{s.submitter ? s.submitter.name : s.guest ? <><Pill value="guest" label="Guest" />{s.guestName ? <span className="sk-card-meta block">{s.guestName}</span> : null}</> : 'Former member'}</td>
                        <td>{relativeTime(s.createdAt)}</td>
                        <td><Pill value={s.status} />{s.reviewer ? <span className="sk-card-meta block">by {s.reviewer}</span> : null}</td>
                        <td>
                          {s.status === 'pending' ? <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" onClick={() => setOpen(s)}>Review</button>
                            : s.resultType === 'entry' ? <Link className="sk-btn sk-btn-sm" to={`/admin/content/${s.resultId}`}>Open record</Link>
                              : s.resultType === 'media_artist' ? <Link className="sk-btn sk-btn-sm" to={`/admin/media?artist=${s.resultId}`}>Open artist</Link> : null}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : <Empty icon="inbox" title={f.q ? 'Nothing matches your search' : f.status === 'pending' ? 'No submissions waiting' : 'No submissions'} text="Events, personalities, Kirtanis, websites, books, organizations and corrections sent through “Submit / Update Information” appear here." />)}
      </AsyncView>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? `Review: ${open.title || open.kindLabel}` : ''} wide>
        {open ? <Review s={open} onDone={() => { setOpen(null); state.reload(); }} /> : null}
      </Dialog>
    </>
  );
}

const TABS = [['gurdwaras', 'Gurdwara suggestions'], ['information', 'Other information']];

export default function Submissions() {
  usePageMeta('Submissions — Sikhify Admin', undefined, { noindex: true });
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'gurdwaras';
  const countries = useAsync(() => gurdwaraService.countries(), []);
  // Live pending counts for both queues (the same numbers as the dashboard).
  const counts = useAsync(() => adminService.dashboard().then((d) => ({ gurdwaras: d.counts.pendingGurdwaraSubmissions, information: d.counts.pendingSubmissions })), [tab]);

  return (
    <>
      <AdminHeader title="Submissions" sub="Everything the Sangat sends — from members and from visitors without an account. Nothing is published until you approve it." />
      <div className="sk-tabs" role="tablist" aria-label="Submission queues">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setParams(k === 'gurdwaras' ? {} : { tab: k })}>
            {label}{counts.data && counts.data[k] ? <span className="sk-tab-count" aria-label={`${counts.data[k]} pending`}>{counts.data[k]}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="sk-stack">
        {tab === 'gurdwaras' ? <GurdwaraSubmissionsQueue countries={countries.data || []} onChanged={counts.reload} /> : <InformationQueue />}
      </div>
    </>
  );
}
