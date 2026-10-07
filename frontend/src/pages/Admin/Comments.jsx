import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill, FilterBar } from '../../components/admin/AdminKit.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { TextInput, Select } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { commentService } from '../../services/community/index.js';
import { relativeTime, toast } from '../../utils/format.js';

export default function Comments() {
  usePageMeta('Comments — Sikhify Admin', undefined, { noindex: true });
  const [f, setF] = useState({ q: '', status: '', page: 1 });
  const [q, setQ] = useState('');
  const state = useAsync(() => adminService.comments(f), [JSON.stringify(f)]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = (p, msg) => { setBusy(true); p.then(() => { toast(msg); state.reload(); }).catch((err) => toast(err.message, 'error')).finally(() => { setBusy(false); setConfirm(null); }); };

  return (
    <>
      <AdminHeader title="Comments" sub="Hide or delete comments that break the guidelines. Authors are notified." />
      <FilterBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q, page: 1 }); }}>
          <TextInput label="Search" placeholder="Text or author" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="sk-btn">Search</button>
        </form>
        <Select label="Status" value={f.status} placeholder="All" options={['published', 'hidden']} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} />
      </FilterBar>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Comment</th><th scope="col">Author</th><th scope="col">Status</th><th scope="col">Reports</th><th scope="col">Posted</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {d.items.map((c) => (
                    <tr key={c.id}>
                      <td><Link to={`/community/post/${c.postId}#comment-${c.id}`} className="sk-clip">{c.body}</Link></td>
                      <td><Link to={`/community/profile/${c.author.username}`}>{c.author.name}</Link></td>
                      <td><Pill value={c.status} /></td>
                      <td>{c.openReports ? <Link className="sk-pill sk-pill-pending" to="/admin/reports">{c.openReports} open</Link> : '—'}</td>
                      <td>{relativeTime(c.createdAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => run(commentService.moderate(c.id, c.status === 'hidden' ? 'restore' : 'hide'), c.status === 'hidden' ? 'Comment restored' : 'Comment hidden')}>{c.status === 'hidden' ? 'Restore' : 'Hide'}</button>
                          <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" disabled={busy} onClick={() => setConfirm(c)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : <Empty icon="message" title="No comments" text={f.q || f.status ? 'Nothing matches these filters.' : 'No comments yet.'} />)}
      </AsyncView>
      <ConfirmDialog open={!!confirm} danger title="Delete this comment permanently?" confirmLabel="Delete" busy={busy} message="Its replies are deleted too, and the author is notified."
        onCancel={() => setConfirm(null)} onConfirm={() => run(commentService.remove(confirm.id), 'Comment deleted')} />
    </>
  );
}
