import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill, FilterBar } from '../../components/admin/AdminKit.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { TextInput, Select } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { formatDate, toast } from '../../utils/format.js';

export default function Groups() {
  usePageMeta('Groups — Sikhify Admin', undefined, { noindex: true });
  const [f, setF] = useState({ q: '', status: '' });
  const [q, setQ] = useState('');
  const state = useAsync(() => adminService.groups(f), [JSON.stringify(f)]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const setStatus = (g, status) => {
    setBusy(true);
    adminService.setGroupStatus(g.id, status).then(() => { toast(status === 'suspended' ? 'Group suspended' : 'Group reinstated'); state.reload(); })
      .catch((err) => toast(err.message, 'error')).finally(() => { setBusy(false); setConfirm(null); });
  };

  return (
    <>
      <AdminHeader title="Groups" sub="Suspended groups are hidden from everyone except staff and the group's admins, who are notified." />
      <FilterBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q }); }}>
          <TextInput label="Search" placeholder="Group name" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="sk-btn">Search</button>
        </form>
        <Select label="Status" value={f.status} placeholder="All" options={['active', 'suspended']} onChange={(e) => setF({ ...f, status: e.target.value })} />
      </FilterBar>
      <AsyncView state={state}>
        {(items) => (items.length ? (
          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead><tr><th scope="col">Group</th><th scope="col">Category</th><th scope="col">Privacy</th><th scope="col">Members</th><th scope="col">Posts</th><th scope="col">Created by</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {items.map((g) => (
                  <tr key={g.id}>
                    <td><Link to={`/community/groups/${g.slug}`}>{g.name}</Link><span className="sk-card-meta block">{formatDate(g.createdAt)}</span></td>
                    <td>{g.category}</td>
                    <td>{g.privacy}</td>
                    <td>{g.memberCount}</td>
                    <td>{g.postCount}</td>
                    <td>{g.creator ? <Link to={`/community/profile/${g.creator.username}`}>{g.creator.name}</Link> : '—'}</td>
                    <td><Pill value={g.status} /></td>
                    <td>
                      {g.status === 'active'
                        ? <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" disabled={busy} onClick={() => setConfirm(g)}>Suspend</button>
                        : <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => setStatus(g, 'active')}>Reinstate</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon="users" title="No groups" />)}
      </AsyncView>
      <ConfirmDialog open={!!confirm} danger title={confirm ? `Suspend ${confirm.name}?` : ''} confirmLabel="Suspend group" busy={busy}
        message="Members can no longer see or post in it until it is reinstated. Its admins are notified."
        onCancel={() => setConfirm(null)} onConfirm={() => setStatus(confirm, 'suspended')} />
    </>
  );
}
