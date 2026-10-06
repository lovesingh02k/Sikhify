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
import { postService } from '../../services/community/index.js';
import { relativeTime, toast } from '../../utils/format.js';

export default function Posts() {
  usePageMeta('Posts — Sikhify Admin', undefined, { noindex: true });
  const [f, setF] = useState({ q: '', status: '', page: 1 });
  const [q, setQ] = useState('');
  const state = useAsync(() => adminService.posts(f), [JSON.stringify(f)]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = (p, msg) => { setBusy(true); p.then(() => { toast(msg); state.reload(); }).catch((err) => toast(err.message, 'error')).finally(() => { setBusy(false); setConfirm(null); }); };

  return (
    <>
      <AdminHeader title="Posts" sub="Hide posts that break the guidelines (the author is notified and can still see them), or delete them permanently." />
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
                <thead><tr><th scope="col">Post</th><th scope="col">Author</th><th scope="col">Where</th><th scope="col">Status</th><th scope="col">Reports</th><th scope="col">Posted</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {d.items.map((p) => (
                    <tr key={p.id}>
                      <td><Link to={`/community/post/${p.id}`} className="sk-clip">{p.body}</Link>{p.images.length ? <span className="sk-card-meta block">{p.images.length} image(s)</span> : null}</td>
                      <td><Link to={`/community/profile/${p.author.username}`}>{p.author.name}</Link></td>
                      <td>{p.group ? <Link to={`/community/groups/${p.group.slug}`}>{p.group.name}</Link> : 'Public feed'}</td>
                      <td><Pill value={p.status} /></td>
                      <td>{p.openReports ? <Link className="sk-pill sk-pill-pending" to="/admin/reports">{p.openReports} open</Link> : '—'}</td>
                      <td>{relativeTime(p.createdAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {p.status === 'hidden'
                            ? <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => run(postService.moderate(p.id, 'restore'), 'Post restored')}>Restore</button>
                            : <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => run(postService.moderate(p.id, 'hide'), 'Post hidden')}>Hide</button>}
                          <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" disabled={busy} onClick={() => setConfirm(p)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : <Empty icon="message" title="No posts" text={f.q || f.status ? 'Nothing matches these filters.' : 'No one has posted yet.'} />)}
      </AsyncView>
      <ConfirmDialog open={!!confirm} danger title="Delete this post permanently?" confirmLabel="Delete" busy={busy}
        message="The post, its comments and reactions are deleted, and the author is notified. Prefer Hide if it may need to be restored."
        onCancel={() => setConfirm(null)} onConfirm={() => run(postService.remove(confirm.id), 'Post deleted')} />
    </>
  );
}
