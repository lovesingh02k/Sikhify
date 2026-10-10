/* ==========================================================================
   /admin/gurdwaras — Global Gurdwara Directory CMS.
   Dashboard numbers, records (search / filter / open), the community
   submission queue (approve · request changes · reject, with duplicate
   comparison), possible duplicates, and CSV/JSON import with a dry run.
   Nothing is ever marked verified automatically.
   ========================================================================== */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminHeader, StatTile, FilterBar } from '../../components/admin/AdminKit.jsx';
import { RecordFields, SourceFields, DuplicateList, EMPTY_RECORD, recordBody } from '../../components/gurdwaras/AdminBits.jsx';
import { StatusBadge } from '../../components/gurdwaras/GurdwaraBits.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { TextArea, TextInput, Select, FormError, Checkbox } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { STATUSES } from '../../../../shared/gurdwaras.js';
import { relativeTime, toast } from '../../utils/format.js';

const TABS = [['records', 'Records'], ['submissions', 'Submissions'], ['duplicates', 'Possible Duplicates'], ['import', 'Import']];
const SUB_LABEL = { pending: 'Pending', changes_requested: 'Changes requested', approved: 'Approved', rejected: 'Rejected' };
const SUB_PILL = { pending: 'pending', changes_requested: 'needs_review', approved: 'approved', rejected: 'rejected' };

/* ------------------------------------------------------------------ records */
/**
 * Review & verify: the evidence for each selected record is checked first (read-only), using the same rules
 * as the bulk audit script — Wikidata item, name, location, and a Wikipedia article or responding official
 * website. Only records that meet the rules are pre-ticked; the reviewer can untick any, must say what they
 * checked and confirm. Nothing is verified without this preview.
 */
