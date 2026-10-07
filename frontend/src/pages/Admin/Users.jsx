/* Users: search and filter; Master Admins change roles and status (suspend / ban / reinstate) and can issue reset links. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill, FilterBar } from '../../components/admin/AdminKit.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Dialog, { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { TextInput, Select } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { formatDate, relativeTime, toast } from '../../utils/format.js';
import { ROLE_LABELS, SITE_ROLES, USER_STATUSES } from '../../../../shared/roles.js';

export default function Users() {
  usePageMeta('Users — Sikhify Admin', undefined, { noindex: true });
  const { user: me, can } = useAuth();
  const [f, setF] = useState({ q: '', role: '', status: '', page: 1 });
  const [q, setQ] = useState('');
  const state = useAsync(() => adminService.users(f), [JSON.stringify(f)]);
  const [confirm, setConfirm] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const manage = can('user.manage');

  const apply = (u, input, msg) => {
    setBusy(true);
    adminService.updateUser(u.id, input).then((nu) => {
      state.setData((d) => ({ ...d, items: d.items.map((x) => (x.id === nu.id ? { ...x, ...nu } : x)) }));
      toast(msg);
    }).catch((err) => toast(err.message, 'error')).finally(() => { setBusy(false); setConfirm(null); });
  };

  return (
    <>
      <AdminHeader title="Users" sub={manage ? 'Change roles and account status. Every change is logged and the person is notified.' : 'Moderators can view members; only Master Admins change roles or status.'} />
      <FilterBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q, page: 1 }); }}>
          <TextInput label="Search" placeholder="Name, username or email" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="sk-btn">Search</button>
        </form>
        <Select label="Role" value={f.role} placeholder="All roles" options={SITE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} onChange={(e) => setF({ ...f, role: e.target.value, page: 1 })} />
        <Select label="Status" value={f.status} placeholder="Any status" options={USER_STATUSES} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} />
      </FilterBar>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <p className="sk-card-meta">{d.total} user{d.total === 1 ? '' : 's'}</p>
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Member</th>{d.canManage ? <th scope="col">Email</th> : null}<th scope="col">Role</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col">Last sign-in</th><th scope="col">Posts</th>{manage ? <th scope="col">Actions</th> : null}</tr></thead>
                <tbody>
                  {d.items.map((u) => {
                    const self = u.id === me.id;
                    return (
                      <tr key={u.id}>
                        <td><Link className="flex items-center gap-2" to={`/community/profile/${u.username}`}><Avatar user={u} size={30} /><span><span className="sk-post-author block" style={{ fontSize: '0.86rem' }}>{u.name}{self ? ' (you)' : ''}</span><span className="sk-card-meta block" style={{ marginTop: 0 }}>@{u.username}</span></span></Link></td>
                        {d.canManage ? <td>{u.email}</td> : null}
                        <td>
                          {manage && !self ? (
                            <select className="sk-select sk-select-sm" aria-label={`Role for ${u.name}`} value={u.role} disabled={busy}
                              onChange={(e) => setConfirm({ u, input: { role: e.target.value }, title: `Make ${u.name} ${ROLE_LABELS[e.target.value]}?`, msg: 'Role updated' })}>
                              {SITE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                          ) : <Pill value={u.role} label={ROLE_LABELS[u.role]} />}
                        </td>
                        <td><Pill value={u.status} /></td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>{u.lastLoginAt ? relativeTime(u.lastLoginAt) : '—'}</td>
                        <td>{u.postCount}</td>
                        {manage ? (
                          <td>
                            {self ? <span className="sk-card-meta">—</span> : (
                              <div className="flex flex-wrap gap-1">
                                {u.status !== 'active' ? <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => apply(u, { status: 'active' }, 'Account reinstated')}>Reinstate</button> : null}
                                {u.status === 'active' ? <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => setConfirm({ u, input: { status: 'suspended' }, title: `Suspend ${u.name}?`, text: 'They can sign in and read, but cannot post, comment, react or create groups.', msg: 'Account suspended' })}>Suspend</button> : null}
                                {u.status !== 'banned' ? <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" disabled={busy} onClick={() => setConfirm({ u, input: { status: 'banned' }, title: `Ban ${u.name}?`, text: 'They are signed out everywhere, cannot sign in, and their posts are hidden from everyone but staff.', msg: 'Account banned', danger: true })}>Ban</button> : null}
                                <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => adminService.resetLink(u.id).then(setLink).catch((err) => toast(err.message, 'error'))}>Reset link</button>
                              </div>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : <Empty icon="users" title="No users match" />)}
      </AsyncView>
      <ConfirmDialog open={!!confirm} title={confirm ? confirm.title : ''} message={confirm ? confirm.text || 'The change takes effect immediately and is logged.' : ''}
        danger={confirm && confirm.danger} confirmLabel="Confirm" busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => apply(confirm.u, confirm.input, confirm.msg)} />
      <Dialog open={!!link} onClose={() => setLink(null)} title="Password reset link">
        <p>Send this link to the member through a channel you trust. It works once and expires in {link && link.expiresInMinutes} minutes.</p>
        <input className="sk-form-input mt-3" readOnly value={link ? link.link : ''} onFocus={(e) => e.target.select()} aria-label="Reset link" />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="sk-btn" onClick={() => navigator.clipboard.writeText(link.link).then(() => toast('Link copied'))}>Copy</button>
          <button type="button" className="sk-btn sk-btn-gold" onClick={() => setLink(null)}>Done</button>
        </div>
      </Dialog>
    </>
  );
}
