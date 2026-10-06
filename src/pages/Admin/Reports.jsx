/* Reports queue: review, act on the reported item, then resolve or dismiss. Reporters are notified. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import { Select, TextArea } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { relativeTime, formatDateTime, toast } from '../../utils/format.js';

function actionsFor(type, isAdmin) {
  const a = [{ value: 'none', label: 'No change to the content' }];
  if (type === 'post' || type === 'comment') a.push({ value: 'hide', label: `Hide the ${type}` }, { value: 'delete', label: `Delete the ${type}` });
  if (type === 'group') a.push({ value: 'suspend_group', label: 'Suspend the group' });
  if (isAdmin && type !== 'group') a.push({ value: 'suspend_user', label: 'Suspend the author’s account' });
  return a;
}

export default function Reports() {
  usePageMeta('Reports — Sikhify Admin', undefined, { noindex: true });
  const { user } = useAuth();
  const [f, setF] = useState({ status: 'pending', page: 1 });
  const state = useAsync(() => adminService.reports(f), [JSON.stringify(f)]);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ action: 'none', note: '' });
  const [busy, setBusy] = useState(false);

  const resolve = (outcome) => {
    setBusy(true);
    adminService.resolveReport(open.id, { outcome, action: form.action, note: form.note })
      .then((r) => { toast(`${outcome === 'resolved' ? 'Resolved' : 'Dismissed'}${r.affected > 1 ? ` (${r.affected} reports about this item)` : ''}`); setOpen(null); state.reload(); })
      .catch((err) => toast(err.message, 'error')).finally(() => setBusy(false));
  };

  return (
    <>
      <AdminHeader title="Reports" sub="Resolving a report closes every open report about the same item." />
      <div className="sk-chip-row" role="group" aria-label="Status">
        {['pending', 'resolved', 'dismissed', ''].map((s) => (
          <button key={s || 'all'} type="button" className="sk-chip" aria-pressed={f.status === s} onClick={() => setF({ status: s, page: 1 })}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</button>
        ))}
      </div>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Reported</th><th scope="col">Reason</th><th scope="col">By</th><th scope="col">When</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((r) => (
                    <tr key={r.id}>
                      <td><span className="sk-badge">{r.targetType}</span> {r.targetLink ? <Link to={r.targetLink} className="sk-clip">{r.targetPreview}</Link> : <span className="sk-clip">{r.targetPreview} <em>(removed)</em></span>}</td>
                      <td>{r.reason}{r.details ? <span className="sk-card-meta block sk-clip">“{r.details}”</span> : null}</td>
                      <td>{r.reporter ? r.reporter.name : '—'}</td>
                      <td title={formatDateTime(r.createdAt)}>{relativeTime(r.createdAt)}</td>
                      <td><Pill value={r.status} />{r.resolution ? <span className="sk-card-meta block">{r.resolution}{r.resolvedBy ? ` — ${r.resolvedBy}` : ''}</span> : null}</td>
                      <td>{r.status === 'pending' ? <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" onClick={() => { setForm({ action: 'none', note: '' }); setOpen(r); }}>Review</button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : <Empty icon="flag" title={f.status === 'pending' ? 'No pending reports' : 'No reports'} text={f.status === 'pending' ? 'All caught up.' : ''} />)}
      </AsyncView>
      <Dialog open={!!open} onClose={() => setOpen(null)} title="Review report">
        {open ? (
          <div className="sk-form">
            <p><strong>{open.reason}</strong> — reported {open.targetType} by {open.reporter ? open.reporter.name : 'a member'}, {relativeTime(open.createdAt)}.</p>
            <blockquote className="sk-comment-bubble">{open.targetPreview}</blockquote>
            {open.details ? <p>Reporter&apos;s note: “{open.details}”</p> : null}
            {open.targetLink ? <Link className="panel-view-all" to={open.targetLink} target="_blank">Open the {open.targetType} in a new tab ↗</Link> : null}
            <Select label="Action" value={form.action} options={actionsFor(open.targetType, user.role === 'admin')} onChange={(e) => setForm({ ...form, action: e.target.value })} />
            <TextArea label="Note (kept in the moderation log)" rows={2} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="sk-btn" disabled={busy} onClick={() => resolve('dismissed')}>Dismiss — no violation</button>
              <button type="button" className="sk-btn sk-btn-gold" disabled={busy} onClick={() => resolve('resolved')}>Resolve{form.action !== 'none' ? ' & apply action' : ''}</button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