function ReviewVerify({ ids, onDone, onClose }) {
  const preview = useAsync(() => gurdwaraService.admin.evidencePreview(ids), [ids.join(',')]);
  const [chosen, setChosen] = useState(null);
  const [note, setNote] = useState('');
  const [sure, setSure] = useState(false);
  const [st, setSt] = useState({ busy: false, error: null, fields: {} });
  const items = preview.data || [];
  const picked = chosen || items.filter((x) => x.meets).map((x) => x.id);
  const toggle = (id) => setChosen(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const run = () => {
    if (!sure) { setSt({ busy: false, error: null, fields: { sure: 'Confirm that you checked the evidence' } }); return; }
    setSt({ busy: true, error: null, fields: {} });
    gurdwaraService.admin.verifyBulk(picked, note)
      .then((res) => {
        toast(`${res.verified} verified${res.skipped.length ? `, ${res.skipped.length} skipped (${[...new Set(res.skipped.map((x) => x.reason))].join(', ')})` : ''}`);
        onDone();
      })
      .catch((err) => setSt({ busy: false, error: err, fields: err.fields || {} }));
  };
  return (
    <div className="sk-form">
      <p className="sk-card-meta" style={{ marginTop: 0 }}>Checking the evidence for {ids.length} record{ids.length === 1 ? '' : 's'}. Records that meet every rule are ticked; the rest stay “needs verification”.</p>
      <AsyncView state={preview} loading={<p className="sk-card-meta">Checking sources (Wikidata, Wikipedia, websites)…</p>} errorTitle="The evidence couldn’t be checked">
        {() => (
          <ul className="sk-evidence-list">
            {items.map((x) => (
              <li key={x.id} className={x.meets ? 'is-ok' : ''}>
                <label className="sk-gcheck">
                  <input type="checkbox" checked={picked.includes(x.id)} disabled={x.verification === 'verified'} onChange={() => toggle(x.id)} />
                  <span className="font-semibold">{x.name}</span>
                </label>
                {x.meets ? <p className="sk-evidence-ok">Meets the rules{x.evidence.distanceKm !== undefined ? ` · location matches (${x.evidence.distanceKm} km)` : ''}</p>
                  : <p className="sk-evidence-why">{x.reasons.join(' · ')}</p>}
                <p className="sk-card-meta" style={{ marginTop: 2 }}>
                  {[['Wikidata', x.evidence.wikidata], ['Wikipedia', x.evidence.wikipedia], ['Website', x.evidence.websiteDead ? '' : x.evidence.website], ['OpenStreetMap', x.evidence.osm]].filter(([, u]) => u)
                    .map(([label, u]) => <a key={label} className="panel-view-all" href={u} target="_blank" rel="noopener noreferrer" style={{ marginRight: '0.75rem' }}>{label} ↗</a>)}
                  {x.manual ? x.sources.filter((src) => src.url).map((src) => <a key={src.url} className="panel-view-all" href={src.url} target="_blank" rel="noopener noreferrer" style={{ marginRight: '0.75rem' }}>{src.name} ↗</a>) : null}
                  <a className="panel-view-all" href={x.url} target="_blank" rel="noopener noreferrer">Listing ↗</a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
      <FormError error={st.error} />
      <TextInput label="What did you check?" required value={note} onChange={(e) => setNote(e.target.value)} error={st.fields.note} maxLength={1000}
        help="Kept in each record’s verification log." placeholder="e.g. Checked the Wikidata item and Wikipedia article for each record" />
      <Checkbox label={`I checked the evidence for the ${picked.length} ticked record${picked.length === 1 ? '' : 's'}`} checked={sure} onChange={setSure} />
      {st.fields.sure ? <p className="sk-form-error" role="alert">{st.fields.sure}</p> : null}
      <div className="sk-admin-actions">
        <button type="button" className="sk-btn" onClick={onClose}>Cancel</button>
        <span className="sk-admin-actions-gap" />
        <button type="button" className="sk-btn sk-btn-gold" disabled={st.busy || !picked.length || preview.loading} onClick={run}>{st.busy ? 'Verifying…' : `Verify ${picked.length} record${picked.length === 1 ? '' : 's'}`}</button>
      </div>
    </div>
  );
}

const MISSING_LABEL = { coordinates: 'No coordinates', address: 'No address', contact: 'No phone or website', source: 'No cited source', photo: 'No photo' };
const ORIGIN_LABEL = { wikidata: 'Wikidata import', osm: 'OpenStreetMap import', manual: 'Added by people' };

function Records({ onChanged }) {
  const initial = new URLSearchParams(window.location.search);
  const [f, setF] = useState(() => ({ q: '', status: '', verification: ['verified', 'needs_verification'].includes(initial.get('verification')) ? initial.get('verification') : '', archived: '', state: initial.get('state') || '', district: '', origin: '', missing: '', page: 1 }));
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [selected, setSelected] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const state = useAsync(() => gurdwaraService.admin.list(f), [JSON.stringify(f)]);
  const india = useAsync(() => gurdwaraService.locations('india'), []);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const set = (patch) => setF({ ...f, ...patch, page: 1 });
  return (
    <>
      <FilterBar>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); set({ q, district }); }}>
          <TextInput label="Search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, postal code, phone…" />
          <Select label="Verification" value={f.verification} placeholder="Any" options={[{ value: 'verified', label: 'Verified' }, { value: 'needs_verification', label: 'Needs verification' }]} onChange={(e) => set({ verification: e.target.value })} />
          <Select label="Indian state" value={f.state} placeholder="Any state" options={((india.data && india.data.states) || []).map((x) => ({ value: x.slug, label: `${x.name} (${x.total})` }))} onChange={(e) => set({ state: e.target.value, country: e.target.value ? 'india' : '' })} />
          <TextInput label="District or city" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Bilaspur" />
          <Select label="Came from" value={f.origin} placeholder="Anywhere" options={Object.entries(ORIGIN_LABEL).map(([value, label]) => ({ value, label }))} onChange={(e) => set({ origin: e.target.value })} />
          <Select label="Missing" value={f.missing} placeholder="Anything" options={Object.entries(MISSING_LABEL).map(([value, label]) => ({ value, label }))} onChange={(e) => set({ missing: e.target.value })} />
          <Select label="Status" value={f.status} placeholder="Any status" options={Object.entries(STATUSES).map(([k, x]) => ({ value: k, label: x.label }))} onChange={(e) => set({ status: e.target.value })} />
          <Select label="Show" value={f.archived} options={[{ value: '', label: 'Published (listed)' }, { value: '1', label: 'Archived (unpublished)' }]} onChange={(e) => set({ archived: e.target.value })} />
          <button type="submit" className="sk-btn sk-btn-sm">Search</button>
        </form>
      </FilterBar>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (() => {
          // Only records still awaiting verification can be ticked (the bulk action is "Review & verify").
          const selectable = d.items.filter((g) => g.verification !== 'verified' && !g.archived).map((g) => g.id);
          const allTicked = selectable.length > 0 && selectable.every((id) => selected.includes(id));
          return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="sk-card-meta" style={{ marginTop: 0 }}>{d.total.toLocaleString('en-IN')} records</p>
              {selected.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="sk-card-meta" style={{ marginTop: 0 }}>{selected.length} selected</span>
                  <button type="button" className="sk-btn sk-btn-sm" onClick={() => setSelected([])}>Clear</button>
                  <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" disabled={selected.length > 50} onClick={() => setReviewing(true)}>Review &amp; verify…</button>
                </div>
              ) : selectable.length
                ? <p className="sk-card-meta" style={{ marginTop: 0 }}>Tick records awaiting verification to review their evidence (up to 50 at a time).</p>
                : <p className="sk-card-meta" style={{ marginTop: 0 }}>Every record on this page is already verified — there is nothing to select.</p>}
            </div>
            <div className="sk-table-wrap mt-2">
              <table className="sk-table">
                <thead><tr><th scope="col">{selectable.length ? (
                  <input type="checkbox" className="sk-gcheck-box" checked={allTicked}
                    aria-label={allTicked ? 'Untick all unverified records on this page' : `Select all ${selectable.length} unverified records on this page`}
                    title={allTicked ? 'Untick all' : `Select all ${selectable.length} unverified records`}
                    onChange={(e) => setSelected((x) => (e.target.checked ? [...new Set([...x, ...selectable])] : x.filter((y) => !selectable.includes(y))))} />
                ) : <span className="sr-only">Select</span>}</th><th scope="col">Gurdwara</th><th scope="col">Place</th><th scope="col">Status</th><th scope="col">Sources</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((g) => (
                    <tr key={g.id}>
                      <td>{g.verification !== 'verified' && !g.archived ? <input type="checkbox" className="sk-gcheck-box" aria-label={`Select ${g.name}`} checked={selected.includes(g.id)} onChange={() => toggle(g.id)} /> : null}</td>
                      <td><Link className="font-semibold" to={`/admin/gurdwaras/${g.id}`}>{g.name}</Link>
                        <span className="sk-warn-row">{!g.hasCoordinates ? <span className="sk-warn-chip">No coordinates</span> : null}{!g.hasAddress ? <span className="sk-warn-chip">No address</span> : null}{!g.sourceCount ? <span className="sk-warn-chip">No source</span> : null}</span></td>
                      <td>{[g.city, g.district && g.district !== g.city ? g.district : '', g.state, g.country].filter(Boolean).join(', ')}</td>
                      <td><StatusBadge status={g.status} verification={g.verification} />{g.archived ? <span className="sk-card-meta block">Archived</span> : null}</td>
                      <td>{g.sourceCount}<span className="sk-card-meta block">{ORIGIN_LABEL[g.origin]}</span></td>
                      <td>{relativeTime(g.updatedAt)}</td>
                      <td className="whitespace-nowrap">
                        <Link className="sk-btn sk-btn-sm" to={`/admin/gurdwaras/${g.id}`}>Edit</Link>{' '}
                        {!g.archived ? <Link className="sk-btn sk-btn-sm" to={g.url} target="_blank">View ↗</Link> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
          );
        })() : (
          <Empty icon="pin" title={f.q || f.status || f.verification || f.archived || f.state || f.district || f.origin || f.missing ? 'No records match' : 'No Gurdwaras in the directory yet'}
            text={f.q || f.status || f.verification || f.archived || f.state || f.district || f.origin || f.missing ? 'Try different filters.' : 'Add the first record, import a CSV/JSON file from a reliable source, or review community suggestions.'}>
            <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/admin/gurdwaras/new">Add a Gurdwara</Link>
          </Empty>
        ))}
      </AsyncView>
      <Dialog open={reviewing} onClose={() => setReviewing(false)} title="Review & verify" wide>
        {reviewing ? <ReviewVerify ids={selected} onClose={() => setReviewing(false)} onDone={() => { setReviewing(false); setSelected([]); state.reload(); onChanged(); }} /> : null}
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ submission review */
function Review({ s, countries, onDone }) {
  const isNew = s.kind === 'new';
  const [record, setRecord] = useState(() => ({ ...EMPTY_RECORD, name: s.name || '', country: s.country || '', state: s.state || '', city: s.city || '', address: s.address || '', website: s.website || '', phone: s.phone || '' }));
  const [source, setSource] = useState({ name: '', url: '', type: 'official_website', notes: '' });
  const [verify, setVerify] = useState(false);
  const [note, setNote] = useState('');
  const [dupes, setDupes] = useState(s.possibleDuplicates || []);
  const [st, setSt] = useState({ busy: false, error: null, fields: {}, conflict: false });

  const decide = (decision, extra = {}) => {
    setSt({ busy: true, error: null, fields: {}, conflict: false });
    const body = { decision, note, ...extra };
    if (decision === 'approve') {
      // For an update, only fields the reviewer filled in are applied.
      body.record = isNew ? recordBody(record) : Object.fromEntries(Object.entries(recordBody(record)).filter(([k, v]) => k !== 'status' && v !== '' && v !== null && !(Array.isArray(v) && !v.length)));
      if (source.name) body.source = source;
      body.verify = verify;
    }
    gurdwaraService.admin.review(s.id, body)
      .then((res) => { toast(`Submission ${SUB_LABEL[res.status].toLowerCase()}`); onDone(res); })
      .catch((err) => {
        if (err.code === 'possible_duplicates') { setDupes(err.fields.duplicates); setSt({ busy: false, error: err, fields: {}, conflict: true }); return; }
        setSt({ busy: false, error: err, fields: err.fields || {}, conflict: false });
      });
  };

  return (
    <div className="sk-form">
      <p><strong>{isNew ? 'New Gurdwara' : 'Update'}</strong> from <SubmitterLabel s={s} />, {relativeTime(s.createdAt)}{s.reference ? <> · reference <code>{s.reference}</code></> : null}.
        {!isNew && s.targetUrl ? <> About <Link className="panel-view-all" to={s.targetUrl} target="_blank">{s.name} ↗</Link> · <Link className="panel-view-all" to={`/admin/gurdwaras/${s.gurdwaraId}`} target="_blank">open in editor ↗</Link></> : null}</p>
      <div className="sk-note">
        <div>
          <p><strong>Submitted source:</strong> {/^https?:\/\//i.test(s.source) ? <a className="panel-view-all" href={s.source} target="_blank" rel="noopener noreferrer">{s.source}</a> : s.source}</p>
          {s.details ? <p className="mt-1"><strong>{isNew ? 'Additional information' : 'Requested update'}:</strong> <span style={{ whiteSpace: 'pre-line' }}>{s.details}</span></p> : null}
          {!isNew ? <p className="mt-1 sk-card-meta">Submitted values: {[s.address && `address “${s.address}”`, s.phone && `phone “${s.phone}”`, s.website && `website “${s.website}”`].filter(Boolean).join(', ') || 'none'}</p> : null}
        </div>
      </div>
      <FormError error={st.error} />
      {isNew ? <DuplicateList items={dupes} candidate={record} onMerge={(d) => decide('approve', { mergeIntoId: d.id })} /> : null}
      {st.conflict ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="sk-btn sk-btn-sm" disabled={st.busy} onClick={() => decide('approve', { force: true })}>It’s a different Gurdwara — create it anyway</button>
        </div>
      ) : null}
      <p className="sk-card-meta">{isNew ? 'Check every field against a reliable source and correct it before approving.' : 'Fill in only the fields that should change; empty fields are left as they are.'}</p>
      {isNew ? <RecordFields value={record} onChange={setRecord} errors={st.fields} countries={countries} compact /> : (
        <RecordFields value={record} onChange={setRecord} errors={{}} countries={countries} compact showStatus={false} />
      )}
      <fieldset className="sk-card" style={{ padding: '1rem' }}>
        <legend className="sk-form-label" style={{ padding: '0 0.4rem' }}>Source you checked</legend>
        <SourceFields value={source} onChange={setSource} errors={st.fields} />
        <div className="mt-3"><Checkbox label="Verified — I confirmed these details with the source above" checked={verify} onChange={setVerify}
          help="Leave unticked to add the listing as “needs verification” (it is listed publicly with that label)." /></div>
      </fieldset>
      <TextArea label="Note to the submitter" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} error={st.fields.note} help="Required when rejecting or requesting changes. The submitter sees this note." />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="sk-btn sk-btn-danger" disabled={st.busy} onClick={() => decide('reject')}>Reject</button>
        <button type="button" className="sk-btn" disabled={st.busy} onClick={() => decide('request_changes')}>Request Changes</button>
        <button type="button" className="sk-btn sk-btn-gold" disabled={st.busy} onClick={() => decide('approve')}>{st.busy ? 'Saving…' : verify ? 'Approve & verify' : 'Approve'}</button>
      </div>
    </div>
  );
}

/** Who sent a suggestion. Guests' optional contact details are shown to reviewers for follow-up only. */
export function SubmitterLabel({ s }) {
  if (s.submitter) return <Link to={`/community/profile/${s.submitter.username}`}>{s.submitter.name}</Link>;
  if (s.guest) {
    return (
      <span><span className="sk-pill sk-pill-guest">Guest</span> {s.guestName || 'visitor without an account'}
        {s.guestEmail ? <> · <a className="panel-view-all" href={`mailto:${s.guestEmail}`}>{s.guestEmail}</a></> : null}</span>
    );
  }
  return <span>a former member</span>;
}

/** The "Suggest a Gurdwara" review queue (also shown in Admin → Submissions). */
export function GurdwaraSubmissionsQueue({ countries, onChanged = () => {} }) {
  const [f, setF] = useState({ status: 'pending', from: '', q: '', page: 1 });
  const [q, setQ] = useState('');
  const state = useAsync(() => gurdwaraService.admin.submissions(f), [JSON.stringify(f)]);
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="sk-filters">
        <div className="sk-chip-row" role="group" aria-label="Status">
          {['pending', 'changes_requested', 'approved', 'rejected', ''].map((s) => (
            <button key={s || 'all'} type="button" className="sk-chip" aria-pressed={f.status === s} onClick={() => setF({ ...f, status: s, page: 1 })}>{s ? SUB_LABEL[s] : 'All'}</button>
          ))}
        </div>
        <Select label="From" value={f.from} placeholder="Everyone" options={[{ value: 'member', label: 'Members' }, { value: 'guest', label: 'Guests (no account)' }]} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} />
        <form className="flex items-end gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q: q.trim(), page: 1 }); }}>
          <TextInput label="Search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, place, reference…" />
          <button type="submit" className="sk-btn sk-btn-sm">Search</button>
        </form>
      </div>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap mt-4">
              <table className="sk-table">
                <thead><tr><th scope="col">Suggestion</th><th scope="col">Place</th><th scope="col">From</th><th scope="col">Sent</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((s) => (
                    <tr key={s.id}>
                      <td><span className="sk-clip font-semibold">{s.name}</span><span className="sk-card-meta block">{s.kind === 'update' ? 'Update' : 'New'}{s.possibleDuplicates && s.possibleDuplicates.length ? ' · possible duplicate' : ''}</span></td>
                      <td>{[s.city, s.state, s.country].filter(Boolean).join(', ') || '—'}</td>
                      <td>{s.submitter ? s.submitter.name : s.guest ? <><span className="sk-pill sk-pill-guest">Guest</span>{s.guestName ? <span className="sk-card-meta block">{s.guestName}</span> : null}</> : 'Former member'}</td>
                      <td>{relativeTime(s.createdAt)}{s.reference ? <span className="sk-card-meta block"><code>{s.reference}</code></span> : null}</td>
                      <td><span className={`sk-pill sk-pill-${SUB_PILL[s.status]}`}>{SUB_LABEL[s.status]}</span>{s.reviewer ? <span className="sk-card-meta block">by {s.reviewer}</span> : null}</td>
                      <td>
                        {s.status === 'pending' ? <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" onClick={() => setOpen(s)}>Review</button>
                          : s.resultGurdwaraId ? <Link className="sk-btn sk-btn-sm" to={`/admin/gurdwaras/${s.resultGurdwaraId}`}>Open record</Link> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : <Empty icon="inbox" title={f.q ? 'No suggestions match your search' : f.status === 'pending' ? 'No suggestions waiting' : 'No suggestions'} text="Suggestions from the “Suggest a Gurdwara” form — from members and from visitors without an account — appear here." />)}
      </AsyncView>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? `Review: ${open.name}` : ''} wide>
        {open ? <Review s={open} countries={countries} onDone={() => { setOpen(null); state.reload(); onChanged(); }} /> : null}
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ duplicates */
function Duplicates() {
  const state = useAsync(() => gurdwaraService.admin.duplicatePairs(), []);
  const [merging, setMerging] = useState(null); // { keep, dup }
  const [note, setNote] = useState('');
  const [st, setSt] = useState({ busy: false, error: null });
  const merge = () => {
    setSt({ busy: true, error: null });
    gurdwaraService.admin.merge(merging.dup.id, merging.keep.id, note)
      .then((r) => { toast(`Merged — moved ${r.moved.sources} source(s), ${r.moved.images} photo(s); the duplicate is archived`); setMerging(null); setNote(''); setSt({ busy: false, error: null }); state.reload(); })
      .catch((err) => setSt({ busy: false, error: err }));
  };
  return (
    <>
    <AsyncView state={state}>
      {(items) => (items.length ? (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <li key={`${p.a.id}-${p.b.id}`} className="sk-card" style={{ padding: '1rem' }}>
              <p className="sk-card-meta" style={{ marginTop: 0 }}>{p.reasons.join(' · ')}</p>
              <div className="sk-gpair mt-2">
                {[p.a, p.b].map((g) => (
                  <div key={g.id}>
                    <p className="font-semibold"><Link to={`/admin/gurdwaras/${g.id}`}>{g.name}</Link></p>
                    <p className="sk-card-meta">{g.city}, {g.country} · {g.verification === 'verified' ? 'Verified' : 'Needs verification'}</p>
                    <p className="sk-card-meta">{g.phone || 'No phone'} · {g.website ? g.website.replace(/^https?:\/\//, '') : 'No website'}</p>
                  </div>
                ))}
              </div>
              <p className="sk-card-meta">If they are the same Gurdwara, keep one: the other&apos;s sources, photos and facilities move into it and it is archived (nothing is deleted).</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" className="sk-btn sk-btn-sm" onClick={() => setMerging({ keep: p.a, dup: p.b })}>Keep “{p.a.name}”, merge the other</button>
                <button type="button" className="sk-btn sk-btn-sm" onClick={() => setMerging({ keep: p.b, dup: p.a })}>Keep “{p.b.name}”, merge the other</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <Empty icon="check" title="No possible duplicates" text="Records with the same name in the same city, the same phone number or the same website appear here." />)}
    </AsyncView>
    <Dialog open={!!merging} onClose={() => setMerging(null)} title="Merge duplicate records?">
      {merging ? (
        <div className="sk-form">
          <p>Keep <strong>{merging.keep.name}</strong> (#{merging.keep.id}). <strong>{merging.dup.name}</strong> (#{merging.dup.id}) will be archived after its sources, photos and facilities are moved over.</p>
          <FormError error={st.error} />
          <TextInput label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Same Gurdwara, two spellings" />
          <div className="sk-admin-actions">
            <button type="button" className="sk-btn" onClick={() => setMerging(null)}>Cancel</button>
            <span className="sk-admin-actions-gap" />
            <button type="button" className="sk-btn sk-btn-gold" disabled={st.busy} onClick={merge}>{st.busy ? 'Merging…' : 'Merge'}</button>
          </div>
        </div>
      ) : null}
    </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ import */
const CSV_COLUMNS = 'name, official_name, also_known_as, country, state, city, address, postal_code, latitude, longitude, phone, email, website, description, programs, opening_hours, established_year, management_organization, status, facilities, services, source_name, source_url, source_type';

function Import({ onChanged }) {
  const [file, setFile] = useState(null);
  const [st, setSt] = useState({ busy: false, error: null, report: null, dryRun: true });
  const format = file && /\.json$/i.test(file.name) ? 'json' : 'csv';
  async function run(dryRun) {
    if (!file) return;
    setSt({ ...st, busy: true, error: null });
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('Files must be 8 MB or smaller — split larger imports.');
      const content = await file.text();
      const res = await gurdwaraService.admin.importFile(format, content, dryRun);
      setSt({ busy: false, error: null, report: res.report, dryRun: res.dryRun });
      if (!dryRun) { toast('Import finished'); onChanged(); }
    } catch (err) { setSt({ ...st, busy: false, error: err }); }
  }
  const r = st.report;
  return (
    <div className="sk-stack">
      <div className="sk-card">
        <h3 className="sk-card-title">Import from CSV or JSON</h3>
        <p className="sk-card-text">Only import data from reliable sources (official websites, Sikh institutions, verified local organisations). Imported records are always added as <strong>needs verification</strong>; rows that look like an existing Gurdwara are skipped as duplicates. A row with an <code>id</code> column updates that record.</p>
        <p className="sk-card-meta">CSV columns: <code>{CSV_COLUMNS}</code>. Facilities/services are separated with <code>;</code> (e.g. <code>langar;parking</code>). JSON: an array of objects with the same keys. Up to 5,000 rows per file.</p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <label className="sk-btn sk-btn-sm">
            <Icon name="upload" size={14} />{file ? file.name : 'Choose file…'}
            <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(e) => { setFile(e.target.files[0] || null); setSt({ busy: false, error: null, report: null, dryRun: true }); }} />
          </label>
          <button type="button" className="sk-btn sk-btn-sm" disabled={!file || st.busy} onClick={() => run(true)}>{st.busy && st.dryRun ? 'Checking…' : 'Check file (dry run)'}</button>
          {r && st.dryRun && r.imported + r.updated > 0 ? <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" disabled={st.busy} onClick={() => run(false)}>Import {r.imported + r.updated} rows</button> : null}
        </div>
        <div className="mt-3"><FormError error={st.error} /></div>
      </div>
      {r ? (
        <div className="sk-card">
          <h3 className="sk-card-title">{st.dryRun ? 'Dry run — nothing has been saved yet' : 'Import report'}</h3>
          <div className="sk-grid sk-grid-3 mt-3 sk-gimport-stats">
            <StatTile label={st.dryRun ? 'Would import' : 'Imported'} value={r.imported} />
            <StatTile label={st.dryRun ? 'Would update' : 'Updated'} value={r.updated} />
            <StatTile label="Duplicates skipped" value={r.duplicates} />
            <StatTile label="Invalid rows" value={r.invalid} />
            <StatTile label="Needs verification" value={r.needsVerification} />
            <StatTile label="Rows in file" value={r.total} />
          </div>
          {r.rows.some((x) => x.result !== 'imported' && x.result !== 'updated') ? (
            <div className="sk-table-wrap mt-4">
              <table className="sk-table">
                <thead><tr><th scope="col">Line</th><th scope="col">Result</th><th scope="col">Name</th><th scope="col">Details</th></tr></thead>
                <tbody>
                  {r.rows.filter((x) => x.result === 'invalid' || x.result === 'duplicate').map((x) => (
                    <tr key={x.line}>
                      <td>{x.line}</td>
                      <td><span className={`sk-pill sk-pill-${x.result === 'invalid' ? 'rejected' : 'needs_review'}`}>{x.result}</span></td>
                      <td>{x.name || '—'}</td>
                      <td>{x.result === 'duplicate' ? <>Matches <Link to={`/admin/gurdwaras/${x.matchId}`}>{x.matchName}</Link> ({(x.reasons || []).join(', ')})</> : x.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function AdminGurdwaras() {
  usePageMeta('Gurdwara Directory — Sikhify Admin', undefined, { noindex: true });
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'records';
  const stats = useAsync(() => gurdwaraService.admin.stats(), []);
  const countries = useAsync(() => gurdwaraService.countries(), []);
  const s = stats.data || {};
  const setTab = (k) => setParams(k === 'records' ? {} : { tab: k });

  return (
    <>
      <AdminHeader title="Gurdwara Directory" sub="Every listing, community suggestion and import. Records are verified only by a person, against a reliable source."
        actions={<><Link className="sk-btn" to="/directory/gurdwaras" target="_blank">View directory ↗</Link><Link className="sk-btn sk-btn-gold" to="/admin/gurdwaras/new"><Icon name="plus" size={15} />Add a Gurdwara</Link></>} />
      <div className="sk-gadmin-stats">
        <StatTile label="Total Gurdwaras" value={s.total} note={s.countries !== undefined ? `${s.countries} ${s.countries === 1 ? 'country' : 'countries'}` : undefined} />
        <StatTile label="Active" value={s.active} />
        <StatTile label="Needs Verification" value={s.needsVerification} />
        <StatTile label="Pending Submissions" value={s.pendingSubmissions} />
        <StatTile label="Possible Duplicates" value={s.possibleDuplicates} />
      </div>
      {stats.error ? <FormError error={stats.error} /> : null}
      <div className="sk-tabs" role="tablist" aria-label="Directory sections">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}>
            {label}{k === 'submissions' && s.pendingSubmissions ? ` (${s.pendingSubmissions})` : k === 'duplicates' && s.possibleDuplicates ? ` (${s.possibleDuplicates})` : ''}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="sk-stack">
        {tab === 'records' ? <Records onChanged={stats.reload} /> : null}
        {tab === 'submissions' ? <GurdwaraSubmissionsQueue countries={countries.data || []} onChanged={stats.reload} /> : null}
        {tab === 'duplicates' ? <Duplicates /> : null}
        {tab === 'import' ? <Import onChanged={stats.reload} /> : null}
      </div>
    </>
  );
}
